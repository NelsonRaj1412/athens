from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InspectionViewSet, InspectionItemViewSet, InspectionReportViewSet, inspection_users
from .views_forms import ACCableInspectionFormViewSet, ACDBChecklistFormViewSet, HTCableChecklistFormViewSet, HTPreCommissionFormViewSet, HTPreCommissionTemplateFormViewSet, CivilWorkChecklistFormViewSet, CementRegisterFormViewSet, ConcretePourCardFormViewSet, PCCChecklistFormViewSet, BarBendingScheduleFormViewSet, BatteryChargerChecklistFormViewSet, BatteryUPSChecklistFormViewSet, BusDuctChecklistFormViewSet, ControlCableChecklistFormViewSet, ControlRoomAuditChecklistFormViewSet, EarthingChecklistFormViewSet

router = DefaultRouter()
router.register(r'inspections', InspectionViewSet, basename='inspection')
router.register(r'inspection-items', InspectionItemViewSet, basename='inspection-item')
router.register(r'inspection-reports', InspectionReportViewSet, basename='inspection-report')
router.register(r'ac-cable-forms', ACCableInspectionFormViewSet, basename='ac-cable-form')
router.register(r'acdb-checklist-forms', ACDBChecklistFormViewSet, basename='acdb-checklist-form')
router.register(r'ht-cable-forms', HTCableChecklistFormViewSet, basename='ht-cable-form')
router.register(r'ht-precommission-forms', HTPreCommissionFormViewSet, basename='ht-precommission-form')
router.register(r'ht-precommission-template-forms', HTPreCommissionTemplateFormViewSet, basename='ht-precommission-template-form')
router.register(r'civil-work-checklist-forms', CivilWorkChecklistFormViewSet, basename='civil-work-checklist-form')
router.register(r'cement-register-forms', CementRegisterFormViewSet, basename='cement-register-form')
router.register(r'concrete-pour-card-forms', ConcretePourCardFormViewSet, basename='concrete-pour-card-form')
router.register(r'pcc-checklist-forms', PCCChecklistFormViewSet, basename='pcc-checklist-form')
router.register(r'bar-bending-schedule-forms', BarBendingScheduleFormViewSet, basename='bar-bending-schedule-form')
router.register(r'battery-charger-checklist-forms', BatteryChargerChecklistFormViewSet, basename='battery-charger-checklist-form')
router.register(r'battery-ups-checklist-forms', BatteryUPSChecklistFormViewSet, basename='battery-ups-checklist-form')
router.register(r'bus-duct-checklist-forms', BusDuctChecklistFormViewSet, basename='bus-duct-checklist-form')
router.register(r'control-cable-checklist-forms', ControlCableChecklistFormViewSet, basename='control-cable-checklist-form')
router.register(r'control-room-audit-checklist-forms', ControlRoomAuditChecklistFormViewSet, basename='control-room-audit-checklist-form')
router.register(r'earthing-checklist-forms', EarthingChecklistFormViewSet, basename='earthing-checklist-form')

urlpatterns = [
    path('', include(router.urls)),
    path('users/', inspection_users, name='inspection-users'),
]