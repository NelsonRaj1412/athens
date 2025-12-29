from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from authentication.models import CustomUser
from .models import Message
from .serializers import MessageSerializer
from authentication.serializers import CustomUserSerializer
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db.models import Q
from rest_framework.pagination import PageNumberPagination
from .notification_utils import notify_message_sent, notify_messages_read
from django.http import HttpResponse, Http404, FileResponse
from django.utils.encoding import smart_str
import os
import mimetypes
import logging

logger = logging.getLogger(__name__)

class UserListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        current_user = request.user
        admin_type = getattr(current_user, 'admin_type', None) or getattr(current_user, 'usertype', None)
        user_project = getattr(current_user, 'project', None)

        # Ensure user has a project assigned
        if not user_project:
            return Response({
                'error': 'No project assigned',
                'message': 'User must be assigned to a project to access chat.'
            }, status=status.HTTP_403_FORBIDDEN)

        # Enhanced communication matrix based on requirements:
        # EPC can communicate within their company and with client and contractor company users
        # Client and contractor users can only communicate with their own users and EPC users
        if admin_type in ['clientuser', 'client']:
            # Client users can communicate with EPC users and other client users
            users = CustomUser.objects.filter(
                Q(admin_type__in=['epcuser', 'epc']) | Q(admin_type__in=['clientuser', 'client']),
                project=user_project,
                is_active=True
            ).exclude(id=current_user.id)
        elif admin_type in ['epcuser', 'epc']:
            # EPC users can communicate with all users (client, contractor, and other EPC)
            users = CustomUser.objects.filter(
                admin_type__in=['clientuser', 'client', 'contractoruser', 'contractor', 'epcuser', 'epc'],
                project=user_project,
                is_active=True
            ).exclude(id=current_user.id)
        elif admin_type in ['contractoruser', 'contractor']:
            # Contractor users can communicate with EPC users and other contractor users
            users = CustomUser.objects.filter(
                Q(admin_type__in=['epcuser', 'epc']) | Q(admin_type__in=['contractoruser', 'contractor']),
                project=user_project,
                is_active=True
            ).exclude(id=current_user.id)
        else:
            users = CustomUser.objects.none()

        # Ensure users have proper details for display
        users_data = []
        for user in users:
            user_data = {
                'id': user.id,
                'username': user.username,
                'name': user.get_full_name() or user.username,
                'email': user.email or '',
                'admin_type': user.admin_type,
                'company_name': getattr(user, 'company_name', ''),
                'department': getattr(user, 'department', ''),
                'designation': getattr(user, 'designation', ''),
                'is_active': user.is_active
            }
            
            # Add photo if available
            try:
                if hasattr(user, 'user_detail') and user.user_detail and user.user_detail.photo:
                    photo_url = user.user_detail.photo.url
                    if not photo_url.startswith('http'):
                        user_data['photo'] = request.build_absolute_uri(photo_url)
                    else:
                        user_data['photo'] = photo_url
                else:
                    user_data['photo'] = None
            except:
                user_data['photo'] = None
            
            users_data.append(user_data)

        return Response(users_data)

class MessagePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'limit'
    max_page_size = 100

class MessageListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = MessagePagination

    def get(self, request):
        other_user_id = request.query_params.get('userId')
        if not other_user_id:
            return Response({"error": "userId query parameter is required."}, status=status.HTTP_400_BAD_REQUEST)
        other_user = get_object_or_404(CustomUser, pk=other_user_id)
        current_user = request.user

        messages = Message.objects.filter(
            Q(sender=current_user, receiver=other_user) | Q(sender=other_user, receiver=current_user)
        ).order_by('-timestamp')  # Note: reversed order for pagination

        paginator = self.pagination_class()
        paginated_messages = paginator.paginate_queryset(messages, request)
        serializer = MessageSerializer(paginated_messages, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        current_user = request.user
        data = request.data.copy()
        # Remove sender from data as it is read-only in serializer
        if 'sender' in data:
            data.pop('sender')
        # Map 'userId' from request data to 'receiver' field expected by serializer
        if 'userId' in data:
            receiver = data.pop('userId')
            # If receiver is a list, get the first element
            if isinstance(receiver, list):
                receiver = receiver[0]
            data['receiver'] = receiver

        serializer = MessageSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            # Save the message
            message_instance = serializer.save(sender=current_user)

            # Send WebSocket notifications
            try:
                notification_result = notify_message_sent(message_instance)
                logger.info(f"Message sent notifications: {notification_result}")

                # Add notification status to response
                # Re-serialize with context to get proper file URLs
                response_serializer = MessageSerializer(message_instance, context={'request': request})
                response_data = response_serializer.data
                response_data['notification_status'] = notification_result.get('status', 'unknown')

                return Response(response_data, status=status.HTTP_201_CREATED)

            except Exception as e:
                logger.error(f"Error sending message notifications: {e}")
                # Still return success for message creation, but log the notification error
                # Re-serialize with context to get proper file URLs
                response_serializer = MessageSerializer(message_instance, context={'request': request})
                response_data = response_serializer.data
                response_data['notification_status'] = 'error'
                response_data['notification_error'] = str(e)

                return Response(response_data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ReadReceiptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        message_ids = request.data.get('message_ids', [])
        if not message_ids:
            return Response({"error": "message_ids is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Mark messages as read
        messages = Message.objects.filter(
            id__in=message_ids,
            receiver=request.user
        )

        # Update message status
        updated_count = messages.update(status='read')

        if updated_count > 0:
            # Send WebSocket notifications for read receipts
            try:
                notification_result = notify_messages_read(message_ids, request.user.id)
                logger.info(f"Read receipt notifications: {notification_result}")

                return Response({
                    "status": "success",
                    "updated_count": updated_count,
                    "notification_status": notification_result.get('status', 'unknown')
                }, status=status.HTTP_200_OK)

            except Exception as e:
                logger.error(f"Error sending read receipt notifications: {e}")
                return Response({
                    "status": "success",
                    "updated_count": updated_count,
                    "notification_status": "error",
                    "notification_error": str(e)
                }, status=status.HTTP_200_OK)
        else:
            return Response({
                "status": "success",
                "updated_count": 0,
                "message": "No messages were updated"
            }, status=status.HTTP_200_OK)

class TypingIndicatorView(APIView):
    """
    Handle typing indicators for real-time chat
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from .notification_utils import notify_typing_status

        other_user_id = request.data.get('other_user_id')
        is_typing = request.data.get('is_typing', True)

        if not other_user_id:
            return Response({"error": "other_user_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = notify_typing_status(
                user_id=request.user.id,
                other_user_id=other_user_id,
                is_typing=is_typing
            )

            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error sending typing indicator: {e}")
            return Response({
                "status": "error",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ChatNotificationSummaryView(APIView):
    """
    Get summary of unread chat notifications
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .notification_utils import get_chat_notification_summary

        try:
            summary = get_chat_notification_summary(request.user.id)
            return Response(summary, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error getting chat notification summary: {e}")
            return Response({
                "status": "error",
                "error": str(e),
                "total_unread": 0,
                "senders_summary": {}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FileDownloadView(APIView):
    """
    Secure file download endpoint for chat attachments with proper MIME types
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, message_id):
        try:
            # Get the message and verify user has access to it
            message = get_object_or_404(Message, id=message_id)

            # Check if user is sender or receiver of the message
            if request.user != message.sender and request.user != message.receiver:
                return Response(
                    {"error": "You don't have permission to access this file"},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Check if message has a file
            if not message.file:
                return Response(
                    {"error": "No file attached to this message"},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Get the file path
            file_path = message.file.path

            # Check if file exists on disk
            if not os.path.exists(file_path):
                return Response(
                    {"error": "File not found on server"},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Get file info
            file_name = os.path.basename(file_path)
            file_size = os.path.getsize(file_path)

            # Determine content type with better MIME type detection
            content_type, _ = mimetypes.guess_type(file_path)

            # Enhanced MIME type detection for common file types
            file_extension = os.path.splitext(file_name)[1].lower()
            mime_type_map = {
                '.pdf': 'application/pdf',
                '.doc': 'application/msword',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                '.xls': 'application/vnd.ms-excel',
                '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                '.ppt': 'application/vnd.ms-powerpoint',
                '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                '.txt': 'text/plain',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.zip': 'application/zip',
                '.rar': 'application/x-rar-compressed',
                '.mp4': 'video/mp4',
                '.mp3': 'audio/mpeg',
            }

            if file_extension in mime_type_map:
                content_type = mime_type_map[file_extension]
            elif content_type is None:
                content_type = 'application/octet-stream'

            # Log the download attempt
            logger.info(f"User {request.user.username} downloading file: {file_name} (type: {content_type}) from message {message_id}")

            # Return the file with proper headers
            try:
                response = FileResponse(
                    open(file_path, 'rb'),
                    content_type=content_type,
                    as_attachment=True,
                    filename=smart_str(file_name)
                )
                response['Content-Length'] = file_size
                response['Content-Disposition'] = f'attachment; filename="{smart_str(file_name)}"'
                response['Access-Control-Allow-Origin'] = '*'
                response['Access-Control-Allow-Methods'] = 'GET'
                response['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
                response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
                response['Pragma'] = 'no-cache'
                response['Expires'] = '0'
                return response

            except Exception as e:
                logger.error(f"Error serving file {file_name}: {str(e)}")
                return Response(
                    {"error": "Error serving file"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        except Message.DoesNotExist:
            return Response(
                {"error": "Message not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Unexpected error in file download: {str(e)}")
            return Response(
                {"error": "Internal server error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class FileViewView(APIView):
    """
    Simple file view endpoint that serves files inline (for viewing, not download)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, message_id):
        try:
            # Get the message and verify user has access to it
            message = get_object_or_404(Message, id=message_id)

            # Check if user is sender or receiver of the message
            if request.user != message.sender and request.user != message.receiver:
                return Response(
                    {"error": "You don't have permission to access this file"},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Check if message has a file
            if not message.file:
                return Response(
                    {"error": "No file attached to this message"},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Get the file path
            file_path = message.file.path

            # Check if file exists on disk
            if not os.path.exists(file_path):
                return Response(
                    {"error": "File not found on server"},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Determine content type
            content_type, _ = mimetypes.guess_type(file_path)
            if content_type is None:
                content_type = 'application/octet-stream'

            # Log the view attempt
            logger.info(f"User {request.user.username} viewing file from message {message_id}")

            # Return the file for inline viewing
            try:
                with open(file_path, 'rb') as f:
                    response = HttpResponse(f.read(), content_type=content_type)
                    response['Content-Disposition'] = f'inline; filename="{smart_str(os.path.basename(file_path))}"'
                    response['Access-Control-Allow-Origin'] = '*'
                    response['Cache-Control'] = 'public, max-age=3600'
                    return response

            except Exception as e:
                logger.error(f"Error serving file for viewing: {str(e)}")
                return Response(
                    {"error": "Error serving file"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        except Message.DoesNotExist:
            return Response(
                {"error": "Message not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Unexpected error in file view: {str(e)}")
            return Response(
                {"error": "Internal server error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
