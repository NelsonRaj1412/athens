from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.contrib.auth import get_user_model
from django.utils import timezone
import json
import logging

logger = logging.getLogger(__name__)

User = get_user_model()

def send_websocket_notification(user_id, title, message, notification_type='general', data=None, link=None, sender_id=None):
    """
    Send a notification via WebSocket to a specific user
    This function can be called from Django views or other synchronous code
    """
    try:
        from authentication.models_notification import Notification
        
        # Create notification in database
        target_user = User.objects.get(id=user_id)
        sender = User.objects.get(id=sender_id) if sender_id else None
        
        notification = Notification.objects.create(
            user=target_user,
            title=title,
            message=message,
            notification_type=notification_type,
            data=data or {},
            link=link,
            sender=sender,
            read=False,
            created_at=timezone.now()
        )
        
        # Send via WebSocket
        channel_layer = get_channel_layer()
        group_name = f'notifications_{user_id}'
        
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'send_notification_to_user',
                'notification': notification.to_dict()
            }
        )
        
        return notification
        
    except User.DoesNotExist:
        return None
    except Exception as e:
        return None

def send_approval_notification(user_id, title, message, form_type, item_id, approved=True, sender_id=None):
    """
    Send an approval notification
    """
    data = {
        'formType': form_type,
        'itemId': item_id,
        'approved': approved
    }
    
    return send_websocket_notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type='approval',
        data=data,
        sender_id=sender_id
    )

def send_user_detail_approval_notification(user_id, user_name, user_email, approved=True, sender_id=None):
    """
    Send notification when user details are approved/rejected
    """
    if approved:
        title = "Your Details Approved"
        message = "Your user details have been approved by the administrator."
    else:
        title = "Your Details Rejected"
        message = "Your user details have been rejected. Please review and resubmit."
    
    return send_approval_notification(
        user_id=user_id,
        title=title,
        message=message,
        form_type='userdetail',
        item_id=user_id,
        approved=approved,
        sender_id=sender_id
    )

def send_user_detail_submission_notification(admin_user_id, user_name, user_email, user_id, sender_id=None):
    """
    Send notification to admin when user submits details for approval
    """
    title = "New User Details Submitted"
    message = f"{user_name} ({user_email}) has submitted their details for approval."
    
    data = {
        'formType': 'userdetail',
        'userId': user_id,
        'name': user_name,
        'email': user_email
    }
    
    link = f"/dashboard/user-approval/{user_id}"
    
    return send_websocket_notification(
        user_id=admin_user_id,
        title=title,
        message=message,
        notification_type='approval',
        data=data,
        link=link,
        sender_id=sender_id
    )

def mark_notification_read(notification_id, user_id):
    """
    Mark a notification as read
    """
    try:
        from authentication.models_notification import Notification
        notification = Notification.objects.get(id=notification_id, user_id=user_id)
        notification.mark_as_read()
        return True
    except Notification.DoesNotExist:
        return False

def mark_all_notifications_read(user_id):
    """
    Mark all notifications as read for a user
    """
    try:
        from authentication.models_notification import Notification
        Notification.objects.filter(user_id=user_id, read=False).update(
            read=True,
            read_at=timezone.now()
        )
        return True
    except Exception as e:
        return False

def get_user_notifications(user_id, limit=None):
    """
    Get notifications for a user
    """
    try:
        from authentication.models_notification import Notification
        queryset = Notification.objects.filter(user_id=user_id).order_by('-created_at')
        if limit:
            queryset = queryset[:limit]
        return list(queryset)
    except Exception as e:
        return []

def get_unread_count(user_id):
    """
    Get count of unread notifications for a user
    """
    try:
        from authentication.models_notification import Notification
        return Notification.objects.filter(user_id=user_id, read=False).count()
    except Exception as e:
        return 0

# ==================== CHAT NOTIFICATION FUNCTIONS ====================

def send_chat_message_notification(receiver_id, sender_id, message_content, message_id, has_file=False):
    """
    Send notification when a new chat message is received
    CRITICAL: Only sends to the specific receiver - no admin users should receive this
    """
    try:
        # Validate that receiver_id and sender_id are different
        if receiver_id == sender_id:
            logger.warning(f"Attempted to send chat notification to self: user_id={sender_id}")
            return None
        
        sender = User.objects.get(id=sender_id)
        receiver = User.objects.get(id=receiver_id)
        sender_name = getattr(sender, 'name', None) or sender.username

        # Log the notification creation for debugging
        logger.info(f"Creating chat notification: sender={sender_name}(ID:{sender_id}) -> receiver={receiver.username}(ID:{receiver_id})")

        if has_file:
            title = f"📎 File from {sender_name}"
            message = f"{sender_name} sent you a file"
            notification_type = 'chat_file_shared'
        else:
            title = f"💬 Message from {sender_name}"
            # Truncate long messages for notification
            display_content = message_content[:50] + "..." if len(message_content) > 50 else message_content
            message = f"{sender_name}: {display_content}"
            notification_type = 'chat_message'

        data = {
            'message_id': message_id,
            'sender_id': sender_id,
            'sender_name': sender_name,
            'message_content': message_content,
            'has_file': has_file,
            'chat_type': 'direct_message'
        }

        link = f"/dashboard/chatbox?userId={sender_id}"

        # CRITICAL: Only send to the specific receiver_id - no broadcasting to admins
        notification = send_websocket_notification(
            user_id=receiver_id,  # Only the intended receiver
            title=title,
            message=message,
            notification_type=notification_type,
            data=data,
            link=link,
            sender_id=sender_id
        )
        
        if notification:
            logger.info(f"Chat notification created successfully: ID={notification.id} for user={receiver_id}")
        else:
            logger.error(f"Failed to create chat notification for user={receiver_id}")
        
        return notification

    except User.DoesNotExist as e:
        logger.error(f"User not found in chat notification: sender_id={sender_id}, receiver_id={receiver_id}, error={e}")
        return None
    except Exception as e:
        logger.error(f"Error creating chat notification: sender_id={sender_id}, receiver_id={receiver_id}, error={e}")
        return None

def send_chat_message_delivered_notification(sender_id, receiver_id, message_id):
    """
    Send notification to sender when message is delivered
    """
    try:
        receiver = User.objects.get(id=receiver_id)
        receiver_name = getattr(receiver, 'name', None) or receiver.username

        title = "✅ Message Delivered"
        message = f"Your message to {receiver_name} has been delivered"

        data = {
            'message_id': message_id,
            'receiver_id': receiver_id,
            'receiver_name': receiver_name,
            'status': 'delivered'
        }

        return send_websocket_notification(
            user_id=sender_id,
            title=title,
            message=message,
            notification_type='chat_message_delivered',
            data=data,
            sender_id=None  # System notification
        )

    except User.DoesNotExist:
        return None
    except Exception as e:
        return None

def send_chat_message_read_notification(sender_id, receiver_id, message_ids):
    """
    Send notification to sender when messages are read
    """
    try:
        receiver = User.objects.get(id=receiver_id)
        receiver_name = getattr(receiver, 'name', None) or receiver.username

        message_count = len(message_ids) if isinstance(message_ids, list) else 1

        if message_count == 1:
            title = "👁️ Message Read"
            message = f"{receiver_name} read your message"
        else:
            title = "👁️ Messages Read"
            message = f"{receiver_name} read {message_count} messages"

        data = {
            'message_ids': message_ids,
            'receiver_id': receiver_id,
            'receiver_name': receiver_name,
            'status': 'read',
            'message_count': message_count
        }

        return send_websocket_notification(
            user_id=sender_id,
            title=title,
            message=message,
            notification_type='chat_message_read',
            data=data,
            sender_id=None  # System notification
        )

    except User.DoesNotExist:
        return None
    except Exception as e:
        return None

def send_chat_status_update_websocket(user_id, message_id, status, other_user_id=None):
    """
    Send real-time status update via WebSocket without creating a notification
    Used for immediate UI updates (typing indicators, message status, etc.)
    """
    try:
        channel_layer = get_channel_layer()
        group_name = f'notifications_{user_id}'

        data = {
            'message_id': message_id,
            'status': status,
            'timestamp': timezone.now().isoformat(),
            'other_user_id': other_user_id
        }

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'send_chat_status_update',
                'data': data
            }
        )

        return True

    except Exception as e:
        return False

# ==================== SAFETY OBSERVATION NOTIFICATION FUNCTIONS ====================

def send_safety_observation_assignment_notification(assigned_user_id, observation_id, observation_details, creator_name, sender_id=None):
    """
    Send notification when a safety observation is assigned to someone
    """
    try:
        title = "🔧 New Safety Observation Assigned"
        message = f"You have been assigned a safety observation ({observation_id}) by {creator_name}. Please review and provide commitment date."

        data = {
            'observation_id': observation_id,
            'observation_type': observation_details.get('typeOfObservation', ''),
            'severity': observation_details.get('severity', 1),
            'location': observation_details.get('workLocation', ''),
            'creator_name': creator_name,
            'action_required': 'commitment'
        }

        link = f"/dashboard/safetyobservation/edit/{observation_id}"

        return send_websocket_notification(
            user_id=assigned_user_id,
            title=title,
            message=message,
            notification_type='safety_observation_assigned',
            data=data,
            link=link,
            sender_id=sender_id
        )

    except Exception as e:
        return None

def send_safety_observation_commitment_notification(creator_user_id, observation_id, commitment_date, assigned_person_name, sender_id=None):
    """
    Send notification when assigned person provides commitment date
    """
    try:
        title = "📅 Safety Observation Commitment Received"
        message = f"{assigned_person_name} has committed to complete observation {observation_id} by {commitment_date}."

        data = {
            'observation_id': observation_id,
            'commitment_date': commitment_date,
            'assigned_person': assigned_person_name,
            'action_required': 'track_progress'
        }

        link = f"/dashboard/safetyobservation/list"

        return send_websocket_notification(
            user_id=creator_user_id,
            title=title,
            message=message,
            notification_type='safety_observation_commitment',
            data=data,
            link=link,
            sender_id=sender_id
        )

    except Exception as e:
        return None

def send_safety_observation_completion_notification(creator_user_id, observation_id, assigned_person_name, sender_id=None):
    """
    Send notification when assigned person completes the observation and requests approval
    """
    try:
        title = "✅ Safety Observation Completed - Approval Required"
        message = f"{assigned_person_name} has completed observation {observation_id} and uploaded fixed photos. Please review and approve."

        data = {
            'observation_id': observation_id,
            'assigned_person': assigned_person_name,
            'action_required': 'approval',
            'has_photos': True
        }

        link = f"/dashboard/safetyobservation/review/{observation_id}"

        return send_websocket_notification(
            user_id=creator_user_id,
            title=title,
            message=message,
            notification_type='safety_observation_completed',
            data=data,
            link=link,
            sender_id=sender_id
        )

    except Exception as e:
        return None

def send_safety_observation_approval_notification(assigned_user_id, observation_id, creator_name, approved=True, feedback='', sender_id=None):
    """
    Send notification when creator approves/rejects the completed observation
    """
    try:
        if approved:
            title = "🎉 Safety Observation Approved"
            message = f"Your completed observation {observation_id} has been approved by {creator_name}. The observation is now closed."
        else:
            title = "🔄 Safety Observation Needs Revision"
            message = f"Your observation {observation_id} needs revision. Please check the feedback from {creator_name}."
            if feedback:
                message += f"\n\nFeedback: {feedback}"

        data = {
            'observation_id': observation_id,
            'creator_name': creator_name,
            'approved': approved,
            'feedback': feedback,
            'action_required': 'none' if approved else 'revision'
        }

        link = f"/dashboard/safetyobservation/edit/{observation_id}"

        return send_websocket_notification(
            user_id=assigned_user_id,
            title=title,
            message=message,
            notification_type='safety_observation_approved',
            data=data,
            link=link,
            sender_id=sender_id
        )

    except Exception as e:
        return None