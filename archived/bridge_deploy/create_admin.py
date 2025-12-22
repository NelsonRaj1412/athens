#!/usr/bin/env python
import os
import sys
import django

# Add the project directory to the Python path
sys.path.append('/home/athenas/Documents/28aug/10.07.2025 upatepro/upatepro/Athens/backend')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from authentication.models import CustomUser

def create_master_admin():
    # Check if master admin already exists
    if CustomUser.objects.filter(username='masteradmin').exists():
        print("Master admin already exists!")
        user = CustomUser.objects.get(username='masteradmin')
        print(f"Username: {user.username}")
        print(f"Email: {user.email}")
        return
    
    # Create master admin
    password = os.environ['ADMIN_PASSWORD']
    user = CustomUser.objects.create_user(
        username='masteradmin',
        email='admin@ehs.com',
        password=password,
        first_name='Master',
        last_name='Admin',
        admin_type='masteradmin',
        grade='A',
        is_staff=True,
        is_superuser=True,
        is_active=True
    )
    
    print("✅ Master Admin Created Successfully!")
    print("=" * 40)
    print(f"Username: {user.username}")
    print(f"Password: admin123")
    print(f"Email: {user.email}")
    print(f"Admin Type: {user.admin_type}")
    print(f"Grade: {user.grade}")
    print("=" * 40)
    print("Login URL: http://localhost:5173/login")

if __name__ == '__main__':
    create_master_admin()