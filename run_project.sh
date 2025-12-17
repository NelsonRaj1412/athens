#!/bin/bash

echo "Quick Project Runner"
echo "==================="

# Check if backend dependencies exist
if [ ! -d "backend/venv" ]; then
    echo "Backend virtual environment not found. Setting up..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install django djangorestframework django-cors-headers channels redis pillow
    cd ..
    echo "✓ Basic backend setup complete"
else
    echo "✓ Backend environment exists"
fi

# Check if frontend dependencies exist
if [ ! -d "frontedn/node_modules" ]; then
    echo "Frontend dependencies not found. Installing..."
    cd frontedn
    npm install --legacy-peer-deps
    cd ..
    echo "✓ Frontend setup complete"
else
    echo "✓ Frontend dependencies exist"
fi

echo ""
echo "Ready to run! Open two terminals:"
echo "Terminal 1 (Backend): cd backend && source venv/bin/activate && python3 manage.py runserver"
echo "Terminal 2 (Frontend): cd frontedn && npm run dev"