# Athens EHS - Quick Reference Guide

## System Access

**Production URL:** https://prozeal.athenas.co.in/
**Admin Panel:** https://prozeal.athenas.co.in/admin/
**Credentials:** test / test123

## Common Commands

### Create Master Admin
```bash
cd /var/www/athens/backend
source venv/bin/activate
python manage.py create_master_admin <username> <password> --email <email>
```

### Check Users
```bash
cd /var/www/athens/backend
source venv/bin/activate
python manage.py shell -c "from authentication.models import CustomUser; [print(f'{u.username} - {u.admin_type}') for u in CustomUser.objects.all()]"
```

### Restart Backend
```bash
pkill -f "python.*runserver"
cd /var/www/athens/backend
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000 &
```

### Restart Frontend
```bash
pkill -f "node.*vite"
cd /var/www/athens/frontend
npm run dev -- --host 0.0.0.0 --port 3000 &
```

### Restart Nginx
```bash
nginx -t && systemctl reload nginx
```

### Test Authentication
```bash
curl -X POST https://prozeal.athenas.co.in/authentication/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}' -k
```

## File Locations

**Backend Settings:** `/var/www/athens/backend/backend/settings.py`
**Nginx Config:** `/etc/nginx/sites-enabled/prozeal`
**Frontend Axios:** `/var/www/athens/frontend/src/common/utils/axiosetup.ts`
**Frontend Env:** `/var/www/athens/frontend/.env`
**Backend Env:** `/var/www/athens/backend/.env`

## Critical Settings

### Django ALLOWED_HOSTS
```python
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '72.60.218.167', 'prozeal.athenas.co.in']
```

### CORS Origins
```python
CORS_ALLOWED_ORIGINS = [
    'https://prozeal.athenas.co.in',
    'http://72.60.218.167:3000',
]
```

### Frontend Base URL
```env
VITE_API_BASE_URL=https://prozeal.athenas.co.in
```

## Troubleshooting

**Authentication fails?**
1. Check ALLOWED_HOSTS
2. Verify user exists
3. Test direct backend
4. Check nginx logs

**CORS errors?**
1. Check CORS_ALLOWED_ORIGINS
2. Verify frontend base URL
3. Check nginx proxy headers

**500 errors?**
1. Check backend logs: `/var/www/athens/backend/logs/django.log`
2. Check nginx logs: `/var/log/nginx/error.log`
3. Verify database connection

## Log Files

- Django: `/var/www/athens/backend/logs/django.log`
- Security: `/var/www/athens/backend/logs/security.log`
- Nginx Access: `/var/log/nginx/access.log`
- Nginx Error: `/var/log/nginx/error.log`