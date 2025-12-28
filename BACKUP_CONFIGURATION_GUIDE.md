# Athens EHS System - Cloud Backup Configuration Guide

## Current Status
✅ Daily backup script created: `/var/www/athens/backup_database.sh`
✅ Cron job scheduled: Daily at 12:00 AM (midnight)
✅ Local backups working: `/tmp/athens_backups/`

## What Gets Backed Up
1. **Database**: SQLite database file (compressed)
2. **Django Data**: Complete data dump in JSON format (compressed)
3. **Media Files**: All uploaded files (photos, documents, etc.)

## Cloud Storage Setup

### Option 1: Google Drive (Recommended)
```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Configure Google Drive
rclone config
# Choose: n (new remote)
# Name: gdrive
# Storage: drive (Google Drive)
# Follow authentication steps

# Test connection
rclone ls gdrive:

# Update backup script (uncomment lines 85-90 in backup_database.sh)
```

### Option 2: AWS S3
```bash
# Install AWS CLI
sudo apt install awscli

# Configure AWS credentials
aws configure
# Enter: Access Key ID, Secret Access Key, Region, Output format

# Create S3 bucket
aws s3 mb s3://athens-ehs-backups

# Update backup script (uncomment lines 92-98 in backup_database.sh)
```

### Option 3: Dropbox
```bash
# Download Dropbox Uploader
cd /var/www/athens
wget https://raw.githubusercontent.com/andreafabrizi/Dropbox-Uploader/master/dropbox_uploader.sh
chmod +x dropbox_uploader.sh

# Configure Dropbox
./dropbox_uploader.sh

# Update backup script (uncomment lines 100-106 in backup_database.sh)
```

### Option 4: Microsoft OneDrive
```bash
# Install rclone (if not already installed)
curl https://rclone.org/install.sh | sudo bash

# Configure OneDrive
rclone config
# Choose: n (new remote)
# Name: onedrive
# Storage: onedrive
# Follow authentication steps

# Update backup script - add these lines after line 83:
# rclone copy "$BACKUP_FILE" "onedrive:athens_backups/"
# rclone copy "$DJANGO_BACKUP_FILE" "onedrive:athens_backups/"
# if [ -f "$MEDIA_BACKUP_FILE" ]; then
#     rclone copy "$MEDIA_BACKUP_FILE" "onedrive:athens_backups/"
# fi
```

## Configuration Steps

1. **Choose your cloud provider** from the options above
2. **Follow the installation steps** for your chosen provider
3. **Edit the backup script** to uncomment the relevant upload section:
   ```bash
   sudo nano /var/www/athens/backup_database.sh
   ```
4. **Test the backup** manually:
   ```bash
   /var/www/athens/backup_database.sh
   ```
5. **Verify files** are uploaded to your cloud storage

## Backup Schedule
- **Frequency**: Daily at 12:00 AM (midnight)
- **Retention**: Local backups kept for 7 days
- **Cloud retention**: Configure in your cloud provider settings

## Monitoring
- **Log file**: `/var/log/athens_backup.log`
- **Check logs**: `tail -f /var/log/athens_backup.log`
- **Manual backup**: `/var/www/athens/backup_database.sh`

## Backup Sizes (Approximate)
- Database: ~600KB (compressed)
- Django Data: ~524KB (compressed)  
- Media Files: ~215MB (compressed)
- **Total per backup**: ~216MB

## Security Notes
- All backups are compressed with gzip
- Database contains sensitive user data - ensure cloud storage is secure
- Consider encrypting backups for additional security
- Regularly test backup restoration procedures

## Restoration Process
1. **Database restoration**:
   ```bash
   cd /var/www/athens/backend
   # For SQLite:
   gunzip backup_file.sqlite3.gz
   cp backup_file.sqlite3 db.sqlite3
   
   # For PostgreSQL:
   gunzip backup_file.sql.gz
   psql -U username -d database_name < backup_file.sql
   ```

2. **Django data restoration**:
   ```bash
   cd /var/www/athens/backend
   source venv/bin/activate
   gunzip backup_file_django_data.json.gz
   python manage.py loaddata backup_file_django_data.json
   ```

3. **Media files restoration**:
   ```bash
   cd /var/www/athens/backend
   tar -xzf backup_file_media.tar.gz
   ```

## Next Steps
Please provide your preferred cloud storage service, and I'll help you configure the specific upload commands in the backup script.