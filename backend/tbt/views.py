from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models
from django.contrib.auth import get_user_model
from .models import ToolboxTalk, ToolboxTalkAttendance
from .serializers import ToolboxTalkSerializer, ToolboxTalkAttendanceSerializer, UserSerializer
from .permissions import IsCreatorOrReadOnly
# from permissions.decorators import require_permission  # Removed to avoid authentication issues
from worker.models import Worker
from worker.serializers import WorkerSerializer
import logging
import base64
from django.core.files.base import ContentFile

User = get_user_model()
logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_toolbox_talk(request):
    """Create a new toolbox talk"""
    serializer = ToolboxTalkSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        user_project = getattr(request.user, 'project', None)
        serializer.save(created_by=request.user, project=user_project)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ToolboxTalkViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Toolbox Talks
    """
    serializer_class = ToolboxTalkSerializer
    permission_classes = [permissions.IsAuthenticated, IsCreatorOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'date', 'created_by']
    search_fields = ['title', 'location', 'conducted_by']
    ordering_fields = ['date', 'title', 'created_at', 'status']
    ordering = ['-date']
    model = ToolboxTalk  # Required for permission decorator
    
    def perform_create(self, serializer):
        user_project = getattr(self.request.user, 'project', None)
        serializer.save(created_by=self.request.user, project=user_project)

    def get_queryset(self):
        """
        Filter toolbox talks based on user's project and permissions
        """
        user = self.request.user
        if not user.is_authenticated:
            return ToolboxTalk.objects.none()
            
        # For superusers or admin users, show all TBTs
        if user.is_superuser or getattr(user, 'user_type', '') in ['adminuser', 'projectadmin']:
            return ToolboxTalk.objects.all()
            
        user_project = getattr(user, 'project', None)
        
        if user_project:
            return ToolboxTalk.objects.filter(project=user_project)
        return ToolboxTalk.objects.filter(created_by=user)
    
    @action(detail=True, methods=['get'])
    def attendance(self, request, pk=None):
        """
        Get attendance records for a toolbox talk
        """
        toolbox_talk = self.get_object()
        attendance_records = ToolboxTalkAttendance.objects.filter(toolbox_talk=toolbox_talk)
        serializer = ToolboxTalkAttendanceSerializer(attendance_records, many=True)
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_list(request):
    """
    Get a list of admin users for the conducted_by dropdown
    """
    # Get all users with user_type='adminuser'
    users = User.objects.filter(user_type='adminuser')
    
    # Format the response to match the expected format in the frontend
    user_data = []
    for user in users:
        user_data.append({
            'id': user.id,
            'username': user.username,
            'name': f"{getattr(user, 'name', '')} {getattr(user, 'surname', '')}".strip() or user.username,
            'email': user.email or ''
        })
    
    return Response(user_data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_search(request):
    """
    Search for admin users to populate the dropdown
    """
    query = request.query_params.get('q', '')
    
    # Base query: get users with user_type='adminuser'
    users_query = User.objects.all()
    
    # Check if the user_type field exists before filtering on it
    if hasattr(User, 'user_type'):
        users_query = users_query.filter(user_type='adminuser')
    
    # If search query is provided, filter further
    if query:
        users_query = users_query.filter(
            models.Q(username__icontains=query) | 
            models.Q(email__icontains=query) |
            models.Q(name__icontains=query) |
            models.Q(surname__icontains=query)
        )
    
    # Limit to 10 results
    users = users_query[:10]
    
    # Format the response to match the expected format in the frontend
    user_data = []
    for user in users:
        user_data.append({
            'id': user.id,
            'username': user.username,
            'name': f"{getattr(user, 'name', '')} {getattr(user, 'surname', '')}".strip() or user.username,
            'email': getattr(user, 'email', '') or ''
        })
    
    return Response(user_data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def trained_personnel(request):
    """
    Get all induction-trained personnel (both workers and users) for toolbox talk attendance.
    This includes both workers and admin users who have completed induction training.
    """
    try:
        from inductiontraining.models import InductionAttendance, InductionTraining
        from worker.models import Worker
        from worker.serializers import WorkerSerializer
        from authentication.serializers import AdminUserCommonSerializer

        # PROJECT ISOLATION: Ensure user has a project
        if not request.user.project:
            return Response({
                'error': 'Access denied',
                'message': 'User must be assigned to a project to access this data.'
            }, status=status.HTTP_403_FORBIDDEN)
        
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

        # Prepare worker data
        workers_data = []
        for worker in trained_workers:
            worker_serializer = WorkerSerializer(worker, context={'request': request})
            worker_data = worker_serializer.data
            worker_data['participant_type'] = 'worker'
            worker_data['participant_id'] = worker.id
            
            # Fix photo URLs
            if worker_data.get('photo') and not worker_data['photo'].startswith('http'):
                worker_data['photo'] = request.build_absolute_uri(worker_data['photo'])
            
            workers_data.append(worker_data)

        # Prepare user data
        users_data = []
        for user in trained_users:
            try:
                from authentication.serializers import AdminUserCommonSerializer
                user_serializer = AdminUserCommonSerializer(user, context={'request': request})
                user_data = user_serializer.data
            except:
                # Fallback if AdminUserCommonSerializer doesn't exist
                user_data = {
                    'id': user.id,
                    'name': user.name or '',
                    'surname': user.surname or '',
                    'email': user.email or '',
                    'username': user.username,
                    'phone_number': getattr(user, 'phone_number', ''),
                    'department': getattr(user, 'department', ''),
                    'designation': getattr(user, 'designation', ''),
                }
            
            user_data['participant_type'] = 'user'
            user_data['participant_id'] = user.id
            
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
            
            users_data.append(user_data)

        # Combine all trained personnel
        all_trained = workers_data + users_data

        return Response({
            'count': len(all_trained),
            'workers': workers_data,
            'users': users_data,
            'all_participants': all_trained,
            'workers_count': len(workers_data),
            'users_count': len(users_data),
            'message': f'Found {len(all_trained)} trained personnel eligible for toolbox talks'
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {"error": f"Failed to fetch trained personnel: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_attendance(request):
    """
    Submit attendance records for a toolbox talk
    """
    toolbox_talk_id = request.data.get('toolbox_talk_id')
    attendance_records = request.data.get('attendance_records', [])
    
    if not toolbox_talk_id:
        return Response({'error': 'Toolbox talk ID is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        toolbox_talk = ToolboxTalk.objects.get(id=toolbox_talk_id)
    except ToolboxTalk.DoesNotExist:
        return Response({'error': 'Toolbox talk not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Clear existing attendance records
    ToolboxTalkAttendance.objects.filter(toolbox_talk=toolbox_talk).delete()
    
    # Create new attendance records
    created_records = []
    for record in attendance_records:
        try:
            worker = Worker.objects.get(id=record.get('worker_id'))
            
            # Handle attendance photo if provided
            attendance_photo = None
            if record.get('attendance_photo'):
                # Convert base64 to file
                if record['attendance_photo'].startswith('data:image'):
                    # Extract the base64 part
                    format, imgstr = record['attendance_photo'].split(';base64,')
                    ext = format.split('/')[-1]
                    attendance_photo = ContentFile(
                        base64.b64decode(imgstr),
                        name=f"attendance_{worker.id}_{toolbox_talk.id}.{ext}"
                    )
            
            # Create attendance record
            attendance = ToolboxTalkAttendance.objects.create(
                toolbox_talk=toolbox_talk,
                worker=worker,
                status=record.get('status', 'present'),
                match_score=record.get('match_score', 0)
            )
            
            # Set attendance photo if provided
            if attendance_photo:
                attendance.attendance_photo = attendance_photo
                attendance.save()
                
            created_records.append(attendance)
        except Worker.DoesNotExist:
            logger.error(f"Worker with ID {record.get('worker_id')} not found")
            continue
    
    # Update toolbox talk status to completed
    toolbox_talk.status = 'completed'
    toolbox_talk.save()
    
    return Response({
        'message': 'Attendance submitted successfully',
        'records_created': len(created_records)
    }, status=status.HTTP_201_CREATED)
