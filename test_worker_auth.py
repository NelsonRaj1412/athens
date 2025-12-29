#!/usr/bin/env python3

import requests
import json
from datetime import datetime

def test_worker_creation_with_auth():
    """Test worker creation with proper authentication"""
    
    base_url = "https://prozeal.athenas.co.in"
    login_url = f"{base_url}/authentication/login/"
    worker_url = f"{base_url}/worker/"
    
    # Test credentials (you'll need to provide valid ones)
    login_data = {
        "username": "admin",  # Replace with actual username
        "password": "admin123"  # Replace with actual password
    }
    
    print("Step 1: Testing login...")
    login_response = requests.post(login_url, json=login_data)
    print(f"Login Status: {login_response.status_code}")
    
    if login_response.status_code != 200:
        print(f"Login failed: {login_response.text}")
        return False
    
    login_result = login_response.json()
    access_token = login_result.get('access')
    
    if not access_token:
        print("No access token received")
        return False
    
    print("✓ Login successful")
    
    # Test worker creation with minimal required fields
    worker_data = {
        "name": "TestWorker",
        "surname": "TestSurname", 
        "father_or_spouse_name": "TestFather",
        "date_of_birth": "1990-01-01",
        "gender": "Male",
        "nationality": "Indian",
        "education_level": "High School Diploma / Equivalent",
        "date_of_joining": "2024-01-01",
        "designation": "Production Manager",
        "category": "Skilled",
        "employment_type": "temporary",
        "department": "Production / Manufacturing",
        "phone_number": "9876543210",
        "present_address": "Test Present Address",
        "permanent_address": "Test Permanent Address",
        "aadhaar": "123456789012",
        "mark_of_identification": "Test Mark",
        "status": "active",
        "employment_status": "initiated"
    }
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    print("\nStep 2: Testing worker creation...")
    print(f"URL: {worker_url}")
    print(f"Headers: {headers}")
    print(f"Data: {json.dumps(worker_data, indent=2)}")
    
    response = requests.post(worker_url, json=worker_data, headers=headers)
    print(f"\nResponse Status: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print(f"Response Body: {response.text}")
    
    if response.status_code == 201:
        print("✓ Worker created successfully!")
        return True
    elif response.status_code == 400:
        print("✗ Bad Request - Validation Error")
        try:
            error_data = response.json()
            print("Validation errors:")
            for field, errors in error_data.items():
                if isinstance(errors, list):
                    print(f"  {field}: {', '.join(errors)}")
                else:
                    print(f"  {field}: {errors}")
        except:
            print(f"Raw error: {response.text}")
        return False
    else:
        print(f"✗ Unexpected error: {response.status_code}")
        return False

if __name__ == "__main__":
    test_worker_creation_with_auth()