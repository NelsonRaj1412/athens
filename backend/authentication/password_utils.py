"""
Password security utilities
"""
import secrets
import string


def generate_secure_password(length=20):
    """Generate a cryptographically secure password"""
    if length < 12:
        length = 12
    
    # Define character sets
    lowercase = string.ascii_lowercase
    uppercase = string.ascii_uppercase
    digits = string.digits
    special = '!@#$%^&*()_+-=[]{}|;:,.<>?'
    
    # Ensure at least one character from each set
    password = [
        secrets.choice(lowercase),
        secrets.choice(uppercase),
        secrets.choice(digits),
        secrets.choice(special)
    ]
    
    # Fill the rest with random characters
    all_chars = lowercase + uppercase + digits + special
    for _ in range(length - 4):
        password.append(secrets.choice(all_chars))
    
    # Shuffle the password
    secrets.SystemRandom().shuffle(password)
    
    return ''.join(password)


def validate_password_strength(password):
    """Validate password meets security requirements"""
    if not password:
        return False, "Password is required"
    
    if len(password) < 12:
        return False, "Password must be at least 12 characters long"
    
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"
    
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one digit"
    
    if not any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in password):
        return False, "Password must contain at least one special character"
    
    return True, "Password is strong"