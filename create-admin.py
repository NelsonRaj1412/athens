#!/usr/bin/env python3
"""
Script to create admin user for Athens EHS system
Run this on the production server in the backend directory
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from authentication.models import CustomUser

#!/usr/bin/env python3
"""
Script to create admin user for Athens EHS system
Run this on the production server in the backend directory
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from authentication.models import CustomUser

def create_admin_user():
    username = 'admin'
    email = 'admin@example.com'
    password = os.environ.get('ADMIN_PASSWORD')
    if not password:
        print("❌ ADMIN_PASSWORD environment variable not set")
        return
    
    try:
        # Check if admin user already exists
        if CustomUser.objects.filter(username=username).exists():
            print(f"❌ User '{username}' already exists")
            # Delete existing user and recreate
            CustomUser.objects.filter(username=username).delete()
            print(f"🗑️  Deleted existing user '{username}'")
        
        # Create new superuser
        user = CustomUser.objects.create_superuser(
            username=username,
            email=email,
            password=password
        )
        print(f"✅ Admin user created successfully!")
        print(f"   Username: {username}")
        print(f"   Email: {email}")
        print(f"   Password: [HIDDEN FOR SECURITY]")
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")

if __name__ == "__main__":
    create_admin_user()

if __name__ == "__main__":
    create_admin_user()