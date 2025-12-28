from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinLengthValidator, MaxLengthValidator, MinValueValidator, MaxValueValidator
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from datetime import timedelta, date
import uuid
import json
from decimal import Decimal

User = get_user_model()


class Incident(models.Model):
    """
    Core incident model for workplace incident reporting and tracking
    """
    INCIDENT_TYPE_CHOICES = [
        ('injury', _('Injury')),
        ('near_miss', _('Near Miss')),
        ('spill', _('Spill')),
        ('fire', _('Fire')),
        ('explosion', _('Explosion')),
        ('property_damage', _('Property Damage')),
        ('environmental', _('Environmental')),
        ('security', _('Security')),
        ('vehicle_accident', _('Vehicle Accident')),
        ('equipment_failure', _('Equipment Failure')),
        ('chemical_exposure', _('Chemical Exposure')),
        ('ergonomic', _('Ergonomic')),
        ('electrical', _('Electrical')),
        ('fall_from_height', _('Fall from Height')),
        ('struck_by_object', _('Struck by Object')),
        ('caught_in_between', _('Caught In/Between')),
        ('other', _('Other')),
    ]

    SEVERITY_LEVEL_CHOICES = [
        ('low', _('Low')),
        ('medium', _('Medium')),
        ('high', _('High')),
        ('critical', _('Critical')),
    ]

    STATUS_CHOICES = [
        ('reported', _('Reported')),
        ('8d_initiated', _('8D Process Initiated')),
        ('8d_in_progress', _('8D Process In Progress')),
        ('8d_completed', _('8D Process Completed')),
        ('closed', _('Closed')),
        ('cancelled', _('Cancelled')),
    ]

    # Risk Assessment Choices
    RISK_LEVEL_CHOICES = [
        ('very_low', _('Very Low')),
        ('low', _('Low')),
        ('medium', _('Medium')),
        ('high', _('High')),
        ('very_high', _('Very High')),
    ]

    # Regulatory Framework Choices
    REGULATORY_FRAMEWORK_CHOICES = [
        ('osha', _('OSHA')),
        ('iso_45001', _('ISO 45001')),
        ('iso_14001', _('ISO 14001')),
        ('local_regulation', _('Local Regulation')),
        ('company_policy', _('Company Policy')),
        ('other', _('Other')),
    ]

    # Business Impact Choices
    BUSINESS_IMPACT_CHOICES = [
        ('none', _('None')),
        ('minimal', _('Minimal')),
        ('moderate', _('Moderate')),
        ('significant', _('Significant')),
        ('severe', _('Severe')),
    ]

    # Primary identification
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    incident_id = models.CharField(
        _('Incident ID'),
        max_length=20,
        unique=True,
        help_text=_('Auto-generated unique incident identifier')
    )

    # Basic incident information
    title = models.CharField(
        _('Incident Title'),
        max_length=255,
        validators=[MinLengthValidator(5)]
    )
    description = models.TextField(
        _('Description'),
        validators=[MinLengthValidator(10), MaxLengthValidator(1000)],
        help_text=_('Detailed description of the incident (10-1000 characters)')
    )

    # Classification
    incident_type = models.CharField(
        _('Incident Type'),
        max_length=20,
        choices=INCIDENT_TYPE_CHOICES
    )
    severity_level = models.CharField(
        _('Severity Level'),
        max_length=10,
        choices=SEVERITY_LEVEL_CHOICES
    )
    status = models.CharField(
        _('Status'),
        max_length=20,
        choices=STATUS_CHOICES,
        default='reported'
    )

    # Location and context
    location = models.CharField(_('Location'), max_length=255)
    department = models.CharField(_('Department'), max_length=100)
    date_time_incident = models.DateTimeField(_('Date & Time of Incident'))

    # People involved
    reporter_name = models.CharField(
        _('Reporter Name'),
        max_length=100,
        validators=[MinLengthValidator(2)]
    )
    reported_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='incidents_reported',
        verbose_name=_('Reported By')
    )
    assigned_investigator = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='incidents_investigating',
        verbose_name=_('Assigned Investigator')
    )

    # Project association
    project = models.ForeignKey(
        'authentication.Project',
        on_delete=models.CASCADE,
        related_name='incidents',
        null=True,
        blank=True
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Additional fields
    immediate_action_taken = models.TextField(
        _('Immediate Action Taken'),
        blank=True,
        help_text=_('Actions taken immediately after the incident')
    )
    potential_causes = models.TextField(
        _('Potential Causes'),
        blank=True,
        help_text=_('Initial assessment of potential causes')
    )

    # === COMMERCIAL GRADE ENHANCEMENTS ===

    # Risk Assessment Fields
    risk_level = models.CharField(
        _('Risk Level'),
        max_length=20,
        choices=RISK_LEVEL_CHOICES,
        blank=True,
        help_text=_('Overall risk level assessment')
    )
    probability_score = models.IntegerField(
        _('Probability Score'),
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        help_text=_('Probability of recurrence (1-5 scale)')
    )
    impact_score = models.IntegerField(
        _('Impact Score'),
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        help_text=_('Severity of impact (1-5 scale)')
    )
    risk_matrix_score = models.IntegerField(
        _('Risk Matrix Score'),
        null=True,
        blank=True,
        help_text=_('Calculated risk score (probability × impact)')
    )

    # Cost Impact Analysis
    estimated_cost = models.DecimalField(
        _('Estimated Cost'),
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_('Estimated financial impact')
    )
    actual_cost = models.DecimalField(
        _('Actual Cost'),
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_('Actual financial impact')
    )
    cost_category = models.CharField(
        _('Cost Category'),
        max_length=50,
        choices=[
            ('medical', _('Medical')),
            ('property_damage', _('Property Damage')),
            ('property_repair', _('Property Repair')),
            ('equipment_replacement', _('Equipment Replacement')),
            ('production_loss', _('Production Loss')),
            ('overtime', _('Overtime Costs')),
            ('contractor_fees', _('Contractor Fees')),
            ('legal_fees', _('Legal Fees')),
            ('regulatory_fine', _('Regulatory Fine')),
            ('environmental_cleanup', _('Environmental Cleanup')),
            ('investigation_costs', _('Investigation Costs')),
            ('training_costs', _('Training Costs')),
            ('other', _('Other')),
        ],
        blank=True
    )

    # Regulatory Compliance
    regulatory_framework = models.CharField(
        _('Regulatory Framework'),
        max_length=30,
        choices=REGULATORY_FRAMEWORK_CHOICES,
        blank=True
    )
    regulatory_reportable = models.BooleanField(
        _('Regulatory Reportable'),
        default=False,
        help_text=_('Must be reported to regulatory authorities')
    )
    regulatory_report_date = models.DateTimeField(
        _('Regulatory Report Date'),
        null=True,
        blank=True
    )
    regulatory_reference = models.CharField(
        _('Regulatory Reference'),
        max_length=100,
        blank=True,
        help_text=_('Reference number from regulatory authority')
    )

    # Business Impact Assessment
    business_impact = models.CharField(
        _('Business Impact'),
        max_length=20,
        choices=BUSINESS_IMPACT_CHOICES,
        blank=True
    )
    production_impact_hours = models.DecimalField(
        _('Production Impact (Hours)'),
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True
    )
    personnel_affected_count = models.IntegerField(
        _('Personnel Affected Count'),
        null=True,
        blank=True,
        validators=[MinValueValidator(0)]
    )

    # Enhanced Tracking
    escalation_level = models.IntegerField(
        _('Escalation Level'),
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text=_('Current escalation level (1-5)')
    )
    priority_score = models.IntegerField(
        _('Priority Score'),
        null=True,
        blank=True,
        help_text=_('Calculated priority score for resource allocation')
    )
    external_agencies_notified = models.JSONField(
        _('External Agencies Notified'),
        default=list,
        blank=True,
        help_text=_('List of external agencies that were notified')
    )

    # Weather and Environmental Conditions
    weather_conditions = models.CharField(
        _('Weather Conditions'),
        max_length=100,
        blank=True
    )
    environmental_factors = models.TextField(
        _('Environmental Factors'),
        blank=True,
        help_text=_('Environmental conditions that may have contributed')
    )

    # Equipment and Tools Involved
    equipment_involved = models.TextField(
        _('Equipment Involved'),
        blank=True,
        help_text=_('Equipment, tools, or machinery involved in the incident')
    )
    equipment_serial_numbers = models.TextField(
        _('Equipment Serial Numbers'),
        blank=True
    )

    # Work Process Information
    work_process = models.CharField(
        _('Work Process'),
        max_length=200,
        blank=True,
        help_text=_('Specific work process being performed')
    )
    work_permit_number = models.CharField(
        _('Work Permit Number'),
        max_length=50,
        blank=True
    )
    safety_procedures_followed = models.BooleanField(
        _('Safety Procedures Followed'),
        null=True,
        blank=True
    )

    # Communication and Notification
    management_notified_at = models.DateTimeField(
        _('Management Notified At'),
        null=True,
        blank=True
    )
    family_notified = models.BooleanField(
        _('Family Notified'),
        default=False
    )
    media_attention = models.BooleanField(
        _('Media Attention'),
        default=False
    )
    
    # ESG specific fields
    regulatory_report_required = models.BooleanField(
        _('Regulatory Report Required'),
        default=False
    )
    regulatory_body = models.CharField(
        _('Regulatory Body'),
        max_length=100,
        blank=True
    )
    is_biodiversity_event = models.BooleanField(
        _('Is Biodiversity Event'),
        default=False
    )
    environmental_severity = models.CharField(
        _('Environmental Severity'),
        max_length=10,
        choices=SEVERITY_LEVEL_CHOICES,
        blank=True
    )

    class Meta:
        verbose_name = _('Incident')
        verbose_name_plural = _('Incidents')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['incident_id']),
            models.Index(fields=['status']),
            models.Index(fields=['severity_level']),
            models.Index(fields=['date_time_incident']),
        ]

    def __str__(self):
        return f"{self.incident_id} - {self.title}"

    def save(self, *args, **kwargs):
        if not self.incident_id:
            # Generate incident ID: INC-YYYY-NNNN
            year = timezone.now().year
            last_incident = Incident.objects.filter(
                incident_id__startswith=f'INC-{year}-'
            ).order_by('-incident_id').first()

            if last_incident:
                last_number = int(last_incident.incident_id.split('-')[-1])
                new_number = last_number + 1
            else:
                new_number = 1

            self.incident_id = f'INC-{year}-{new_number:04d}'

        # Auto-assign reporter as investigator
        if not self.assigned_investigator and self.reported_by:
            self.assigned_investigator = self.reported_by
            
        # Auto-create 8D process and update status
        if self.assigned_investigator and not hasattr(self, '_skip_8d_creation'):
            # Check if 8D process already exists
            if not hasattr(self, 'eight_d_process'):
                try:
                    from .models import EightDProcess
                    EightDProcess.objects.get(incident=self)
                except EightDProcess.DoesNotExist:
                    try:
                        # Create 8D process automatically
                        EightDProcess.objects.create(
                            incident=self,
                            problem_statement=f"8D Problem Solving for: {self.title}",
                            champion=self.assigned_investigator,
                            status='initiated',
                            current_discipline=1
                        )
                        # Update incident status to 8D initiated
                        if self.status == 'reported':
                            self.status = '8d_initiated'
                    except Exception as e:
                        # Log the error but don't fail the incident creation
                        print(f"Warning: Failed to create 8D process for incident {self.incident_id}: {e}")
                except Exception as e:
                    # Log any other errors
                    print(f"Warning: Error checking for existing 8D process: {e}")

        # Calculate risk matrix score
        if self.probability_score and self.impact_score:
            self.risk_matrix_score = self.probability_score * self.impact_score

            # Determine risk level based on matrix score
            if self.risk_matrix_score <= 4:
                self.risk_level = 'very_low'
            elif self.risk_matrix_score <= 8:
                self.risk_level = 'low'
            elif self.risk_matrix_score <= 12:
                self.risk_level = 'medium'
            elif self.risk_matrix_score <= 20:
                self.risk_level = 'high'
            else:
                self.risk_level = 'very_high'

        # Calculate priority score for resource allocation
        severity_weights = {'low': 1, 'medium': 2, 'high': 3, 'critical': 4}
        risk_weights = {'very_low': 1, 'low': 2, 'medium': 3, 'high': 4, 'very_high': 5}
        business_impact_weights = {'none': 0, 'minimal': 1, 'moderate': 2, 'significant': 3, 'severe': 4}

        severity_weight = severity_weights.get(self.severity_level, 1)
        risk_weight = risk_weights.get(self.risk_level, 1) if self.risk_level else 1
        business_weight = business_impact_weights.get(self.business_impact, 0) if self.business_impact else 0

        self.priority_score = (severity_weight * 3) + (risk_weight * 2) + business_weight

        # Auto-escalation based on severity and time
        if self.severity_level in ['high', 'critical'] and not hasattr(self, '_skip_escalation'):
            days_since_created = (timezone.now() - self.created_at).days if self.created_at else 0
            if days_since_created > 1 and self.escalation_level < 3:
                old_escalation = self.escalation_level
                self.escalation_level = min(self.escalation_level + 1, 5)
                
                # Restrict creator access on escalation
                if old_escalation <= 1 and self.escalation_level > 1:
                    from permissions.escalation import restrict_creator_access_on_escalation
                    restrict_creator_access_on_escalation(self)

        super().save(*args, **kwargs)

    @property
    def is_overdue(self):
        """Check if incident is overdue based on severity and time elapsed"""
        if self.status == 'closed':
            return False

        days_elapsed = (timezone.now() - self.created_at).days

        # Define SLA based on severity
        sla_days = {
            'critical': 1,
            'high': 3,
            'medium': 7,
            'low': 14
        }

        return days_elapsed > sla_days.get(self.severity_level, 14)

    @property
    def days_since_reported(self):
        """Calculate days since incident was reported"""
        return (timezone.now() - self.created_at).days

    @property
    def estimated_completion_date(self):
        """Estimate completion date based on severity and current status"""
        if self.status == 'closed':
            return None

        # Base completion times in days
        completion_times = {
            'critical': 3,
            'high': 7,
            'medium': 14,
            'low': 21
        }

        base_days = completion_times.get(self.severity_level, 14)
        return self.created_at + timedelta(days=base_days)

    def calculate_financial_impact(self):
        """Calculate total financial impact including direct and indirect costs"""
        total_cost = Decimal('0.00')

        if self.actual_cost:
            total_cost += self.actual_cost
        elif self.estimated_cost:
            total_cost += self.estimated_cost

        # Add production loss if applicable
        if self.production_impact_hours:
            # Assume $100/hour production loss (configurable)
            production_loss = self.production_impact_hours * Decimal('100.00')
            total_cost += production_loss

        return total_cost


class IncidentAttachment(models.Model):
    """
    File attachments for incidents (images, documents, videos)
    """
    incident = models.ForeignKey(
        Incident,
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    file = models.FileField(
        upload_to='incident_attachments/%Y/%m/',
        verbose_name=_('File')
    )
    filename = models.CharField(_('Original Filename'), max_length=255)
    file_size = models.PositiveIntegerField(_('File Size (bytes)'))
    file_type = models.CharField(_('File Type'), max_length=50)
    description = models.CharField(
        _('Description'),
        max_length=255,
        blank=True,
        help_text=_('Optional description of the attachment')
    )
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='incident_attachments'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('Incident Attachment')
        verbose_name_plural = _('Incident Attachments')
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.incident.incident_id} - {self.filename}"


# Investigation and CAPA models removed - using 8D methodology only


class IncidentAuditLog(models.Model):
    """
    Audit trail for incident management activities
    """
    ACTION_CHOICES = [
        ('created', _('Created')),
        ('updated', _('Updated')),
        ('status_changed', _('Status Changed')),
        ('assigned', _('Assigned')),
        ('investigation_started', _('Investigation Started')),
        ('investigation_completed', _('Investigation Completed')),
        ('capa_created', _('CAPA Created')),
        ('capa_completed', _('CAPA Completed')),
        ('closed', _('Closed')),
        ('reopened', _('Reopened')),
    ]

    incident = models.ForeignKey(
        Incident,
        on_delete=models.CASCADE,
        related_name='audit_logs'
    )
    action = models.CharField(_('Action'), max_length=30, choices=ACTION_CHOICES)
    description = models.TextField(_('Description'))
    performed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='incident_actions'
    )
    timestamp = models.DateTimeField(auto_now_add=True)

    # Store previous and new values for tracking changes
    previous_value = models.TextField(_('Previous Value'), blank=True, null=True)
    new_value = models.TextField(_('New Value'), blank=True, null=True)

    # Additional context
    ip_address = models.GenericIPAddressField(_('IP Address'), null=True, blank=True)
    user_agent = models.TextField(_('User Agent'), blank=True)

    class Meta:
        verbose_name = _('Incident Audit Log')
        verbose_name_plural = _('Incident Audit Logs')
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['incident', '-timestamp']),
            models.Index(fields=['action']),
        ]

    def __str__(self):
        return f"{self.incident.incident_id} - {self.get_action_display()} by {self.performed_by}"


class IncidentNotification(models.Model):
    """
    Notification settings and logs for incident management
    """
    NOTIFICATION_TYPE_CHOICES = [
        ('incident_created', _('Incident Created')),
        ('incident_assigned', _('Incident Assigned')),
        ('investigation_due', _('Investigation Due')),
        ('capa_due', _('CAPA Due')),
        ('capa_overdue', _('CAPA Overdue')),
        ('status_changed', _('Status Changed')),
    ]

    incident = models.ForeignKey(
        Incident,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    notification_type = models.CharField(
        _('Notification Type'),
        max_length=30,
        choices=NOTIFICATION_TYPE_CHOICES
    )
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='incident_notifications'
    )
    message = models.TextField(_('Notification Message'))
    sent_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(_('Read At'), null=True, blank=True)

    class Meta:
        verbose_name = _('Incident Notification')
        verbose_name_plural = _('Incident Notifications')
        ordering = ['-sent_at']

    def __str__(self):
        return f"{self.get_notification_type_display()} - {self.recipient.get_full_name()}"

    @property
    def is_read(self):
        return self.read_at is not None


# === COMMERCIAL GRADE ADDITIONAL MODELS ===

class IncidentCategory(models.Model):
    """
    Customizable incident categories for different industries
    """
    name = models.CharField(_('Category Name'), max_length=100, unique=True)
    description = models.TextField(_('Description'), blank=True)
    color_code = models.CharField(_('Color Code'), max_length=7, default='#007bff')
    is_active = models.BooleanField(_('Is Active'), default=True)
    sort_order = models.IntegerField(_('Sort Order'), default=0)

    # Industry-specific categorization
    industry_type = models.CharField(
        _('Industry Type'),
        max_length=50,
        choices=[
            ('construction', _('Construction')),
            ('manufacturing', _('Manufacturing')),
            ('oil_gas', _('Oil & Gas')),
            ('chemical', _('Chemical')),
            ('mining', _('Mining')),
            ('general', _('General')),
        ],
        default='general'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Incident Category')
        verbose_name_plural = _('Incident Categories')
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name


class RiskAssessmentTemplate(models.Model):
    """
    Templates for risk assessment based on incident types
    """
    name = models.CharField(_('Template Name'), max_length=100)
    incident_types = models.JSONField(
        _('Applicable Incident Types'),
        default=list,
        help_text=_('List of incident types this template applies to')
    )

    # Risk factors and their weights
    risk_factors = models.JSONField(
        _('Risk Factors'),
        default=dict,
        help_text=_('Risk factors and their scoring criteria')
    )

    # Probability matrix
    probability_criteria = models.JSONField(
        _('Probability Criteria'),
        default=dict,
        help_text=_('Criteria for probability scoring (1-5)')
    )

    # Impact matrix
    impact_criteria = models.JSONField(
        _('Impact Criteria'),
        default=dict,
        help_text=_('Criteria for impact scoring (1-5)')
    )

    is_default = models.BooleanField(_('Is Default Template'), default=False)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='risk_templates_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Risk Assessment Template')
        verbose_name_plural = _('Risk Assessment Templates')
        ordering = ['name']

    def __str__(self):
        return self.name


class IncidentMetrics(models.Model):
    """
    Calculated metrics and KPIs for incidents
    """
    incident = models.OneToOneField(
        Incident,
        on_delete=models.CASCADE,
        related_name='metrics'
    )

    # Time-based metrics
    time_to_report = models.DurationField(
        _('Time to Report'),
        null=True,
        blank=True,
        help_text=_('Time from incident occurrence to reporting')
    )
    time_to_investigate = models.DurationField(
        _('Time to Investigate'),
        null=True,
        blank=True,
        help_text=_('Time from reporting to investigation start')
    )
    time_to_close = models.DurationField(
        _('Time to Close'),
        null=True,
        blank=True,
        help_text=_('Total time from reporting to closure')
    )

    # Quality metrics
    investigation_quality_score = models.IntegerField(
        _('Investigation Quality Score'),
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        null=True,
        blank=True
    )
    capa_effectiveness_score = models.IntegerField(
        _('CAPA Effectiveness Score'),
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        null=True,
        blank=True
    )

    # Recurrence tracking
    is_recurrence = models.BooleanField(_('Is Recurrence'), default=False)
    related_incidents = models.ManyToManyField(
        Incident,
        blank=True,
        related_name='related_to',
        help_text=_('Related or similar incidents')
    )

    # Compliance metrics
    regulatory_compliance_score = models.IntegerField(
        _('Regulatory Compliance Score'),
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        null=True,
        blank=True
    )

    calculated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Incident Metrics')
        verbose_name_plural = _('Incident Metrics')

    def __str__(self):
        return f"Metrics for {self.incident.incident_id}"


class IncidentWorkflow(models.Model):
    """
    Customizable workflow definitions for different incident types
    """
    name = models.CharField(_('Workflow Name'), max_length=100)
    description = models.TextField(_('Description'), blank=True)

    # Workflow configuration
    incident_types = models.JSONField(
        _('Applicable Incident Types'),
        default=list,
        help_text=_('Incident types this workflow applies to')
    )

    # Workflow steps and rules
    workflow_steps = models.JSONField(
        _('Workflow Steps'),
        default=list,
        help_text=_('Ordered list of workflow steps and their configurations')
    )

    # Escalation rules
    escalation_rules = models.JSONField(
        _('Escalation Rules'),
        default=dict,
        help_text=_('Rules for automatic escalation based on time and conditions')
    )

    # Notification rules
    notification_rules = models.JSONField(
        _('Notification Rules'),
        default=dict,
        help_text=_('Rules for automatic notifications at each step')
    )

    is_active = models.BooleanField(_('Is Active'), default=True)
    is_default = models.BooleanField(_('Is Default'), default=False)

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='workflows_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Incident Workflow')
        verbose_name_plural = _('Incident Workflows')
        ordering = ['name']

    def __str__(self):
        return self.name


class IncidentCostCenter(models.Model):
    """
    Cost centers for tracking incident-related expenses
    """
    incident = models.ForeignKey(
        Incident,
        on_delete=models.CASCADE,
        related_name='cost_centers'
    )

    cost_type = models.CharField(
        _('Cost Type'),
        max_length=50,
        choices=[
            ('medical', _('Medical Treatment')),
            ('property_repair', _('Property Repair')),
            ('equipment_replacement', _('Equipment Replacement')),
            ('production_loss', _('Production Loss')),
            ('overtime', _('Overtime Costs')),
            ('contractor_fees', _('Contractor Fees')),
            ('legal_fees', _('Legal Fees')),
            ('regulatory_fine', _('Regulatory Fine')),
            ('environmental_cleanup', _('Environmental Cleanup')),
            ('investigation_costs', _('Investigation Costs')),
            ('training_costs', _('Training Costs')),
            ('other', _('Other')),
        ]
    )

    description = models.CharField(_('Description'), max_length=255)
    estimated_amount = models.DecimalField(
        _('Estimated Amount'),
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    actual_amount = models.DecimalField(
        _('Actual Amount'),
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )

    # Budget tracking
    budget_code = models.CharField(_('Budget Code'), max_length=50, blank=True)
    department_charged = models.CharField(_('Department Charged'), max_length=100, blank=True)

    # Approval workflow
    requires_approval = models.BooleanField(_('Requires Approval'), default=False)
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cost_approvals'
    )
    approved_at = models.DateTimeField(_('Approved At'), null=True, blank=True)

    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='cost_entries_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Incident Cost Center')
        verbose_name_plural = _('Incident Cost Centers')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.incident.incident_id} - {self.get_cost_type_display()}: {self.actual_amount or self.estimated_amount}"


class IncidentLearning(models.Model):
    """
    Lessons learned and knowledge management from incidents
    """
    incident = models.OneToOneField(
        Incident,
        on_delete=models.CASCADE,
        related_name='learning'
    )

    # Lessons learned
    key_findings = models.TextField(
        _('Key Findings'),
        help_text=_('Main findings from the incident investigation')
    )
    lessons_learned = models.TextField(
        _('Lessons Learned'),
        help_text=_('Key lessons that can be applied to prevent similar incidents')
    )
    best_practices = models.TextField(
        _('Best Practices'),
        blank=True,
        help_text=_('Best practices identified or reinforced')
    )

    # Knowledge sharing
    applicable_to = models.JSONField(
        _('Applicable To'),
        default=list,
        help_text=_('Departments, processes, or areas where these lessons apply')
    )

    # Training implications
    training_required = models.BooleanField(_('Training Required'), default=False)
    training_topics = models.TextField(
        _('Training Topics'),
        blank=True,
        help_text=_('Specific training topics identified')
    )

    # Policy/procedure updates
    policy_updates_required = models.BooleanField(_('Policy Updates Required'), default=False)
    policy_recommendations = models.TextField(
        _('Policy Recommendations'),
        blank=True,
        help_text=_('Recommended policy or procedure updates')
    )

    # Sharing and communication
    shared_with_teams = models.JSONField(
        _('Shared With Teams'),
        default=list,
        help_text=_('Teams or departments this learning has been shared with')
    )
    communication_method = models.CharField(
        _('Communication Method'),
        max_length=50,
        choices=[
            ('toolbox_talk', _('Toolbox Talk')),
            ('safety_meeting', _('Safety Meeting')),
            ('newsletter', _('Newsletter')),
            ('training_session', _('Training Session')),
            ('bulletin_board', _('Bulletin Board')),
            ('email', _('Email')),
            ('other', _('Other')),
        ],
        blank=True
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='learnings_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Incident Learning')
        verbose_name_plural = _('Incident Learnings')

    def __str__(self):
        return f"Learning from {self.incident.incident_id}"


# === 8D METHODOLOGY MODELS ===

class EightDProcess(models.Model):
    """
    8D (Eight Disciplines) Problem Solving Process
    """
    STATUS_CHOICES = [
        ('initiated', _('Initiated')),
        ('in_progress', _('In Progress')),
        ('completed', _('Completed')),
        ('closed', _('Closed')),
        ('cancelled', _('Cancelled')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    incident = models.OneToOneField(
        Incident,
        on_delete=models.CASCADE,
        related_name='eight_d_process'
    )
    eight_d_id = models.CharField(
        _('8D ID'),
        max_length=20,
        unique=True,
        help_text=_('Auto-generated unique 8D identifier')
    )

    # Process details
    problem_statement = models.TextField(
        _('Problem Statement'),
        help_text=_('Clear, concise problem statement (D2)')
    )
    champion = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='eight_d_processes_championed',
        verbose_name=_('8D Champion'),
        help_text=_('Person responsible for the 8D process')
    )

    # Timeline
    initiated_date = models.DateTimeField(_('Initiated Date'), auto_now_add=True)
    target_completion_date = models.DateTimeField(
        _('Target Completion Date'),
        null=True,
        blank=True
    )
    actual_completion_date = models.DateTimeField(
        _('Actual Completion Date'),
        null=True,
        blank=True
    )

    # Status tracking
    status = models.CharField(
        _('8D Status'),
        max_length=20,
        choices=STATUS_CHOICES,
        default='initiated'
    )
    current_discipline = models.IntegerField(
        _('Current Discipline'),
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(8)],
        help_text=_('Current 8D step (1-8)')
    )

    # Overall progress
    overall_progress = models.IntegerField(
        _('Overall Progress (%)'),
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('8D Process')
        verbose_name_plural = _('8D Processes')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.eight_d_id} - {self.incident.incident_id}"

    def save(self, *args, **kwargs):
        if not self.eight_d_id:
            # Generate 8D ID: 8D-YYYY-NNNN
            year = timezone.now().year
            last_8d = EightDProcess.objects.filter(
                eight_d_id__startswith=f'8D-{year}-'
            ).order_by('-eight_d_id').first()

            if last_8d:
                last_number = int(last_8d.eight_d_id.split('-')[-1])
                new_number = last_number + 1
            else:
                new_number = 1

            self.eight_d_id = f'8D-{year}-{new_number:04d}'

        super().save(*args, **kwargs)


class EightDDiscipline(models.Model):
    """
    Individual 8D Discipline (Step) tracking
    """
    STATUS_CHOICES = [
        ('not_started', _('Not Started')),
        ('in_progress', _('In Progress')),
        ('completed', _('Completed')),
        ('verified', _('Verified')),
        ('approved', _('Approved')),
    ]

    DISCIPLINE_CHOICES = [
        (1, _('D1: Establish the Team')),
        (2, _('D2: Describe the Problem')),
        (3, _('D3: Develop Interim Containment Actions')),
        (4, _('D4: Determine Root Causes')),
        (5, _('D5: Develop Permanent Corrective Actions')),
        (6, _('D6: Implement Corrective Actions')),
        (7, _('D7: Prevent Recurrence')),
        (8, _('D8: Recognize the Team')),
    ]

    eight_d_process = models.ForeignKey(
        EightDProcess,
        on_delete=models.CASCADE,
        related_name='disciplines'
    )
    discipline_number = models.IntegerField(
        _('Discipline Number'),
        choices=DISCIPLINE_CHOICES,
        validators=[MinValueValidator(1), MaxValueValidator(8)]
    )

    # Status and progress
    status = models.CharField(
        _('Status'),
        max_length=20,
        choices=STATUS_CHOICES,
        default='not_started'
    )
    progress_percentage = models.IntegerField(
        _('Progress (%)'),
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )

    # Discipline details
    description = models.TextField(
        _('Description'),
        help_text=_('Detailed description of work done in this discipline')
    )
    deliverables = models.TextField(
        _('Deliverables'),
        blank=True,
        help_text=_('Key deliverables and outputs from this discipline')
    )

    # Assignment and timeline
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_8d_disciplines'
    )
    start_date = models.DateTimeField(_('Start Date'), null=True, blank=True)
    target_date = models.DateTimeField(_('Target Date'), null=True, blank=True)
    completion_date = models.DateTimeField(_('Completion Date'), null=True, blank=True)

    # Verification
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_8d_disciplines'
    )
    verified_date = models.DateTimeField(_('Verified Date'), null=True, blank=True)
    verification_notes = models.TextField(_('Verification Notes'), blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('8D Discipline')
        verbose_name_plural = _('8D Disciplines')
        unique_together = ['eight_d_process', 'discipline_number']
        ordering = ['discipline_number']

    def __str__(self):
        return f"{self.eight_d_process.eight_d_id} - D{self.discipline_number}"

    @property
    def discipline_name(self):
        return dict(self.DISCIPLINE_CHOICES)[self.discipline_number]


class EightDTeam(models.Model):
    """
    8D Team members (D1: Establish the Team)
    """
    ROLE_CHOICES = [
        ('champion', _('8D Champion')),
        ('team_leader', _('Team Leader')),
        ('subject_expert', _('Subject Matter Expert')),
        ('process_owner', _('Process Owner')),
        ('quality_rep', _('Quality Representative')),
        ('technical_expert', _('Technical Expert')),
        ('member', _('Team Member')),
        ('sponsor', _('Sponsor (Site In-charge)')),
    ]

    eight_d_process = models.ForeignKey(
        EightDProcess,
        on_delete=models.CASCADE,
        related_name='team_members'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='eight_d_teams'
    )
    role = models.CharField(
        _('Role'),
        max_length=20,
        choices=ROLE_CHOICES,
        default='member'
    )
    expertise_area = models.CharField(
        _('Expertise Area'),
        max_length=100,
        blank=True,
        help_text=_('Area of expertise relevant to the problem')
    )
    responsibilities = models.TextField(
        _('Responsibilities'),
        blank=True,
        help_text=_('Specific responsibilities in the 8D process')
    )

    # Participation tracking
    is_active = models.BooleanField(_('Is Active'), default=True)
    joined_date = models.DateTimeField(_('Joined Date'), auto_now_add=True)
    left_date = models.DateTimeField(_('Left Date'), null=True, blank=True)

    # Recognition (D8)
    recognition_notes = models.TextField(
        _('Recognition Notes'),
        blank=True,
        help_text=_('Recognition and appreciation notes (D8)')
    )
    recognized_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='eight_d_recognitions_given'
    )
    recognized_date = models.DateTimeField(_('Recognized Date'), null=True, blank=True)

    class Meta:
        verbose_name = _('8D Team Member')
        verbose_name_plural = _('8D Team Members')
        unique_together = ['eight_d_process', 'user']

    @property
    def is_recognized(self):
        """Check if team member has been recognized"""
        return self.recognized_by is not None and self.recognized_date is not None

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.get_role_display()}"


class EightDContainmentAction(models.Model):
    """
    Interim Containment Actions (D3)
    """
    STATUS_CHOICES = [
        ('planned', _('Planned')),
        ('implemented', _('Implemented')),
        ('verified', _('Verified')),
        ('ineffective', _('Ineffective')),
    ]

    eight_d_process = models.ForeignKey(
        EightDProcess,
        on_delete=models.CASCADE,
        related_name='containment_actions'
    )
    action_description = models.TextField(
        _('Containment Action Description'),
        help_text=_('Detailed description of the interim containment action')
    )
    rationale = models.TextField(
        _('Rationale'),
        help_text=_('Why this containment action was chosen')
    )

    # Implementation details
    responsible_person = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='containment_actions_responsible'
    )
    implementation_date = models.DateTimeField(
        _('Implementation Date'),
        null=True,
        blank=True
    )
    verification_date = models.DateTimeField(
        _('Verification Date'),
        null=True,
        blank=True
    )

    # Status and effectiveness
    status = models.CharField(
        _('Status'),
        max_length=20,
        choices=STATUS_CHOICES,
        default='planned'
    )
    effectiveness_rating = models.IntegerField(
        _('Effectiveness Rating'),
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        help_text=_('Rate effectiveness from 1 (poor) to 5 (excellent)')
    )
    verification_notes = models.TextField(
        _('Verification Notes'),
        blank=True,
        help_text=_('Notes on verification of containment effectiveness')
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('8D Containment Action')
        verbose_name_plural = _('8D Containment Actions')
        ordering = ['-created_at']

    def __str__(self):
        return f"Containment Action - {self.eight_d_process.eight_d_id}"


class EightDRootCause(models.Model):
    """
    Root Cause Analysis (D4: Determine Root Causes)
    """
    CAUSE_TYPE_CHOICES = [
        ('immediate', _('Immediate Cause')),
        ('contributing', _('Contributing Cause')),
        ('root', _('Root Cause')),
        ('systemic', _('Systemic Cause')),
    ]

    ANALYSIS_METHOD_CHOICES = [
        ('5_whys', _('5 Whys')),
        ('fishbone', _('Fishbone Diagram')),
        ('fault_tree', _('Fault Tree Analysis')),
        ('barrier_analysis', _('Barrier Analysis')),
        ('change_analysis', _('Change Analysis')),
        ('timeline', _('Timeline Analysis')),
        ('other', _('Other Method')),
    ]

    eight_d_process = models.ForeignKey(
        EightDProcess,
        on_delete=models.CASCADE,
        related_name='root_causes'
    )
    cause_description = models.TextField(
        _('Cause Description'),
        help_text=_('Detailed description of the identified cause')
    )
    cause_type = models.CharField(
        _('Cause Type'),
        max_length=20,
        choices=CAUSE_TYPE_CHOICES,
        default='contributing'
    )
    analysis_method = models.CharField(
        _('Analysis Method'),
        max_length=20,
        choices=ANALYSIS_METHOD_CHOICES,
        help_text=_('Method used to identify this cause')
    )

    # Evidence and verification
    supporting_evidence = models.TextField(
        _('Supporting Evidence'),
        help_text=_('Evidence that supports this cause identification')
    )
    verification_method = models.TextField(
        _('Verification Method'),
        help_text=_('How this cause was verified')
    )
    is_verified = models.BooleanField(_('Is Verified'), default=False)

    # Impact assessment
    impact_assessment = models.TextField(
        _('Impact Assessment'),
        blank=True,
        help_text=_('Assessment of this cause\'s impact on the problem')
    )
    likelihood_score = models.IntegerField(
        _('Likelihood Score'),
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        help_text=_('Likelihood this cause contributed (1-5 scale)')
    )

    # Assignment
    identified_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='root_causes_identified'
    )
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='root_causes_verified'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('8D Root Cause')
        verbose_name_plural = _('8D Root Causes')
        ordering = ['cause_type', '-created_at']

    def __str__(self):
        return f"{self.get_cause_type_display()} - {self.eight_d_process.eight_d_id}"


class EightDCorrectiveAction(models.Model):
    """
    Permanent Corrective Actions (D5 & D6)
    """
    ACTION_TYPE_CHOICES = [
        ('eliminate', _('Eliminate Root Cause')),
        ('control', _('Control Root Cause')),
        ('detect', _('Improve Detection')),
        ('prevent', _('Prevent Occurrence')),
    ]

    STATUS_CHOICES = [
        ('planned', _('Planned')),
        ('approved', _('Approved')),
        ('in_progress', _('In Progress')),
        ('implemented', _('Implemented')),
        ('verified', _('Verified')),
        ('effective', _('Effective')),
        ('ineffective', _('Ineffective')),
    ]

    eight_d_process = models.ForeignKey(
        EightDProcess,
        on_delete=models.CASCADE,
        related_name='corrective_actions'
    )
    root_cause = models.ForeignKey(
        EightDRootCause,
        on_delete=models.CASCADE,
        related_name='corrective_actions',
        help_text=_('Root cause this action addresses')
    )

    # Action details
    action_description = models.TextField(
        _('Corrective Action Description'),
        help_text=_('Detailed description of the permanent corrective action')
    )
    action_type = models.CharField(
        _('Action Type'),
        max_length=20,
        choices=ACTION_TYPE_CHOICES,
        default='eliminate'
    )
    rationale = models.TextField(
        _('Rationale'),
        help_text=_('Why this corrective action was chosen')
    )

    # Implementation details
    responsible_person = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='corrective_actions_responsible'
    )
    target_date = models.DateField(_('Target Implementation Date'))
    actual_implementation_date = models.DateField(
        _('Actual Implementation Date'),
        null=True,
        blank=True
    )

    # Status and verification
    status = models.CharField(
        _('Status'),
        max_length=20,
        choices=STATUS_CHOICES,
        default='planned'
    )
    implementation_notes = models.TextField(
        _('Implementation Notes'),
        blank=True,
        help_text=_('Notes on implementation progress and challenges')
    )

    # Implementation tracking (D6)
    implementation_plan = models.TextField(
        _('Implementation Plan'),
        blank=True,
        help_text=_('Detailed plan for implementing this corrective action')
    )
    implementation_start_date = models.DateField(
        _('Implementation Start Date'),
        null=True,
        blank=True
    )
    implementation_progress = models.IntegerField(
        _('Implementation Progress'),
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        default=0,
        help_text=_('Implementation progress percentage (0-100)')
    )
    progress_notes = models.TextField(
        _('Progress Notes'),
        blank=True,
        help_text=_('Latest progress notes and updates')
    )
    completion_evidence = models.TextField(
        _('Completion Evidence'),
        blank=True,
        help_text=_('Evidence of implementation completion')
    )
    resources_required = models.TextField(
        _('Resources Required'),
        blank=True,
        help_text=_('Resources needed to implement the action')
    )

    # Effectiveness verification
    verification_method = models.TextField(
        _('Verification Method'),
        blank=True,
        help_text=_('How effectiveness will be/was verified')
    )
    verification_date = models.DateField(
        _('Verification Date'),
        null=True,
        blank=True
    )
    validation_results = models.TextField(
        _('Validation Results'),
        blank=True,
        help_text=_('Results of action validation')
    )
    effectiveness_rating = models.IntegerField(
        _('Effectiveness Rating'),
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        help_text=_('Rate effectiveness from 1 (poor) to 5 (excellent)')
    )
    verification_notes = models.TextField(
        _('Verification Notes'),
        blank=True,
        help_text=_('Results of effectiveness verification')
    )

    # Cost tracking
    estimated_cost = models.DecimalField(
        _('Estimated Cost'),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    actual_cost = models.DecimalField(
        _('Actual Cost'),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('8D Corrective Action')
        verbose_name_plural = _('8D Corrective Actions')
        ordering = ['-created_at']

    def __str__(self):
        return f"Corrective Action - {self.eight_d_process.eight_d_id}"


class EightDAnalysisMethod(models.Model):
    """
    Analysis Method Data for D4 Root Cause Analysis
    """
    METHOD_TYPE_CHOICES = [
        ('5_whys', _('5 Whys')),
        ('fishbone', _('Fishbone Diagram')),
        ('fault_tree', _('Fault Tree Analysis')),
        ('barrier_analysis', _('Barrier Analysis')),
        ('change_analysis', _('Change Analysis')),
        ('timeline', _('Timeline Analysis')),
    ]

    root_cause = models.ForeignKey(
        EightDRootCause,
        on_delete=models.CASCADE,
        related_name='analysis_methods'
    )
    method_type = models.CharField(
        _('Analysis Method Type'),
        max_length=20,
        choices=METHOD_TYPE_CHOICES
    )
    method_data = models.JSONField(
        _('Method Data'),
        default=dict,
        help_text=_('Method-specific analysis data')
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='analysis_methods_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('8D Analysis Method')
        verbose_name_plural = _('8D Analysis Methods')
        unique_together = ['root_cause', 'method_type']

    def __str__(self):
        return f"{self.get_method_type_display()} - {self.root_cause}"


class EightDPreventionAction(models.Model):
    """
    Prevention Actions (D7: Prevent Recurrence)
    """
    PREVENTION_TYPE_CHOICES = [
        ('process_change', _('Process Change')),
        ('system_update', _('System Update')),
        ('training', _('Training Program')),
        ('procedure_update', _('Procedure Update')),
        ('design_change', _('Design Change')),
        ('control_enhancement', _('Control Enhancement')),
        ('monitoring', _('Monitoring System')),
        ('other', _('Other')),
    ]

    STATUS_CHOICES = [
        ('planned', _('Planned')),
        ('in_progress', _('In Progress')),
        ('implemented', _('Implemented')),
        ('verified', _('Verified')),
        ('effective', _('Effective')),
    ]

    eight_d_process = models.ForeignKey(
        EightDProcess,
        on_delete=models.CASCADE,
        related_name='prevention_actions'
    )

    # Prevention details
    prevention_description = models.TextField(
        _('Prevention Action Description'),
        help_text=_('Detailed description of the prevention action')
    )
    prevention_type = models.CharField(
        _('Prevention Type'),
        max_length=20,
        choices=PREVENTION_TYPE_CHOICES,
        default='process_change'
    )
    scope_of_application = models.TextField(
        _('Scope of Application'),
        help_text=_('Where and how this prevention action will be applied')
    )

    # Implementation
    responsible_person = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='prevention_actions_responsible'
    )
    target_date = models.DateField(_('Target Implementation Date'))
    implementation_date = models.DateField(
        _('Implementation Date'),
        null=True,
        blank=True
    )

    # Status and verification
    status = models.CharField(
        _('Status'),
        max_length=20,
        choices=STATUS_CHOICES,
        default='planned'
    )
    verification_method = models.TextField(
        _('Verification Method'),
        help_text=_('How prevention effectiveness will be verified')
    )
    verification_date = models.DateField(
        _('Verification Date'),
        null=True,
        blank=True
    )
    effectiveness_notes = models.TextField(
        _('Effectiveness Notes'),
        blank=True,
        help_text=_('Notes on prevention effectiveness')
    )

    # Similar problem prevention
    similar_processes = models.TextField(
        _('Similar Processes'),
        blank=True,
        help_text=_('Other processes where this prevention should be applied')
    )
    rollout_plan = models.TextField(
        _('Rollout Plan'),
        blank=True,
        help_text=_('Plan for rolling out prevention to similar processes')
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('8D Prevention Action')
        verbose_name_plural = _('8D Prevention Actions')
        ordering = ['-created_at']

    def __str__(self):
        return f"Prevention Action - {self.eight_d_process.eight_d_id}"
