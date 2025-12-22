"""
Secure password generation and validation utilities
"""
import secrets
import string
import random
from rest_framework.response import Response
from rest_framework import status
from .security_utils import sanitize_log_input
from .password_utils import generate_secure_password, validate_password_strength


def create_secure_admin_password():
    """Generate a secure password for admin users"""
    return generate_secure_password(20)


def validate_password_reset_request(request_data):
    """Validate password reset request"""
    new_password = request_data.get('new_password') or request_data.get('password')
    
    if not new_password:
        return False, "New password is required"
    
    is_valid, message = validate_password_strength(new_password)
    if not is_valid:
        return False, message
    
    return True, "Password is valid"


def secure_password_response(password_valid, message, status_code=status.HTTP_400_BAD_REQUEST):
    """Return standardized password validation response"""
    if not password_valid:
        return Response({"error": message}, status=status_code)
    return None