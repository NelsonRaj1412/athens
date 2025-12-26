#!/usr/bin/env python
import os
import sys
import django

# Add the project directory to the Python path
sys.path.append('/var/www/athens/backend')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from inductiontraining.views import InductionTrainingViewSet

User = get_user_model()

def test_initiated_workers_endpoint():
    print("=== Testing Initiated Workers Endpoint ===")
    
    # Get an EPC Safety user
    epc_user = User.objects.filter(
        admin_type='epcuser',
        department__icontains='safety'
    ).first()
    
    if not epc_user:
        print("ERROR: No EPC Safety user found!")
        return
    
    print(f"Using EPC Safety user: {epc_user.username}")
    print(f"Department: {epc_user.department}")
    print(f"Project: {epc_user.project}")
    
    # Create a mock request
    factory = RequestFactory()
    request = factory.get('/induction/initiated-workers/', HTTP_HOST='localhost:8000')
    request.user = epc_user
    
    # Create viewset instance and call the method
    viewset = InductionTrainingViewSet()
    viewset.request = request
    
    try:
        response = viewset.initiated_workers(request)
        print(f"\nResponse Status: {response.status_code}")
        print(f"Response Data Keys: {list(response.data.keys())}")
        
        if 'workers' in response.data:
            print(f"Workers Count: {len(response.data['workers'])}")
            if response.data['workers']:
                print("Sample Worker:", response.data['workers'][0])
        
        if 'users' in response.data:
            print(f"Users Count: {len(response.data['users'])}")
            if response.data['users']:
                print("Sample User:", response.data['users'][0])
        
        if 'all_participants' in response.data:
            print(f"Total Participants: {len(response.data['all_participants'])}")
        
        print(f"Message: {response.data.get('message', 'No message')}")
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_initiated_workers_endpoint()