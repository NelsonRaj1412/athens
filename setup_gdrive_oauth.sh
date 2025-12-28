#!/bin/bash

echo "Setting up Google Drive with OAuth (simpler method)..."

# Create rclone config for OAuth
cat > /root/.config/rclone/rclone.conf << 'EOF'
[gdrive]
type = drive
scope = drive
token = {"access_token":"ya29.a0AeDClZDummy","token_type":"Bearer","refresh_token":"1//0GDummy","expiry":"2025-12-28T00:00:00Z"}
EOF

echo "Google Drive setup requires manual authentication."
echo "Please provide your Google Drive OAuth token."
echo ""
echo "To get the token:"
echo "1. Go to: https://developers.google.com/oauthplayground/"
echo "2. Click gear icon (top right) > Use your own OAuth credentials"
echo "3. Enter Client ID and Secret (or use default)"
echo "4. In Step 1: Select 'Drive API v3' > https://www.googleapis.com/auth/drive"
echo "5. Click 'Authorize APIs'"
echo "6. In Step 2: Click 'Exchange authorization code for tokens'"
echo "7. Copy the refresh_token value"
echo ""
echo "Then run: nano /root/.config/rclone/rclone.conf"
echo "And replace the refresh_token value"