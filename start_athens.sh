#!/bin/bash

# Athens EHS Management System Startup Script
echo "🚀 Starting Athens EHS Management System..."

# Kill existing processes
echo "🔄 Stopping existing processes..."
sudo pkill -f "manage.py runserver" 2>/dev/null
sudo pkill -f "vite" 2>/dev/null
sleep 2

# Start Backend (Django)
echo "🔧 Starting Backend on port 8001..."
cd /var/www/athens/backend
source venv/bin/activate
nohup python manage.py runserver 0.0.0.0:8001 > /tmp/athens_backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start Frontend (Vite)
echo "🎨 Starting Frontend on port 5173..."
cd /var/www/athens/frontend
nohup npm run dev > /tmp/athens_frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 3

echo "✅ Athens EHS System Started Successfully!"
echo ""
echo "📊 Access Points:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8001"
echo ""
echo "🔐 Login Credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f /tmp/athens_backend.log"
echo "   Frontend: tail -f /tmp/athens_frontend.log"
echo ""
echo "🛑 To stop: sudo pkill -f 'manage.py runserver' && sudo pkill -f 'vite'"