#!/bin/bash

# HTTPS Configuration Setup Script
# Purpose: Configure frontend for HTTPS and ensure backend connectivity
# Usage: ./setup_https_config.sh [domain]

set -e

DOMAIN=${1:-"prozeal.athenas.co.in"}
BACKEND_PORT=${2:-8000}
FRONTEND_DIR="/var/www/athens/frontend"
BACKEND_DIR="/var/www/athens/backend"

echo "=========================================="
echo "HTTPS Configuration Setup"
echo "Domain: $DOMAIN"
echo "Backend Port: $BACKEND_PORT"
echo "=========================================="

# Step 1: Update Frontend Environment
echo "[1/6] Updating frontend environment files..."
cat > "$FRONTEND_DIR/.env.production" <<EOF
# Production API Configuration
VITE_API_BASE_URL=https://$DOMAIN
VITE_BACKEND_URL=https://$DOMAIN
VITE_API_TIMEOUT=30000
VITE_API_PROXY_TARGET=https://$DOMAIN
VITE_API_PROXY_SECURE=true

# WebSocket Configuration
VITE_WS_URL=wss://$DOMAIN

# Production settings
VITE_NODE_ENV=production
VITE_PORT=3000
VITE_HOST=0.0.0.0
EOF

cat > "$FRONTEND_DIR/.env" <<EOF
# Production API Configuration
VITE_API_BASE_URL=https://$DOMAIN
VITE_BACKEND_URL=https://$DOMAIN
VITE_API_TIMEOUT=30000
VITE_API_PROXY_TARGET=https://$DOMAIN
VITE_API_PROXY_SECURE=true

# WebSocket Configuration
VITE_WS_URL=wss://$DOMAIN

# Production settings
VITE_NODE_ENV=production
VITE_PORT=3000
VITE_HOST=0.0.0.0
EOF

echo "✓ Environment files updated"

# Step 2: Verify Nginx Configuration
echo "[2/6] Checking Nginx configuration..."
NGINX_CONFIG="/etc/nginx/sites-available/prozeal"

if [ ! -f "$NGINX_CONFIG" ]; then
    echo "⚠ Nginx config not found. Creating..."
    cat > "$NGINX_CONFIG" <<'NGINXEOF'
server {
    listen 80;
    server_name prozeal.athenas.co.in;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name prozeal.athenas.co.in;

    ssl_certificate /etc/letsencrypt/live/prozeal.athenas.co.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/prozeal.athenas.co.in/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        root /var/www/athens/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location ~ ^/(authentication|admin|media)/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
NGINXEOF
    ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/prozeal
fi

echo "✓ Nginx configuration verified"

# Step 3: Test Nginx Configuration
echo "[3/6] Testing Nginx configuration..."
nginx -t
echo "✓ Nginx configuration valid"

# Step 4: Stop Existing Services
echo "[4/6] Stopping existing services..."
pkill -f "vite" || true
pkill -f "python.*manage.py.*runserver" || true
sleep 2
echo "✓ Services stopped"

# Step 5: Start Backend
echo "[5/6] Starting backend on port $BACKEND_PORT..."
cd "$BACKEND_DIR"
source venv/bin/activate
nohup python manage.py runserver 0.0.0.0:$BACKEND_PORT > /tmp/django.log 2>&1 &
BACKEND_PID=$!
sleep 3

if ps -p $BACKEND_PID > /dev/null; then
    echo "✓ Backend started (PID: $BACKEND_PID)"
else
    echo "✗ Backend failed to start. Check /tmp/django.log"
    exit 1
fi

# Step 6: Build and Start Frontend
echo "[6/6] Building and starting frontend..."
cd "$FRONTEND_DIR"
npm run build

nohup npm run dev > /tmp/vite.log 2>&1 &
FRONTEND_PID=$!
sleep 3

if ps -p $FRONTEND_PID > /dev/null; then
    echo "✓ Frontend started (PID: $FRONTEND_PID)"
else
    echo "✗ Frontend failed to start. Check /tmp/vite.log"
    exit 1
fi

# Reload Nginx
echo "Reloading Nginx..."
systemctl reload nginx
echo "✓ Nginx reloaded"

# Verification
echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo "Backend PID: $BACKEND_PID (Port: $BACKEND_PORT)"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Verification Commands:"
echo "  Backend:  curl -I http://localhost:$BACKEND_PORT/admin/"
echo "  Frontend: curl -I https://$DOMAIN/"
echo "  Logs:     tail -f /tmp/django.log /tmp/vite.log"
echo ""
echo "Process Status:"
ps aux | grep -E "(vite|python.*manage)" | grep -v grep
echo ""
echo "Port Status:"
netstat -tlnp | grep -E ":(80|443|$BACKEND_PORT|8001)"
echo "=========================================="
