from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator

# Choices for various fields
OBSERVATION_TYPE_CHOICES = [
    ('unsafe_act', 'Unsafe Act'),
    ('unsafe_condition', 'Unsafe Condition'),
    ('safe_act', 'Safe Act'),
    ('near_miss', 'Near Miss'),
    ('at_risk_behavior', 'At-Risk Behavior'),
    ('improvement_opportunity', 'Improvement Opportunity'),
    ('repeat_observation', 'Repeat Observation'),
    ('ppe_non_compliance', 'PPE Non-Compliance'),
    ('violation_procedure', 'Violation of Procedure/Permit'),
    ('training_need', 'Training Need to be Identified'),
    ('emergency_preparedness', 'Emergency Preparedness'),
]

CLASSIFICATION_CHOICES = [
    ('ppe_compliance', 'PPE - Personal Protective Equipment'),
    ('procedure_deviation', 'Procedure Deviation'),
    ('emergency_preparedness', 'Emergency Preparedness'),
    ('electrical', 'Electrical'),
    ('access_egress', 'Access Egress'),
    ('barricade', 'Barricade'),
    ('housekeeping', 'Housekeeping'),
    ('material_handling', 'Material Handling'),
    ('work_at_height', 'Work at Height'),
    ('environment_hygiene', 'Environment & Hygiene'),
    ('permit', 'Permit'),
    ('civil', 'Civil'),
    ('chemical_exposure', 'Chemical Exposure'),
    ('fire_safety', 'Fire Safety'),
    ('machinery_equipment', 'Machinery & Equipment'),
]

SEVERITY_CHOICES = [
    (1, 'Low'),
    (2, 'Medium'),
    (3, 'High'),
    (4, 'Critical'),
]

LIKELIHOOD_CHOICES = [
    (1, 'Rare'),
    (2, 'Possible'),
    (3, 'Likely'),
    (4, 'Certain'),
]

STATUS_CHOICES = [
    ('open', 'Open'),
    ('in_progress', 'In Progress'),
    ('pending_verification', 'Pending Verification'),
    ('closed', 'Closed'),
    ('rejected', 'Rejected'),
]

class SafetyObservation(models.Model):
    # Basic Information
    observationID = models.CharField(max_length=50, unique=True)
    date = models.DateField()
    time = models.TimeField()
    reportedBy = models.CharField(max_length=100, default='')
    department = models.CharField(max_length=100, default='')
    workLocation = models.CharField(max_length=150, default='')
    activityPerforming = models.CharField(max_length=150, default='')
    contractorName = models.CharField(max_length=100, blank=True, null=True)

    # Observation Details
    typeOfObservation = models.CharField(max_length=50, choices=OBSERVATION_TYPE_CHOICES, default='unsafe_act')
    classification = models.JSONField(default=list)  # Multiple selections stored as JSON array
    safetyObservationFound = models.TextField(max_length=1000, default='')

    # Risk Assessment
    severity = models.IntegerField(choices=SEVERITY_CHOICES, validators=[MinValueValidator(1), MaxValueValidator(4)], default=1)
    likelihood = models.IntegerField(choices=LIKELIHOOD_CHOICES, validators=[MinValueValidator(1), MaxValueValidator(4)], default=1)
    riskScore = models.IntegerField(editable=False, default=1)  # Auto-calculated: severity * likelihood

    # CAPA Information
    correctivePreventiveAction = models.TextField(default='')
    correctiveActionAssignedTo = models.CharField(max_length=100, default='')
    commitmentDate = models.DateField(null=True, blank=True)

    # Status and Additional Info
    observationStatus = models.CharField(max_length=50, choices=STATUS_CHOICES, default='open')
    remarks = models.TextField(max_length=1000, blank=True)
    escalation_level = models.IntegerField(default=1, validators=[MinValueValidator(1), MaxValueValidator(5)])

    # Environmental Fields
    is_environmental = models.BooleanField(default=False)
    env_incident_type = models.CharField(max_length=50, choices=[
        ('spill', 'Spill'),
        ('emission_exceedance', 'Emission Exceedance'),
        ('bird_strike', 'Bird Strike'),
        ('waste_violation', 'Waste Violation'),
        ('water_contamination', 'Water Contamination'),
        ('noise_violation', 'Noise Violation'),
    ], null=True, blank=True)
    
    # PROJECT ISOLATION: Add project field
    project = models.ForeignKey(
        'authentication.Project',
        on_delete=models.CASCADE,
        related_name='safety_observations',
        null=True,
        blank=True
    )
    
    # System Fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_safety_observations', null=True, blank=True)

    def save(self, *args, **kwargs):
        # Generate observationID if not set
        if not self.observationID:
            from datetime import datetime
            timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
            self.observationID = f'SO-{timestamp}'
        
        # Auto-calculate risk score
        if self.severity and self.likelihood:
            self.riskScore = self.severity * self.likelihood
        
        # Auto-escalation for high-risk observations
        if self.riskScore >= 12 and not hasattr(self, '_skip_escalation'):
            old_escalation = getattr(self, 'escalation_level', 1)
            if old_escalation <= 1:
                self.escalation_level = 2
                
                # Restrict creator access on escalation
                if self.pk and old_escalation <= 1 and self.escalation_level > 1:
                    from permissions.escalation import restrict_creator_access_on_escalation
                    restrict_creator_access_on_escalation(self)
        
        super().save(*args, **kwargs)

    @property
    def classification_list(self):
        """Return classification as a list"""
        if isinstance(self.classification, list):
            return self.classification
        return []

    def __str__(self):
        return self.observationID

# File Management for Photos
FILE_TYPE_CHOICES = [
    ('before', 'Before Photo'),
    ('after', 'After Photo'),
    ('fixed', 'Fixed Photo'),
]

class SafetyObservationFile(models.Model):
    safety_observation = models.ForeignKey(SafetyObservation, related_name='files', on_delete=models.CASCADE)
    file = models.FileField(upload_to='safety_observation_files/')
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=20, choices=FILE_TYPE_CHOICES, default='before')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.get_file_type_display()} for {self.safety_observation.observationID}"
