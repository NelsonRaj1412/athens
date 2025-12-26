"""
Project Isolation Utilities

This module provides utility functions and decorators to enforce
project-based data isolation across the Athens EHS System.
"""

import logging
from functools import wraps
from django.http import JsonResponse
from django.core.exceptions import PermissionDenied
from django.contrib.auth import get_user_model
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)
User = get_user_model()


def require_project_access(view_func):
    """
    Decorator to ensure the user has project access before executing the view.
    
    Usage:
        @require_project_access
        def my_view(request):
            # This view will only execute if user has project access
            pass
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return JsonResponse({
                'error': 'Authentication required',
                'code': 'AUTH_REQUIRED'
            }, status=401)
        
        # Master admin and superusers bypass project isolation
        if is_master_or_superuser(request.user):
            return view_func(request, *args, **kwargs)
        
        # Check if user has project access
        if not has_project_access(request.user):
            return JsonResponse({
                'error': 'Project access required',
                'message': 'You must be assigned to a project to access this resource.',
                'code': 'PROJECT_REQUIRED'
            }, status=403)
        
        return view_func(request, *args, **kwargs)
    
    return wrapper


def require_same_project(model_class, lookup_field='pk'):
    """
    Decorator to ensure the requested object belongs to the user's project.
    
    Usage:
        @require_same_project(Worker, 'pk')
        def worker_detail_view(request, pk):
            # This view will only execute if the worker belongs to user's project
            pass
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not has_project_access(request.user):
                return JsonResponse({
                    'error': 'Project access required',
                    'code': 'PROJECT_REQUIRED'
                }, status=403)
            
            # Get the object ID from kwargs
            obj_id = kwargs.get(lookup_field)
            if obj_id:
                try:
                    obj = model_class.objects.get(pk=obj_id)
                    if hasattr(obj, 'project') and obj.project != request.user.project:
                        return JsonResponse({
                            'error': 'Access denied',
                            'message': 'You can only access resources from your project.',
                            'code': 'PROJECT_MISMATCH'
                        }, status=403)
                except model_class.DoesNotExist:
                    return JsonResponse({
                        'error': 'Object not found',
                        'code': 'NOT_FOUND'
                    }, status=404)
            
            return view_func(request, *args, **kwargs)
        
        return wrapper
    return decorator


class ProjectIsolationMixin:
    """
    Mixin for ViewSets to automatically enforce project isolation.
    
    Usage:
        class WorkerViewSet(ProjectIsolationMixin, viewsets.ModelViewSet):
            model = Worker
            queryset = Worker.objects.all()
    """
    
    def get_queryset(self):
        """Override to filter queryset by user's project."""
        queryset = super().get_queryset()
        
        # Master admin and superusers see all data
        if is_master_or_superuser(self.request.user):
            return queryset
        
        # Filter by user's project
        if has_project_access(self.request.user):
            if hasattr(queryset.model, 'project'):
                return queryset.filter(project=self.request.user.project)
        
        # Return empty queryset if no project access
        return queryset.none()
    
    def perform_create(self, serializer):
        """Override to automatically set project on creation."""
        if has_project_access(self.request.user):
            if hasattr(serializer.Meta.model, 'project'):
                serializer.save(
                    created_by=self.request.user,
                    project=self.request.user.project
                )
            else:
                serializer.save(created_by=self.request.user)
        else:
            raise PermissionDenied("Project access required to create resources.")


def filter_by_project(queryset, user):
    """
    Filter a queryset by the user's project.
    
    Args:
        queryset: Django QuerySet to filter
        user: User object
    
    Returns:
        Filtered QuerySet
    """
    # Master admin and superusers see all data
    if is_master_or_superuser(user):
        return queryset
    
    # Filter by user's project if they have project access
    if has_project_access(user):
        if hasattr(queryset.model, 'project'):
            return queryset.filter(project=user.project)
    
    # Return empty queryset if no project access
    return queryset.none()


def validate_project_access(user, obj=None):
    """
    Validate that a user has access to a specific object or general project access.
    
    Args:
        user: User object
        obj: Optional object to check project access for
    
    Returns:
        bool: True if access is allowed, False otherwise
    """
    # Master admin and superusers have access to everything
    if is_master_or_superuser(user):
        return True
    
    # Check general project access
    if not has_project_access(user):
        return False
    
    # If object is provided, check if it belongs to user's project
    if obj and hasattr(obj, 'project'):
        return obj.project == user.project
    
    return True


def has_project_access(user):
    """
    Check if a user has project access.
    
    Args:
        user: User object
    
    Returns:
        bool: True if user has project access, False otherwise
    """
    return (
        hasattr(user, 'project') and 
        user.project is not None and
        user.is_authenticated
    )


def is_master_or_superuser(user):
    """
    Check if a user is a master admin or superuser.
    
    Args:
        user: User object
    
    Returns:
        bool: True if user is master admin or superuser, False otherwise
    """
    return (
        user.is_superuser or 
        (hasattr(user, 'admin_type') and user.admin_type == 'master')
    )


def get_user_project_context(user):
    """
    Get project context information for a user.
    
    Args:
        user: User object
    
    Returns:
        dict: Project context information
    """
    if not user.is_authenticated:
        return {
            'has_project_access': False,
            'project': None,
            'project_id': None,
            'project_name': None,
            'is_master': False
        }
    
    return {
        'has_project_access': has_project_access(user),
        'project': user.project if has_project_access(user) else None,
        'project_id': user.project.id if has_project_access(user) else None,
        'project_name': user.project.projectName if has_project_access(user) else None,
        'is_master': is_master_or_superuser(user)
    }


def log_project_access(user, resource, action='access'):
    """
    Log project access for security monitoring.
    
    Args:
        user: User object
        resource: Resource being accessed
        action: Action being performed (default: 'access')
    """
    project_name = user.project.projectName if has_project_access(user) else 'No Project'
    logger.info(f"Project Access: User {user.username} "
               f"(project: {project_name}) "
               f"performed {action} on {resource}")


class ProjectBoundaryError(Exception):
    """Exception raised when project boundary is violated."""
    pass


def enforce_project_boundary(user, obj, action='access'):
    """
    Enforce project boundary for an object.
    
    Args:
        user: User object
        obj: Object to check
        action: Action being performed
    
    Raises:
        ProjectBoundaryError: If project boundary is violated
    """
    if not validate_project_access(user, obj):
        log_project_access(user, f"{obj.__class__.__name__}:{obj.pk}", f"DENIED_{action}")
        raise ProjectBoundaryError(
            f"Access denied: {obj.__class__.__name__} does not belong to your project"
        )
    
    log_project_access(user, f"{obj.__class__.__name__}:{obj.pk}", action)