#!/usr/bin/env python3
"""
Debug script for safety observation project-users endpoint
"""
import os
import sys
import django

# Add the backend directory to Python path
sys.path.append('/var/www/athens/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Setup Django
django.setup()

from django.contrib.auth import get_user_model
from authentication.project_isolation import apply_user_project_isolation, apply_user_project_isolation_with_induction
from authentication.induction_utils import is_user_induction_trained, apply_induction_trained_user_filter
from inductiontraining.models import InductionTraining, InductionAttendance

User = get_user_model()

def debug_safety_observation_users():
    print("=== Safety Observation Project Users Debug ===\n")
    
    # Get a test user from production
    test_user = User.objects.filter(project__isnull=False, is_active=True).first()
    if not test_user:
        print("❌ No active users with projects found")
        return
    
    print(f"Testing with user: {test_user.username}")
    print(f"Project: {test_user.project.projectName}")
    print(f"Admin type: {test_user.admin_type}")
    print()
    
    # Test 1: Regular project isolation (old method)
    print("=== Test 1: Regular Project Isolation ===")
    regular_users = apply_user_project_isolation(
        User.objects.filter(is_active=True).exclude(admin_type='master'),
        test_user
    )
    print(f"Regular project isolation count: {regular_users.count()}")
    
    # Test 2: Induction training isolation (new method)
    print("\n=== Test 2: Induction Training Isolation ===")
    try:
        trained_users = apply_user_project_isolation_with_induction(
            User.objects.filter(is_active=True).exclude(admin_type='master'),
            test_user
        )
        print(f"Induction-trained users count: {trained_users.count()}")
    except Exception as e:
        print(f"❌ Error with induction training isolation: {e}")
        import traceback
        traceback.print_exc()
    
    # Test 3: Check induction training data
    print("\n=== Test 3: Induction Training Data ===")
    completed_trainings = InductionTraining.objects.filter(
        project_id=test_user.project.id,
        status='completed'
    )
    print(f"Completed induction trainings: {completed_trainings.count()}")
    
    user_attendances = InductionAttendance.objects.filter(
        participant_type='user',
        status='present',
        induction__project_id=test_user.project.id,
        induction__status='completed'
    )
    print(f"User attendance records: {user_attendances.count()}")
    
    # Test 4: Check individual user training status
    print("\n=== Test 4: Individual User Training Status ===")
    project_users = User.objects.filter(
        project_id=test_user.project.id,
        is_active=True
    ).exclude(admin_type='master')
    
    for user in project_users[:5]:  # Check first 5 users
        is_trained = is_user_induction_trained(user)
        print(f"  {user.username}: {'✅ Trained' if is_trained else '❌ Not Trained'}")
    
    # Test 5: Simulate the exact endpoint logic
    print("\n=== Test 5: Endpoint Simulation ===")
    try:
        project_users_endpoint = apply_user_project_isolation_with_induction(
            User.objects.filter(is_active=True).exclude(admin_type='master'),
            test_user
        ).values('id', 'username', 'name', 'surname')
        
        users_list = []
        for user_data in project_users_endpoint:
            display_name = f"{user_data['name']} {user_data['surname']}".strip() if user_data['name'] else user_data['username']
            users_list.append({
                'username': user_data['username'],
                'display_name': display_name
            })
        
        print(f"Endpoint would return {len(users_list)} users:")
        for user_info in users_list:
            print(f"  - {user_info['username']} ({user_info['display_name']})")
            
    except Exception as e:
        print(f"❌ Error simulating endpoint: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_safety_observation_users()