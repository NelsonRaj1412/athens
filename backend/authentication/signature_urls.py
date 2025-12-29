from django.urls import path
from . import signature_views

urlpatterns = [
    path('signature/save/', signature_views.save_signature, name='save_signature'),
    path('signature/get/', signature_views.get_signature, name='get_signature'),
    path('signature/sign-form/', signature_views.sign_form, name='sign_form'),
    path('signature/get-form-signature/', signature_views.get_form_signature, name='get_form_signature'),
    path('signature/log-print/', signature_views.log_print_action, name='log_print_action'),
]