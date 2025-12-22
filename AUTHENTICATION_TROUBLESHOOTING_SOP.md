# Athens EHS System - Authentication Troubleshooting SOP

## Overview
Standard Operating Procedure for diagnosing and fixing authentication issues between frontend and backend in the Athens EHS management system.

## Common Authentication Issues

### Issue 1: "Invalid username and password" Error

**Symptoms:**
- Frontend shows "Invalid username and password"
- Backend authentication works directly
- 400/401 HTTP status codes

**Root Causes:**
1. ALLOWED_HOSTS misconfiguration
2. HTTPS/HTTP redirect issues
3. Nginx proxy misconfiguration
4. Missing or incorrect user credentials

### Issue 2: CORS/Cross-Origin Errors

**Symptoms:**
- Browser console shows CORS errors
- Preflight OPTIONS requests failing
- Network requests blocked

## Diagnostic Procedures

### Step 1: Verify User Exists
```bash
cd backend
source venv/bin/activate
python manage.py shell -c "from authentication.models import CustomUser; users = CustomUser.objects.all(); [print(f'{u.username} ({u.user_type}, {u.admin_type})') for u in users]"
```

### Step 2: Test Direct Backend Authentication
```bash
curl -X POST http://localhost:8000/authentication/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'
```

### Step 3: Test Production Domain
```bash
curl -X POST https://prozeal.athenas.co.in/authentication/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}' -k
```

### Step 4: Check Django Settings
```bash
cd backend
source venv/bin/activate
python manage.py shell -c "from django.conf import settings; print(f'DEBUG: {settings.DEBUG}'); print(f'ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}'); print(f'CORS_ALLOWED_ORIGINS: {getattr(settings, \"CORS_ALLOWED_ORIGINS\", \"Not set\")}')"
```

## Solution Procedures

### Fix 1: ALLOWED_HOSTS Configuration
**File:** `/var/www/athens/backend/backend/settings.py`
```python
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '72.60.218.167', 'prozeal.athenas.co.in']
```

### Fix 2: Disable SSL Redirect for Development
**File:** `/var/www/athens/backend/backend/settings.py`
```python
DEBUG = True
if DEBUG:
    SECURE_SSL_REDIRECT = False
    SECURE_HSTS_SECONDS = 0
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False
```

### Fix 3: Nginx Proxy Configuration
**File:** `/etc/nginx/sites-enabled/prozeal`
```nginx
# API routes - proxy to Django backend
location /api/ {
    rewrite ^/api/(.*)$ /$1 break;
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
}

# Direct backend routes
location ~ ^/(authentication|admin|media)/ {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
}
```

### Fix 4: Frontend Axios Configuration
**File:** `/var/www/athens/frontend/src/common/utils/axiosetup.ts`
```typescript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://prozeal.athenas.co.in',
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});
```

### Fix 5: Environment Configuration
**File:** `/var/www/athens/frontend/.env`
```env
VITE_API_BASE_URL=https://prozeal.athenas.co.in
VITE_BACKEND_URL=https://prozeal.athenas.co.in
```

## Master Admin Creation

### Method 1: Django Management Command
```bash
cd backend
source venv/bin/activate
python manage.py create_master_admin <username> <password> --email <email>
```

### Method 2: Check Existing Users
```bash
cd backend
source venv/bin/activate
python manage.py shell -c "from authentication.models import CustomUser; print('Existing users:'); [print(f'- {u.username} ({u.admin_type})') for u in CustomUser.objects.all()]"
```

## Server Restart Procedures

### Restart Backend
```bash
pkill -f "python.*runserver"
cd backend
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000 &
```

### Restart Nginx
```bash
nginx -t
systemctl reload nginx
```

### Restart Frontend
```bash
pkill -f "node.*vite"
cd frontend
npm run dev -- --host 0.0.0.0 --port 3000 &
```

## Production Access Information

### URLs
- **Frontend:** https://prozeal.athenas.co.in/
- **Backend API:** https://prozeal.athenas.co.in/api/authentication/login/
- **Admin Panel:** https://prozeal.athenas.co.in/admin/

### Default Credentials
- **Username:** test
- **Password:** test123
- **User Type:** MASTER_ADMIN

## Verification Steps

### 1. Test Authentication Script
Create `/var/www/athens/test_auth.py`:
```python
#!/usr/bin/env python3
import requests
import json

def test_auth():
    data = {"username": "test", "password": "test123"}
    
    # Test direct backend
    response = requests.post('http://localhost:8000/authentication/login/', json=data)
    print(f"Direct backend: {response.status_code}")
    
    # Test production
    response = requests.post('https://prozeal.athenas.co.in/authentication/login/', json=data, verify=False)
    print(f"Production: {response.status_code}")
    
    # Test API route
    response = requests.post('https://prozeal.athenas.co.in/api/authentication/login/', json=data, verify=False)
    print(f"API route: {response.status_code}")

if __name__ == '__main__':
    test_auth()
```

### 2. Run Verification
```bash
cd /var/www/athens
python3 test_auth.py
```

**Expected Output:**
```
Direct backend: 200
Production: 200
API route: 200
```

## Troubleshooting Checklist

- [ ] User exists in database
- [ ] Direct backend authentication works
- [ ] ALLOWED_HOSTS includes domain
- [ ] CORS settings configured
- [ ] Nginx proxy working
- [ ] Frontend environment variables correct
- [ ] SSL/HTTPS settings appropriate
- [ ] Backend server running
- [ ] Frontend server running

## Emergency Recovery

If system is completely broken:

1. **Reset to working state:**
```bash
cd /var/www/athens
git stash
git pull origin main
```

2. **Restart all services:**
```bash
pkill -f "python.*runserver"
pkill -f "node.*vite"
systemctl restart nginx
```

3. **Start fresh:**
```bash
cd backend && source venv/bin/activate && python manage.py runserver 0.0.0.0:8000 &
cd frontend && npm run dev -- --host 0.0.0.0 --port 3000 &
```

## Contact Information

**System Administrator:** [Your contact info]
**Last Updated:** December 2025
**Version:** 1.0