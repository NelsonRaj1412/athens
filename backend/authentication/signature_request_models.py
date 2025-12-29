from django.db import models
from django.conf import settings
from django.utils import timezone

class SignatureRequest(models.Model):
    """Signature approval requests with notifications"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    SIGNATURE_TYPES = [
        ('trainer', 'Trainer'),
        ('hr', 'HR Representative'),
        ('safety', 'Safety Officer'),
        ('dept_head', 'Department Head'),
        ('worker', 'Worker Verification'),
    ]
    
    form_type = models.CharField(max_length=50)
    form_id = models.PositiveIntegerField()
    signature_type = models.CharField(max_length=20, choices=SIGNATURE_TYPES)
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='signature_requests_made')
    requested_for = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='signature_requests_received', null=True, blank=True)
    requested_for_name = models.CharField(max_length=255, help_text="Name of person to sign (for workers without accounts)")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['form_type', 'form_id', 'signature_type']
    
    def __str__(self):
        return f"{self.signature_type} signature request for {self.form_type} #{self.form_id}"