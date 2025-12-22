# Athens EHS System

## Quick Start

### Development
```bash
# Backend
cd backend && source venv/bin/activate && python manage.py runserver 0.0.0.0:8000

# Frontend  
cd frontend && npm run dev
```

### Production
```bash
./setup_https_config.sh
```

## Troubleshooting & Maintenance

### Quick Diagnostic
Run system health check:
```bash
./diagnose_system.sh
```

### Common Issues

#### Mixed Content Error (HTTPS/HTTP)
- **Problem**: Browser blocks HTTP content on HTTPS site
- **Solution**: Run `./setup_https_config.sh` or see `MIXED_CONTENT_TROUBLESHOOTING.md`

#### 502 Bad Gateway
- **Problem**: Backend not responding
- **Quick Fix**: 
  ```bash
  cd /var/www/athens/backend
  source venv/bin/activate
  python manage.py runserver 0.0.0.0:8000 &
  ```

#### Frontend Not Loading
- **Problem**: Vite server crashed
- **Quick Fix**:
  ```bash
  cd /var/www/athens/frontend
  pkill -f vite
  npm run dev &
  ```

### Emergency Recovery
```bash
# Complete system restart
./setup_https_config.sh

# Or manual restart
pkill -f vite
pkill -f "python.*manage.py"
cd /var/www/athens/backend && source venv/bin/activate && python manage.py runserver 0.0.0.0:8000 &
cd /var/www/athens/frontend && npm run dev &
systemctl restart nginx
```

### Maintenance Files
- `MIXED_CONTENT_TROUBLESHOOTING.md` - Detailed troubleshooting guide
- `setup_https_config.sh` - Automated HTTPS setup
- `diagnose_system.sh` - System health checker
- `SYSTEM_STATUS.md` - Current system status