"""
Induction Training Status Utilities
Provides functions to check if users have completed induction training
"""
from django.db.models import Q, Exists, OuterRef
from django.contrib.auth import get_user_model

User = get_user_model()

def is_user_induction_trained(user):
    """
    Check if a user has completed induction training
    
    Args:
        user: User object to check
        
    Returns:
        bool: True if user has completed induction training, False otherwise
    """
    if not user or not user.project:
        return False
    
    from inductiontraining.models import InductionAttendance, InductionTraining
    
    # Check if user has attended any completed induction training in their project
    return InductionAttendance.objects.filter(
        worker_id=-user.id,  # Negative ID for users
        participant_type='user',
        status='present',
        induction__project_id=user.project.id,
        induction__status='completed'
    ).exists()

def get_induction_trained_users_filter(project_id):
    """
    Returns a Q filter for users who have completed induction training
    
    Args:
        project_id: Project ID to filter by
        
    Returns:
        Q: Django Q filter object
    """
    from inductiontraining.models import InductionAttendance, InductionTraining
    
    return Q(
        id__in=InductionAttendance.objects.filter(
            participant_type='user',
            status='present',
            induction__project_id=project_id,
            induction__status='completed'
        ).values_list('worker_id', flat=True).distinct()
    ) & Q(id__lt=0)  # Only negative IDs (users)

def apply_induction_trained_user_filter(queryset, user):
    """
    Filter users to only include those who have completed induction training
    
    Args:
        queryset: User QuerySet to filter
        user: Current user (for project context)
        
    Returns:
        Filtered QuerySet containing only induction-trained users
    """
    if not user.project:
        return queryset.none()
    
    from inductiontraining.models import InductionAttendance
    
    # Get user IDs who have completed induction training
    trained_user_ids = InductionAttendance.objects.filter(
        participant_type='user',
        status='present',
        induction__project_id=user.project.id,
        induction__status='completed'
    ).values_list('worker_id', flat=True).distinct()
    
    # Convert negative worker_ids back to positive user IDs
    trained_user_ids = [-uid for uid in trained_user_ids if uid < 0]
    
    return queryset.filter(
        project_id=user.project.id,
        id__in=trained_user_ids
    )