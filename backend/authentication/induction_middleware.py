"""
Induction Training Access Control Middleware
Restricts access to modules for users who haven't completed induction training
"""
from django.http import JsonResponse
from django.urls import reverse
from django.conf import settings
from .induction_utils import is_user_induction_trained

class InductionTrainingMiddleware:
    """
    Middleware to check if user has completed induction training
    Restricts access to certain modules if training is not completed
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
        # URLs that require induction training completion
        self.protected_urls = [
            '/api/workers/',
            '/api/safety-observations/',
            '/api/incidents/',
            '/api/ptw/',
            '/api/inspections/',
            '/api/quality/',
            '/api/esg/',
        ]
        
        # URLs that are always accessible (even without induction training)
        self.exempt_urls = [
            '/api/auth/',
            '/api/induction-training/',
            '/api/dashboard/',
            '/api/voice-translator/',
            '/admin/',
            '/static/',
            '/media/',
        ]

    def __call__(self, request):
        # Skip middleware for non-API requests or exempt URLs
        if not request.path.startswith('/api/') or any(request.path.startswith(url) for url in self.exempt_urls):
            return self.get_response(request)
        
        # Skip for unauthenticated users (handled by authentication middleware)
        if not request.user.is_authenticated:
            return self.get_response(request)
        
        # Skip for master admins
        if hasattr(request.user, 'admin_type') and request.user.admin_type == 'master':
            return self.get_response(request)
        
        # Check if URL requires induction training
        requires_induction = any(request.path.startswith(url) for url in self.protected_urls)
        
        if requires_induction:
            # Check if user has completed induction training
            if not is_user_induction_trained(request.user):
                return JsonResponse({
                    'error': 'Induction training required',
                    'message': 'You must complete induction training before accessing this module.',
                    'code': 'INDUCTION_TRAINING_REQUIRED'
                }, status=403)
        
        return self.get_response(request)