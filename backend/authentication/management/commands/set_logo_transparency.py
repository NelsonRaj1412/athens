from django.core.management.base import BaseCommand
from authentication.models import UserDetail, AdminDetail
from authentication.signature_template_generator_new import create_user_signature_template, create_admin_signature_template


class Command(BaseCommand):
    help = 'Set logo transparency for all signature templates'

    def add_arguments(self, parser):
        parser.add_argument('opacity', type=int, help='Logo opacity percentage (0-100)')

    def handle(self, *args, **options):
        opacity_percent = options['opacity']
        
        if opacity_percent < 0 or opacity_percent > 100:
            self.stdout.write(self.style.ERROR('Opacity must be between 0 and 100'))
            return
        
        opacity = opacity_percent / 100.0
        
        self.stdout.write(f'Setting logo transparency to {opacity_percent}% ({opacity})')
        
        # Regenerate user signature templates
        user_details = UserDetail.objects.filter(signature_template__isnull=False)
        self.stdout.write(f'Found {user_details.count()} user signature templates to regenerate')
        
        for user_detail in user_details:
            try:
                if user_detail.signature_template:
                    user_detail.signature_template.delete(save=False)
                
                create_user_signature_template(user_detail, logo_opacity=opacity)
                self.stdout.write(f'✓ Regenerated template for user: {user_detail.user.username}')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'✗ Failed for user {user_detail.user.username}: {e}'))
        
        # Regenerate admin signature templates
        admin_details = AdminDetail.objects.filter(signature_template__isnull=False)
        self.stdout.write(f'Found {admin_details.count()} admin signature templates to regenerate')
        
        for admin_detail in admin_details:
            try:
                if admin_detail.signature_template:
                    admin_detail.signature_template.delete(save=False)
                
                create_admin_signature_template(admin_detail, logo_opacity=opacity)
                self.stdout.write(f'✓ Regenerated template for admin: {admin_detail.user.username}')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'✗ Failed for admin {admin_detail.user.username}: {e}'))
        
        self.stdout.write(self.style.SUCCESS(f'Completed! All signature templates now have {opacity_percent}% logo transparency.'))