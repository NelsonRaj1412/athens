#!/bin/bash

# Athens EHS System Startup Script
# Ensures consistent port configuration and prevents mismatches

echo "🚀 Starting Athens EHS System..."

# Kill any existing processes
echo "Stopping existing processes..."
sudo pkill -f "python.*manage.py" 2>/dev/null
sudo pkill -f "vite" 2>/dev/null
sleep 2

# Start backend on port 8001 (matches nginx config)
echo "Starting backend on port 8001..."
sudo systemctl start athens-backend
sleep 3

# Verify backend is running
if curl -s http://localhost:8001 > /dev/null; then
    echo "✅ Backend running on port 8001"
else
    echo "❌ Backend failed to start"
    exit 1
fi

# Start frontend
echo "Starting frontend..."
cd /var/www/athens/frontend
npm run dev > /tmp/frontend.log 2>&1 &
sleep 3

echo "✅ Athens EHS System started successfully"
echo "Frontend: https://prozeal.athenas.co.in"
echo "Backend: Port 8001 (via nginx)"