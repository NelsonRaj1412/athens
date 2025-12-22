#!/usr/bin/env python3
import requests
import json

def test_authentication():
    print("=== Testing Authentication ===")
    
    # Test data
    login_data = {
        "username": "test",
        "password": "test123"
    }
    
    # Test direct backend
    print("\n1. Testing direct backend (localhost:8000)")
    try:
        response = requests.post(
            'http://localhost:8000/authentication/login/',
            json=login_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Direct backend authentication successful!")
            data = response.json()
            print(f"Response keys: {list(data.keys())}")
        else:
            print(f"❌ Direct backend failed: {response.text[:200]}")
    except Exception as e:
        print(f"❌ Direct backend error: {e}")
    
    # Test through nginx (production domain)
    print("\n2. Testing through nginx (prozeal.athenas.co.in)")
    try:
        response = requests.post(
            'https://prozeal.athenas.co.in/authentication/login/',
            json=login_data,
            headers={'Content-Type': 'application/json'},
            timeout=10,
            verify=False  # Skip SSL verification for testing
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Nginx proxy authentication successful!")
            data = response.json()
            print(f"Response keys: {list(data.keys())}")
        else:
            print(f"❌ Nginx proxy failed: {response.text[:200]}")
    except Exception as e:
        print(f"❌ Nginx proxy error: {e}")
    
    # Test API prefix route
    print("\n3. Testing API prefix route")
    try:
        response = requests.post(
            'https://prozeal.athenas.co.in/api/authentication/login/',
            json=login_data,
            headers={'Content-Type': 'application/json'},
            timeout=10,
            verify=False
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("✅ API prefix authentication successful!")
            data = response.json()
            print(f"Response keys: {list(data.keys())}")
        else:
            print(f"❌ API prefix failed: {response.text[:200]}")
    except Exception as e:
        print(f"❌ API prefix error: {e}")

if __name__ == '__main__':
    test_authentication()