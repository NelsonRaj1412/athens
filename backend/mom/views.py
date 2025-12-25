from rest_framework import generics, permissions, status
from .models import Mom, ParticipantResponse, ParticipantAttendance
from .serializers import MomSerializer, ParticipantResponseSerializer, ParticipantResponseCreateSerializer, ParticipantListSerializer, MomLiveSerializer
from authentication.models import CustomUser
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils.timezone import now
from permissions.decorators import require_permission
from django.utils._os import safe_join
from django.conf import settings
from .notification_utils import (
    send_meeting_invitation_notification,
    send_meeting_response_notification,
    send_meeting_completion_notification,
    send_task_assignment_notification
)
import os

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == 'adminuser'

class CanScheduleMom(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return (
            user.is_authenticated and
            user.user_type == 'adminuser' and
            user.admin_type in ['clientuser', 'epcuser']
        )

class MomCreateView(generics.CreateAPIView):
    queryset = Mom.objects.all()
    serializer_class = MomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        mom = serializer.save(scheduled_by=self.request.user)
        
        # Send notifications to participants via backend
        for participant in mom.participants.all():
            try:
                meeting_data = {
                    'id': mom.id,
                    'title': mom.title,
                    'meeting_datetime': mom.meeting_datetime.isoformat() if mom.meeting_datetime else None,
                    'location': mom.location,
                    'agenda': mom.agenda
                }
                
                send_meeting_invitation_notification(
                    participant_user_id=participant.id,
                    meeting_data=meeting_data,
                    scheduler_user_id=self.request.user.id
                )
            except Exception as e:
                pass

class MomUpdateView(generics.RetrieveUpdateAPIView):
    queryset = Mom.objects.all()
    serializer_class = MomSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

class MomListView(generics.ListAPIView):
    serializer_class = MomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Mom.objects.filter(scheduled_by=user)
        department = self.request.query_params.get('department')
        if department:
            queryset = queryset.filter(department=department)
        return queryset

class MomDeleteView(generics.DestroyAPIView):
    queryset = Mom.objects.all()
    serializer_class = MomSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

class ParticipantResponseView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, mom_id, user_id):
        # Check if the requesting user is the same as the user_id in the URL
        if request.user.id != user_id:
            return Response({
                'error': 'You can only view your own response status',
                'code': 'UNAUTHORIZED_USER'
            }, status=status.HTTP_403_FORBIDDEN)

        # Check if the meeting exists
        try:
            mom = Mom.objects.get(id=mom_id)
        except Mom.DoesNotExist:
            return Response({
                'error': 'Meeting not found',
                'code': 'MEETING_NOT_FOUND'
            }, status=status.HTTP_404_NOT_FOUND)

        # Check if the user is actually a participant in this meeting
        if not mom.participants.filter(id=user_id).exists():
            return Response({
                'error': 'You are not a participant in this meeting',
                'code': 'NOT_A_PARTICIPANT',
                'meeting_title': mom.title,
                'meeting_datetime': mom.meeting_datetime.isoformat(),
                'message': f'You are not invited to the meeting "{mom.title}". Please contact the meeting organizer if you believe this is an error.'
            }, status=status.HTTP_403_FORBIDDEN)

        participant_response = ParticipantResponse.objects.filter(mom_id=mom_id, user_id=user_id).first()
        if participant_response:
            serializer = ParticipantResponseSerializer(participant_response)
            return Response(serializer.data)
        else:
            # If no response exists, return pending status with user info
            user = request.user
            return Response({
                'status': 'pending',
                'name': user.name or user.username,
                'email': user.email,
                'company_name': getattr(user, 'company_name', ''),
                'designation': getattr(user, 'designation', '')
            })

    def post(self, request, mom_id, user_id):
        # Get the meeting to check its status
        mom = get_object_or_404(Mom, id=mom_id)

        # Check if meeting is already live or completed
        if mom.status == Mom.MeetingStatus.LIVE:
            return Response({
                'error': 'Meeting is already live',
                'message': 'This meeting is currently in progress. You cannot respond to the invitation at this time.',
                'meeting_status': 'live'
            }, status=status.HTTP_400_BAD_REQUEST)

        if mom.status == Mom.MeetingStatus.COMPLETED:
            return Response({
                'error': 'Meeting has ended',
                'message': 'This meeting has already been completed. You cannot respond to the invitation.',
                'meeting_status': 'completed'
            }, status=status.HTTP_400_BAD_REQUEST)

        if mom.status == Mom.MeetingStatus.CANCELLED:
            return Response({
                'error': 'Meeting was cancelled',
                'message': 'This meeting has been cancelled.',
                'meeting_status': 'cancelled'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check if user is actually a participant
        if not mom.participants.filter(id=user_id).exists():
            return Response({
                'error': 'Not a participant',
                'message': 'You are not invited to this meeting.'
            }, status=status.HTTP_403_FORBIDDEN)

        participant_response, created = ParticipantResponse.objects.get_or_create(mom_id=mom_id, user_id=user_id)
        old_status = participant_response.status if not created else None

        serializer = ParticipantResponseCreateSerializer(participant_response, data=request.data)
        if serializer.is_valid():
            # Store original status for signal detection
            if not created:
                participant_response._original_status = old_status
            serializer.save()
            
            # Send response notification to scheduler
            try:
                participant_data = {
                    'name': request.user.name or request.user.username,
                    'email': request.user.email
                }
                meeting_data = {
                    'id': mom.id,
                    'title': mom.title
                }
                
                send_meeting_response_notification(
                    scheduler_user_id=mom.scheduled_by.id,
                    participant_data=participant_data,
                    meeting_data=meeting_data,
                    response_status=serializer.data['status'],
                    sender_id=request.user.id
                )
            except Exception as e:
                pass

            return Response({
                'status': serializer.data['status'],
                'message': f'You have {serializer.data["status"]} the meeting invitation.',
                'meeting_status': mom.status,
                'scheduled_by': mom.scheduled_by.id,
                'meeting_title': mom.title
            })
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ParticipantAcceptView(APIView):
    """Direct accept endpoint for notification links"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, mom_id, user_id):
        # Reuse the logic from ParticipantResponseView
        view = ParticipantResponseView()
        view.request = request
        view.format_kwarg = None

        # Create a new request with 'accepted' status
        request.data = {'status': 'accepted'}
        return view.post(request, mom_id, user_id)

    def get(self, request, mom_id, user_id):
        """Handle GET requests from notification links"""
        return self.post(request, mom_id, user_id)


class ParticipantRejectView(APIView):
    """Direct reject endpoint for notification links"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, mom_id, user_id):
        # Reuse the logic from ParticipantResponseView
        view = ParticipantResponseView()
        view.request = request
        view.format_kwarg = None

        # Create a new request with 'rejected' status
        request.data = {'status': 'rejected'}
        return view.post(request, mom_id, user_id)

    def get(self, request, mom_id, user_id):
        """Handle GET requests from notification links"""
        return self.post(request, mom_id, user_id)


class ParticipantListView(generics.ListAPIView):
    serializer_class = ParticipantListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        mom_id = self.kwargs['mom_id']
        return ParticipantResponse.objects.filter(mom_id=mom_id).select_related('user')


class MeetingInfoView(APIView):
    """
    Get basic meeting info without requiring participant status
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, mom_id):
        try:
            mom = Mom.objects.get(id=mom_id)
            is_participant = mom.participants.filter(id=request.user.id).exists()

            return Response({
                'id': mom.id,
                'title': mom.title,
                'meeting_datetime': mom.meeting_datetime.isoformat(),
                'location': mom.location,
                'department': mom.department,
                'status': mom.status,
                'is_participant': is_participant,
                'scheduled_by': {
                    'id': mom.scheduled_by.id,
                    'name': mom.scheduled_by.name or mom.scheduled_by.username,
                    'email': mom.scheduled_by.email
                }
            })
        except Mom.DoesNotExist:
            return Response({
                'error': 'Meeting not found'
            }, status=status.HTTP_404_NOT_FOUND)

# Existing Notification and Mom views omitted for brevity, keep them unchanged

class MomLiveView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        mom = get_object_or_404(Mom, pk=pk)

        # Auto-update no response status when meeting is accessed in live mode
        if mom.status == Mom.MeetingStatus.LIVE:
            self.update_no_response_status(mom)

        serializer = MomLiveSerializer(mom, context={'request': request})
        return Response(serializer.data)

    def update_no_response_status(self, mom):
        """Update pending responses to noresponse for live meetings"""
        # Get all participants who haven't responded
        pending_responses = ParticipantResponse.objects.filter(
            mom=mom,
            status='pending'
        )

        # Also create responses for participants who don't have any response record
        participants_with_responses = set(
            ParticipantResponse.objects.filter(mom=mom).values_list('user_id', flat=True)
        )
        all_participants = set(mom.participants.values_list('id', flat=True))
        participants_without_responses = all_participants - participants_with_responses

        # Create noresponse records for participants without any response
        for user_id in participants_without_responses:
            ParticipantResponse.objects.create(
                mom=mom,
                user_id=user_id,
                status='noresponse'
            )

        # Update pending responses to noresponse
        pending_responses.update(status='noresponse')

class MomLiveAttendanceUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, pk):
        mom = get_object_or_404(Mom, pk=pk)
        points_to_discuss = request.data.get('points_to_discuss', '')
        attendance_data = request.data.get('attendance', [])

        mom.points_to_discuss = points_to_discuss
        mom.save()

        for att in attendance_data:
            user_id = att.get('id')
            attended = att.get('attended', False)
            if user_id is not None:
                pa, created = ParticipantAttendance.objects.get_or_create(mom=mom, user_id=user_id)
                pa.attended = attended
                pa.save()

        return Response({'status': 'Attendance and points updated successfully'})

class MomCompleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, pk):
        mom = get_object_or_404(Mom, pk=pk)
        # Data from MomLive.tsx
        mom.completed_at = request.data.get('completed_at')
        mom.duration_minutes = request.data.get('duration_minutes')
        mom.status = Mom.MeetingStatus.COMPLETED
        mom.save()
        
        # Send completion notifications to all participants
        for participant in mom.participants.all():
            try:
                meeting_data = {
                    'id': mom.id,
                    'title': mom.title,
                    'completed_at': mom.completed_at,
                    'duration_minutes': mom.duration_minutes
                }
                
                send_meeting_completion_notification(
                    participant_user_id=participant.id,
                    meeting_data=meeting_data,
                    scheduler_user_id=mom.scheduled_by.id
                )
            except Exception as e:
                pass

        return Response({'status': 'Meeting marked as completed'})

class MomAddParticipantsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        mom = get_object_or_404(Mom, pk=pk)
        participant_ids = request.data.get('participant_ids', [])
        if not isinstance(participant_ids, list):
            return Response({'error': 'participant_ids must be a list'}, status=400)

        # Get existing participants to identify new ones
        existing_participant_ids = set(mom.participants.values_list('id', flat=True))
        new_participant_ids = []

        for user_id in participant_ids:
            try:
                user = CustomUser.objects.get(pk=user_id)
                if user_id not in existing_participant_ids:
                    new_participant_ids.append(user_id)
                    # Notification will be sent via WebSocket from frontend
                
                mom.participants.add(user)
                # Create or update ParticipantResponse with status 'accepted'
                participant_response, created = ParticipantResponse.objects.get_or_create(mom=mom, user=user)
                participant_response.status = 'accepted'
                participant_response.save()
            except CustomUser.DoesNotExist:
                continue

        mom.save()
        serializer = MomLiveSerializer(mom)
        return Response(serializer.data)

from rest_framework.generics import GenericAPIView, ListAPIView
from rest_framework.response import Response
from authentication.models import CustomUser
from .serializers import UserSerializer
from rest_framework.views import APIView
from rest_framework import status

class DepartmentsListView(GenericAPIView):
    permission_classes = [IsAdminUser]

    def get(self, request, *args, **kwargs):
        departments = CustomUser.objects.values_list('department', flat=True).distinct()
        departments = [dept for dept in departments if dept]  # filter out empty/null
        return Response(departments)

class UsersByDepartmentListView(ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        department_name = self.request.query_params.get('department_name')
        queryset = CustomUser.objects.filter(admin_type__in=['clientuser', 'contractoruser', 'epcuser'])
        if department_name:
            queryset = queryset.filter(department=department_name)
        # Exclude the logged-in user from the participant list
        user = self.request.user
        if user.is_authenticated:
            queryset = queryset.exclude(id=user.id)
        return queryset

# Removed NotificationSendView - now using WebSocket notifications via signals

# Removed old notification views - now using authentication app notification system
# All notification management is handled through /auth/notifications/ endpoints

from rest_framework.permissions import AllowAny
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from django.http import JsonResponse

@method_decorator(ensure_csrf_cookie, name='dispatch')
class CsrfTokenView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        return JsonResponse({'detail': 'CSRF cookie set'})
