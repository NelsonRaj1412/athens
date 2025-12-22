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
    
    def __init__(self):
        self.template_width = 450
        self.template_height = 180
        self.logo_max_width = 120
        self.logo_max_height = 80
        
    def create_signature_template(self, user_detail):
        """
        Create a signature template for a user matching the Casey Crane format

        Args:
            user_detail: UserDetail instance

        Returns:
            tuple: (template_image_file, template_data_dict)
        """
        # Create base image with white background
        img = Image.new('RGB', (self.template_width, self.template_height), (255, 255, 255))
        draw = ImageDraw.Draw(img)
        
        # Load fonts
        try:
            name_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 24)
            detail_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
        except:
            name_font = ImageFont.load_default()
            detail_font = ImageFont.load_default()
        
        # Colors
        text_color = (0, 0, 0)  # Black text
        
        # User's full name
        full_name = f"{user_detail.user.name or ''} {user_detail.user.surname or ''}".strip()
        if not full_name:
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
                    
                    # Create logo with 50% transparency
                    logo_rgba = logo.convert('RGBA')
                    alpha = logo_rgba.split()[-1]
                    alpha = alpha.point(lambda p: int(p * 0.5))  # 50% opacity
                    logo_rgba.putalpha(alpha)
                    
                    # Center logo as background
                    logo_x = (self.template_width - logo.width) // 2
                    logo_y = (self.template_height - logo.height) // 2
                    
                    # Create background layer
                    background = Image.new('RGBA', (self.template_width, self.template_height), (255, 255, 255, 255))
                    background.paste(logo_rgba, (logo_x, logo_y), logo_rgba)
                    img = Image.alpha_composite(img.convert('RGBA'), background).convert('RGB')
                    draw = ImageDraw.Draw(img)
            except Exception as e:
                pass
        
        # Layout like Casey Crane example
        left_margin = 15
        right_margin = 180  # Start of right column
        
        # Name on left side (large, bold)
        name_y = 30
        draw.text((left_margin, name_y), full_name, font=name_font, fill=text_color)
        
        # Right side content
        right_y = 30
        line_height = 16
        
        # "Digitally signed"
        draw.text((right_margin, right_y), "Digitally signed", font=detail_font, fill=text_color)
        right_y += line_height
        
        # "by [Name]"
        draw.text((right_margin, right_y), f"by {full_name}", font=detail_font, fill=text_color)
        right_y += line_height
        
        # Date placeholder
        draw.text((right_margin, right_y), "Date: [TO_BE_FILLED]", font=detail_font, fill=text_color)
        
        # Save template to memory
        img_io = io.BytesIO()
        img.save(img_io, format='PNG', quality=95)
        img_io.seek(0)
        
        # Create template data
        template_data = {
            'user_id': user_detail.user.id,
            'full_name': full_name,
            'designation': user_detail.user.designation or '',
            'company_name': self._get_company_name(user_detail.user),
            'template_created_at': datetime.now().isoformat(),
            'template_version': '2.0'
        }
        
        # Create Django file
        filename = f"signature_template_{user_detail.user.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        template_file = ContentFile(img_io.getvalue(), name=filename)
        
        return template_file, template_data

    def create_admin_signature_template(self, admin_detail):
        """
        Create a signature template for an admin matching the Casey Crane format

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
        img = Image.new('RGB', (self.template_width, self.template_height), color=(255, 255, 255))
        draw = ImageDraw.Draw(img)

        # Load fonts
        try:
            name_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 24)
            detail_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
        except:
            name_font = ImageFont.load_default()
            detail_font = ImageFont.load_default()

        # Colors
        text_color = (0, 0, 0)  # Black text

        # Add company logo on right side as background watermark
        company_logo = self._get_company_logo(user)
        if company_logo:
            try:
                logo_img = Image.open(company_logo.path)
                # Resize logo to fit right side
                logo_size = min(120, self.template_height - 20)
                logo_img.thumbnail((logo_size, logo_size), Image.Resampling.LANCZOS)
                
                # Position logo on right side with light opacity
                logo_with_alpha = logo_img.convert('RGBA')
                alpha = logo_with_alpha.split()[-1]
                alpha = alpha.point(lambda p: int(p * 0.15))  # 15% opacity for subtle background
                logo_with_alpha.putalpha(alpha)
                
                # Position on right side
                logo_x = self.template_width - logo_img.width - 20
                logo_y = (self.template_height - logo_img.height) // 2
                img.paste(logo_with_alpha, (logo_x, logo_y), logo_with_alpha)
            except Exception as e:
                pass

        # Layout like Casey Crane example
        left_margin = 15
        right_margin = 180  # Start of right column
        
        # Name on left side (large, bold)
        name_y = 30
        draw.text((left_margin, name_y), full_name, font=name_font, fill=text_color)
        
        # Right side content
        right_y = 30
        line_height = 16
        
        # "Digitally signed"
        draw.text((right_margin, right_y), "Digitally signed", font=detail_font, fill=text_color)
        right_y += line_height
        
        # "by [Name]"
        draw.text((right_margin, right_y), f"by {full_name}", font=detail_font, fill=text_color)
        right_y += line_height
        
        # Date placeholder
        draw.text((right_margin, right_y), "Date: [TO_BE_FILLED]", font=detail_font, fill=text_color)

        # Save template to memory
        img_io = io.BytesIO()
        img.save(img_io, format='PNG', quality=95)
        img_io.seek(0)

        # Create template data
        template_data = {
            'user_id': admin_detail.user.id,
            'full_name': full_name,
            'designation': user.designation or '',
            'company_name': self._get_company_name(user),
            'template_created_at': datetime.now().isoformat(),
            'template_version': '2.0',
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
            detail_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
        except:
            detail_font = ImageFont.load_default()
        
        # Replace the date placeholder with actual timestamp
        # Format like Casey Crane: "Date: 2021.11.15 14:49:06 -0500"
        date_text = f"Date: {sign_datetime.strftime('%Y.%m.%d %H:%M:%S %z')}"
        
        # Position at right column, third line (where placeholder was)
        right_margin = 180
        date_y = 30 + (16 * 2)  # Third line in right column
        
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


def create_user_signature_template(user_detail):
    """
    Convenience function to create signature template for a user
    """
    generator = SignatureTemplateGenerator()

    template_file, template_data = generator.create_signature_template(user_detail)

    # Save to user detail
    user_detail.signature_template.save(template_file.name, template_file, save=False)
    user_detail.signature_template_data = template_data
    user_detail.save()

    return user_detail


def create_admin_signature_template(admin_detail):
    """
    Convenience function to create signature template for an admin
    """
    generator = SignatureTemplateGenerator()

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
