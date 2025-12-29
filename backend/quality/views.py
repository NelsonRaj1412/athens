from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q, Count, Avg, Sum, F
from django.db import transaction
from datetime import datetime, timedelta
from authentication.project_isolation import ProjectIsolationMixin, apply_project_isolation
import json

from .models import (QualityTemplate, QualityInspection, QualityDefect, 
                    SupplierQuality, QualityStandard, QualityMetrics, QualityAlert)
from .serializers import (QualityStandardSerializer, QualityTemplateSerializer, QualityInspectionSerializer, 
                         QualityDefectSerializer, SupplierQualitySerializer, QualityMetricsSerializer, QualityAlertSerializer)
from .permissions import QualityManagerPermission, QualityInspectorPermission

class QualityStandardViewSet(viewsets.ModelViewSet):
    """Manage International Quality Standards"""
    queryset = QualityStandard.objects.all()
    serializer_class = QualityStandardSerializer
    permission_classes = [QualityManagerPermission]
    
    @action(detail=False, methods=['get'])
    def active_standards(self, request):
        """Get all active quality standards"""
        standards = self.queryset.filter(is_active=True)
        return Response([{
            'id': s.id,
            'name': s.name,
            'version': s.version,
            'description': s.description
        } for s in standards])

class QualityTemplateViewSet(ProjectIsolationMixin, viewsets.ModelViewSet):
    """Enhanced Quality Template Management"""
    queryset = QualityTemplate.objects.all()
    serializer_class = QualityTemplateSerializer
    permission_classes = [IsAuthenticated]
    model = QualityTemplate
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Apply project isolation
        queryset = apply_project_isolation(queryset, self.request.user)
        
        industry = self.request.query_params.get('industry')
        inspection_type = self.request.query_params.get('inspection_type')
        criticality = self.request.query_params.get('criticality')
        certified_only = self.request.query_params.get('certified_only')
        
        if industry:
            queryset = queryset.filter(Q(industry=industry))
        if inspection_type:
            queryset = queryset.filter(inspection_type=inspection_type)
        if criticality:
            queryset = queryset.filter(criticality=criticality)
        if certified_only == 'true':
            queryset = queryset.filter(is_certified=True)
            
        return queryset.filter(is_active=True)
    
    def perform_create(self, serializer):
        user_project = getattr(self.request.user, 'project', None)
        if not user_project:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("User must be assigned to a project to create quality templates.")
        
        serializer.save(
            created_by=self.request.user,
            project=user_project
        )
    
    @action(detail=True, methods=['post'])
    def certify_template(self, request, pk=None):
        """Certify a quality template"""
        template = self.get_object()
        template.is_certified = True
        template.certification_date = timezone.now()
        template.approved_by = request.user
        template.approved_at = timezone.now()
        template.save()
        
        return Response({'status': 'Template certified successfully'})
    
    @action(detail=True, methods=['post'])
    def clone_template(self, request, pk=None):
        """Clone an existing template"""
        original = self.get_object()
        new_name = request.data.get('name', f"{original.name} - Copy")
        
        cloned = QualityTemplate.objects.create(
            template_id=f"{original.template_id}_COPY_{timezone.now().strftime('%Y%m%d')}",
            name=new_name,
            industry=original.industry,
            inspection_type=original.inspection_type,
            description=original.description,
            checklist_items=original.checklist_items,
            test_procedures=original.test_procedures,
            created_by=request.user
        )
        
        serializer = self.get_serializer(cloned)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def template_analytics(self, request):
        """Get template usage analytics"""
        analytics = {
            'total_templates': self.get_queryset().count(),
            'certified_templates': self.get_queryset().filter(is_certified=True).count(),
            'by_industry': {},
            'by_criticality': {},
            'usage_stats': {}
        }
        
        # Industry distribution
        for industry, _ in QualityTemplate.INDUSTRY_CHOICES:
            count = self.get_queryset().filter(industry=industry).count()
            analytics['by_industry'][industry] = count
        
        # Criticality distribution
        for criticality, _ in QualityTemplate.CRITICALITY_LEVELS:
            count = self.get_queryset().filter(criticality=criticality).count()
            analytics['by_criticality'][criticality] = count
        
        return Response(analytics)

class QualityInspectionViewSet(ProjectIsolationMixin, viewsets.ModelViewSet):
    """Advanced Quality Inspection Management"""
    queryset = QualityInspection.objects.all()
    serializer_class = QualityInspectionSerializer
    permission_classes = [IsAuthenticated]
    model = QualityInspection
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Apply project isolation
        queryset = apply_project_isolation(queryset, self.request.user)
        
        status_filter = self.request.query_params.get('status')
        result_filter = self.request.query_params.get('result')
        priority_filter = self.request.query_params.get('priority')
        inspector = self.request.query_params.get('inspector')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if result_filter:
            queryset = queryset.filter(overall_result=result_filter)
        if priority_filter:
            queryset = queryset.filter(priority=priority_filter)
        if inspector:
            queryset = queryset.filter(inspector_id=inspector)
        if date_from:
            queryset = queryset.filter(scheduled_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(scheduled_date__lte=date_to)
            
        return queryset.order_by('-scheduled_date')
    
    def perform_create(self, serializer):
        user_project = getattr(self.request.user, 'project', None)
        if not user_project:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("User must be assigned to a project to create quality inspections.")
        
        serializer.save(
            inspector=self.request.user,
            site_project=user_project
        )
    
    @action(detail=True, methods=['post'])
    def start_inspection(self, request, pk=None):
        """Start an inspection with enhanced workflow"""
        inspection = self.get_object()
        
        # Validate prerequisites
        if inspection.status != 'scheduled':
            return Response(
                {'error': 'Inspection must be in scheduled status to start'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            inspection.status = 'in_progress'
            inspection.started_at = timezone.now()
            inspection.save()
            
            # Log activity
            self._log_inspection_activity(inspection, 'started', request.user)
        
        return Response({'status': 'Inspection started successfully'})
    
    @action(detail=True, methods=['post'])
    def complete_inspection(self, request, pk=None):
        """Complete inspection with comprehensive validation"""
        inspection = self.get_object()
        checklist_results = request.data.get('checklist_results', {})
        measurement_data = request.data.get('measurement_data', {})
        overall_result = request.data.get('overall_result', 'pass')
        quality_score = request.data.get('quality_score')
        
        with transaction.atomic():
            inspection.checklist_results = checklist_results
            inspection.measurement_data = measurement_data
            inspection.overall_result = overall_result
            inspection.quality_score = quality_score
            inspection.status = 'completed'
            inspection.completed_at = timezone.now()
            
            # Calculate actual duration
            if inspection.started_at:
                inspection.actual_duration = inspection.completed_at - inspection.started_at
            
            inspection.save()
            
            # Auto-generate quality alerts if needed
            self._check_quality_thresholds(inspection)
            
            # Log completion
            self._log_inspection_activity(inspection, 'completed', request.user)
        
        return Response({'status': 'Inspection completed successfully'})
    
    @action(detail=True, methods=['post'])
    def add_digital_signature(self, request, pk=None):
        """Add digital signature to inspection"""
        inspection = self.get_object()
        signature_type = request.data.get('signature_type')  # inspector, supervisor, customer
        signature_data = request.data.get('signature_data')
        
        if signature_type == 'inspector':
            inspection.inspector_signature = signature_data
        elif signature_type == 'supervisor':
            inspection.supervisor_signature = signature_data
        elif signature_type == 'customer':
            inspection.customer_signature = signature_data
        
        inspection.save()
        return Response({'status': f'{signature_type} signature added successfully'})
    
    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Enhanced dashboard statistics"""
        queryset = self.get_queryset()
        
        # Basic counts
        total_inspections = queryset.count()
        by_status = {}
        for status_code, _ in QualityInspection.STATUS_CHOICES:
            by_status[status_code] = queryset.filter(status=status_code).count()
        
        # Quality metrics
        completed = queryset.filter(status='completed')
        pass_rate = 0
        avg_quality_score = 0
        
        if completed.exists():
            passed = completed.filter(overall_result='pass').count()
            pass_rate = (passed / completed.count()) * 100
            avg_quality_score = completed.aggregate(Avg('quality_score'))['quality_score__avg'] or 0
        
        # Defect statistics
        total_defects = QualityDefect.objects.filter(inspection__in=queryset).count()
        critical_defects = QualityDefect.objects.filter(
            inspection__in=queryset, 
            severity='critical'
        ).count()
        
        # Performance trends (last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent_inspections = queryset.filter(created_at__gte=thirty_days_ago)
        
        return Response({
            'total_inspections': total_inspections,
            'by_status': by_status,
            'pass_rate': round(pass_rate, 2),
            'avg_quality_score': round(avg_quality_score, 2),
            'total_defects': total_defects,
            'critical_defects': critical_defects,
            'recent_trend': {
                'inspections_last_30_days': recent_inspections.count(),
                'avg_completion_time': self._calculate_avg_completion_time(recent_inspections)
            }
        })
    
    @action(detail=False, methods=['get'])
    def quality_trends(self, request):
        """Quality trend analysis"""
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        inspections = self.get_queryset().filter(completed_at__gte=start_date)
        
        # Daily quality metrics
        daily_metrics = []
        for i in range(days):
            date = start_date + timedelta(days=i)
            day_inspections = inspections.filter(
                completed_at__date=date.date()
            )
            
            if day_inspections.exists():
                passed = day_inspections.filter(overall_result='pass').count()
                total = day_inspections.count()
                pass_rate = (passed / total) * 100 if total > 0 else 0
                avg_score = day_inspections.aggregate(Avg('quality_score'))['quality_score__avg'] or 0
            else:
                pass_rate = 0
                avg_score = 0
            
            daily_metrics.append({
                'date': date.date().isoformat(),
                'pass_rate': round(pass_rate, 2),
                'avg_quality_score': round(avg_score, 2),
                'total_inspections': day_inspections.count()
            })
        
        return Response(daily_metrics)
    
    def _log_inspection_activity(self, inspection, activity, user):
        """Log inspection activities for audit trail"""
        # Implementation for activity logging
        pass
    
    def _check_quality_thresholds(self, inspection):
        """Check if quality thresholds are exceeded and create alerts"""
        if inspection.quality_score and inspection.quality_score < 70:
            QualityAlert.objects.create(
                alert_type='quality_trend',
                severity='warning',
                title=f'Low Quality Score: {inspection.inspection_number}',
                description=f'Quality score of {inspection.quality_score} is below threshold',
                inspection=inspection
            )
    
    def _calculate_avg_completion_time(self, queryset):
        """Calculate average completion time for inspections"""
        completed = queryset.filter(
            status='completed',
            actual_duration__isnull=False
        )
        
        if completed.exists():
            avg_seconds = completed.aggregate(
                avg_duration=Avg('actual_duration')
            )['avg_duration'].total_seconds()
            return round(avg_seconds / 3600, 2)  # Convert to hours
        
        return 0

class QualityDefectViewSet(viewsets.ModelViewSet):
    """Advanced Defect Management"""
    queryset = QualityDefect.objects.all()
    serializer_class = QualityDefectSerializer
    permission_classes = [QualityInspectorPermission]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        inspection_id = self.request.query_params.get('inspection')
        severity = self.request.query_params.get('severity')
        category = self.request.query_params.get('category')
        status_filter = self.request.query_params.get('status')
        resolved = self.request.query_params.get('resolved')
        
        if inspection_id:
            queryset = queryset.filter(inspection_id=inspection_id)
        if severity:
            queryset = queryset.filter(severity=severity)
        if category:
            queryset = queryset.filter(category=category)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if resolved is not None:
            queryset = queryset.filter(is_resolved=resolved.lower() == 'true')
            
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def resolve_defect(self, request, pk=None):
        """Resolve defect with verification"""
        defect = self.get_object()
        verification_notes = request.data.get('verification_notes', '')
        
        with transaction.atomic():
            defect.is_resolved = True
            defect.status = 'closed'
            defect.resolution_date = timezone.now()
            defect.resolved_by = request.user
            defect.verification_notes = verification_notes
            defect.save()
            
            # Update inspection defect count
            inspection = defect.inspection
            inspection.defect_count = inspection.defects.filter(is_resolved=False).count()
            inspection.save()
        
        return Response({'status': 'Defect resolved successfully'})
    
    @action(detail=False, methods=['get'])
    def defect_analytics(self, request):
        """Comprehensive defect analytics"""
        queryset = self.get_queryset()
        
        analytics = {
            'total_defects': queryset.count(),
            'by_severity': {},
            'by_category': {},
            'by_status': {},
            'resolution_metrics': {},
            'cost_impact': queryset.aggregate(
                total_cost=Sum('cost_impact')
            )['total_cost'] or 0
        }
        
        # Severity distribution
        for severity, _ in QualityDefect.SEVERITY_CHOICES:
            analytics['by_severity'][severity] = queryset.filter(severity=severity).count()
        
        # Category distribution
        for category, _ in QualityDefect.DEFECT_CATEGORIES:
            analytics['by_category'][category] = queryset.filter(category=category).count()
        
        # Status distribution
        for status_code, _ in QualityDefect.STATUS_CHOICES:
            analytics['by_status'][status_code] = queryset.filter(status=status_code).count()
        
        # Resolution metrics
        resolved_defects = queryset.filter(is_resolved=True)
        if resolved_defects.exists():
            avg_resolution_time = resolved_defects.aggregate(
                avg_time=Avg(F('resolution_date') - F('created_at'))
            )['avg_time']
            
            analytics['resolution_metrics'] = {
                'total_resolved': resolved_defects.count(),
                'resolution_rate': (resolved_defects.count() / queryset.count()) * 100,
                'avg_resolution_time_hours': avg_resolution_time.total_seconds() / 3600 if avg_resolution_time else 0
            }
        
        return Response(analytics)

class SupplierQualityViewSet(viewsets.ModelViewSet):
    """Enhanced Supplier Quality Management"""
    queryset = SupplierQuality.objects.all()
    serializer_class = SupplierQualitySerializer
    permission_classes = [QualityManagerPermission]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        industry = self.request.query_params.get('industry')
        rating = self.request.query_params.get('rating')
        supplier_type = self.request.query_params.get('supplier_type')
        approved = self.request.query_params.get('approved')
        certification_status = self.request.query_params.get('certification_status')
        
        if industry:
            queryset = queryset.filter(industry=industry)
        if rating:
            queryset = queryset.filter(overall_rating=rating)
        if supplier_type:
            queryset = queryset.filter(supplier_type=supplier_type)
        if approved is not None:
            queryset = queryset.filter(is_approved=approved.lower() == 'true')
        if certification_status:
            queryset = queryset.filter(certification_status=certification_status)
            
        return queryset.order_by('-quality_score')
    
    @action(detail=True, methods=['post'])
    def conduct_audit(self, request, pk=None):
        """Conduct supplier audit"""
        supplier = self.get_object()
        audit_data = request.data
        
        with transaction.atomic():
            supplier.last_audit_date = timezone.now().date()
            supplier.audit_score = audit_data.get('audit_score', 0)
            supplier.audit_findings = audit_data.get('findings', [])
            
            # Update next audit date (typically 1 year)
            supplier.next_audit_date = supplier.last_audit_date + timedelta(days=365)
            
            # Update certification status based on audit results
            if supplier.audit_score >= 80:
                supplier.certification_status = 'certified'
            elif supplier.audit_score >= 60:
                supplier.certification_status = 'in_progress'
            else:
                supplier.certification_status = 'suspended'
            
            supplier.save()
        
        return Response({'status': 'Audit completed successfully'})
    
    @action(detail=False, methods=['get'])
    def supplier_stats(self, request):
        """Enhanced supplier statistics"""
        queryset = self.get_queryset()
        
        stats = {
            'total_suppliers': queryset.count(),
            'approved_suppliers': queryset.filter(is_approved=True).count(),
            'preferred_suppliers': queryset.filter(is_preferred=True).count(),
            'average_quality_score': queryset.aggregate(Avg('quality_score'))['quality_score__avg'] or 0,
            'rating_distribution': {},
            'certification_status': {},
            'performance_metrics': {}
        }
        
        # Rating distribution
        for rating in ['A', 'B', 'C', 'D']:
            stats['rating_distribution'][rating] = queryset.filter(overall_rating=rating).count()
        
        # Certification status
        for status_code, _ in SupplierQuality.CERTIFICATION_STATUS:
            stats['certification_status'][status_code] = queryset.filter(certification_status=status_code).count()
        
        # Performance metrics
        stats['performance_metrics'] = {
            'avg_delivery_score': queryset.aggregate(Avg('delivery_score'))['delivery_score__avg'] or 0,
            'avg_service_score': queryset.aggregate(Avg('service_score'))['service_score__avg'] or 0,
            'total_quality_incidents': queryset.aggregate(Sum('quality_incidents'))['quality_incidents__sum'] or 0
        }
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def supplier_rankings(self, request):
        """Get supplier rankings by performance"""
        top_suppliers = self.get_queryset().filter(
            is_approved=True
        ).order_by('-quality_score')[:10]
        
        rankings = []
        for i, supplier in enumerate(top_suppliers, 1):
            rankings.append({
                'rank': i,
                'supplier_name': supplier.supplier_name,
                'quality_score': supplier.quality_score,
                'overall_rating': supplier.overall_rating,
                'defect_rate': supplier.defect_rate
            })
        
        return Response(rankings)

class QualityMetricsViewSet(viewsets.ReadOnlyModelViewSet):
    """Quality Metrics and KPI Dashboard"""
    queryset = QualityMetrics.objects.all()
    serializer_class = QualityMetricsSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def kpi_dashboard(self, request):
        """Comprehensive KPI dashboard"""
        # Get date range
        days = int(request.query_params.get('days', 30))
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        # Calculate KPIs
        inspections = QualityInspection.objects.filter(
            completed_at__date__range=[start_date, end_date]
        )
        
        defects = QualityDefect.objects.filter(
            created_at__date__range=[start_date, end_date]
        )
        
        kpis = {
            'quality_performance': {
                'pass_rate': self._calculate_pass_rate(inspections),
                'defect_density': self._calculate_defect_density(inspections, defects),
                'first_pass_yield': self._calculate_first_pass_yield(inspections),
                'quality_score_trend': self._get_quality_score_trend(inspections)
            },
            'operational_efficiency': {
                'avg_inspection_time': self._calculate_avg_inspection_time(inspections),
                'inspection_productivity': self._calculate_productivity(inspections),
                'resource_utilization': self._calculate_resource_utilization()
            },
            'cost_of_quality': {
                'prevention_costs': 0,  # To be calculated based on actual data
                'appraisal_costs': 0,
                'internal_failure_costs': self._calculate_internal_failure_costs(defects),
                'external_failure_costs': self._calculate_external_failure_costs(defects)
            },
            'supplier_performance': {
                'supplier_quality_index': self._calculate_supplier_quality_index(),
                'supplier_defect_rate': self._calculate_supplier_defect_rate(),
                'on_time_delivery_rate': self._calculate_delivery_performance()
            }
        }
        
        return Response(kpis)
    
    def _calculate_pass_rate(self, inspections):
        if not inspections.exists():
            return 0
        passed = inspections.filter(overall_result='pass').count()
        return (passed / inspections.count()) * 100
    
    def _calculate_defect_density(self, inspections, defects):
        if not inspections.exists():
            return 0
        return (defects.count() / inspections.count()) * 1000  # Defects per 1000 inspections
    
    def _calculate_first_pass_yield(self, inspections):
        if not inspections.exists():
            return 0
        first_pass = inspections.filter(
            overall_result='pass',
            rework_count=0
        ).count()
        return (first_pass / inspections.count()) * 100
    
    def _get_quality_score_trend(self, inspections):
        return inspections.aggregate(Avg('quality_score'))['quality_score__avg'] or 0
    
    def _calculate_avg_inspection_time(self, inspections):
        completed = inspections.filter(actual_duration__isnull=False)
        if not completed.exists():
            return 0
        avg_duration = completed.aggregate(Avg('actual_duration'))['actual_duration__avg']
        return avg_duration.total_seconds() / 3600 if avg_duration else 0  # Hours
    
    def _calculate_productivity(self, inspections):
        # Inspections per day
        if not inspections.exists():
            return 0
        days = (inspections.last().completed_at.date() - inspections.first().completed_at.date()).days + 1
        return inspections.count() / days if days > 0 else 0
    
    def _calculate_resource_utilization(self):
        # Placeholder for resource utilization calculation
        return 85.0  # Example value
    
    def _calculate_internal_failure_costs(self, defects):
        return defects.aggregate(Sum('cost_impact'))['cost_impact__sum'] or 0
    
    def _calculate_external_failure_costs(self, defects):
        # External failures (customer-reported defects)
        external_defects = defects.filter(
            # Add criteria for external defects
        )
        return external_defects.aggregate(Sum('cost_impact'))['cost_impact__sum'] or 0
    
    def _calculate_supplier_quality_index(self):
        suppliers = SupplierQuality.objects.filter(is_approved=True)
        if not suppliers.exists():
            return 0
        return suppliers.aggregate(Avg('quality_score'))['quality_score__avg'] or 0
    
    def _calculate_supplier_defect_rate(self):
        suppliers = SupplierQuality.objects.filter(is_approved=True)
        if not suppliers.exists():
            return 0
        return suppliers.aggregate(Avg('defect_rate'))['defect_rate__avg'] or 0
    
    def _calculate_delivery_performance(self):
        suppliers = SupplierQuality.objects.filter(is_approved=True)
        if not suppliers.exists():
            return 0
        
        total_orders = suppliers.aggregate(Sum('total_orders'))['total_orders__sum'] or 0
        on_time_deliveries = suppliers.aggregate(Sum('on_time_deliveries'))['on_time_deliveries__sum'] or 0
        
        return (on_time_deliveries / total_orders) * 100 if total_orders > 0 else 0

class QualityAlertViewSet(viewsets.ModelViewSet):
    """Quality Alert Management"""
    queryset = QualityAlert.objects.all()
    serializer_class = QualityAlertSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        alert_type = self.request.query_params.get('alert_type')
        severity = self.request.query_params.get('severity')
        acknowledged = self.request.query_params.get('acknowledged')
        
        if alert_type:
            queryset = queryset.filter(alert_type=alert_type)
        if severity:
            queryset = queryset.filter(severity=severity)
        if acknowledged is not None:
            queryset = queryset.filter(is_acknowledged=acknowledged.lower() == 'true')
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def acknowledge_alert(self, request, pk=None):
        """Acknowledge a quality alert"""
        alert = self.get_object()
        alert.is_acknowledged = True
        alert.acknowledged_by = request.user
        alert.acknowledged_at = timezone.now()
        alert.save()
        
        return Response({'status': 'Alert acknowledged successfully'})
    
    @action(detail=False, methods=['get'])
    def alert_summary(self, request):
        """Get alert summary for dashboard"""
        queryset = self.get_queryset()
        
        summary = {
            'total_alerts': queryset.count(),
            'unacknowledged': queryset.filter(is_acknowledged=False).count(),
            'by_severity': {},
            'by_type': {},
            'recent_alerts': []
        }
        
        # Severity breakdown
        for severity, _ in QualityAlert.SEVERITY_LEVELS:
            summary['by_severity'][severity] = queryset.filter(severity=severity).count()
        
        # Type breakdown
        for alert_type, _ in QualityAlert.ALERT_TYPES:
            summary['by_type'][alert_type] = queryset.filter(alert_type=alert_type).count()
        
        # Recent alerts (last 5)
        recent = queryset.filter(is_acknowledged=False)[:5]
        summary['recent_alerts'] = [{
            'id': alert.id,
            'title': alert.title,
            'severity': alert.severity,
            'created_at': alert.created_at
        } for alert in recent]
        
        return Response(summary)