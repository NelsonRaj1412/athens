#!/bin/bash

echo "Installing ALL Dependencies"
echo "=========================="

cd backend

# Core Django dependencies
pip install asgiref==3.8.1
pip install channels==4.2.2
pip install channels-redis==4.1.0
pip install Django==5.2.1
pip install django-cors-headers==4.7.0
pip install django-filter==25.1
pip install djangorestframework==3.16.0
pip install djangorestframework_simplejwt==5.5.0
pip install python-dotenv==1.1.0
pip install redis==5.0.1
pip install sqlparse==0.5.3
pip install websockets==12.0
pip install reportlab==4.0.4

# Core Python libraries
pip install numpy==1.26.4
pip install opencv-python==4.8.1.78
pip install face-recognition==1.3.0
pip install Pillow==11.2.1
pip install psycopg2-binary==2.9.10
pip install requests==2.31.0
pip install pandas==2.2.0

# AI/ML Libraries
pip install openai==1.12.0
pip install anthropic==0.18.1
pip install sentence-transformers==2.3.1
pip install tiktoken==0.6.0
pip install transformers==4.37.2
pip install torch==2.4.0
pip install scikit-learn==1.4.0
pip install scipy
pip install nltk
pip install huggingface-hub

# Vector database
pip install pgvector==0.2.5

# Task queue
pip install celery==5.3.6

# Language processing
pip install spacy==3.7.2
pip install langchain==0.1.10
pip install langchain-openai==0.0.8
pip install chromadb==0.4.22

# Audio processing
pip install speechrecognition==3.10.1
pip install pydub==0.25.1
pip install gtts==2.5.1

# Server
pip install uvicorn[standard]

echo "✓ All dependencies installed!"
echo "Running migrations..."
python3 manage.py makemigrations
python3 manage.py migrate

echo "✓ Setup complete!"