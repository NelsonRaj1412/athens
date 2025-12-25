from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import JobTrainingViewSet, create_job_training

router = DefaultRouter()
router.register(r'', JobTrainingViewSet, basename='jobtraining')

urlpatterns = [
    # Explicit create endpoint for POST requests
    path('create/', create_job_training, name='jobtraining_create'),
    path('', include(router.urls)),
]
