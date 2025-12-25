from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import CustomUser
from .permissions import IsMasterAdmin
import logging

logger = logging.getLogger(__name__)

class MasterAdminDeleteAdminUserView(APIView):
    """
    Master admin can delete admin users (clientuser, epcuser, contractoruser)
    """
    permission_classes = [IsAuthenticated, IsMasterAdmin]

    def delete(self, request, user_id):
        try:
            user = CustomUser.objects.get(id=user_id, user_type='adminuser')
        except CustomUser.DoesNotExist:
            return Response({'error': 'Admin user not found'}, status=status.HTTP_404_NOT_FOUND)
        
        try:
            username = user.username
            user.delete()
            logger.info(f"Admin user {username} (ID: {user_id}) deleted by master admin {request.user.username}")
            return Response({'message': f'Admin user {username} deleted successfully'}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error deleting admin user {user_id}: {str(e)}")
            return Response({'error': 'Failed to delete admin user'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)