from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
import logging

logger = logging.getLogger(__name__)

@csrf_exempt
@api_view(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])
def comprehensive_induction_endpoint(request):
    """
    Comprehensive induction training endpoint that handles all HTTP methods
    and provides detailed debugging information
    """
    logger.info(f"Induction request: {request.method} from {getattr(request, 'user', 'anonymous')}")
    logger.info(f"Request path: {request.path}")
    
    try:
        if request.method == 'OPTIONS':
            # Handle preflight requests without authentication
            return Response(
                {'message': 'OPTIONS request handled'},
                headers={
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                }
            )
        
        # Apply authentication for all other methods
        if not request.user or not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required',
                'message': 'Please provide valid authentication credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        elif request.method == 'GET':
            # Handle GET requests - list induction trainings
            from .views import InductionTrainingViewSet
            from .serializers import InductionTrainingListSerializer
            
            try:
                viewset = InductionTrainingViewSet()
                viewset.request = request
                viewset.format_kwarg = None
                
                # Check user permissions
                if not viewset.is_epc_safety_user(request.user):
                    return Response({
                        'error': 'Access denied',
                        'message': 'Only EPC Safety Department users can access induction training.',
                        'user_type': getattr(request.user, 'admin_type', 'unknown'),
                        'user_project': request.user.project.projectName if request.user.project else None
                    }, status=status.HTTP_403_FORBIDDEN)
                
                queryset = viewset.get_queryset()
                serializer = InductionTrainingListSerializer(queryset, many=True)
                
                return Response({
                    'count': queryset.count(),
                    'results': serializer.data,
                    'message': f'Found {queryset.count()} induction trainings',
                    'user_info': {
                        'username': request.user.username,
                        'project': request.user.project.projectName if request.user.project else None,
                        'admin_type': getattr(request.user, 'admin_type', 'unknown')
                    }
                })
                
            except Exception as e:
                logger.error(f"GET request error: {e}")
                import traceback
                logger.error(traceback.format_exc())
                return Response({
                    'error': f'Failed to fetch induction trainings: {str(e)}',
                    'method': 'GET'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        elif request.method == 'POST':
            # Handle POST requests - create new induction training
            from .serializers import InductionTrainingSerializer
            from .views import InductionTrainingViewSet
            
            try:
                # Check user permissions
                viewset = InductionTrainingViewSet()
                if not viewset.is_epc_safety_user(request.user):
                    return Response({
                        'error': 'Access denied',
                        'message': 'Only EPC Safety Department users can create induction training.',
                        'user_type': getattr(request.user, 'admin_type', 'unknown')
                    }, status=status.HTTP_403_FORBIDDEN)
                
                # Check if user has a project
                if not request.user.project:
                    return Response({
                        'error': 'Project required',
                        'message': 'User must be assigned to a project to create induction training.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Prepare data
                data = request.data.copy()
                if 'description' not in data:
                    data['description'] = ''
                
                logger.info(f"Creating induction with data: {data}")
                
                # Validate and save
                serializer = InductionTrainingSerializer(data=data, context={'request': request})
                if serializer.is_valid():
                    training = serializer.save(
                        created_by=request.user,
                        project=request.user.project
                    )
                    logger.info(f"Induction training created: ID {training.id}")
                    
                    return Response({
                        'message': 'Induction training created successfully',
                        'id': training.id,
                        'data': serializer.data
                    }, status=status.HTTP_201_CREATED)
                else:
                    logger.error(f"Validation errors: {serializer.errors}")
                    return Response({
                        'error': 'Validation failed',
                        'details': serializer.errors,
                        'submitted_data': data
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
            except Exception as e:
                logger.error(f"POST request error: {e}")
                import traceback
                logger.error(traceback.format_exc())
                return Response({
                    'error': f'Failed to create induction training: {str(e)}',
                    'method': 'POST'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        elif request.method in ['PUT', 'PATCH']:
            # These methods require an ID
            return Response({
                'error': 'Method not allowed on list endpoint',
                'message': 'Use /induction/<id>/ for updating individual resources',
                'method': request.method
            }, status=status.HTTP_405_METHOD_NOT_ALLOWED)
        
        elif request.method == 'DELETE':
            # DELETE not allowed on list endpoint
            return Response({
                'error': 'Method not allowed on list endpoint',
                'message': 'Use /induction/<id>/ for deleting individual resources',
                'method': request.method
            }, status=status.HTTP_405_METHOD_NOT_ALLOWED)
        
        else:
            return Response({
                'error': 'Method not supported',
                'method': request.method,
                'supported_methods': ['GET', 'POST', 'OPTIONS']
            }, status=status.HTTP_405_METHOD_NOT_ALLOWED)
            
    except Exception as e:
        logger.error(f"Unexpected error in induction endpoint: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return Response({
            'error': f'Unexpected server error: {str(e)}',
            'method': request.method,
            'path': request.path
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)