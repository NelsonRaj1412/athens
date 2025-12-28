#!/usr/bin/env python3
"""
Script to regenerate signature templates with custom logo transparency
Usage: python set_logo_transparency.py <opacity_percentage>
Example: python set_logo_transparency.py 50
"""

import os
import sys
import django
import requests
import json

# Add the backend directory to Python path
sys.path.append('/var/www/athens/backend')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'athens.settings')
django.setup()

from authentication.models import UserDetail, AdminDetail
from authentication.signature_template_generator_new import create_user_signature_template, create_admin_signature_template

def regenerate_templates_with_opacity(opacity_percent):
    """
    Regenerate all signature templates with the specified opacity
    
    Args:
        opacity_percent: Integer between 0-100 for logo transparency percentage
    """
    # Convert percentage to decimal (0.0 to 1.0)
    opacity = opacity_percent / 100.0
    
    print(f"Setting logo transparency to {opacity_percent}% ({opacity})")
    
    # Regenerate user signature templates
    user_details = UserDetail.objects.filter(signature_template__isnull=False)
    print(f"Found {user_details.count()} user signature templates to regenerate")
    
    for user_detail in user_details:
        try:
            # Delete old template
            if user_detail.signature_template:
                user_detail.signature_template.delete(save=False)
            
            # Create new template with custom opacity
            create_user_signature_template(user_detail, logo_opacity=opacity)
            print(f"✓ Regenerated template for user: {user_detail.user.username}")
        except Exception as e:
            print(f"✗ Failed to regenerate template for user {user_detail.user.username}: {e}")
    
    # Regenerate admin signature templates
    admin_details = AdminDetail.objects.filter(signature_template__isnull=False)
    print(f"Found {admin_details.count()} admin signature templates to regenerate")
    
    for admin_detail in admin_details:
        try:
            # Delete old template
            if admin_detail.signature_template:
                admin_detail.signature_template.delete(save=False)
            
            # Create new template with custom opacity
            create_admin_signature_template(admin_detail, logo_opacity=opacity)
            print(f"✓ Regenerated template for admin: {admin_detail.user.username}")
        except Exception as e:
            print(f"✗ Failed to regenerate template for admin {admin_detail.user.username}: {e}")
    
    print(f"\nCompleted! All signature templates now have {opacity_percent}% logo transparency.")

def main():
    if len(sys.argv) != 2:
        print("Usage: python set_logo_transparency.py <opacity_percentage>")
        print("Example: python set_logo_transparency.py 50")
        print("Opacity should be between 0 (fully transparent) and 100 (fully opaque)")
        sys.exit(1)
    
    try:
        opacity_percent = int(sys.argv[1])
        if opacity_percent < 0 or opacity_percent > 100:
            raise ValueError("Opacity must be between 0 and 100")
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)
    
    regenerate_templates_with_opacity(opacity_percent)

if __name__ == "__main__":
    main()