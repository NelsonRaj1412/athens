"""
Security middleware for Athens EHS System
"""
import logging
import time
from django.http import HttpResponseForbidden
from django.core.cache import cache
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(MiddlewareMixin):
    """Add security headers to all responses"""
    
    def process_response(self, request, response):
        # Security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Content Security Policy (basic)
        if not settings.DEBUG:
            response['Content-Security-Policy'] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: blob:; "
                "font-src 'self'; "
                "connect-src 'self';"
            )
        
        return response


class RateLimitMiddleware(MiddlewareMixin):
    """Basic rate limiting middleware"""
    
    def process_request(self, request):
        if settings.DEBUG:
            return None
            
        # Get client IP
        ip = self.get_client_ip(request)
        
        # Rate limit login attempts
        if request.path.startswith('/authentication/login/'):
            return self.check_rate_limit(ip, 'login', 5, 300)  # 5 attempts per 5 minutes
        
        # Rate limit API calls
        if request.path.startswith('/api/'):
            return self.check_rate_limit(ip, 'api', 100, 60)  # 100 requests per minute
        
        return None
    
    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def check_rate_limit(self, ip, action, limit, window):
        """Check if request exceeds rate limit"""
        cache_key = f"rate_limit:{action}:{ip}"
        current_requests = cache.get(cache_key, 0)
        
        if current_requests >= limit:
            logger.warning(f"Rate limit exceeded for {ip} on {action}")
            return HttpResponseForbidden("Rate limit exceeded")
        
        # Increment counter
        cache.set(cache_key, current_requests + 1, window)
        return None


class RequestLoggingMiddleware(MiddlewareMixin):
    """Log security-relevant requests"""
    
    def process_request(self, request):
        # Log authentication attempts
        if request.path.startswith('/authentication/'):
            logger.info(f"Auth request: {request.method} {request.path} from {self.get_client_ip(request)}")
        
        # Log admin access
        if request.path.startswith('/admin/'):
            logger.info(f"Admin access: {request.method} {request.path} from {self.get_client_ip(request)}")
        
        return None
    
    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class InputSanitizationMiddleware(MiddlewareMixin):
    """Basic input sanitization"""
    
    def process_request(self, request):
        # Sanitize query parameters
        if request.GET:
            for key, value in request.GET.items():
                if self.contains_suspicious_content(value):
                    logger.warning(f"Suspicious query parameter detected: {key}={value}")
                    return HttpResponseForbidden("Invalid request")
        
        return None
    
    def contains_suspicious_content(self, value):
        """Check for suspicious content in input"""
        suspicious_patterns = [
            '<script',
            'javascript:',
            'onload=',
            'onerror=',
            'eval(',
            'document.cookie',
            'DROP TABLE',
            'UNION SELECT',
            '../',
            '..\\',
        ]
        
        value_lower = value.lower()
        return any(pattern in value_lower for pattern in suspicious_patterns)