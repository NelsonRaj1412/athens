#!/usr/bin/env python3
"""
WebSocket Chat Test Script
Tests the complete chat message delivery flow including WebSocket connections
"""

import asyncio
import websockets
import json
import requests
import sys
import os

# Configuration
BASE_URL = "https://prozeal.athenas.co.in"
WS_URL = "wss://prozeal.athenas.co.in/ws/notifications/"

def get_auth_token():
    """Get authentication token for testing"""
    try:
        # Login to get token
        login_data = {
            "username": "test",  # Replace with actual test user
            "password": "test123"  # Replace with actual password
        }
        
        response = requests.post(f"{BASE_URL}/api/v1/auth/login/", json=login_data)
        if response.status_code == 200:
            return response.json().get('access')
        else:
            print(f"Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Login error: {e}")
        return None

async def test_websocket_connection(token):
    """Test WebSocket connection and message reception"""
    try:
        # Connect to WebSocket with token
        uri = f"{WS_URL}?token={token}"
        
        print("Connecting to WebSocket...")
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket connected successfully")
            
            # Wait for connection confirmation
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(message)
                print(f"✅ Connection confirmed: {data.get('message', 'Connected')}")
            except asyncio.TimeoutError:
                print("⚠️ No connection confirmation received")
            
            # Listen for messages for 30 seconds
            print("Listening for messages for 30 seconds...")
            try:
                while True:
                    message = await asyncio.wait_for(websocket.recv(), timeout=30.0)
                    data = json.loads(message)
                    
                    if data.get('type') == 'notification':
                        notification = data.get('notification', {})
                        print(f"📨 Received notification: {notification.get('title', 'No title')}")
                        print(f"   Message: {notification.get('message', 'No message')}")
                        print(f"   Type: {notification.get('notification_type', 'unknown')}")
                        
                    elif data.get('type') == 'chat_status_update':
                        status_data = data.get('data', {})
                        print(f"💬 Chat status update: {status_data.get('status', 'unknown')}")
                        
                    else:
                        print(f"📩 Other message: {data.get('type', 'unknown')} - {message[:100]}...")
                        
            except asyncio.TimeoutError:
                print("⏰ Timeout reached, no more messages")
                
    except Exception as e:
        print(f"❌ WebSocket error: {e}")

def send_test_message(token, receiver_id=2):
    """Send a test chat message"""
    try:
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        message_data = {
            'userId': receiver_id,
            'content': 'Test message from WebSocket test script'
        }
        
        print(f"Sending test message to user {receiver_id}...")
        response = requests.post(
            f"{BASE_URL}/api/v1/chatbox/messages/",
            json=message_data,
            headers=headers
        )
        
        if response.status_code == 201:
            result = response.json()
            print(f"✅ Message sent successfully: ID {result.get('id')}")
            print(f"   Notification status: {result.get('notification_status', 'unknown')}")
            return True
        else:
            print(f"❌ Message send failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Message send error: {e}")
        return False

async def main():
    """Main test function"""
    print("=== WebSocket Chat Test ===")
    print("Testing chat message delivery with Redis channel layer")
    print()
    
    # Get authentication token
    print("1. Getting authentication token...")
    token = get_auth_token()
    if not token:
        print("❌ Failed to get authentication token")
        return
    
    print(f"✅ Token obtained: {token[:20]}...")
    print()
    
    # Test WebSocket connection in background
    print("2. Testing WebSocket connection...")
    websocket_task = asyncio.create_task(test_websocket_connection(token))
    
    # Wait a moment for WebSocket to connect
    await asyncio.sleep(2)
    
    # Send test message
    print("3. Sending test message...")
    message_sent = send_test_message(token)
    
    if message_sent:
        print("✅ Test message sent, waiting for WebSocket delivery...")
        # Wait for WebSocket task to complete or timeout
        try:
            await asyncio.wait_for(websocket_task, timeout=35.0)
        except asyncio.TimeoutError:
            print("⏰ WebSocket test completed")
    else:
        print("❌ Test message failed, cancelling WebSocket test")
        websocket_task.cancel()
    
    print()
    print("=== Test Complete ===")
    print("If you received a notification above, the chat system is working correctly!")

if __name__ == "__main__":
    # Check if websockets is available
    try:
        import websockets
    except ImportError:
        print("❌ websockets library not installed. Install with: pip install websockets")
        sys.exit(1)
    
    # Run the test
    asyncio.run(main())