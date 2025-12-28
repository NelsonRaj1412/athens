#!/bin/bash

# Configure rclone with Google Drive service account

SERVICE_ACCOUNT_FILE="/var/www/athens/gdrive-service-account.json"

if [ ! -f "$SERVICE_ACCOUNT_FILE" ]; then
    echo "ERROR: Service account file not found at $SERVICE_ACCOUNT_FILE"
    echo "Please upload your Google Drive service account JSON file first."
    echo "Run: /var/www/athens/setup_gdrive_instructions.sh for detailed steps"
    exit 1
fi

echo "Configuring rclone with Google Drive service account..."

# Create rclone config
cat > /root/.config/rclone/rclone.conf << EOF
[gdrive]
type = drive
scope = drive
service_account_file = $SERVICE_ACCOUNT_FILE
EOF

echo "Testing Google Drive connection..."
rclone lsd gdrive:

if [ $? -eq 0 ]; then
    echo "✓ Google Drive configured successfully!"
    echo "Creating athens_backups folder..."
    rclone mkdir gdrive:athens_backups
    echo "✓ Setup complete. Backups will be uploaded to Google Drive."
else
    echo "✗ Failed to connect to Google Drive. Please check:"
    echo "1. Service account JSON file is valid"
    echo "2. Google Drive API is enabled"
    echo "3. Service account has access to a shared folder"
fi