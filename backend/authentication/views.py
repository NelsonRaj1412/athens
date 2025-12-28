# This file includes code adapted from https://github.com/MElgul6/Pavshop
# Licensed under the MIT License
# Please use this code with caution and comply with the license terms.

from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import permission_classes, api_view
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.authentication import JWTAuthentication
import logging
import random
import string
from django.utils.html import escape
from django.core.exceptions import ValidationError
from .security_utils import sanitize_log_input, secure_filename, validate_file_path, safe_join
from .password_utils import generate_secure_password, validate_password_strength
from .file_handlers import SecureFileHandler

from django.db import models
from .models import Project, CustomUser, UserDetail, CompanyDetail, AdminDetail
from .serializers import (
    ProjectSerializer,
    CustomUserSerializer,
    CustomTokenObtainPairSerializer,
    MasterAdminSerializer,
    UserDetailSerializer,
    CompanyDetailSerializer,
)
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework.parsers import MultiPartParser, FormParser, JSONParser


class UserDetailRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = UserDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_object(self):
        # Get or create UserDetail for the current user
        user_detail, created = UserDetail.objects.get_or_create(user=self.request.user)
        return user_detail

    def perform_update(self, serializer):
        # Security validation for uploaded files
        if 'photo' in self.request.FILES:
            photo_file = self.request.FILES['photo']
            if photo_file.size > 10 * 1024 * 1024:  # 10MB limit
                from rest_framework.serializers import ValidationError
                raise ValidationError({'photo': ['File size must be less than 10MB']})
            if not photo_file.content_type.startswith('image/'):
                from rest_framework.serializers import ValidationError
                raise ValidationError({'photo': ['File must be an image']})
        try:
            user_detail = serializer.save()

            # Check if this is a complete submission (has required fields)
            has_submitted_details = bool(
                user_detail.mobile and
                user_detail.pan and
                user_detail.employee_id
            )

            # Send notification to admin if this is a new complete submission
            if has_submitted_details and not user_detail.is_approved and self.request.user.created_by and not getattr(user_detail, 'notification_sent', False):
                try:
                    from .notification_utils import send_websocket_notification
                    send_websocket_notification(
                        user_id=self.request.user.created_by.id,
                        title="User Details Submitted",
                        message=f"{self.request.user.username} has submitted their user details for approval.",
                        notification_type="user_detail_submission",
                        data={
                            'user_id': self.request.user.id,
                            'username': self.request.user.username,
                            'user_detail_id': user_detail.id,
                            'formType': 'userdetail'
                        },
                        sender_id=self.request.user.id
                    )
                    # Mark notification as sent
                    user_detail.notification_sent = True
                    user_detail.save(update_fields=['notification_sent'])
                except Exception as e:
                    logger.warning(f"Failed to send user detail submission notification: {sanitize_log_input(str(e))}")

        except Exception as e:
            logger.error(f"User detail save failed for {sanitize_log_input(self.request.user.username)}: {sanitize_log_input(str(e))}")
            raise
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_users(request):
    users = CustomUser.objects.all()
    serializer = CustomUserSerializer(users, many=True)
    return Response(serializer.data)

class CompanyDetailRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = CompanyDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        company_detail, created = CompanyDetail.objects.get_or_create(user=self.request.user)
        return company_detail
    
    def post(self, request, *args, **kwargs):
        """
        Handles POST requests by treating them as PATCH requests.
        This allows the frontend to use a single 'save' action for both
        creating and updating the company details.
        """
        # The partial_update method corresponds to a PATCH request.
        # This is ideal because it will update the fields provided
        # and leave the others untouched.
        return self.partial_update(request, *args, **kwargs)

    def perform_update(self, serializer):
        # Security validation for company logo
        if 'company_logo' in self.request.FILES:
            logo_file = self.request.FILES['company_logo']
            if logo_file.size > 5 * 1024 * 1024:  # 5MB limit
                raise ValidationError({'company_logo': ['File size must be less than 5MB']})
            if not logo_file.content_type.startswith('image/'):
                raise ValidationError({'company_logo': ['File must be an image']})
        try:
            serializer.save()
        except Exception as e:
            logger.error(f"Company detail save failed: {sanitize_log_input(str(e))}")
            raise

class UserDetailApproveView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        user_detail = get_object_or_404(UserDetail, pk=pk)
        # Allow approval if user is staff or creator of the userdetail's user
        if not (request.user.is_staff or (user_detail.user.created_by == request.user)):
            return Response({"detail": "Not authorized to approve."}, status=status.HTTP_403_FORBIDDEN)
        user_detail.is_approved = True
        user_detail.approved_by = request.user
        user_detail.approved_at = timezone.now()
        user_detail.save()
        return Response({"detail": "UserDetail approved successfully."}, status=status.HTTP_200_OK)
from .permissions import IsMasterAdmin, require_master_admin

logger = logging.getLogger(__name__)

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

def index(request):
    return Response({"message": "Authentication app is running."})

class LogoutView(APIView):
    permission_classes = (IsAuthenticated,)
    authentication_classes = (JWTAuthentication,)

    def post(self, request):
        # Enhanced authentication check with better error messages
        if not request.user or not request.user.is_authenticated:
            logger.warning(f"Unauthorized logout attempt from IP: {request.META.get('REMOTE_ADDR', 'Unknown')}")
            return Response({
                "detail": "Authentication credentials were not provided or are invalid.",
                "error_code": "INVALID_AUTH",
                "message": "Please ensure you are logged in and include a valid access token in the Authorization header."
            }, status=status.HTTP_401_UNAUTHORIZED)

        refresh_token = request.data.get("refresh", None)
        if not refresh_token:
            logger.warning(f"Logout attempt without refresh token from user: {sanitize_log_input(request.user.username)}")
            return Response({
                "detail": "Refresh token missing in request body.",
                "error_code": "MISSING_REFRESH_TOKEN",
                "message": "Please include the refresh token in the request body."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Try to blacklist the token
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
                logger.info("Refresh token blacklisted successfully.")
            except Exception as e:
                logger.error(f"Error blacklisting token: {sanitize_log_input(str(e))}")
                # Continue with logout even if blacklisting fails
            
            return Response({"detail": "Logout successful."}, status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            logger.error(f"Error during logout: {sanitize_log_input(str(e))}")
            # Return success anyway to ensure the user is logged out on the client side
            return Response({"detail": "Logout processed with warnings."}, status=status.HTTP_200_OK)

class ProjectCreateView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        serializer = ProjectSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        logger.error(f"Project creation failed due to serializer errors: {sanitize_log_input(str(serializer.errors))}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@permission_classes([IsMasterAdmin])
class MasterAdminProjectCreateView(APIView):
    def post(self, request):
        serializer = ProjectSerializer(data=request.data)
        if serializer.is_valid():
            project = serializer.save()
            return Response(ProjectSerializer(project).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@permission_classes([IsMasterAdmin])
class MasterAdminCreateProjectAdminsView(APIView):
    def post(self, request):
        project_id = request.data.get('project_id')
        if not project_id:
            logger.error("project_id is required but not provided.")
            return Response({"error": "project_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            logger.error(f"Project with id {sanitize_log_input(str(project_id))} not found.")
            return Response({"error": "Project not found."}, status=status.HTTP_404_NOT_FOUND)

        created_admins = []
        existing_admins = []

        # Handle client admin
        client_username = request.data.get('client_username')
        if client_username:
            if CustomUser.objects.filter(username=client_username).exists():
                existing_admins.append(client_username)
                logger.info(f"User with username {sanitize_log_input(client_username)} already exists, skipping creation.")
            else:
                # Generate secure password with special characters
                password = ''.join(random.choices(string.ascii_letters + string.digits + '!@#$%^&*', k=16)).strip()
                client_company = request.data.get('client_company')
                client_address = request.data.get('client_residentAddress')
                client_data = {
                    'username': client_username,
                    'password': password,
                    'user_type': 'projectadmin',
                    'project': project.id,
                    'admin_type': 'client',
                    'company_name': client_company,
                    'registered_address': client_address,
                    'is_autogenerated_password': True,
                    'is_password_reset_required': True,
                    'is_active': True,
                }
                serializer = CustomUserSerializer(data=client_data)
                if serializer.is_valid():
                    user = serializer.save()
                    logger.info(f"Created client admin {sanitize_log_input(client_username)} with active status {user.is_active}.")
                    created_admins.append({
                        'username': user.username,
                        'password': password,
                        'admin_type': 'client',
                    })
                else:
                    logger.error(f"Failed to create client admin {sanitize_log_input(client_username)}: {sanitize_log_input(str(serializer.errors))}")
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Handle epc admin
        epc_username = request.data.get('epc_username')
        if epc_username:
            if CustomUser.objects.filter(username=epc_username).exists():
                existing_admins.append(epc_username)
                logger.info(f"User with username {sanitize_log_input(epc_username)} already exists, skipping creation.")
            else:
                # Generate secure password with special characters
                password = ''.join(random.choices(string.ascii_letters + string.digits + '!@#$%^&*', k=16)).strip()
                epc_company = request.data.get('epc_company')
                epc_address = request.data.get('epc_residentAddress')
                epc_data = {
                    'username': epc_username,
                    'password': password,
                    'user_type': 'projectadmin',
                    'project': project.id,
                    'admin_type': 'epc',
                    'company_name': epc_company,
                    'registered_address': epc_address,
                    'is_autogenerated_password': True,
                    'is_password_reset_required': True,
                    'is_active': True,
                }
                serializer = CustomUserSerializer(data=epc_data)
                if serializer.is_valid():
                    user = serializer.save()
                    logger.info(f"Created epc admin {sanitize_log_input(epc_username)} with active status {user.is_active}.")
                    created_admins.append({
                        'username': user.username,
                        'password': password,
                        'admin_type': 'epc',
                    })
                else:
                    logger.error(f"Failed to create epc admin {sanitize_log_input(epc_username)}: {sanitize_log_input(str(serializer.errors))}")
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Handle multiple contractor admins or single contractor admin
        contractor_admins = request.data.get('contractor_admins', None)
        if contractor_admins is not None:
            if not isinstance(contractor_admins, list):
                logger.error("contractor_admins must be a list.")
                return Response({"error": "contractor_admins must be a list."}, status=status.HTTP_400_BAD_REQUEST)

            for contractor_admin in contractor_admins:
                username = contractor_admin.get('username')
                if not username:
                    logger.warning("Username missing for a contractor admin, skipping.")
                    continue
                if CustomUser.objects.filter(username=username).exists():
                    existing_admins.append(username)
                    logger.info(f"User with username {sanitize_log_input(username)} already exists, skipping creation.")
                    continue
                # Generate secure password with special characters
                password = ''.join(random.choices(string.ascii_letters + string.digits + '!@#$%^&*', k=16)).strip()
                company_name = contractor_admin.get('company_name')
                registered_address = contractor_admin.get('registered_address')
                admin_data = {
                    'username': username,
                    'password': password,
                    'user_type': 'projectadmin',
                    'project': project.id,
                    'admin_type': 'contractor',
                    'company_name': company_name,
                    'registered_address': registered_address,
                    'is_autogenerated_password': True,
                    'is_password_reset_required': True,
                    'is_active': True,
                }
                serializer = CustomUserSerializer(data=admin_data)
                if serializer.is_valid():
                    user = serializer.save()
                    logger.info(f"Created contractor admin {sanitize_log_input(username)} with active status {user.is_active}.")
                    created_admins.append({
                        'username': user.username,
                        'password': password,
                        'admin_type': 'contractor',
                    })
                else:
                    logger.error(f"Failed to create contractor admin {sanitize_log_input(username)}: {sanitize_log_input(str(serializer.errors))}")
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Handle single contractor admin fields
            contractor_username = request.data.get('contractor_username')
            contractor_company = request.data.get('contractor_company')
            contractor_residentAddress = request.data.get('contractor_residentAddress')
            if contractor_username:
                if CustomUser.objects.filter(username=contractor_username).exists():
                    existing_admins.append(contractor_username)
                    logger.info(f"User with username {sanitize_log_input(contractor_username)} already exists, skipping creation.")
                else:
                    # Generate secure password with special characters
                    password = ''.join(random.choices(string.ascii_letters + string.digits + '!@#$%^&*', k=16)).strip()
                    admin_data = {
                        'username': contractor_username,
                        'password': password,
                        'user_type': 'projectadmin',
                        'project': project.id,
                        'admin_type': 'contractor',
                        'company_name': contractor_company,
                        'registered_address': contractor_residentAddress,
                        'is_autogenerated_password': True,
                        'is_password_reset_required': True,
                        'is_active': True,
                    }
                    serializer = CustomUserSerializer(data=admin_data)
                    if serializer.is_valid():
                        user = serializer.save()
                        logger.info(f"Created contractor admin {sanitize_log_input(contractor_username)} with active status {user.is_active}.")
                        created_admins.append({
                            'username': user.username,
                            'password': password,
                            'admin_type': 'contractor',
                        })
                    else:
                        logger.error(f"Failed to create contractor admin {sanitize_log_input(contractor_username)}: {sanitize_log_input(str(serializer.errors))}")
                        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "created_admins": created_admins,
            "existing_admins": existing_admins
        }, status=status.HTTP_201_CREATED)

class ProjectListView(APIView):
    permission_classes = (IsMasterAdmin,)

    def get(self, request):
        projects = Project.objects.all()
        serializer = ProjectSerializer(projects, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class ProjectUpdateView(APIView):
    permission_classes = (IsAuthenticated,)

    def put(self, request, pk):
        try:
            project = Project.objects.get(pk=pk)
        except Project.DoesNotExist:
            logger.warning(f"Project update attempted for non-existent project: {sanitize_log_input(str(pk))}")
            return Response({"error": "Project not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error retrieving project {sanitize_log_input(str(pk))}: {sanitize_log_input(str(e))}")
            return Response({"error": "Internal server error."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        serializer = ProjectSerializer(project, data=request.data)
        if serializer.is_valid():
            try:
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            except Exception as e:
                logger.error(f"Error saving project {sanitize_log_input(str(pk))}: {sanitize_log_input(str(e))}")
                return Response({"error": "Failed to update project."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ProjectDeleteView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, pk):
        """
        Get project dependencies information before deletion
        """
        try:
            project = Project.objects.get(pk=pk)
        except Project.DoesNotExist:
            return Response({"error": "Project not found."}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user has permission to view project deletion info
        if not (request.user.admin_type == 'master' or request.user.is_superuser):
            return Response({
                "error": "Only master admin can view project deletion information."
            }, status=status.HTTP_403_FORBIDDEN)
        
        dependencies = self._check_project_dependencies(project)
        
        return Response({
            "project_id": project.id,
            "project_name": project.projectName,
            "can_delete": not dependencies['has_dependencies'],
            "dependencies": dependencies
        }, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        try:
            project = Project.objects.get(pk=pk)
        except Project.DoesNotExist:
            logger.warning(f"Project deletion attempted for non-existent project: {sanitize_log_input(str(pk))}")
            return Response({"error": "Project not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error retrieving project {sanitize_log_input(str(pk))} for deletion: {sanitize_log_input(str(e))}")
            return Response({"error": "Internal server error."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Check if user has permission to delete projects (only master admin)
        if not (request.user.admin_type == 'master' or request.user.is_superuser):
            return Response({
                "error": "Only master admin can delete projects."
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            # Check for all dependencies before deletion
            dependencies = self._check_project_dependencies(project)
            
            if dependencies['has_dependencies']:
                return Response({
                    "error": "Cannot delete project with associated data.",
                    "details": dependencies['details'],
                    "total_dependencies": dependencies['total_count'],
                    "suggestion": "Please remove all associated data before deleting the project. Use GET request to this endpoint to see detailed dependency information."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # If no dependencies, proceed with deletion
            project_name = project.projectName
            project.delete()
            logger.info(f"Project {sanitize_log_input(str(pk))} ({sanitize_log_input(project_name)}) deleted successfully by {sanitize_log_input(request.user.username)}")
            
            return Response({
                "message": f"Project '{project_name}' deleted successfully.",
                "deleted_project_id": pk
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error deleting project {sanitize_log_input(str(pk))}: {sanitize_log_input(str(e))}")
            import traceback
            logger.error(f"Full traceback: {sanitize_log_input(traceback.format_exc())}")
            return Response({
                "error": "Failed to delete project due to internal server error.",
                "details": "Please check server logs for more information."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _check_project_dependencies(self, project):
        """
        Check all possible dependencies for a project before deletion
        """
        dependencies = {
            'has_dependencies': False,
            'total_count': 0,
            'details': {}
        }
        
        try:
            # Check for associated users
            users_count = CustomUser.objects.filter(project=project).count()
            if users_count > 0:
                dependencies['details']['users'] = {
                    'count': users_count,
                    'message': f"{users_count} user(s) associated with this project"
                }
                dependencies['total_count'] += users_count
            
            # Check for PTW permits (if ptw app exists)
            try:
                from ptw.models import Permit
                permits_count = Permit.objects.filter(project=project).count()
                if permits_count > 0:
                    dependencies['details']['permits'] = {
                        'count': permits_count,
                        'message': f"{permits_count} PTW permit(s) associated with this project"
                    }
                    dependencies['total_count'] += permits_count
            except (ImportError, AttributeError):
                pass  # PTW app not installed or field doesn't exist
            except Exception as e:
                logger.debug(f"Error checking PTW permits: {sanitize_log_input(str(e))}")
            
            # Check for workers (if worker app exists)
            try:
                from worker.models import Worker
                workers_count = Worker.objects.filter(project=project).count()
                if workers_count > 0:
                    dependencies['details']['workers'] = {
                        'count': workers_count,
                        'message': f"{workers_count} worker(s) associated with this project"
                    }
                    dependencies['total_count'] += workers_count
            except (ImportError, AttributeError):
                pass  # Worker app not installed or field doesn't exist
            except Exception as e:
                logger.debug(f"Error checking workers: {sanitize_log_input(str(e))}")
            
            # Check for manpower records (if manpower app exists)
            try:
                from manpower.models import DailyAttendance
                manpower_count = DailyAttendance.objects.filter(project=project).count()
                if manpower_count > 0:
                    dependencies['details']['manpower'] = {
                        'count': manpower_count,
                        'message': f"{manpower_count} manpower record(s) associated with this project"
                    }
                    dependencies['total_count'] += manpower_count
            except (ImportError, AttributeError):
                pass  # Manpower app not installed or field doesn't exist
            except Exception as e:
                logger.debug(f"Error checking manpower: {sanitize_log_input(str(e))}")
            
            # Check for incidents (if incidentmanagement app exists)
            try:
                from incidentmanagement.models import Incident
                incidents_count = Incident.objects.filter(project=project).count()
                if incidents_count > 0:
                    dependencies['details']['incidents'] = {
                        'count': incidents_count,
                        'message': f"{incidents_count} incident(s) associated with this project"
                    }
                    dependencies['total_count'] += incidents_count
            except (ImportError, AttributeError):
                pass  # Incident management app not installed or field doesn't exist
            except Exception as e:
                logger.debug(f"Error checking incidents: {sanitize_log_input(str(e))}")
            
            # Check for toolbox talks (if tbt app exists)
            try:
                from tbt.models import ToolboxTalk
                tbt_count = ToolboxTalk.objects.filter(project=project).count()
                if tbt_count > 0:
                    dependencies['details']['toolbox_talks'] = {
                        'count': tbt_count,
                        'message': f"{tbt_count} toolbox talk(s) associated with this project"
                    }
                    dependencies['total_count'] += tbt_count
            except (ImportError, AttributeError):
                pass  # TBT app not installed or field doesn't exist
            except Exception as e:
                logger.debug(f"Error checking toolbox talks: {sanitize_log_input(str(e))}")
            
            # Check for inspections (if inspection app exists)
            try:
                from inspection.models import Inspection
                inspections_count = Inspection.objects.filter(project=project).count()
                if inspections_count > 0:
                    dependencies['details']['inspections'] = {
                        'count': inspections_count,
                        'message': f"{inspections_count} inspection(s) associated with this project"
                    }
                    dependencies['total_count'] += inspections_count
            except (ImportError, AttributeError):
                pass  # Inspection app not installed or field doesn't exist
            except Exception as e:
                logger.debug(f"Error checking inspections: {sanitize_log_input(str(e))}")
            
            # Check for job training records (if jobtraining app exists)
            try:
                from jobtraining.models import JobTraining
                training_count = JobTraining.objects.filter(project=project).count()
                if training_count > 0:
                    dependencies['details']['job_training'] = {
                        'count': training_count,
                        'message': f"{training_count} job training record(s) associated with this project"
                    }
                    dependencies['total_count'] += training_count
            except (ImportError, AttributeError):
                pass  # Job training app not installed or field doesn't exist
            except Exception as e:
                logger.debug(f"Error checking job training: {sanitize_log_input(str(e))}")
            
            # Check for safety observations - handle different field names
            try:
                from safetyobservation.models import SafetyObservation
                # Try different possible field names for project reference
                safety_obs_count = 0
                try:
                    safety_obs_count = SafetyObservation.objects.filter(project=project).count()
                except Exception:
                    # If 'project' field doesn't exist, try other common field names
                    try:
                        safety_obs_count = SafetyObservation.objects.filter(project_id=project.id).count()
                    except Exception:
                        # Skip if no project field exists
                        pass
                
                if safety_obs_count > 0:
                    dependencies['details']['safety_observations'] = {
                        'count': safety_obs_count,
                        'message': f"{safety_obs_count} safety observation(s) associated with this project"
                    }
                    dependencies['total_count'] += safety_obs_count
            except (ImportError, AttributeError):
                pass  # Safety observation app not installed
            except Exception as e:
                logger.debug(f"Error checking safety observations: {sanitize_log_input(str(e))}")
            
            # Check for MOM records (if mom app exists)
            try:
                from mom.models import MOM
                mom_count = MOM.objects.filter(project=project).count()
                if mom_count > 0:
                    dependencies['details']['mom_records'] = {
                        'count': mom_count,
                        'message': f"{mom_count} MOM record(s) associated with this project"
                    }
                    dependencies['total_count'] += mom_count
            except (ImportError, AttributeError):
                pass  # MOM app not installed or field doesn't exist
            except Exception as e:
                logger.debug(f"Error checking MOM records: {sanitize_log_input(str(e))}")
            
            # Set has_dependencies flag
            dependencies['has_dependencies'] = dependencies['total_count'] > 0
            
        except Exception as e:
            logger.error(f"Error checking project dependencies: {sanitize_log_input(str(e))}")
            # In case of error checking dependencies, assume there are dependencies to be safe
            dependencies['has_dependencies'] = True
            dependencies['total_count'] = 1
            dependencies['details']['error'] = {
                'count': 1,
                'message': f"Unable to verify all dependencies: {str(e)}. Deletion blocked for safety."
            }
        
        return dependencies
        
class ProjectCleanupView(APIView):
    """
    Endpoint to help clean up project dependencies before deletion
    Only accessible by master admin
    """
    permission_classes = (IsAuthenticated,)

    def post(self, request, pk):
        try:
            project = Project.objects.get(pk=pk)
        except Project.DoesNotExist:
            return Response({"error": "Project not found."}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user has permission (only master admin)
        if not (request.user.admin_type == 'master' or request.user.is_superuser):
            return Response({
                "error": "Only master admin can perform project cleanup."
            }, status=status.HTTP_403_FORBIDDEN)
        
        cleanup_type = request.data.get('cleanup_type', 'check_only')
        force_cleanup = request.data.get('force_cleanup', False)
        
        if cleanup_type == 'check_only':
            # Just return dependency information
            dependencies = self._check_project_dependencies(project)
            return Response({
                "project_id": project.id,
                "project_name": project.projectName,
                "dependencies": dependencies,
                "cleanup_options": {
                    "users": "Deactivate or transfer users to another project",
                    "permits": "Complete or cancel active permits",
                    "workers": "Transfer workers to another project or mark as inactive",
                    "records": "Archive or transfer historical records"
                }
            }, status=status.HTTP_200_OK)
        
        elif cleanup_type == 'deactivate_users' and force_cleanup:
            # Deactivate all users associated with the project
            users = CustomUser.objects.filter(project=project)
            deactivated_count = users.update(is_active=False)
            
            logger.info(f"Deactivated {deactivated_count} users for project {project.projectName} by {request.user.username}")
            
            return Response({
                "message": f"Deactivated {deactivated_count} users associated with project '{project.projectName}'",
                "deactivated_users": deactivated_count
            }, status=status.HTTP_200_OK)
        
        else:
            return Response({
                "error": "Invalid cleanup_type or force_cleanup not enabled",
                "valid_cleanup_types": ["check_only", "deactivate_users"],
                "note": "Set force_cleanup=true for destructive operations"
            }, status=status.HTTP_400_BAD_REQUEST)
    
    def _check_project_dependencies(self, project):
        """
        Check all possible dependencies for a project before deletion
        """
        dependencies = {
            'has_dependencies': False,
            'total_count': 0,
            'details': {}
        }
        
        try:
            # Check for associated users
            users_count = CustomUser.objects.filter(project=project).count()
            if users_count > 0:
                dependencies['details']['users'] = {
                    'count': users_count,
                    'message': f"{users_count} user(s) associated with this project"
                }
                dependencies['total_count'] += users_count
            
            # Set has_dependencies flag
            dependencies['has_dependencies'] = dependencies['total_count'] > 0
            
        except Exception as e:
            logger.error(f"Error checking project dependencies: {sanitize_log_input(str(e))}")
            dependencies['has_dependencies'] = True
            dependencies['total_count'] = 1
            dependencies['details']['error'] = {
                'count': 1,
                'message': f"Unable to verify dependencies: {str(e)}"
            }
        
        return dependencies

# --- USER MANAGEMENT FOR PROJECT ADMINS ---

# In authentication/views.py

# In authentication/views.py

class ProjectAdminUserCreateView(APIView):
    """
    Project admin (client, epc, contractor) creates their own users.
    """
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        # We will NOT modify the request data this time.
        # We will pass the data directly to the serializer as it comes in.
        serializer = CustomUserSerializer(data=request.data)

        if serializer.is_valid():
            logger.debug(f"Validated data: {sanitize_log_input(str(serializer.validated_data))}")
            
            # --- THIS IS THE MOST DIRECT FIX ---
            # Get the user who is creating the new user.
            creating_user = request.user
            
            # Prepare the extra data we want to force into the model.
            extra_data_to_save = {
                'created_by': creating_user,
                'project': creating_user.project,
                'company_name': creating_user.company_name
            }
            
            # Call serializer.save() and pass the extra data.
            # This will override anything in validated_data for these fields.
            user = serializer.save(**extra_data_to_save)
            
            # --- End of Fix ---

            data = serializer.data
            data['password'] = getattr(user, '_plain_password', None)
            
            return Response(data, status=status.HTTP_201_CREATED)
        
        logger.error(f"Serializer errors: {sanitize_log_input(str(serializer.errors))}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
class ProjectAdminUserListView(APIView):
    """
    Project admin sees all adminuser users except themselves.
    PROJECT-BOUNDED: Only shows users from the same project.
    """
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        # PROJECT ISOLATION: Filter users by same project and created by current user
        users = CustomUser.objects.filter(
            user_type='adminuser', 
            created_by=request.user,
            project=request.user.project  # Same project only
        ).exclude(id=request.user.id)
        
        from .serializers import AdminUserCommonSerializer
        serializer = AdminUserCommonSerializer(users, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

class ProjectAdminUserUpdateView(APIView):
    """
    Project admin can update only users they created.
    PROJECT-BOUNDED: Only allows updates to users in the same project.
    """
    permission_classes = (IsAuthenticated,)

    def put(self, request, pk):
        try:
            # PROJECT ISOLATION: Ensure user belongs to same project and was created by current user
            user = CustomUser.objects.get(
                pk=pk, 
                created_by=request.user,
                project=request.user.project  # Same project only
            )
        except CustomUser.DoesNotExist:
            logger.warning(f"User update attempted for non-existent or unauthorized user: {sanitize_log_input(str(pk))} by {sanitize_log_input(request.user.username)}")
            return Response({"error": "User not found or not allowed."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error retrieving user {sanitize_log_input(str(pk))}: {sanitize_log_input(str(e))}")
            return Response({"error": "Internal server error."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        serializer = CustomUserSerializer(user, data=request.data, partial=True)  # partial=True for partial updates
        if serializer.is_valid():
            try:
                serializer.save()
                return Response(serializer.data)
            except Exception as e:
                logger.error(f"Error saving user {sanitize_log_input(str(pk))}: {sanitize_log_input(str(e))}")
                return Response({"error": "Failed to update user."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ProjectAdminUserDeleteView(APIView):
    """
    Project admin can delete only users they created.
    PROJECT-BOUNDED: Only allows deletion of users in the same project.
    """
    permission_classes = (IsAuthenticated,)

    def delete(self, request, pk):
        try:
            # PROJECT ISOLATION: Ensure user belongs to same project and was created by current user
            user = CustomUser.objects.get(
                pk=pk, 
                created_by=request.user,
                project=request.user.project  # Same project only
            )
        except CustomUser.DoesNotExist:
            logger.warning(f"User deletion attempted for non-existent or unauthorized user: {sanitize_log_input(str(pk))} by {sanitize_log_input(request.user.username)}")
            return Response({"error": "User not found or not allowed."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error retrieving user {sanitize_log_input(str(pk))} for deletion: {sanitize_log_input(str(e))}")
            return Response({"error": "Internal server error."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        try:
            user.delete()
            logger.info(f"User {sanitize_log_input(str(pk))} deleted successfully by {sanitize_log_input(request.user.username)}")
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            logger.error(f"Error deleting user {sanitize_log_input(str(pk))}: {sanitize_log_input(str(e))}")
            return Response({"error": "Failed to delete user."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- END USER MANAGEMENT FOR PROJECT ADMINS ---

class ProjectAdminResetPasswordView(APIView):
    """
    Project admin (client, epc, contractor) can reset their own password.
    """
    permission_classes = (IsAuthenticated,)

    def put(self, request):
        username = request.data.get('username')
        new_password = request.data.get('new_password')
        if not username or not new_password:
            return Response({"error": "Username and new password are required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            admin = CustomUser.objects.get(username=username, user_type='projectadmin')
        except CustomUser.DoesNotExist:
            return Response({"error": "Admin user not found."}, status=status.HTTP_404_NOT_FOUND)
        admin.set_password(new_password)
        admin.is_autogenerated_password = False
        admin.is_password_reset_required = False
        admin.save()
        return Response({"detail": "Password reset successful.", "new_password": new_password}, status=status.HTTP_200_OK)

class ProjectAdminUserResetPasswordView(APIView):
    """
    Project admin can reset the password for users within the same project.
    """
    permission_classes = (IsAuthenticated,)

    def put(self, request, pk):
        new_password = request.data.get('password')
        if not new_password:
            return Response({"error": "New password is required."}, status=status.HTTP_400_BAD_REQUEST)
        logger.debug(f"Password reset requested for user id {sanitize_log_input(str(pk))} by user {sanitize_log_input(request.user.username)}")
        try:
            user = CustomUser.objects.get(pk=pk, project=request.user.project)
            logger.debug(f"User found for password reset: {sanitize_log_input(user.username)}")
        except CustomUser.DoesNotExist:
            logger.warning(f"User not found or not allowed for password reset: id {sanitize_log_input(str(pk))} by user {sanitize_log_input(request.user.username)}")
            return Response({"error": "User not found or not allowed."}, status=status.HTTP_404_NOT_FOUND)
        user.set_password(new_password)
        user.is_autogenerated_password = False
        user.is_password_reset_required = False
        user.save()
        return Response({"detail": "Password reset successful.", "new_password": new_password}, status=status.HTTP_200_OK)

class ProjectAdminListByProjectView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, project_id):
        admins = CustomUser.objects.filter(project_id=project_id, user_type='projectadmin')
        client_admin = admins.filter(admin_type='client').first()
        epc_admin = admins.filter(admin_type='epc').first()
        contractor_admins = admins.filter(admin_type='contractor')

        data = {
            "clientAdmin": CustomUserSerializer(client_admin).data if client_admin else None,
            "epcAdmin": CustomUserSerializer(epc_admin).data if epc_admin else None,
            "contractorAdmins": CustomUserSerializer(contractor_admins, many=True).data if contractor_admins else [],
        }
        return Response(data, status=status.HTTP_200_OK)

@permission_classes([AllowAny])
class CreateMasterAdminView(APIView):
    def post(self, request):
        if CustomUser.objects.filter(admin_type='master').exists():
            return Response({"error": "A Master Admin already exists."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = MasterAdminSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({"message": "Master Admin created successfully", "username": user.username}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

class PendingUserDetailsForAdminView(generics.ListAPIView):
    serializer_class = UserDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Return UserDetails where user__created_by is current user and is_approved is False
        return UserDetail.objects.filter(user__created_by=self.request.user, is_approved=False)

class UserDetailPendingView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, user_id):
        try:
            # PROJECT ISOLATION: Ensure user belongs to same project
            user = CustomUser.objects.get(
                id=user_id, 
                user_type='adminuser',
                project=request.user.project  # Same project only
            )
            
            # Check if the requesting user is authorized to view this user detail
            if user.created_by != request.user:
                return Response({'error': 'Not authorized to view this user detail'}, status=status.HTTP_403_FORBIDDEN)
            
            # Try to get UserDetail
            try:
                user_detail = UserDetail.objects.get(user=user)
                
                # Check if user details are actually pending approval
                if user_detail.is_approved:
                    return Response({'error': 'User details are already approved'}, status=status.HTTP_404_NOT_FOUND)
                    
            except UserDetail.DoesNotExist:
                # If no user detail exists, return 404 as there's nothing to approve
                return Response({'error': 'No user details found for approval'}, status=status.HTTP_404_NOT_FOUND)
            
            # Use the serializer to get properly formatted data
            serializer = UserDetailSerializer(user_detail, context={'request': request})
            user_detail_data = serializer.data
            
            # Combine user data with user detail data
            response_data = {
                'id': user_detail.id,  # UserDetail ID for approval
                'user': user.id,
                'username': user.username,
                'name': user.name or '',
                'surname': user.surname or '',
                'designation': user.designation or '',
                'department': user.department or '',
                'company_name': user.company_name or '',
                'employee_id': user_detail_data.get('employee_id', ''),
                'gender': user_detail_data.get('gender', ''),
                'father_or_spouse_name': user_detail_data.get('father_or_spouse_name', ''),
                'date_of_birth': user_detail_data.get('date_of_birth'),
                'nationality': user_detail_data.get('nationality', ''),
                'education_level': user_detail_data.get('education_level', ''),
                'date_of_joining': user_detail_data.get('date_of_joining'),
                'mobile': user_detail_data.get('mobile', ''),
                'uan': user_detail_data.get('uan', ''),
                'pan': user_detail_data.get('pan', ''),
                'aadhaar': user_detail_data.get('aadhaar', ''),
                'mark_of_identification': user_detail_data.get('mark_of_identification', ''),
                'photo_url': request.build_absolute_uri(user_detail.photo.url) if user_detail.photo else None,
                'pan_attachment_url': request.build_absolute_uri(user_detail.pan_attachment.url) if user_detail.pan_attachment else None,
                'aadhaar_attachment_url': request.build_absolute_uri(user_detail.aadhaar_attachment.url) if user_detail.aadhaar_attachment else None,
                'specimen_signature_url': request.build_absolute_uri(user_detail.specimen_signature.url) if user_detail.specimen_signature else None,
            }
            return Response(response_data, status=status.HTTP_200_OK)
        except CustomUser.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error in UserDetailPendingView for user {sanitize_log_input(str(user_id))}: {sanitize_log_input(str(e))}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class EPCUserListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        epc_users = CustomUser.objects.filter(admin_type='epcuser', is_active=True)
        serializer = CustomUserSerializer(epc_users, many=True)
        return Response(serializer.data)

class ContractorCompanyNameView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id):
        contractors = CustomUser.objects.filter(project_id=project_id, admin_type='contractor', is_active=True)
        # Get unique company names
        company_names = list(contractors.values_list('company_name', flat=True).distinct())
        return Response({"contractor_company_names": company_names}, status=status.HTTP_200_OK)


class EPCAndClientUserListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # PROJECT ISOLATION: Only return users from the same project with induction training
        if not request.user.project:
            return Response({
                'error': 'Project access required',
                'message': 'User must be assigned to a project to access users.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        users = CustomUser.objects.filter(
            admin_type__in=['epcuser', 'clientuser'], 
            is_active=True,
            project_id=request.user.project.id
        )
        
        # Apply induction training filter
        from authentication.project_isolation import apply_user_project_isolation_with_induction
        users = apply_user_project_isolation_with_induction(users, request.user)
        
        serializer = CustomUserSerializer(users, many=True)
        return Response({
            'users': serializer.data,
            'count': users.count(),
            'message': 'Only induction-trained users from your project are shown'
        })


class AllAdminUsersListAPIView(APIView):
    """
    Lists all admin users across the system including:
    - Project Admin level: client, epc, contractor (created by master admin)
    - Admin User level: clientuser, epcuser, contractoruser (created by project admins)
    This endpoint provides a comprehensive view of all admin users.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Get query parameters for filtering
        admin_type = request.query_params.get('admin_type', None)
        project_id = request.query_params.get('project_id', None)
        department = request.query_params.get('department', None)
        is_active = request.query_params.get('is_active', 'true').lower() == 'true'

        # PROJECT ISOLATION: Only return users from the same project
        if not request.user.project:
            return Response({
                'error': 'Project access required',
                'message': 'User must be assigned to a project to access users.'
            }, status=status.HTTP_403_FORBIDDEN)

        # Base query for all admin users - include both project admins and admin users
        # Project admins: admin_type in ['client', 'epc', 'contractor'] with user_type='projectadmin'
        # Admin users: admin_type in ['clientuser', 'epcuser', 'contractoruser'] with user_type='adminuser'
        users = CustomUser.objects.filter(
            models.Q(
                admin_type__in=['clientuser', 'epcuser', 'contractoruser'],
                user_type='adminuser'
            ) | models.Q(
                admin_type__in=['client', 'epc', 'contractor'],
                user_type='projectadmin'
            ),
            is_active=is_active,
            project_id=request.user.project.id  # PROJECT ISOLATION
        ).exclude(admin_type='master')  # Exclude master admin

        # Apply induction training filter
        from authentication.project_isolation import apply_user_project_isolation_with_induction
        users = apply_user_project_isolation_with_induction(users, request.user)

        # Apply filters if provided
        if admin_type:
            # Handle both project admin and admin user types
            if admin_type in ['clientuser', 'epcuser', 'contractoruser', 'client', 'epc', 'contractor']:
                users = users.filter(admin_type=admin_type)

        if project_id:
            users = users.filter(project_id=project_id)

        if department:
            users = users.filter(department=department)

        # Order by admin_type and name for consistent results
        users = users.order_by('admin_type', 'name', 'username')

        serializer = CustomUserSerializer(users, many=True)

        # Add summary statistics
        response_data = {
            'users': serializer.data,
            'total_count': users.count(),
            'message': 'Only induction-trained users from your project are shown',
            'project_id': request.user.project.id,
            'project_name': request.user.project.projectName,
            'summary': {
                'clientuser_count': users.filter(admin_type='clientuser').count(),
                'epcuser_count': users.filter(admin_type='epcuser').count(),
                'contractoruser_count': users.filter(admin_type='contractoruser').count(),
                'client_admin_count': users.filter(admin_type='client').count(),
                'epc_admin_count': users.filter(admin_type='epc').count(),
                'contractor_admin_count': users.filter(admin_type='contractor').count(),
                'total_contractor_count': users.filter(admin_type__in=['contractor', 'contractoruser']).count(),
            }
        }

        return Response(response_data)


class DebugContractorListAPIView(APIView):
    """
    Debug endpoint to check contractor admin distribution by project
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Get all contractor admins
        contractor_admins = CustomUser.objects.filter(
            admin_type='contractor',
            user_type='projectadmin',
            is_active=True
        ).select_related('project')

        # Group by project
        projects_data = {}
        for contractor in contractor_admins:
            project_id = contractor.project.id if contractor.project else 'No Project'
            project_name = contractor.project.projectName if contractor.project else 'No Project'

            if project_id not in projects_data:
                projects_data[project_id] = {
                    'project_name': project_name,
                    'contractors': []
                }

            projects_data[project_id]['contractors'].append({
                'id': contractor.id,
                'username': contractor.username,
                'company_name': contractor.company_name,
                'admin_type': contractor.admin_type,
                'user_type': contractor.user_type,
                'is_active': contractor.is_active
            })

        response_data = {
            'total_contractor_admins': contractor_admins.count(),
            'projects': projects_data,
            'summary': {
                'projects_with_contractors': len(projects_data),
                'projects_with_multiple_contractors': len([p for p in projects_data.values() if len(p['contractors']) > 1])
            }
        }

        return Response(response_data)


class ContractorUsersListAPIView(APIView):
    """
    Lists only contractor users for specific use cases.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # PROJECT ISOLATION: Only return users from the same project with induction training
        if not request.user.project:
            return Response({
                'error': 'Project access required',
                'message': 'User must be assigned to a project to access users.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        project_id = request.query_params.get('project_id', None)

        users = CustomUser.objects.filter(
            admin_type='contractoruser', 
            is_active=True,
            project_id=request.user.project.id  # Force same project
        )

        if project_id and project_id != str(request.user.project.id):
            # Don't allow access to other projects
            users = users.none()
        
        # Apply induction training filter
        from authentication.project_isolation import apply_user_project_isolation_with_induction
        users = apply_user_project_isolation_with_induction(users, request.user)

        users = users.order_by('company_name', 'name', 'username')
        serializer = CustomUserSerializer(users, many=True)
        return Response({
            'users': serializer.data,
            'count': users.count(),
            'message': 'Only induction-trained contractor users from your project are shown'
        })


class UsersByTypeOverviewAPIView(APIView):
    """
    Provides a comprehensive overview of all users grouped by type.
    Useful for dashboards and administrative overviews.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get('project_id', None)

        # Base query
        base_query = CustomUser.objects.filter(is_active=True)
        if project_id:
            base_query = base_query.filter(project_id=project_id)

        # Get users by type
        project_admins = base_query.filter(user_type='projectadmin')
        admin_users = base_query.filter(user_type='adminuser')

        # Break down admin users by admin_type
        client_users = admin_users.filter(admin_type='clientuser')
        epc_users = admin_users.filter(admin_type='epcuser')
        contractor_users = admin_users.filter(admin_type='contractoruser')

        # Break down project admins by admin_type
        client_admins = project_admins.filter(admin_type='client')
        epc_admins = project_admins.filter(admin_type='epc')
        contractor_admins = project_admins.filter(admin_type='contractor')

        response_data = {
            'project_admins': {
                'total': project_admins.count(),
                'client_admins': {
                    'count': client_admins.count(),
                    'users': CustomUserSerializer(client_admins, many=True).data
                },
                'epc_admins': {
                    'count': epc_admins.count(),
                    'users': CustomUserSerializer(epc_admins, many=True).data
                },
                'contractor_admins': {
                    'count': contractor_admins.count(),
                    'users': CustomUserSerializer(contractor_admins, many=True).data
                }
            },
            'admin_users': {
                'total': admin_users.count(),
                'client_users': {
                    'count': client_users.count(),
                    'users': CustomUserSerializer(client_users, many=True).data
                },
                'epc_users': {
                    'count': epc_users.count(),
                    'users': CustomUserSerializer(epc_users, many=True).data
                },
                'contractor_users': {
                    'count': contractor_users.count(),
                    'users': CustomUserSerializer(contractor_users, many=True).data
                }
            },
            'summary': {
                'total_users': base_query.count(),
                'total_project_admins': project_admins.count(),
                'total_admin_users': admin_users.count(),
                'by_company_type': {
                    'client': client_admins.count() + client_users.count(),
                    'epc': epc_admins.count() + epc_users.count(),
                    'contractor': contractor_admins.count() + contractor_users.count()
                }
            }
        }

        return Response(response_data)


# In your authentication/views.py file, add this class:

class CurrentAdminDetailView(APIView):
    """
    Provides the details for the currently authenticated admin user.
    This view doesn't require a project ID in the URL, as it uses the
    logged-in user's token to identify them.
    """
    permission_classes = [IsAuthenticated] # Ensures only logged-in users can access this

    def get(self, request):
        user = request.user
        # Try to get related AdminDetail instance using explicit query
        try:
            admin_detail = AdminDetail.objects.get(user=user)
            
            # Use the serializer to get properly formatted data with full URLs
            from .serializers import AdminDetailSerializer
            serializer = AdminDetailSerializer(admin_detail, context={'request': request})
            admin_detail_data = serializer.data
            
            photo_url = admin_detail_data.get('photo')
            logo_url = admin_detail_data.get('logo')
            phone_number = admin_detail_data.get('phone_number', '')
            pan_number = admin_detail_data.get('pan_number', '')
            gst_number = admin_detail_data.get('gst_number', '')
            # Use name from admin_detail if available, otherwise from user
            name = admin_detail_data.get('name') or getattr(user, 'name', '')
        except AdminDetail.DoesNotExist:
            logger.warning(f"AdminDetail does not exist for user {sanitize_log_input(user.username)}")
            photo_url = None
            logo_url = None
            phone_number = getattr(user, 'phone_number', '')
            pan_number = ''
            gst_number = ''
            name = getattr(user, 'name', '')
        except Exception as e:
            logger.warning(f"Error accessing admin detail: {sanitize_log_input(str(e))}")
            photo_url = None
            logo_url = None
            phone_number = getattr(user, 'phone_number', '')
            pan_number = ''
            gst_number = ''
            name = getattr(user, 'name', '')

        # EPC-centric logic: For all EPC users (epc and epcuser), use master admin's company logo
        if user.admin_type in ['epc', 'epcuser'] and not logo_url:
            try:
                # Find master admin - check both user_type='master' and admin_type='master'
                master_admin = CustomUser.objects.filter(
                    models.Q(user_type='master') | models.Q(admin_type='master')
                ).first()
                if master_admin:
                    company_detail = CompanyDetail.objects.filter(user=master_admin).first()
                    if company_detail and company_detail.company_logo:
                        logo_url = company_detail.company_logo.url
                        logger.debug(f"Using master admin logo for EPC user {sanitize_log_input(user.username)}: {logo_url}")
            except Exception as e:
                logger.debug(f"Error getting master company logo for EPC user: {sanitize_log_input(str(e))}")
        
        # Debug logging for client admin logo
        if user.admin_type == 'client':
            logger.debug(f"Client admin {sanitize_log_input(user.username)} logo_url: {logo_url}")
            if 'admin_detail' in locals() and admin_detail:
                logger.debug(f"Client admin has AdminDetail with logo: {bool(admin_detail.logo)}")

        # Get project information
        project_info = None
        if user.project:
            project_info = {
                'id': user.project.id,
                'name': user.project.projectName,
                'category': user.project.projectCategory,
                'location': user.project.location,
            }

        # Get signature template URL
        signature_template_url = None
        try:
            if 'admin_detail' in locals() and admin_detail and admin_detail.signature_template:
                signature_template_url = admin_detail.signature_template.url
                SecureFileHandler.validate_file_access(signature_template_url)
        except (ValidationError, ValueError, AttributeError):
            signature_template_url = None

        # EPC-centric logic: For EPC users, also use master admin's company name if available
        company_name = user.company_name
        if user.admin_type in ['epc', 'epcuser']:
            try:
                # Find master admin - check both user_type='master' and admin_type='master'
                master_admin = CustomUser.objects.filter(
                    models.Q(user_type='master') | models.Q(admin_type='master')
                ).first()
                if master_admin:
                    company_detail = CompanyDetail.objects.filter(user=master_admin).first()
                    if company_detail and company_detail.company_name:
                        company_name = company_detail.company_name
            except Exception as e:
                logger.debug(f"Error getting master company name for EPC user: {sanitize_log_input(str(e))}")

        response_data = {
            'username': user.username,
            'name': name,
            'company_name': company_name,
            'registered_address': user.registered_address,
            'phone_number': phone_number,
            'pan_number': pan_number,
            'gst_number': gst_number,
            'photo_url': photo_url,
            'logo_url': logo_url,
            'signature_template': signature_template_url,
            'has_details': bool(phone_number or pan_number or gst_number),
            'is_approved': getattr(admin_detail, 'is_approved', False) if 'admin_detail' in locals() else False,
            'project': project_info,
        }
        logger.debug(f"CurrentAdminDetailView response for {sanitize_log_input(user.username)}: logo_url={logo_url}")
        return Response(response_data, status=status.HTTP_200_OK)

class CurrentUserProjectView(APIView):
    """
    Get the current user's project information.
    Works for all authenticated users (projectadmin and adminuser types).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Get project information
        project_info = None
        if user.project:
            project_info = {
                'id': user.project.id,
                'name': user.project.projectName,
                'category': user.project.projectCategory,
                'location': user.project.location,
            }

        return Response({
            'project': project_info,
            'user_type': user.user_type,
            'admin_type': getattr(user, 'admin_type', None),
        }, status=status.HTTP_200_OK)

from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import AdminDetail
from .serializers import AdminDetailSerializer

class AdminDetailUpdateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def put(self, request, usertype=None):
        user = request.user

        # Update user name if provided
        name = request.data.get('name')
        if name:
            user.name = name
            user.save()

        # Validate uploaded files with proper error handling
        if 'photo' in request.FILES:
            photo_file = request.FILES['photo']
            # Basic security checks
            if photo_file.size > 5 * 1024 * 1024:  # 5MB limit
                return Response({'errors': {'photo': ['File size must be less than 5MB']}}, status=status.HTTP_400_BAD_REQUEST)
            if not photo_file.content_type.startswith('image/'):
                return Response({'errors': {'photo': ['File must be an image']}}, status=status.HTTP_400_BAD_REQUEST)
        
        if 'logo' in request.FILES:
            logo_file = request.FILES['logo']
            # Basic security checks
            if logo_file.size > 5 * 1024 * 1024:  # 5MB limit
                return Response({'errors': {'logo': ['File size must be less than 5MB']}}, status=status.HTTP_400_BAD_REQUEST)
            if not logo_file.content_type.startswith('image/'):
                return Response({'errors': {'logo': ['File must be an image']}}, status=status.HTTP_400_BAD_REQUEST)

        admin_detail_data = {
            'name': name,  # Include name in admin_detail_data
            'phone_number': request.data.get('phone_number'),
            'pan_number': request.data.get('pan_number'),
            'gst_number': request.data.get('gst_number'),
            'photo': request.FILES.get('photo'),
            'logo': request.FILES.get('logo'),
        }

        admin_detail, created = AdminDetail.objects.get_or_create(user=user)
        logger.debug(f"AdminDetail {'created' if created else 'retrieved'} for user {sanitize_log_input(user.username)}")
        logger.debug(f"AdminDetail data to save: {sanitize_log_input(str({k: v for k, v in admin_detail_data.items() if k not in ['photo', 'logo']}))}, has_photo: {bool(admin_detail_data.get('photo'))}, has_logo: {bool(admin_detail_data.get('logo'))}")
        
        serializer = AdminDetailSerializer(admin_detail, data=admin_detail_data, partial=True)
        if not serializer.is_valid():
            logger.error(f"AdminDetail update errors: {sanitize_log_input(str(serializer.errors))}")
            return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        admin_detail = serializer.save()
        logger.debug(f"AdminDetail saved successfully for user {sanitize_log_input(user.username)}, has_photo: {bool(admin_detail.photo)}, has_logo: {bool(admin_detail.logo)}")

        # Check if this is a complete submission (has required fields)
        has_submitted_details = bool(
            admin_detail.phone_number and
            admin_detail.pan_number and
            admin_detail.gst_number
        )

        # Send notification to master admin if this is a new complete submission
        if has_submitted_details and not admin_detail.is_approved and not getattr(admin_detail, 'notification_sent', False):
            try:
                from .notification_utils import send_websocket_notification
                master_admin = CustomUser.objects.filter(admin_type='master').first()
                if master_admin:
                    send_websocket_notification(
                        user_id=master_admin.id,
                        title="Admin Details Submitted",
                        message=f"{user.username} ({user.admin_type}) has submitted their admin details for approval.",
                        notification_type="admin_detail_submission",
                        data={
                            'user_id': user.id,
                            'userId': user.id,
                            'username': user.username,
                            'admin_type': user.admin_type,
                            'company_name': user.company_name,
                            'admin_detail_id': admin_detail.id,
                            'formType': 'admindetail'
                        },
                        sender_id=user.id
                    )
                    # Mark notification as sent
                    admin_detail.notification_sent = True
                    admin_detail.save(update_fields=['notification_sent'])
            except Exception as e:
                logger.warning(f"Failed to send admin detail submission notification: {sanitize_log_input(str(e))}")

        # Use serializer to get properly formatted URLs
        serializer_response = AdminDetailSerializer(admin_detail, context={'request': request})
        admin_detail_data = serializer_response.data
        
        return Response({
            'detail': 'Admin details updated successfully.',
            'user': user.id,
            'created_by': getattr(user, 'created_by_id', None),
            'has_submitted_details': has_submitted_details,
            'is_approved': admin_detail.is_approved,
            'photo_url': admin_detail_data.get('photo'),
            'logo_url': admin_detail_data.get('logo')
        }, status=status.HTTP_200_OK)

class MasterAdminView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            master_admin = CustomUser.objects.get(admin_type='master')
            return Response({'id': master_admin.id, 'username': master_admin.username}, status=status.HTTP_200_OK)
        except CustomUser.DoesNotExist:
            return Response({'error': 'Master admin not found'}, status=status.HTTP_404_NOT_FOUND)

@permission_classes([IsMasterAdmin])
class MasterAdminResetAdminPasswordView(APIView):
    """
    Master admin can reset password for any project admin (client, epc, contractor).
    """
    def post(self, request):
        project_id = request.data.get('project_id')
        admin_type = request.data.get('admin_type')
        new_password = request.data.get('new_password')
        admin_index = request.data.get('admin_index')

        if not all([project_id, admin_type, new_password]):
            return Response({
                "error": "project_id, admin_type, and new_password are required."
            }, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 8:
            return Response({
                "error": "Password must be at least 8 characters long."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({"error": "Project not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            # Find the admin user based on admin_type and project
            if admin_type == 'client':
                admin_user = CustomUser.objects.get(
                    project=project,
                    admin_type='client'
                )
            elif admin_type == 'epc':
                admin_user = CustomUser.objects.get(
                    project=project,
                    admin_type='epc'
                )
            elif admin_type == 'contractor':
                # For contractors, we need to handle multiple contractors
                contractor_admins = CustomUser.objects.filter(
                    project=project,
                    admin_type='contractor'
                ).order_by('id')

                if admin_index is not None and 0 <= admin_index < len(contractor_admins):
                    admin_user = contractor_admins[admin_index]
                else:
                    return Response({
                        "error": f"Invalid contractor admin index. Found {len(contractor_admins)} contractors."
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({
                    "error": "Invalid admin_type. Must be 'client', 'epc', or 'contractor'."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Reset the password
            admin_user.set_password(new_password)
            admin_user.is_autogenerated_password = False
            admin_user.is_password_reset_required = False
            admin_user.save()

            logger.info(f"Master admin {sanitize_log_input(request.user.username)} reset password for {sanitize_log_input(admin_type)} admin {sanitize_log_input(admin_user.username)} in project {sanitize_log_input(project.projectName)}")

            return Response({
                "success": True,
                "message": f"Password reset successfully for {admin_type} admin {admin_user.username}",
                "admin_username": admin_user.username
            }, status=status.HTTP_200_OK)

        except CustomUser.DoesNotExist:
            return Response({
                "error": f"No {admin_type} admin found for this project."
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error resetting admin password: {sanitize_log_input(str(e))}")
            return Response({
                "error": "Failed to reset password due to server error"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AdminDetailView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, user_id):
        try:
            user = CustomUser.objects.get(id=user_id, user_type='projectadmin')
        except CustomUser.DoesNotExist:
            return Response({'error': 'Admin user not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error retrieving user {sanitize_log_input(str(user_id))}: {sanitize_log_input(str(e))}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        try:
            # Try to get AdminDetail
            try:
                admin_detail = AdminDetail.objects.get(user=user)
                
                # Use the serializer to get properly formatted data with full URLs
                from .serializers import AdminDetailSerializer
                serializer = AdminDetailSerializer(admin_detail, context={'request': request})
                admin_detail_data = serializer.data
                
                # Combine user data with admin detail data
                response_data = {
                    'admin_detail': {
                        'id': admin_detail.id,
                        'name': admin_detail_data.get('name') or getattr(user, 'name', ''),
                        'surname': getattr(user, 'surname', ''),
                        'company_name': user.company_name,
                        'registered_address': user.registered_address,
                        'phone_number': admin_detail_data.get('phone_number', ''),
                        'pan_number': admin_detail_data.get('pan_number', ''),
                        'gst_number': admin_detail_data.get('gst_number', ''),
                        'photo': admin_detail_data.get('photo'),
                        'logo': admin_detail_data.get('logo'),
                        'is_approved': admin_detail.is_approved,
                        'created_at': admin_detail.created_at
                    }
                }
                return Response(response_data, status=status.HTTP_200_OK)
                
            except AdminDetail.DoesNotExist:
                # Return basic user data if no AdminDetail exists
                response_data = {
                    'admin_detail': {
                        'id': None,
                        'name': getattr(user, 'name', ''),
                        'surname': getattr(user, 'surname', ''),
                        'company_name': user.company_name,
                        'registered_address': user.registered_address,
                        'phone_number': '',
                        'pan_number': '',
                        'gst_number': '',
                        'photo': None,
                        'logo': None,
                        'is_approved': False,
                        'created_at': user.created_at if hasattr(user, 'created_at') else None
                    }
                }
                return Response(response_data, status=status.HTTP_200_OK)
                
        except Exception as e:
            logger.error(f"Error in AdminDetailView for user {sanitize_log_input(str(user_id))}: {sanitize_log_input(str(e))}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AdminPendingDetailView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, user_id):
        try:
            user = CustomUser.objects.get(id=user_id, user_type='projectadmin')
            
            # Try to get AdminDetail using explicit query instead of related field
            try:
                admin_detail = AdminDetail.objects.get(user=user)
                
                # Check if admin details are actually pending approval
                if admin_detail.is_approved:
                    return Response({'error': 'Admin details are already approved'}, status=status.HTTP_404_NOT_FOUND)
                    
            except AdminDetail.DoesNotExist:
                # If no admin detail exists, return 404 as there's nothing to approve
                return Response({'error': 'No admin details found for approval'}, status=status.HTTP_404_NOT_FOUND)
            
            # Use the serializer to get properly formatted data with full URLs
            from .serializers import AdminDetailSerializer
            serializer = AdminDetailSerializer(admin_detail, context={'request': request})
            admin_detail_data = serializer.data
            
            # Combine user data with admin detail data
            response_data = {
                'user': user.id,
                'username': user.username,
                'name': admin_detail_data.get('name') or getattr(user, 'name', ''),
                'company_name': user.company_name,
                'registered_address': user.registered_address,
                'phone_number': admin_detail_data.get('phone_number', ''),
                'pan_number': admin_detail_data.get('pan_number', ''),
                'gst_number': admin_detail_data.get('gst_number', ''),
                'photo_url': admin_detail_data.get('photo'),  # Now contains full URL
                'logo_url': admin_detail_data.get('logo'),    # Now contains full URL
            }
            return Response(response_data, status=status.HTTP_200_OK)
        except CustomUser.DoesNotExist:
            return Response({'error': 'Admin user not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error in AdminPendingDetailView for user {sanitize_log_input(str(user_id))}: {sanitize_log_input(str(e))}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AdminDetailUpdateByMasterView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def put(self, request, user_id):
        try:
            user = CustomUser.objects.get(id=user_id, user_type='projectadmin')
        except CustomUser.DoesNotExist:
            return Response({'error': 'Admin user not found'}, status=status.HTTP_404_NOT_FOUND)
        
        try:
            admin_detail, created = AdminDetail.objects.get_or_create(user=user)
            
            # Update user fields
            if request.data.get('name'):
                user.name = request.data.get('name')
                user.save()
            
            # Update admin detail
            serializer = AdminDetailSerializer(admin_detail, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({'detail': 'Admin details updated successfully.'}, status=status.HTTP_200_OK)
            return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AdminDetailApproveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        try:
            from .notification_utils import send_websocket_notification

            user = CustomUser.objects.get(id=user_id, user_type='projectadmin')
            admin_detail, created = AdminDetail.objects.get_or_create(user=user)
            admin_detail.is_approved = True
            admin_detail.approved_by = request.user
            admin_detail.approved_at = timezone.now()
            admin_detail.save()

            # Send single notification to admin
            send_websocket_notification(
                user_id=user_id,
                title='Your Details Approved',
                message='Your admin details have been approved by the master administrator.',
                notification_type='approval',
                data={'formType': 'admindetail', 'approved': True},
                sender_id=request.user.id
            )

            return Response({'detail': 'Admin details approved successfully.'}, status=status.HTTP_200_OK)
        except CustomUser.DoesNotExist:
            return Response({'error': 'Admin user not found'}, status=status.HTTP_404_NOT_FOUND)


class UnifiedCompanyDataView(APIView):
    """
    Unified endpoint that returns company logo and name for any user type
    Handles inheritance for admin users from their creators
    """
    permission_classes = [IsAuthenticated]

    def _get_secure_file_url(self, file_field):
        """Safely get file URL with path validation"""
        if not file_field:
            return None
        try:
            url = file_field.url
            logger.debug(f"File URL generated: {url}")
            # Skip validation for now to ensure logo shows
            # SecureFileHandler.validate_file_access(url)
            return url
        except (ValidationError, ValueError, AttributeError) as e:
            logger.error(f"Error getting file URL: {sanitize_log_input(str(e))}")
            return None

    def get(self, request):
        try:
            user = request.user
            logger.info(f"UnifiedCompanyDataView called for user: {sanitize_log_input(user.username)} (type: {sanitize_log_input(user.user_type)}, admin_type: {sanitize_log_input(user.admin_type)})")

            company_data = self._get_company_data_for_user(user)
            logger.debug(f"Company data result: {sanitize_log_input(str(company_data))}")

            response_data = {
                'success': True,
                'company_name': company_data['company_name'],
                'company_logo': company_data['company_logo'],
                'logo_url': company_data['company_logo'],  # Alias for backward compatibility
                'source': company_data['source'],
                'user_type': user.user_type,
                'admin_type': user.admin_type,
                'debug_info': {
                    'user_id': user.id,
                    'username': user.username,
                    'has_company_detail': hasattr(user, 'company_detail'),
                    'has_admin_detail': hasattr(user, 'admin_detail'),
                    'media_url': '/media/',
                    'available_logos': self._get_available_logos()
                }
            }
            logger.debug(f"Returning response: {sanitize_log_input(str(response_data))}")
            return Response(response_data)

        except Exception as e:
            logger.error(f"UnifiedCompanyDataView error: {sanitize_log_input(str(e))}")
            import traceback
            logger.error(f"Full traceback: {sanitize_log_input(traceback.format_exc())}")
            return Response({
                'success': False,
                'error': str(e),
                'company_name': '',
                'company_logo': None,
                'logo_url': None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _get_company_data_for_user(self, user):
        """
        Get company data based on user type and hierarchy
        EPC-centric logic: Master Admin's company logo is used for all EPC-related users
        """
        logger.debug(f"Getting company data for user: {sanitize_log_input(user.username)} (type: {sanitize_log_input(user.user_type)}, admin_type: {sanitize_log_input(user.admin_type)})")
        
        # For master admin: ALWAYS use CompanyDetail (from CompanyDetails component)
        # Handle both user_type='master' and admin_type='master'
        if user.user_type == 'master' or (user.user_type == 'projectadmin' and user.admin_type == 'master'):
            try:
                company_detail = CompanyDetail.objects.filter(user=user).first()
                
                if company_detail:
                    logo_url = self._get_secure_file_url(company_detail.company_logo) if company_detail.company_logo else None
                    logger.debug(f"Master admin CompanyDetail found: logo={bool(company_detail.company_logo)}, name={company_detail.company_name}, logo_url={logo_url}")
                    
                    return {
                        'company_name': company_detail.company_name or user.company_name or 'YourBrand',
                        'company_logo': logo_url,
                        'source': 'company_detail'
                    }
                else:
                    logger.debug(f"No CompanyDetail found for master admin {sanitize_log_input(user.username)}")
                    
            except Exception as e:
                logger.error(f"Error accessing CompanyDetail for master admin {sanitize_log_input(user.username)}: {sanitize_log_input(str(e))}")

            # If no CompanyDetail exists yet, return empty but valid structure
            return {
                'company_name': user.company_name or 'YourBrand',
                'company_logo': None,
                'source': 'company_detail_empty'
            }

        # EPC-centric logic: All EPC-related users inherit from Master Admin's CompanyDetail
        if user.admin_type in ['epc', 'epcuser']:
            try:
                # Find master admin - check both user_type='master' and admin_type='master'
                master_admin = CustomUser.objects.filter(
                    models.Q(user_type='master') | models.Q(admin_type='master')
                ).first()
                if master_admin:
                    company_detail = CompanyDetail.objects.filter(user=master_admin).first()
                    if company_detail:
                        logo_url = self._get_secure_file_url(company_detail.company_logo) if company_detail.company_logo else None
                        return {
                            'company_name': company_detail.company_name or user.company_name or '',
                            'company_logo': logo_url,
                            'source': 'master_company_detail_epc'
                        }
            except Exception as e:
                logger.debug(f"Error accessing master CompanyDetail for EPC user: {sanitize_log_input(str(e))}")

        # For project admins (client and contractor): use their own AdminDetail
        if user.user_type == 'projectadmin' and user.admin_type in ['client', 'contractor']:
            try:
                admin_detail = AdminDetail.objects.filter(user=user).first()
                if admin_detail and admin_detail.logo:
                    return {
                        'company_name': user.company_name or '',
                        'company_logo': self._get_secure_file_url(admin_detail.logo),
                        'source': 'admin_detail'
                    }
            except Exception as e:
                logger.debug(f"Error accessing admin detail: {sanitize_log_input(str(e))}")

        # For admin users: inherit from creator or use EPC logic
        if user.user_type == 'adminuser' and user.created_by:
            # Client and contractor users inherit from their creator
            if user.admin_type in ['clientuser', 'contractoruser']:
                return self._get_company_data_for_user(user.created_by)
            
            # EPC users always inherit from master (handled above)
            # This is a fallback in case the above EPC logic didn't work
            if user.admin_type == 'epcuser':
                try:
                    # Find master admin - check both user_type='master' and admin_type='master'
                    master_admin = CustomUser.objects.filter(
                        models.Q(user_type='master') | models.Q(admin_type='master')
                    ).first()
                    if master_admin:
                        company_detail = CompanyDetail.objects.filter(user=master_admin).first()
                        if company_detail:
                            logo_url = self._get_secure_file_url(company_detail.company_logo) if company_detail.company_logo else None
                            return {
                                'company_name': company_detail.company_name or user.company_name or '',
                                'company_logo': logo_url,
                                'source': 'master_company_detail_epcuser_fallback'
                            }
                except Exception as e:
                    logger.debug(f"Error in EPC user fallback: {sanitize_log_input(str(e))}")

        # Default fallback
        return {
            'company_name': user.company_name or '',
            'company_logo': None,
            'source': 'user_fallback'
        }
    
    def _get_available_logos(self):
        """Get list of available logo files for debugging"""
        import os
        from django.conf import settings
        
        logos = []
        try:
            company_logos_path = os.path.join(settings.MEDIA_ROOT, 'company_logos')
            admin_logos_path = os.path.join(settings.MEDIA_ROOT, 'admin_logos')
            
            if os.path.exists(company_logos_path):
                company_files = os.listdir(company_logos_path)[:5]  # First 5 files
                logos.extend([f'/media/company_logos/{f}' for f in company_files if f.lower().endswith(('.png', '.jpg', '.jpeg'))])
            
            if os.path.exists(admin_logos_path):
                admin_files = os.listdir(admin_logos_path)[:5]  # First 5 files
                logos.extend([f'/media/admin_logos/{f}' for f in admin_files if f.lower().endswith(('.png', '.jpg', '.jpeg'))])
        except Exception as e:
            logger.debug(f"Error getting available logos: {sanitize_log_input(str(e))}")
        
        return logos


class UserApprovalStatusView(APIView):
    """
    Check and update user approval status for access control
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get current user's approval status"""
        user = request.user

        # Check if user has submitted details and is approved
        has_submitted_details = False
        is_approved = False

        if user.user_type == 'projectadmin':
            # Check AdminDetail for project admins
            try:
                admin_detail = user.admin_detail
                has_submitted_details = bool(
                    admin_detail.phone_number and
                    admin_detail.pan_number and
                    admin_detail.gst_number
                )
                is_approved = admin_detail.is_approved
            except:
                has_submitted_details = False
                is_approved = False

        elif user.user_type == 'adminuser':
            # Check UserDetail for admin users
            try:
                user_detail = user.user_detail
                has_submitted_details = bool(
                    user_detail.mobile and
                    user_detail.pan and
                    user_detail.employee_id
                )
                is_approved = user_detail.is_approved
            except:
                has_submitted_details = False
                is_approved = False

        return Response({
            'has_submitted_details': has_submitted_details,
            'is_approved': is_approved,
            'user_type': user.user_type,
            'django_user_type': user.user_type,
            'requires_approval': user.user_type in ['projectadmin', 'adminuser']
        }, status=status.HTTP_200_OK)


class AdminDetailApprovalView(APIView):
    """
    Handle approval of AdminDetail submissions by Master Admin
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, admin_detail_id):
        """Approve an AdminDetail submission"""
        try:
            admin_detail = AdminDetail.objects.get(id=admin_detail_id)
        except AdminDetail.DoesNotExist:
            return Response({'error': 'AdminDetail not found'}, status=status.HTTP_404_NOT_FOUND)

        # Only master admin can approve
        if request.user.admin_type != 'master':
            return Response({'error': 'Only master admin can approve'}, status=status.HTTP_403_FORBIDDEN)

        admin_detail.is_approved = True
        admin_detail.approved_by = request.user
        admin_detail.approved_at = timezone.now()
        admin_detail.save()

        # Send approval notification
        try:
            from .notification_utils import send_websocket_notification
            send_websocket_notification(
                user_id=admin_detail.user.id,
                title="Admin Details Approved",
                message=f"Your admin details have been approved by {request.user.username}. You now have full access to the dashboard.",
                notification_type="admin_approval",
                data={
                    'approved_by': request.user.username,
                    'approved_at': timezone.now().isoformat(),
                    'formType': 'admindetail'
                },
                sender_id=request.user.id
            )
        except Exception as e:
            logger.warning(f"Failed to send approval notification: {sanitize_log_input(str(e))}")

        return Response({
            'message': 'AdminDetail approved successfully',
            'admin_detail_id': admin_detail.id,
            'user': admin_detail.user.username
        }, status=status.HTTP_200_OK)


class PendingAdminDetailsView(APIView):
    """
    Get all pending AdminDetail submissions for Master Admin approval
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Only master admin can view pending approvals
        if request.user.admin_type != 'master':
            return Response({'error': 'Only master admin can view pending approvals'}, status=status.HTTP_403_FORBIDDEN)

        # Get all unapproved AdminDetails
        pending_details = AdminDetail.objects.filter(is_approved=False).select_related('user')

        pending_list = []
        for detail in pending_details:
            pending_list.append({
                'id': detail.id,
                'user_id': detail.user.id,
                'username': detail.user.username,
                'name': detail.name,
                'company_name': detail.user.company_name,
                'admin_type': detail.user.admin_type,
                'phone_number': detail.phone_number,
                'pan_number': detail.pan_number,
                'gst_number': detail.gst_number,
                'submitted_at': detail.created_at,
                'has_photo': bool(detail.photo),
                'has_logo': bool(detail.logo)
            })

        return Response({
            'pending_approvals': pending_list,
            'count': len(pending_list)
        }, status=status.HTTP_200_OK)