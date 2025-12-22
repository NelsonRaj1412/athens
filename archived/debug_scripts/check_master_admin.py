#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from authentication.models import CustomUser

# Check if master admin exists
master = CustomUser.objects.filter(admin_type='master').first()
if master:
    print(f"Master admin exists: {master.username}")
    print(f"Is active: {master.is_active}")
    print(f"Email: {master.email}")
else:
    print("No master admin found")
    print("Creating master admin...")
    
    # Create master admin
    password = os.environ['ADMIN_PASSWORD']
    master = CustomUser.objects.create_user(
        username='master_admin',
        email='master@company.com',
        password=password,
        admin_type='master',
        is_active=True,
        is_staff=True,
        is_superuser=True
    )
    print(f"Master admin created: {master.username}")