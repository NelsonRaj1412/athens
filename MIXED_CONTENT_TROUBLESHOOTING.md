# Mixed Content & 502 Error Troubleshooting Guide

## Problem: "Blocked loading mixed active content" Error

### Symptoms
- Browser console shows: `Blocked loading mixed active content "http://..."`
- HTTPS site trying to load HTTP resources
- Authentication/API calls failing

### Root Cause
Frontend environment files contain HTTP URLs while site runs on HTTPS, causing mixed content security blocks.

### Solution Steps

#### 1. Check Environment Files
```bash
# Check current frontend environment
cat /var/www/athens/frontend/.env
cat /var/www/athens/frontend/.env.production
```

#### 2. Fix HTTP to HTTPS URLs
Update `/var/www/athens/frontend/.env.production`:
```bash
# WRONG (causes mixed content error)
VITE_API_BASE_URL=http://72.60.218.167:8000
VITE_BACKEND_URL=http://72.60.218.167:8000
VITE_WS_URL=ws://72.60.218.167:8000

# CORRECT (matches HTTPS site)
VITE_API_BASE_URL=https://prozeal.athenas.co.in
VITE_BACKEND_URL=https://prozeal.athenas.co.in
VITE_WS_URL=wss://prozeal.athenas.co.in
```

#### 3. Rebuild Frontend
```bash
cd /var/www/athens/frontend
npm run build
```

#### 4. Restart Frontend Service
```bash
# Kill existing Vite process
pkill -f "vite"

# Start new process
cd /var/www/athens/frontend
nohup npm run dev > /tmp/vite.log 2>&1 &
```

## Problem: 502 Bad Gateway Error

### Symptoms
- API calls return HTTP 502 status
- Nginx error: "upstream server not responding"
- Authentication endpoints unreachable

### Root Cause
Backend Django server not running on expected port or crashed.

### Solution Steps

#### 1. Check Backend Process
```bash
ps aux | grep -E '(python|django|gunicorn)' | grep -v grep
```

#### 2. Check Port Configuration
```bash
# Check what's listening on backend port
netstat -tlnp | grep :8000

# Check Nginx configuration
cat /etc/nginx/sites-available/prozeal
```

#### 3. Start Backend on Correct Port
```bash
cd /var/www/athens/backend
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000 &
```

#### 4. Verify Backend is Running
```bash
curl -I http://localhost:8000/admin/
```

## Quick Diagnostic Commands

### Check All Services Status
```bash
# Frontend
ps aux | grep vite | grep -v grep

# Backend
ps aux | grep python | grep manage.py | grep -v grep

# Nginx
systemctl status nginx

# Ports
netstat -tlnp | grep -E ':(80|443|8000|8001)'
```

### Environment Verification
```bash
# Check frontend environment
grep -E "(API_BASE_URL|BACKEND_URL)" /var/www/athens/frontend/.env*

# Check if URLs match site protocol
curl -I https://prozeal.athenas.co.in/authentication/login/
```

### Log Checking
```bash
# Nginx logs
tail -f /var/log/nginx/error.log

# Frontend logs
tail -f /tmp/vite.log

# Backend logs
cd /var/www/athens/backend && python manage.py check
```

## Prevention Checklist

### Before Deployment
- [ ] Verify all environment files use HTTPS URLs for production
- [ ] Ensure backend port matches Nginx proxy configuration
- [ ] Test API endpoints return proper CORS headers
- [ ] Confirm SSL certificates are valid

### Regular Maintenance
- [ ] Monitor process status with `ps aux | grep -E '(vite|python.*manage)'`
- [ ] Check disk space: `df -h`
- [ ] Verify SSL certificate expiry: `certbot certificates`
- [ ] Test API connectivity: `curl -I https://prozeal.athenas.co.in/admin/`

## Emergency Recovery

### Complete Service Restart
```bash
# Stop all services
pkill -f vite
pkill -f "python.*manage.py"

# Start backend
cd /var/www/athens/backend
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000 &

# Start frontend
cd /var/www/athens/frontend
npm run build
nohup npm run dev > /tmp/vite.log 2>&1 &

# Restart Nginx
systemctl restart nginx
```

### Rollback Environment
```bash
# Backup current config
cp /var/www/athens/frontend/.env.production /var/www/athens/frontend/.env.production.backup

# Restore from working config
cp /var/www/athens/frontend/.env /var/www/athens/frontend/.env.production

# Rebuild and restart
cd /var/www/athens/frontend
npm run build
pkill -f vite && nohup npm run dev > /tmp/vite.log 2>&1 &
```

## Common Port Configurations

| Service | Development | Production |
|---------|-------------|------------|
| Frontend | 3000 | 443 (HTTPS) |
| Backend API | 8000 | 8000 |
| WebSocket | 8001 | 8001 |
| Nginx | 80/443 | 80/443 |

## Contact Information
- System Admin: Check `/var/www/athens/SYSTEM_STATUS.md`
- Logs Location: `/var/log/nginx/`, `/tmp/vite.log`
- Backup Configs: `/var/www/athens/frontend/.env*`