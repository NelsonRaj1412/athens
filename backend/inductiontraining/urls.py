from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InductionTrainingViewSet
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .auto_signature_views import auto_signature_request, complete_attendance_and_request_signatures
from .comprehensive_views import comprehensive_induction_endpoint

# Create router for ViewSet
router = DefaultRouter()
router.register(r'api', InductionTrainingViewSet, basename='induction-api')

def get_user_signature_url(user):
    """Get signature URL for a user from their AdminDetail or UserDetail"""
    try:
        # Try AdminDetail first (for admin users)
        if hasattr(user, 'admin_detail') and user.admin_detail and user.admin_detail.signature_template:
            return user.admin_detail.signature_template.url
        # Try UserDetail (for regular users)
        elif hasattr(user, 'user_detail') and user.user_detail and user.user_detail.signature_template:
            return user.user_detail.signature_template.url
        return ''
    except Exception:
        return ''

def find_user_by_department(department, project):
    """Find EPC user by department in the given project"""
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        user = User.objects.filter(
            project=project,
            department=department,
            admin_type='epc',
            is_active=True
        ).first()
        return user
    except Exception:
        return None

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def manage_manage_endpoint(request):
    """Handle the specific /manage/manage/ endpoint that frontend expects"""
    try:
        viewset = InductionTrainingViewSet()
        viewset.request = request
        viewset.format_kwarg = None
        
        if request.method == 'GET':
            viewset.action = 'list'
            viewset.action_map = {'get': 'list'}
            return viewset.list(request)
        elif request.method == 'POST':
            viewset.action = 'create'
            viewset.action_map = {'post': 'create'}
            return viewset.create(request)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

@api_view(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def create_induction_post(request):
    from .serializers import InductionTrainingSerializer, InductionTrainingListSerializer
    from .views import InductionTrainingViewSet
    import logging
    logger = logging.getLogger(__name__)
    
    if request.method == 'GET':
        # Handle GET requests for listing induction trainings
        try:
            viewset = InductionTrainingViewSet()
            viewset.request = request
            queryset = viewset.get_queryset()
            serializer = InductionTrainingListSerializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Exception in GET induction list: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'POST':
        # Handle POST requests for creating induction trainings
        try:
            logger.info(f"Induction training POST request from user: {request.user}")
            logger.info(f"Request data: {request.data}")
            
            # Add required fields that might be missing
            data = request.data.copy()
            if 'description' not in data:
                data['description'] = ''
            
            serializer = InductionTrainingSerializer(data=data, context={'request': request})
            if serializer.is_valid():
                user_project = getattr(request.user, 'project', None)
                training = serializer.save(created_by=request.user, project=user_project)
                logger.info(f"Induction training created successfully: {training.id}")
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                logger.error(f"Validation errors: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Exception in create_induction_post: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method in ['PUT', 'PATCH', 'DELETE']:
        # These methods are not supported on the list endpoint
        return Response({
            'error': 'Method not allowed on list endpoint',
            'message': 'Use /induction/<id>/ for individual resource operations'
        }, status=status.HTTP_405_METHOD_NOT_ALLOWED)
    
    else:
        return Response({
            'error': 'Method not allowed',
            'allowed_methods': ['GET', 'POST']
        }, status=status.HTTP_405_METHOD_NOT_ALLOWED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def initiated_workers(request):
    from .views import InductionTrainingViewSet
    viewset = InductionTrainingViewSet()
    viewset.request = request
    return viewset.initiated_workers(request)

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def induction_detail(request, pk):
    """Handle GET and PUT for individual induction training"""
    try:
        from .models import InductionTraining
        from .serializers import InductionTrainingSerializer
        
        # Get the induction training object with project isolation
        if request.user.is_superuser or getattr(request.user, 'admin_type', None) == 'master':
            induction = InductionTraining.objects.get(pk=pk)
        else:
            if not request.user.project:
                return Response({'error': 'User must be assigned to a project'}, status=status.HTTP_403_FORBIDDEN)
            induction = InductionTraining.objects.get(pk=pk, project=request.user.project)
        
        if request.method == 'GET':
            serializer = InductionTrainingSerializer(induction)
            return Response(serializer.data)
        
        elif request.method == 'PUT':
            serializer = InductionTrainingSerializer(induction, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
    except InductionTraining.DoesNotExist:
        return Response({'error': 'Induction training not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def attendance_view(request, pk):
    try:
        from .models import InductionTraining
        from .serializers import InductionAttendanceSerializer
        
        # Get the induction training object
        induction = InductionTraining.objects.get(pk=pk)
        
        if request.method == 'GET':
            # Return attendance records for the induction training
            from .models import InductionAttendance
            attendance_qs = InductionAttendance.objects.filter(induction=induction)
            serializer = InductionAttendanceSerializer(attendance_qs, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            # Auto-complete attendance and trigger signatures
            from django.utils import timezone
            
            # Mark attendance as complete
            induction.attendance_completed = True
            induction.attendance_completed_at = timezone.now()
            induction.save()
            
            # Auto-request signatures
            try:
                response = complete_attendance_and_request_signatures(request, pk)
                return Response({
                    'message': 'Attendance completed and signature requests sent',
                    'attendance_completed': True,
                    'signature_requests': response.data.get('results', [])
                })
            except Exception as e:
                return Response({
                    'message': 'Attendance completed but signature request failed',
                    'attendance_completed': True,
                    'error': str(e)
                })
            
    except InductionTraining.DoesNotExist:
        return Response({'error': 'Induction training not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def signatures_view(request, pk):
    """Handle signature management for induction training"""
    try:
        from .models import InductionTraining
        from django.contrib.auth import get_user_model
        from authentication.models import UserDetail, AdminDetail
        
        User = get_user_model()
        
        # Get the induction training object
        if request.user.is_superuser or getattr(request.user, 'admin_type', None) == 'master':
            induction = InductionTraining.objects.get(pk=pk)
        else:
            if not request.user.project:
                return Response({'error': 'User must be assigned to a project'}, status=status.HTTP_403_FORBIDDEN)
            induction = InductionTraining.objects.get(pk=pk, project=request.user.project)
        
        if request.method == 'GET':
            # Get actual user signatures based on assigned users
            trainer_signature_url = ''
            hr_signature_url = ''
            safety_signature_url = ''
            quality_signature_url = ''
            
            # Get trainer signature (created_by user)
            if induction.created_by:
                trainer_signature_url = get_user_signature_url(induction.created_by)
                if not induction.trainer_user:
                    induction.trainer_user = induction.created_by
                    induction.save()
            
            # Get HR signature
            if induction.hr_user:
                hr_signature_url = get_user_signature_url(induction.hr_user)
            elif not induction.hr_signature:
                # Auto-assign HR user from department
                hr_user = find_user_by_department('HR', induction.project)
                if hr_user:
                    induction.hr_user = hr_user
                    induction.hr_name = hr_user.get_full_name()
                    induction.save()
                    hr_signature_url = get_user_signature_url(hr_user)
            
            # Get Safety signature
            if induction.safety_user:
                safety_signature_url = get_user_signature_url(induction.safety_user)
            elif not induction.safety_signature:
                # Auto-assign Safety user from department
                safety_user = find_user_by_department('Safety', induction.project)
                if safety_user:
                    induction.safety_user = safety_user
                    induction.safety_name = safety_user.get_full_name()
                    induction.save()
                    safety_signature_url = get_user_signature_url(safety_user)
            
            # Get Quality signature
            if induction.dept_head_user:
                quality_signature_url = get_user_signature_url(induction.dept_head_user)
            elif not induction.dept_head_signature:
                # Auto-assign Quality user from department
                quality_user = find_user_by_department('Quality', induction.project)
                if quality_user:
                    induction.dept_head_user = quality_user
                    induction.dept_head_name = quality_user.get_full_name()
                    induction.save()
                    quality_signature_url = get_user_signature_url(quality_user)
            
            # Return current signature status with actual signature URLs
            return Response({
                'trainer_signature': trainer_signature_url,
                'trainer_name': induction.created_by.get_full_name() if induction.created_by else 'Trainer',
                'hr_signature': hr_signature_url,
                'hr_name': induction.hr_name or (induction.hr_user.get_full_name() if induction.hr_user else 'HR Representative'),
                'hr_date': induction.hr_date.isoformat() if induction.hr_date else '',
                'safety_signature': safety_signature_url,
                'safety_name': induction.safety_name or (induction.safety_user.get_full_name() if induction.safety_user else 'Safety Officer'),
                'safety_date': induction.safety_date.isoformat() if induction.safety_date else '',
                'dept_head_signature': quality_signature_url,
                'dept_head_name': induction.dept_head_name or (induction.dept_head_user.get_full_name() if induction.dept_head_user else 'Quality Officer'),
                'dept_head_date': induction.dept_head_date.isoformat() if induction.dept_head_date else '',
                'is_complete': bool(trainer_signature_url and hr_signature_url and safety_signature_url and quality_signature_url)
            })
        
        elif request.method == 'POST':
            # Request signature approval instead of direct signing
            signature_type = request.data.get('signature_type')
            signer_name = request.data.get('signer_name')
            signer_user_id = request.data.get('signer_user_id')  # Optional for users with accounts
            
            if not signature_type or not signer_name:
                return Response({'error': 'signature_type and signer_name are required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Handle worker verification (no digital signature)
            if signature_type == 'worker':
                induction.worker_signature = "PHOTO VERIFIED"
                induction.worker_name = signer_name
                induction.worker_date = timezone.now().date()
                induction.save()
                
                return Response({
                    'message': f'Worker {signer_name} marked as photo verified',
                    'verification_type': 'photo_verified'
                })
            
            # For other signature types, create approval request
            from authentication.models import SignatureRequest
            
            # Check if request already exists
            existing = SignatureRequest.objects.filter(
                form_type='induction',
                form_id=pk,
                signature_type=signature_type
            ).first()
            
            if existing:
                if existing.status == 'pending':
                    return Response({'error': 'Signature request already pending'}, status=status.HTTP_400_BAD_REQUEST)
                elif existing.status == 'approved':
                    return Response({'error': 'Signature already approved'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Create new signature request
            sig_request = SignatureRequest.objects.create(
                form_type='induction',
                form_id=pk,
                signature_type=signature_type,
                requested_by=request.user,
                requested_for_id=signer_user_id if signer_user_id else None,
                requested_for_name=signer_name
            )
            
            # Send notification if user has account
            if signer_user_id:
                try:
                    from authentication.models import Notification
                    Notification.objects.create(
                        user_id=signer_user_id,
                        title=f"Signature Request - {signature_type.title()}",
                        message=f"You have been requested to sign induction training #{pk} as {signature_type}",
                        notification_type='signature_request',
                        metadata={'signature_request_id': sig_request.id}
                    )
                except Exception as e:
                    print(f"Error creating notification: {e}")
            
            return Response({
                'message': f'Signature request sent to {signer_name}',
                'request_id': sig_request.id,
                'requires_approval': True
            })
            
    except InductionTraining.DoesNotExist:
        return Response({'error': 'Induction training not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

urlpatterns = [
    path('', comprehensive_induction_endpoint, name='induction-list'),
    path('legacy/', create_induction_post, name='induction-legacy'),
    path('<int:pk>/', induction_detail, name='induction-detail'),
    path('initiated-workers/', initiated_workers, name='initiated-workers'),
    path('<int:pk>/attendance/', attendance_view, name='induction-attendance'),
    path('<int:pk>/signatures/', signatures_view, name='induction-signatures'),
    path('<int:pk>/auto-signature/', auto_signature_request, name='auto-signature'),
    path('<int:pk>/complete-attendance/', complete_attendance_and_request_signatures, name='complete-attendance'),
    path('manage/manage/', manage_manage_endpoint, name='manage-endpoint'),
] + router.urls
