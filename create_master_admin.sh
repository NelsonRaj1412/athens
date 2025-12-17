#!/bin/bash

echo "Creating Master Admin User"
echo "========================="

cd backend

# Activate virtual environment and create admin
source venv/bin/activate
echo "from authentication.models import CustomUser
if CustomUser.objects.filter(username='master').exists():
    user = CustomUser.objects.get(username='master')
    print('Master admin already exists!')
    print(f'Username: {user.username}')
    print(f'Email: {user.email}')
    print(f'User Type: {user.user_type}')
    print(f'Admin Type: {user.admin_type}')
else:
    user = CustomUser.objects.create_user(
        username='master',
        email='master@athens.com', 
        password='master@123',
        user_type='MASTER_ADMIN',
        admin_type='master',
        is_staff=True,
        is_superuser=True,
        is_active=True
    )
    print('✅ Master Admin Created!')
    print('Username: master')
    print('Password: master@123')
    print('Email: master@athens.com')
    print('User Type: MASTER_ADMIN')
" | python manage.py shell