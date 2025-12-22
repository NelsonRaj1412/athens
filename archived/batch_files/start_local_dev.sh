#!/bin/bash
set -e

# ============================================================================
# EHS Management System - Local Development Startup Script
# ============================================================================
# This script starts the backend and frontend for local development
#

echo "🚀 Starting EHS Management System - Local Development"
echo "======================================================"

# Check if PostgreSQL is running
echo "🔍 Checking PostgreSQL connection..."
if ! pg_isready -h localhost -p 5432 -U postgres > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running or not accessible"
    echo "Please start PostgreSQL service:"
    echo "  sudo systemctl start postgresql"
    echo "  or"
    echo "  sudo service postgresql start"
    exit 1
fi
echo "✅ PostgreSQL is running"

# Navigate to backend directory
cd backend

# Activate virtual environment
echo "🔧 Activating Python virtual environment..."
source venv/bin/activate

# Check if migrations are needed
echo "🔍 Checking for pending migrations..."
python manage.py makemigrations --check --dry-run > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "📝 Creating new migrations..."
    python manage.py makemigrations
fi

# Apply migrations
echo "📊 Applying database migrations..."
python manage.py migrate

# Check Django configuration
echo "🔍 Running Django system check..."
python manage.py check

echo ""
echo "✅ Backend setup complete!"
echo ""
echo "🌐 Starting servers..."
echo "Backend will run on: http://localhost:8000"
echo "Frontend will run on: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop the servers"
echo ""

# Start backend server with WebSocket support
echo "🔧 Starting Django backend server with WebSocket support..."
uvicorn backend.asgi:application --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Navigate to frontend directory
cd ../frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Start frontend server
echo "🔧 Starting React frontend server..."
npm run dev &
FRONTEND_PID=$!

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Servers stopped"
    exit 0
}

# Set trap to cleanup on Ctrl+C
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
