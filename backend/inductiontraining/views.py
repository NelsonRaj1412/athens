from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import get_user_model
from django.db import models
from django.utils import timezone
from .models import InductionTraining, InductionAttendance
from .serializers import (
    InductionTrainingSerializer, 
    InductionTrainingListSerializer,
    InductionAttendanceSerializer
)
from permissions.decorators import require_permission

User = get_user_model()

# Import the serializer at module level to avoid import issues
try:
    from authentication.serializers import AdminUserCommonSerializer
except ImportError:
    # Fallback if the serializer doesn't exist
    AdminUserCommonSerializer = None

@csrf_exempt
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def create_induction_training(request):
    """Handle both GET and POST for induction training"""
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"Induction training request: {request.method} from user {request.user}")
    
    if request.method == 'GET':
        # Return empty form data or list of trainings
        queryset = InductionTraining.objects.filter(created_by=request.user)
        serializer = InductionTrainingListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Create a new induction training
        logger.info(f"Creating induction training with data: {request.data}")
        serializer = InductionTrainingSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user_project = getattr(request.user, 'project', None)
            training = serializer.save(created_by=request.user, project=user_project)
            logger.info(f"Induction training created successfully: {training.id}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            logger.error(f"Induction training validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class InductionTrainingViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    model = InductionTraining  # Required for permission decorator
    
    def get_serializer_class(self):
        if self.action == 'list':
            return InductionTrainingListSerializer
        return InductionTrainingSerializer
    
    def get_queryset(self):
        # Only EPC Safety Department users can access induction training
        if not self.is_epc_safety_user(self.request.user):
            return InductionTraining.objects.none()
            
        user = self.request.user
        
        # PROJECT ISOLATION: Ensure user has a project
        if not user.project:
            return InductionTraining.objects.none()
        
        # For master admin_type users, show all trainings
        if hasattr(user, 'admin_type') and user.admin_type == 'master':
            return InductionTraining.objects.all()
        
        # PROJECT ISOLATION: Return only induction trainings from the same project
        return InductionTraining.objects.filter(project=user.project)
    
    def list(self, request, *args, **kwargs):
        # Check EPC Safety Department access
        if not self.is_epc_safety_user(request.user):
            return Response({
                'error': 'Access denied',
                'message': 'Only EPC Safety Department users can access induction training.'
            }, status=status.HTTP_403_FORBIDDEN)
            
        return super().list(request, *args, **kwargs)
    
    def create(self, request, *args, **kwargs):
        # Check EPC Safety Department access
        if not self.is_epc_safety_user(request.user):
            return Response({
                'error': 'Access denied', 
                'message': 'Only EPC Safety Department users can create induction training.'
            }, status=status.HTTP_403_FORBIDDEN)
            
        return super().create(request, *args, **kwargs)
    
    def perform_create(self, serializer):
        # PROJECT ISOLATION: Ensure user has a project
        if not self.request.user.project:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("User must be assigned to a project to create induction training.")
        
        serializer.save(created_by=self.request.user, project=self.request.user.project)

    @require_permission('edit')
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)
    
    @require_permission('edit')
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)
    
    @require_permission('delete')
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)
    

    
    @action(detail=True, methods=['post', 'get'])
    def signatures(self, request, pk=None):
        """
        Manage digital signatures for induction training authorization
        """
        induction = self.get_object()
        
        if request.method == 'GET':
            # Return current signature status
            return Response({
                'trainer_signature': bool(induction.trainer_signature),
                'hr_signature': bool(induction.hr_signature),
                'hr_name': induction.hr_name,
                'hr_date': induction.hr_date,
                'safety_signature': bool(induction.safety_signature),
                'safety_name': induction.safety_name,
                'safety_date': induction.safety_date,
                'dept_head_signature': bool(induction.dept_head_signature),
                'dept_head_name': induction.dept_head_name,
                'dept_head_date': induction.dept_head_date,
                'is_complete': induction.is_signatures_complete
            })
        
        elif request.method == 'POST':
            # Add or update signatures
            signature_type = request.data.get('signature_type')
            signature_data = request.data.get('signature_data')
            signer_name = request.data.get('signer_name')
            
            if not all([signature_type, signature_data, signer_name]):
                return Response({
                    'error': 'signature_type, signature_data, and signer_name are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update signature based on type
            current_date = timezone.now().date()
            
            if signature_type == 'trainer':
                induction.trainer_signature = signature_data
            elif signature_type == 'hr':
                induction.hr_signature = signature_data
                induction.hr_name = signer_name
                induction.hr_date = current_date
            elif signature_type == 'safety':
                induction.safety_signature = signature_data
                induction.safety_name = signer_name
                induction.safety_date = current_date
            elif signature_type == 'dept_head':
                induction.dept_head_signature = signature_data
                induction.dept_head_name = signer_name
                induction.dept_head_date = current_date
            else:
                return Response({
                    'error': 'Invalid signature_type. Must be: trainer, hr, safety, or dept_head'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            induction.save()
            
            return Response({
                'message': f'{signature_type.title()} signature added successfully',
                'is_complete': induction.is_signatures_complete
            })
        """
        Submit attendance for an induction training and update worker employment status
        PROJECT-BOUNDED: Only allows attendance for inductions in the same project.
        """
        induction = self.get_object()
        
        # PROJECT ISOLATION: Verify induction belongs to user's project
        if induction.project != request.user.project:
            return Response({
                'error': 'Access denied',
                'message': 'You can only manage attendance for inductions in your project.'
            }, status=status.HTTP_403_FORBIDDEN)

        if request.method == 'GET':
            # Return attendance records for the induction training
            attendance_qs = InductionAttendance.objects.filter(induction=induction)
            serializer = InductionAttendanceSerializer(attendance_qs, many=True)
            return Response(serializer.data)

        attendance_records = request.data.get('attendance_records', [])
        evidence_photo = request.data.get('evidence_photo')
        
        if not attendance_records:
            return Response(
                {"error": "No attendance records provided"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Process attendance records
        created_records = []
        present_worker_ids = []
        present_user_ids = []
        failed_records = []
        
        for record in attendance_records:
            participant_type = record.get('participant_type', 'worker')
            participant_id = record.get('participant_id') or record.get('worker_id')
            
            if not participant_id:
                failed_records.append({'record': record, 'error': 'Missing participant_id'})
                continue
            
            try:
                if participant_type == 'worker':
                    # Handle worker attendance
                    from worker.models import Worker
                    worker = Worker.objects.get(id=participant_id, project=request.user.project)  # PROJECT ISOLATION
                    
                    # Create attendance record
                    attendance = InductionAttendance.objects.create(
                        induction=induction,
                        worker_id=participant_id,
                        worker_name=record.get('worker_name') or record.get('name', f"{worker.name} {worker.surname}".strip()),
                        worker_photo=record.get('worker_photo', ''),
                        attendance_photo=record.get('attendance_photo', ''),
                        participant_type='worker',
                        match_score=record.get('match_score', 0),
                        status=record.get('status', 'present')
                    )
                    
                    created_records.append(attendance)
                    
                    # Track present workers to update their employment status
                    if record.get('status') == 'present':
                        present_worker_ids.append(participant_id)
                        
                elif participant_type == 'user':
                    # Handle user attendance - store as negative ID to distinguish from workers
                    user = User.objects.get(id=participant_id, project=request.user.project)  # PROJECT ISOLATION
                    
                    # Create attendance record with negative worker_id for users
                    attendance = InductionAttendance.objects.create(
                        induction=induction,
                        worker_id=-participant_id,  # Negative ID for users
                        worker_name=record.get('worker_name') or record.get('name', user.get_full_name() or user.username),
                        worker_photo=record.get('worker_photo', ''),
                        attendance_photo=record.get('attendance_photo', ''),
                        participant_type='user',
                        match_score=record.get('match_score', 0),
                        status=record.get('status', 'present')
                    )
                    
                    created_records.append(attendance)
                    
                    # Track present users
                    if record.get('status') == 'present':
                        present_user_ids.append(participant_id)
                    
            except Worker.DoesNotExist:
                failed_records.append({'record': record, 'error': f'Worker with ID {participant_id} not found in project'})
                continue
            except User.DoesNotExist:
                failed_records.append({'record': record, 'error': f'User with ID {participant_id} not found in project'})
                continue
            except Exception as e:
                failed_records.append({'record': record, 'error': str(e)})
                continue
        
        # Update induction training status to completed and save evidence photo
        induction.status = 'completed'
        if evidence_photo:
            induction.evidence_photo = evidence_photo
        induction.save()
        
        # PROJECT ISOLATION: Update employment status only for workers in the same project
        if present_worker_ids:
            Worker.objects.filter(
                id__in=present_worker_ids, 
                project=request.user.project  # PROJECT ISOLATION
            ).update(employment_status='deployed')
        
        return Response({
            'message': 'Attendance submitted successfully',
            'records_created': len(created_records),
            'workers_deployed': len(present_worker_ids),
            'users_attended': len(present_user_ids),
            'failed_records': failed_records,
            'total_submitted': len(attendance_records),
            'success_rate': f"{(len(created_records)/len(attendance_records)*100):.1f}%" if attendance_records else "0%"
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def users(self, request):
        """Get a list of users for the conducted_by field"""
        users = User.objects.filter(is_active=True)
        data = [
            {
                'id': user.id,
                'username': user.username,
                'name': f"{user.first_name} {user.last_name}".strip() or user.username,
                'email': user.email
            }
            for user in users
        ]
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def users_search(self, request):
        """Search for users by username, name, or email"""
        query = request.query_params.get('q', '')
        if not query:
            return Response([])

        users = User.objects.filter(
            models.Q(username__icontains=query) |
            models.Q(first_name__icontains=query) |
            models.Q(last_name__icontains=query) |
            models.Q(email__icontains=query),
            is_active=True
        )[:10]  # Limit to 10 results

        data = [
            {
                'id': user.id,
                'username': user.username,
                'name': f"{user.first_name} {user.last_name}".strip() or user.username,
                'email': user.email
            }
            for user in users
        ]
        return Response(data)

    @action(detail=False, methods=['get'], url_path='test-endpoint')
    def test_endpoint(self, request):
        """Test endpoint to verify routing is working"""
        return Response({
            'message': 'Test endpoint is working!',
            'available_actions': [
                'users',
                'users_search',
                'initiated_workers',
                'test_endpoint'
            ]
        })

    @action(detail=False, methods=['get'], url_path='test-worker-photos')
    def test_worker_photos(self, request):
        """Test endpoint to check worker photo URLs"""
        try:
            from worker.models import Worker
            from worker.serializers import WorkerSerializer
            import os
            from django.conf import settings

            # Get first few workers with photos
            workers_with_photos = Worker.objects.filter(photo__isnull=False)[:5]

            if not workers_with_photos.exists():
                return Response({
                    'message': 'No workers with photos found',
                    'total_workers': Worker.objects.count(),
                    'workers_with_photos': 0
                })

            serializer = WorkerSerializer(workers_with_photos, many=True, context={'request': request})

            # Check if photo files actually exist on disk
            photo_file_status = []
            for worker in workers_with_photos:
                if worker.photo:
                    file_path = os.path.join(settings.MEDIA_ROOT, str(worker.photo))
                    file_exists = os.path.exists(file_path)
                    photo_file_status.append({
                        'worker': f"{worker.name} {worker.surname}",
                        'photo_field': str(worker.photo),
                        'file_path': file_path,
                        'file_exists': file_exists,
                        'created_by': worker.created_by.username if worker.created_by else 'Unknown'
                    })

            return Response({
                'message': 'Worker photo test',
                'total_workers': Worker.objects.count(),
                'workers_with_photos': workers_with_photos.count(),
                'sample_workers': serializer.data,
                'media_url': request.build_absolute_uri('/media/'),
                'media_root': settings.MEDIA_ROOT,
                'photo_file_status': photo_file_status,
                'current_user': request.user.username,
            })

        except Exception as e:
            return Response({
                'error': f'Test failed: {str(e)}'
            }, status=500)

    @action(detail=False, methods=['get'], url_path='test-single-worker')
    def test_single_worker(self, request):
        """Test a single worker serialization"""
        try:
            from worker.models import Worker
            from worker.serializers import WorkerSerializer

            # Get a worker with photo
            worker = Worker.objects.filter(photo__isnull=False).first()

            if not worker:
                return Response({'error': 'No worker with photo found'})


            # Test serialization with request context
            serializer = WorkerSerializer(worker, context={'request': request})
            data = serializer.data

            return Response({
                'worker_name': f"{worker.name} {worker.surname}",
                'photo_field': str(worker.photo) if worker.photo else None,
                'photo_url_direct': worker.photo.url if worker.photo else None,
                'serialized_photo': data.get('photo'),
                'request_available': request is not None,
                'base_url': request.build_absolute_uri('/') if request else None,
            })

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({
                'error': f'Test failed: {str(e)}'
            }, status=500)

    @action(detail=False, methods=['get'], url_path='test-photo-urls')
    def test_photo_urls(self, request):
        """Test photo URL generation for debugging"""
        try:
            from worker.models import Worker
            from worker.serializers import WorkerSerializer

            # Get a few workers with photos
            workers = Worker.objects.filter(photo__isnull=False)[:3]

            if not workers:
                return Response({'error': 'No workers with photos found'})

            results = []
            for worker in workers:
                # Test direct photo URL
                direct_url = worker.photo.url if worker.photo else None
                absolute_direct = request.build_absolute_uri(direct_url) if direct_url else None

                # Test serializer
                serializer = WorkerSerializer(worker, context={'request': request})
                serialized_photo = serializer.data.get('photo')

                results.append({
                    'worker_name': f"{worker.name} {worker.surname}",
                    'direct_photo_url': direct_url,
                    'absolute_direct_url': absolute_direct,
                    'serialized_photo_url': serialized_photo,
                    'request_host': request.get_host(),
                    'request_scheme': request.scheme,
                })

            return Response({
                'message': 'Photo URL test results',
                'results': results,
                'base_url': request.build_absolute_uri('/'),
            })

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({
                'error': f'Test failed: {str(e)}'
            }, status=500)
    
    @action(detail=False, methods=['get'], url_path='initiated-workers')
    def initiated_workers(self, request):
        """
        Get workers and users who have NOT completed induction training.
        Only EPC Safety Department users can access this endpoint.
        PROJECT-BOUNDED: Only returns data from the same project as the requesting user.
        """
        try:
            # Check if user is EPC Safety Department
            if not self.is_epc_safety_user(request.user):
                return Response({
                    'error': 'Access denied',
                    'message': 'Only EPC Safety Department users can access this endpoint.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # PROJECT ISOLATION: Ensure user has a project
            if not request.user.project:
                return Response({
                    'error': 'Access denied',
                    'message': 'User must be assigned to a project to access this data.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Debug logging
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Current user: {request.user.username}, Project: {request.user.project.projectName if request.user.project else 'None'} (ID: {request.user.project.id if request.user.project else 'None'})")
            
            from worker.models import Worker
            from worker.serializers import WorkerSerializer
            from authentication.serializers import AdminUserCommonSerializer

            # PROJECT ISOLATION: Get attendance records only from current project's inductions
            project_inductions = InductionTraining.objects.filter(project=request.user.project)
            completed_worker_ids = InductionAttendance.objects.filter(
                induction__in=project_inductions,
                status='present'
            ).values_list('worker_id', flat=True)
            
            # PROJECT ISOLATION: Get workers only from the same project
            uninducted_workers = Worker.objects.filter(
                project=request.user.project,  # Same project only
                employment_status='initiated'
            ).exclude(
                id__in=completed_worker_ids
            ).select_related('created_by', 'project').order_by('name', 'surname')

            # PROJECT ISOLATION: Get attendance records for users only from current project's inductions
            completed_user_ids = InductionAttendance.objects.filter(
                induction__in=project_inductions,
                status='present',
                worker_id__lt=0  # Negative IDs are users
            ).values_list('worker_id', flat=True)
            
            # Convert negative IDs back to positive user IDs
            completed_user_ids = [-id for id in completed_user_ids]
            
            # PROJECT ISOLATION: Get admin users only from the same project - STRICT FILTERING
            uninducted_users = User.objects.filter(
                is_active=True,
                user_type='adminuser',
                project_id=request.user.project.id  # Use project_id for exact match
            ).exclude(
                user_type__in=['master', 'projectadmin']  # Exclude master and project admins
            ).exclude(
                id__in=completed_user_ids  # Exclude users who have completed induction
            ).select_related('project').order_by('username')
            
            # Debug logging
            logger.info(f"Found {uninducted_users.count()} users in project {request.user.project.projectName}")
            for user in uninducted_users[:3]:  # Log first 3 users
                logger.info(f"  User: {user.username}, Project: {user.project.projectName if user.project else 'None'} (ID: {user.project.id if user.project else 'None'})")

            # Serialize workers
            worker_serializer = WorkerSerializer(uninducted_workers, many=True, context={'request': request})
            workers_data = worker_serializer.data

            # Fix photo URLs for workers
            for worker_data in workers_data:
                original_photo = worker_data.get('photo')
                if original_photo and not original_photo.startswith('http'):
                    worker_data['photo'] = request.build_absolute_uri(original_photo)
                # Add type identifier
                worker_data['participant_type'] = 'worker'
                worker_data['participant_id'] = worker_data['id']

            # Serialize users
            user_serializer = AdminUserCommonSerializer(uninducted_users, many=True, context={'request': request})
            users_data = user_serializer.data

            # Fix photo URLs for users and add type identifier
            for user_data in users_data:
                # Try to get photo from user_detail
                try:
                    user_obj = User.objects.get(id=user_data['id'])
                    if hasattr(user_obj, 'user_detail') and user_obj.user_detail and user_obj.user_detail.photo:
                        photo_url = user_obj.user_detail.photo.url
                        if not photo_url.startswith('http'):
                            user_data['photo'] = request.build_absolute_uri(photo_url)
                        else:
                            user_data['photo'] = photo_url
                    else:
                        user_data['photo'] = None
                except:
                    user_data['photo'] = None
                    
                # Add type identifier
                user_data['participant_type'] = 'user'
                user_data['participant_id'] = user_data['id']
                # Add name field for consistency
                if not user_data.get('name'):
                    user_data['name'] = user_data.get('username', '')
                if not user_data.get('surname'):
                    user_data['surname'] = ''
                # Add employee_id for consistency with workers
                try:
                    user_obj = User.objects.get(id=user_data['id'])
                    if hasattr(user_obj, 'user_detail') and user_obj.user_detail:
                        user_data['employee_id'] = user_obj.user_detail.employee_id or ''
                    else:
                        user_data['employee_id'] = ''
                except:
                    user_data['employee_id'] = ''

            # Combine workers and users
            all_participants = workers_data + users_data
            total_count = len(all_participants)

            return Response({
                'count': total_count,
                'workers': workers_data,
                'users': users_data,
                'all_participants': all_participants,
                'message': f'Showing {uninducted_workers.count()} workers and {uninducted_users.count()} users who need induction training',
                'workers_count': uninducted_workers.count(),
                'users_count': uninducted_users.count()
            })

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {"error": f"Failed to fetch participants: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def is_epc_safety_user(self, user):
        """Check if user belongs to EPC Safety Department"""
        # Allow master admin type users
        if hasattr(user, 'admin_type') and user.admin_type == 'master':
            return True
            
        # Allow EPC users
        if hasattr(user, 'admin_type') and user.admin_type == 'epcuser':
            return True
            
        return False

    @action(detail=False, methods=['get'], url_path='test-new-endpoint')
    def test_new_endpoint(self, request):
        """Test endpoint to verify server is reloading properly"""
        return Response({'message': 'Test endpoint working', 'timestamp': str(timezone.now())})

    @action(detail=False, methods=['get'], url_path='trained-personnel')
    def trained_personnel(self, request):
        """
        Get a dedicated list of all induction-trained personnel for tracking.
        Returns both workers and users who have completed induction training.
        """
        try:
            # PROJECT ISOLATION: Ensure user has a project
            if not request.user.project:
                return Response({
                    'error': 'Access denied',
                    'message': 'User must be assigned to a project to access this data.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            from worker.models import Worker
            from worker.serializers import WorkerSerializer
            from authentication.serializers import AdminUserCommonSerializer

            # Get attendance records from completed inductions in current project
            project_inductions = InductionTraining.objects.filter(
                project=request.user.project,
                status='completed'
            )
            
            trained_attendance = InductionAttendance.objects.filter(
                induction__in=project_inductions,
                status='present'
            ).select_related('induction').order_by('-induction__date', 'worker_name')

            # Separate workers and users
            worker_records = trained_attendance.filter(participant_type='worker', worker_id__gt=0)
            user_records = trained_attendance.filter(participant_type='user', worker_id__lt=0)

            # Get unique worker IDs and user IDs
            trained_worker_ids = list(worker_records.values_list('worker_id', flat=True).distinct())
            trained_user_ids = [-id for id in user_records.values_list('worker_id', flat=True).distinct()]

            # Get worker details
            trained_workers = Worker.objects.filter(
                id__in=trained_worker_ids,
                project=request.user.project
            ).select_related('project', 'created_by')

            # Get user details
            trained_users = User.objects.filter(
                id__in=trained_user_ids,
                project=request.user.project
            ).select_related('project')

            # Prepare worker data with training details
            workers_data = []
            for worker in trained_workers:
                # Get latest training record for this worker
                latest_training = worker_records.filter(worker_id=worker.id).first()
                worker_serializer = WorkerSerializer(worker, context={'request': request})
                worker_data = worker_serializer.data
                
                # Add training information
                if latest_training:
                    worker_data.update({
                        'training_date': latest_training.induction.date,
                        'training_title': latest_training.induction.title,
                        'training_location': latest_training.induction.location,
                        'conducted_by': latest_training.induction.conducted_by,
                        'match_score': latest_training.match_score,
                        'attendance_photo': latest_training.attendance_photo,
                        'participant_type': 'worker'
                    })
                
                workers_data.append(worker_data)

            # Prepare user data with training details (these are employees)
            employees_data = []
            # Prepare user data with training details (these are employees)
            employees_data = []
            for user in trained_users:
                # Get latest training record for this user
                latest_training = user_records.filter(worker_id=-user.id).first()
                user_serializer = AdminUserCommonSerializer(user, context={'request': request})
                user_data = user_serializer.data
                
                # Add training information
                if latest_training:
                    user_data.update({
                        'training_date': latest_training.induction.date,
                        'training_title': latest_training.induction.title,
                        'training_location': latest_training.induction.location,
                        'conducted_by': latest_training.induction.conducted_by,
                        'match_score': latest_training.match_score,
                        'attendance_photo': latest_training.attendance_photo,
                        'participant_type': 'employee'  # Users are employees
                    })
                
                # Add photo from user_detail if available
                try:
                    if hasattr(user, 'user_detail') and user.user_detail and user.user_detail.photo:
                        photo_url = user.user_detail.photo.url
                        if not photo_url.startswith('http'):
                            user_data['photo'] = request.build_absolute_uri(photo_url)
                        else:
                            user_data['photo'] = photo_url
                except:
                    user_data['photo'] = None
                
                employees_data.append(user_data)

            # Combine all trained personnel
            all_trained = workers_data + employees_data
            
            # Sort by training date (most recent first)
            all_trained.sort(key=lambda x: x.get('training_date', ''), reverse=True)

            return Response({
                'total_trained': len(all_trained),
                'workers_trained': len(workers_data),
                'employees_trained': len(employees_data),
                'trained_personnel': all_trained,
                'workers': workers_data,
                'employees': employees_data,
                'project_name': request.user.project.projectName,
                'completed_trainings': project_inductions.count(),
                'message': f'Found {len(all_trained)} trained personnel in {request.user.project.projectName}'
            })

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {"error": f"Failed to fetch trained personnel: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
