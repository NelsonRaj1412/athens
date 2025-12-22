#!/bin/bash

echo "Fixing Backend and Frontend Issues"
echo "================================="

cd backend

# Run migrations
echo "Running migrations..."
python3 manage.py migrate --run-syncdb

# Create superuser
echo "Creating superuser..."
echo "import os
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@test.com', os.environ['ADMIN_PASSWORD'])
    print('Superuser created: admin / [password from ADMIN_PASSWORD env var]')
else:
    print('Superuser already exists')
" | python3 manage.py shell

echo "✅ Backend fixed!"
echo "Login: admin / [password from ADMIN_PASSWORD env var]"