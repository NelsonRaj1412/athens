import re
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.shortcuts import get_object_or_404
from .models import Worker
from .serializers import WorkerSerializer, WorkerDetailSerializer
from .permissions import CanManageWorkers
from authentication.project_isolation import ProjectIsolationMixin, apply_project_isolation

class WorkerViewSet(ProjectIsolationMixin, viewsets.ModelViewSet):
    """
    API endpoint for managing workers.
    """
    queryset = Worker.objects.all()
    serializer_class = WorkerSerializer
    permission_classes = [IsAuthenticated, CanManageWorkers]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'surname', 'worker_id', 'aadhaar', 'phone_number']
    ordering_fields = ['name', 'created_at', 'date_of_joining', 'department']
    model = Worker  # Required for permission decorator
    
    def get_serializer_class(self):
        """
        Return different serializers based on the action.
        """
        if self.action == 'retrieve':
            return WorkerDetailSerializer
        return WorkerSerializer
    
    def get_queryset(self):
        """
        Filter workers based on user type and permissions
        PROJECT-BOUNDED: Only returns workers from the same project as the requesting user.
        """
        user = self.request.user
        
        # Superusers see all workers (for system administration)
        if user.is_superuser:
            return Worker.objects.all()
        
        # Apply project isolation
        return apply_project_isolation(Worker.objects.all(), user)
    
    def perform_create(self, serializer):
        """
        Set the created_by field and project to the current user when creating a worker.
        PROJECT-BOUNDED: Automatically assigns the user's project to ensure data isolation.
        """
        # PROJECT ISOLATION: Ensure user has a project
        if not self.request.user.project:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("User must be assigned to a project to create workers.")
        
        serializer.save(created_by=self.request.user, project=self.request.user.project)
    
    def list(self, request, *args, **kwargs):
        """
        List all workers.
        """
        print(f"DEBUG: Worker list called by user: {request.user.username}")
        print(f"DEBUG: User admin_type: {getattr(request.user, 'admin_type', None)}")
        print(f"DEBUG: User project: {getattr(request.user, 'project', None)}")
        
        queryset = self.filter_queryset(self.get_queryset())
        print(f"DEBUG: Queryset count: {queryset.count()}")
        print(f"DEBUG: Total workers in DB: {Worker.objects.count()}")
        
        if queryset.count() > 0:
            first_worker = queryset.first()
            print(f"DEBUG: First worker: {first_worker.name} {first_worker.surname} (ID: {first_worker.id})")
            print(f"DEBUG: First worker created_by: {first_worker.created_by}")
            print(f"DEBUG: First worker project: {first_worker.project}")
        
        # Always return non-paginated response for debugging
        serializer = self.get_serializer(queryset, many=True)
        print(f"DEBUG: Serialized data length: {len(serializer.data)}")
        if len(serializer.data) > 0:
            print(f"DEBUG: First serialized worker: {serializer.data[0]}")
        
        return Response(serializer.data)
    
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        Return a list of all active workers.
        """
        active_workers = self.get_queryset().filter(status='active')
        page = self.paginate_queryset(active_workers)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(active_workers, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def inactive(self, request):
        """
        Return a list of all inactive workers.
        """
        inactive_workers = self.get_queryset().filter(status='inactive')
        page = self.paginate_queryset(inactive_workers)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(inactive_workers, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def on_leave(self, request):
        """
        Return a list of all workers on leave.
        """
        on_leave_workers = self.get_queryset().filter(status='on_leave')
        page = self.paginate_queryset(on_leave_workers)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(on_leave_workers, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Search workers by name, surname, worker_id, aadhaar, or phone number.
        """
        query = request.query_params.get('q', '')
        if not query:
            return Response({"error": "Search query parameter 'q' is required"}, 
                            status=status.HTTP_400_BAD_REQUEST)
        
        workers = self.get_queryset().filter(
            Q(name__icontains=query) | 
            Q(surname__icontains=query) | 
            Q(worker_id__icontains=query) | 
            Q(aadhaar__icontains=query) |
            Q(phone_number__icontains=query)
        )
        
        page = self.paginate_queryset(workers)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(workers, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def check_duplicate_aadhaar(self, request):
        """
        Check if an Aadhaar number already exists across ALL workers in the database.
        This is used for frontend validation to prevent duplicate Aadhaar numbers.
        """
        aadhaar = request.query_params.get('aadhaar')
        if not aadhaar:
            return Response(
                {"error": "Aadhaar parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate Aadhaar format
        if not re.match(r'^\d{12}$', aadhaar):
            return Response(
                {"error": "Aadhaar must be exactly 12 digits"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check across ALL workers in the database (not filtered by user)
        existing_worker = Worker.objects.filter(aadhaar=aadhaar).first()

        if existing_worker:
            return Response({
                "isDuplicate": True,
                "existingWorker": {
                    "id": existing_worker.id,
                    "name": existing_worker.name,
                    "surname": existing_worker.surname,
                    "worker_id": existing_worker.worker_id,
                    "created_by": existing_worker.created_by.username if existing_worker.created_by else None,
                    "project": existing_worker.project.name if existing_worker.project else None
                }
            })

        return Response({
            "isDuplicate": False
        })

    @action(detail=False, methods=['get'])
    def by_employment_status(self, request):
        """
        Get workers filtered by employment status (respects user permissions)
        PROJECT-BOUNDED: Only returns workers from the same project.
        """
        status_param = request.query_params.get('status')
        if not status_param:
            return Response(
                {"error": "Employment status parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate employment status
        valid_statuses = [choice[0] for choice in Worker.EMPLOYMENT_STATUS_CHOICES]
        if status_param not in valid_statuses:
            return Response(
                {"error": f"Invalid employment status. Must be one of: {', '.join(valid_statuses)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # PROJECT ISOLATION: Filter workers by employment status using the proper queryset (respects permissions)
        workers = self.get_queryset().filter(employment_status=status_param)
        serializer = self.get_serializer(workers, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def update_employment_status(self, request):
        """
        Update employment status for multiple workers
        PROJECT-BOUNDED: Only updates workers from the same project.
        """
        worker_ids = request.data.get('worker_ids', [])
        employment_status = request.data.get('employment_status')
        
        if not worker_ids or not employment_status:
            return Response(
                {"error": "Worker IDs and employment status are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate employment status
        valid_statuses = [choice[0] for choice in Worker.EMPLOYMENT_STATUS_CHOICES]
        if employment_status not in valid_statuses:
            return Response(
                {"error": f"Invalid employment status. Must be one of: {', '.join(valid_statuses)}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # PROJECT ISOLATION: Update workers only from the same project
        updated_count = 0
        for worker_id in worker_ids:
            try:
                worker = Worker.objects.get(id=worker_id, project=request.user.project)  # PROJECT ISOLATION
                worker.employment_status = employment_status
                worker.save()
                updated_count += 1
            except Worker.DoesNotExist:
                continue
        
        return Response({
            "message": f"Updated employment status for {updated_count} workers",
            "updated_count": updated_count
        })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_user_permissions(request):
    """
    A simple endpoint to check the current user's permissions.
    PROJECT-BOUNDED: Shows project-specific data counts.
    """
    user = request.user
    
    # PROJECT ISOLATION: Count workers only from user's project
    if user.project:
        workers_in_project = Worker.objects.filter(project=user.project).count()
        workers_created_by_user = Worker.objects.filter(created_by=user, project=user.project).count()
    else:
        workers_in_project = 0
        workers_created_by_user = 0
    
    return Response({
        'username': user.username,
        'admin_type': getattr(user, 'admin_type', None),
        'user_type': getattr(user, 'user_type', None),
        'project': user.project.projectName if user.project else None,
        'project_id': user.project.id if user.project else None,
        'permissions': list(user.get_all_permissions()),
        'has_manage_workers': user.has_perm('worker.manage_workers'),
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'total_workers_in_db': Worker.objects.count(),
        'workers_in_project': workers_in_project,
        'workers_created_by_user': workers_created_by_user,
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debug_worker_data(request):
    """
    Debug endpoint showing project-bounded worker data.
    """
    user = request.user
    
    # PROJECT ISOLATION: Show project-specific data
    if user.project:
        project_workers = Worker.objects.filter(project=user.project)
        user_created_workers = Worker.objects.filter(created_by=user, project=user.project)
    else:
        project_workers = Worker.objects.none()
        user_created_workers = Worker.objects.none()
    
    return Response({
        'user_project': user.project.projectName if user.project else None,
        'total_workers_system': Worker.objects.count(),
        'workers_in_project': project_workers.count(),
        'user_created_workers': user_created_workers.count(),
        'first_5_project_workers': [{
            'name': w.name,
            'worker_id': w.worker_id,
            'created_by': w.created_by.username if w.created_by else None,
            'project': w.project.projectName if w.project else None,
        } for w in project_workers[:5]]
    })