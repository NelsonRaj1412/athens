#!/bin/bash

echo "Getting rclone auth token for Google Drive..."

# Generate auth URL
rclone authorize "drive" --auth-no-open-browser

echo ""
echo "Copy the token above and paste it when prompted"
echo "Then run: /var/www/athens/configure_gdrive_token.sh"