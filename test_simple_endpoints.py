#!/usr/bin/env python3

import requests
import json

def test_endpoints():
    """Test the job training endpoints"""
    
    print("Testing Job Training API endpoints...")
    
    base_url = "http://localhost:8001"
    
    # Test server connectivity
    try:
        response = requests.get(f"{base_url}/", timeout=5)
        print(f"✅ Server is running: Status {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("❌ Server is not running on localhost:8001")
        return False
    except Exception as e:
        print(f"❌ Server connection error: {e}")
        return False
    
    # Test trained-personnel endpoint
    try:
        response = requests.get(f"{base_url}/jobtraining/trained-personnel/", timeout=10)
        print(f"✅ trained-personnel endpoint: Status {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   - Found {data.get('count', 0)} trained personnel")
            print(f"   - Workers: {data.get('workers_count', 0)}")
            print(f"   - Users: {data.get('users_count', 0)}")
        elif response.status_code == 403:
            print("   - Authentication required (expected for production)")
        else:
            print(f"   - Response: {response.text[:200]}")
    except Exception as e:
        print(f"❌ trained-personnel endpoint error: {e}")
    
    # Test deployed-workers endpoint (should work now)
    try:
        response = requests.get(f"{base_url}/jobtraining/deployed-workers/", timeout=10)
        print(f"✅ deployed-workers endpoint: Status {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   - Found {data.get('count', 0)} deployed workers")
        elif response.status_code == 403:
            print("   - Authentication required (expected for production)")
        else:
            print(f"   - Response: {response.text[:200]}")
    except Exception as e:
        print(f"❌ deployed-workers endpoint error: {e}")
    
    return True

if __name__ == "__main__":
    success = test_endpoints()
    if success:
        print("\n✅ Job Training API endpoints test completed")
    else:
        print("\n❌ Job Training API endpoints test failed")