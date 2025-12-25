from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import get_user_model
from django.db import models
from .models import InductionTraining, InductionAttendance
from .serializers import (
    InductionTrainingSerializer, 
    InductionTrainingListSerializer,
    InductionAttendanceSerializer
)
from permissions.decorators import require_permission

User = get_user_model()

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
        user = self.request.user
        user_project = getattr(user, 'project', None)
        
        if user_project:
            return InductionTraining.objects.filter(project=user_project)
        return InductionTraining.objects.filter(created_by=user)
    
    def create(self, request, *args, **kwargs):
        """Handle POST requests to create new induction training"""
        serializer = self.get_serializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user_project = getattr(request.user, 'project', None)
            serializer.save(created_by=request.user, project=user_project)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def perform_create(self, serializer):
        user_project = getattr(self.request.user, 'project', None)
        serializer.save(created_by=self.request.user, project=user_project)

    @require_permission('edit')
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)
    
    @require_permission('edit')
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)
    
    @require_permission('delete')
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)
    
    def list(self, request, *args, **kwargs):
        print(f"InductionTraining list called by user: {request.user}")
        queryset = self.get_queryset()
        print(f"Queryset count: {queryset.count()}")
        serializer = self.get_serializer(queryset, many=True)
        print(f"Serialized data count: {len(serializer.data)}")
        return Response(serializer.data)
    
    @action(detail=True, methods=['post', 'get'])
    def attendance(self, request, pk=None):
        """
        Submit attendance for an induction training and update worker employment status
        """
        induction = self.get_object()

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
        
        for record in attendance_records:
            worker_id = record.get('worker_id')
            if not worker_id:
                continue
            
            try:
                # Get the worker
                from worker.models import Worker
                worker = Worker.objects.get(id=worker_id)
                
                # Create attendance record
                attendance = InductionAttendance.objects.create(
                    induction=induction,
                    worker_id=worker_id,
                    worker_name=record.get('worker_name', f"{worker.name} {worker.surname}".strip()),
                    status=record.get('status', 'present')
                )
                
                created_records.append(attendance)
                
                # Track present workers to update their employment status
                if record.get('status') == 'present':
                    present_worker_ids.append(worker_id)
                    
            except Worker.DoesNotExist:
                continue
        
        # Update induction training status to completed
        induction.status = 'completed'
        induction.save()
        
        # Update employment status of present workers to "deployed"
        if present_worker_ids:
            Worker.objects.filter(id__in=present_worker_ids).update(employment_status='deployed')
        
        return Response({
            'message': 'Attendance submitted successfully',
            'records_created': len(created_records),
            'workers_deployed': len(present_worker_ids)
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
        Get all workers with 'initiated' employment status across all users.
        This is used for induction training attendance to show all workers
        who need to attend induction training regardless of who created them.
        """
        try:
            from worker.models import Worker
            from worker.serializers import WorkerSerializer

            # Get ALL workers with 'initiated' status across all users and projects
            initiated_workers = Worker.objects.filter(
                employment_status='initiated'
            ).select_related('created_by', 'project').order_by('name', 'surname')


            # Use the worker serializer to format the response consistently
            # Include request context so photo URLs are properly built
            serializer = WorkerSerializer(initiated_workers, many=True, context={'request': request})

            # Fix photo URLs to be absolute (comprehensive fix)
            serialized_data = serializer.data

            for worker_data in serialized_data:
                original_photo = worker_data.get('photo')

                if original_photo:
                    # Handle all cases where photo URL needs to be made absolute
                    if original_photo.startswith('/media/') or original_photo.startswith('/static/') or not original_photo.startswith('http'):
                        absolute_url = request.build_absolute_uri(original_photo)
                        worker_data['photo'] = absolute_url
                    else:
                        pass
                else:
                    pass

            # Add some statistics for better context
            total_workers = Worker.objects.count()
            deployed_workers = Worker.objects.filter(employment_status='deployed').count()

            response_data = {
                'count': initiated_workers.count(),
                'workers': serialized_data,  # Use the fixed data with absolute URLs
                'statistics': {
                    'total_workers': total_workers,
                    'initiated_workers': initiated_workers.count(),
                    'deployed_workers': deployed_workers,
                    'message': f'Showing {initiated_workers.count()} workers who need induction training'
                }
            }

            return Response(response_data)

        except Exception as e:
            return Response(
                {"error": f"Failed to fetch initiated workers: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='list')
    def list_inductions(self, request):
        """
        Alias for the list action to support the /induction/list/ URL.
        """
        return self.list(request)
