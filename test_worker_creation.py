#!/usr/bin/env python3

import requests
import json
from datetime import datetime

# Test worker creation API
def test_worker_creation():
    # First, let's test authentication
    login_url = "https://prozeal.athenas.co.in/authentication/login/"
    worker_url = "https://prozeal.athenas.co.in/worker/"
    
    # Test data for worker creation
    worker_data = {
        "name": "Test",
        "surname": "Worker", 
        "father_or_spouse_name": "Test Father",
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
        "present_address": "Test Address",
        "permanent_address": "Test Address",
        "aadhaar": "123456789012",
        "mark_of_identification": "Test Mark",
        "status": "active",
        "employment_status": "initiated"
    }
    
    print("Testing worker creation API...")
    print(f"URL: {worker_url}")
    print(f"Data: {json.dumps(worker_data, indent=2)}")
    
    # Test without authentication first
    response = requests.post(worker_url, json=worker_data)
    print(f"\nResponse Status: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print(f"Response Body: {response.text}")
    
    if response.status_code == 401:
        print("\n✓ Authentication required (expected)")
        return True
    elif response.status_code == 400:
        print(f"\n✗ Bad Request Error: {response.text}")
        return False
    else:
        print(f"\n? Unexpected status code: {response.status_code}")
        return False

if __name__ == "__main__":
    test_worker_creation()