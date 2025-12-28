from django.core.management.base import BaseCommand
from authentication.models import UserDetail
from authentication.signature_template_generator_new import create_user_signature_template
import os


class Command(BaseCommand):
    help = 'Force regenerate signature template for a specific user'

    def add_arguments(self, parser):
        parser.add_argument('username', type=str, help='Username to regenerate template for')
        parser.add_argument('--opacity', type=int, default=50, help='Logo opacity percentage (0-100)')

    def handle(self, *args, **options):
        username = options['username']
        opacity_percent = options['opacity']
        opacity = opacity_percent / 100.0
        
        try:
            user_detail = UserDetail.objects.get(user__username=username)
            
            # Delete old template files
            if user_detail.signature_template:
                try:
                    if os.path.exists(user_detail.signature_template.path):
                        os.remove(user_detail.signature_template.path)
                        self.stdout.write(f'Deleted old template file')
                except:
                    pass
                user_detail.signature_template.delete(save=False)
            
            # Create new template with specified opacity
            create_user_signature_template(user_detail, logo_opacity=opacity)
            
            self.stdout.write(self.style.SUCCESS(f'✓ Force regenerated template for {username} with {opacity_percent}% opacity'))
            self.stdout.write(f'Template URL: {user_detail.signature_template.url}')
            
        except UserDetail.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'User "{username}" not found'))
            self.stdout.write('Available users:')
            for ud in UserDetail.objects.all()[:20]:
                self.stdout.write(f'  - {ud.user.username}')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {e}'))