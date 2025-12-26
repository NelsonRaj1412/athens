from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from .models import SafetyObservation, SafetyObservationFile
from .serializers import SafetyObservationSerializer
from .permissions import SafetyObservationPermission
from permissions.decorators import require_permission
import logging

logger = logging.getLogger(__name__)

User = get_user_model()

class SafetyObservationViewSet(viewsets.ModelViewSet):
    serializer_class = SafetyObservationSerializer
    permission_classes = [IsAuthenticated, SafetyObservationPermission]
    lookup_field = 'observationID'
    model = SafetyObservation  # Required for permission decorator

    def get_queryset(self):
        """PROJECT ISOLATION: Filter by user's project"""
        user = self.request.user
        
        # Master admin sees all data
        if user.is_superuser or (hasattr(user, 'admin_type') and user.admin_type == 'master'):
            return SafetyObservation.objects.all().order_by('-created_at')
        
        # PROJECT ISOLATION: Filter by user's project
        if not user.project:
            return SafetyObservation.objects.none()
        
        return SafetyObservation.objects.filter(project=user.project).order_by('-created_at')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        """PROJECT ISOLATION: Auto-assign project on creation"""
        # PROJECT ISOLATION: Ensure user has a project
        if not self.request.user.project:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("User must be assigned to a project to create safety observations.")
        
        observation = serializer.save(
            created_by=self.request.user,
            project=self.request.user.project
        )

        # Send assignment notification if someone is assigned
        if observation.correctiveActionAssignedTo:
            self._send_assignment_notification(observation)

    @require_permission('edit')
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)
    
    @require_permission('edit')
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            # Check if user has permission to delete
            if instance.created_by != request.user and not request.user.is_staff:
                return Response(
                    {'error': 'You do not have permission to delete this observation'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            observation_id = instance.observationID
            instance.delete()
            return Response(
                {'message': f'Safety observation {observation_id} deleted successfully'},
                status=status.HTTP_204_NO_CONTENT
            )
        except SafetyObservation.DoesNotExist:
            return Response(
                {'error': 'Safety observation not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error deleting safety observation {kwargs.get('observationID', 'unknown')}: {str(e)}")
            import traceback
            logger.error(f"Delete error traceback: {traceback.format_exc()}")
            return Response(
                {'error': f'Failed to delete safety observation: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def perform_update(self, serializer):
        old_instance = SafetyObservation.objects.get(pk=serializer.instance.pk)
        observation = serializer.save()

        # Check for status changes and send appropriate notifications
        self._handle_status_change_notifications(old_instance, observation)

    def _send_assignment_notification(self, observation):
        """Send notification when observation is assigned"""
        try:
            from authentication.notification_utils import send_safety_observation_assignment_notification

            # Find the assigned user
            assigned_user = User.objects.filter(username=observation.correctiveActionAssignedTo).first()
            if assigned_user:
                creator_name = getattr(observation.created_by, 'name', None) or observation.created_by.username

                observation_details = {
                    'typeOfObservation': observation.typeOfObservation,
                    'severity': observation.severity,
                    'workLocation': observation.workLocation,
                }

                send_safety_observation_assignment_notification(
                    assigned_user_id=assigned_user.id,
                    observation_id=observation.observationID,
                    observation_details=observation_details,
                    creator_name=creator_name,
                    sender_id=observation.created_by.id
                )
        except Exception as e:
            pass

    def _handle_status_change_notifications(self, old_instance, new_instance):
        """Handle notifications based on status changes"""
        try:
            from authentication.notification_utils import (
                send_safety_observation_commitment_notification,
                send_safety_observation_completion_notification,
                send_safety_observation_approval_notification
            )

            # Check if commitment date was added (assigned person committed)
            logger.info(f"Checking commitment date change for {new_instance.observationID}")
            logger.info(f"Old commitment date: {old_instance.commitmentDate}")
            logger.info(f"New commitment date: {new_instance.commitmentDate}")

            if not old_instance.commitmentDate and new_instance.commitmentDate:
                logger.info(f"Commitment date was added - sending notification")
                if new_instance.created_by:
                    assigned_user = User.objects.filter(username=new_instance.correctiveActionAssignedTo).first()
                    assigned_name = getattr(assigned_user, 'name', None) or assigned_user.username if assigned_user else new_instance.correctiveActionAssignedTo

                    logger.info(f"Sending commitment notification to creator: {new_instance.created_by.username}")
                    send_safety_observation_commitment_notification(
                        creator_user_id=new_instance.created_by.id,
                        observation_id=new_instance.observationID,
                        commitment_date=new_instance.commitmentDate.strftime('%Y-%m-%d'),
                        assigned_person_name=assigned_name,
                        sender_id=assigned_user.id if assigned_user else None
                    )
                    logger.info(f"Commitment notification sent successfully")
                else:
                    logger.warning(f"No creator found for observation {new_instance.observationID}")
            else:
                logger.info(f"Commitment date condition not met - no notification sent")

            # Check if status changed to pending_verification (completion request)
            if (old_instance.observationStatus != 'pending_verification' and
                new_instance.observationStatus == 'pending_verification'):
                if new_instance.created_by:
                    assigned_user = User.objects.filter(username=new_instance.correctiveActionAssignedTo).first()
                    assigned_name = getattr(assigned_user, 'name', None) or assigned_user.username if assigned_user else new_instance.correctiveActionAssignedTo

                    send_safety_observation_completion_notification(
                        creator_user_id=new_instance.created_by.id,
                        observation_id=new_instance.observationID,
                        assigned_person_name=assigned_name,
                        sender_id=assigned_user.id if assigned_user else None
                    )

            # Check if status changed to closed (approved)
            if (old_instance.observationStatus != 'closed' and
                new_instance.observationStatus == 'closed'):
                assigned_user = User.objects.filter(username=new_instance.correctiveActionAssignedTo).first()
                if assigned_user and new_instance.created_by:
                    creator_name = getattr(new_instance.created_by, 'name', None) or new_instance.created_by.username

                    send_safety_observation_approval_notification(
                        assigned_user_id=assigned_user.id,
                        observation_id=new_instance.observationID,
                        creator_name=creator_name,
                        approved=True,
                        sender_id=new_instance.created_by.id
                    )

        except Exception as e:
            pass

    def _send_completion_notification(self, observation):
        """Send notification when fixed photos are uploaded and approval is requested"""
        try:
            logger.info(f"Starting completion notification process for {observation.observationID}")
            from authentication.notification_utils import send_safety_observation_completion_notification

            if observation.created_by:
                logger.info(f"Creator found: {observation.created_by.username} (ID: {observation.created_by.id})")
                assigned_user = User.objects.filter(username=observation.correctiveActionAssignedTo).first()
                assigned_name = getattr(assigned_user, 'name', None) or assigned_user.username if assigned_user else observation.correctiveActionAssignedTo
                logger.info(f"Assigned user: {assigned_name}")

                logger.info(f"Calling notification function with creator_user_id={observation.created_by.id}, observation_id={observation.observationID}")

                result = send_safety_observation_completion_notification(
                    creator_user_id=observation.created_by.id,
                    observation_id=observation.observationID,
                    assigned_person_name=assigned_name,
                    sender_id=assigned_user.id if assigned_user else None
                )
                logger.info(f"Notification function returned: {result}")
                logger.info(f"Completion notification sent to creator {observation.created_by.username}")
            else:
                logger.warning(f"No creator found for observation {observation.observationID}")
        except Exception as e:
            logger.error(f"Error sending completion notification: {e}")
            import traceback
            logger.error(f"Notification error traceback: {traceback.format_exc()}")

    def _send_approval_notification(self, observation, approved=True, feedback=''):
        """Send notification when observation is approved or rejected"""
        try:
            logger.info(f"Starting approval notification process for {observation.observationID}")
            from authentication.notification_utils import send_safety_observation_approval_notification

            # Send notification to assigned person
            assigned_user = User.objects.filter(username=observation.correctiveActionAssignedTo).first()
            if assigned_user:
                logger.info(f"Sending approval notification to assigned user: {assigned_user.username}")

                # Get creator name for notification
                creator_name = getattr(observation.created_by, 'name', None) or observation.created_by.username if observation.created_by else 'Creator'

                result = send_safety_observation_approval_notification(
                    assigned_user_id=assigned_user.id,
                    observation_id=observation.observationID,
                    creator_name=creator_name,
                    approved=approved,
                    sender_id=observation.created_by.id if observation.created_by else None
                )
                logger.info(f"Approval notification function returned: {result}")
            else:
                logger.warning(f"No assigned user found for observation {observation.observationID}")

        except Exception as e:
            logger.error(f"Error sending approval notification: {e}")
            import traceback
            logger.error(f"Approval notification error traceback: {traceback.format_exc()}")

    def _send_commitment_notification(self, observation):
        """Send notification when assigned person provides commitment date"""
        try:
            logger.info(f"Starting commitment notification process for {observation.observationID}")
            logger.info(f"Observation creator: {observation.created_by}")
            logger.info(f"Assigned to: {observation.correctiveActionAssignedTo}")
            logger.info(f"Commitment date: {observation.commitmentDate}")

            from authentication.notification_utils import send_safety_observation_commitment_notification

            if observation.created_by:
                assigned_user = User.objects.filter(username=observation.correctiveActionAssignedTo).first()
                assigned_name = getattr(assigned_user, 'name', None) or assigned_user.username if assigned_user else observation.correctiveActionAssignedTo

                logger.info(f"Sending commitment notification to creator: {observation.created_by.username} (ID: {observation.created_by.id})")
                logger.info(f"Assigned user: {assigned_user} (Name: {assigned_name})")

                result = send_safety_observation_commitment_notification(
                    creator_user_id=observation.created_by.id,
                    observation_id=observation.observationID,
                    commitment_date=observation.commitmentDate.strftime('%Y-%m-%d') if observation.commitmentDate else '',
                    assigned_person_name=assigned_name,
                    sender_id=assigned_user.id if assigned_user else None
                )
                logger.info(f"Commitment notification function returned: {result}")
            else:
                logger.warning(f"No creator found for observation {observation.observationID}")

        except Exception as e:
            logger.error(f"Error sending commitment notification: {e}")
            import traceback
            logger.error(f"Commitment notification error traceback: {traceback.format_exc()}")

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def update_commitment(self, request, observationID=None):
        """Update commitment date and status"""
        try:
            observation = self.get_object()
            commitment_date = request.data.get('commitmentDate')

            if not commitment_date:
                return Response(
                    {'error': 'Commitment date is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            observation.commitmentDate = commitment_date
            observation.observationStatus = 'in_progress'
            observation.save()

            # Send commitment notification to creator
            logger.info(f"Sending commitment notification for {observation.observationID}")
            try:
                self._send_commitment_notification(observation)
                logger.info(f"Commitment notification sent successfully for {observation.observationID}")
            except Exception as e:
                logger.error(f"Failed to send commitment notification: {e}")
                import traceback
                logger.error(f"Commitment notification error traceback: {traceback.format_exc()}")

            serializer = self.get_serializer(observation)
            return Response(serializer.data)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def request_approval(self, request, observationID=None):
        """Request approval after completion"""
        try:
            observation = self.get_object()

            observation.observationStatus = 'pending_verification'
            observation.save()

            serializer = self.get_serializer(observation)
            return Response(serializer.data)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def upload_fixed_photos(self, request, observationID=None):
        """Upload fixed photos for completed work"""
        try:

            observation = self.get_object()

            user = request.user

            # Debug information

            # Check if user has permission to upload fixed photos
            # ONLY the assigned person can upload fixed photos
            if observation.correctiveActionAssignedTo != user.username:
                return Response(
                    {'error': f'Only the assigned person can upload fixed photos. You are: {user.username}, but assigned to: {observation.correctiveActionAssignedTo}'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Handle file uploads
            files = request.FILES.getlist('beforePictures')

            if not files:
                return Response(
                    {'error': 'No files provided'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Upload fixed photos
            for i, file in enumerate(files):
                SafetyObservationFile.objects.create(
                    safety_observation=observation,
                    file=file,
                    file_name=file.name,
                    file_type='fixed',
                    uploaded_by=request.user
                )

            # Update remarks if provided
            remarks = request.data.get('remarks')
            if remarks:
                observation.remarks = remarks

            # Change status to pending_verification and save
            observation.observationStatus = 'pending_verification'
            observation.save()

            # Send completion notification to creator
            self._send_completion_notification(observation)

            return Response({
                'message': f'Successfully uploaded {len(files)} fixed photos and requested approval',
                'files_uploaded': len(files),
                'status': observation.observationStatus
            })

        except Exception as e:
            import traceback
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def approve_observation(self, request, observationID=None):
        """Approve and close observation or reject with feedback"""
        try:
            observation = self.get_object()
            approved = request.data.get('approved', True)
            feedback = request.data.get('feedback', '')

            if approved:
                # Approved - change status to closed (final completion)
                observation.observationStatus = 'closed'
                observation.save()

                # Send approval notification to assigned person
                self._send_approval_notification(observation, approved=True)

                logger.info(f"Observation {observation.observationID} approved and closed")
                message_text = 'Observation approved and closed successfully!'

            else:
                # Rejected - change status back to in_progress and save feedback
                observation.observationStatus = 'in_progress'
                if feedback:
                    observation.remarks = f"{observation.remarks}\n\nRejection Feedback: {feedback}" if observation.remarks else f"Rejection Feedback: {feedback}"
                observation.save()

                # Send rejection notification to assigned person
                self._send_approval_notification(observation, approved=False, feedback=feedback)

                logger.info(f"Observation {observation.observationID} rejected with feedback")
                message_text = 'Observation rejected and sent back for revision'

            serializer = self.get_serializer(observation)
            return Response({
                'message': message_text,
                'status': observation.observationStatus,
                'data': serializer.data
            })

        except Exception as e:
            logger.error(f"Error in approve_observation: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='project-users')
    def project_users(self, request):
        """Get users from the same project for assignment dropdown"""
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
        ).exclude(admin_type='master').values('id', 'username', 'name', 'surname')
        
        # Format for dropdown
        users_list = []
        for user_data in project_users:
            display_name = f"{user_data['name']} {user_data['surname']}".strip() if user_data['name'] else user_data['username']
            users_list.append({
                'username': user_data['username'],
                'display_name': display_name
            })
        
        return Response({
            'users': users_list,
            'count': len(users_list)
        })
