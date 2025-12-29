from django.urls import path
from . import signature_approval_views

urlpatterns = [
    path('', signature_approval_views.request_signature, name='request_signature'),
    path('approve/<int:request_id>/', signature_approval_views.approve_signature, name='approve_signature'),
    path('reject/<int:request_id>/', signature_approval_views.reject_signature, name='reject_signature'),
    path('worker-verify/', signature_approval_views.mark_worker_verified, name='mark_worker_verified'),
    path('pending/', signature_approval_views.get_signature_requests, name='get_signature_requests'),
]