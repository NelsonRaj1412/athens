from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from typing import Optional
from .models import DocEmbedding

# Safe imports from apps
try:
    from safetyobservation.models import SafetyObservation
except Exception:
    SafetyObservation = None
try:
    from incidentmanagement.models import Incident
except Exception:
    Incident = None
try:
    from ptw.models import Permit
except Exception:
    Permit = None
try:
    from worker.models import Worker
except Exception:
    Worker = None
try:
    from manpower.models import ManpowerEntry
except Exception:
    ManpowerEntry = None
try:
    from mom.models import Mom
except Exception:
    Mom = None
try:
    from authentication.models import Project
except Exception:
    Project = None

try:
    from inductiontraining.models import InductionTraining
except ImportError:
    InductionTraining = None

try:
    from jobtraining.models import JobTraining
except ImportError:
    JobTraining = None

try:
    from tbt.models import ToolboxTalk
except ImportError:
    ToolboxTalk = None

try:
    from ptw.models import PermitType, HazardLibrary
except ImportError:
    PermitType = HazardLibrary = None

MODEL_MAP = [
    ('safetyobservation', SafetyObservation),
    ('incident', Incident),
    ('permit', Permit),
    ('worker', Worker),
    ('manpowerentry', ManpowerEntry),
    ('mom', Mom),
    ('project', Project),
]

@receiver(post_delete)
def delete_embeddings(sender, instance, **kwargs):
    for module, model in MODEL_MAP:
        if model and sender is model:
            DocEmbedding.objects.filter(module=module, record_id=instance.id).delete()
            break


# Post-save upsert hooks
if SafetyObservation:
    @receiver(post_save, sender=SafetyObservation)
    def upsert_safety(sender, instance, created, **kwargs):
        from .tasks import upsert_embedding
        title = getattr(instance,'observationID','')
        text = f"SafetyObservation {title} Dept {getattr(instance,'department','')} Location {getattr(instance,'workLocation','')} Severity {getattr(instance,'severity','')} Status {getattr(instance,'observationStatus','')} Desc {getattr(instance,'safetyObservationFound','')}"
        upsert_embedding.delay('safetyobservation', instance.id, title, text)

if Incident:
    @receiver(post_save, sender=Incident)
    def upsert_incident(sender, instance, created, **kwargs):
        from .tasks import upsert_embedding
        title = getattr(instance,'title','')
        text = f"Incident {title} Dept {getattr(instance,'department','')} Loc {getattr(instance,'location','')} Status {getattr(instance,'status','')} Desc {getattr(instance,'description','')}"
        upsert_embedding.delay('incident', instance.id, title, text)

if Permit:
    @receiver(post_save, sender=Permit)
    def upsert_permit(sender, instance, created, **kwargs):
        from .tasks import upsert_embedding
        title = getattr(instance,'permit_number','')
        text = f"Permit {title} Title {getattr(instance,'title','')} Status {getattr(instance,'status','')} Location {getattr(instance,'location','')} Desc {getattr(instance,'description','')}"
        upsert_embedding.delay('permit', instance.id, title, text)

# Temporarily disabled due to Celery connection issues
# if Worker:
#     @receiver(post_save, sender=Worker)
#     def upsert_worker(sender, instance, created, **kwargs):
#         from .tasks import upsert_embedding
#         title = getattr(instance,'name','')
#         text = f"Worker {title} Dept {getattr(instance,'department','')} Designation {getattr(instance,'designation','')} Status {getattr(instance,'status','')}"
#         upsert_embedding.delay('worker', instance.id, title, text)

if ManpowerEntry:
    @receiver(post_save, sender=ManpowerEntry)
    def upsert_manpower(sender, instance, created, **kwargs):
        from .tasks import upsert_embedding
        title = f"{getattr(instance,'category','')} {getattr(instance,'date','')}"
        text = f"Manpower {getattr(instance,'date','')} Category {getattr(instance,'category','')} Gender {getattr(instance,'gender','')} Count {getattr(instance,'count','')} Shift {getattr(instance,'shift','')} Notes {getattr(instance,'notes','')}"
        upsert_embedding.delay('manpowerentry', instance.id, title, text)

if Mom:
    @receiver(post_save, sender=Mom)
    def upsert_mom(sender, instance, created, **kwargs):
        try:
            from .tasks import upsert_embedding
            title = getattr(instance,'title','')
            text = f"Meeting {title} Status {getattr(instance,'status','')} Dept {getattr(instance,'department','')} Location {getattr(instance,'location','')} Agenda {getattr(instance,'agenda','')}"
            upsert_embedding.delay('mom', instance.id, title, text)
        except Exception as e:
            # Log error but don't break the save operation
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to queue embedding task for Mom {instance.id}: {e}")

# Temporarily disabled for demo data creation
# if Project:
#     @receiver(post_save, sender=Project)
#     def upsert_project(sender, instance, created, **kwargs):
#         from .tasks import upsert_embedding
#         title = getattr(instance,'projectName','')
#         text = f"Project {title} Category {getattr(instance,'projectCategory','')} Location {getattr(instance,'location','')} Capacity {getattr(instance,'capacity','')}"
#         upsert_embedding.delay('project', instance.id, title, text)

if InductionTraining:
    @receiver(post_save, sender=InductionTraining)
    def upsert_induction_training(sender, instance, created, **kwargs):
        try:
            from .tasks import upsert_embedding
            title = getattr(instance,'title','')
            text = f"InductionTraining {title} Date {getattr(instance,'date','')} Location {getattr(instance,'location','')} Conductor {getattr(instance,'conducted_by','')} Status {getattr(instance,'status','')} Desc {getattr(instance,'description','')}"
            upsert_embedding.delay('inductiontraining', instance.id, title, text)
        except Exception as e:
            # Log error but don't break the save operation
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to queue embedding task for InductionTraining {instance.id}: {e}")

if JobTraining:
    @receiver(post_save, sender=JobTraining)
    def upsert_job_training(sender, instance, created, **kwargs):
        try:
            from .tasks import upsert_embedding
            title = getattr(instance,'title','')
            text = f"JobTraining {title} Date {getattr(instance,'date','')} Location {getattr(instance,'location','')} Conductor {getattr(instance,'conducted_by','')} Status {getattr(instance,'status','')} Desc {getattr(instance,'description','')}"
            upsert_embedding.delay('jobtraining', instance.id, title, text)
        except Exception as e:
            # Log error but don't break the save operation
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to queue embedding task for JobTraining {instance.id}: {e}")

if ToolboxTalk:
    @receiver(post_save, sender=ToolboxTalk)
    def upsert_toolbox_talk(sender, instance, created, **kwargs):
        try:
            from .tasks import upsert_embedding
            title = getattr(instance,'title','')
            text = f"ToolboxTalk {title} Date {getattr(instance,'date','')} Location {getattr(instance,'location','')} Conductor {getattr(instance,'conducted_by','')} Status {getattr(instance,'status','')} Desc {getattr(instance,'description','')}"
            upsert_embedding.delay('toolboxtalk', instance.id, title, text)
        except Exception as e:
            # Log error but don't break the save operation
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to queue embedding task for ToolboxTalk {instance.id}: {e}")

if PermitType:
    @receiver(post_save, sender=PermitType)
    def upsert_permit_type(sender, instance, created, **kwargs):
        from .tasks import upsert_embedding
        title = getattr(instance,'name','')
        text = f"PermitType {title} Category {getattr(instance,'category','')} Risk {getattr(instance,'risk_level','')} Desc {getattr(instance,'description','')}"
        upsert_embedding.delay('permittype', instance.id, title, text)

if HazardLibrary:
    @receiver(post_save, sender=HazardLibrary)
    def upsert_hazard_library(sender, instance, created, **kwargs):
        from .tasks import upsert_embedding
        title = getattr(instance,'name','')
        text = f"Hazard {title} Category {getattr(instance,'category','')} RiskLevel {getattr(instance,'risk_level','')} Controls {getattr(instance,'control_measures','')} Desc {getattr(instance,'description','')}"
        upsert_embedding.delay('hazardlibrary', instance.id, title, text)

# Delete signals for all models
if SafetyObservation:
    @receiver(post_delete, sender=SafetyObservation)
    def delete_safety_observation_embedding(sender, instance, **kwargs):
        from .tasks import delete_embedding
        delete_embedding.delay('safetyobservation', instance.id)

if Incident:
    @receiver(post_delete, sender=Incident)
    def delete_incident_embedding(sender, instance, **kwargs):
        from .tasks import delete_embedding
        delete_embedding.delay('incident', instance.id)

if Permit:
    @receiver(post_delete, sender=Permit)
    def delete_permit_embedding(sender, instance, **kwargs):
        from .tasks import delete_embedding
        delete_embedding.delay('permit', instance.id)

# Temporarily disabled due to Celery connection issues
# if Worker:
#     @receiver(post_delete, sender=Worker)
#     def delete_worker_embedding(sender, instance, **kwargs):
#         from .tasks import delete_embedding
#         delete_embedding.delay('worker', instance.id)

if ManpowerEntry:
    @receiver(post_delete, sender=ManpowerEntry)
    def delete_manpower_entry_embedding(sender, instance, **kwargs):
        from .tasks import delete_embedding
        delete_embedding.delay('manpowerentry', instance.id)

if Mom:
    @receiver(post_delete, sender=Mom)
    def delete_mom_embedding(sender, instance, **kwargs):
        try:
            from .tasks import delete_embedding
            delete_embedding.delay('mom', instance.id)
        except Exception as e:
            # Log error but don't break the delete operation
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to queue delete embedding task for Mom {instance.id}: {e}")

if Project:
    @receiver(post_delete, sender=Project)
    def delete_project_embedding(sender, instance, **kwargs):
        from .tasks import delete_embedding, delete_embedding_sync
        try:
            delete_embedding.delay('project', instance.id)
        except Exception:
            # Fallback to synchronous deletion if Celery is not available
            delete_embedding_sync('project', instance.id)

if InductionTraining:
    @receiver(post_delete, sender=InductionTraining)
    def delete_induction_training_embedding(sender, instance, **kwargs):
        try:
            from .tasks import delete_embedding
            delete_embedding.delay('inductiontraining', instance.id)
        except Exception as e:
            # Log error but don't break the delete operation
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to queue delete embedding task for InductionTraining {instance.id}: {e}")

if JobTraining:
    @receiver(post_delete, sender=JobTraining)
    def delete_job_training_embedding(sender, instance, **kwargs):
        try:
            from .tasks import delete_embedding
            delete_embedding.delay('jobtraining', instance.id)
        except Exception as e:
            # Log error but don't break the delete operation
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to queue delete embedding task for JobTraining {instance.id}: {e}")

if ToolboxTalk:
    @receiver(post_delete, sender=ToolboxTalk)
    def delete_toolbox_talk_embedding(sender, instance, **kwargs):
        try:
            from .tasks import delete_embedding
            delete_embedding.delay('toolboxtalk', instance.id)
        except Exception as e:
            # Log error but don't break the delete operation
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to queue delete embedding task for ToolboxTalk {instance.id}: {e}")

if PermitType:
    @receiver(post_delete, sender=PermitType)
    def delete_permit_type_embedding(sender, instance, **kwargs):
        from .tasks import delete_embedding
        delete_embedding.delay('permittype', instance.id)

if HazardLibrary:
    @receiver(post_delete, sender=HazardLibrary)
    def delete_hazard_library_embedding(sender, instance, **kwargs):
        from .tasks import delete_embedding
        delete_embedding.delay('hazardlibrary', instance.id)
