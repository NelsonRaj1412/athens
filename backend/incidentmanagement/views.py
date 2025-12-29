from rest_framework import viewsets, permissions, status, filters, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.utils import timezone
from django.db.models import Count, Q, Avg
from django.shortcuts import get_object_or_404
import os
from authentication.project_isolation import ProjectIsolationMixin, apply_project_isolation


from .models import (
    Incident, IncidentAttachment, IncidentAuditLog, IncidentNotification,
    # Commercial grade models
    IncidentCostCenter, IncidentLearning,
    # 8D Methodology models
    EightDProcess, EightDDiscipline, EightDTeam, EightDContainmentAction,
    EightDRootCause, EightDCorrectiveAction, EightDPreventionAction, EightDAnalysisMethod
)
from .serializers import (
    IncidentSerializer, IncidentListSerializer, IncidentAttachmentSerializer,
    IncidentAuditLogSerializer, IncidentNotificationSerializer,
    # Commercial grade serializers
    IncidentCostCenterSerializer, IncidentLearningSerializer,
    # 8D Methodology serializers
    EightDProcessSerializer, EightDProcessListSerializer, EightDDisciplineSerializer,
    EightDTeamSerializer, EightDContainmentActionSerializer, EightDRootCauseSerializer,
    EightDCorrectiveActionSerializer, EightDPreventionActionSerializer, EightDAnalysisMethodSerializer
)
from .permissions import CanManageIncidents, CanManage8DProcessElements
from permissions.decorators import require_permission


class IncidentViewSet(ProjectIsolationMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing incidents with comprehensive filtering and actions
    """
    permission_classes = [IsAuthenticated, CanManageIncidents]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['incident_id', 'title', 'description', 'reporter_name', 'location']
    filterset_fields = [
        'incident_type', 'severity_level', 'status', 'department',
        'assigned_investigator', 'reported_by'
    ]
    ordering_fields = ['created_at', 'date_time_incident', 'severity_level', 'status']
    ordering = ['-created_at']
    model = Incident  # Required for permission decorator

    def get_serializer_class(self):
        if self.action == 'list':
            return IncidentListSerializer
        return IncidentSerializer

    def get_queryset(self):
        user = self.request.user
        
        queryset = Incident.objects.all()
        
        # Apply project isolation
        queryset = apply_project_isolation(queryset, user)

        # Optimize queries with select_related and prefetch_related
        if self.action == 'list':
            queryset = queryset.select_related(
                'reported_by', 'assigned_investigator'
            ).prefetch_related('attachments')
        else:
            queryset = queryset.select_related(
                'reported_by', 'assigned_investigator', 'project'
            ).prefetch_related(
                'attachments__uploaded_by',
                'audit_logs__performed_by',
                'notifications__recipient'
            )

        return queryset

    def perform_create(self, serializer):
        with transaction.atomic():
            try:
                # First, save the incident itself to get an incident object
                incident = serializer.save(reported_by=self.request.user)

                # Handle file attachments - check for both 'attachments' and indexed format
                attachments = []
                
                # Try to get files from 'attachments' key first
                if 'attachments' in self.request.FILES:
                    attachments.extend(self.request.FILES.getlist('attachments'))
                
                # Also check for indexed format like 'attachments[0]', 'attachments[1]', etc.
                for key in self.request.FILES.keys():
                    if key.startswith('attachments[') and key.endswith(']'):
                        attachments.append(self.request.FILES[key])
                
                # Create attachment records
                for file in attachments:
                    try:
                        IncidentAttachment.objects.create(
                            incident=incident,
                            file=file,
                            filename=os.path.basename(file.name),
                            file_size=file.size,
                            file_type=file.content_type or 'application/octet-stream',
                            uploaded_by=self.request.user
                        )
                    except Exception as attachment_error:
                        # Log attachment error but don't fail the entire incident creation
                        print(f"Warning: Failed to save attachment {file.name}: {attachment_error}")
                        
            except Exception as e:
                # Log the error for debugging
                print(f"Error in perform_create: {e}")
                raise e

    @require_permission('edit')
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)
    
    @require_permission('edit')
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)
    
    @require_permission('delete')
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    def perform_update(self, serializer):
        with transaction.atomic():
            old_instance = self.get_object()
            old_status = old_instance.status

            incident = serializer.save()

            # Create audit log for status changes
            if old_status != incident.status:
                IncidentAuditLog.objects.create(
                    incident=incident,
                    action='status_changed',
                    description=f'Status changed from {old_status} to {incident.status}',
                    performed_by=self.request.user,
                    previous_value=old_status,
                    new_value=incident.status,
                    ip_address=self.get_client_ip(),
                    user_agent=self.request.META.get('HTTP_USER_AGENT', '')
                )

                # Send status change notifications
                self.send_incident_notifications(incident, 'status_changed')



    @action(detail=True, methods=['post'])
    def close_incident(self, request, pk=None):
        """Close an incident"""
        incident = self.get_object()
        closure_notes = request.data.get('closure_notes', '')

        if incident.status == 'closed':
            return Response(
                {'error': 'Incident is already closed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            incident.status = 'closed'
            incident.save()

            # Create audit log
            IncidentAuditLog.objects.create(
                incident=incident,
                action='closed',
                description=f'Incident closed. Notes: {closure_notes}',
                performed_by=request.user,
                ip_address=self.get_client_ip(),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )

        return Response(IncidentSerializer(incident, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update incident status with validation"""
        incident = self.get_object()

        new_status = request.data.get('status')
        notes = request.data.get('notes', '')

        if not new_status:
            return Response(
                {'error': 'Status is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate status transition
        valid_statuses = [choice[0] for choice in incident.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Invalid status: {new_status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if incident.status == new_status:
            return Response(
                {'error': f'Incident is already in {new_status} status'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            old_status = incident.status
            incident.status = new_status
            incident.save()

            # Create audit log
            IncidentAuditLog.objects.create(
                incident=incident,
                action='status_updated',
                description=f'Status changed from {old_status} to {new_status}. Notes: {notes}',
                performed_by=request.user,
                previous_value=old_status,
                new_value=new_status,
                ip_address=self.get_client_ip(),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )

            # Send notification
            self.send_incident_notifications(incident, 'status_updated')

        return Response({
            'message': f'Status updated to {new_status}',
            'incident_id': incident.incident_id,
            'old_status': old_status,
            'new_status': new_status
        })

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Get dashboard statistics for incidents"""
        user_project = getattr(request.user, 'project', None)
        queryset = self.get_queryset()

        # Basic counts
        total_incidents = queryset.count()
        open_incidents = queryset.filter(status__in=['reported', 'under_review', 'under_investigation', 'capa_pending']).count()
        closed_incidents = queryset.filter(status='closed').count()
        overdue_incidents = queryset.filter(
            status__in=['reported', 'under_review', 'under_investigation'],
            created_at__lt=timezone.now() - timezone.timedelta(days=7)
        ).count()

        # Severity distribution
        severity_stats = queryset.values('severity_level').annotate(count=Count('id'))

        # Status distribution
        status_stats = queryset.values('status').annotate(count=Count('id'))

        # Monthly trends (last 12 months)
        from datetime import datetime, timedelta
        monthly_stats = []
        for i in range(12):
            month_start = (timezone.now() - timedelta(days=30*i)).replace(day=1)
            month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            count = queryset.filter(
                created_at__gte=month_start,
                created_at__lte=month_end
            ).count()
            monthly_stats.append({
                'month': month_start.strftime('%Y-%m'),
                'count': count
            })

        return Response({
            'total_incidents': total_incidents,
            'open_incidents': open_incidents,
            'closed_incidents': closed_incidents,
            'overdue_incidents': overdue_incidents,
            'severity_distribution': list(severity_stats),
            'status_distribution': list(status_stats),
            'monthly_trends': monthly_stats[::-1]  # Reverse to show oldest first
        })

    @action(detail=True, methods=['get', 'post'])
    def costs(self, request, pk=None):
        """Get or create cost entries for an incident"""
        incident = self.get_object()
        
        if request.method == 'GET':
            cost_entries = IncidentCostCenter.objects.filter(incident=incident)
            serializer = IncidentCostCenterSerializer(cost_entries, many=True, context={'request': request})
            return Response(serializer.data)
        
        elif request.method == 'POST':
            serializer = IncidentCostCenterSerializer(data=request.data, context={'request': request})
            if serializer.is_valid():
                serializer.save(incident=incident, created_by=request.user)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get', 'post'])
    def learning(self, request, pk=None):
        """Get or create lessons learned for an incident"""
        incident = self.get_object()
        
        if request.method == 'GET':
            try:
                learning = IncidentLearning.objects.get(incident=incident)
                serializer = IncidentLearningSerializer(learning, context={'request': request})
                return Response(serializer.data)
            except IncidentLearning.DoesNotExist:
                return Response({'detail': 'No lessons learned found'}, status=status.HTTP_404_NOT_FOUND)
        
        elif request.method == 'POST':
            # Check if learning already exists
            try:
                learning = IncidentLearning.objects.get(incident=incident)
                serializer = IncidentLearningSerializer(learning, data=request.data, context={'request': request})
            except IncidentLearning.DoesNotExist:
                serializer = IncidentLearningSerializer(data=request.data, context={'request': request})
            
            if serializer.is_valid():
                serializer.save(incident=incident, created_by=request.user)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def get_client_ip(self):
        """Get client IP address from request"""
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = self.request.META.get('REMOTE_ADDR')
        return ip

    def send_incident_notifications(self, incident, notification_type):
        """Send notifications for incident events"""
        # This would integrate with your notification system
        # For now, we'll create notification records
        recipients = []

        if notification_type == 'incident_created':
            # Notify safety officers, supervisors, etc.
            from django.contrib.auth import get_user_model
            User = get_user_model()
            recipients = User.objects.filter(
                user_type__in=['adminuser', 'clientuser'],
                project=incident.project
            )
        elif notification_type == 'incident_assigned':
            recipients = [incident.assigned_investigator] if incident.assigned_investigator else []
        elif notification_type == 'status_changed':
            recipients = [incident.reported_by, incident.assigned_investigator]
            recipients = [r for r in recipients if r]  # Remove None values

        for recipient in recipients:
            IncidentNotification.objects.create(
                incident=incident,
                notification_type=notification_type,
                recipient=recipient,
                message=f"Incident {incident.incident_id}: {notification_type.replace('_', ' ').title()}"
            )

    @action(detail=False, methods=['get'], url_path='project-users')
    def project_users(self, request):
        """Get users from the same project for assignment dropdown (only induction-trained users)"""
        user = request.user
        
        # PROJECT ISOLATION: Only return users from the same project
        if not user.project:
            return Response({
                'error': 'Project access required',
                'message': 'User must be assigned to a project to access project users.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get users from the same project using strict project isolation with induction training requirement
        from authentication.project_isolation import apply_user_project_isolation_with_induction
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        project_users = apply_user_project_isolation_with_induction(
            User.objects.filter(is_active=True).exclude(admin_type='master'),
            user
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
            'count': len(users_list),
            'message': 'Only induction-trained users are shown'
        })


class IncidentAttachmentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing incident attachments"""
    serializer_class = IncidentAttachmentSerializer
    permission_classes = [IsAuthenticated, CanManageIncidents]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['incident']

    def get_queryset(self):
        user = self.request.user
        user_project = getattr(user, 'project', None)

        queryset = IncidentAttachment.objects.all()

        if user_project:
            queryset = queryset.filter(incident__project=user_project)

        return queryset.select_related('incident', 'uploaded_by')


# Investigation and CAPA ViewSets removed - using 8D methodology only


# === 8D METHODOLOGY VIEWSETS ===

class EightDProcessViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing 8D problem-solving processes
    """
    permission_classes = [IsAuthenticated, CanManageIncidents]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['eight_d_id', 'problem_statement', 'incident__incident_id']
    filterset_fields = ['status', 'current_discipline', 'champion']
    ordering_fields = ['initiated_date', 'target_completion_date', 'overall_progress']
    ordering = ['-initiated_date']
    model = EightDProcess  # Required for permission decorator
    
    @require_permission('edit')
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)
    
    @require_permission('edit')
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)
    
    @require_permission('delete')
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    def get_serializer_class(self):
        if self.action == 'list':
            return EightDProcessListSerializer
        return EightDProcessSerializer

    def get_queryset(self):
        user = self.request.user
        user_project = getattr(user, 'project', None)

        queryset = EightDProcess.objects.select_related(
            'incident', 'champion'
        ).prefetch_related(
            'disciplines', 'team_members', 'containment_actions',
            'root_causes', 'corrective_actions', 'prevention_actions'
        )

        # Filter by project if user has project assignment
        if user_project:
            queryset = queryset.filter(incident__project=user_project)

        return queryset

    @action(detail=True, methods=['post'])
    def start_discipline(self, request, pk=None):
        """Start a specific 8D discipline"""
        process = self.get_object()
        discipline_number = request.data.get('discipline_number')

        if not discipline_number or not (1 <= discipline_number <= 8):
            return Response(
                {'error': 'Valid discipline_number (1-8) is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get or create the discipline
        discipline, created = EightDDiscipline.objects.get_or_create(
            eight_d_process=process,
            discipline_number=discipline_number,
            defaults={
                'status': 'in_progress',
                'start_date': timezone.now(),
                'assigned_to': request.user
            }
        )

        if not created and discipline.status == 'completed':
            return Response(
                {'error': 'This discipline is already completed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update discipline status
        discipline.status = 'in_progress'
        discipline.start_date = timezone.now()
        discipline.save()

        # Update process current discipline
        if discipline_number > process.current_discipline:
            process.current_discipline = discipline_number
            process.save()

        serializer = EightDDisciplineSerializer(discipline)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def complete_discipline(self, request, pk=None):
        """Complete a specific 8D discipline"""
        process = self.get_object()
        discipline_number = request.data.get('discipline_number')

        # Get or create the discipline
        discipline, created = EightDDiscipline.objects.get_or_create(
            eight_d_process=process,
            discipline_number=discipline_number,
            defaults={
                'status': 'in_progress',
                'start_date': timezone.now(),
                'assigned_to': request.user,
                'description': f'D{discipline_number} discipline work',
                'deliverables': f'Completed D{discipline_number} deliverables'
            }
        )

        # Update discipline
        discipline.status = 'completed'
        discipline.completion_date = timezone.now()
        discipline.progress_percentage = 100
        discipline.save()

        # Update process progress
        completed_disciplines = process.disciplines.filter(status='completed').count()
        process.overall_progress = (completed_disciplines / 8) * 100
        
        
        # Update current discipline to next one
        if discipline_number >= process.current_discipline:
            process.current_discipline = min(discipline_number + 1, 8)
        else:
            pass

        # If all disciplines completed, mark process as completed
        if completed_disciplines == 8:
            process.status = 'completed'
            process.actual_completion_date = timezone.now()
            
            # Auto-close the incident when 8D process is complete
            incident = process.incident
            incident.status = 'closed'
            incident.save()

        process.save()

        serializer = EightDDisciplineSerializer(discipline)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get overdue 8D processes"""
        overdue_processes = self.get_queryset().filter(
            target_completion_date__lt=timezone.now(),
            status__in=['initiated', 'in_progress']
        )

        serializer = self.get_serializer(overdue_processes, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Get 8D process analytics"""
        queryset = self.get_queryset()

        analytics = {
            'total_processes': queryset.count(),
            'active_processes': queryset.filter(status='in_progress').count(),
            'completed_processes': queryset.filter(status='completed').count(),
            'overdue_processes': queryset.filter(
                target_completion_date__lt=timezone.now(),
                status__in=['initiated', 'in_progress']
            ).count(),
            'average_completion_time': queryset.filter(
                status='completed',
                actual_completion_date__isnull=False
            ).aggregate(
                avg_days=Avg('actual_completion_date') - Avg('initiated_date')
            )['avg_days'],
            'discipline_progress': {}
        }

        # Get discipline progress statistics
        for i in range(1, 9):
            discipline_stats = EightDDiscipline.objects.filter(
                eight_d_process__in=queryset,
                discipline_number=i
            ).aggregate(
                total=Count('id'),
                completed=Count('id', filter=Q(status='completed')),
                in_progress=Count('id', filter=Q(status='in_progress'))
            )
            analytics['discipline_progress'][f'D{i}'] = discipline_stats

        return Response(analytics)


class EightDTeamViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing 8D team members
    """
    serializer_class = EightDTeamSerializer
    permission_classes = [IsAuthenticated, CanManage8DProcessElements]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['user__first_name', 'user__last_name', 'role', 'expertise_area']
    filterset_fields = ['eight_d_process', 'role', 'is_active']
    model = EightDTeam  # Required for permission decorator
    
    @require_permission('edit')
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)
    
    @require_permission('edit')
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)
    
    @require_permission('delete')
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)
    
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)
        
    def perform_create(self, serializer):
        
        # Get the eight_d_process from request data
        eight_d_process_id = self.request.data.get('eight_d_process')
        if eight_d_process_id:
            try:
                eight_d_process = EightDProcess.objects.get(id=eight_d_process_id)
                serializer.save(eight_d_process=eight_d_process)
            except EightDProcess.DoesNotExist:
                raise serializers.ValidationError({'eight_d_process': 'Invalid 8D process ID'})
        else:
            raise serializers.ValidationError({'eight_d_process': 'This field is required'})

    def get_queryset(self):
        user = self.request.user
        user_project = getattr(user, 'project', None)

        queryset = EightDTeam.objects.select_related(
            'user', 'eight_d_process', 'recognized_by'
        )

        # Filter by project if user has project assignment
        if user_project:
            queryset = queryset.filter(eight_d_process__incident__project=user_project)

        return queryset

    @action(detail=True, methods=['post'])
    def recognize(self, request, pk=None):
        """Recognize a team member (D8: Recognize the Team)"""
        team_member = self.get_object()
        recognition_notes = request.data.get('recognition_notes', '')

        if not recognition_notes:
            return Response(
                {'error': 'Recognition notes are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        team_member.recognition_notes = recognition_notes
        team_member.recognized_by = request.user
        team_member.recognized_date = timezone.now()
        team_member.save()

        serializer = self.get_serializer(team_member)
        return Response(serializer.data)


class EightDContainmentActionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing 8D containment actions (D3)
    """
    serializer_class = EightDContainmentActionSerializer
    permission_classes = [IsAuthenticated, CanManage8DProcessElements]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['action_description', 'rationale']
    filterset_fields = ['eight_d_process', 'status', 'responsible_person']

    def get_queryset(self):
        user = self.request.user
        user_project = getattr(user, 'project', None)

        queryset = EightDContainmentAction.objects.select_related(
            'eight_d_process', 'responsible_person'
        )

        # Filter by project if user has project assignment
        if user_project:
            queryset = queryset.filter(eight_d_process__incident__project=user_project)


        return queryset

    @action(detail=True, methods=['post'], url_path='verify-effectiveness')
    def verify_effectiveness(self, request, pk=None):
        """Verify the effectiveness of a containment action"""
        action = self.get_object()
        
        # Check if user is incident reporter or investigator
        if not (action.eight_d_process.incident.reported_by == request.user or 
                action.eight_d_process.incident.assigned_investigator == request.user):
            return Response(
                {'error': 'Only the incident reporter or investigator can verify effectiveness.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        effectiveness_rating = request.data.get('effectiveness_rating')
        verification_notes = request.data.get('verification_notes', '')

        if not effectiveness_rating or not (1 <= effectiveness_rating <= 5):
            return Response(
                {'error': 'Effectiveness rating (1-5) is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        action.effectiveness_rating = effectiveness_rating
        action.verification_notes = verification_notes
        action.verification_date = timezone.now()
        action.status = 'verified' if effectiveness_rating >= 3 else 'ineffective'
        action.save()

        serializer = self.get_serializer(action)
        return Response(serializer.data)


class EightDRootCauseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing 8D root causes (D4)
    """
    serializer_class = EightDRootCauseSerializer
    permission_classes = [IsAuthenticated, CanManage8DProcessElements]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['cause_description', 'supporting_evidence']
    filterset_fields = ['eight_d_process', 'cause_type', 'analysis_method', 'is_verified']

    def get_queryset(self):
        user = self.request.user
        user_project = getattr(user, 'project', None)

        queryset = EightDRootCause.objects.select_related(
            'eight_d_process', 'identified_by', 'verified_by'
        )

        # Filter by project if user has project assignment
        if user_project:
            queryset = queryset.filter(eight_d_process__incident__project=user_project)

        return queryset

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Verify a root cause"""
        root_cause = self.get_object()
        verification_method = request.data.get('verification_method', '')

        if not verification_method:
            return Response(
                {'error': 'Verification method is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        root_cause.verification_method = verification_method
        root_cause.verified_by = request.user
        root_cause.is_verified = True
        root_cause.save()

        serializer = self.get_serializer(root_cause)
        return Response(serializer.data)


class EightDCorrectiveActionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing 8D corrective actions (D5 & D6)
    """
    serializer_class = EightDCorrectiveActionSerializer
    permission_classes = [IsAuthenticated, CanManage8DProcessElements]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['action_description', 'rationale']
    filterset_fields = ['eight_d_process', 'root_cause', 'action_type', 'status']

    def get_queryset(self):
        user = self.request.user
        user_project = getattr(user, 'project', None)

        queryset = EightDCorrectiveAction.objects.select_related(
            'eight_d_process', 'root_cause', 'responsible_person'
        )

        # Filter by project if user has project assignment
        if user_project:
            queryset = queryset.filter(eight_d_process__incident__project=user_project)

        return queryset

    @action(detail=True, methods=['post'])
    def implement(self, request, pk=None):
        """Mark corrective action as implemented"""
        action = self.get_object()
        implementation_notes = request.data.get('implementation_notes', '')

        action.status = 'implemented'
        action.actual_implementation_date = timezone.now().date()
        action.implementation_notes = implementation_notes
        action.save()

        serializer = self.get_serializer(action)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def verify_effectiveness(self, request, pk=None):
        """Verify the effectiveness of a corrective action"""
        action = self.get_object()
        effectiveness_rating = request.data.get('effectiveness_rating')
        verification_notes = request.data.get('verification_notes', '')

        if not effectiveness_rating or not (1 <= effectiveness_rating <= 5):
            return Response(
                {'error': 'Effectiveness rating (1-5) is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        action.effectiveness_rating = effectiveness_rating
        action.verification_notes = verification_notes
        action.verification_date = timezone.now().date()
        action.status = 'effective' if effectiveness_rating >= 3 else 'ineffective'
        action.save()

        serializer = self.get_serializer(action)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        """Validate corrective action effectiveness"""
        action = self.get_object()
        validation_results = request.data.get('validation_results')
        effectiveness_rating = request.data.get('effectiveness_rating')

        if not validation_results:
            return Response(
                {'error': 'Validation results are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not effectiveness_rating or not (1 <= effectiveness_rating <= 5):
            return Response(
                {'error': 'Effectiveness rating (1-5) is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        action.validation_results = validation_results
        action.effectiveness_rating = effectiveness_rating
        action.status = 'validated'
        action.validation_date = timezone.now()
        action.save()

        serializer = self.get_serializer(action)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def start_implementation(self, request, pk=None):
        """Start implementation of corrective action"""
        action = self.get_object()
        implementation_plan = request.data.get('implementation_plan')
        start_date = request.data.get('start_date')
        resources_required = request.data.get('resources_required', '')

        if not implementation_plan:
            return Response(
                {'error': 'Implementation plan is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        action.implementation_plan = implementation_plan
        action.implementation_start_date = start_date
        action.resources_required = resources_required
        action.status = 'in_progress'
        action.implementation_progress = 0
        action.save()

        serializer = self.get_serializer(action)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def update_progress(self, request, pk=None):
        """Update implementation progress"""
        action = self.get_object()
        progress_percentage = request.data.get('progress_percentage')
        progress_notes = request.data.get('progress_notes')
        completion_evidence = request.data.get('completion_evidence', '')

        if progress_percentage is None or not (0 <= progress_percentage <= 100):
            return Response(
                {'error': 'Valid progress percentage (0-100) is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        action.implementation_progress = progress_percentage
        action.progress_notes = progress_notes
        action.completion_evidence = completion_evidence
        action.save()

        serializer = self.get_serializer(action)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def complete_implementation(self, request, pk=None):
        """Complete implementation of corrective action"""
        action = self.get_object()

        action.status = 'completed'
        action.actual_implementation_date = timezone.now().date()
        action.implementation_progress = 100
        action.save()

        serializer = self.get_serializer(action)
        return Response(serializer.data)


class EightDPreventionActionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing 8D prevention actions (D7)
    """
    serializer_class = EightDPreventionActionSerializer
    permission_classes = [IsAuthenticated, CanManage8DProcessElements]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['prevention_description', 'scope_of_application']
    filterset_fields = ['eight_d_process', 'prevention_type', 'status']

    def get_queryset(self):
        user = self.request.user
        user_project = getattr(user, 'project', None)

        queryset = EightDPreventionAction.objects.select_related(
            'eight_d_process', 'responsible_person'
        )

        # Filter by project if user has project assignment
        if user_project:
            queryset = queryset.filter(eight_d_process__incident__project=user_project)

        return queryset

    @action(detail=True, methods=['post'])
    def implement(self, request, pk=None):
        """Mark prevention action as implemented"""
        action = self.get_object()

        action.status = 'implemented'
        action.implementation_date = timezone.now().date()
        action.save()

        serializer = self.get_serializer(action)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def verify_effectiveness(self, request, pk=None):
        """Verify the effectiveness of a prevention action"""
        action = self.get_object()
        effectiveness_notes = request.data.get('effectiveness_notes', '')

        action.status = 'effective'
        action.verification_date = timezone.now().date()
        action.effectiveness_notes = effectiveness_notes
        action.save()

        serializer = self.get_serializer(action)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def rollout_candidates(self, request):
        """Get prevention actions that can be rolled out to similar processes"""
        effective_actions = self.get_queryset().filter(
            status='effective',
            similar_processes__isnull=False
        ).exclude(similar_processes='')

        serializer = self.get_serializer(effective_actions, many=True)
        return Response(serializer.data)


# === COMMERCIAL GRADE VIEWSETS ===

class IncidentCostCenterViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing incident cost tracking
    """
    serializer_class = IncidentCostCenterSerializer
    permission_classes = [IsAuthenticated, CanManageIncidents]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['description', 'cost_type']
    filterset_fields = ['incident', 'cost_type', 'requires_approval']

    def get_queryset(self):
        user = self.request.user
        user_project = getattr(user, 'project', None)

        queryset = IncidentCostCenter.objects.select_related(
            'incident', 'created_by', 'approved_by'
        )

        # Filter by project if user has project assignment
        if user_project:
            queryset = queryset.filter(incident__project=user_project)

        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a cost entry"""
        cost_entry = self.get_object()
        
        if cost_entry.approved_by:
            return Response(
                {'error': 'Cost entry is already approved'},
                status=status.HTTP_400_BAD_REQUEST
            )

        cost_entry.approved_by = request.user
        cost_entry.approved_at = timezone.now()
        cost_entry.save()

        serializer = self.get_serializer(cost_entry)
        return Response(serializer.data)


class IncidentLearningViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing incident lessons learned
    """
    serializer_class = IncidentLearningSerializer
    permission_classes = [IsAuthenticated, CanManageIncidents]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['key_findings', 'lessons_learned']
    filterset_fields = ['incident', 'training_required', 'policy_updates_required']

    def get_queryset(self):
        user = self.request.user
        user_project = getattr(user, 'project', None)

        queryset = IncidentLearning.objects.select_related(
            'incident', 'created_by'
        )

        # Filter by project if user has project assignment
        if user_project:
            queryset = queryset.filter(incident__project=user_project)

        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class EightDAnalysisMethodViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing 8D analysis methods (D4)
    """
    serializer_class = EightDAnalysisMethodSerializer
    permission_classes = [IsAuthenticated, CanManage8DProcessElements]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['root_cause', 'method_type']

    def get_queryset(self):
        user = self.request.user
        user_project = getattr(user, 'project', None)

        queryset = EightDAnalysisMethod.objects.select_related(
            'root_cause__eight_d_process', 'created_by'
        )

        # Filter by project if user has project assignment
        if user_project:
            queryset = queryset.filter(root_cause__eight_d_process__incident__project=user_project)

        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class IncidentLearningDetailView(APIView):
    """
    Custom view to handle incident learning endpoint in the format expected by frontend
    """
    permission_classes = [IsAuthenticated, CanManageIncidents]
    
    def get(self, request, incident_id):
        """Get lessons learned for a specific incident"""
        try:
            incident = get_object_or_404(Incident, incident_id=incident_id)
            
            # Check project isolation
            user_project = getattr(request.user, 'project', None)
            if user_project and incident.project != user_project:
                return Response(
                    {'error': 'Access denied to this incident'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            try:
                learning = IncidentLearning.objects.get(incident=incident)
                serializer = IncidentLearningSerializer(learning, context={'request': request})
                return Response(serializer.data)
            except IncidentLearning.DoesNotExist:
                return Response({'detail': 'No lessons learned found'}, status=status.HTTP_404_NOT_FOUND)
                
        except Incident.DoesNotExist:
            return Response({'error': 'Incident not found'}, status=status.HTTP_404_NOT_FOUND)
    
    def post(self, request, incident_id):
        """Create or update lessons learned for a specific incident"""
        try:
            incident = get_object_or_404(Incident, incident_id=incident_id)
            
            # Check project isolation
            user_project = getattr(request.user, 'project', None)
            if user_project and incident.project != user_project:
                return Response(
                    {'error': 'Access denied to this incident'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check if learning already exists
            try:
                learning = IncidentLearning.objects.get(incident=incident)
                serializer = IncidentLearningSerializer(learning, data=request.data, context={'request': request})
            except IncidentLearning.DoesNotExist:
                serializer = IncidentLearningSerializer(data=request.data, context={'request': request})
            
            if serializer.is_valid():
                serializer.save(incident=incident, created_by=request.user)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except Incident.DoesNotExist:
            return Response({'error': 'Incident not found'}, status=status.HTTP_404_NOT_FOUND)