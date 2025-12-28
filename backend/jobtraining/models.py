from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from worker.models import Worker

class JobTraining(models.Model):
    STATUS_CHOICES = (
        ('planned', 'Planned'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )
    
    title = models.CharField(max_length=255, verbose_name=_('Title'))
    description = models.TextField(blank=True, null=True, verbose_name=_('Description'))
    date = models.DateField(verbose_name=_('Date'))
    location = models.CharField(max_length=255, blank=True, null=True, verbose_name=_('Location'))
    conducted_by = models.CharField(max_length=255, verbose_name=_('Conducted By'))
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='planned',
        verbose_name=_('Status')
    )
    project = models.ForeignKey(
        'authentication.Project',
        on_delete=models.CASCADE,
        related_name='job_trainings',
        null=True,
        blank=True
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='created_job_trainings',
        verbose_name=_('Created By')
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('Job Training')
        verbose_name_plural = _('Job Trainings')
        ordering = ['-date']
    
    def __str__(self):
        return self.title

class JobTrainingAttendance(models.Model):
    STATUS_CHOICES = (
        ('present', _('Present')),
        ('absent', _('Absent')),
    )
    
    PARTICIPANT_TYPE_CHOICES = (
        ('worker', _('Worker')),
        ('user', _('User')),
    )
    
    job_training = models.ForeignKey(
        JobTraining, 
        on_delete=models.CASCADE, 
        related_name='attendances'
    )
    worker = models.ForeignKey(
        Worker, 
        on_delete=models.CASCADE, 
        related_name='job_training_attendances',
        null=True,
        blank=True
    )
    # Fields for user attendance
    user_id = models.IntegerField(_('User ID'), null=True, blank=True)
    user_name = models.CharField(_('User Name'), max_length=255, blank=True)
    participant_type = models.CharField(
        _('Participant Type'), 
        max_length=20, 
        choices=PARTICIPANT_TYPE_CHOICES, 
        default='worker'
    )
    
    status = models.CharField(_('Status'), max_length=20, choices=STATUS_CHOICES)
    attendance_photo = models.TextField(_('Attendance Photo'), blank=True)
    match_score = models.FloatField(_('Match Score'), default=0)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        if self.participant_type == 'worker' and self.worker:
            return f"{self.worker} - {self.job_training} - {self.status}"
        elif self.participant_type == 'user':
            return f"{self.user_name} (User) - {self.job_training} - {self.status}"
        return f"Unknown - {self.job_training} - {self.status}"
    
    class Meta:
        verbose_name = _('Job Training Attendance')
        verbose_name_plural = _('Job Training Attendances')
        # Remove unique constraint to allow both worker and user attendance
