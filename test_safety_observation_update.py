#!/usr/bin/env python3

import requests
import json

# Test the Safety Observation update API
def test_safety_observation_update():
    base_url = "https://prozeal.athenas.co.in"
    observation_id = "SO-20251222-184201"
    
    # Test data for update
    test_data = {
        'date': '2024-12-22',
        'time': '18:42:01',
        'reportedBy': 'Joel (Admin User)',
        'department': 'Electrical',
        'workLocation': 'Updated Test Location',
        'activityPerforming': 'Updated Test Activity',
        'contractorName': '',
        'typeOfObservation': 'unsafe_act',
        'classification': '["electrical"]',
        'safetyObservationFound': 'Updated test observation',
        'severity': '2',
        'likelihood': '2',
        'correctivePreventiveAction': 'Updated test action',
        'correctiveActionAssignedTo': 'joel',
        'observationStatus': 'open',
        'remarks': 'Updated remarks'
    }
    
    print(f"Testing PUT request to: {base_url}/api/v1/safetyobservation/{observation_id}/")
    print(f"Data: {json.dumps(test_data, indent=2)}")
    
    # Note: This is just a test script to show the expected format
    # In real usage, you would need proper authentication headers
    print("\nThis script shows the expected data format for the PUT request.")
    print("The actual request should be made from the frontend with proper authentication.")

if __name__ == "__main__":
    test_safety_observation_update()