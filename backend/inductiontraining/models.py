from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

class InductionTraining(models.Model):
    STATUS_CHOICES = (
        ('planned', _('Planned')),
        ('completed', _('Completed')),
        ('cancelled', _('Cancelled')),
    )
    
    DURATION_UNIT_CHOICES = (
        ('minutes', _('Minutes')),
        ('hours', _('Hours')),
    )
    
    title = models.CharField(_('Title'), max_length=255)
    description = models.TextField(_('Description'), blank=True)
    date = models.DateField(_('Date'))
    duration = models.PositiveIntegerField(_('Duration'), default=60)  # Duration in minutes/hours
    duration_unit = models.CharField(_('Duration Unit'), max_length=10, choices=DURATION_UNIT_CHOICES, default='minutes')
    location = models.CharField(_('Location'), max_length=255, blank=True)
    conducted_by = models.CharField(_('Conducted By'), max_length=255)
    status = models.CharField(_('Status'), max_length=20, choices=STATUS_CHOICES, default='planned')
    evidence_photo = models.TextField(_('Evidence Photo'), blank=True, null=True)  # Base64 encoded photo
    project = models.ForeignKey(
        'authentication.Project',
        on_delete=models.CASCADE,
        related_name='induction_trainings',
        null=True,
        blank=True
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='created_induction_trainings'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.title
    
    @property
    def total_minutes(self):
        """Calculate total duration in minutes"""
        if self.duration_unit == 'hours':
            return self.duration * 60
        return self.duration
    
    class Meta:
        ordering = ['-date']
        verbose_name = _('Induction Training')
        verbose_name_plural = _('Induction Trainings')

class InductionAttendance(models.Model):
    STATUS_CHOICES = (
        ('present', _('Present')),
        ('absent', _('Absent')),
    )
    
    induction = models.ForeignKey(
        InductionTraining,
        on_delete=models.CASCADE,
        related_name='attendances'
    )
    worker_id = models.IntegerField(_('Worker ID'))  # Negative for users, positive for workers
    worker_name = models.CharField(_('Worker Name'), max_length=255)
    worker_photo = models.TextField(_('Worker Photo URL'), blank=True, null=True)
    attendance_photo = models.TextField(_('Attendance Photo'), blank=True, null=True)  # Base64 encoded
    participant_type = models.CharField(_('Participant Type'), max_length=20, default='worker', choices=[('worker', 'Worker'), ('user', 'User')])
    match_score = models.FloatField(_('Photo Match Score'), blank=True, null=True)
    status = models.CharField(_('Status'), max_length=20, choices=STATUS_CHOICES, default='present')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.worker_name} - {self.induction.title}"
    
    class Meta:
        unique_together = ('induction', 'worker_id')
        verbose_name = _('Induction Attendance')
        verbose_name_plural = _('Induction Attendances')
