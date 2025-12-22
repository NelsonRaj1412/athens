#!/usr/bin/env python3
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from authentication.models import CustomUser

def reset_admin():
    username = input("Enter new admin username (default: admin): ").strip() or "admin"
    password = input("Enter new admin password (default: admin123): ").strip() or "admin123"
    email = input("Enter admin email (default: admin@athens.com): ").strip() or "admin@athens.com"
    
    try:
        # Delete existing admin if exists
        if CustomUser.objects.filter(username=username).exists():
            CustomUser.objects.filter(username=username).delete()
            print(f"🗑️  Deleted existing user '{username}'")
        
        # Create new admin
        user = CustomUser.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            user_type='MASTER_ADMIN',
            is_staff=True,
            is_superuser=True,
            is_active=True
        )
        
        print("✅ Admin Created Successfully!")
        print(f"Username: {username}")
        print(f"Password: {password}")
        print(f"Email: {email}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == '__main__':
    reset_admin()