from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from inductiontraining.models import InductionAttendance

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def induction_status(request):
    """
    Check if user has completed induction training
    """
    user = request.user
    
    # Master users and project admins are exempt
    if (hasattr(user, 'user_type') and user.user_type in ['master', 'projectadmin']) or \
       (hasattr(user, 'admin_type') and user.admin_type == 'master'):
        return Response({
            'hasCompleted': True,
            'isEPCSafety': False,
            'isMasterAdmin': True,
            'exemptReason': 'Master/Project Admin'
        })
    
    # EPC Safety Department is exempt
    is_epc_safety = (
        hasattr(user, 'admin_type') and user.admin_type == 'epcuser' and
        hasattr(user, 'department') and user.department and 
        'safety' in user.department.lower()
    )
    
    if is_epc_safety:
        return Response({
            'hasCompleted': True,
            'isEPCSafety': True,
            'isMasterAdmin': False,
            'exemptReason': 'EPC Safety Department'
        })
    
    # Check if user has completed induction training
    has_completed = False
    
    # For workers, check InductionAttendance by worker_id
    if hasattr(user, 'worker_profile'):
        has_completed = InductionAttendance.objects.filter(
            worker_id=user.worker_profile.id,
            status='present'
        ).exists()
    else:
        # For admin users, check by name match
        full_name = user.get_full_name()
        if full_name:
            has_completed = InductionAttendance.objects.filter(
                worker_name__icontains=full_name,
                status='present'
            ).exists()
    
    return Response({
        'hasCompleted': has_completed,
        'isEPCSafety': is_epc_safety,
        'isMasterAdmin': False,
        'userName': user.get_full_name(),
        'userType': getattr(user, 'admin_type', None)
    })