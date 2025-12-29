from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from .models import SignatureRequest
from authentication.notification_views import NotificationCreateView

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_signature(request):
    """Request signature approval from specific user"""
    try:
        form_type = request.data.get('form_type')
        form_id = request.data.get('form_id')
        signature_type = request.data.get('signature_type')
        requested_for_name = request.data.get('requested_for_name')
        requested_for_id = request.data.get('requested_for_id')
        
        if not all([form_type, form_id, signature_type, requested_for_name]):
            return Response({'error': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if request already exists
        existing = SignatureRequest.objects.filter(
            form_type=form_type,
            form_id=form_id,
            signature_type=signature_type
        ).first()
        
        if existing:
            return Response({'error': 'Signature request already exists'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create signature request
        sig_request = SignatureRequest.objects.create(
            form_type=form_type,
            form_id=form_id,
            signature_type=signature_type,
            requested_by=request.user,
            requested_for_id=requested_for_id if requested_for_id else None,
            requested_for_name=requested_for_name
        )
        
        # Send notification if user has account
        if requested_for_id:
            try:
                from authentication.models import Notification
                Notification.objects.create(
                    user_id=requested_for_id,
                    title=f"Signature Request - {signature_type.title()}",
                    message=f"You have been requested to sign {form_type} #{form_id} as {signature_type}",
                    notification_type='signature_request',
                    metadata={'signature_request_id': sig_request.id}
                )
            except Exception as e:
                print(f"Error creating notification: {e}")
        
        return Response({
            'success': True,
            'request_id': sig_request.id,
            'message': f'Signature request sent to {requested_for_name}'
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_signature(request, request_id):
    """Approve signature request"""
    try:
        sig_request = SignatureRequest.objects.get(
            id=request_id,
            requested_for=request.user,
            status='pending'
        )
        
        sig_request.status = 'approved'
        sig_request.responded_at = timezone.now()
        sig_request.save()
        
        # Apply signature to form
        from inductiontraining.models import InductionTraining
        if sig_request.form_type == 'induction':
            induction = InductionTraining.objects.get(id=sig_request.form_id)
            
            # Get user's signature
            signature_url = None
            if hasattr(request.user, 'user_detail') and request.user.user_detail.signature_template:
                signature_url = request.user.user_detail.signature_template.url
            elif hasattr(request.user, 'admin_detail') and request.user.admin_detail.signature_template:
                signature_url = request.user.admin_detail.signature_template.url
            
            if signature_url:
                current_date = timezone.now().date()
                
                if sig_request.signature_type == 'trainer':
                    induction.trainer_signature = signature_url
                elif sig_request.signature_type == 'hr':
                    induction.hr_signature = signature_url
                    induction.hr_name = sig_request.requested_for_name
                    induction.hr_date = current_date
                elif sig_request.signature_type == 'safety':
                    induction.safety_signature = signature_url
                    induction.safety_name = sig_request.requested_for_name
                    induction.safety_date = current_date
                elif sig_request.signature_type == 'dept_head':
                    induction.dept_head_signature = signature_url
                    induction.dept_head_name = sig_request.requested_for_name
                    induction.dept_head_date = current_date
                
                induction.save()
        
        return Response({'success': True, 'message': 'Signature approved and applied'})
        
    except SignatureRequest.DoesNotExist:
        return Response({'error': 'Signature request not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_signature(request, request_id):
    """Reject signature request"""
    try:
        sig_request = SignatureRequest.objects.get(
            id=request_id,
            requested_for=request.user,
            status='pending'
        )
        
        sig_request.status = 'rejected'
        sig_request.responded_at = timezone.now()
        sig_request.save()
        
        return Response({'success': True, 'message': 'Signature request rejected'})
        
    except SignatureRequest.DoesNotExist:
        return Response({'error': 'Signature request not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_worker_verified(request):
    """Mark worker as photo/image verified (no digital signature)"""
    try:
        form_type = request.data.get('form_type')
        form_id = request.data.get('form_id')
        worker_name = request.data.get('worker_name')
        
        if not all([form_type, form_id, worker_name]):
            return Response({'error': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Apply verification to form
        if form_type == 'induction':
            from inductiontraining.models import InductionTraining
            induction = InductionTraining.objects.get(id=form_id)
            
            # Set worker signature as "PHOTO VERIFIED"
            induction.worker_signature = "PHOTO VERIFIED"
            induction.worker_name = worker_name
            induction.worker_date = timezone.now().date()
            induction.save()
        
        return Response({'success': True, 'message': f'Worker {worker_name} marked as photo verified'})
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_signature_requests(request):
    """Get pending signature requests for current user"""
    try:
        requests = SignatureRequest.objects.filter(
            requested_for=request.user,
            status='pending'
        ).order_by('-created_at')
        
        data = []
        for req in requests:
            data.append({
                'id': req.id,
                'form_type': req.form_type,
                'form_id': req.form_id,
                'signature_type': req.signature_type,
                'requested_by': req.requested_by.get_full_name(),
                'created_at': req.created_at.isoformat()
            })
        
        return Response(data)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)