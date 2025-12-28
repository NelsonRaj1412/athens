from django.core.management.base import BaseCommand
from authentication.models import UserDetail, AdminDetail
from authentication.signature_template_generator_new import generate_document_signature


class Command(BaseCommand):
    help = 'Replace all signature uploads with digital signature templates'

    def handle(self, *args, **options):
        self.stdout.write('Replacing signature uploads with digital signature templates...')
        
        # Process UserDetail records
        user_details = UserDetail.objects.filter(signature_template__isnull=False)
        self.stdout.write(f'Found {user_details.count()} users with signature templates')
        
        replaced_count = 0
        for user_detail in user_details:
            try:
                # Generate a signature from the template
                signature_file = generate_document_signature(user_detail)
                
                # Replace the specimen_signature with the generated signature
                if user_detail.specimen_signature:
                    user_detail.specimen_signature.delete(save=False)
                
                user_detail.specimen_signature.save(signature_file.name, signature_file, save=True)
                
                self.stdout.write(f'✓ Replaced signature for user: {user_detail.user.username}')
                replaced_count += 1
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'✗ Failed for user {user_detail.user.username}: {e}'))
        
        self.stdout.write(self.style.SUCCESS(f'Successfully replaced {replaced_count} user signatures with template-generated ones'))
        
        # Note: AdminDetail doesn't have specimen_signature field, so we skip it
        self.stdout.write('Note: Admin signatures are already using templates directly')