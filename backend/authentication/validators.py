from django.core.exceptions import ValidationError
from django.utils.html import escape
import re

class InputValidator:
    """Centralized input validation utilities"""
    
    @staticmethod
    def validate_username(username):
        """Validate username format"""
        if not username or len(username) < 3:
            raise ValidationError("Username must be at least 3 characters")
        if not re.match(r'^[a-zA-Z0-9_]+$', username):
            raise ValidationError("Username can only contain letters, numbers, and underscores")
        return username.strip()
    
    @staticmethod
    def validate_email(email):
        """Validate email format"""
        if email and not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
            raise ValidationError("Invalid email format")
        return email.strip() if email else None
    
    @staticmethod
    def validate_phone(phone):
        """Validate phone number"""
        if phone and not re.match(r'^[+]?[0-9\s\-\(\)]{10,15}$', phone):
            raise ValidationError("Invalid phone number format")
        return phone.strip() if phone else None
    
    @staticmethod
    def sanitize_text(text, max_length=255):
        """Sanitize text input"""
        if not text:
            return text
        text = escape(text.strip())
        if len(text) > max_length:
            raise ValidationError(f"Text exceeds maximum length of {max_length}")
        return text
    
    @staticmethod
    def validate_file_upload(file_obj, allowed_types=None, max_size=10*1024*1024):
        """Validate file uploads"""
        if not file_obj:
            return None
            
        if file_obj.size > max_size:
            raise ValidationError(f"File size exceeds {max_size} bytes")
            
        if allowed_types:
            file_ext = file_obj.name.split('.')[-1].lower()
            if file_ext not in allowed_types:
                raise ValidationError(f"File type not allowed. Allowed: {', '.join(allowed_types)}")
                
        return file_obj