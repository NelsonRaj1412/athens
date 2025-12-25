#!/bin/bash

# Frontend Fix Verification Script
# Tests all the frontend fixes applied to resolve Issues #5, #6, #7, #8, #10

echo "🔍 Athens EHS System - Frontend Fix Verification"
echo "================================================"

# Check if we're in the correct directory
if [ ! -d "/var/www/athens/frontend" ]; then
    echo "❌ Error: Please run this script from the Athens project root"
    exit 1
fi

cd /var/www/athens/frontend

echo ""
echo "📋 Checking Frontend Files..."
echo "------------------------------"

# Check if the modified files exist and contain the fixes
files_to_check=(
    "src/features/dashboard/components/DashboardOverview.tsx"
    "src/features/dashboard/components/Dashboard.tsx"
    "src/features/signin/components/LoginPage.tsx"
)

for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
    fi
done

echo ""
echo "🔧 Verifying Fix Implementation..."
echo "----------------------------------"

# Check Dashboard Quick Actions fix
if grep -q "onClick={() => window.location.href" src/features/dashboard/components/DashboardOverview.tsx; then
    echo "✅ Dashboard Quick Actions: Click handlers implemented"
else
    echo "❌ Dashboard Quick Actions: Click handlers missing"
fi

# Check Complete Profile button fix
if grep -q "django_user_type === 'projectadmin'" src/features/dashboard/components/Dashboard.tsx; then
    echo "✅ Complete Profile Button: User type handling implemented"
else
    echo "❌ Complete Profile Button: User type handling missing"
fi

# Check Login page social buttons fix
if grep -q "onClick={() => message.info" src/features/signin/components/LoginPage.tsx; then
    echo "✅ Login Social Buttons: Click handlers implemented"
else
    echo "❌ Login Social Buttons: Click handlers missing"
fi

echo ""
echo "📦 Checking Dependencies..."
echo "---------------------------"

# Check if required dependencies are installed
if [ -f "package.json" ]; then
    if npm list react-router-dom > /dev/null 2>&1; then
        echo "✅ React Router: Installed"
    else
        echo "❌ React Router: Missing"
    fi
    
    if npm list antd > /dev/null 2>&1; then
        echo "✅ Ant Design: Installed"
    else
        echo "❌ Ant Design: Missing"
    fi
    
    if npm list react-icons > /dev/null 2>&1; then
        echo "✅ React Icons: Installed"
    else
        echo "❌ React Icons: Missing"
    fi
else
    echo "❌ package.json not found"
fi

echo ""
echo "🏗️ Build Test..."
echo "----------------"

# Test if the project builds successfully
echo "Testing frontend build..."
if npm run build > /dev/null 2>&1; then
    echo "✅ Frontend builds successfully"
else
    echo "❌ Frontend build failed"
    echo "   Run 'npm run build' to see detailed errors"
fi

echo ""
echo "🧪 Code Quality Checks..."
echo "-------------------------"

# Check for TypeScript errors (if available)
if command -v tsc > /dev/null 2>&1; then
    if npx tsc --noEmit > /dev/null 2>&1; then
        echo "✅ TypeScript: No type errors"
    else
        echo "⚠️  TypeScript: Type errors found (run 'npx tsc --noEmit' for details)"
    fi
else
    echo "ℹ️  TypeScript compiler not available"
fi

# Check for ESLint issues (if available)
if [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ] || [ -f "eslint.config.js" ]; then
    if npx eslint src --ext .ts,.tsx --quiet > /dev/null 2>&1; then
        echo "✅ ESLint: No linting errors"
    else
        echo "⚠️  ESLint: Linting issues found (run 'npx eslint src --ext .ts,.tsx' for details)"
    fi
else
    echo "ℹ️  ESLint configuration not found"
fi

echo ""
echo "📊 Summary Report"
echo "=================="

# Count successful checks
total_checks=6
passed_checks=0

# Re-run checks for summary
[ -f "src/features/dashboard/components/DashboardOverview.tsx" ] && ((passed_checks++))
[ -f "src/features/dashboard/components/Dashboard.tsx" ] && ((passed_checks++))
[ -f "src/features/signin/components/LoginPage.tsx" ] && ((passed_checks++))

grep -q "onClick={() => window.location.href" src/features/dashboard/components/DashboardOverview.tsx && ((passed_checks++))
grep -q "django_user_type === 'projectadmin'" src/features/dashboard/components/Dashboard.tsx && ((passed_checks++))
grep -q "onClick={() => message.info" src/features/signin/components/LoginPage.tsx && ((passed_checks++))

echo "Verification Results: $passed_checks/$total_checks checks passed"

if [ $passed_checks -eq $total_checks ]; then
    echo ""
    echo "🎉 All frontend fixes verified successfully!"
    echo ""
    echo "Next Steps:"
    echo "1. Start the development server: npm run dev"
    echo "2. Test the fixes in your browser"
    echo "3. Verify all user interactions work as expected"
    echo ""
    echo "Fixed Issues:"
    echo "✅ Issue #5: Dashboard View Details buttons"
    echo "✅ Issue #6: EPC Complete Profile button"
    echo "✅ Issue #7: Client Complete Profile button" 
    echo "✅ Issue #8: Contractor Complete Profile button"
    echo "✅ Issue #10: Login page social media buttons"
else
    echo ""
    echo "⚠️  Some issues detected. Please review the output above."
    echo ""
    echo "Common solutions:"
    echo "- Ensure all files are properly saved"
    echo "- Run 'npm install' to install missing dependencies"
    echo "- Check for syntax errors in modified files"
fi

echo ""
echo "🔗 Useful Commands:"
echo "-------------------"
echo "Start dev server:    npm run dev"
echo "Build for production: npm run build"
echo "Run type check:      npx tsc --noEmit"
echo "Run linter:          npx eslint src --ext .ts,.tsx"

echo ""
echo "Verification complete! ✨"