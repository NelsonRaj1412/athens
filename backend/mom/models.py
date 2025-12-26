from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

class Mom(models.Model):
    class MeetingStatus(models.TextChoices):
        SCHEDULED = 'scheduled', _('Scheduled')
        LIVE = 'live', _('Live') # Optional: if you want to explicitly track when a meeting is live
        COMPLETED = 'completed', _('Completed')
        CANCELLED = 'cancelled', _('Cancelled')

    title = models.CharField(max_length=255)
    agenda = models.TextField()
    meeting_datetime = models.DateTimeField()
    scheduled_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='scheduled_moms')
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='mom_participations')
    department = models.CharField(max_length=255, blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)  # Added location field
    points_to_discuss = models.TextField(blank=True, null=True)  # Added field for live meeting points to discuss
    status = models.CharField(max_length=20, choices=MeetingStatus.choices, default=MeetingStatus.SCHEDULED)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.IntegerField(null=True, blank=True)
    
    # PROJECT ISOLATION: Add project field
    project = models.ForeignKey(
        'authentication.Project',
        on_delete=models.CASCADE,
        related_name='mom_records',
        null=True,
        blank=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.title

# Removed Notification model - now using authentication.models_notification.Notification
# All MOM notifications are handled through the common WebSocket notification system

class ParticipantResponse(models.Model):
    RESPONSE_CHOICES = [
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('pending', 'Pending'),
    ]

    mom = models.ForeignKey(Mom, on_delete=models.CASCADE, related_name='participant_responses')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='participant_responses')
    status = models.CharField(max_length=10, choices=RESPONSE_CHOICES, default='pending')
    responded_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('mom', 'user')

    def __str__(self):
        return f"{self.user} - {self.mom} - {self.status}"

class ParticipantAttendance(models.Model):
    mom = models.ForeignKey(Mom, on_delete=models.CASCADE, related_name='participant_attendances')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='participant_attendances')
    attended = models.BooleanField(default=False)

    class Meta:
        unique_together = ('mom', 'user')

    def __str__(self):
        return f"{self.user} - {self.mom} - Attended: {self.attended}"
