"""
Digital Signature Template Generator
Creates professional signature templates with company logo, user details, and dynamic date/time
"""

import os
import io
from PIL import Image, ImageDraw, ImageFont
from django.conf import settings
from django.core.files.base import ContentFile
from datetime import datetime
import json


class SignatureTemplateGenerator:
    """
    Generates digital signature templates with company branding
    """
    
    def __init__(self, logo_opacity=0.5):
        # Match exact .signature-content dimensions
        # Container: min-height 90px + padding 12px*2 = 114px
        # Content: 114px - content padding 8px*2 = 98px
        self.template_width = 400  # Standard width
        self.template_height = 98   # Exact .signature-content height
        self.logo_max_width = 80
        self.logo_max_height = 60
        self.logo_opacity = logo_opacity  # Configurable logo transparency (0.0 to 1.0)
        
    def create_signature_template(self, user_detail):
        """
        Create a signature template for a user in Adobe DSC style

        Args:
            user_detail: UserDetail instance

        Returns:
            tuple: (template_image_file, template_data_dict)
        """
        # Create base image with white background
        img = Image.new('RGBA', (self.template_width, self.template_height), (255, 255, 255, 255))
        
        # Load fonts with auto-sizing
        try:
            name_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
            detail_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
        except:
            name_font = ImageFont.load_default()
            detail_font = ImageFont.load_default()
        
        # Colors
        text_color = (0, 0, 0)  # Black text
        
        # User's full name
        full_name = f"{user_detail.user.name or user_detail.user.username} {user_detail.user.surname or ''}".strip()
        if not full_name or full_name == user_detail.user.username:
            full_name = user_detail.user.username
        
        # Add company logo as background watermark (50% transparency)
        company_logo = self._get_company_logo(user_detail.user)
        if company_logo:
            try:
                logo_path = company_logo.path
                if os.path.exists(logo_path):
                    logo = Image.open(logo_path)
                    # Resize logo to fit as background
                    logo_size = min(self.logo_max_width, self.logo_max_height)
                    logo.thumbnail((logo_size, logo_size), Image.Resampling.LANCZOS)
                    
                    # Create logo with configurable transparency
                    logo_rgba = logo.convert('RGBA')
                    alpha = logo_rgba.split()[-1]
                    alpha = alpha.point(lambda p: int(p * self.logo_opacity))  # Configurable opacity
                    logo_rgba.putalpha(alpha)
                    
                    # Center logo as background
                    logo_x = (self.template_width - logo.width) // 2
                    logo_y = (self.template_height - logo.height) // 2
                    
                    # Paste logo as background
                    img.paste(logo_rgba, (logo_x, logo_y), logo_rgba)
            except Exception as e:
                pass
        
        draw = ImageDraw.Draw(img)
        
        # Match exact CSS layout: .signature-content padding: 8px
        left_margin = 8   # CSS padding
        top_margin = 8    # CSS padding  
        line_height = 16  # Compact for 98px height
        
        # Name (large, bold) - matches frontend .signer-name
        draw.text((left_margin, top_margin), full_name, font=name_font, fill=text_color)
        
        # Designation below name - matches frontend .signer-designation
        if user_detail.user.designation:
            designation_y = top_margin + 24  # Compact spacing for 98px
            draw.text((left_margin, designation_y), user_detail.user.designation, font=detail_font, fill=(102, 102, 102))  # #666
        
        # Company name below designation - matches frontend .signer-company
        company_name = self._get_company_name(user_detail.user)
        if company_name:
            company_y = top_margin + 40  # Compact spacing for 98px
            draw.text((left_margin, company_y), company_name, font=detail_font, fill=(136, 136, 136))  # #888
        
        # Vertical divider line - matches frontend .signature-divider
        # CSS: flex: 0 0 1px, margin: 0 8px, position at 55% like CSS
        divider_x = int(self.template_width * 0.55)
        draw.line([(divider_x, top_margin), (divider_x, self.template_height - top_margin)], fill=(192, 192, 192), width=1)  # #c0c0c0
        
        # Right column - matches .signature-right-section
        # CSS: flex: 0 0 45%, padding-left: 8px, padding-top: 2px
        right_margin = divider_x + 8  # CSS margin + padding-left
        right_y = top_margin + 2      # CSS padding-top
        
        # "Digitally signed by"
        draw.text((right_margin, right_y), "Digitally signed by", font=detail_font, fill=text_color)
        right_y += line_height
        
        # Name again
        draw.text((right_margin, right_y), full_name, font=detail_font, fill=text_color)
        right_y += line_height
        
        # Employee ID if available
        employee_id = None
        try:
            if hasattr(user_detail, 'employee_id') and user_detail.employee_id:
                employee_id = user_detail.employee_id
        except:
            pass
            
        if employee_id:
            draw.text((right_margin, right_y), f"ID: {employee_id}", font=detail_font, fill=(51, 51, 51))  # #333
            right_y += line_height
        
        # Date placeholder
        draw.text((right_margin, right_y), "Date: [TO_BE_FILLED]", font=detail_font, fill=(51, 51, 51))  # #333
        
        # Convert back to RGB
        img = img.convert('RGB')
        
        # Save template to memory
        img_io = io.BytesIO()
        img.save(img_io, format='PNG', quality=95)
        img_io.seek(0)
        
        # Create template data
        employee_id = getattr(user_detail, 'employee_id', '') or ''
        template_data = {
            'user_id': user_detail.user.id,
            'full_name': full_name,
            'designation': user_detail.user.designation or '',
            'employee_id': employee_id,
            'company_name': self._get_company_name(user_detail.user),
            'template_created_at': datetime.now().isoformat(),
            'template_version': '3.0'
        }
        
        # Create Django file
        filename = f"signature_template_{user_detail.user.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        template_file = ContentFile(img_io.getvalue(), name=filename)
        
        return template_file, template_data

    def create_admin_signature_template(self, admin_detail):
        """
        Create a signature template for an admin in Adobe DSC style

        Args:
            admin_detail: AdminDetail instance

        Returns:
            tuple: (ContentFile, template_data_dict)
        """
        user = admin_detail.user

        # Get user information
        full_name = f"{user.name or ''} {user.surname or ''}".strip()
        if not full_name:
            full_name = user.username

        # Create image with white background
        img = Image.new('RGBA', (self.template_width, self.template_height), (255, 255, 255, 255))

        # Load fonts with auto-sizing
        try:
            name_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
            detail_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
        except:
            name_font = ImageFont.load_default()
            detail_font = ImageFont.load_default()

        # Colors
        text_color = (0, 0, 0)  # Black text

        # Add company logo as background watermark (50% transparency)
        company_logo = self._get_company_logo(user)
        if company_logo:
            try:
                logo_img = Image.open(company_logo.path)
                # Resize logo to fit as background
                logo_size = min(self.logo_max_width, self.logo_max_height)
                logo_img.thumbnail((logo_size, logo_size), Image.Resampling.LANCZOS)
                
                # Create logo with configurable transparency
                logo_rgba = logo_img.convert('RGBA')
                alpha = logo_rgba.split()[-1]
                alpha = alpha.point(lambda p: int(p * self.logo_opacity))  # Configurable opacity
                logo_rgba.putalpha(alpha)
                
                # Center logo as background
                logo_x = (self.template_width - logo_img.width) // 2
                logo_y = (self.template_height - logo_img.height) // 2
                
                # Paste logo as background
                img.paste(logo_rgba, (logo_x, logo_y), logo_rgba)
            except Exception as e:
                pass

        draw = ImageDraw.Draw(img)

        # Layout with minimal margins
        left_margin = 5
        top_margin = 10
        line_height = 20
        
        # Position text at left margin
        text_x = left_margin
        
        # Name (large, bold)
        draw.text((text_x, top_margin), full_name, font=name_font, fill=text_color)
        
        # Designation below name
        if user.designation:
            designation_y = top_margin + 35
            draw.text((text_x, designation_y), user.designation, font=detail_font, fill=text_color)
        
        # Company name below designation
        company_name = self._get_company_name(user)
        if company_name:
            company_y = top_margin + 55
            draw.text((text_x, company_y), company_name, font=detail_font, fill=text_color)
        
        # Right column for digital signature info
        right_margin = self.template_width - 180
        right_y = top_margin + 10
        
        # "Digitally signed by"
        draw.text((right_margin, right_y), "Digitally signed by", font=detail_font, fill=text_color)
        right_y += line_height
        
        # Name again
        draw.text((right_margin, right_y), full_name, font=detail_font, fill=text_color)
        right_y += line_height
        
        # Employee ID if available
        if hasattr(user, 'employee_id') and user.employee_id:
            draw.text((right_margin, right_y), f"ID: {user.employee_id}", font=detail_font, fill=text_color)
            right_y += line_height
        
        # Date placeholder
        draw.text((right_margin, right_y), "Date: [TO_BE_FILLED]", font=detail_font, fill=text_color)

        # Convert back to RGB
        img = img.convert('RGB')

        # Save template to memory
        img_io = io.BytesIO()
        img.save(img_io, format='PNG', quality=95)
        img_io.seek(0)

        # Create template data
        template_data = {
            'user_id': admin_detail.user.id,
            'full_name': full_name,
            'designation': user.designation or '',
            'employee_id': getattr(user, 'employee_id', '') or '',
            'company_name': self._get_company_name(user),
            'template_created_at': datetime.now().isoformat(),
            'template_version': '3.0',
            'template_type': 'admin'
        }

        # Create filename
        filename = f"admin_signature_template_{admin_detail.user.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        template_file = ContentFile(img_io.getvalue(), name=filename)

        return template_file, template_data

    def _get_company_logo(self, user):
        """
        Get company logo based on user type and hierarchy
        """
        # For EPC project admins, inherit from master's CompanyDetail
        if user.user_type == 'projectadmin' and user.admin_type == 'epc':
            try:
                from .models import CustomUser
                master_admin = CustomUser.objects.filter(admin_type='master').first()
                if master_admin and hasattr(master_admin, 'company_detail'):
                    company_detail = master_admin.company_detail
                    if company_detail and company_detail.company_logo:
                        return company_detail.company_logo
            except:
                pass
        
        # For other project admins, use their AdminDetail logo
        elif user.user_type == 'projectadmin':
            try:
                admin_detail = user.admin_detail
                if admin_detail and admin_detail.logo:
                    return admin_detail.logo
            except:
                pass

        # For EPCuser, inherit directly from master's CompanyDetail
        elif user.user_type == 'adminuser' and user.admin_type == 'epcuser':
            try:
                from .models import CustomUser
                master_admin = CustomUser.objects.filter(admin_type='master').first()
                if master_admin and hasattr(master_admin, 'company_detail'):
                    company_detail = master_admin.company_detail
                    if company_detail and company_detail.company_logo:
                        return company_detail.company_logo
            except:
                pass
        
        # For other admin users, get logo from their creator
        elif user.user_type == 'adminuser' and user.created_by:
            return self._get_company_logo(user.created_by)

        return None

    def _get_company_name(self, user):
        """
        Get company name based on user type and hierarchy
        """
        # For EPC project admins, inherit from master's CompanyDetail
        if user.user_type == 'projectadmin' and user.admin_type == 'epc':
            try:
                from .models import CustomUser
                master_admin = CustomUser.objects.filter(admin_type='master').first()
                if master_admin and hasattr(master_admin, 'company_detail'):
                    company_detail = master_admin.company_detail
                    if company_detail and company_detail.company_name:
                        return company_detail.company_name
            except:
                pass
        
        # For other project admins, use their company_name
        elif user.user_type == 'projectadmin':
            if user.company_name:
                return user.company_name

        # For EPCuser, inherit directly from master's CompanyDetail
        elif user.user_type == 'adminuser' and user.admin_type == 'epcuser':
            try:
                from .models import CustomUser
                master_admin = CustomUser.objects.filter(admin_type='master').first()
                if master_admin and hasattr(master_admin, 'company_detail'):
                    company_detail = master_admin.company_detail
                    if company_detail and company_detail.company_name:
                        return company_detail.company_name
            except:
                pass
        
        # For other admin users, get company name from their creator
        elif user.user_type == 'adminuser' and user.created_by:
            return self._get_company_name(user.created_by)

        return ""
    
    def generate_signed_document_signature(self, user_detail, sign_datetime=None):
        """
        Generate a signature for actual document signing with current date/time
        
        Args:
            user_detail: UserDetail instance
            sign_datetime: datetime object (defaults to now)
            
        Returns:
            ContentFile: Signature image with filled date/time
        """
        if not sign_datetime:
            sign_datetime = datetime.now()
            
        # Load the template
        if not user_detail.signature_template:
            raise ValueError("No signature template found for user")
            
        try:
            template_img = Image.open(user_detail.signature_template.path)
        except:
            raise ValueError("Could not load signature template")
        
        # Create a copy for modification
        signed_img = template_img.copy()
        draw = ImageDraw.Draw(signed_img)
        
        # Load font
        try:
            detail_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
        except:
            detail_font = ImageFont.load_default()
        
        # Replace the date placeholder with actual timestamp
        date_text = f"Date: {sign_datetime.strftime('%Y.%m.%d %H:%M:%S %z')}"
        
        # Position at right column, third line
        right_margin = self.template_width - 200
        date_y = 30 + 10 + (22 * 2)  # Third line in right column
        
        # Clear the placeholder area by drawing white rectangle
        placeholder_bbox = draw.textbbox((right_margin, date_y), "Date: [TO_BE_FILLED]", font=detail_font)
        draw.rectangle(placeholder_bbox, fill=(255, 255, 255))
        
        # Draw the actual date
        draw.text((right_margin, date_y), date_text, font=detail_font, fill=(0, 0, 0))
        
        # Save to memory
        img_io = io.BytesIO()
        signed_img.save(img_io, format='PNG', quality=95)
        img_io.seek(0)
        
        # Create filename with timestamp
        filename = f"signature_{user_detail.user.id}_{sign_datetime.strftime('%Y%m%d_%H%M%S')}.png"
        return ContentFile(img_io.getvalue(), name=filename)


def create_user_signature_template(user_detail, logo_opacity=0.5):
    """
    Convenience function to create signature template for a user
    
    Args:
        user_detail: UserDetail instance
        logo_opacity: Float between 0.0 and 1.0 for logo transparency (default: 0.5)
    """
    generator = SignatureTemplateGenerator(logo_opacity=logo_opacity)

    template_file, template_data = generator.create_signature_template(user_detail)

    # Save to user detail
    user_detail.signature_template.save(template_file.name, template_file, save=False)
    user_detail.signature_template_data = template_data
    user_detail.save()

    return user_detail


def create_admin_signature_template(admin_detail, logo_opacity=0.5):
    """
    Convenience function to create signature template for an admin
    
    Args:
        admin_detail: AdminDetail instance
        logo_opacity: Float between 0.0 and 1.0 for logo transparency (default: 0.5)
    """
    generator = SignatureTemplateGenerator(logo_opacity=logo_opacity)

    template_file, template_data = generator.create_admin_signature_template(admin_detail)

    # Save to admin detail
    admin_detail.signature_template.save(template_file.name, template_file, save=False)
    admin_detail.signature_template_data = template_data
    admin_detail.save()

    return admin_detail


def generate_document_signature(user_detail, sign_datetime=None):
    """
    Generate signature for document signing
    """
    generator = SignatureTemplateGenerator()
    return generator.generate_signed_document_signature(user_detail, sign_datetime)