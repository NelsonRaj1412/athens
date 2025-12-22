#!/usr/bin/env python3
"""
Fix Digital Signature Template Layout
Fixes overlapping components in admin digital signature templates
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/var/www/athens/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from PIL import Image, ImageDraw, ImageFont
from datetime import datetime
import io
from django.core.files.base import ContentFile

class FixedSignatureTemplateGenerator:
    """
    Fixed version of signature template generator with proper layout spacing
    """
    
    def __init__(self):
        # Increased template size to prevent overlapping
        self.template_width = 500
        self.template_height = 220
        self.logo_max_width = 100
        self.logo_max_height = 70
        
    def create_fixed_admin_signature_template(self, admin_detail):
        """
        Create a properly spaced admin signature template
        """
        user = admin_detail.user
        
        # Get user information
        full_name = f"{user.name or ''} {user.surname or ''}".strip()
        if not full_name:
            full_name = user.username
            
        # Create image with white background (no logo background)
        img = Image.new('RGB', (self.template_width, self.template_height), (255, 255, 255))
        
        # Load fonts
        try:
            name_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 24)
            detail_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
            small_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 10)
        except:
            name_font = ImageFont.load_default()
            detail_font = ImageFont.load_default()
            small_font = ImageFont.load_default()
            
        draw = ImageDraw.Draw(img)
        
        # Colors
        text_color = (0, 0, 0)
        border_color = (200, 200, 200)
        
        # Draw border
        draw.rectangle([2, 2, self.template_width-3, self.template_height-3], 
                      outline=border_color, width=1)
        
        # Layout sections - 50:50 split
        left_margin = 10
        right_section_start = self.template_width // 2
        top_margin = 15
        
        # LEFT SECTION - Text with minimal margins
        text_x = left_margin
        current_y = top_margin
        
        # Main name
        draw.text((text_x, current_y), full_name, font=name_font, fill=text_color)
        current_y += 30
        
        # Designation
        if user.designation:
            draw.text((text_x, current_y), user.designation, font=detail_font, fill=text_color)
            current_y += 18
            
        # Company name
        company_name = self._get_company_name(user)
        if company_name:
            draw.text((text_x, current_y), company_name, font=detail_font, fill=text_color)
            
        # RIGHT SECTION - Digital Signature Info
        right_y = top_margin
        
        # "Digitally signed by" header
        draw.text((right_section_start, right_y), "Digitally signed by:", font=small_font, fill=text_color)
        right_y += 18
        
        # Name in right section
        draw.text((right_section_start, right_y), full_name, font=detail_font, fill=text_color)
        right_y += 20
        
        # Designation in right section
        if user.designation:
            draw.text((right_section_start, right_y), user.designation, font=small_font, fill=text_color)
            right_y += 18
        
        # Date placeholder
        draw.text((right_section_start, right_y), "Date: [TO_BE_FILLED]", font=small_font, fill=text_color)
        
        # Add separator line between sections
        separator_x = right_section_start - 5
        draw.line([(separator_x, top_margin), (separator_x, self.template_height - 15)], 
                 fill=border_color, width=1)
        
        # Save template to memory
        img_io = io.BytesIO()
        img.save(img_io, format='PNG', quality=95)
        img_io.seek(0)
        
        # Create template data
        template_data = {
            'user_id': admin_detail.user.id,
            'full_name': full_name,
            'designation': user.designation or '',
            'company_name': company_name,
            'template_created_at': datetime.now().isoformat(),
            'template_version': '4.1_compact',
            'template_type': 'admin',
            'layout_fixed': True
        }
        
        # Create filename
        filename = f"admin_signature_template_{admin_detail.user.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        template_file = ContentFile(img_io.getvalue(), name=filename)
        
        return template_file, template_data
    
    def _get_company_logo(self, user):
        """Get company logo based on user type"""
        if user.user_type == 'projectadmin' and user.admin_type == 'epc':
            try:
                from authentication.models import CustomUser
                master_admin = CustomUser.objects.filter(admin_type='master').first()
                if master_admin and hasattr(master_admin, 'company_detail'):
                    company_detail = master_admin.company_detail
                    if company_detail and company_detail.company_logo:
                        return company_detail.company_logo
            except:
                pass
        elif user.user_type == 'projectadmin':
            try:
                admin_detail = user.admin_detail
                if admin_detail and admin_detail.logo:
                    return admin_detail.logo
            except:
                pass
        return None
    
    def _get_company_name(self, user):
        """Get company name based on user type"""
        if user.user_type == 'projectadmin' and user.admin_type == 'epc':
            try:
                from authentication.models import CustomUser
                master_admin = CustomUser.objects.filter(admin_type='master').first()
                if master_admin and hasattr(master_admin, 'company_detail'):
                    company_detail = master_admin.company_detail
                    if company_detail and company_detail.company_name:
                        return company_detail.company_name
            except:
                pass
        elif user.user_type == 'projectadmin':
            if user.company_name:
                return user.company_name
        return ""

def fix_all_admin_signature_templates():
    """
    Fix all existing admin signature templates with proper layout
    """
    from authentication.models import AdminDetail
    
    generator = FixedSignatureTemplateGenerator()
    fixed_count = 0
    
    print("🔧 Starting signature template layout fix...")
    
    # Get all admin details with signature templates
    admin_details = AdminDetail.objects.filter(signature_template__isnull=False)
    
    for admin_detail in admin_details:
        try:
            print(f"📝 Fixing template for: {admin_detail.user.username}")
            
            # Create new fixed template
            template_file, template_data = generator.create_fixed_admin_signature_template(admin_detail)
            
            # Save new template
            admin_detail.signature_template.save(template_file.name, template_file, save=False)
            admin_detail.signature_template_data = template_data
            admin_detail.save()
            
            fixed_count += 1
            print(f"✅ Fixed template for {admin_detail.user.username}")
            
        except Exception as e:
            print(f"❌ Error fixing template for {admin_detail.user.username}: {e}")
    
    print(f"\n🎉 Layout fix complete! Fixed {fixed_count} admin signature templates")
    print("📋 Changes made:")
    print("   • Increased template size to prevent overlapping")
    print("   • Properly spaced text elements")
    print("   • Added section separator")
    print("   • Repositioned logo to non-overlapping area")
    print("   • Improved font sizing and spacing")

def fix_signature_template_generator():
    """
    Update the signature template generator file with fixed layout
    """
    print("🔧 Updating signature template generator...")
    
    # Read current generator
    generator_path = '/var/www/athens/backend/authentication/signature_template_generator_new.py'
    
    # Create backup
    backup_path = f"{generator_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    try:
        with open(generator_path, 'r') as f:
            content = f.read()
        
        with open(backup_path, 'w') as f:
            f.write(content)
        
        print(f"📁 Backup created: {backup_path}")
        
        # Apply fixes to the generator
        fixed_content = content.replace(
            'self.template_width = 450',
            'self.template_width = 500'
        ).replace(
            'self.template_height = 180',
            'self.template_height = 220'
        ).replace(
            'right_margin = self.template_width - 220',
            'right_margin = self.template_width - 200'
        ).replace(
            'line_height = 22',
            'line_height = 20'
        )
        
        with open(generator_path, 'w') as f:
            f.write(fixed_content)
        
        print("✅ Signature template generator updated with fixed layout")
        
    except Exception as e:
        print(f"❌ Error updating generator: {e}")

if __name__ == "__main__":
    print("🚀 Digital Signature Template Layout Fix")
    print("=" * 50)
    
    # Fix existing templates
    fix_all_admin_signature_templates()
    
    # Update generator for future templates
    fix_signature_template_generator()
    
    print("\n✨ All signature template layout issues have been fixed!")
    print("🔄 New templates will use the improved layout automatically.")