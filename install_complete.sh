#!/bin/bash

echo "Installing Complete Dependencies"
echo "==============================="

# Go to backend directory
cd backend

# Install all dependencies in virtual environment
echo "Installing Python dependencies..."
pip install django==5.2.1
pip install djangorestframework==3.16.0
pip install django-cors-headers==4.7.0
pip install djangorestframework-simplejwt==5.5.0
pip install python-dotenv==1.1.0
pip install pillow==11.2.1
pip install channels==4.2.2
pip install redis==5.0.1
pip install celery==5.3.6
pip install numpy==1.26.4
pip install opencv-python==4.8.1.78
pip install face-recognition==1.3.0
pip install psycopg2-binary==2.9.10
pip install reportlab==4.0.4
pip install requests==2.31.0
pip install pandas==2.2.0

echo "Running migrations..."
python3 manage.py makemigrations
python3 manage.py migrate

echo "✓ Backend setup complete!"
echo ""
echo "To run:"
echo "Backend: python3 manage.py runserver"
echo "Frontend: cd ../frontedn && npm run dev"