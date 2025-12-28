# Generated migration for bug fixes

from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings

class Migration(migrations.Migration):

    dependencies = [
        ('inductiontraining', '0001_initial'),
        ('inspection', '0001_initial'),
    ]

    operations = [
        # Add duration fields to InductionTraining
        migrations.AddField(
            model_name='inductiontraining',
            name='duration',
            field=models.PositiveIntegerField(default=60, verbose_name='Duration'),
        ),
        migrations.AddField(
            model_name='inductiontraining',
            name='duration_unit',
            field=models.CharField(
                choices=[('minutes', 'Minutes'), ('hours', 'Hours')],
                default='minutes',
                max_length=10,
                verbose_name='Duration Unit'
            ),
        ),
        
        # Add witnessed_by field to Inspection
        migrations.AddField(
            model_name='inspection',
            name='witnessed_by',
            field=models.ForeignKey(
                blank=True,
                help_text='User who witnessed the inspection',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='inspections_witnessed',
                to=settings.AUTH_USER_MODEL
            ),
        ),
    ]