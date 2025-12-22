from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.conf import settings
from django.utils import timezone
from datetime import date, timedelta
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils.html import escape
from django.core.exceptions import ValidationError
import logging

logger = logging.getLogger(__name__)

class Project(models.Model):
    GOVERNMENTS = 'governments'
    MANUFACTURING = 'manufacturing'
    CONSTRUCTION = 'construction'
    CHEMICAL = 'chemical'
    PORT_AND_MARITIME = 'port_and_maritime'
    POWER_AND_ENERGY = 'power_and_energy'
    LOGISTICS = 'logistics'
    SCHOOLS = 'schools'
    MINING = 'mining'
    OIL_AND_GAS = 'oil_and_gas'
    SHOPPING_MALL = 'shopping_mall'
    AVIATION = 'aviation'

    CATEGORY_CHOICES = [
        (GOVERNMENTS, 'Governments'),
        (MANUFACTURING, 'Manufacturing'),
        (CONSTRUCTION, 'Construction'),
        (CHEMICAL, 'Chemical'),
        (PORT_AND_MARITIME, 'Port and Maritime'),
        (POWER_AND_ENERGY, 'Power and Energy'),
        (LOGISTICS, 'Logistics'),
        (SCHOOLS, 'Schools'),
        (MINING, 'Mining'),
        (OIL_AND_GAS, 'Oil & Gas'),
        (SHOPPING_MALL, 'Shopping Mall'),
        (AVIATION, 'Aviation'),
    ]

    projectName = models.CharField(max_length=255)
    projectCategory = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    capacity = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    nearestPoliceStation = models.CharField(max_length=255)
    nearestPoliceStationContact = models.CharField(max_length=255)
    nearestHospital = models.CharField(max_length=255)
    nearestHospitalContact = models.CharField(max_length=255)
    commencementDate = models.DateField()
    deadlineDate = models.DateField(help_text="Expected project completion deadline")

    def __str__(self):
        return self.projectName


class CustomUserManager(BaseUserManager):
    def _get_default_project(self):
        """
        Helper method to find the single default project.
        Returns the project object or None if not found.
        """
        try:
            # This assumes you only have ONE project in your database.
            return Project.objects.first()
        except Exception:
            # This can happen during initial migrations when the Project table doesn't exist.
            return None

    def create_user(self, username, password=None, email=None, user_type=None, **extra_fields):
        if not username:
            raise ValueError('The Username must be set')
        if user_type is None:
            raise ValueError('The user_type must be set')
        
        # --- LOGIC TO AUTO-ASSIGN DEFAULT PROJECT ---
        # If a project is not explicitly provided, assign the default one.
        # This will apply to all users created, including those via createsuperuser.
        if 'project' not in extra_fields and 'project_id' not in extra_fields:
            default_project = self._get_default_project()
            if default_project:
                extra_fields['project'] = default_project
            else:
                logger.warning("Default project not found. User will be created without a project.")
        
        email = self.normalize_email(email) if email else None
        user = self.model(username=username, email=email, user_type=user_type, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        logger.info(f"Created user: {user.username}, user_type: {user.user_type}, project: {user.project}")
        return user

    def create_superuser(self, username, password=None, email=None, user_type='projectadmin', **extra_fields):
        # This method is for Django's standard `createsuperuser` command.
        # It should create a regular superuser, NOT a master admin.
        # Your custom management command handles master admin creation.
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        return self.create_user(username, password, email, user_type, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    USER_TYPE_CHOICES = [
        ('master', 'Master'),
        ('superadmin', 'Super Admin'),
        ('masteradmin', 'Master Admin'),
        ('projectadmin', 'Project Admin'),
        ('adminuser', 'Admin User'),
    ]
    
    ESG_ROLE_CHOICES = [
        ('esg_admin', 'ESG Administrator'),
        ('esg_data_owner', 'ESG Data Owner'),
        ('esg_auditor', 'ESG Auditor'),
        ('environmental_officer', 'Environmental Officer'),
        ('sustainability_manager', 'Sustainability Manager'),
    ]

    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=False, null=True, blank=True)
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='admins', null=True, blank=True)
    admin_type = models.CharField(max_length=20, choices=[
        ('master', 'Master Admin'),
        ('client', 'Client Admin'),
        ('epc', 'EPC Admin'),
        ('contractor', 'Contractor Admin'),
        ('clientuser', 'Client User'),
        ('epcuser', 'EPC User'),
        ('contractoruser', 'Contractor User'),
    ], null=True, blank=True)
    company_name = models.CharField(max_length=255, null=True, blank=True)
    registered_address = models.TextField(null=True, blank=True)
    name = models.CharField(max_length=150, null=True, blank=True)
    surname = models.CharField(max_length=150, null=True, blank=True)
    department = models.CharField(max_length=150, null=True, blank=True)
    designation = models.CharField(max_length=150, null=True, blank=True)
    grade = models.CharField(max_length=1, choices=[
        ('A', 'Grade A'),
        ('B', 'Grade B'),
        ('C', 'Grade C'),
    ], null=True, blank=True)
    phone_number = models.CharField(max_length=20, null=True, blank=True)
    created_by = models.ForeignKey('self', on_delete=models.CASCADE, related_name='created_adminusers', null=True, blank=True)
    is_autogenerated_password = models.BooleanField(default=True)
    is_password_reset_required = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    
    # ESG specific fields
    esg_role = models.CharField(max_length=30, choices=ESG_ROLE_CHOICES, null=True, blank=True)
    esg_assigned_sites = models.JSONField(default=list, blank=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['user_type']
    
    def save(self, *args, **kwargs):
        if self.created_by and self.user_type != 'projectadmin':
            self.user_type = 'adminuser'
            creator_admin_type = self.created_by.admin_type
            if creator_admin_type == 'client':
                self.admin_type = 'clientuser'
            elif creator_admin_type == 'epc':
                self.admin_type = 'epcuser'
            elif creator_admin_type == 'contractor':
                self.admin_type = 'contractoruser'
        super().save(*args, **kwargs)

    def __str__(self):
        return escape(f"{self.username} ({self.get_user_type_display()})")

    @property
    def is_master_admin(self):
        return self.admin_type == 'master'

    @property
    def is_admin(self):
        return self.admin_type in ['client', 'epc', 'contractor']

    @property
    def adminuser_type(self):
        if self.created_by:
            return self.created_by.admin_type
        return None

    @property
    def is_admin_user(self):
        return True

    def get_full_name(self):
        """
        Return the full name for the user.
        """
        if self.name and self.surname:
            return f"{self.name} {self.surname}".strip()
        elif self.name:
            return self.name
        else:
            return self.username

    def get_short_name(self):
        """
        Return the short name for the user.
        """
        return self.name if self.name else self.username


class UserDetail(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='user_detail')
    employee_id = models.CharField(max_length=100, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    father_or_spouse_name = models.CharField(max_length=255, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    nationality = models.CharField(max_length=100, blank=True)
    education_level = models.CharField(max_length=255, blank=True)
    date_of_joining = models.DateField(null=True, blank=True)
    email = models.EmailField(blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    uan = models.CharField(max_length=100, blank=True)
    pan = models.CharField(max_length=100, blank=True)
    pan_attachment = models.FileField(upload_to='pan_attachments/', null=True, blank=True)
    aadhaar = models.CharField(max_length=100, blank=True)
    aadhaar_attachment = models.FileField(upload_to='aadhaar_attachments/', null=True, blank=True)
    mark_of_identification = models.CharField(max_length=255, blank=True)
    photo = models.ImageField(upload_to='photos/', null=True, blank=True)
    specimen_signature = models.ImageField(upload_to='signatures/', null=True, blank=True)
    # Digital Signature Template fields
    signature_template = models.ImageField(upload_to='signature_templates/', null=True, blank=True)
    signature_template_data = models.JSONField(null=True, blank=True, help_text="Stores template configuration data")
    is_approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_user_details')
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def approve(self, approver):
        self.is_approved = True
        self.approved_by = approver
        self.approved_at = timezone.now()
        self.save()

    def __str__(self):
        return escape(f"UserDetail for {self.user.username}")


class CompanyDetail(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='company_detail')
    company_name = models.CharField(max_length=255)
    registered_office_address = models.TextField()
    pan = models.CharField(max_length=100)
    gst = models.CharField(max_length=100)
    company_logo = models.ImageField(upload_to='company_logos/', null=True, blank=True)
    contact_phone = models.CharField(max_length=20)
    contact_email = models.EmailField()
    project_capacity_completed = models.PositiveIntegerField(default=0)
    project_capacity_ongoing = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return escape(f"CompanyDetail for {self.company_name} (User: {self.user.username})")


class AdminDetail(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='admin_detail')
    name = models.CharField(max_length=150, blank=True, null=True)  # Added name field to sync with user.name
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    pan_number = models.CharField(max_length=100, blank=True, null=True)
    gst_number = models.CharField(max_length=100, blank=True, null=True)
    photo = models.ImageField(upload_to='admin_photos/', null=True, blank=True)
    logo = models.ImageField(upload_to='admin_logos/', null=True, blank=True)
    # Digital Signature Template fields
    signature_template = models.ImageField(upload_to='admin_signature_templates/', null=True, blank=True)
    signature_template_data = models.JSONField(null=True, blank=True, help_text="Stores template configuration data")
    is_approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_admin_details')
    approved_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Sync name with user.name if available
        if not self.name and hasattr(self.user, 'name') and self.user.name:
            self.name = self.user.name
        super().save(*args, **kwargs)

    def __str__(self):
        return escape(f"AdminDetail for {self.user.username}")


# Signal to automatically create signature template when UserDetail is saved
@receiver(post_save, sender=UserDetail)
def create_signature_template_on_userdetail_save(sender, instance, created, **kwargs):
    """
    Automatically create signature template when UserDetail is saved with required fields
    """
    try:
        # Check if user has required information for signature template
        user = instance.user

        # Required fields: name, surname, designation
        if not (user.name and user.surname and user.designation):
            logger.warning(f"Skipping signature template creation for {user.username}: Missing required fields")
            return

        # Check if template already exists
        if instance.signature_template:
            return

        # Import here to avoid circular imports
        from .signature_template_generator import create_user_signature_template

        # Create signature template
        logger.info(f"Creating signature template for {user.username}")
        create_user_signature_template(instance)
        logger.info(f"Signature template created successfully for {user.username}")

    except Exception as e:
        logger.error(f"Error creating signature template for {instance.user.username}: {e}")
        import traceback
        traceback.print_exc()


# Signal to automatically create signature template when AdminDetail is saved
@receiver(post_save, sender='authentication.AdminDetail')
def create_signature_template_on_admindetail_save(sender, instance, created, **kwargs):
    """
    Automatically create signature template when AdminDetail is saved with required fields
    """
    try:
        # Check if user has required information for signature template
        user = instance.user

        # Skip master admin (they don't need signature templates)
        if user.admin_type == 'master':
            logger.warning(f"Skipping signature template creation for master admin: {user.username}")
            return

        # Required fields: only name (designation not required for admin signature)
        if not user.name:
            logger.warning(f"Skipping signature template creation for {user.username}: Missing required field (name)")
            return

        # Check if template already exists
        if instance.signature_template:
            return

        # Import here to avoid circular imports
        from .signature_template_generator import create_admin_signature_template

        # Create signature template
        logger.info(f"Creating admin signature template for {user.username}")
        create_admin_signature_template(instance)
        logger.info(f"Admin signature template created successfully for {user.username}")

    except Exception as e:
        logger.error(f"Error creating admin signature template for {instance.user.username}: {e}")
        import traceback
        traceback.print_exc()
