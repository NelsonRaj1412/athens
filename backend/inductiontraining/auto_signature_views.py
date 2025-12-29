from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def auto_signature_request(request, pk):
    """Auto-request signatures when attendance is completed"""
    try:
        from .models import InductionTraining
        from authentication.models import SignatureRequest, CustomUser
        
        # Get induction training
        induction = InductionTraining.objects.get(pk=pk)
        
        signature_type = request.data.get('signature_type')
        role_name = request.data.get('role_name')
        
        # Pre-configured role mappings
        role_mappings = {
            'hr': {'department': 'HR', 'admin_type': 'epc'},
            'safety': {'department': 'Safety', 'admin_type': 'epc'},
            'quality': {'department': 'Quality', 'admin_type': 'epc'}
        }
        
        if signature_type not in role_mappings:
            return Response({'error': 'Invalid signature type'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Find user by role
        role_config = role_mappings[signature_type]
        target_user = CustomUser.objects.filter(
            project=induction.project,
            department=role_config['department'],
            admin_type=role_config['admin_type'],
            is_active=True
        ).first()
        
        if not target_user:
            # Create placeholder signature for missing role
            current_date = timezone.now().date()
            
            if signature_type == 'hr':
                induction.hr_signature = "ROLE_PENDING"
                induction.hr_name = role_name
                induction.hr_date = current_date
            elif signature_type == 'safety':
                induction.safety_signature = "ROLE_PENDING"
                induction.safety_name = role_name
                induction.safety_date = current_date
            elif signature_type == 'quality':
                induction.quality_signature = "ROLE_PENDING"
                induction.quality_name = role_name
                induction.quality_date = current_date
            
            induction.save()
            
            return Response({
                'message': f'{role_name} role not assigned - marked as pending',
                'status': 'pending'
            })
        
        # Create signature request
        sig_request, created = SignatureRequest.objects.get_or_create(
            form_type='induction',
            form_id=pk,
            signature_type=signature_type,
            defaults={
                'requested_by': request.user,
                'requested_for': target_user,
                'requested_for_name': target_user.get_full_name()
            }
        )
        
        if not created and sig_request.status == 'approved':
            return Response({'message': f'{role_name} already signed'})
        
        # Send notification
        try:
            from authentication.models import Notification
            Notification.objects.create(
                user=target_user,
                title=f"Signature Required - {role_name}",
                message=f"Please sign induction training #{pk} as {role_name}",
                notification_type='signature_request',
                metadata={'signature_request_id': sig_request.id}
            )
        except Exception as e:
            print(f"Error creating notification: {e}")
        
        return Response({
            'message': f'Signature request sent to {target_user.get_full_name()}',
            'status': 'requested'
        })
        
    except InductionTraining.DoesNotExist:
        return Response({'error': 'Training not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_attendance_and_request_signatures(request, pk):
    """Complete attendance and auto-request all signatures"""
    try:
        from .models import InductionTraining
        
        induction = InductionTraining.objects.get(pk=pk)
        
        # Mark attendance as complete
        induction.attendance_completed = True
        induction.save()
        
        # Auto-request signatures from all roles
        signature_types = ['hr', 'safety', 'quality']
        results = []
        
        for sig_type in signature_types:
            try:
                # Call auto_signature_request for each type
                role_names = {'hr': 'HR Representative', 'safety': 'Safety Officer', 'quality': 'Quality Officer'}
                
                # Simulate request for auto_signature_request
                mock_request = type('MockRequest', (), {
                    'user': request.user,
                    'data': {'signature_type': sig_type, 'role_name': role_names[sig_type]}
                })()
                
                response = auto_signature_request(mock_request, pk)
                results.append(f"{role_names[sig_type]}: {response.data.get('message', 'Requested')}")
                
            except Exception as e:
                results.append(f"{sig_type}: Error - {str(e)}")
        
        return Response({
            'message': 'Attendance completed and signatures requested',
            'results': results
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)