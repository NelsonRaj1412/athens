# QUICK REFERENCE - Athens EHS System

## Emergency Commands

### System Status Check
```bash
./diagnose_system.sh
```

### Fix Mixed Content Error
```bash
./setup_https_config.sh
```

### Manual Service Restart
```bash
# Stop all
pkill -f vite && pkill -f "python.*manage.py"

# Start backend
cd /var/www/athens/backend && source venv/bin/activate && python manage.py runserver 0.0.0.0:8000 &

# Start frontend  
cd /var/www/athens/frontend && npm run dev &

# Restart nginx
systemctl restart nginx
```

### Check Processes
```bash
ps aux | grep -E "(vite|python.*manage)" | grep -v grep
```

### Check Ports
```bash
netstat -tlnp | grep -E ":(80|443|8000|8001)"
```

### View Logs
```bash
tail -f /tmp/django.log /tmp/vite.log /var/log/nginx/error.log
```

## Common Issues & Solutions

| Issue | Quick Fix |
|-------|-----------|
| Mixed Content Error | `./setup_https_config.sh` |
| 502 Bad Gateway | Start backend on port 8000 |
| Frontend 404 | `cd frontend && npm run build && npm run dev &` |
| SSL Error | Check `/etc/letsencrypt/live/prozeal.athenas.co.in/` |

## File Locations

| Component | Path |
|-----------|------|
| Frontend Config | `/var/www/athens/frontend/.env.production` |
| Nginx Config | `/etc/nginx/sites-available/prozeal` |
| Backend | `/var/www/athens/backend/` |
| Logs | `/tmp/django.log`, `/tmp/vite.log` |

## Port Configuration

| Service | Port | Protocol |
|---------|------|----------|
| Nginx HTTP | 80 | HTTP |
| Nginx HTTPS | 443 | HTTPS |
| Django Backend | 8000 | HTTP |
| WebSocket | 8001 | WS/WSS |
| Vite Dev | 3000 | HTTP |