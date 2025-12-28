from rest_framework import serializers
from .models import (
    Permit, PermitType, PermitApproval, PermitWorker, PermitExtension, 
    PermitAudit, WorkflowTemplate, WorkflowInstance, WorkflowStep,
    HazardLibrary, PermitHazard, GasReading, PermitPhoto, DigitalSignature,
    EscalationRule, NotificationTemplate, SystemIntegration, ComplianceReport
)
from worker.serializers import WorkerSerializer
from authentication.models import CustomUser

class PermitTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PermitType
        fields = '__all__'

class UserMinimalSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'name', 'surname', 'admin_type', 'grade', 'user_type', 'full_name']
    
    def get_full_name(self, obj):
        return f"{obj.name or ''} {obj.surname or ''}".strip()

class HazardLibrarySerializer(serializers.ModelSerializer):
    class Meta:
        model = HazardLibrary
        fields = '__all__'

class PermitHazardSerializer(serializers.ModelSerializer):
    hazard_details = HazardLibrarySerializer(source='hazard', read_only=True)
    
    class Meta:
        model = PermitHazard
        fields = ['id', 'hazard', 'hazard_details', 'likelihood', 'severity', 
                  'risk_score', 'control_measures_applied', 'residual_risk']

class GasReadingSerializer(serializers.ModelSerializer):
    tested_by_details = UserMinimalSerializer(source='tested_by', read_only=True)
    
    class Meta:
        model = GasReading
        fields = ['id', 'gas_type', 'reading', 'unit', 'acceptable_range', 
                  'status', 'tested_by', 'tested_by_details', 'tested_at', 
                  'equipment_used', 'calibration_date']
        read_only_fields = ['tested_at']

class PermitPhotoSerializer(serializers.ModelSerializer):
    taken_by_details = UserMinimalSerializer(source='taken_by', read_only=True)
    
    class Meta:
        model = PermitPhoto
        fields = ['id', 'photo', 'photo_type', 'description', 'taken_by', 
                  'taken_by_details', 'taken_at', 'gps_location', 'offline_id']
        read_only_fields = ['taken_at']

class DigitalSignatureSerializer(serializers.ModelSerializer):
    signatory_details = UserMinimalSerializer(source='signatory', read_only=True)
    
    class Meta:
        model = DigitalSignature
        fields = ['id', 'signature_type', 'signatory', 'signatory_details', 
                  'signature_data', 'signed_at', 'ip_address', 'device_info']
        read_only_fields = ['signed_at']

class PermitWorkerSerializer(serializers.ModelSerializer):
    worker_details = WorkerSerializer(source='worker', read_only=True)
    assigned_by_details = UserMinimalSerializer(source='assigned_by', read_only=True)
    
    class Meta:
        model = PermitWorker
        fields = ['id', 'worker', 'worker_details', 'assigned_by', 'assigned_by_details',
                  'assigned_at', 'role', 'competency_verified', 'training_valid', 'medical_clearance']
        read_only_fields = ['assigned_at']

class WorkflowStepSerializer(serializers.ModelSerializer):
    assignee_details = UserMinimalSerializer(source='assignee', read_only=True)
    
    class Meta:
        model = WorkflowStep
        fields = ['id', 'step_id', 'name', 'step_type', 'assignee', 'assignee_details',
                  'role', 'status', 'order', 'escalation_time', 'required', 'conditions',
                  'completed_at', 'comments', 'signature', 'attachments']
        read_only_fields = ['completed_at']

class WorkflowTemplateSerializer(serializers.ModelSerializer):
    permit_type_details = PermitTypeSerializer(source='permit_type', read_only=True)
    
    class Meta:
        model = WorkflowTemplate
        fields = ['id', 'name', 'permit_type', 'permit_type_details', 'risk_level',
                  'steps', 'auto_escalation', 'parallel_processing', 'is_active', 'created_at']
        read_only_fields = ['created_at']

class WorkflowInstanceSerializer(serializers.ModelSerializer):
    template_details = WorkflowTemplateSerializer(source='template', read_only=True)
    steps = WorkflowStepSerializer(many=True, read_only=True)
    
    class Meta:
        model = WorkflowInstance
        fields = ['id', 'template', 'template_details', 'current_step', 'status',
                  'started_at', 'completed_at', 'steps']
        read_only_fields = ['started_at', 'completed_at']

class PermitApprovalSerializer(serializers.ModelSerializer):
    approver_details = UserMinimalSerializer(source='approver', read_only=True)
    escalated_from_details = UserMinimalSerializer(source='escalated_from', read_only=True)
    delegated_to_details = UserMinimalSerializer(source='delegated_to', read_only=True)
    
    class Meta:
        model = PermitApproval
        fields = ['id', 'approver', 'approver_details', 'approval_level', 'action',
                  'approved', 'comments', 'conditions', 'timestamp', 'escalated_from',
                  'escalated_from_details', 'delegated_to', 'delegated_to_details']
        read_only_fields = ['timestamp']

class PermitExtensionSerializer(serializers.ModelSerializer):
    requested_by_details = UserMinimalSerializer(source='requested_by', read_only=True)
    approved_by_details = UserMinimalSerializer(source='approved_by', read_only=True)
    
    class Meta:
        model = PermitExtension
        fields = ['id', 'requested_by', 'requested_by_details', 'requested_at',
                  'original_end_time', 'new_end_time', 'extension_hours', 'reason',
                  'justification', 'status', 'approved_by', 'approved_by_details',
                  'approved_at', 'comments', 'affects_work_nature', 'new_work_nature',
                  'safety_reassessment_required', 'safety_reassessment_completed',
                  'additional_safety_measures']
        read_only_fields = ['requested_at', 'approved_at', 'extension_hours', 'affects_work_nature']

# Removed WorkTimeExtensionSerializer - time management handled centrally

class PermitAuditSerializer(serializers.ModelSerializer):
    user_details = UserMinimalSerializer(source='user', read_only=True)

    class Meta:
        model = PermitAudit
        fields = ['id', 'action', 'user', 'user_details', 'timestamp', 'comments',
                  'old_values', 'new_values', 'ip_address', 'user_agent']
        read_only_fields = ['timestamp']

class EscalationRuleSerializer(serializers.ModelSerializer):
    permit_type_details = PermitTypeSerializer(source='permit_type', read_only=True)
    
    class Meta:
        model = EscalationRule
        fields = ['id', 'permit_type', 'permit_type_details', 'step_name',
                  'time_limit_hours', 'escalate_to_role', 'notification_method', 'is_active']

class NotificationTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationTemplate
        fields = '__all__'

class SystemIntegrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemIntegration
        fields = '__all__'

class ComplianceReportSerializer(serializers.ModelSerializer):
    generated_by_details = UserMinimalSerializer(source='generated_by', read_only=True)
    
    class Meta:
        model = ComplianceReport
        fields = ['id', 'name', 'report_type', 'generated_by', 'generated_by_details',
                  'generated_at', 'date_from', 'date_to', 'data', 'file_path']
        read_only_fields = ['generated_at']

class PermitSerializer(serializers.ModelSerializer):
    # Related object details
    created_by_details = UserMinimalSerializer(source='created_by', read_only=True)
    issuer_details = UserMinimalSerializer(source='issuer', read_only=True)
    receiver_details = UserMinimalSerializer(source='receiver', read_only=True)
    approver_details = UserMinimalSerializer(source='approver', read_only=True)
    area_incharge_details = UserMinimalSerializer(source='area_incharge', read_only=True)
    department_head_details = UserMinimalSerializer(source='department_head', read_only=True)
    isolation_verified_by_details = UserMinimalSerializer(source='isolation_verified_by', read_only=True)
    permit_type_details = PermitTypeSerializer(source='permit_type', read_only=True)
    approved_by_details = UserMinimalSerializer(source='approved_by', read_only=True)
    verifier_details = UserMinimalSerializer(source='verifier', read_only=True)
    
    # Related collections
    assigned_workers = PermitWorkerSerializer(many=True, read_only=True)
    identified_hazards = PermitHazardSerializer(many=True, read_only=True)
    gas_readings = GasReadingSerializer(many=True, read_only=True)
    photos = PermitPhotoSerializer(many=True, read_only=True)
    signatures = DigitalSignatureSerializer(many=True, read_only=True)
    approvals = PermitApprovalSerializer(many=True, read_only=True)
    extensions = PermitExtensionSerializer(many=True, read_only=True)
    # Removed time_extensions field
    audit_logs = PermitAuditSerializer(many=True, read_only=True)
    workflow = WorkflowInstanceSerializer(read_only=True)
    
    # Work time computed fields
    work_hours_display = serializers.SerializerMethodField()
    is_within_work_hours = serializers.SerializerMethodField()
    
    # Computed fields
    is_expired = serializers.SerializerMethodField()
    duration_hours = serializers.SerializerMethodField()
    risk_color = serializers.SerializerMethodField()
    status_color = serializers.SerializerMethodField()
    
    class Meta:
        model = Permit
        fields = [
            # Basic Information
            'id', 'permit_number', 'permit_type', 'permit_type_details', 'title',
            'description', 'work_order_id',
            
            # Location Information
            'location', 'gps_coordinates', 'site_layout',
            
            # Time Information
            'planned_start_time', 'planned_end_time', 'actual_start_time', 'actual_end_time',
            
            # Work Nature
            'work_nature',
            
            # People Information
            'created_by', 'created_by_details', 'issuer', 'issuer_details',
            'receiver', 'receiver_details',
            
            # Contact Information
            'issuer_designation', 'issuer_department', 'issuer_contact',
            'receiver_designation', 'receiver_department', 'receiver_contact',
            
            # Status and Priority
            'status', 'priority', 'current_approval_level',
            
            # Risk Assessment
            'risk_assessment_id', 'risk_assessment_completed', 'probability',
            'severity', 'risk_score', 'risk_level',
            
            # Safety Information
            'control_measures', 'ppe_requirements', 'special_instructions', 'safety_checklist',
            
            # Isolation Requirements
            'requires_isolation', 'isolation_details', 'isolation_verified_by',
            'isolation_verified_by_details', 'isolation_certificate',
            
            # Authorization
            'approver', 'approver_details', 'area_incharge', 'area_incharge_details',
            'department_head', 'department_head_details',
            
            # Documentation
            'work_procedure', 'method_statement', 'risk_assessment_doc',
            
            # QR Code and Mobile
            'qr_code', 'mobile_created', 'offline_id',
            
            # Timestamps
            'created_at', 'updated_at', 'submitted_at', 'approved_at',
            
            # Approval and Verification tracking
            'approved_by', 'approved_by_details', 'approval_comments',
            'verifier', 'verifier_details', 'verified_at', 'verification_comments',
            
            # Project
            'project',
            
            # Compliance
            'compliance_standards', 'audit_trail',
            
            # Related Collections
            'assigned_workers', 'identified_hazards', 'gas_readings', 'photos',
            'signatures', 'approvals', 'extensions', 'audit_logs', 'workflow',
            
            # Computed Fields
            'is_expired', 'duration_hours', 'risk_color', 'status_color',
            'work_hours_display', 'is_within_work_hours'
        ]
        read_only_fields = [
            'id', 'permit_number', 'created_by', 'created_at', 'updated_at',
            'qr_code', 'risk_score', 'audit_trail'
        ]
    
    def get_is_expired(self, obj):
        return obj.is_expired()
    
    def get_duration_hours(self, obj):
        return obj.get_duration_hours()
    
    def get_risk_color(self, obj):
        colors = {
            'low': '#52c41a',
            'medium': '#faad14',
            'high': '#fa8c16',
            'extreme': '#ff4d4f'
        }
        return colors.get(obj.risk_level, '#d9d9d9')
    
    def get_status_color(self, obj):
        colors = {
            'draft': '#d9d9d9',
            'submitted': '#1890ff',
            'under_review': '#faad14',
            'approved': '#52c41a',
            'active': '#52c41a',
            'suspended': '#fa8c16',
            'completed': '#722ed1',
            'cancelled': '#8c8c8c',
            'expired': '#ff4d4f',
            'rejected': '#ff4d4f'
        }
        return colors.get(obj.status, '#d9d9d9')
    
    def get_work_hours_display(self, obj):
        return obj.get_work_hours_display()
    
    def get_is_within_work_hours(self, obj):
        return obj.is_within_work_hours()

class PermitListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for permit lists"""
    permit_type_details = PermitTypeSerializer(source='permit_type', read_only=True)
    created_by_details = UserMinimalSerializer(source='created_by', read_only=True)
    issuer_details = UserMinimalSerializer(source='issuer', read_only=True)
    receiver_details = UserMinimalSerializer(source='receiver', read_only=True)
    
    # Computed fields
    is_expired = serializers.SerializerMethodField()
    risk_color = serializers.SerializerMethodField()
    status_color = serializers.SerializerMethodField()
    workers_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Permit
        fields = [
            'id', 'permit_number', 'permit_type', 'permit_type_details',
            'title', 'location', 'status', 'priority', 'risk_level',
            'planned_start_time', 'planned_end_time', 'created_at',
            'created_by', 'created_by_details', 'issuer', 'issuer_details',
            'receiver', 'receiver_details', 'is_expired', 'risk_color',
            'status_color', 'workers_count'
        ]
    
    def get_is_expired(self, obj):
        return obj.is_expired()
    
    def get_risk_color(self, obj):
        colors = {
            'low': '#52c41a',
            'medium': '#faad14',
            'high': '#fa8c16',
            'extreme': '#ff4d4f'
        }
        return colors.get(obj.risk_level, '#d9d9d9')
    
    def get_status_color(self, obj):
        colors = {
            'draft': '#d9d9d9',
            'submitted': '#1890ff',
            'under_review': '#faad14',
            'approved': '#52c41a',
            'active': '#52c41a',
            'suspended': '#fa8c16',
            'completed': '#722ed1',
            'cancelled': '#8c8c8c',
            'expired': '#ff4d4f',
            'rejected': '#ff4d4f'
        }
        return colors.get(obj.status, '#d9d9d9')
    
    def get_workers_count(self, obj):
        return obj.assigned_workers.count()
    
    def get_is_expired(self, obj):
        return obj.is_expired()
    
    def get_risk_color(self, obj):
        colors = {
            'low': '#52c41a',
            'medium': '#faad14',
            'high': '#fa8c16',
            'extreme': '#ff4d4f'
        }
        return colors.get(obj.risk_level, '#d9d9d9')
    
    def get_status_color(self, obj):
        colors = {
            'draft': '#d9d9d9',
            'submitted': '#1890ff',
            'under_review': '#faad14',
            'approved': '#52c41a',
            'active': '#52c41a',
            'suspended': '#fa8c16',
            'completed': '#722ed1',
            'cancelled': '#8c8c8c',
            'expired': '#ff4d4f',
            'rejected': '#ff4d4f'
        }
        return colors.get(obj.status, '#d9d9d9')
    
    # Removed extension-related methods

class PermitCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating permits"""
    
    class Meta:
        model = Permit
        fields = [
            'permit_type', 'title', 'description', 'work_order_id',
            'location', 'gps_coordinates', 'site_layout',
            'planned_start_time', 'planned_end_time', 'work_nature',
            'priority', 'risk_assessment_id', 'risk_assessment_completed',
            'probability', 'severity', 'control_measures', 'ppe_requirements',
            'special_instructions', 'safety_checklist', 'requires_isolation',
            'isolation_details', 'isolation_certificate',
            'work_procedure', 'method_statement', 'risk_assessment_doc',
            'mobile_created', 'offline_id', 'compliance_standards'
        ]
    
    def validate_permit_type(self, value):
        """Validate permit type exists and is active"""
        if not value:
            raise serializers.ValidationError("Please select a permit type")
        
        # If value is already a PermitType object (DRF converted it)
        if isinstance(value, PermitType):
            permit_type = value
        else:
            # If it's still an ID, get the object
            try:
                permit_type = PermitType.objects.get(id=int(value))
            except (PermitType.DoesNotExist, ValueError, TypeError):
                # Get available permit types for better error message
                available_types = list(PermitType.objects.filter(is_active=True).values_list('id', 'name'))
                raise serializers.ValidationError(
                    f"Invalid permit type ID '{value}'. Available permit types: {available_types[:5]}..."
                )
        
        if not permit_type.is_active:
            raise serializers.ValidationError("Selected permit type is not active")
        
        return permit_type
    
    def validate(self, attrs):
        """Cross-field validation"""
        # Ensure permit_type is provided
        if not attrs.get('permit_type'):
            raise serializers.ValidationError({
                'permit_type': 'Please select a permit type'
            })
        
        # Validate time fields
        start_time = attrs.get('planned_start_time')
        end_time = attrs.get('planned_end_time')
        
        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError({
                'planned_end_time': 'End time must be after start time'
            })
        
        return attrs
    
    def create(self, validated_data):
        # Set created_by to current user
        validated_data['created_by'] = self.context['request'].user
        
        # Set project from user's project
        user_project = getattr(self.context['request'].user, 'project', None)
        if user_project:
            validated_data['project'] = user_project
        
        return super().create(validated_data)

class PermitStatusUpdateSerializer(serializers.ModelSerializer):
    """Serializer for status updates only"""
    comments = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = Permit
        fields = ['status', 'comments']
    
    def validate_status(self, value):
        instance = self.instance
        if instance and not instance.can_transition_to(value):
            raise serializers.ValidationError(
                f"Cannot transition from {instance.status} to {value}"
            )
        return value

# Analytics and Reporting Serializers
class PermitAnalyticsSerializer(serializers.Serializer):
    total_permits = serializers.IntegerField()
    active_permits = serializers.IntegerField()
    completed_permits = serializers.IntegerField()
    overdue_permits = serializers.IntegerField()
    average_processing_time = serializers.FloatField()
    compliance_rate = serializers.FloatField()
    incident_rate = serializers.FloatField()
    risk_distribution = serializers.DictField()
    status_distribution = serializers.DictField()
    monthly_trends = serializers.ListField()

class DashboardStatsSerializer(serializers.Serializer):
    permits_today = serializers.IntegerField()
    permits_this_week = serializers.IntegerField()
    permits_this_month = serializers.IntegerField()
    pending_approvals = serializers.IntegerField()
    overdue_permits = serializers.IntegerField()
    high_risk_permits = serializers.IntegerField()
    recent_permits = PermitListSerializer(many=True)
    risk_trends = serializers.ListField()
    compliance_score = serializers.FloatField()