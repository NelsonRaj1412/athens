#!/bin/bash
set -e

# Production Deployment Script for Athens EHS System
# Run this script on your production server after git pull

echo "🚀 Starting Athens EHS Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Environment variables with defaults
DB_USER_PASSWORD=${DB_USER_PASSWORD:-strongpassword123}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-admin123}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (sudo ./deploy-production.sh)"
    exit 1
fi

# Step 1: Setup Backend Environment
print_status "Step 1: Setting up backend environment..."
cd /var/www/athens/backend

# Copy production environment file
if [ -f ".env.production" ]; then
    cp .env.production .env
    print_status "Backend .env configured for production"
else
    print_error ".env.production file not found!"
    exit 1
fi

# Step 2: Setup PostgreSQL Database
print_status "Step 2: Setting up PostgreSQL database..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    print_warning "PostgreSQL not found. Installing..."
    apt update
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
fi

# Create database and user
sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname = 'athens_db';" | grep -q 1 || {
    print_status "Creating database athens_db..."
    sudo -u postgres psql -c "CREATE DATABASE athens_db;"
}

sudo -u postgres psql -c "SELECT 1 FROM pg_user WHERE usename = 'athens_user';" | grep -q 1 || {
    print_status "Creating user athens_user..."
    sudo -u postgres psql -c "CREATE USER athens_user WITH PASSWORD '$DB_USER_PASSWORD';"
}

# Grant privileges
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE athens_db TO athens_user;"
sudo -u postgres psql -c "ALTER USER athens_user CREATEDB;"

print_status "PostgreSQL database setup complete"

# Step 3: Backend Dependencies and Migrations
print_status "Step 3: Installing backend dependencies..."

# Activate virtual environment
source venv/bin/activate

# Install/upgrade dependencies
pip install -r requirements.txt --upgrade

# Apply migrations
print_status "Applying database migrations..."
python manage.py makemigrations
python manage.py migrate

# Collect static files
print_status "Collecting static files..."
python manage.py collectstatic --noinput

# Create superuser if it doesn't exist
print_status "Creating admin user..."
python manage.py shell -c "
from authentication.models import CustomUser
if not CustomUser.objects.filter(username='admin').exists():
    CustomUser.objects.create_superuser('admin', 'admin@example.com', '$ADMIN_PASSWORD')
    print('Admin user created: admin/[HIDDEN]')
else:
    print('Admin user already exists')
"

# Step 4: Setup Frontend
print_status "Step 4: Setting up frontend..."
cd /var/www/athens/frontend

# Copy production environment file
if [ -f ".env.production" ]; then
    cp .env.production .env
    print_status "Frontend .env configured for production"
else
    print_error "Frontend .env.production file not found!"
fi

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    print_warning "Node.js not found. Installing..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Install dependencies and build
print_status "Installing frontend dependencies..."
npm install

print_status "Building frontend for production..."
npm run build

# Step 5: Setup Nginx (if not already configured)
print_status "Step 5: Configuring Nginx..."

if ! command -v nginx &> /dev/null; then
    print_warning "Nginx not found. Installing..."
    apt update
    apt install -y nginx
fi

# Create Nginx configuration
cat > /etc/nginx/sites-available/athens << 'EOF'
server {
    listen 80;
    server_name 72.60.218.167 your-domain.com;

    # Frontend
    location / {
        root /var/www/athens/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend Authentication
    location /authentication/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend Admin
    location /admin/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend Static Files
    location /static/ {
        alias /var/www/athens/backend/staticfiles/;
    }

    # Backend Media Files
    location /media/ {
        alias /var/www/athens/backend/media/;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/athens /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t && systemctl reload nginx

print_status "Nginx configured and reloaded"

# Step 6: Setup Systemd Service for Backend
print_status "Step 6: Setting up systemd service..."

cat > /etc/systemd/system/athens-backend.service << 'EOF'
[Unit]
Description=Athens EHS Backend
After=network.target

[Service]
Type=exec
User=www-data
Group=www-data
WorkingDirectory=/var/www/athens/backend
Environment=PATH=/var/www/athens/backend/venv/bin
ExecStart=/var/www/athens/backend/venv/bin/uvicorn backend.asgi:application --host 127.0.0.1 --port 8001
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# Set permissions
chown -R www-data:www-data /var/www/athens
chmod +x /var/www/athens/backend/venv/bin/uvicorn

# Enable and start the service
systemctl daemon-reload
systemctl enable athens-backend
systemctl restart athens-backend

print_status "Backend service configured and started"

# Step 7: Final Status Check
print_status "Step 7: Checking deployment status..."

# Check backend service
if systemctl is-active --quiet athens-backend; then
    print_status "Backend service is running"
else
    print_error "Backend service failed to start"
    systemctl status athens-backend
fi

# Check Nginx
if systemctl is-active --quiet nginx; then
    print_status "Nginx is running"
else
    print_error "Nginx failed to start"
fi

# Check database connection
cd /var/www/athens/backend
source venv/bin/activate
python -c "
import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()
from django.db import connection
try:
    connection.ensure_connection()
    print('✅ Database connection successful')
except Exception as e:
    print(f'❌ Database connection failed: {e}')
"

print_status "🎉 Athens EHS Production Deployment Complete!"
echo ""
echo "📋 Access Information:"
echo "   Frontend: http://72.60.218.167"
echo "   Backend Admin: http://72.60.218.167/admin/"
echo "   Login: admin / admin123"
echo ""
echo "🔧 Service Management:"
echo "   Backend: systemctl status athens-backend"
echo "   Nginx: systemctl status nginx"
echo "   Logs: journalctl -u athens-backend -f"
echo ""
print_warning "Remember to:"
print_warning "1. Update your domain name in .env files"
print_warning "2. Setup SSL certificates for HTTPS"
print_warning "3. Change default passwords"
print_warning "4. Configure firewall rules"