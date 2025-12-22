#!/bin/bash
set -e

echo "Production Deployment Script for Hostinger KVM2"
echo "==============================================="

# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y python3 python3-pip python3-venv nginx postgresql postgresql-contrib redis-server git

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Create project directory
sudo mkdir -p /var/www/ehs-system
sudo chown $USER:$USER /var/www/ehs-system
cd /var/www/ehs-system

# Clone or upload project
# git clone <your-repo-url> .

# Backend setup
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn

# Frontend setup
cd ../frontend
npm install --production
npm run build

# PostgreSQL setup
sudo -u postgres psql << EOF
CREATE DATABASE ehs_production;
CREATE USER ehs_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE ehs_production TO ehs_user;
\q
EOF

# Create production environment file
cd ../backend
cat > .env.production << EOF
SECRET_KEY=your-super-secret-production-key-here
DEBUG=False
ALLOWED_HOSTS=your-domain.com,www.your-domain.com,your-server-ip
DB_ENGINE=postgresql
DB_NAME=ehs_production
DB_USER=ehs_user
DB_PASSWORD=secure_password_here
DB_HOST=localhost
DB_PORT=5432
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
CSRF_TRUSTED_ORIGINS=https://your-domain.com,https://www.your-domain.com
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
EOF

# Run migrations
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser

# Create Gunicorn service
sudo tee /etc/systemd/system/ehs-backend.service << EOF
[Unit]
Description=EHS System Backend
After=network.target

[Service]
User=$USER
Group=www-data
WorkingDirectory=/var/www/ehs-system/backend
Environment="PATH=/var/www/ehs-system/backend/venv/bin"
ExecStart=/var/www/ehs-system/backend/venv/bin/gunicorn --workers 3 --bind unix:/var/www/ehs-system/backend/ehs.sock backend.wsgi:application
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/ehs-system << EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Frontend
    location / {
        root /var/www/ehs-system/frontend/dist;
        try_files \$uri \$uri/ /index.html;
    }
    
    # Backend API
    location /api/ {
        include proxy_params;
        proxy_pass http://unix:/var/www/ehs-system/backend/ehs.sock;
    }
    
    # Admin
    location /admin/ {
        include proxy_params;
        proxy_pass http://unix:/var/www/ehs-system/backend/ehs.sock;
    }
    
    # Static files
    location /static/ {
        alias /var/www/ehs-system/backend/staticfiles/;
    }
    
    # Media files
    location /media/ {
        alias /var/www/ehs-system/backend/media/;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/ehs-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Start services
sudo systemctl daemon-reload
sudo systemctl enable ehs-backend
sudo systemctl start ehs-backend

# Install SSL certificate (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

echo "✅ Deployment completed!"
echo "Update the following:"
echo "1. Replace 'your-domain.com' with your actual domain"
echo "2. Replace 'secure_password_here' with a strong password"
echo "3. Replace 'your-super-secret-production-key-here' with a Django secret key"
echo "4. Upload your project files to /var/www/ehs-system/"