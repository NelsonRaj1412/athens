from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from .models import PermissionGrant

def check_escalation_access(user, obj, action_type):
    """
    Check if user has access based on escalation rules:
    - Creator can edit/delete until escalation
    - Project admin can always edit/delete
    - After escalation, only project admin can edit/delete
    """
    # Project admin always has access
    if user.user_type == 'projectadmin':
        return True
    
    # Check if object has escalation tracking
    escalation_level = getattr(obj, 'escalation_level', None)
    created_by = getattr(obj, 'created_by', None) or getattr(obj, 'reportedBy', None)
    
    # If no escalation tracking, use default rules
    if escalation_level is None:
        return created_by == user or user.user_type == 'projectadmin'
    
    # Creator loses access after escalation (level > 1)
    if created_by == user and escalation_level <= 1:
        return True
    
    # After escalation, only project admin has access
    return False

def restrict_creator_access_on_escalation(obj):
    """
    Restrict creator access when item is escalated
    """
    if hasattr(obj, 'escalation_level') and obj.escalation_level > 1:
        # Revoke any existing permission grants for the creator
        content_type = ContentType.objects.get_for_model(obj.__class__)
        created_by = getattr(obj, 'created_by', None) or getattr(obj, 'reportedBy', None)
        
        if created_by:
            PermissionGrant.objects.filter(
                permission_request__requester=created_by,
                permission_request__content_type=content_type,
                permission_request__object_id=obj.pk,
                used=False
            ).update(used=True, used_at=timezone.now())