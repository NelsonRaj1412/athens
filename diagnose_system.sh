#!/bin/bash

# Quick Diagnostic Script for Athens EHS System
# Usage: ./diagnose_system.sh

echo "=========================================="
echo "Athens EHS System Diagnostic Report"
echo "Generated: $(date)"
echo "=========================================="

# Check System Resources
echo ""
echo "=== SYSTEM RESOURCES ==="
echo "Disk Usage:"
df -h | grep -E "(/$|/var)"
echo ""
echo "Memory Usage:"
free -h
echo ""
echo "Load Average:"
uptime

# Check Process Status
echo ""
echo "=== PROCESS STATUS ==="
echo "Frontend (Vite):"
if pgrep -f "vite" > /dev/null; then
    echo "✓ Running (PID: $(pgrep -f vite))"
    ps aux | grep vite | grep -v grep | head -1
else
    echo "✗ Not running"
fi

echo ""
echo "Backend (Django):"
if pgrep -f "python.*manage.py.*runserver" > /dev/null; then
    echo "✓ Running (PID: $(pgrep -f 'python.*manage.py.*runserver'))"
    ps aux | grep "python.*manage.py.*runserver" | grep -v grep | head -1
else
    echo "✗ Not running"
fi

echo ""
echo "Nginx:"
if systemctl is-active nginx > /dev/null 2>&1; then
    echo "✓ Running"
    systemctl status nginx --no-pager -l | head -3
else
    echo "✗ Not running"
fi

# Check Port Status
echo ""
echo "=== PORT STATUS ==="
echo "Port 80 (HTTP):"
if netstat -tlnp | grep :80 > /dev/null; then
    echo "✓ Listening"
    netstat -tlnp | grep :80
else
    echo "✗ Not listening"
fi

echo ""
echo "Port 443 (HTTPS):"
if netstat -tlnp | grep :443 > /dev/null; then
    echo "✓ Listening"
    netstat -tlnp | grep :443
else
    echo "✗ Not listening"
fi

echo ""
echo "Port 8000 (Backend):"
if netstat -tlnp | grep :8000 > /dev/null; then
    echo "✓ Listening"
    netstat -tlnp | grep :8000
else
    echo "✗ Not listening"
fi

# Check Configuration
echo ""
echo "=== CONFIGURATION STATUS ==="
echo "Frontend Environment:"
if [ -f "/var/www/athens/frontend/.env.production" ]; then
    echo "✓ .env.production exists"
    grep -E "(API_BASE_URL|BACKEND_URL)" /var/www/athens/frontend/.env.production
else
    echo "✗ .env.production missing"
fi

echo ""
echo "Nginx Configuration:"
if [ -f "/etc/nginx/sites-available/prozeal" ]; then
    echo "✓ Nginx config exists"
    if nginx -t 2>/dev/null; then
        echo "✓ Nginx config valid"
    else
        echo "✗ Nginx config invalid"
    fi
else
    echo "✗ Nginx config missing"
fi

# Check SSL Certificate
echo ""
echo "=== SSL CERTIFICATE ==="
if [ -f "/etc/letsencrypt/live/prozeal.athenas.co.in/fullchain.pem" ]; then
    echo "✓ SSL certificate exists"
    EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/prozeal.athenas.co.in/fullchain.pem | cut -d= -f2)
    echo "Expires: $EXPIRY"
else
    echo "✗ SSL certificate missing"
fi

# Test Connectivity
echo ""
echo "=== CONNECTIVITY TESTS ==="
echo "Backend Health Check:"
if curl -s -I http://localhost:8000/admin/ | head -1 | grep -q "200\|302"; then
    echo "✓ Backend responding"
else
    echo "✗ Backend not responding"
fi

echo ""
echo "Frontend Health Check:"
if curl -s -I https://prozeal.athenas.co.in/ | head -1 | grep -q "200"; then
    echo "✓ Frontend responding"
else
    echo "✗ Frontend not responding"
fi

# Check Recent Logs
echo ""
echo "=== RECENT LOG ENTRIES ==="
echo "Nginx Error Log (last 5 lines):"
if [ -f "/var/log/nginx/error.log" ]; then
    tail -5 /var/log/nginx/error.log 2>/dev/null || echo "No recent errors"
else
    echo "Log file not found"
fi

echo ""
echo "Django Log (last 5 lines):"
if [ -f "/tmp/django.log" ]; then
    tail -5 /tmp/django.log 2>/dev/null || echo "No recent logs"
else
    echo "Log file not found"
fi

echo ""
echo "Vite Log (last 5 lines):"
if [ -f "/tmp/vite.log" ]; then
    tail -5 /tmp/vite.log 2>/dev/null || echo "No recent logs"
else
    echo "Log file not found"
fi

# Recommendations
echo ""
echo "=== RECOMMENDATIONS ==="
ISSUES=0

if ! pgrep -f "vite" > /dev/null; then
    echo "⚠ Start frontend: cd /var/www/athens/frontend && npm run dev &"
    ((ISSUES++))
fi

if ! pgrep -f "python.*manage.py.*runserver" > /dev/null; then
    echo "⚠ Start backend: cd /var/www/athens/backend && source venv/bin/activate && python manage.py runserver 0.0.0.0:8000 &"
    ((ISSUES++))
fi

if ! systemctl is-active nginx > /dev/null 2>&1; then
    echo "⚠ Start Nginx: systemctl start nginx"
    ((ISSUES++))
fi

if ! netstat -tlnp | grep :8000 > /dev/null; then
    echo "⚠ Backend not listening on port 8000 - check process and port configuration"
    ((ISSUES++))
fi

if [ $ISSUES -eq 0 ]; then
    echo "✓ No issues detected - system appears healthy"
fi

echo ""
echo "=========================================="
echo "Diagnostic Complete"
echo "Issues Found: $ISSUES"
echo "For detailed troubleshooting, see: /var/www/athens/MIXED_CONTENT_TROUBLESHOOTING.md"
echo "=========================================="