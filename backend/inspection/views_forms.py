from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from django.core.exceptions import PermissionDenied
from permissions.decorators import require_permission
from .models_forms import ACCableInspectionForm, ACDBChecklistForm, HTCableChecklistForm, HTPreCommissionForm, HTPreCommissionTemplateForm, CivilWorkChecklistForm, CementRegisterForm, ConcretePourCardForm, PCCChecklistForm, BarBendingScheduleForm, BatteryChargerChecklistForm, BatteryUPSChecklistForm, BusDuctChecklistForm, ControlCableChecklistForm, ControlRoomAuditChecklistForm, EarthingChecklistForm
from .serializers_forms import ACCableInspectionFormSerializer, ACDBChecklistFormSerializer, HTCableChecklistFormSerializer, HTPreCommissionFormSerializer, HTPreCommissionTemplateFormSerializer, CivilWorkChecklistFormSerializer, CementRegisterFormSerializer, ConcretePourCardFormSerializer, PCCChecklistFormSerializer, BarBendingScheduleFormSerializer, BatteryChargerChecklistFormSerializer, BatteryUPSChecklistFormSerializer, BusDuctChecklistFormSerializer, ControlCableChecklistFormSerializer, ControlRoomAuditChecklistFormSerializer, EarthingChecklistFormSerializer
from .models import Inspection

class BaseInspectionFormViewSet(viewsets.ModelViewSet):
    """Base class for all inspection form viewsets with common functionality"""
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        user_project = getattr(user, 'project', None)
        
        queryset = self.queryset.select_related('inspection')
        
        if user_project:
            queryset = queryset.filter(inspection__project=user_project)
            
        return queryset.order_by('-created_at')
    
    def create_inspection(self, serializer, inspection_type, title, description, location_field=None, date_field=None):
        """Helper method to create inspection with proper validation"""
        user_project = getattr(self.request.user, 'project', None)
        if not user_project:
            raise ValidationError({'project': 'User must be assigned to a project to create inspections'})
        
        location = ''
        if location_field and location_field in serializer.validated_data:
            location = serializer.validated_data.get(location_field, '')
        
        scheduled_date = None
        if date_field and date_field in serializer.validated_data:
            scheduled_date = serializer.validated_data.get(date_field)
        
        return Inspection.objects.create(
            project=user_project,
            inspection_type=inspection_type,
            title=title,
            description=description,
            location=location,
            scheduled_date=scheduled_date,
            status='completed',
            priority='medium',
            inspector=self.request.user,
            created_by=self.request.user
        )
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to edit this form")
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to delete this form")
        return super().destroy(request, *args, **kwargs)

class ACCableInspectionFormViewSet(BaseInspectionFormViewSet):
    serializer_class = ACCableInspectionFormSerializer
    queryset = ACCableInspectionForm.objects.all()
    model = ACCableInspectionForm  # Required for permission decorator
    
    def perform_create(self, serializer):
        inspection = self.create_inspection(
            serializer,
            inspection_type='electrical',
            title='AC Cable Testing',
            description='AC Cable Laying (Testing)',
            location_field='block_no',
            date_field='date'
        )
        serializer.save(inspection=inspection, created_by_user=self.request.user)
class ACDBChecklistFormViewSet(viewsets.ModelViewSet):
    serializer_class = ACDBChecklistFormSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        user_project = getattr(user, 'project', None)
        
        queryset = ACDBChecklistForm.objects.select_related('inspection')
        
        if user_project:
            queryset = queryset.filter(inspection__project=user_project)
            
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        inspection = Inspection.objects.create(
            project=getattr(self.request.user, 'project', None),
            inspection_type='electrical',
            title='ACDB Checklist',
            description='LT Swgr / ACDB / DCDB / UPS panel',
            location=serializer.validated_data.get('location', ''),
            scheduled_date=serializer.validated_data.get('date_of_inspection'),
            status='completed',
            priority='medium',
            inspector=self.request.user,
            created_by=self.request.user
        )
        
        serializer.save(inspection=inspection, created_by_user=self.request.user)
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to edit this form")
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to delete this form")
        return super().destroy(request, *args, **kwargs)
class HTCableChecklistFormViewSet(viewsets.ModelViewSet):
    serializer_class = HTCableChecklistFormSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        user_project = getattr(user, 'project', None)
        
        queryset = HTCableChecklistForm.objects.select_related('inspection')
        
        if user_project:
            queryset = queryset.filter(inspection__project=user_project)
            
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        inspection = Inspection.objects.create(
            project=getattr(self.request.user, 'project', None),
            inspection_type='electrical',
            title='HT Cable Checklist',
            description='Inverter Room/Control Room Building Final Acceptance Checklist',
            location=serializer.validated_data.get('location_area', ''),
            scheduled_date=serializer.validated_data.get('date_of_audit'),
            status='completed',
            priority='medium',
            inspector=self.request.user,
            created_by=self.request.user
        )
        
        serializer.save(inspection=inspection, created_by_user=self.request.user)
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to edit this form")
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to delete this form")
        return super().destroy(request, *args, **kwargs)
class HTPreCommissionFormViewSet(viewsets.ModelViewSet):
    serializer_class = HTPreCommissionFormSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        user_project = getattr(user, 'project', None)
        
        queryset = HTPreCommissionForm.objects.select_related('inspection')
        
        if user_project:
            queryset = queryset.filter(inspection__project=user_project)
            
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        inspection = Inspection.objects.create(
            project=getattr(self.request.user, 'project', None),
            inspection_type='electrical',
            title='HT Pre-Commission',
            description='HT Cable Pre-Commissioning Checklist',
            location=serializer.validated_data.get('location', ''),
            scheduled_date=serializer.validated_data.get('date_of_test'),
            status='completed',
            priority='medium',
            inspector=self.request.user,
            created_by=self.request.user
        )
        
        serializer.save(inspection=inspection, created_by_user=self.request.user)
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to edit this form")
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to delete this form")
        return super().destroy(request, *args, **kwargs)
class HTPreCommissionTemplateFormViewSet(viewsets.ModelViewSet):
    serializer_class = HTPreCommissionTemplateFormSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        user_project = getattr(user, 'project', None)
        
        queryset = HTPreCommissionTemplateForm.objects.select_related('inspection')
        
        if user_project:
            queryset = queryset.filter(inspection__project=user_project)
            
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        inspection = Inspection.objects.create(
            project=getattr(self.request.user, 'project', None),
            inspection_type='electrical',
            title='HT Pre-Commission Template',
            description='HT Cable Pre-Commissioning Checklist Template',
            location=serializer.validated_data.get('location', ''),
            scheduled_date=serializer.validated_data.get('date_of_test'),
            status='completed',
            priority='medium',
            inspector=self.request.user,
            created_by=self.request.user
        )
        
        serializer.save(inspection=inspection, created_by_user=self.request.user)
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to edit this form")
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to delete this form")
        return super().destroy(request, *args, **kwargs)
class CivilWorkChecklistFormViewSet(viewsets.ModelViewSet):
    serializer_class = CivilWorkChecklistFormSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        user_project = getattr(user, 'project', None)
        
        queryset = CivilWorkChecklistForm.objects.select_related('inspection')
        
        if user_project:
            queryset = queryset.filter(inspection__project=user_project)
            
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        inspection = Inspection.objects.create(
            project=getattr(self.request.user, 'project', None),
            inspection_type='quality',
            title='Civil Work Checklist',
            description='Civil Work Checklist - Before Start of Work',
            location=serializer.validated_data.get('location_no', ''),
            scheduled_date=serializer.validated_data.get('date'),
            status='completed',
            priority='medium',
            inspector=self.request.user,
            created_by=self.request.user
        )
        
        serializer.save(inspection=inspection, created_by_user=self.request.user)
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to edit this form")
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to delete this form")
        return super().destroy(request, *args, **kwargs)

class CementRegisterFormViewSet(viewsets.ModelViewSet):
    serializer_class = CementRegisterFormSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        user_project = getattr(user, 'project', None)
        
        queryset = CementRegisterForm.objects.select_related('inspection')
        
        if user_project:
            queryset = queryset.filter(inspection__project=user_project)
            
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        inspection = Inspection.objects.create(
            project=getattr(self.request.user, 'project', None),
            inspection_type='quality',
            title='Cement Register',
            description='Cement Register Form',
            location=serializer.validated_data.get('project_location', ''),
            scheduled_date=None,
            status='completed',
            priority='medium',
            inspector=self.request.user,
            created_by=self.request.user
        )
        
        serializer.save(inspection=inspection, created_by_user=self.request.user)
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to edit this form")
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to delete this form")
        return super().destroy(request, *args, **kwargs)

class ConcretePourCardFormViewSet(viewsets.ModelViewSet):
    serializer_class = ConcretePourCardFormSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        user_project = getattr(user, 'project', None)
        
        queryset = ConcretePourCardForm.objects.select_related('inspection')
        
        if user_project:
            queryset = queryset.filter(inspection__project=user_project)
            
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        inspection = Inspection.objects.create(
            project=getattr(self.request.user, 'project', None),
            inspection_type='quality',
            title='Concrete Pour Card',
            description='Concrete Pour Card Form',
            location=serializer.validated_data.get('location_of_pour', ''),
            scheduled_date=serializer.validated_data.get('date'),
            status='completed',
            priority='medium',
            inspector=self.request.user,
            created_by=self.request.user
        )
        
        serializer.save(inspection=inspection, created_by_user=self.request.user)
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to edit this form")
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to delete this form")
        return super().destroy(request, *args, **kwargs)

class PCCChecklistFormViewSet(viewsets.ModelViewSet):
    serializer_class = PCCChecklistFormSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        user_project = getattr(user, 'project', None)
        
        queryset = PCCChecklistForm.objects.select_related('inspection')
        
        if user_project:
            queryset = queryset.filter(inspection__project=user_project)
            
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        inspection = Inspection.objects.create(
            project=getattr(self.request.user, 'project', None),
            inspection_type='quality',
            title='PCC Checklist',
            description='Check List for Plain Cement Concrete Work',
            location=serializer.validated_data.get('project_name', ''),
            scheduled_date=serializer.validated_data.get('date_of_checking'),
            status='completed',
            priority='medium',
            inspector=self.request.user,
            created_by=self.request.user
        )
        
        serializer.save(inspection=inspection, created_by_user=self.request.user)
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to edit this form")
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to delete this form")
        return super().destroy(request, *args, **kwargs)

class BarBendingScheduleFormViewSet(viewsets.ModelViewSet):
    serializer_class = BarBendingScheduleFormSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        user_project = getattr(user, 'project', None)
        
        queryset = BarBendingScheduleForm.objects.select_related('inspection')
        
        if user_project:
            queryset = queryset.filter(inspection__project=user_project)
            
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        inspection = Inspection.objects.create(
            project=getattr(self.request.user, 'project', None),
            inspection_type='quality',
            title='Bar Bending Schedule',
            description='Bar Bending Schedule (BBS)',
            location=serializer.validated_data.get('name_of_structure', ''),
            scheduled_date=None,
            status='completed',
            priority='medium',
            inspector=self.request.user,
            created_by=self.request.user
        )
        
        serializer.save(inspection=inspection, created_by_user=self.request.user)
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to edit this form")
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to delete this form")
        return super().destroy(request, *args, **kwargs)

class BatteryChargerChecklistFormViewSet(viewsets.ModelViewSet):
    serializer_class = BatteryChargerChecklistFormSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        user_project = getattr(user, 'project', None)
        
        queryset = BatteryChargerChecklistForm.objects.select_related('inspection')
        
        if user_project:
            queryset = queryset.filter(inspection__project=user_project)
            
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        inspection = Inspection.objects.create(
            project=getattr(self.request.user, 'project', None),
            inspection_type='electrical',
            title='Battery Charger Installation Checklist',
            description='Installation Checklist for Battery Bank & Battery Charger',
            location=serializer.validated_data.get('site_location_area', ''),
            scheduled_date=None,
            status='completed',
            priority='medium',
            inspector=self.request.user,
            created_by=self.request.user
        )
        
        serializer.save(inspection=inspection, created_by_user=self.request.user)
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to edit this form")
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to delete this form")
        return super().destroy(request, *args, **kwargs)

class BatteryUPSChecklistFormViewSet(viewsets.ModelViewSet):
    serializer_class = BatteryUPSChecklistFormSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        user_project = getattr(user, 'project', None)
        
        queryset = BatteryUPSChecklistForm.objects.select_related('inspection')
        
        if user_project:
            queryset = queryset.filter(inspection__project=user_project)
            
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        inspection = Inspection.objects.create(
            project=getattr(self.request.user, 'project', None),
            inspection_type='electrical',
            title='Battery UPS Checklist',
            description='Pre-Commissioning Checklist - Battery & UPS',
            location=serializer.validated_data.get('location', ''),
            scheduled_date=serializer.validated_data.get('date'),
            status='completed',
            priority='medium',
            inspector=self.request.user,
            created_by=self.request.user
        )
        
        serializer.save(inspection=inspection, created_by_user=self.request.user)
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to edit this form")
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to delete this form")
        return super().destroy(request, *args, **kwargs)

class BusDuctChecklistFormViewSet(viewsets.ModelViewSet):
    serializer_class = BusDuctChecklistFormSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        user_project = getattr(user, 'project', None)
        
        queryset = BusDuctChecklistForm.objects.select_related('inspection')
        
        if user_project:
            queryset = queryset.filter(inspection__project=user_project)
            
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        inspection = Inspection.objects.create(
            project=getattr(self.request.user, 'project', None),
            inspection_type='electrical',
            title='Bus Duct Checklist',
            description='Pre-Commissioning Checklist - Bus Duct and Auxiliary Transformer',
            location=serializer.validated_data.get('location', ''),
            scheduled_date=serializer.validated_data.get('date_of_testing'),
            status='completed',
            priority='medium',
            inspector=self.request.user,
            created_by=self.request.user
        )
        
        serializer.save(inspection=inspection, created_by_user=self.request.user)
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to edit this form")
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to delete this form")
        return super().destroy(request, *args, **kwargs)

class ControlCableChecklistFormViewSet(viewsets.ModelViewSet):
    serializer_class = ControlCableChecklistFormSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        user_project = getattr(user, 'project', None)
        
        queryset = ControlCableChecklistForm.objects.select_related('inspection')
        
        if user_project:
            queryset = queryset.filter(inspection__project=user_project)
            
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        inspection = Inspection.objects.create(
            project=getattr(self.request.user, 'project', None),
            inspection_type='electrical',
            title='Control Cable Checklist',
            description='Installation Checklist for Control Cable',
            location=serializer.validated_data.get('site_location_area', ''),
            scheduled_date=None,
            status='completed',
            priority='medium',
            inspector=self.request.user,
            created_by=self.request.user
        )
        
        serializer.save(inspection=inspection, created_by_user=self.request.user)
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to edit this form")
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to delete this form")
        return super().destroy(request, *args, **kwargs)

class ControlRoomAuditChecklistFormViewSet(viewsets.ModelViewSet):
    serializer_class = ControlRoomAuditChecklistFormSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        user_project = getattr(user, 'project', None)
        
        queryset = ControlRoomAuditChecklistForm.objects.select_related('inspection')
        
        if user_project:
            queryset = queryset.filter(inspection__project=user_project)
            
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        inspection = Inspection.objects.create(
            project=getattr(self.request.user, 'project', None),
            inspection_type='electrical',
            title='Control Room Audit Checklist',
            description='Control Room General Audit Checklist',
            location='Control Room',
            scheduled_date=None,
            status='completed',
            priority='medium',
            inspector=self.request.user,
            created_by=self.request.user
        )
        
        serializer.save(inspection=inspection, created_by_user=self.request.user)
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to edit this form")
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to delete this form")
        return super().destroy(request, *args, **kwargs)

class EarthingChecklistFormViewSet(viewsets.ModelViewSet):
    serializer_class = EarthingChecklistFormSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        user_project = getattr(user, 'project', None)
        
        queryset = EarthingChecklistForm.objects.select_related('inspection')
        
        if user_project:
            queryset = queryset.filter(inspection__project=user_project)
            
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        inspection = Inspection.objects.create(
            project=getattr(self.request.user, 'project', None),
            inspection_type='electrical',
            title='Table to Table Earthing Checklist',
            description='Table to Table Earthing Checklist',
            location=serializer.validated_data.get('project', ''),
            scheduled_date=serializer.validated_data.get('date'),
            status='completed',
            priority='medium',
            inspector=self.request.user,
            created_by=self.request.user
        )
        
        serializer.save(inspection=inspection, created_by_user=self.request.user)
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to edit this form")
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user_type = getattr(request.user, 'admin_type', None)
        if user_type not in ['client', 'epc', 'contractor'] or instance.created_by_user != request.user:
            raise PermissionDenied("You don't have permission to delete this form")
        return super().destroy(request, *args, **kwargs)