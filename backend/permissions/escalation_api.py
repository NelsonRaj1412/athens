from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.contenttypes.models import ContentType
from django.apps import apps
from permissions.escalation import restrict_creator_access_on_escalation

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def escalate_item(request):
    """
    Escalate an item to the next level (project admin only)
    """
    if request.user.user_type != 'projectadmin':
        return Response({'error': 'Only project administrators can escalate items'}, status=403)
    
    app_label = request.data.get('app_label')
    model_name = request.data.get('model_name')
    object_id = request.data.get('object_id')
    
    if not all([app_label, model_name, object_id]):
        return Response({'error': 'app_label, model_name, and object_id are required'}, status=400)
    
    try:
        model_class = apps.get_model(app_label, model_name)
        obj = model_class.objects.get(pk=object_id)
        
        # Check if object has escalation_level
        if not hasattr(obj, 'escalation_level'):
            return Response({'error': 'Object does not support escalation'}, status=400)
        
        old_level = obj.escalation_level
        obj.escalation_level = min(obj.escalation_level + 1, 5)
        obj._skip_escalation = True  # Prevent auto-escalation during save
        obj.save()
        
        # Restrict creator access if escalated from level 1
        if old_level <= 1 and obj.escalation_level > 1:
            restrict_creator_access_on_escalation(obj)
        
        return Response({
            'message': f'Item escalated from level {old_level} to {obj.escalation_level}',
            'escalation_level': obj.escalation_level
        })
        
    except model_class.DoesNotExist:
        return Response({'error': 'Object not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)