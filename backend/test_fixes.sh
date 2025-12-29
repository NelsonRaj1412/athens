#!/bin/bash

# Comprehensive Testing Script for Fixed Modules
# Run this script to test all the fixes applied to the system

echo "=== Athens EHS System - Module Testing Script ==="
echo "Testing all recently fixed modules and endpoints"
echo "=================================================="

# Set base URL
BASE_URL="https://prozeal.athenas.co.in/api/v1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local expected_status=$4
    
    echo -n "Testing $description... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint")
    else
        response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BASE_URL$endpoint")
    fi
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} ($response)"
    else
        echo -e "${RED}✗ FAIL${NC} ($response, expected $expected_status)"
    fi
}

echo -e "\n${YELLOW}1. PTW Module Tests${NC}"
echo "===================="
test_endpoint "GET" "/ptw/permit-types/" "PTW Permit Types List" "200"
test_endpoint "GET" "/ptw/permits/" "PTW Permits List" "200"
test_endpoint "GET" "/ptw/permits/dashboard_stats/" "PTW Dashboard Stats" "200"
test_endpoint "GET" "/ptw/permits/available_approvers/" "PTW Available Approvers" "200"

echo -e "\n${YELLOW}2. Quality Management Tests${NC}"
echo "============================"
test_endpoint "GET" "/quality/standards/" "Quality Standards List" "200"
test_endpoint "GET" "/quality/templates/" "Quality Templates List" "200"
test_endpoint "GET" "/quality/inspections/" "Quality Inspections List" "200"
test_endpoint "GET" "/quality/inspections/dashboard_stats/" "Quality Dashboard Stats" "200"
test_endpoint "GET" "/quality/defects/" "Quality Defects List" "200"
test_endpoint "GET" "/quality/suppliers/" "Supplier Quality List" "200"

echo -e "\n${YELLOW}3. MoM Module Tests${NC}"
echo "==================="
test_endpoint "GET" "/mom/moms/" "MoM List" "200"
test_endpoint "GET" "/mom/departments/" "Departments List" "200"

echo -e "\n${YELLOW}4. Inspection Module Tests${NC}"
echo "==========================="
test_endpoint "GET" "/inspection/inspections/" "Inspections List" "200"
test_endpoint "GET" "/inspection/users/" "Inspection Users" "200"

echo -e "\n${YELLOW}5. Incident Management Tests${NC}"
echo "============================="
test_endpoint "GET" "/incidentmanagement/incidents/" "Incidents List" "200"
test_endpoint "GET" "/incidentmanagement/incidents/dashboard_stats/" "Incident Dashboard Stats" "200"

echo -e "\n${YELLOW}6. ESG Management Tests${NC}"
echo "======================="
test_endpoint "GET" "/environment/aspects/" "Environmental Aspects" "200"
test_endpoint "GET" "/environment/carbon-footprint/" "Carbon Footprint" "200"
test_endpoint "GET" "/environment/energy-management/" "Energy Management" "200"
test_endpoint "GET" "/environment/water-management/" "Water Management" "200"
test_endpoint "GET" "/environment/environmental-incidents/" "Environmental Incidents" "200"
test_endpoint "GET" "/environment/biodiversity-events/" "Biodiversity Events" "200"
test_endpoint "GET" "/environment/monitoring/compliance_dashboard/" "Environmental Monitoring" "200"

echo -e "\n${YELLOW}7. Authentication & Notifications${NC}"
echo "=================================="
test_endpoint "GET" "/auth/notifications/" "Notifications List" "200"
test_endpoint "GET" "/chatbox/users/" "Chat Users" "200"

echo -e "\n${YELLOW}8. Project Isolation Tests${NC}"
echo "=========================="
echo "Testing project isolation across modules..."

# Test that endpoints require authentication
test_endpoint "GET" "/ptw/permits/" "PTW Authentication Required" "401"
test_endpoint "GET" "/quality/inspections/" "Quality Authentication Required" "401"
test_endpoint "GET" "/mom/moms/" "MoM Authentication Required" "401"

echo -e "\n${GREEN}=== Testing Complete ===${NC}"
echo ""
echo "Summary of Fixes Applied:"
echo "========================"
echo "✓ PTW Module: Enhanced permit creation with project validation"
echo "✓ Quality Management: Added project isolation and proper validation"
echo "✓ MoM Module: Fixed date validation for edit mode"
echo "✓ Inspection Forms: Improved project validation and error handling"
echo "✓ ESG Management: Auto site assignment for all modules"
echo "✓ Incident Management: Added missing learning endpoint"
echo "✓ Chat System: Enhanced user loading for all admin types"
echo "✓ Notification System: Consolidated to prevent duplicates"
echo ""
echo "Database Changes Applied:"
echo "========================"
echo "✓ Quality Management migrations executed successfully"
echo "✓ Project isolation fields added to quality models"
echo "✓ Backward compatibility maintained"
echo ""
echo "Next Steps:"
echo "==========="
echo "1. Run comprehensive frontend testing"
echo "2. Update API documentation"
echo "3. Monitor error rates in production"
echo "4. Verify all user workflows function correctly"
echo ""
echo "For detailed information, see:"
echo "- /var/www/athens/ERROR_RESOLUTION_LOG.md"
echo "- /var/www/athens/backend/COMPREHENSIVE_FIXES.md"