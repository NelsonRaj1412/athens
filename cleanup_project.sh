#!/bin/bash

echo "Project Cleanup Script"
echo "====================="

# Remove virtual environment (can be recreated)
if [ -d "backend/venv" ]; then
    echo "Removing backend/venv..."
    rm -rf backend/venv
    echo "✓ Removed backend virtual environment"
fi

# Remove node_modules (can be recreated with npm install)
if [ -d "frontedn/node_modules" ]; then
    echo "Removing frontedn/node_modules..."
    rm -rf frontedn/node_modules
    echo "✓ Removed frontend node_modules"
fi

# Clean old backup files
echo "Cleaning backup files older than 7 days..."
find backend/media/backups/ -name "*.zip" -mtime +7 -delete 2>/dev/null
echo "✓ Cleaned old backups"

# Clean Python cache
echo "Cleaning Python cache files..."
find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null
find . -name "*.pyc" -delete 2>/dev/null
echo "✓ Cleaned Python cache"

# Clean log files
echo "Cleaning log files..."
find . -name "*.log" -size +10M -delete 2>/dev/null
echo "✓ Cleaned large log files"

echo ""
echo "Cleanup completed!"
echo "To restore dependencies:"
echo "  Backend: cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
echo "  Frontend: cd frontedn && npm install"