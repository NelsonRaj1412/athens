from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def signature_template_data(request):
    return Response({'has_template': False, 'message': 'No template available'})

class SignatureTemplateDataView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        return Response({'has_template': False, 'message': 'No template available'})