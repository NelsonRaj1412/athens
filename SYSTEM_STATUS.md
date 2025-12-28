# Athens EHS Management System - Configuration Summary

## ✅ SYSTEM STATUS

### Database Configuration
- **Database**: PostgreSQL 16.11 (Migrated from SQLite)
- **Database Name**: athens_ehs
- **Connection**: ✅ WORKING
- **Host**: localhost:5432
- **Tables**: 116 tables successfully migrated
- **Migration Status**: ✅ COMPLETED (Dec 27, 2025)

### Backend Configuration
- **Framework**: Django 5.2.1
- **Port**: 8001
- **Status**: ✅ RUNNING
- **URL**: http://localhost:8001

### Frontend Configuration
- **Framework**: React 18.3.1 + Vite 6.3.5
- **Port**: 5173
- **Status**: ✅ RUNNING
- **URL**: http://localhost:5173

## 🔐 LOGIN CREDENTIALS

```
Username: admin
Password: admin123
User Type: Master Admin
User ID: 13
```

## 🚀 QUICK START

### Option 1: Use Startup Script
```bash
cd /var/www/athens
./start_athens.sh
```

### Option 2: Manual Start
```bash
# Backend
cd /var/www/athens/backend
source venv/bin/activate
python manage.py runserver 0.0.0.0:8001

# Frontend (new terminal)
cd /var/www/athens/frontend
npm run dev
```

## 🔧 CONFIGURATION FILES

### Backend Environment
- **File**: `/var/www/athens/backend/.env`
- **Database**: PostgreSQL (athens_ehs)
- **Debug**: Enabled for development
- **Migration**: ✅ SQLite to PostgreSQL completed

### Frontend Environment
- **File**: `/var/www/athens/frontend/.env`
- **API URL**: http://localhost:8001
- **WebSocket**: ws://localhost:8001

## 🐛 TROUBLESHOOTING

### Login Issues
1. **Invalid credentials**: Use admin/admin123
2. **Connection refused**: Check if backend is running on port 8001
3. **CORS errors**: Frontend should use localhost:5173, backend localhost:8001

### WebSocket Issues
- **Error**: `wss://72.60.218.167:8001/ws/notifications/`
- **Fix**: Update WebSocket URL to `ws://localhost:8001`

### Port Conflicts
```bash
# Check what's using ports
sudo lsof -i :8001
sudo lsof -i :5173

# Kill conflicting processes
sudo pkill -f "manage.py runserver"
sudo pkill -f "vite"
```

## 📊 SYSTEM ARCHITECTURE

### Backend Apps (15 modules)
- authentication (✅ Working)
- ptw (Permit to Work)
- incident management
- safety observation
- worker management
- training systems
- AI bot integration
- ESG environment
- quality management

### Frontend Features
- React 18.3.1 + TypeScript
- Ant Design UI components
- Zustand state management
- Axios API client
- WebSocket notifications

## 🔍 LOGS

```bash
# Backend logs
tail -f /tmp/athens_backend.log

# Frontend logs
tail -f /tmp/athens_frontend.log

# Database logs
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

## 🌐 ACCESS POINTS

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8001
- **Django Admin**: http://localhost:8001/admin/
- **API Documentation**: http://localhost:8001/api/

## ⚠️ SECURITY NOTES

- System is configured for development (DEBUG=True)
- HTTPS disabled for local development
- CORS configured for localhost origins
- JWT tokens expire in 1 hour
- All security vulnerabilities have been fixed