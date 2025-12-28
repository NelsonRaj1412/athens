from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.core.files.storage import default_storage
import tempfile
import os

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
        
        # Get actual confidence from face recognition
        try:
            import face_recognition
            # Load and encode both images for distance calculation
            known_image = face_recognition.load_image_file(reference_full_path)
            unknown_image = face_recognition.load_image_file(temp_captured_path)
            
            known_encodings = face_recognition.face_encodings(known_image)
            unknown_encodings = face_recognition.face_encodings(unknown_image)
            
            if len(known_encodings) > 0 and len(unknown_encodings) > 0:
                distance = face_recognition.face_distance([known_encodings[0]], unknown_encodings[0])[0]
                confidence = max(0.0, 1.0 - distance)  # Convert distance to confidence
                
                # Use confidence-based matching: accept if confidence >= 70%
                matched = confidence >= 0.70
            else:
                confidence = 0.0
                matched = False
        except:
            # Fallback to tolerance-based matching
            tolerance = 0.6
            matched = compare_faces(reference_full_path, temp_captured_path, tolerance=tolerance)
            confidence = 0.85 if matched else 0.25
        
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