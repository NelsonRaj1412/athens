from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.db import models
from .models import JobTraining, JobTrainingAttendance
from .serializers import (
    JobTrainingSerializer, 
    JobTrainingListSerializer, 
    JobTrainingAttendanceSerializer,
    UserSerializer
)
from worker.models import Worker
from permissions.decorators import require_permission

User = get_user_model()

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_job_training(request):
    """Create a new job training"""
    serializer = JobTrainingSerializer(data=request.data)
    if serializer.is_valid():
        user_project = getattr(request.user, 'project', None)
        serializer.save(created_by=request.user, project=user_project)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class JobTrainingViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    model = JobTraining  # Required for permission decorator
    
    def get_serializer_class(self):
        if self.action == 'list':
            return JobTrainingListSerializer
        return JobTrainingSerializer
    
    def get_queryset(self):
        # Return all job trainings ordered by creation date
        return JobTraining.objects.all().order_by('-created_at')
    
    def perform_create(self, serializer):
        user_project = getattr(self.request.user, 'project', None)
        serializer.save(created_by=self.request.user, project=user_project)
    
    @action(detail=False, methods=['get'], url_path='users/list')
    def users_list(self, request):
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
    
    @action(detail=False, methods=['get'], url_path='users/search')
    def users_search(self, request):
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

    @action(detail=False, methods=['get'], url_path='deployed-workers')
    def deployed_workers(self, request):
        """
        Get all workers with 'deployed' employment status for job training attendance.
        Only deployed workers can attend job training.
        """
        try:
            from worker.models import Worker
            from worker.serializers import WorkerSerializer

            # Get ALL workers with 'deployed' status across all users and projects
            deployed_workers = Worker.objects.filter(
                employment_status='deployed'
            ).select_related('created_by', 'project').order_by('name', 'surname')


            # Use the worker serializer to format the response consistently
            # Include request context so photo URLs are properly built
            serializer = WorkerSerializer(deployed_workers, many=True, context={'request': request})

            # Fix photo URLs to be absolute
            serialized_data = serializer.data
            for worker_data in serialized_data:
                if worker_data.get('photo') and worker_data['photo'].startswith('/media/'):
                    absolute_url = request.build_absolute_uri(worker_data['photo'])
                    worker_data['photo'] = absolute_url
                elif worker_data.get('photo') and not worker_data['photo'].startswith('http'):
                    absolute_url = request.build_absolute_uri(worker_data['photo'])
                    worker_data['photo'] = absolute_url

            # Add some statistics for better context
            total_workers = Worker.objects.count()
            initiated_workers = Worker.objects.filter(employment_status='initiated').count()

            response_data = {
                'count': deployed_workers.count(),
                'workers': serialized_data,
                'statistics': {
                    'total_workers': total_workers,
                    'deployed_workers': deployed_workers.count(),
                    'initiated_workers': initiated_workers,
                    'message': f'Showing {deployed_workers.count()} workers eligible for job training'
                }
            }

            return Response(response_data)

        except Exception as e:
            return Response(
                {"error": f"Failed to fetch deployed workers: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get', 'post'])
    def attendance(self, request, pk=None):
        """
        Get or submit attendance for a job training
        """
        job_training = self.get_object()
        
        if request.method == 'GET':
            # Return existing attendance records
            attendances = job_training.attendances.all()
            serializer = JobTrainingAttendanceSerializer(attendances, many=True)
            return Response(serializer.data)
        
        # POST method - submit attendance
        attendance_records = request.data.get('attendance_records', [])
        evidence_photo = request.data.get('evidence_photo')
        
        if not attendance_records:
            return Response(
                {"error": "No attendance records provided"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        created_records = []
        present_worker_ids = []
        
        for record in attendance_records:
            worker_id = record.get('worker_id')
            attendance_status = record.get('status')
            attendance_photo = record.get('attendance_photo', '')
            match_score = record.get('match_score', 0)
            
            try:
                worker = Worker.objects.get(id=worker_id)
                
                # Create or update attendance record
                attendance, created = JobTrainingAttendance.objects.update_or_create(
                    job_training=job_training,
                    worker=worker,
                    defaults={
                        'status': attendance_status,
                        'attendance_photo': attendance_photo,
                        'match_score': match_score
                    }
                )
                
                created_records.append(attendance)
                
                if attendance_status == 'present':
                    present_worker_ids.append(worker_id)
                
            except Worker.DoesNotExist:
                return Response(
                    {"error": f"Worker with ID {worker_id} does not exist"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Update job training status to completed
        job_training.status = 'completed'
        job_training.save()
        
        return Response({
            'message': 'Attendance submitted successfully',
            'records_created': len(created_records),
            'workers_present': len(present_worker_ids)
        }, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)
