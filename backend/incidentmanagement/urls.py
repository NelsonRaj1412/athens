from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'incidents', views.IncidentViewSet, basename='incident')
router.register(r'attachments', views.IncidentAttachmentViewSet, basename='incident-attachment')
# Investigation and CAPA routes removed - using 8D methodology only

# Commercial grade endpoints
router.register(r'cost-centers', views.IncidentCostCenterViewSet, basename='cost-center')
router.register(r'learnings', views.IncidentLearningViewSet, basename='learning')

# 8D Methodology endpoints
router.register(r'8d-processes', views.EightDProcessViewSet, basename='8d-process')
router.register(r'8d-teams', views.EightDTeamViewSet, basename='8d-team')
router.register(r'8d-containment-actions', views.EightDContainmentActionViewSet, basename='8d-containment-action')
router.register(r'8d-root-causes', views.EightDRootCauseViewSet, basename='8d-root-cause')
router.register(r'8d-analysis-methods', views.EightDAnalysisMethodViewSet, basename='8d-analysis-method')
router.register(r'8d-corrective-actions', views.EightDCorrectiveActionViewSet, basename='8d-corrective-action')
router.register(r'8d-prevention-actions', views.EightDPreventionActionViewSet, basename='8d-prevention-action')

# Custom URL patterns for nested resources
custom_patterns = [
    path('incidents/<uuid:incident_id>/learning/', views.IncidentLearningDetailView.as_view(), name='incident-learning-detail'),
]

urlpatterns = [
    path('', include(router.urls)),
] + custom_patterns
