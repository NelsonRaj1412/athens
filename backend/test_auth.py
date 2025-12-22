#!/usr/bin/env python3
import os
import django
import requests
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from authentication.models import CustomUser

def test_user_exists():
    print("=== Testing User Database ===")
    try:
        user = CustomUser.objects.get(username='master')
        print(f"✅ User found: {user.username}")
        print(f"   Email: {user.email}")
        print(f"   User Type: {user.user_type}")
        print(f"   Admin Type: {user.admin_type}")
        print(f"   Is Active: {user.is_active}")
        print(f"   Is Staff: {user.is_staff}")
        print(f"   Is Superuser: {user.is_superuser}")
        
        # Test password
        if user.check_password('master123'):
            print("✅ Password is correct")
        else:
            print("❌ Password is incorrect")
            
        return True
    except CustomUser.DoesNotExist:
        print("❌ Master user not found")
        return False

def test_api_endpoint():
    print("\n=== Testing API Endpoint ===")
    
    # Test different URLs
    urls = [
        'http://localhost:8000/api/auth/login/',
        'http://127.0.0.1:8000/api/auth/login/',
        'http://72.60.218.167:8000/api/auth/login/'
    ]
    
    data = {
        'username': 'master',
        'password': 'master123'
    }
    
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    for url in urls:
        print(f"\nTesting: {url}")
        try:
            response = requests.post(
                url, 
                json=data, 
                headers=headers,
                timeout=10,
                allow_redirects=False
            )
            
            print(f"Status Code: {response.status_code}")
            print(f"Headers: {dict(response.headers)}")
            
            if response.status_code == 301:
                print(f"❌ Redirect to: {response.headers.get('Location')}")
            elif response.status_code == 200:
                print("✅ Success!")
                print(f"Response: {response.json()}")
            else:
                print(f"❌ Error: {response.text}")
                
        except Exception as e:
            print(f"❌ Connection error: {e}")

def test_direct_django():
    print("\n=== Testing Django Authentication ===")
    from django.contrib.auth import authenticate
    
    user = authenticate(username='master', password='master123')
    if user:
        print("✅ Django authentication successful")
        print(f"   User: {user.username}")
        print(f"   Active: {user.is_active}")
    else:
        print("❌ Django authentication failed")

def check_settings():
    print("\n=== Checking Django Settings ===")
    from django.conf import settings
    print(f"DEBUG: {settings.DEBUG}")
    print(f"SECURE_SSL_REDIRECT: {settings.SECURE_SSL_REDIRECT}")
    print(f"ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}")
    print(f"CORS_ALLOWED_ORIGINS: {getattr(settings, 'CORS_ALLOWED_ORIGINS', 'Not set')}")

if __name__ == '__main__':
    check_settings()
    test_user_exists()
    test_api_endpoint()
    test_direct_django()