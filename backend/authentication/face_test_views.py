from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import logging
import os

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def test_face_recognition_setup(request):
    """
    Test face recognition library setup and basic functionality
    """
    try:
        # Test face_recognition library import
        try:
            import face_recognition
            import cv2
            import numpy as np
            from PIL import Image
            
            library_status = {
                'face_recognition': True,
                'opencv': True,
                'numpy': True,
                'pillow': True
            }
        except ImportError as e:
            return Response({
                'status': 'error',
                'message': f'Required library missing: {str(e)}',
                'library_status': {
                    'face_recognition': False,
                    'opencv': False,
                    'numpy': False,
                    'pillow': False
                }
            })
        
        # Test with uploaded image if provided
        test_image = request.FILES.get('test_image')
        if test_image:
            try:
                # Save test image temporarily
                import tempfile
                with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
                    for chunk in test_image.chunks():
                        temp_file.write(chunk)
                    temp_path = temp_file.name
                
                # Test face detection
                image = face_recognition.load_image_file(temp_path)
                face_locations = face_recognition.face_locations(image)
                face_encodings = face_recognition.face_encodings(image)
                
                # Get image info
                from PIL import Image as PILImage
                pil_image = PILImage.open(temp_path)
                image_info = {
                    'size': pil_image.size,
                    'mode': pil_image.mode,
                    'format': pil_image.format
                }
                
                # Clean up
                os.unlink(temp_path)
                
                return Response({
                    'status': 'success',
                    'message': 'Face recognition test completed',
                    'library_status': library_status,
                    'test_results': {
                        'image_loaded': True,
                        'image_info': image_info,
                        'faces_detected': len(face_locations),
                        'face_encodings_generated': len(face_encodings),
                        'face_locations': face_locations
                    }
                })
                
            except Exception as e:
                return Response({
                    'status': 'error',
                    'message': f'Face detection test failed: {str(e)}',
                    'library_status': library_status
                })
        
        # Basic library test without image
        return Response({
            'status': 'success',
            'message': 'Face recognition libraries are properly installed',
            'library_status': library_status,
            'note': 'Upload a test_image to test face detection functionality'
        })
        
    except Exception as e:
        return Response({
            'status': 'error',
            'message': f'Face recognition setup test failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_face_info(request):
    """
    Get face recognition info for the current user
    """
    try:
        from authentication.models import UserDetail, AdminDetail
        
        user = request.user
        photo_path = None
        photo_info = None
        
        # Get user's photo
        try:
            if user.user_type == 'projectadmin':
                admin_detail = AdminDetail.objects.get(user=user)
                if admin_detail.photo:
                    photo_path = admin_detail.photo.path
                    photo_info = {
                        'url': admin_detail.photo.url,
                        'name': admin_detail.photo.name,
                        'size': admin_detail.photo.size
                    }
            else:
                user_detail = UserDetail.objects.get(user=user)
                if user_detail.photo:
                    photo_path = user_detail.photo.path
                    photo_info = {
                        'url': user_detail.photo.url,
                        'name': user_detail.photo.name,
                        'size': user_detail.photo.size
                    }
        except (UserDetail.DoesNotExist, AdminDetail.DoesNotExist):
            pass
        
        if not photo_path or not os.path.exists(photo_path):
            return Response({
                'status': 'no_photo',
                'message': 'No photo found for user or photo file missing',
                'user_id': user.id,
                'username': user.username
            })
        
        # Test face detection on user's photo
        try:
            import face_recognition
            from authentication.face_recognition_utils import get_face_quality_metrics
            
            # Load and analyze user's photo
            image = face_recognition.load_image_file(photo_path)
            face_locations = face_recognition.face_locations(image)
            face_encodings = face_recognition.face_encodings(image)
            
            # Get quality metrics
            quality_result = get_face_quality_metrics(photo_path)
            
            return Response({
                'status': 'success',
                'user_info': {
                    'user_id': user.id,
                    'username': user.username,
                    'user_type': user.user_type
                },
                'photo_info': photo_info,
                'face_analysis': {
                    'faces_detected': len(face_locations),
                    'face_encodings_count': len(face_encodings),
                    'face_locations': face_locations,
                    'image_shape': image.shape
                },
                'quality_metrics': quality_result.get('metrics', {}) if quality_result.get('status') == 'success' else None
            })
            
        except Exception as e:
            return Response({
                'status': 'analysis_error',
                'message': f'Face analysis failed: {str(e)}',
                'photo_info': photo_info
            })
        
    except Exception as e:
        return Response({
            'status': 'error',
            'message': f'Failed to get user face info: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)