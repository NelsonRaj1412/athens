"""
API Views for Digital Signature Template Management
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from .models import UserDetail, AdminDetail
from .signature_template_generator import create_user_signature_template, create_admin_signature_template, generate_document_signature
from datetime import datetime
import json


class SignatureTemplateCreateView(APIView):
    """
    Create or regenerate signature template for the authenticated user
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            # Get or create user detail
            user_detail, created = UserDetail.objects.get_or_create(user=request.user)
            
            # Create signature template
            user_detail = create_user_signature_template(user_detail)
            
            # Build full URL for the template
            template_url = None
            if user_detail.signature_template:
                template_url = user_detail.signature_template.url
                if template_url and not template_url.startswith('http'):
                    template_url = request.build_absolute_uri(template_url)
            
            return Response({
                'success': True,
                'message': 'Signature template created successfully',
                'template_url': template_url,
                'template_data': user_detail.signature_template_data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SignatureTemplatePreviewView(APIView):
    """
    Get preview of user's signature template
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            user_detail = get_object_or_404(UserDetail, user=request.user)
            
            if not user_detail.signature_template:
                return Response({
                    'success': False,
                    'error': 'No signature template found. Please create one first.'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Build full URL for the template
            template_url = user_detail.signature_template.url
            if template_url and not template_url.startswith('http'):
                template_url = request.build_absolute_uri(template_url)
            
            return Response({
                'success': True,
                'template_url': template_url,
                'template_data': user_detail.signature_template_data,
                'created_at': user_detail.signature_template_data.get('template_created_at') if user_detail.signature_template_data else None
            })
            
        except UserDetail.DoesNotExist:
            return Response({
                'success': False,
                'error': 'User details not found'
            }, status=status.HTTP_404_NOT_FOUND)


class GenerateDocumentSignatureView(APIView):
    """
    Generate a signature for document signing with current date/time
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            user_detail = get_object_or_404(UserDetail, user=request.user)
            
            if not user_detail.signature_template:
                return Response({
                    'success': False,
                    'error': 'No signature template found. Please create one first.'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Get custom datetime if provided, otherwise use current time
            custom_datetime = request.data.get('sign_datetime')
            sign_datetime = None
            
            if custom_datetime:
                try:
                    sign_datetime = datetime.fromisoformat(custom_datetime.replace('Z', '+00:00'))
                except ValueError:
                    return Response({
                        'success': False,
                        'error': 'Invalid datetime format. Use ISO format.'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Generate signed signature
            signature_file = generate_document_signature(user_detail, sign_datetime)
            
            # Return the signature as image response
            response = HttpResponse(signature_file.read(), content_type='image/png')
            response['Content-Disposition'] = f'inline; filename="{signature_file.name}"'
            return response
            
        except UserDetail.DoesNotExist:
            return Response({
                'success': False,
                'error': 'User details not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SignatureTemplateDataView(APIView):
    """
    Get signature template configuration data
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Get or create user detail
            user_detail, created = UserDetail.objects.get_or_create(user=request.user)

            # Check if user has required data for template creation
            missing_fields = []

            if not (request.user.name and request.user.surname):
                missing_fields.append('name/surname')
            if not request.user.designation:
                missing_fields.append('designation')

            # Check for company details using the generator's helper methods
            from .signature_template_generator import SignatureTemplateGenerator
            generator = SignatureTemplateGenerator()

            company_name = generator._get_company_name(request.user)
            company_logo = generator._get_company_logo(request.user)
            
            # Get logo URL if available
            logo_url = None
            if company_logo:
                logo_url = request.build_absolute_uri(company_logo.url)

            if not company_name:
                missing_fields.append('company_name')

            return Response({
                'success': True,
                'can_create_template': len(missing_fields) == 0,
                'missing_fields': missing_fields,
                'user_data': {
                    'full_name': f"{request.user.name or ''} {request.user.surname or ''}".strip(),
                    'designation': request.user.designation or '',
                    'employee_id': getattr(request.user, 'employee_id', '') or '',
                    'company_name': company_name,
                    'has_company_logo': bool(company_logo),
                    'logo_url': logo_url
                },
                'has_existing_template': bool(user_detail.signature_template),
                'template_data': user_detail.signature_template_data
            })

        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RegenerateSignatureTemplateView(APIView):
    """
    Regenerate signature template (useful after user updates their details)
    """
    permission_classes = [IsAuthenticated]
    
    def put(self, request):
        try:
            user_detail = get_object_or_404(UserDetail, user=request.user)
            
            # Delete old template if exists
            if user_detail.signature_template:
                user_detail.signature_template.delete(save=False)
            
            # Create new template
            user_detail = create_user_signature_template(user_detail)
            
            # Build full URL for the template
            template_url = user_detail.signature_template.url
            if template_url and not template_url.startswith('http'):
                template_url = request.build_absolute_uri(template_url)
            
            return Response({
                'success': True,
                'message': 'Signature template regenerated successfully',
                'template_url': template_url,
                'template_data': user_detail.signature_template_data
            })
            
        except UserDetail.DoesNotExist:
            return Response({
                'success': False,
                'error': 'User details not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# AdminDetail Signature Template Views
# ============================================================================

class AdminSignatureTemplateCreateView(APIView):
    """
    Create or regenerate signature template for the authenticated admin
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Get or create admin detail
            admin_detail, created = AdminDetail.objects.get_or_create(user=request.user)

            # Create signature template
            admin_detail = create_admin_signature_template(admin_detail)

            # Build full URL for the template
            template_url = None
            if admin_detail.signature_template:
                template_url = admin_detail.signature_template.url
                if template_url and not template_url.startswith('http'):
                    template_url = request.build_absolute_uri(template_url)

            return Response({
                'success': True,
                'message': 'Admin signature template created successfully',
                'template_url': template_url,
                'template_data': admin_detail.signature_template_data
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminSignatureTemplatePreviewView(APIView):
    """
    Get preview of admin's signature template
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            admin_detail = get_object_or_404(AdminDetail, user=request.user)

            if not admin_detail.signature_template:
                return Response({
                    'success': False,
                    'error': 'No signature template found. Please create one first.'
                }, status=status.HTTP_404_NOT_FOUND)

            # Build full URL for the template
            template_url = admin_detail.signature_template.url
            if template_url and not template_url.startswith('http'):
                template_url = request.build_absolute_uri(template_url)

            return Response({
                'success': True,
                'template_url': template_url,
                'template_data': admin_detail.signature_template_data,
                'created_at': admin_detail.signature_template_data.get('template_created_at') if admin_detail.signature_template_data else None
            })

        except AdminDetail.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Admin details not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminSignatureTemplateDataView(APIView):
    """
    Get admin signature template configuration data
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Get or create admin detail
            admin_detail, created = AdminDetail.objects.get_or_create(user=request.user)

            # Check if user has required data for template creation
            missing_fields = []

            if not request.user.name:
                missing_fields.append('name')
            # Designation is optional for admin signatures

            # Check for company details using the generator's helper methods
            from .signature_template_generator import SignatureTemplateGenerator
            generator = SignatureTemplateGenerator()

            company_name = generator._get_company_name(request.user)
            company_logo = generator._get_company_logo(request.user)
            
            # Get logo URL if available
            logo_url = None
            if company_logo:
                logo_url = request.build_absolute_uri(company_logo.url)

            if not company_name:
                missing_fields.append('company_name')

            return Response({
                'success': True,
                'can_create_template': len(missing_fields) == 0,
                'missing_fields': missing_fields,
                'user_data': {
                    'full_name': f"{request.user.name or ''} {request.user.surname or ''}".strip(),
                    'designation': request.user.designation or '',
                    'employee_id': getattr(request.user, 'employee_id', '') or '',
                    'company_name': company_name,
                    'has_company_logo': bool(company_logo),
                    'logo_url': logo_url
                },
                'has_existing_template': bool(admin_detail.signature_template),
                'template_data': admin_detail.signature_template_data
            })

        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminRegenerateSignatureTemplateView(APIView):
    """
    Regenerate admin signature template (useful after admin updates their details)
    """
    permission_classes = [IsAuthenticated]

    def put(self, request):
        try:
            admin_detail = get_object_or_404(AdminDetail, user=request.user)

            # Delete old template if exists
            if admin_detail.signature_template:
                admin_detail.signature_template.delete(save=False)

            # Create new template
            admin_detail = create_admin_signature_template(admin_detail)

            # Build full URL for the template
            template_url = admin_detail.signature_template.url
            if template_url and not template_url.startswith('http'):
                template_url = request.build_absolute_uri(template_url)

            return Response({
                'success': True,
                'message': 'Admin signature template regenerated successfully',
                'template_url': template_url,
                'template_data': admin_detail.signature_template_data
            })

        except AdminDetail.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Admin details not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# Public Signature Template Views (for MOM participants)
# ============================================================================

class UserSignatureTemplateByIdView(APIView):
    """
    Get signature template for any user by user ID (for MOM participants)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            user_id = request.query_params.get('user_id')
            if not user_id:
                return Response({
                    'success': False,
                    'error': 'user_id parameter is required'
                }, status=status.HTTP_400_BAD_REQUEST)

            try:
                user_detail = UserDetail.objects.get(user_id=user_id)
            except UserDetail.DoesNotExist:
                return Response({
                    'success': False,
                    'error': 'User details not found'
                }, status=status.HTTP_404_NOT_FOUND)

            if not user_detail.signature_template:
                return Response({
                    'success': False,
                    'error': 'No signature template found for this user'
                }, status=status.HTTP_404_NOT_FOUND)

            # Build full URL for the template
            template_url = user_detail.signature_template.url
            if template_url and not template_url.startswith('http'):
                template_url = request.build_absolute_uri(template_url)
            
            return Response({
                'success': True,
                'template_url': template_url,
                'template_data': user_detail.signature_template_data,
                'user_id': user_id
            })

        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminSignatureTemplateByIdView(APIView):
    """
    Get admin signature template for any user by user ID (for MOM participants)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            user_id = request.query_params.get('user_id')
            if not user_id:
                return Response({
                    'success': False,
                    'error': 'user_id parameter is required'
                }, status=status.HTTP_400_BAD_REQUEST)

            try:
                admin_detail = AdminDetail.objects.get(user_id=user_id)
            except AdminDetail.DoesNotExist:
                return Response({
                    'success': False,
                    'error': 'Admin details not found'
                }, status=status.HTTP_404_NOT_FOUND)

            if not admin_detail.signature_template:
                return Response({
                    'success': False,
                    'error': 'No signature template found for this admin'
                }, status=status.HTTP_404_NOT_FOUND)

            # Build full URL for the template
            template_url = admin_detail.signature_template.url
            if template_url and not template_url.startswith('http'):
                template_url = request.build_absolute_uri(template_url)
            
            return Response({
                'success': True,
                'template_url': template_url,
                'template_data': admin_detail.signature_template_data,
                'user_id': user_id
            })

        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
