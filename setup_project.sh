#!/bin/bash

echo "Setting up project dependencies..."
echo "================================="

# Setup backend
echo "Setting up backend..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt --break-system-packages
cd ..
echo "✓ Backend setup complete"

# Setup frontend
echo "Setting up frontend..."
cd frontedn
npm install --legacy-peer-deps
cd ..
echo "✓ Frontend setup complete"

echo ""
echo "Setup completed!"
echo "To run the project:"
echo "  Backend: cd backend && source venv/bin/activate && python3 manage.py runserver"
echo "  Frontend: cd frontedn && npm run dev"