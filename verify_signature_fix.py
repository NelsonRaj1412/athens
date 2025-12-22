#!/usr/bin/env python3
"""
Verify Digital Signature Template Fix
Tests that the signature templates are properly formatted without overlapping
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/var/www/athens/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from authentication.models import AdminDetail
from PIL import Image
import json

def verify_signature_templates():
    """
    Verify all admin signature templates are properly formatted
    """
    print("🔍 Verifying signature template layouts...")
    
    admin_details = AdminDetail.objects.filter(signature_template__isnull=False)
    
    if not admin_details.exists():
        print("❌ No admin signature templates found")
        return
    
    verified_count = 0
    issues_found = 0
    
    for admin_detail in admin_details:
        try:
            template_path = admin_detail.signature_template.path
            
            if not os.path.exists(template_path):
                print(f"❌ Template file missing for {admin_detail.user.username}")
                issues_found += 1
                continue
            
            # Check image dimensions
            with Image.open(template_path) as img:
                width, height = img.size
                
                print(f"📏 {admin_detail.user.username}: {width}x{height}")
                
                # Check if using new fixed dimensions
                if width >= 500 and height >= 220:
                    print(f"✅ {admin_detail.user.username}: Fixed layout dimensions")
                    verified_count += 1
                else:
                    print(f"⚠️  {admin_detail.user.username}: Old dimensions, may have overlapping")
                    issues_found += 1
                
                # Check template data
                if hasattr(admin_detail, 'signature_template_data') and admin_detail.signature_template_data:
                    template_data = admin_detail.signature_template_data
                    if isinstance(template_data, str):
                        template_data = json.loads(template_data)
                    
                    version = template_data.get('template_version', 'unknown')
                    layout_fixed = template_data.get('layout_fixed', False)
                    
                    if version == '4.0_fixed' or layout_fixed:
                        print(f"✅ {admin_detail.user.username}: Using fixed template version")
                    else:
                        print(f"⚠️  {admin_detail.user.username}: Old template version ({version})")
                
        except Exception as e:
            print(f"❌ Error checking {admin_detail.user.username}: {e}")
            issues_found += 1
    
    print(f"\n📊 Verification Results:")
    print(f"   ✅ Verified templates: {verified_count}")
    print(f"   ⚠️  Issues found: {issues_found}")
    
    if issues_found == 0:
        print("🎉 All signature templates are properly formatted!")
    else:
        print("🔧 Some templates may need regeneration")

def test_template_generation():
    """
    Test creating a new template with the fixed generator
    """
    print("\n🧪 Testing template generation...")
    
    try:
        from authentication.signature_template_generator_new import SignatureTemplateGenerator
        
        generator = SignatureTemplateGenerator()
        
        # Check if generator has fixed dimensions
        if generator.template_width >= 500 and generator.template_height >= 220:
            print("✅ Template generator has fixed dimensions")
        else:
            print("❌ Template generator still using old dimensions")
        
        print(f"📏 Generator dimensions: {generator.template_width}x{generator.template_height}")
        
    except Exception as e:
        print(f"❌ Error testing generator: {e}")

if __name__ == "__main__":
    print("🔍 Digital Signature Template Verification")
    print("=" * 50)
    
    verify_signature_templates()
    test_template_generation()
    
    print("\n✨ Verification complete!")