#!/usr/bin/env python3
"""
Test script to demonstrate logo transparency API usage
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"
USERNAME = "your_username"  # Replace with actual username
PASSWORD = "your_password"  # Replace with actual password

def login_and_get_token():
    """Login and get authentication token"""
    login_url = f"{BASE_URL}/authentication/login/"
    login_data = {
        "username": USERNAME,
        "password": PASSWORD
    }
    
    response = requests.post(login_url, json=login_data)
    if response.status_code == 200:
        return response.json().get('access_token')
    else:
        print(f"Login failed: {response.text}")
        return None

def regenerate_template_with_opacity(token, opacity_percent):
    """Regenerate signature template with custom opacity"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Convert percentage to decimal
    opacity = opacity_percent / 100.0
    
    # For user templates
    user_url = f"{BASE_URL}/authentication/signature/template/regenerate/"
    user_data = {"logo_opacity": opacity}
    
    print(f"Regenerating user template with {opacity_percent}% opacity...")
    response = requests.put(user_url, json=user_data, headers=headers)
    
    if response.status_code == 200:
        result = response.json()
        print(f"✓ User template regenerated successfully!")
        print(f"  Template URL: {result.get('template_url')}")
        print(f"  Logo Opacity: {result.get('logo_opacity', 'N/A')}")
    else:
        print(f"✗ Failed to regenerate user template: {response.text}")
    
    # For admin templates
    admin_url = f"{BASE_URL}/authentication/admin/signature/template/regenerate/"
    
    print(f"Regenerating admin template with {opacity_percent}% opacity...")
    response = requests.put(admin_url, json=user_data, headers=headers)
    
    if response.status_code == 200:
        result = response.json()
        print(f"✓ Admin template regenerated successfully!")
        print(f"  Template URL: {result.get('template_url')}")
        print(f"  Logo Opacity: {result.get('logo_opacity', 'N/A')}")
    else:
        print(f"✗ Failed to regenerate admin template: {response.text}")

def main():
    print("Digital Signature Template Logo Transparency Test")
    print("=" * 50)
    
    # Get authentication token
    token = login_and_get_token()
    if not token:
        return
    
    print("✓ Successfully authenticated")
    
    # Test different opacity levels
    opacity_levels = [25, 50, 75, 100]  # 25%, 50%, 75%, 100%
    
    for opacity in opacity_levels:
        print(f"\n--- Testing {opacity}% opacity ---")
        regenerate_template_with_opacity(token, opacity)
        
        input(f"Press Enter to continue to next opacity level...")

if __name__ == "__main__":
    main()