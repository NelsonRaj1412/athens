#!/usr/bin/env python3

import os
import sys
import django
import requests
from django.conf import settings

# Add the backend directory to Python path
sys.path.append('/var/www/athens/backend')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from authentication.models import Project

User = get_user_model()

def test_jobtraining_endpoints():
    """Test the job training endpoints"""
    
    print("Testing Job Training API endpoints...")
    
    # Get a test user with project
    try:
        user = User.objects.filter(project__isnull=False).first()
        if not user:
            print("❌ No user with project found for testing")
            return False
            
        print(f"✅ Using test user: {user.username} (Project: {user.project.projectName if user.project else 'None'})")
        
        # Test the deployed-workers endpoint (should redirect to trained-personnel)
        base_url = "http://localhost:8001"
        
        # Create headers with authentication if needed
        headers = {}
        
        # Check if the server is running
        try:
            response = requests.get(f"{base_url}/", timeout=5)
            print(f"✅ Server is running: Status {response.status_code}")
        except requests.exceptions.ConnectionError:
            print("❌ Server is not running on localhost:8000")
            return False
        except Exception as e:
            print(f"❌ Server connection error: {e}")
            return False
        
        # Test trained-personnel endpoint
        try:
            response = requests.get(f"{base_url}/jobtraining/trained-personnel/", headers=headers)
            print(f"✅ trained-personnel endpoint: Status {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   - Found {data.get('count', 0)} trained personnel")
                print(f"   - Workers: {data.get('workers_count', 0)}")
                print(f"   - Users: {data.get('users_count', 0)}")
            elif response.status_code == 403:
                print("   - Authentication required (expected for production)")
        except Exception as e:
            print(f"❌ trained-personnel endpoint error: {e}")
        
        # Test deployed-workers endpoint (should work now)
        try:
            response = requests.get(f"{base_url}/jobtraining/deployed-workers/", headers=headers)
            print(f"✅ deployed-workers endpoint: Status {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   - Found {data.get('count', 0)} deployed workers")
            elif response.status_code == 403:
                print("   - Authentication required (expected for production)")
        except Exception as e:
            print(f"❌ deployed-workers endpoint error: {e}")
            
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    success = test_jobtraining_endpoints()
    if success:
        print("\n✅ Job Training API endpoints test completed")
    else:
        print("\n❌ Job Training API endpoints test failed")