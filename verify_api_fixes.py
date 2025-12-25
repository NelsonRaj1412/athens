#!/usr/bin/env python3
"""
Verification script to test the fixed API endpoints
"""

import os
import sys
import django
from django.conf import settings

# Add the backend directory to Python path
sys.path.append('/var/www/athens/backend')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from authentication.models import Project, AdminDetail
import json

User = get_user_model()

def test_project_deletion():
    """Test project deletion with proper error handling"""
    print("Testing Project Deletion API...")
    
    try:
        # Create a test project
        project = Project.objects.create(
            projectName="Test Delete Project",
            projectCategory="Test",
            location="Test Location"
        )
        
        # Get a master admin user
        master_admin = User.objects.filter(admin_type='master').first()
        if not master_admin:
            print("✗ No master admin found for testing")
            return False
        
        # Generate token
        refresh = RefreshToken.for_user(master_admin)
        access_token = str(refresh.access_token)
        
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        # Test deletion
        response = client.delete(f'/authentication/project/delete/{project.id}/')
        
        if response.status_code == 200:
            print("✓ Project deletion API working correctly")
            return True
        else:
            print(f"✗ Project deletion failed: {response.status_code} - {response.data}")
            return False
            
    except Exception as e:
        print(f"✗ Project deletion test error: {e}")
        return False

def test_admin_detail_api():
    """Test admin detail retrieval"""
    print("Testing Admin Detail API...")
    
    try:
        # Get a project admin
        project_admin = User.objects.filter(user_type='projectadmin').first()
        if not project_admin:
            print("✗ No project admin found for testing")
            return False
        
        # Generate token
        refresh = RefreshToken.for_user(project_admin)
        access_token = str(refresh.access_token)
        
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        # Test admin detail retrieval
        response = client.get(f'/authentication/admin/detail/{project_admin.id}/')
        
        if response.status_code == 200:
            print("✓ Admin Detail API working correctly")
            return True
        else:
            print(f"✗ Admin Detail API failed: {response.status_code} - {response.data}")
            return False
            
    except Exception as e:
        print(f"✗ Admin Detail API test error: {e}")
        return False

def test_training_creation():
    """Test training module creation endpoints"""
    print("Testing Training Module Creation APIs...")
    
    try:
        # Get an EPC user
        epc_user = User.objects.filter(admin_type='epc').first()
        if not epc_user:
            print("✗ No EPC user found for testing")
            return False
        
        # Generate token
        refresh = RefreshToken.for_user(epc_user)
        access_token = str(refresh.access_token)
        
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        # Test data
        training_data = {
            'title': 'Test Training',
            'date': '2025-01-26',
            'location': 'Test Location',
            'conducted_by': epc_user.id
        }
        
        # Test induction training creation
        response = client.post('/induction/create/', training_data, format='json')
        induction_success = response.status_code == 201
        
        # Test job training creation
        response = client.post('/jobtraining/create/', training_data, format='json')
        job_success = response.status_code == 201
        
        # Test toolbox talk creation
        response = client.post('/tbt/create/', training_data, format='json')
        tbt_success = response.status_code == 201
        
        if induction_success and job_success and tbt_success:
            print("✓ All Training Creation APIs working correctly")
            return True
        else:
            print(f"✗ Training APIs status - Induction: {induction_success}, Job: {job_success}, TBT: {tbt_success}")
            return False
            
    except Exception as e:
        print(f"✗ Training Creation API test error: {e}")
        return False

def test_safety_observation_delete():
    """Test safety observation deletion"""
    print("Testing Safety Observation Delete API...")
    
    try:
        from safetyobservation.models import SafetyObservation
        
        # Get an EPC user
        epc_user = User.objects.filter(admin_type='epc').first()
        if not epc_user:
            print("✗ No EPC user found for testing")
            return False
        
        # Create a test safety observation
        observation = SafetyObservation.objects.create(
            observationID='TEST-DELETE-001',
            typeOfObservation='unsafe_act',
            severity='low',
            workLocation='Test Location',
            created_by=epc_user
        )
        
        # Generate token
        refresh = RefreshToken.for_user(epc_user)
        access_token = str(refresh.access_token)
        
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        # Test deletion
        response = client.delete(f'/api/v1/safetyobservation/{observation.observationID}/')
        
        if response.status_code == 200:
            print("✓ Safety Observation Delete API working correctly")
            return True
        else:
            print(f"✗ Safety Observation Delete API failed: {response.status_code} - {response.data}")
            return False
            
    except Exception as e:
        print(f"✗ Safety Observation Delete API test error: {e}")
        return False

def main():
    """Run all verification tests"""
    print("Athens EHS System - API Verification Tests")
    print("=" * 50)
    
    tests = [
        ("Project Deletion", test_project_deletion),
        ("Admin Detail Retrieval", test_admin_detail_api),
        ("Training Creation", test_training_creation),
        ("Safety Observation Delete", test_safety_observation_delete),
    ]
    
    results = {}
    
    for test_name, test_function in tests:
        print(f"\n{test_name}:")
        print("-" * 30)
        try:
            results[test_name] = test_function()
        except Exception as e:
            print(f"✗ Test {test_name} failed with error: {e}")
            results[test_name] = False
    
    print("\n" + "=" * 50)
    print("Verification Summary:")
    print("=" * 50)
    
    for test_name, success in results.items():
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"{test_name}: {status}")
    
    all_success = all(results.values())
    print(f"\nOverall Status: {'✓ ALL TESTS PASSED' if all_success else '✗ SOME TESTS FAILED'}")
    
    if all_success:
        print("\n🎉 All API fixes are working correctly!")
        print("The reported backend issues have been successfully resolved.")
    else:
        print("\n⚠️  Some tests failed. Please check the error messages above.")

if __name__ == "__main__":
    main()