"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.urls import path, include, re_path
from django.contrib import admin
from django.views.generic import RedirectView

from django.conf import settings
from django.conf.urls.static import static

from rest_framework.routers import DefaultRouter

urlpatterns = [
    path('admin/', admin.site.urls),
    path('authentication/', include('authentication.urls')),
    path('chatbox/', include('chatbox.urls')),
    path('worker/', include('worker.urls')),
    path('tbt/', include('tbt.urls')),
    path('induction/', include('inductiontraining.urls')),
    path('jobtraining/', include('jobtraining.urls')),
    path('man/', include('manpower.urls')),
    path('mom/', include('mom.urls')),
    path('api/v1/safetyobservation/', include('safetyobservation.urls')),
    path('api/v1/ptw/', include('ptw.urls')),
    path('api/v1/incidentmanagement/', include('incidentmanagement.urls')),
    path('api/v1/inspection/', include('inspection.urls')),
    path('api/v1/permissions/', include('permissions.urls')),
    path('system/', include('system.urls')),
    path('api/v1/environment/', include('environment.urls')),
    path('api/v1/quality/', include('quality.urls')),
    path('api/v1/voice/', include('voice_translator.urls')),
    path('api/v1/translation/', include('apps.translation.urls')),
    path('', RedirectView.as_view(url='/admin/', permanent=True)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

