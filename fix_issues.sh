#!/bin/bash

echo "Fixing Backend and Frontend Issues"
echo "================================="

cd backend

# Run migrations
echo "Running migrations..."
python3 manage.py migrate --run-syncdb

# Create superuser
echo "Creating superuser..."
echo "from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@test.com', 'admin123')
    print('Superuser created: admin/admin123')
else:
    print('Superuser already exists')
" | python3 manage.py shell

echo "✅ Backend fixed!"
echo "Login: admin / admin123"