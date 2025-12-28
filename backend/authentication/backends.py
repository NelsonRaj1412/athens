from django.contrib.auth.backends import ModelBackend
from .models import CustomUser
import logging

logger = logging.getLogger(__name__)

class CustomAuthBackend(ModelBackend):
    """
    Custom authentication backend for CustomUser model.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None or password is None:
            return None
            
        try:
            user = CustomUser.objects.get(username=username)
            if user.check_password(password) and user.is_active:
                return user
            logger.warning(f"Authentication failed for user {username}")
        except CustomUser.DoesNotExist:
            logger.warning(f"User {username} does not exist")
        return None
        
    def get_user(self, user_id):
        try:
            return CustomUser.objects.get(pk=user_id, is_active=True)
        except CustomUser.DoesNotExist:
            return None
