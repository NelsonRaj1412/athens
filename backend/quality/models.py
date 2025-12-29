from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
import uuid
import json

User = get_user_model()

class QualityStandard(models.Model):
    """International Quality Standards (ISO, IEC, ASTM, etc.)"""
    name = models.CharField(max_length=100, unique=True)  # ISO 9001, IEC 61215, etc.
    version = models.CharField(max_length=20)
    description = models.TextField()
    requirements = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)
    
class QualityTemplate(models.Model):
    INDUSTRY_CHOICES = [
        ('solar_pv', 'Solar Photovoltaic'),
        ('solar_thermal', 'Solar Thermal'),
        ('wind_onshore', 'Wind Onshore'),
        ('wind_offshore', 'Wind Offshore'),
        ('energy_storage', 'Energy Storage'),
        ('grid_integration', 'Grid Integration'),
        ('hybrid_systems', 'Hybrid Systems')
    ]
    
    INSPECTION_TYPES = [
        ('incoming_inspection', 'Incoming Material Inspection'),
        ('in_process_inspection', 'In-Process Quality Control'),
        ('final_inspection', 'Final Product Inspection'),
        ('installation_qa', 'Installation Quality Assurance'),
        ('commissioning_test', 'Commissioning & Testing'),
        ('periodic_audit', 'Periodic Quality Audit'),
        ('supplier_audit', 'Supplier Quality Audit'),
        ('compliance_check', 'Regulatory Compliance Check')
    ]
    
    CRITICALITY_LEVELS = [
        ('low', 'Low Impact'),
        ('medium', 'Medium Impact'),
        ('high', 'High Impact'),
        ('critical', 'Mission Critical')
    ]
    
    # Core Template Information
    template_id = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    version = models.CharField(max_length=20, default='1.0')
    industry = models.CharField(max_length=16, choices=INDUSTRY_CHOICES)
    inspection_type = models.CharField(max_length=35, choices=INSPECTION_TYPES)
    criticality = models.CharField(max_length=10, choices=CRITICALITY_LEVELS, default='medium')
    
    # Advanced Template Configuration
    description = models.TextField()
    scope = models.TextField()  # What this template covers
    prerequisites = models.JSONField(default=list)  # Required conditions
    
    # Quality Standards Compliance
    quality_standards = models.ManyToManyField(QualityStandard, blank=True)
    compliance_requirements = models.JSONField(default=dict)
    
    # Inspection Configuration
    checklist_items = models.JSONField(default=list)
    test_procedures = models.JSONField(default=list)
    measurement_parameters = models.JSONField(default=dict)
    acceptance_criteria = models.JSONField(default=dict)
    
    # Risk & Failure Management
    failure_modes = models.JSONField(default=list)  # FMEA integration
    risk_matrix = models.JSONField(default=dict)
    mitigation_strategies = models.JSONField(default=dict)
    
    # Workflow Configuration
    required_roles = models.JSONField(default=list)  # Inspector, Supervisor, etc.
    approval_workflow = models.JSONField(default=dict)
    escalation_rules = models.JSONField(default=dict)
    
    # Documentation & Traceability
    required_documents = models.JSONField(default=list)
    photo_requirements = models.JSONField(default=dict)
    signature_requirements = models.JSONField(default=list)
    
    # Metadata
    is_active = models.BooleanField(default=True)
    is_certified = models.BooleanField(default=False)  # Certified by quality authority
    certification_date = models.DateTimeField(null=True, blank=True)
    next_review_date = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_templates')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_templates')
    approved_at = models.DateTimeField(null=True, blank=True)
    
    # Project isolation
    project = models.ForeignKey(
        'authentication.Project',
        on_delete=models.CASCADE,
        related_name='quality_templates',
        null=True,
        blank=True
    )
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['industry', 'inspection_type']),
            models.Index(fields=['is_active', 'is_certified'])
        ]

class QualityInspection(models.Model):
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('ready', 'Ready to Start'),
        ('in_progress', 'In Progress'),
        ('on_hold', 'On Hold'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('rework_required', 'Rework Required'),
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected')
    ]
    
    RESULT_CHOICES = [
        ('pass', 'Pass'),
        ('fail', 'Fail'),
        ('conditional_pass', 'Conditional Pass'),
        ('rework_required', 'Rework Required'),
        ('deviation_approved', 'Deviation Approved'),
        ('waiver_granted', 'Waiver Granted')
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
        ('critical', 'Critical')
    ]
    
    # Core Inspection Information
    inspection_id = models.UUIDField(default=uuid.uuid4, unique=True)
    inspection_number = models.CharField(max_length=50, unique=True)  # Human-readable ID
    template = models.ForeignKey(QualityTemplate, on_delete=models.CASCADE)
    
    # Project & Product Information
    site_project = models.ForeignKey(
        'authentication.Project',
        on_delete=models.CASCADE,
        related_name='quality_inspections',
        null=True,
        blank=True
    )
    work_order_number = models.CharField(max_length=100, blank=True)
    purchase_order_number = models.CharField(max_length=100, blank=True)
    reference_number = models.CharField(max_length=100)
    batch_number = models.CharField(max_length=100, blank=True)
    serial_numbers = models.JSONField(default=list)  # Multiple serial numbers
    
    # Component/Product Details
    component_type = models.CharField(max_length=100)
    component_model = models.CharField(max_length=100, blank=True)
    manufacturer = models.CharField(max_length=200, blank=True)
    supplier = models.ForeignKey('SupplierQuality', on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    unit_of_measure = models.CharField(max_length=20, default='pcs')
    
    # Location & Environment
    latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    location_name = models.CharField(max_length=200, blank=True)
    site_conditions = models.JSONField(default=dict)  # Weather, temperature, etc.
    
    # Inspection Execution
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    overall_result = models.CharField(max_length=20, choices=RESULT_CHOICES, default='pass')
    
    # Results & Measurements
    checklist_results = models.JSONField(default=dict)
    measurement_data = models.JSONField(default=dict)  # Actual measurements
    test_results = models.JSONField(default=dict)  # Test outcomes
    deviation_records = models.JSONField(default=list)  # Approved deviations
    
    # Quality Metrics
    quality_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    defect_count = models.PositiveIntegerField(default=0)
    critical_defect_count = models.PositiveIntegerField(default=0)
    rework_count = models.PositiveIntegerField(default=0)
    
    # Scheduling & Timeline
    scheduled_date = models.DateTimeField()
    planned_duration = models.DurationField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    actual_duration = models.DurationField(null=True, blank=True)
    
    # Personnel & Approvals
    inspector = models.ForeignKey(User, on_delete=models.CASCADE, related_name='inspections')
    supervisor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='supervised_inspections')
    quality_manager = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_inspections')
    
    # Digital Signatures & Approvals
    inspector_signature = models.JSONField(default=dict)  # Digital signature data
    supervisor_signature = models.JSONField(default=dict)
    customer_signature = models.JSONField(default=dict)
    
    # Documentation & Evidence
    attachments = models.JSONField(default=list)
    photos = models.JSONField(default=list)
    certificates = models.JSONField(default=list)
    calibration_records = models.JSONField(default=list)
    
    # Compliance & Traceability
    compliance_status = models.JSONField(default=dict)  # Per standard compliance
    traceability_data = models.JSONField(default=dict)  # Supply chain traceability
    
    # Comments & Notes
    inspector_notes = models.TextField(blank=True)
    supervisor_comments = models.TextField(blank=True)
    customer_feedback = models.TextField(blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-scheduled_date']
        indexes = [
            models.Index(fields=['status', 'priority']),
            models.Index(fields=['scheduled_date', 'inspector']),
            models.Index(fields=['overall_result', 'quality_score'])
        ]

class QualityDefect(models.Model):
    SEVERITY_CHOICES = [
        ('cosmetic', 'Cosmetic'),
        ('minor', 'Minor'),
        ('major', 'Major'),
        ('critical', 'Critical'),
        ('catastrophic', 'Catastrophic')
    ]
    
    DEFECT_CATEGORIES = [
        ('dimensional', 'Dimensional Non-Conformance'),
        ('visual', 'Visual Defect'),
        ('functional', 'Functional Issue'),
        ('performance', 'Performance Deviation'),
        ('safety', 'Safety Concern'),
        ('documentation', 'Documentation Issue'),
        ('packaging', 'Packaging Problem'),
        ('labeling', 'Labeling Error')
    ]
    
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('investigating', 'Under Investigation'),
        ('corrective_action', 'Corrective Action in Progress'),
        ('verification', 'Under Verification'),
        ('closed', 'Closed'),
        ('rejected', 'Rejected')
    ]
    
    # Core Defect Information
    defect_id = models.CharField(max_length=50, unique=True)
    inspection = models.ForeignKey(QualityInspection, on_delete=models.CASCADE, related_name='defects')
    defect_code = models.CharField(max_length=50)
    category = models.CharField(max_length=20, choices=DEFECT_CATEGORIES)
    
    # Defect Details
    title = models.CharField(max_length=200)
    description = models.TextField()
    severity = models.CharField(max_length=15, choices=SEVERITY_CHOICES)
    location_details = models.CharField(max_length=200, blank=True)
    affected_quantity = models.PositiveIntegerField(default=1)
    
    # Root Cause Analysis
    root_cause = models.TextField(blank=True)
    contributing_factors = models.JSONField(default=list)
    failure_mode = models.CharField(max_length=200, blank=True)
    
    # Corrective & Preventive Actions
    immediate_action = models.TextField(blank=True)
    corrective_action = models.TextField(blank=True)
    preventive_action = models.TextField(blank=True)
    action_owner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='owned_actions')
    target_completion_date = models.DateTimeField(null=True, blank=True)
    
    # Status & Resolution
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    is_resolved = models.BooleanField(default=False)
    resolution_date = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_defects')
    verification_notes = models.TextField(blank=True)
    
    # Impact Assessment
    cost_impact = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    schedule_impact = models.DurationField(null=True, blank=True)
    customer_impact = models.TextField(blank=True)
    
    # Documentation
    photos = models.JSONField(default=list)
    attachments = models.JSONField(default=list)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['severity', 'status']),
            models.Index(fields=['inspection', 'category'])
        ]

class SupplierQuality(models.Model):
    SUPPLIER_TYPES = [
        ('manufacturer', 'Manufacturer'),
        ('distributor', 'Distributor'),
        ('contractor', 'Contractor'),
        ('service_provider', 'Service Provider'),
        ('consultant', 'Consultant')
    ]
    
    CERTIFICATION_STATUS = [
        ('not_certified', 'Not Certified'),
        ('in_progress', 'Certification in Progress'),
        ('certified', 'Certified'),
        ('suspended', 'Suspended'),
        ('revoked', 'Revoked')
    ]
    
    # Core Supplier Information
    supplier_id = models.CharField(max_length=50, unique=True)
    supplier_name = models.CharField(max_length=200)
    supplier_code = models.CharField(max_length=50, unique=True)
    supplier_type = models.CharField(max_length=20, choices=SUPPLIER_TYPES)
    industry = models.CharField(max_length=16, choices=QualityTemplate.INDUSTRY_CHOICES)
    
    # Contact Information
    contact_person = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    website = models.URLField(blank=True)
    
    # Quality Performance Metrics
    quality_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    delivery_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    service_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    overall_rating = models.CharField(max_length=1, choices=[('A', 'A'), ('B', 'B'), ('C', 'C'), ('D', 'D')])
    
    # Performance Statistics
    total_orders = models.PositiveIntegerField(default=0)
    on_time_deliveries = models.PositiveIntegerField(default=0)
    quality_incidents = models.PositiveIntegerField(default=0)
    defect_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.0000)  # PPM
    
    # Audit & Certification
    certification_status = models.CharField(max_length=15, choices=CERTIFICATION_STATUS, default='not_certified')
    last_audit_date = models.DateField(null=True, blank=True)
    next_audit_date = models.DateField(null=True, blank=True)
    audit_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    audit_findings = models.JSONField(default=list)
    
    # Certifications & Compliance
    certifications = models.JSONField(default=list)  # ISO, IEC, etc.
    compliance_records = models.JSONField(default=dict)
    risk_assessment = models.JSONField(default=dict)
    
    # Business Information
    annual_revenue = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    employee_count = models.PositiveIntegerField(null=True, blank=True)
    years_in_business = models.PositiveIntegerField(null=True, blank=True)
    
    # Status & Approval
    is_approved = models.BooleanField(default=False)
    is_preferred = models.BooleanField(default=False)
    approval_date = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Notes & Comments
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-quality_score']
        indexes = [
            models.Index(fields=['overall_rating', 'is_approved']),
            models.Index(fields=['industry', 'supplier_type'])
        ]

class QualityMetrics(models.Model):
    """Quality KPIs and Metrics Dashboard"""
    metric_date = models.DateField()
    
    # Inspection Metrics
    total_inspections = models.PositiveIntegerField(default=0)
    passed_inspections = models.PositiveIntegerField(default=0)
    failed_inspections = models.PositiveIntegerField(default=0)
    pass_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    # Defect Metrics
    total_defects = models.PositiveIntegerField(default=0)
    critical_defects = models.PositiveIntegerField(default=0)
    defect_density = models.DecimalField(max_digits=8, decimal_places=4, default=0.0000)
    
    # Supplier Metrics
    supplier_performance = models.JSONField(default=dict)
    
    # Cost of Quality
    prevention_costs = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    appraisal_costs = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    internal_failure_costs = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    external_failure_costs = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    class Meta:
        unique_together = ['metric_date']
        ordering = ['-metric_date']

class QualityAlert(models.Model):
    """Quality Alerts and Notifications"""
    ALERT_TYPES = [
        ('defect_threshold', 'Defect Threshold Exceeded'),
        ('supplier_performance', 'Supplier Performance Issue'),
        ('compliance_violation', 'Compliance Violation'),
        ('inspection_overdue', 'Inspection Overdue'),
        ('certification_expiry', 'Certification Expiring'),
        ('quality_trend', 'Quality Trend Alert')
    ]
    
    SEVERITY_LEVELS = [
        ('info', 'Information'),
        ('warning', 'Warning'),
        ('critical', 'Critical'),
        ('urgent', 'Urgent')
    ]
    
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES)
    severity = models.CharField(max_length=10, choices=SEVERITY_LEVELS)
    title = models.CharField(max_length=200)
    description = models.TextField()
    
    # Related Objects
    inspection = models.ForeignKey(QualityInspection, on_delete=models.CASCADE, null=True, blank=True)
    supplier = models.ForeignKey(SupplierQuality, on_delete=models.CASCADE, null=True, blank=True)
    
    # Alert Management
    is_acknowledged = models.BooleanField(default=False)
    acknowledged_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']