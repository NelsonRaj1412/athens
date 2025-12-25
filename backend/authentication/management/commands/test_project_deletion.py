from django.core.management.base import BaseCommand
from authentication.models import Project, CustomUser
from authentication.views import ProjectDeleteView

class Command(BaseCommand):
    help = 'Test project deletion dependencies'

    def add_arguments(self, parser):
        parser.add_argument('project_id', type=int, help='Project ID to check')

    def handle(self, *args, **options):
        project_id = options['project_id']
        
        try:
            project = Project.objects.get(id=project_id)
            self.stdout.write(f"🔍 Checking dependencies for Project: {project.projectName} (ID: {project_id})")
            
            # Create an instance of the view to use its dependency checking method
            view = ProjectDeleteView()
            dependencies = view._check_project_dependencies(project)
            
            self.stdout.write(f"\n📊 Dependency Analysis:")
            self.stdout.write(f"   Total dependencies: {dependencies['total_count']}")
            self.stdout.write(f"   Can delete: {'❌ No' if dependencies['has_dependencies'] else '✅ Yes'}")
            
            if dependencies['details']:
                self.stdout.write(f"\n📋 Detailed breakdown:")
                for dep_type, dep_info in dependencies['details'].items():
                    self.stdout.write(f"   - {dep_type}: {dep_info['count']} items")
                    self.stdout.write(f"     {dep_info['message']}")
            
            if dependencies['has_dependencies']:
                self.stdout.write(f"\n💡 To delete this project:")
                self.stdout.write(f"   1. Remove or transfer all associated users")
                self.stdout.write(f"   2. Complete or cancel all permits")
                self.stdout.write(f"   3. Transfer or archive all workers")
                self.stdout.write(f"   4. Clean up all historical records")
                self.stdout.write(f"   5. Then try deletion again")
            else:
                self.stdout.write(f"\n✅ Project can be safely deleted!")
                
        except Project.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"❌ Project with ID {project_id} not found"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error: {e}"))