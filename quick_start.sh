#!/bin/bash

echo "Quick Start - EHS System"
echo "======================="

# Install minimal backend dependencies
echo "Installing minimal backend dependencies..."
cd backend
python3 -m pip install --user -r minimal_requirements.txt

# Run migrations
echo "Running database migrations..."
python3 manage.py makemigrations
python3 manage.py migrate

# Create superuser (optional)
echo "To create admin user later, run: python3 manage.py createsuperuser"

# Start backend
echo "Starting backend server..."
echo "Backend will run on: http://localhost:8000"
python3 manage.py runserver &

# Start frontend
echo "Starting frontend..."
cd ../frontedn
npm run dev &

echo ""
echo "✓ Both servers started!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"
wait