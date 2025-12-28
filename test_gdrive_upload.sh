#!/bin/bash

echo "Testing backup upload to Google Drive..."

BACKUP_FILE="/tmp/athens_backups/athens_db_backup_20251227_230054.sqlite3.gz"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Creating test backup..."
    /var/www/athens/backup_database.sh
    BACKUP_FILE=$(ls -t /tmp/athens_backups/*.sqlite3.gz | head -1)
fi

echo "Uploading: $BACKUP_FILE"
rclone copy "$BACKUP_FILE" gdrive:athens_backups/ --progress -v

if [ $? -eq 0 ]; then
    echo "✓ Upload successful!"
    echo "Listing files in Google Drive:"
    rclone ls gdrive:athens_backups/
else
    echo "✗ Upload failed. Check rclone configuration."
fi