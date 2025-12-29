from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging

from .models_notification import Notification, NotificationPreference
from .notification_utils import (
    send_websocket_notification,
    mark_notification_read,
    mark_all_notifications_read,
    get_user_notifications,
    get_unread_count
)

logger = logging.getLogger(__name__)

User = get_user_model()


class NotificationListView(APIView):
    """
    Get all notifications for the authenticated user
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            limit = request.query_params.get('limit')
            limit = int(limit) if limit else None
            
            notifications = get_user_notifications(request.user.id, limit=limit)
            unread_count = get_unread_count(request.user.id)
            
            notifications_data = []
            for notification in notifications:
                # Filter out chat notifications that don't belong to this user
                if self._should_include_notification(notification, request.user):
                    notifications_data.append(notification.to_dict())
            
            return Response({
                'notifications': notifications_data,
                'total': len(notifications_data),
                'unread_count': unread_count
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': f'Error fetching notifications: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _should_include_notification(self, notification, user):
        """
        Determine if a notification should be included for the user.
        Chat notifications should only be visible to sender and receiver.
        """
        # Use the model's built-in privacy validation
        if not notification.validate_chat_privacy(user):
            logger.warning(f"Filtered out chat notification {notification.id} for user {user.id} due to privacy violation")
            return False
        
        return True


class NotificationCreateView(APIView):
    """
    Create a notification for a specific user
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            
            user_id = request.data.get('user_id')
            title = request.data.get('title')
            message = request.data.get('message')
            notification_type = request.data.get('type', 'general')
            data = request.data.get('data', {})
            link = request.data.get('link')
            
            if not all([user_id, title, message]):
                return Response({
                    'error': 'user_id, title, and message are required.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                target_user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({
                    'error': f'User with id {user_id} does not exist.'
                }, status=status.HTTP_404_NOT_FOUND)
            
            notification = send_websocket_notification(
                user_id=user_id,
                title=title,
                message=message,
                notification_type=notification_type,
                data=data,
                link=link,
                sender_id=request.user.id
            )
            
            if notification:
                return Response({
                    'success': True,
                    'notification_id': notification.id
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'error': 'Failed to create notification.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            return Response({
                'error': f'Error creating notification: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class NotificationMarkReadView(APIView):
    """
    Mark a specific notification as read
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, notification_id):
        try:
            success = mark_notification_read(notification_id, request.user.id)
            
            if success:
                return Response({
                    'success': True,
                    'message': 'Notification marked as read'
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': 'Notification not found or access denied'
                }, status=status.HTTP_404_NOT_FOUND)
                
        except Exception as e:
            return Response({
                'error': f'Error marking notification as read: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class NotificationMarkAllReadView(APIView):
    """
    Mark all notifications as read for the authenticated user
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            success = mark_all_notifications_read(request.user.id)
            
            if success:
                return Response({
                    'success': True,
                    'message': 'All notifications marked as read'
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': 'Failed to mark notifications as read'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            return Response({
                'error': f'Error marking notifications as read: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class NotificationDeleteView(APIView):
    """
    Delete a specific notification
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, notification_id):
        try:
            notification = get_object_or_404(
                Notification, 
                id=notification_id, 
                user=request.user
            )
            notification.delete()
            
            return Response({
                'success': True,
                'message': 'Notification deleted successfully'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': f'Error deleting notification: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class NotificationUnreadCountView(APIView):
    """
    Get unread notification count for the authenticated user
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            unread_count = get_unread_count(request.user.id)
            
            return Response({
                'unread_count': unread_count
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': f'Error getting unread count: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class NotificationPreferenceView(APIView):
    """
    Get and update notification preferences for the authenticated user
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            preferences, created = NotificationPreference.objects.get_or_create(
                user=request.user
            )
            
            return Response({
                'email_notifications': preferences.email_notifications,
                'push_notifications': preferences.push_notifications,
                'meeting_notifications': preferences.meeting_notifications,
                'approval_notifications': preferences.approval_notifications,
                'general_notifications': preferences.general_notifications,
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': f'Error fetching preferences: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def put(self, request):
        try:
            preferences, created = NotificationPreference.objects.get_or_create(
                user=request.user
            )
            
            # Update preferences
            preferences.email_notifications = request.data.get(
                'email_notifications', preferences.email_notifications
            )
            preferences.push_notifications = request.data.get(
                'push_notifications', preferences.push_notifications
            )
            preferences.meeting_notifications = request.data.get(
                'meeting_notifications', preferences.meeting_notifications
            )
            preferences.approval_notifications = request.data.get(
                'approval_notifications', preferences.approval_notifications
            )
            preferences.general_notifications = request.data.get(
                'general_notifications', preferences.general_notifications
            )
            
            preferences.save()
            
            return Response({
                'success': True,
                'message': 'Preferences updated successfully',
                'email_notifications': preferences.email_notifications,
                'push_notifications': preferences.push_notifications,
                'meeting_notifications': preferences.meeting_notifications,
                'approval_notifications': preferences.approval_notifications,
                'general_notifications': preferences.general_notifications,
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': f'Error updating preferences: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class NotificationBroadcastView(APIView):
    """
    Send a notification to multiple users (admin only)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Check if user has permission to broadcast
            if not (request.user.is_staff or request.user.admin_type in ['master', 'client', 'epc', 'contractor']):
                return Response({
                    'error': 'Permission denied. Only admins can broadcast notifications.'
                }, status=status.HTTP_403_FORBIDDEN)

            user_ids = request.data.get('user_ids', [])
            title = request.data.get('title')
            message = request.data.get('message')
            notification_type = request.data.get('type', 'general')
            data = request.data.get('data', {})
            link = request.data.get('link')

            if not user_ids or not title or not message:
                return Response({
                    'error': 'user_ids, title, and message are required.'
                }, status=status.HTTP_400_BAD_REQUEST)

            if not isinstance(user_ids, list):
                return Response({
                    'error': 'user_ids must be a list.'
                }, status=status.HTTP_400_BAD_REQUEST)

            sent_notifications = []
            failed_notifications = []

            for user_id in user_ids:
                try:
                    notification = send_websocket_notification(
                        user_id=user_id,
                        title=title,
                        message=message,
                        notification_type=notification_type,
                        data=data,
                        link=link,
                        sender_id=request.user.id
                    )
                    
                    if notification:
                        sent_notifications.append({
                            'user_id': user_id,
                            'notification_id': notification.id
                        })
                    else:
                        failed_notifications.append({
                            'user_id': user_id,
                            'error': 'Failed to create notification'
                        })
                        
                except Exception as e:
                    failed_notifications.append({
                        'user_id': user_id,
                        'error': str(e)
                    })

            return Response({
                'success': True,
                'sent_count': len(sent_notifications),
                'failed_count': len(failed_notifications),
                'sent_notifications': sent_notifications,
                'failed_notifications': failed_notifications
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                'error': f'Error broadcasting notifications: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

