from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from authentication.models import UserDetail
import json

@csrf_exempt
@login_required
def get_fresh_template_data(request):
    """Get fresh template data without cache"""
    try:
        user_detail = UserDetail.objects.get(user=request.user)
        
        template_url = None
        if user_detail.signature_template:
            template_url = request.build_absolute_uri(user_detail.signature_template.url)
        
        return JsonResponse({
            'success': True,
            'has_template': bool(user_detail.signature_template),
            'template_url': template_url,
            'timestamp': str(user_detail.signature_template.name) if user_detail.signature_template else None
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)