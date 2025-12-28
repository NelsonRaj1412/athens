#!/bin/bash

# Athens EHS System - Database Backup Script
# Runs daily at 12:00 AM to backup database to cloud storage

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="/var/www/athens"
BACKEND_DIR="$PROJECT_DIR/backend"
BACKUP_DIR="/tmp/athens_backups"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="athens_db_backup_$DATE"

# Logging
LOG_FILE="/var/log/athens_backup.log"
exec > >(tee -a "$LOG_FILE")
exec 2>&1

echo "=========================================="
echo "Athens EHS Database Backup Started: $(date)"
echo "=========================================="

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Load environment variables
if [ -f "$BACKEND_DIR/.env" ]; then
    source "$BACKEND_DIR/.env"
else
    echo "ERROR: .env file not found at $BACKEND_DIR/.env"
    exit 1
fi

# Determine database type and create backup
cd "$BACKEND_DIR"
source venv/bin/activate

# Check for both SQLite and PostgreSQL databases
if [ "$DB_ENGINE" = "postgresql" ] || [ -n "$PG_DB_NAME" ]; then
    if [ "$DB_ENGINE" = "postgresql" ]; then
        echo "Creating PostgreSQL backup (primary)..."
        PGPASSWORD="$DB_PASSWORD" pg_dump \
            -h "${DB_HOST:-localhost}" \
            -p "${DB_PORT:-5432}" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --no-password \
            --verbose \
            > "$BACKUP_DIR/${BACKUP_FILENAME}.sql"
        gzip "$BACKUP_DIR/${BACKUP_FILENAME}.sql"
        BACKUP_FILE="$BACKUP_DIR/${BACKUP_FILENAME}.sql.gz"
    else
        echo "Creating SQLite backup (primary)..."
        cp "$BACKEND_DIR/db.sqlite3" "$BACKUP_DIR/${BACKUP_FILENAME}.sqlite3"
        gzip "$BACKUP_DIR/${BACKUP_FILENAME}.sqlite3"
        BACKUP_FILE="$BACKUP_DIR/${BACKUP_FILENAME}.sqlite3.gz"
    fi
    
    # Backup secondary PostgreSQL if configured
    if [ -n "$PG_DB_NAME" ] && [ "$DB_ENGINE" != "postgresql" ]; then
        echo "Creating PostgreSQL backup (secondary)..."
        PGPASSWORD="$PG_DB_PASSWORD" pg_dump \
            -h "${PG_DB_HOST:-localhost}" \
            -p "${PG_DB_PORT:-5432}" \
            -U "$PG_DB_USER" \
            -d "$PG_DB_NAME" \
            --no-password \
            --verbose \
            > "$BACKUP_DIR/${BACKUP_FILENAME}_postgres.sql"
        gzip "$BACKUP_DIR/${BACKUP_FILENAME}_postgres.sql"
        PG_BACKUP_FILE="$BACKUP_DIR/${BACKUP_FILENAME}_postgres.sql.gz"
    fi
else
    echo "Creating SQLite backup..."
    cp "$BACKEND_DIR/db.sqlite3" "$BACKUP_DIR/${BACKUP_FILENAME}.sqlite3"
    gzip "$BACKUP_DIR/${BACKUP_FILENAME}.sqlite3"
    BACKUP_FILE="$BACKUP_DIR/${BACKUP_FILENAME}.sqlite3.gz"
fi

# Create Django data dump (for additional safety)
echo "Creating Django data dump..."
python manage.py dumpdata \
    --natural-foreign \
    --natural-primary \
    --exclude=contenttypes \
    --exclude=auth.permission \
    --exclude=sessions \
    --indent=2 \
    > "$BACKUP_DIR/${BACKUP_FILENAME}_django_data.json"

gzip "$BACKUP_DIR/${BACKUP_FILENAME}_django_data.json"
DJANGO_BACKUP_FILE="$BACKUP_DIR/${BACKUP_FILENAME}_django_data.json.gz"

# Create media files backup
echo "Creating media files backup..."
if [ -d "$BACKEND_DIR/media" ]; then
    tar -czf "$BACKUP_DIR/${BACKUP_FILENAME}_media.tar.gz" -C "$BACKEND_DIR" media/
    MEDIA_BACKUP_FILE="$BACKUP_DIR/${BACKUP_FILENAME}_media.tar.gz"
fi

# Get file sizes for logging
DB_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
DJANGO_SIZE=$(du -h "$DJANGO_BACKUP_FILE" | cut -f1)
if [ -f "$MEDIA_BACKUP_FILE" ]; then
    MEDIA_SIZE=$(du -h "$MEDIA_BACKUP_FILE" | cut -f1)
fi

echo "Backup files created:"
echo "  Database backup: $BACKUP_FILE ($DB_SIZE)"
echo "  Django data backup: $DJANGO_BACKUP_FILE ($DJANGO_SIZE)"
if [ -f "$MEDIA_BACKUP_FILE" ]; then
    echo "  Media files backup: $MEDIA_BACKUP_FILE ($MEDIA_SIZE)"
fi

# Upload to Google Drive with date-wise folders
echo "Uploading backups to Google Drive..."
DATE_FOLDER=$(date +"%Y/%m/%d")
rclone copy "$BACKUP_FILE" "gdrive:athens_backups/$DATE_FOLDER/" --progress
rclone copy "$DJANGO_BACKUP_FILE" "gdrive:athens_backups/$DATE_FOLDER/" --progress
if [ -f "$MEDIA_BACKUP_FILE" ]; then
    rclone copy "$MEDIA_BACKUP_FILE" "gdrive:athens_backups/$DATE_FOLDER/" --progress
fi

if [ $? -eq 0 ]; then
    echo "✓ Backups uploaded to Google Drive successfully"
    echo "  Location: athens_backups/$DATE_FOLDER/"
else
    echo "✗ Failed to upload backups to Google Drive"
fi

# Clean up old local backups (keep last 7 days)
echo "Cleaning up old local backups..."
find "$BACKUP_DIR" -name "athens_db_backup_*" -type f -mtime +7 -delete

# Backup verification
echo "Verifying backup integrity..."
if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    echo "✓ Database backup created successfully"
else
    echo "✗ Database backup failed or is empty"
    exit 1
fi

if [ -f "$DJANGO_BACKUP_FILE" ] && [ -s "$DJANGO_BACKUP_FILE" ]; then
    echo "✓ Django data backup created successfully"
else
    echo "✗ Django data backup failed or is empty"
    exit 1
fi

echo "=========================================="
echo "Athens EHS Database Backup Completed: $(date)"
echo "=========================================="

# Send notification (optional)
# You can add email notification here if needed
# echo "Backup completed successfully" | mail -s "Athens EHS Backup - $(date)" admin@yourcompany.com