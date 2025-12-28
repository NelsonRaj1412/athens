from django.core.management.base import BaseCommand
from authentication.models import UserDetail, AdminDetail
from authentication.signature_template_generator_new import generate_document_signature
import os


class Command(BaseCommand):
    help = 'Replace all signature usage with digital signature templates everywhere'

    def handle(self, *args, **options):
        self.stdout.write('Replacing all signatures with template-generated versions...')
        
        # Update all UserDetail records to use template signatures
        user_details = UserDetail.objects.filter(signature_template__isnull=False)
        self.stdout.write(f'Processing {user_details.count()} users with signature templates')
        
        updated_count = 0
        for user_detail in user_details:
            try:
                # Generate fresh signature from template
                signature_file = generate_document_signature(user_detail)
                
                # Replace specimen_signature with template-generated version
                if user_detail.specimen_signature:
                    # Delete old file
                    try:
                        if os.path.exists(user_detail.specimen_signature.path):
                            os.remove(user_detail.specimen_signature.path)
                    except:
                        pass
                    user_detail.specimen_signature.delete(save=False)
                
                # Save new template-generated signature
                user_detail.specimen_signature.save(signature_file.name, signature_file, save=True)
                
                self.stdout.write(f'✓ Updated signature for: {user_detail.user.username}')
                updated_count += 1
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'✗ Failed for {user_detail.user.username}: {e}'))
        
        self.stdout.write(self.style.SUCCESS(f'Successfully updated {updated_count} signatures to use template system'))
        self.stdout.write('All signatures now use the same format as the profile preview modal!')