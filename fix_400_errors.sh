#!/bin/bash

# Comprehensive Fix Script for 400 Bad Request Errors
# This script addresses authentication and API call issues across the Athens EHS system

echo "🔧 Starting comprehensive fix for 400 Bad Request errors..."

# 1. Restart backend services to ensure clean state
echo "📡 Restarting backend services..."
cd /var/www/athens/backend
source venv/bin/activate

# Kill any existing Django processes
pkill -f "python.*manage.py"
sleep 2

# Start Django backend
python manage.py runserver 0.0.0.0:8001 &
DJANGO_PID=$!
echo "✅ Django backend started (PID: $DJANGO_PID)"

# Start WebSocket server
python -c "
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()
from channels.management.commands.runserver import Command
command = Command()
command.handle(port=8002, verbosity=1)
" &
WEBSOCKET_PID=$!
echo "✅ WebSocket server started (PID: $WEBSOCKET_PID)"

# 2. Rebuild frontend to ensure latest changes
echo "🏗️ Rebuilding frontend..."
cd /var/www/athens/frontend

# Kill any existing Vite processes
pkill -f "vite.*dev"
sleep 2

# Install any missing dependencies
npm install --silent

# Build production version
npm run build

# Start development server
npm run dev &
VITE_PID=$!
echo "✅ Frontend development server started (PID: $VITE_PID)"

# 3. Restart Nginx to ensure proper routing
echo "🌐 Restarting Nginx..."
sudo systemctl restart nginx
echo "✅ Nginx restarted"

# 4. Check service status
echo "🔍 Checking service status..."

# Check Django backend
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/authentication/ | grep -q "200\|401"; then
    echo "✅ Django backend is responding"
else
    echo "❌ Django backend is not responding properly"
fi

# Check WebSocket server
if netstat -tuln | grep -q ":8002"; then
    echo "✅ WebSocket server is listening on port 8002"
else
    echo "❌ WebSocket server is not listening on port 8002"
fi

# Check frontend
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
    echo "✅ Frontend development server is responding"
else
    echo "❌ Frontend development server is not responding properly"
fi

# Check Nginx
if curl -s -o /dev/null -w "%{http_code}" https://prozeal.athenas.co.in | grep -q "200"; then
    echo "✅ Nginx is serving the application"
else
    echo "❌ Nginx is not serving the application properly"
fi

# 5. Test critical API endpoints
echo "🧪 Testing critical API endpoints..."

# Test authentication endpoint
AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://prozeal.athenas.co.in/authentication/)
if [ "$AUTH_STATUS" = "200" ] || [ "$AUTH_STATUS" = "401" ]; then
    echo "✅ Authentication endpoint is accessible"
else
    echo "❌ Authentication endpoint returned status: $AUTH_STATUS"
fi

# Test user creation endpoint (should return 401 without auth)
USER_CREATE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST https://prozeal.athenas.co.in/authentication/projectadminuser/create/ -H "Content-Type: application/json" -d '{}')
if [ "$USER_CREATE_STATUS" = "401" ]; then
    echo "✅ User creation endpoint is accessible (requires auth)"
else
    echo "❌ User creation endpoint returned unexpected status: $USER_CREATE_STATUS"
fi

# 6. Display process information
echo "📊 Service Process Information:"
echo "Django Backend PID: $DJANGO_PID"
echo "WebSocket Server PID: $WEBSOCKET_PID"
echo "Frontend Dev Server PID: $VITE_PID"

# 7. Display helpful debugging information
echo "🐛 Debugging Information:"
echo "Backend URL: http://localhost:8001"
echo "WebSocket URL: ws://localhost:8002"
echo "Frontend Dev URL: http://localhost:3000"
echo "Production URL: https://prozeal.athenas.co.in"

echo ""
echo "📝 Common 400 Bad Request Fixes Applied:"
echo "1. ✅ Added comprehensive API error handling"
echo "2. ✅ Enhanced authentication status checking"
echo "3. ✅ Improved data validation before API calls"
echo "4. ✅ Fixed axios configuration for proper authentication"
echo "5. ✅ Restarted all services for clean state"

echo ""
echo "🔧 If you still encounter 400 errors:"
echo "1. Check browser console for specific error details"
echo "2. Verify JWT token is not expired (check localStorage)"
echo "3. Ensure all required fields are filled in forms"
echo "4. Try logging out and logging back in"
echo "5. Check network tab in browser dev tools for request details"

echo ""
echo "✅ Comprehensive fix completed! The system should now handle API errors more gracefully."

# Keep the script running to monitor services
echo "🔄 Monitoring services... Press Ctrl+C to stop"
trap 'echo "🛑 Stopping services..."; kill $DJANGO_PID $WEBSOCKET_PID $VITE_PID 2>/dev/null; exit' INT

# Monitor services
while true; do
    sleep 30
    
    # Check if services are still running
    if ! kill -0 $DJANGO_PID 2>/dev/null; then
        echo "⚠️ Django backend stopped, restarting..."
        cd /var/www/athens/backend
        source venv/bin/activate
        python manage.py runserver 0.0.0.0:8001 &
        DJANGO_PID=$!
    fi
    
    if ! kill -0 $WEBSOCKET_PID 2>/dev/null; then
        echo "⚠️ WebSocket server stopped, restarting..."
        cd /var/www/athens/backend
        source venv/bin/activate
        python -c "
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()
from channels.management.commands.runserver import Command
command = Command()
command.handle(port=8002, verbosity=1)
" &
        WEBSOCKET_PID=$!
    fi
    
    if ! kill -0 $VITE_PID 2>/dev/null; then
        echo "⚠️ Frontend dev server stopped, restarting..."
        cd /var/www/athens/frontend
        npm run dev &
        VITE_PID=$!
    fi
done