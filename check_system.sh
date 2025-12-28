#!/bin/bash

# Port Monitor Script - Checks and fixes port mismatches

check_backend() {
    if ! curl -s http://localhost:8001 > /dev/null; then
        echo "❌ Backend not responding on port 8001"
        sudo systemctl restart athens-backend
        sleep 5
        if curl -s http://localhost:8001 > /dev/null; then
            echo "✅ Backend restarted successfully"
        else
            echo "❌ Backend restart failed"
        fi
    else
        echo "✅ Backend running on port 8001"
    fi
}

check_nginx() {
    if ! sudo nginx -t 2>/dev/null; then
        echo "❌ Nginx config error"
        return 1
    fi
    
    if ! systemctl is-active --quiet nginx; then
        echo "❌ Nginx not running"
        sudo systemctl restart nginx
    else
        echo "✅ Nginx running"
    fi
}

echo "🔍 Checking Athens EHS System..."
check_backend
check_nginx
echo "✅ System check complete"