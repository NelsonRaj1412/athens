from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Q, Avg, Max, Min, F
from django.utils import timezone
from django.http import HttpResponse, JsonResponse
from datetime import datetime, timedelta
import json
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from .permissions import ESGPermission
from .models import (
    EnvironmentAspect, GenerationData, EmissionFactor,
    GHGActivity, WasteManifest, BiodiversityEvent,
    ESGPolicy, Grievance, EnvironmentalMonitoring,
    CarbonFootprint, WaterManagement, EnergyManagement,
    EnvironmentalIncident, SustainabilityTarget
)
from .serializers import (
    EnvironmentAspectSerializer, GenerationDataSerializer, EmissionFactorSerializer,
    GHGActivitySerializer, WasteManifestSerializer, BiodiversityEventSerializer,
    ESGPolicySerializer, GrievanceSerializer, EnvironmentalMonitoringSerializer,
    CarbonFootprintSerializer, WaterManagementSerializer, EnergyManagementSerializer,
    EnvironmentalIncidentSerializer, SustainabilityTargetSerializer
)

class EnvironmentAspectViewSet(viewsets.ModelViewSet):
    serializer_class = EnvironmentAspectSerializer
    permission_classes = [IsAuthenticated, ESGPermission]
    
    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'project') and user.project:
            return EnvironmentAspect.objects.filter(site=user.project)
        return EnvironmentAspect.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, site=self.request.user.project)
    
    @action(detail=False, methods=['get'])
    def analytics(self, request):
        queryset = self.get_queryset()
        
        risk_distribution = {
            'low': queryset.filter(significance__lte=4).count(),
            'medium': queryset.filter(significance__gt=4, significance__lte=8).count(),
            'high': queryset.filter(significance__gt=8, significance__lte=12).count(),
            'critical': queryset.filter(significance__gt=12).count()
        }
        
        aspect_types = queryset.values('aspect_type').annotate(count=Count('id'))
        
        return Response({
            'total_aspects': queryset.count(),
            'risk_distribution': risk_distribution,
            'aspect_types': list(aspect_types),
            'iso_14001_relevant': queryset.filter(iso_14001_relevant=True).count(),
            'legal_requirements': queryset.filter(legal_requirement=True).count()
        })

class GenerationDataViewSet(viewsets.ModelViewSet):
    serializer_class = GenerationDataSerializer
    permission_classes = [IsAuthenticated, ESGPermission]
    
    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'project') and user.project:
            return GenerationData.objects.filter(site=user.project).order_by('-timestamp')
        return GenerationData.objects.none()
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        queryset = self.get_queryset()
        today = timezone.now().date()
        
        # Today's generation
        today_generation = queryset.filter(timestamp__date=today).aggregate(
            total=Sum('kwh')
        )['total'] or 0
        
        # This month's generation
        month_start = today.replace(day=1)
        month_generation = queryset.filter(timestamp__date__gte=month_start).aggregate(
            total=Sum('kwh')
        )['total'] or 0
        
        # Asset breakdown
        asset_breakdown = queryset.values('asset_type').annotate(
            total=Sum('kwh'),
            count=Count('id')
        )
        
        return Response({
            'today_generation': today_generation,
            'month_generation': month_generation,
            'asset_breakdown': list(asset_breakdown)
        })

class EmissionFactorViewSet(viewsets.ModelViewSet):
    queryset = EmissionFactor.objects.filter(is_active=True)
    serializer_class = EmissionFactorSerializer

class GHGActivityViewSet(viewsets.ModelViewSet):
    serializer_class = GHGActivitySerializer
    permission_classes = [IsAuthenticated, ESGPermission]
    
    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'project') and user.project:
            return GHGActivity.objects.filter(site=user.project).order_by('-created_at')
        return GHGActivity.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, site=self.request.user.project)
    
    @action(detail=False, methods=['get'])
    def emissions_summary(self, request):
        queryset = self.get_queryset()
        
        # Scope breakdown
        scope_breakdown = queryset.values('category_scope').annotate(
            total_co2e=Sum('ghg_co2e')
        )
        
        # Monthly trend (last 12 months)
        twelve_months_ago = timezone.now().date() - timedelta(days=365)
        monthly_trend = queryset.filter(
            period_start__gte=twelve_months_ago
        ).extra(
            select={'month': "DATE_TRUNC('month', period_start)"}
        ).values('month').annotate(
            total_co2e=Sum('ghg_co2e')
        ).order_by('month')
        
        return Response({
            'scope_breakdown': list(scope_breakdown),
            'monthly_trend': list(monthly_trend)
        })

class WasteManifestViewSet(viewsets.ModelViewSet):
    serializer_class = WasteManifestSerializer
    permission_classes = [IsAuthenticated, ESGPermission]
    
    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'project') and user.project:
            return WasteManifest.objects.filter(site=user.project).order_by('-created_at')
        return WasteManifest.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, site=self.request.user.project)

class BiodiversityEventViewSet(viewsets.ModelViewSet):
    serializer_class = BiodiversityEventSerializer
    permission_classes = [IsAuthenticated, ESGPermission]
    
    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'project') and user.project:
            return BiodiversityEvent.objects.filter(site=user.project).order_by('-created_at')
        return BiodiversityEvent.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, site=self.request.user.project)

class ESGPolicyViewSet(viewsets.ModelViewSet):
    queryset = ESGPolicy.objects.all().order_by('-created_at')
    serializer_class = ESGPolicySerializer
    permission_classes = [IsAuthenticated, ESGPermission]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    def update(self, request, *args, **kwargs):
        """Override update to handle date validation issues"""
        try:
            # Get the instance
            instance = self.get_object()
            
            # Handle date fields properly
            data = request.data.copy()
            if 'effective_date' in data and data['effective_date']:
                # Ensure date is in proper format
                from datetime import datetime
                if isinstance(data['effective_date'], str):
                    try:
                        # Try to parse the date
                        datetime.strptime(data['effective_date'], '%Y-%m-%d')
                    except ValueError:
                        return Response(
                            {'effective_date': ['Date must be in YYYY-MM-DD format']},
                            status=status.HTTP_400_BAD_REQUEST
                        )
            
            serializer = self.get_serializer(instance, data=data, partial=kwargs.get('partial', False))
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': f'Update failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

class GrievanceViewSet(viewsets.ModelViewSet):
    serializer_class = GrievanceSerializer
    
    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'project') and user.project:
            return Grievance.objects.filter(site=user.project).order_by('-created_at')
        return Grievance.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(site=self.request.user.project)

class ESGReportViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Generate ESG report based on type and date range"""
        report_type = request.data.get('report_type')
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        
        if not all([report_type, start_date, end_date]):
            return Response(
                {'error': 'report_type, start_date, and end_date are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate report data based on type
        report_data = self._generate_report_data(request.user, report_type, start_date, end_date)
        
        return Response({
            'message': f'{report_type.upper()} report generation initiated',
            'report_id': f'{report_type}_{start_date}_{end_date}',
            'status': 'processing',
            'estimated_completion': '2-5 minutes'
        })
    
    @action(detail=False, methods=['get'])
    def debug(self, request):
        """Debug endpoint to help identify frontend calls"""
        return Response({
            'message': 'ESG Reports API is working',
            'available_endpoints': [
                'GET /api/v1/environment/reports/ - List all reports',
                'GET /api/v1/environment/reports/{id}/ - Get specific report',
                'GET /api/v1/environment/reports/{id}/view/ - Alternative view endpoint',
                'GET /api/v1/environment/reports/{id}/download/ - Download report'
            ],
            'sample_reports': [1, 2]
        })
    
    def list(self, request):
        """List available reports"""
        # Mock data for existing reports
        reports = [
            {
                'id': 1,
                'report_type': 'BRSR Report',
                'period': 'Q4 2023',
                'status': 'Generated',
                'generated_date': '2024-01-15',
                'size': '2.3 MB'
            },
            {
                'id': 2,
                'report_type': 'GHG Inventory',
                'period': 'Dec 2023',
                'status': 'Generated',
                'generated_date': '2024-01-10',
                'size': '1.8 MB'
            }
        ]
        return Response(reports)
    
    def retrieve(self, request, pk=None):
        """Get specific report details"""
        # Mock data for specific report
        reports = {
            '1': {
                'id': 1,
                'report_type': 'BRSR Report',
                'period': 'Q4 2023',
                'status': 'Generated',
                'generated_date': '2024-01-15',
                'size': '2.3 MB',
                'description': 'Business Responsibility and Sustainability Report for Q4 2023',
                'sections': [
                    'Environmental Performance',
                    'Social Impact',
                    'Governance Metrics',
                    'Stakeholder Engagement'
                ],
                'download_url': f'/api/v1/environment/reports/{pk}/download/'
            },
            '2': {
                'id': 2,
                'report_type': 'GHG Inventory',
                'period': 'Dec 2023',
                'status': 'Generated',
                'generated_date': '2024-01-10',
                'size': '1.8 MB',
                'description': 'Greenhouse Gas Emissions Inventory for December 2023',
                'sections': [
                    'Scope 1 Emissions',
                    'Scope 2 Emissions',
                    'Scope 3 Emissions',
                    'Carbon Footprint Analysis'
                ],
                'download_url': f'/api/v1/environment/reports/{pk}/download/'
            }
        }
        
        report = reports.get(str(pk))
        if not report:
            return Response(
                {'error': 'Report not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response(report)
    
    @action(detail=True, methods=['get'])
    def view(self, request, pk=None):
        """Alternative view endpoint for frontend compatibility"""
        return self.retrieve(request, pk)
    
    @action(detail=True, methods=['get'])
    def details(self, request, pk=None):
        """Details endpoint for frontend compatibility"""
        return self.retrieve(request, pk)
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download generated report"""
        # Create a simple PDF report
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        
        # Add content to PDF
        p.drawString(100, 750, f"ESG Report - ID: {pk}")
        p.drawString(100, 730, f"Generated on: {timezone.now().strftime('%Y-%m-%d %H:%M')}")
        p.drawString(100, 710, "This is a sample ESG report.")
        
        p.showPage()
        p.save()
        
        buffer.seek(0)
        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="esg_report_{pk}.pdf"'
        
        return response
    
    def _generate_report_data(self, user, report_type, start_date, end_date):
        """Generate report data based on type and date range"""
        site = getattr(user, 'project', None)
        
        if report_type == 'brsr':
            return self._generate_brsr_data(site, start_date, end_date)
        elif report_type == 'ghg':
            return self._generate_ghg_data(site, start_date, end_date)
        elif report_type == 'environmental':
            return self._generate_environmental_data(site, start_date, end_date)
        elif report_type == 'safety':
            return self._generate_safety_data(site, start_date, end_date)
        elif report_type == 'sustainability':
            return self._generate_sustainability_data(site, start_date, end_date)
        else:
            return {}
    
    def _generate_brsr_data(self, site, start_date, end_date):
        """Generate BRSR report data"""
        return {
            'report_type': 'BRSR',
            'period': f'{start_date} to {end_date}',
            'environmental_metrics': {},
            'social_metrics': {},
            'governance_metrics': {}
        }
    
    def _generate_ghg_data(self, site, start_date, end_date):
        """Generate GHG inventory data"""
        ghg_activities = GHGActivity.objects.filter(
            site=site,
            period_start__gte=start_date,
            period_end__lte=end_date
        ) if site else GHGActivity.objects.none()
        
        return {
            'report_type': 'GHG Inventory',
            'total_emissions': ghg_activities.aggregate(Sum('ghg_co2e'))['ghg_co2e__sum'] or 0,
            'scope_breakdown': list(ghg_activities.values('category_scope').annotate(
                total=Sum('ghg_co2e')
            ))
        }
    
    def _generate_environmental_data(self, site, start_date, end_date):
        """Generate environmental report data"""
        return {
            'report_type': 'Environmental Report',
            'period': f'{start_date} to {end_date}',
            'aspects': {},
            'generation': {},
            'waste': {}
        }
    
    def _generate_safety_data(self, site, start_date, end_date):
        """Generate safety performance data"""
        return {
            'report_type': 'Safety Performance',
            'period': f'{start_date} to {end_date}',
            'incidents': {},
            'observations': {}
        }
    
    def _generate_sustainability_data(self, site, start_date, end_date):
        """Generate sustainability report data"""
        return {
            'report_type': 'Sustainability Report',
            'period': f'{start_date} to {end_date}',
            'environmental': {},
            'social': {},
            'economic': {}
        }

# === ADVANCED ENVIRONMENTAL VIEWSETS ===

class EnvironmentalMonitoringViewSet(viewsets.ModelViewSet):
    serializer_class = EnvironmentalMonitoringSerializer
    permission_classes = [IsAuthenticated, ESGPermission]
    
    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'project') and user.project:
            return EnvironmentalMonitoring.objects.filter(site=user.project).order_by('-measurement_date')
        return EnvironmentalMonitoring.objects.none()
    
    def perform_create(self, serializer):
        if not serializer.validated_data.get('site') and hasattr(self.request.user, 'project'):
            serializer.validated_data['site'] = self.request.user.project
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def compliance_dashboard(self, request):
        """Get compliance dashboard data for environmental monitoring"""
        queryset = self.get_queryset()
        
        # Calculate compliance metrics
        total_measurements = queryset.count()
        compliant_measurements = queryset.filter(compliance_status='compliant').count()
        warning_measurements = queryset.filter(compliance_status='warning').count()
        exceeded_measurements = queryset.filter(compliance_status='exceeded').count()
        critical_measurements = queryset.filter(compliance_status='critical').count()
        
        # Parameter breakdown
        parameter_breakdown = queryset.values('parameter').annotate(
            total_count=Count('id'),
            compliant_count=Count('id', filter=Q(compliance_status='compliant')),
            avg_value=Avg('value')
        )
        
        return Response({
            'total_measurements': total_measurements,
            'compliance_summary': {
                'compliant': compliant_measurements,
                'warning': warning_measurements,
                'exceeded': exceeded_measurements,
                'critical': critical_measurements
            },
            'parameter_breakdown': list(parameter_breakdown)
        })

class CarbonFootprintViewSet(viewsets.ModelViewSet):
    serializer_class = CarbonFootprintSerializer
    permission_classes = [IsAuthenticated, ESGPermission]
    
    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'project') and user.project:
            return CarbonFootprint.objects.filter(site=user.project).order_by('-reporting_period_start')
        return CarbonFootprint.objects.none()
    
    def perform_create(self, serializer):
        if not serializer.validated_data.get('site') and hasattr(self.request.user, 'project'):
            serializer.validated_data['site'] = self.request.user.project
        serializer.save(created_by=self.request.user)

class WaterManagementViewSet(viewsets.ModelViewSet):
    serializer_class = WaterManagementSerializer
    permission_classes = [IsAuthenticated, ESGPermission]
    
    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'project') and user.project:
            return WaterManagement.objects.filter(site=user.project).order_by('-measurement_date')
        return WaterManagement.objects.none()
    
    def perform_create(self, serializer):
        if not serializer.validated_data.get('site') and hasattr(self.request.user, 'project'):
            serializer.validated_data['site'] = self.request.user.project
        serializer.save(created_by=self.request.user)

class EnergyManagementViewSet(viewsets.ModelViewSet):
    serializer_class = EnergyManagementSerializer
    permission_classes = [IsAuthenticated, ESGPermission]
    
    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'project') and user.project:
            return EnergyManagement.objects.filter(site=user.project).order_by('-measurement_date')
        return EnergyManagement.objects.none()
    
    def perform_create(self, serializer):
        if not serializer.validated_data.get('site') and hasattr(self.request.user, 'project'):
            serializer.validated_data['site'] = self.request.user.project
        serializer.save(created_by=self.request.user)

class EnvironmentalIncidentViewSet(viewsets.ModelViewSet):
    serializer_class = EnvironmentalIncidentSerializer
    permission_classes = [IsAuthenticated, ESGPermission]
    
    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'project') and user.project:
            return EnvironmentalIncident.objects.filter(site=user.project).order_by('-incident_date')
        return EnvironmentalIncident.objects.none()
    
    def perform_create(self, serializer):
        if not serializer.validated_data.get('site') and hasattr(self.request.user, 'project'):
            serializer.validated_data['site'] = self.request.user.project
        serializer.save(created_by=self.request.user)

class SustainabilityTargetViewSet(viewsets.ModelViewSet):
    serializer_class = SustainabilityTargetSerializer
    permission_classes = [IsAuthenticated, ESGPermission]
    
    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'project') and user.project:
            return SustainabilityTarget.objects.filter(site=user.project).order_by('-created_at')
        return SustainabilityTarget.objects.none()
    
    def perform_create(self, serializer):
        # Ensure required fields are present
        if not serializer.validated_data.get('site'):
            serializer.validated_data['site'] = self.request.user.project
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def progress_dashboard(self, request):
        """Get sustainability targets progress dashboard data"""
        queryset = self.get_queryset()
        
        # Calculate progress metrics
        total_targets = queryset.count()
        on_track_targets = queryset.filter(on_track=True).count()
        sdg_aligned = queryset.exclude(sdg_alignment__isnull=True).exclude(sdg_alignment__exact=[]).count()
        paris_aligned = queryset.filter(paris_agreement_aligned=True).count()
        
        # Category progress
        category_progress = queryset.values('category').annotate(
            total_count=Count('id'),
            on_track_count=Count('id', filter=Q(on_track=True)),
            avg_progress=Avg('progress_percentage')
        )
        
        return Response({
            'total_targets': total_targets,
            'on_track_targets': on_track_targets,
            'sdg_aligned': sdg_aligned,
            'paris_aligned': paris_aligned,
            'category_progress': list(category_progress)
        })