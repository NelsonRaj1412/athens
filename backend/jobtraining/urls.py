from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import JobTrainingViewSet, create_job_training

router = DefaultRouter()
router.register(r'', JobTrainingViewSet, basename='jobtraining')

urlpatterns = [
    # Explicit create endpoint for POST requests
    path('create/', create_job_training, name='jobtraining_create'),
    # Add deployed-workers endpoint that redirects to trained-personnel
    path('deployed-workers/', JobTrainingViewSet.as_view({'get': 'trained_personnel'}), name='deployed_workers'),
    path('', include(router.urls)),
]
