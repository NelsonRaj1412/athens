from rest_framework import viewsets, status
from permissions.decorators import require_permission
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import Inspection, InspectionItem, InspectionReport
from .serializers import InspectionSerializer, InspectionItemSerializer, InspectionReportSerializer

User = get_user_model()

class InspectionViewSet(viewsets.ModelViewSet):
    serializer_class = InspectionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        project_id = self.request.query_params.get('project_id')
        
        if project_id:
            queryset = Inspection.objects.filter(project_id=project_id)
        else:
            # Get user's project and filter by it
            user_project = getattr(user, 'project', None)
            if user_project:
                queryset = Inspection.objects.filter(project=user_project)
            else:
                queryset = Inspection.objects.none()
            
        # Filter by status if provided
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        # Filter by inspection type if provided
        type_filter = self.request.query_params.get('type')
        if type_filter:
            queryset = queryset.filter(inspection_type=type_filter)
            
        # Search functionality
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(location__icontains=search)
            )
            
        return queryset.distinct()
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def start_inspection(self, request, pk=None):
        inspection = self.get_object()
        if inspection.status != 'scheduled':
            return Response(
                {'error': 'Only scheduled inspections can be started'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        inspection.status = 'in_progress'
        inspection.actual_start_date = timezone.now()
        inspection.save()
        
        return Response({'message': 'Inspection started successfully'})
    
    @action(detail=True, methods=['post'])
    def complete_inspection(self, request, pk=None):
        inspection = self.get_object()
        if inspection.status != 'in_progress':
            return Response(
                {'error': 'Only in-progress inspections can be completed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        inspection.status = 'completed'
        inspection.actual_end_date = timezone.now()
        inspection.save()
        
        # Generate report
        self._generate_report(inspection)
        
        return Response({'message': 'Inspection completed successfully'})
    
    def _generate_report(self, inspection):
        items = inspection.items.all()
        total_items = items.count()
        compliant_items = items.filter(compliance_status='compliant').count()
        non_compliant_items = items.filter(compliance_status='non_compliant').count()
        observations = items.filter(compliance_status='observation').count()
        
        overall_score = (compliant_items / total_items * 100) if total_items > 0 else 0
        
        InspectionReport.objects.update_or_create(
            inspection=inspection,
            defaults={
                'total_items': total_items,
                'compliant_items': compliant_items,
                'non_compliant_items': non_compliant_items,
                'observations': observations,
                'overall_score': overall_score,
                'summary': f'Inspection completed with {compliant_items}/{total_items} compliant items'
            }
        )
    @require_permission('edit')
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @require_permission('edit')
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @require_permission('delete')
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)


class InspectionItemViewSet(viewsets.ModelViewSet):
    serializer_class = InspectionItemSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        inspection_id = self.request.query_params.get('inspection_id')
        if inspection_id:
            return InspectionItem.objects.filter(inspection_id=inspection_id)
        return InspectionItem.objects.none()

class InspectionReportViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = InspectionReportSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        user_project = getattr(user, 'project', None)
        if user_project:
            return InspectionReport.objects.filter(inspection__project=user_project)
        return InspectionReport.objects.none()

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def inspection_users(request):
    """
    Get users from the same project for witnessed_by dropdown
    """
    user = request.user
    
    # PROJECT ISOLATION: Only return users from the same project
    if not user.project:
        return Response({
            'error': 'Project access required',
            'message': 'User must be assigned to a project to access project users.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Get users from the same project
    project_users = User.objects.filter(
        project=user.project,
        is_active=True
    ).exclude(
        admin_type='master'  # Exclude master admins
    ).values('id', 'username', 'name', 'surname')
    
    # Format for dropdown
    users_list = []
    for user_data in project_users:
        display_name = f"{user_data['name']} {user_data['surname']}".strip() if user_data['name'] else user_data['username']
        users_list.append({
            'id': user_data['id'],
            'username': user_data['username'],
            'display_name': display_name
        })
    
    return Response({
        'users': users_list,
        'count': len(users_list)
    })