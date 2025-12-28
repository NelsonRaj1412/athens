"""
Centralized Project Isolation Utility
Ensures consistent project-based data filtering across all modules
"""
from django.db.models import Q
from django.contrib.auth import get_user_model

User = get_user_model()

class ProjectIsolationMixin:
    """
    Mixin to provide project isolation for ViewSets and Views
    """
    
    def get_project_filter(self, request):
        """
        Returns the project filter for the current user
        """
        if not request.user.project:
            return Q(pk__in=[])  # Return empty queryset if no project
        
        return Q(project_id=request.user.project.id)
    
    def get_user_project_filter(self, request):
        """
        Returns the user project filter for the current user
        """
        if not request.user.project:
            return Q(pk__in=[])  # Return empty queryset if no project
        
        return Q(project_id=request.user.project.id)
    
    def filter_by_project(self, queryset, request):
        """
        Filters queryset by current user's project
        """
        if not request.user.project:
            return queryset.none()
        
        return queryset.filter(project_id=request.user.project.id)
    
    def filter_users_by_project(self, queryset, request):
        """
        Filters user queryset by current user's project
        """
        if not request.user.project:
            return queryset.none()
        
        return queryset.filter(project_id=request.user.project.id)

def apply_project_isolation(queryset, user, model_field='project'):
    """
    Standalone function to apply project isolation to any queryset
    
    Args:
        queryset: Django QuerySet to filter
        user: Current user object
        model_field: Field name for project relationship (default: 'project')
    
    Returns:
        Filtered queryset
    """
    if not user.project:
        return queryset.none()
    
    filter_kwargs = {f'{model_field}_id': user.project.id}
    return queryset.filter(**filter_kwargs)

def apply_user_project_isolation(queryset, user):
    """
    Apply project isolation specifically for User model
    """
    if not user.project:
        return queryset.none()
    
    return queryset.filter(project_id=user.project.id)

def apply_user_project_isolation_with_induction(queryset, user):
    """
    Apply project isolation for User model with induction training requirement
    Only returns users who have completed induction training
    """
    if not user.project:
        return queryset.none()
    
    # TEMPORARY: Check if induction training requirement should be enforced
    # This allows gradual rollout of the induction training feature
    from django.conf import settings
    enforce_induction_training = getattr(settings, 'ENFORCE_INDUCTION_TRAINING', False)
    
    if not enforce_induction_training:
        # If not enforcing, just apply regular project isolation
        return queryset.filter(project_id=user.project.id)
    
    # If enforcing, apply induction training filter
    from .induction_utils import apply_induction_trained_user_filter
    return apply_induction_trained_user_filter(queryset, user)