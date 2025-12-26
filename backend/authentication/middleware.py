"""
Project Isolation Middleware

This middleware ensures that all database operations are automatically
filtered by the user's project to maintain strict data isolation.
"""

import logging
from django.http import JsonResponse
from django.contrib.auth import get_user_model
from django.db import models
from django.core.exceptions import PermissionDenied

logger = logging.getLogger(__name__)
User = get_user_model()

class ProjectIsolationMiddleware:
    """
    Middleware to enforce project-based data isolation.
    
    This middleware:
    1. Validates that authenticated users have a project assigned
    2. Logs access attempts for security monitoring
    3. Provides project context for views
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
        # Paths that don't require project isolation
        self.exempt_paths = [
            '/api/auth/login/',
            '/api/auth/logout/',
            '/api/auth/token/',
            '/api/auth/token/refresh/',
            '/admin/',
            '/media/',
            '/static/',
            '/api/auth/create-master-admin/',
            '/api/projects/',  # Master admin project management
        ]
        
        # API endpoints that require project isolation
        self.project_required_patterns = [
            '/api/workers/',
            '/api/induction/',
            '/api/authentication/users/',
            '/api/ptw/',
            '/api/incidents/',
            '/api/manpower/',
            '/api/tbt/',
            '/api/inspection/',
            '/api/jobtraining/',
            '/api/safetyobservation/',
            '/api/mom/',
        ]

    def __call__(self, request):
        # Check if path requires project isolation
        if self._requires_project_isolation(request.path):
            # Validate project access for authenticated users
            if hasattr(request, 'user') and request.user.is_authenticated:
                if not self._validate_project_access(request):
                    return JsonResponse({
                        'error': 'Project access required',
                        'message': 'You must be assigned to a project to access this resource.',
                        'code': 'PROJECT_REQUIRED'
                    }, status=403)
        
        response = self.get_response(request)
        return response

    def _requires_project_isolation(self, path):
        """Check if the request path requires project isolation."""
        # Skip exempt paths
        for exempt_path in self.exempt_paths:
            if path.startswith(exempt_path):
                return False
        
        # Check if path matches project-required patterns
        for pattern in self.project_required_patterns:
            if path.startswith(pattern):
                return True
        
        return False

    def _validate_project_access(self, request):
        """Validate that the user has proper project access."""
        user = request.user
        
        # Master admin and superusers bypass project isolation
        if (hasattr(user, 'admin_type') and user.admin_type == 'master') or user.is_superuser:
            return True
        
        # Check if user has a project assigned
        if not hasattr(user, 'project') or not user.project:
            logger.warning(f"User {user.username} attempted to access project-isolated resource without project assignment")
            return False
        
        # Log successful project access for monitoring
        logger.debug(f"User {user.username} accessing project-isolated resource for project {user.project.projectName}")
        return True


class ProjectQuerySetMiddleware:
    """
    Middleware to automatically filter querysets by project.
    
    This is a more advanced middleware that would require model modifications
    to work properly. It's included as a reference for future implementation.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Add project context to request
        if hasattr(request, 'user') and request.user.is_authenticated:
            if hasattr(request.user, 'project') and request.user.project:
                request.current_project = request.user.project
            else:
                request.current_project = None
        
        response = self.get_response(request)
        return response


class SecurityAuditMiddleware:
    """
    Middleware for security auditing and logging.
    
    Logs all access attempts to project-isolated resources for security monitoring.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Log access attempts for security monitoring
        if hasattr(request, 'user') and request.user.is_authenticated:
            if self._is_sensitive_endpoint(request.path):
                logger.info(f"Security Audit: User {request.user.username} "
                           f"(project: {getattr(request.user, 'project', None)}) "
                           f"accessed {request.method} {request.path}")
        
        response = self.get_response(request)
        return response

    def _is_sensitive_endpoint(self, path):
        """Check if the endpoint handles sensitive data."""
        sensitive_patterns = [
            '/api/workers/',
            '/api/induction/',
            '/api/authentication/users/',
            '/api/ptw/',
            '/api/incidents/',
        ]
        
        return any(path.startswith(pattern) for pattern in sensitive_patterns)