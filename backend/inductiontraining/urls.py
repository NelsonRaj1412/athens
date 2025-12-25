from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InductionTrainingViewSet
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def create_induction_post(request):
    from .serializers import InductionTrainingSerializer, InductionTrainingListSerializer
    from .views import InductionTrainingViewSet
    import logging
    logger = logging.getLogger(__name__)
    
    if request.method == 'GET':
        # Handle GET requests for listing induction trainings
        try:
            viewset = InductionTrainingViewSet()
            viewset.request = request
            queryset = viewset.get_queryset()
            serializer = InductionTrainingListSerializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Exception in GET induction list: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'POST':
        # Handle POST requests for creating induction trainings
        try:
            logger.info(f"Induction training POST request from user: {request.user}")
            logger.info(f"Request data: {request.data}")
            
            # Add required fields that might be missing
            data = request.data.copy()
            if 'description' not in data:
                data['description'] = ''
            
            serializer = InductionTrainingSerializer(data=data, context={'request': request})
            if serializer.is_valid():
                user_project = getattr(request.user, 'project', None)
                training = serializer.save(created_by=request.user, project=user_project)
                logger.info(f"Induction training created successfully: {training.id}")
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                logger.error(f"Validation errors: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Exception in create_induction_post: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def initiated_workers(request):
    from .views import InductionTrainingViewSet
    viewset = InductionTrainingViewSet()
    viewset.request = request
    return viewset.initiated_workers(request)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def attendance_view(request, pk):
    try:
        from .models import InductionTraining
        from .serializers import InductionAttendanceSerializer
        
        # Get the induction training object
        induction = InductionTraining.objects.get(pk=pk)
        
        if request.method == 'GET':
            # Return attendance records for the induction training
            from .models import InductionAttendance
            attendance_qs = InductionAttendance.objects.filter(induction=induction)
            serializer = InductionAttendanceSerializer(attendance_qs, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            # Handle attendance submission
            from .views import InductionTrainingViewSet
            viewset = InductionTrainingViewSet()
            viewset.request = request
            viewset.kwargs = {'pk': pk}
            return viewset.attendance(request, pk)
            
    except InductionTraining.DoesNotExist:
        return Response({'error': 'Induction training not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

router = DefaultRouter()
router.register(r'manage', InductionTrainingViewSet, basename='induction')

urlpatterns = [
    path('', create_induction_post),
    path('initiated-workers/', initiated_workers),
    path('<int:pk>/attendance/', attendance_view),
    path('manage/', include(router.urls)),
]
