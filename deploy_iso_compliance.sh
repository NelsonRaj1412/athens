#!/bin/bash

# ISO Compliance Enhancement Migration Script
# This script applies the database changes for the enhanced induction training module

echo "Starting ISO Compliance Enhancement Migration..."

# Navigate to backend directory
cd /var/www/athens/backend

# Activate virtual environment
source venv/bin/activate

# Run the migration
echo "Applying database migration..."
python manage.py migrate inductiontraining 0004_iso_compliance_enhancements

# Check migration status
if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully"
else
    echo "❌ Migration failed"
    exit 1
fi

# Collect static files if needed
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Restart services
echo "Restarting services..."
sudo systemctl restart nginx

echo "🎉 ISO Compliance Enhancement deployment completed!"
echo ""
echo "New Features Added:"
echo "- ISO-compliant document layout with proper headers/footers"
echo "- Digital signature management for all authorization roles"
echo "- Enhanced logo fetching with fallback mechanisms"
echo "- Document ID generation and revision control"
echo "- Audit-ready compliance checking"
echo ""
echo "Next Steps:"
echo "1. Ensure company logos are uploaded to /media/company_logos/"
echo "2. Configure digital signature templates for users"
echo "3. Test document generation with all signatures"
echo "4. Verify ISO compliance reporting"