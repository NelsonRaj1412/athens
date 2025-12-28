from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models_attendance import ProjectAttendance
from .serializers_attendance import ProjectAttendanceSerializer
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from .models import Project, UserDetail, AdminDetail
from django.utils import timezone
import cv2
import numpy as np
from io import BytesIO
from PIL import Image
import os
import logging

# Set up logging for face recognition debugging
logger = logging.getLogger(__name__)

# Try to import face_recognition, use fallback if not available
try:
    import face_recognition
    FACE_RECOGNITION_AVAILABLE = True
    logger.info("face_recognition library loaded successfully")
except (ImportError, SystemExit, Exception) as e:
    FACE_RECOGNITION_AVAILABLE = False
    logger.warning(f"face_recognition library not available: {e}, using basic face detection fallback")

def compare_faces(known_image_path, unknown_image_file, tolerance=0.6) -> bool:
    """
    Compare two faces using face_recognition library for accurate face matching.
    Falls back to basic face detection if face_recognition library is not available.

    Args:
        known_image_path: Path to the stored reference image
        unknown_image_file: File object or bytes of the captured image
        tolerance: Face matching tolerance (lower = more strict, default 0.6)

    Returns:
        bool: True if faces match, False otherwise
    """
    # Check if known image file exists
    if not os.path.exists(known_image_path):
        return False

    # Use proper face recognition if available
    if FACE_RECOGNITION_AVAILABLE:
        return compare_faces_advanced(known_image_path, unknown_image_file, tolerance)
    else:
        # Fallback to basic face detection with stricter validation
        logger.warning("Using basic face detection fallback - install face_recognition for better security")
        return compare_faces_basic_strict(known_image_path, unknown_image_file)

def compare_faces_advanced(known_image_path, unknown_image_file, tolerance=0.6) -> bool:
    """
    Advanced face recognition using confidence-based matching
    """
    try:
        # Load known image
        known_image = face_recognition.load_image_file(known_image_path)

        # Load unknown image from file-like object
        if hasattr(unknown_image_file, 'read'):
            image_data = unknown_image_file.read()
            unknown_image_file.seek(0)  # Reset file pointer
        else:
            image_data = unknown_image_file

        # Convert bytes to PIL Image then to numpy array
        unknown_pil_image = Image.open(BytesIO(image_data))
        unknown_image = np.array(unknown_pil_image)

        # Find face encodings in both images
        known_face_encodings = face_recognition.face_encodings(known_image)
        unknown_face_encodings = face_recognition.face_encodings(unknown_image)

        # Check if faces are detected in both images
        if len(known_face_encodings) == 0 or len(unknown_face_encodings) == 0:
            return False

        # Compare the first face in each image
        known_face_encoding = known_face_encodings[0]
        unknown_face_encoding = unknown_face_encodings[0]

        # Calculate confidence and use 70% threshold
        face_distance = face_recognition.face_distance([known_face_encoding], unknown_face_encoding)[0]
        confidence = max(0.0, 1.0 - face_distance)
        
        # Log detailed results for debugging
        logger.info(f"Face Recognition Results:")
        logger.info(f"  - Confidence: {confidence:.3f} ({confidence*100:.1f}%)")
        logger.info(f"  - Face distance: {face_distance:.3f}")
        logger.info(f"  - Known image: {known_image_path}")
        
        # Accept if confidence >= 70%
        return confidence >= 0.70

    except ImportError:
        return compare_faces_basic(known_image_path, unknown_image_file)
    except Exception as e:
        return False

def compare_faces_basic_strict(known_image_path, unknown_image_file) -> bool:
    """
    Improved basic face detection with stricter validation.
    Still not as secure as proper face recognition, but better than the original.
    """
    try:
        logger.warning("Using basic face detection - install face_recognition library for proper security!")

        # Load known image
        known_image = cv2.imread(known_image_path)
        if known_image is None:
            return False

        # Load unknown image from file-like object
        if hasattr(unknown_image_file, 'read'):
            image_data = unknown_image_file.read()
            unknown_image_file.seek(0)  # Reset file pointer
        else:
            image_data = unknown_image_file

        # Convert bytes to numpy array
        nparr = np.frombuffer(image_data, np.uint8)
        unknown_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if unknown_image is None:
            return False

        # Initialize face detector with better parameters
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

        # Convert to grayscale for face detection
        known_gray = cv2.cvtColor(known_image, cv2.COLOR_BGR2GRAY)
        unknown_gray = cv2.cvtColor(unknown_image, cv2.COLOR_BGR2GRAY)

        # Detect faces with stricter parameters
        known_faces = face_cascade.detectMultiScale(
            known_gray,
            scaleFactor=1.05,  # More strict
            minNeighbors=8,    # More strict
            minSize=(50, 50),  # Larger minimum face size
            flags=cv2.CASCADE_SCALE_IMAGE
        )
        unknown_faces = face_cascade.detectMultiScale(
            unknown_gray,
            scaleFactor=1.05,  # More strict
            minNeighbors=8,    # More strict
            minSize=(50, 50),  # Larger minimum face size
            flags=cv2.CASCADE_SCALE_IMAGE
        )


        # Check if exactly one face is detected in both images
        if len(known_faces) != 1:
            return False

        if len(unknown_faces) != 1:
            return False

        # Additional validation - compare face sizes and positions
        known_face = known_faces[0]
        unknown_face = unknown_faces[0]

        # Calculate face areas
        known_area = known_face[2] * known_face[3]
        unknown_area = unknown_face[2] * unknown_face[3]

        # Check if face sizes are reasonably similar (within 40% difference)
        size_ratio = min(known_area, unknown_area) / max(known_area, unknown_area)


        # Stricter size validation
        if size_ratio < 0.6:  # More strict than before (was 0.3)
            return False

        # Additional check - face position relative to image size
        known_img_area = known_image.shape[0] * known_image.shape[1]
        unknown_img_area = unknown_image.shape[0] * unknown_image.shape[1]

        known_face_ratio = known_area / known_img_area
        unknown_face_ratio = unknown_area / unknown_img_area

        face_ratio_diff = abs(known_face_ratio - unknown_face_ratio)


        # If face takes up very different portions of the image, likely different
        if face_ratio_diff > 0.1:  # 10% difference threshold
            return False

        return True

    except Exception as e:
        return False

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_in(request):
    user = request.user
    if user.user_type not in ['projectadmin', 'adminuser']:
        return Response({'error': 'User not authorized to check in.'}, status=status.HTTP_403_FORBIDDEN)

    project_id = request.data.get('project_id')
    latitude = request.data.get('latitude')
    longitude = request.data.get('longitude')
    photo = request.FILES.get('photo')

    if not project_id or latitude is None or longitude is None or photo is None:
        return Response({'error': 'Project ID, latitude, longitude, and photo are required.'}, status=status.HTTP_400_BAD_REQUEST)

    # Convert latitude and longitude to float if they are strings
    try:
        latitude = float(latitude)
        longitude = float(longitude)
    except (TypeError, ValueError):
        return Response({'error': 'Latitude and longitude must be valid numbers.'}, status=status.HTTP_400_BAD_REQUEST)

    project = get_object_or_404(Project, id=project_id)

    # Check if project has location coordinates set
    if project.latitude is None or project.longitude is None:
        return Response({'error': 'Project location not configured. Please contact administrator to set project coordinates.'}, status=status.HTTP_400_BAD_REQUEST)

    # Face recognition check - support both UserDetail and AdminDetail
    try:
        known_image_path = None

        # Check if user is projectadmin - look for AdminDetail photo
        if user.user_type == 'projectadmin':
            try:
                admin_detail = AdminDetail.objects.get(user=user)
                if admin_detail.photo:
                    known_image_path = admin_detail.photo.path
                else:
                    return Response({'error': 'No admin photo found for face recognition. Please update your profile photo.'}, status=status.HTTP_400_BAD_REQUEST)
            except AdminDetail.DoesNotExist:
                return Response({'error': 'Admin profile not found. Please complete your profile first.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if user is adminuser - look for UserDetail photo
        elif user.user_type == 'adminuser':
            try:
                user_detail = UserDetail.objects.get(user=user)
                if user_detail.photo:
                    known_image_path = user_detail.photo.path
                else:
                    return Response({'error': 'No user photo found for face recognition. Please update your profile photo.'}, status=status.HTTP_400_BAD_REQUEST)
            except UserDetail.DoesNotExist:
                return Response({'error': 'User profile not found. Please complete your profile first.'}, status=status.HTTP_400_BAD_REQUEST)

        else:
            return Response({'error': 'Invalid user type for attendance.'}, status=status.HTTP_400_BAD_REQUEST)

        # Perform face recognition with strict validation
        unknown_image_file = BytesIO(photo.read())
        photo.seek(0)  # Reset file pointer after reading

        # Use confidence-based matching (70% threshold)
        face_match = compare_faces(known_image_path, unknown_image_file)
        if not face_match:
            return Response({
                'error': 'Face Recognition Failed: Your face does not match the stored profile photo. Please ensure proper lighting and face the camera directly.'
            }, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        return Response({'error': f'Face recognition failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Check if user already checked in or checked out today
    today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timezone.timedelta(days=1)

    attendance_today = ProjectAttendance.objects.filter(
        user=user,
        project=project,
        check_in_time__gte=today_start,
        check_in_time__lt=today_end
    ).first()

    if attendance_today:
        if attendance_today.status == 'checked_in':
            return Response({'error': 'User already checked in. Please check out before checking in again.'}, status=status.HTTP_400_BAD_REQUEST)
        elif attendance_today.status == 'checked_out':
            return Response({'error': 'You are already checked out for today. Cannot check in again.'}, status=status.HTTP_400_BAD_REQUEST)

    attendance = ProjectAttendance(
        user=user,
        project=project,
        check_in_latitude=latitude,
        check_in_longitude=longitude,
        check_in_photo=photo,
        check_in_time=timezone.now(),
        status='checked_in',
    )

    if not attendance.is_within_radius(latitude, longitude):
        return Response({'error': 'Location Error: You are more than 300 meters away from the project location. Please move closer to the project site to check-in.'}, status=status.HTTP_400_BAD_REQUEST)

    attendance.save()

    serializer = ProjectAttendanceSerializer(attendance)
    return Response(serializer.data, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_out(request):
    user = request.user
    if user.user_type not in ['projectadmin', 'adminuser']:
        return Response({'error': 'User not authorized to check out.'}, status=status.HTTP_403_FORBIDDEN)

    project_id = request.data.get('project_id')
    latitude = request.data.get('latitude')
    longitude = request.data.get('longitude')
    photo = request.FILES.get('photo')

    if not project_id or latitude is None or longitude is None or photo is None:
        return Response({'error': 'Project ID, latitude, longitude, and photo are required.'}, status=status.HTTP_400_BAD_REQUEST)

    # Convert latitude and longitude to float if they are strings
    try:
        latitude = float(latitude)
        longitude = float(longitude)
    except (TypeError, ValueError):
        return Response({'error': 'Latitude and longitude must be valid numbers.'}, status=status.HTTP_400_BAD_REQUEST)

    project = get_object_or_404(Project, id=project_id)

    # Check if project has location coordinates set
    if project.latitude is None or project.longitude is None:
        return Response({'error': 'Project location not configured. Please contact administrator to set project coordinates.'}, status=status.HTTP_400_BAD_REQUEST)

    # Face recognition check for check-out - support both UserDetail and AdminDetail
    try:
        known_image_path = None

        # Check if user is projectadmin - look for AdminDetail photo
        if user.user_type == 'projectadmin':
            try:
                admin_detail = AdminDetail.objects.get(user=user)
                if admin_detail.photo:
                    known_image_path = admin_detail.photo.path
                else:
                    return Response({'error': 'No admin photo found for face recognition. Please update your profile photo.'}, status=status.HTTP_400_BAD_REQUEST)
            except AdminDetail.DoesNotExist:
                return Response({'error': 'Admin profile not found. Please complete your profile first.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if user is adminuser - look for UserDetail photo
        elif user.user_type == 'adminuser':
            try:
                user_detail = UserDetail.objects.get(user=user)
                if user_detail.photo:
                    known_image_path = user_detail.photo.path
                else:
                    return Response({'error': 'No user photo found for face recognition. Please update your profile photo.'}, status=status.HTTP_400_BAD_REQUEST)
            except UserDetail.DoesNotExist:
                return Response({'error': 'User profile not found. Please complete your profile first.'}, status=status.HTTP_400_BAD_REQUEST)

        else:
            return Response({'error': 'Invalid user type for attendance.'}, status=status.HTTP_400_BAD_REQUEST)

        # Perform face recognition with strict validation for check-out
        unknown_image_file = BytesIO(photo.read())
        photo.seek(0)  # Reset file pointer after reading

        # Use confidence-based matching (70% threshold)
        face_match = compare_faces(known_image_path, unknown_image_file)
        if not face_match:
            return Response({
                'error': 'Face Recognition Failed: Your face does not match the stored profile photo. Please ensure proper lighting and face the camera directly.'
            }, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        return Response({'error': f'Face recognition failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Find today's attendance with checked_in status
    today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timezone.timedelta(days=1)

    attendance = ProjectAttendance.objects.filter(
        user=user,
        project=project,
        status='checked_in',
        check_in_time__gte=today_start,
        check_in_time__lt=today_end
    ).first()

    if not attendance:
        return Response({'error': 'User has not checked in yet or already checked out today.'}, status=status.HTTP_400_BAD_REQUEST)

    if not attendance.is_within_radius(latitude, longitude):
        return Response({'error': 'Location Error: You are more than 300 meters away from the project location. Please move closer to the project site to check-out.'}, status=status.HTTP_400_BAD_REQUEST)

    attendance.check_out_latitude = latitude
    attendance.check_out_longitude = longitude
    attendance.check_out_photo = photo
    attendance.check_out_time = timezone.now()
    attendance.status = 'checked_out'

    # Calculate working time
    if attendance.check_in_time and attendance.check_out_time:
        attendance.working_time = attendance.check_out_time - attendance.check_in_time

    attendance.save()

    serializer = ProjectAttendanceSerializer(attendance)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_attendance_status(request, project_id):
    """
    Get current attendance status for the user for today
    """
    user = request.user
    if user.user_type not in ['projectadmin', 'adminuser']:
        return Response({'error': 'User not authorized.'}, status=status.HTTP_403_FORBIDDEN)

    project = get_object_or_404(Project, id=project_id)

    # Get today's attendance
    today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timezone.timedelta(days=1)

    attendance = ProjectAttendance.objects.filter(
        user=user,
        project=project,
        check_in_time__gte=today_start,
        check_in_time__lt=today_end
    ).first()

    if attendance:
        return Response({
            'status': attendance.status,
            'check_in_time': attendance.check_in_time,
            'check_out_time': attendance.check_out_time,
            'working_time': str(attendance.working_time) if attendance.working_time else None
        })
    else:
        return Response({
            'status': 'not_checked_in',
            'check_in_time': None,
            'check_out_time': None,
            'working_time': None
        })
