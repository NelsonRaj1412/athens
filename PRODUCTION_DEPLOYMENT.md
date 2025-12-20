# Athens EHS System - Production Deployment

## 🚀 Quick Production Setup

After pulling the latest code on your production server, run:

```bash
sudo ./deploy-production.sh
```

This script will automatically:
- ✅ Setup PostgreSQL database
- ✅ Configure backend with production settings
- ✅ Install dependencies and run migrations
- ✅ Build frontend for production
- ✅ Configure Nginx reverse proxy
- ✅ Setup systemd service for backend
- ✅ Create admin user (admin/admin123)

## 📋 Manual Steps (if needed)

### 1. Backend Setup
```bash
cd /var/www/athens/backend
cp .env.production .env
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
```

### 2. Frontend Setup
```bash
cd /var/www/athens/frontend
cp .env.production .env
npm install
npm run build
```

### 3. Database Setup
```bash
sudo -u postgres psql
CREATE DATABASE athens_db;
CREATE USER athens_user WITH PASSWORD 'strongpassword123';
GRANT ALL PRIVILEGES ON DATABASE athens_db TO athens_user;
\q
```

## 🔧 Service Management

```bash
# Backend service
sudo systemctl start athens-backend
sudo systemctl status athens-backend
sudo systemctl restart athens-backend

# View logs
sudo journalctl -u athens-backend -f

# Nginx
sudo systemctl reload nginx
sudo nginx -t
```

## 🌐 Access Points

- **Frontend:** http://72.60.218.167
- **Admin Panel:** http://72.60.218.167/admin/
- **API:** http://72.60.218.167/api/

## 🔑 Default Credentials

- **Username:** admin
- **Password:** admin123

## 📁 File Structure

```
/var/www/athens/
├── backend/
│   ├── .env.production          # Production backend config
│   ├── .env                     # Active backend config
│   └── ...
├── frontend/
│   ├── .env.production          # Production frontend config
│   ├── .env                     # Active frontend config
│   ├── dist/                    # Built frontend files
│   └── ...
└── deploy-production.sh         # Deployment script
```

## 🔒 Security Notes

1. Change default passwords after deployment
2. Update domain names in .env files
3. Setup SSL certificates for HTTPS
4. Configure firewall rules
5. Regular security updates

## 🐛 Troubleshooting

### Backend not starting:
```bash
sudo journalctl -u athens-backend -f
cd /var/www/athens/backend
source venv/bin/activate
python manage.py check
```

### Database connection issues:
```bash
sudo -u postgres psql -d athens_db -U athens_user
```

### Frontend not loading:
```bash
sudo nginx -t
sudo systemctl status nginx
ls -la /var/www/athens/frontend/dist/
```

### Permission issues:
```bash
sudo chown -R www-data:www-data /var/www/athens
```