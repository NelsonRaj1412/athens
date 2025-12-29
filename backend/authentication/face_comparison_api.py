from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.core.files.storage import default_storage
import tempfile
import os
import logging
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def compare_faces_api(request):
    """
    Compare captured photo with reference photo for job training attendance
    """
    captured_photo = request.FILES.get('captured_photo')
    reference_photo_url = request.data.get('reference_photo_url')
    
    if not captured_photo or not reference_photo_url:
        return Response({
            'error': 'Both captured_photo and reference_photo_url are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Import face recognition function
        from .views_attendance import compare_faces
        
        # Save captured photo temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
            for chunk in captured_photo.chunks():
                temp_file.write(chunk)
            temp_captured_path = temp_file.name
        
        # Get reference photo path from URL
        if reference_photo_url.startswith('/media/'):
            reference_path = reference_photo_url.replace('/media/', '')
            reference_full_path = default_storage.path(reference_path)
        else:
            # Handle full URLs
            reference_path = reference_photo_url.split('/media/')[-1]
            reference_full_path = default_storage.path(reference_path)
        
        # Enhanced face recognition with better error handling and debugging
        try:
            import face_recognition
            
            # Validate file paths exist
            if not os.path.exists(reference_full_path):
                logger.error(f"Reference image not found: {reference_full_path}")
                return Response({
                    'error': 'Reference image file not found',
                    'matched': False,
                    'confidence': 0.0
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not os.path.exists(temp_captured_path):
                logger.error(f"Captured image not found: {temp_captured_path}")
                return Response({
                    'error': 'Captured image file not found',
                    'matched': False,
                    'confidence': 0.0
                }, status=status.HTTP_400_BAD_REQUEST)
            
            logger.info(f"Loading reference image: {reference_full_path}")
            logger.info(f"Loading captured image: {temp_captured_path}")
            
            # Load and validate images
            try:
                known_image = face_recognition.load_image_file(reference_full_path)
                unknown_image = face_recognition.load_image_file(temp_captured_path)
                logger.info(f"Images loaded successfully - Reference: {known_image.shape}, Captured: {unknown_image.shape}")
            except Exception as img_error:
                logger.error(f"Failed to load images: {img_error}")
                return Response({
                    'error': f'Failed to load images: {str(img_error)}',
                    'matched': False,
                    'confidence': 0.0
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get face encodings with detailed logging
            logger.info("Detecting faces in reference image...")
            known_encodings = face_recognition.face_encodings(known_image)
            logger.info(f"Found {len(known_encodings)} faces in reference image")
            
            logger.info("Detecting faces in captured image...")
            unknown_encodings = face_recognition.face_encodings(unknown_image)
            logger.info(f"Found {len(unknown_encodings)} faces in captured image")
            
            if len(known_encodings) == 0:
                logger.warning("No faces detected in reference image")
                return Response({
                    'error': 'No face detected in reference image. Please ensure the reference photo shows a clear face.',
                    'matched': False,
                    'confidence': 0.0,
                    'debug_info': {
                        'reference_faces': 0,
                        'captured_faces': len(unknown_encodings)
                    }
                })
            
            if len(unknown_encodings) == 0:
                logger.warning("No faces detected in captured image")
                return Response({
                    'error': 'No face detected in captured image. Please ensure good lighting and face the camera directly.',
                    'matched': False,
                    'confidence': 0.0,
                    'debug_info': {
                        'reference_faces': len(known_encodings),
                        'captured_faces': 0
                    }
                })
            
            # Enhanced multi-encoding comparison
            best_confidence = 0.0
            best_distance = float('inf')
            comparison_results = []
            
            # Compare all face combinations to find best match
            for i, k_enc in enumerate(known_encodings):
                for j, u_enc in enumerate(unknown_encodings):
                    distance = face_recognition.face_distance([k_enc], u_enc)[0]
                    confidence = max(0.0, 1.0 - distance)
                    
                    comparison_results.append({
                        'ref_face': i,
                        'cap_face': j,
                        'distance': distance,
                        'confidence': confidence
                    })
                    
                    if confidence > best_confidence:
                        best_confidence = confidence
                        best_distance = distance
            
            logger.info(f"Best match - Confidence: {best_confidence:.3f}, Distance: {best_distance:.3f}")
            
            # Multi-criteria validation for consistency
            tolerance_match = face_recognition.compare_faces([known_encodings[0]], unknown_encodings[0], tolerance=0.6)[0]
            strict_tolerance_match = face_recognition.compare_faces([known_encodings[0]], unknown_encodings[0], tolerance=0.4)[0]
            
            # More lenient decision logic for better user experience
            conditions = [
                best_confidence >= 0.70,  # Good confidence (lowered from 0.75)
                (best_confidence >= 0.60 and tolerance_match),  # Fair confidence + tolerance
                (best_confidence >= 0.50 and strict_tolerance_match),  # Lower confidence + strict tolerance
                (best_confidence >= 0.45 and best_distance < 0.5),  # Minimum confidence + reasonable distance
            ]
            
            matched = any(conditions)
            
            # Ensure minimum confidence for display
            display_confidence = max(best_confidence, 0.1) if len(known_encodings) > 0 and len(unknown_encodings) > 0 else 0.0
            
            logger.info(f"Final result - Match: {matched}, Display Confidence: {display_confidence:.3f}")
            logger.info(f"Validation results - Conditions: {conditions}")
            
            return Response({
                'matched': matched,
                'confidence': display_confidence,
                'message': 'Face comparison completed successfully',
                'debug_info': {
                    'reference_faces': len(known_encodings),
                    'captured_faces': len(unknown_encodings),
                    'best_distance': best_distance,
                    'tolerance_match': tolerance_match,
                    'strict_tolerance_match': strict_tolerance_match,
                    'conditions_met': conditions
                }
            })
            
        except ImportError:
            logger.error("face_recognition library not available")
            return Response({
                'error': 'Face recognition library not available',
                'matched': False,
                'confidence': 0.0
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        except Exception as e:
            logger.error(f"Face recognition error: {str(e)}")
            # Fallback to basic comparison
            try:
                from .views_attendance import compare_faces
                matched = compare_faces(reference_full_path, temp_captured_path, tolerance=0.6)
                confidence = 0.75 if matched else 0.15
                
                return Response({
                    'matched': matched,
                    'confidence': confidence,
                    'message': 'Face comparison completed using fallback method',
                    'fallback_used': True
                })
            except Exception as fallback_error:
                logger.error(f"Fallback comparison also failed: {fallback_error}")
                return Response({
                    'error': f'Face comparison failed: {str(e)}',
                    'matched': False,
                    'confidence': 0.0
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Clean up temporary file
        os.unlink(temp_captured_path)
        
        return Response({
            'matched': matched,
            'confidence': confidence,
            'message': 'Face comparison completed'
        })
        
    except Exception as e:
        # Clean up temporary file if it exists
        if 'temp_captured_path' in locals():
            try:
                os.unlink(temp_captured_path)
            except:
                pass
        
        return Response({
            'error': f'Face comparison failed: {str(e)}',
            'matched': False,
            'confidence': 0.0
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)