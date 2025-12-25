from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import CustomUser, CompanyDetail
import logging

logger = logging.getLogger(__name__)

class EPCLogoTestView(APIView):
    """
    Test endpoint to verify EPC-centric logo logic
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Get master admin's company detail
            master_admin = CustomUser.objects.filter(admin_type='master').first()
            master_logo_url = None
            master_company_name = None
            
            if master_admin:
                company_detail = CompanyDetail.objects.filter(user=master_admin).first()
                if company_detail:
                    master_logo_url = company_detail.company_logo.url if company_detail.company_logo else None
                    master_company_name = company_detail.company_name

            # Get all EPC-related users
            epc_users = CustomUser.objects.filter(admin_type__in=['epc', 'epcuser'], is_active=True)
            
            epc_data = []
            for user in epc_users:
                epc_data.append({
                    'id': user.id,
                    'username': user.username,
                    'admin_type': user.admin_type,
                    'user_type': user.user_type,
                    'company_name': user.company_name,
                    'should_inherit_master_logo': True,
                    'master_logo_available': bool(master_logo_url)
                })

            return Response({
                'master_admin': {
                    'exists': bool(master_admin),
                    'username': master_admin.username if master_admin else None,
                    'company_logo_url': master_logo_url,
                    'company_name': master_company_name
                },
                'epc_users': epc_data,
                'epc_users_count': len(epc_data),
                'logic': 'All EPC users (epc and epcuser) should inherit master admin company logo'
            })

        except Exception as e:
            logger.error(f"Error in EPCLogoTestView: {str(e)}")
            return Response({'error': str(e)}, status=500)