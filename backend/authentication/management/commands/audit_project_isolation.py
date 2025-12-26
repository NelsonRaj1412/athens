"""
Management command to audit and enforce project data isolation.

This command helps identify and fix data that violates project boundaries.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class Command(BaseCommand):
    help = 'Audit and enforce project data isolation across the system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Fix violations by assigning proper projects (use with caution)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be fixed without making changes',
        )
        parser.add_argument(
            '--project-id',
            type=int,
            help='Audit specific project only',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('Starting project isolation audit...')
        )
        
        violations = []
        
        # Audit users without projects
        violations.extend(self.audit_users_without_projects())
        
        # Audit workers with mismatched projects
        violations.extend(self.audit_worker_project_mismatches())
        
        # Audit induction trainings with mismatched projects
        violations.extend(self.audit_induction_project_mismatches())
        
        # Audit attendance records for cross-project access
        violations.extend(self.audit_attendance_cross_project())
        
        # Report findings
        self.report_violations(violations)
        
        # Fix violations if requested
        if options['fix'] and not options['dry_run']:
            self.fix_violations(violations)
        elif options['dry_run']:
            self.stdout.write(
                self.style.WARNING('DRY RUN: No changes made. Use --fix to apply changes.')
            )

    def audit_users_without_projects(self):
        """Audit users who should have projects but don't."""
        violations = []
        
        # Find admin users without projects (excluding master admin)
        users_without_projects = User.objects.filter(
            project__isnull=True,
            user_type__in=['projectadmin', 'adminuser']
        ).exclude(admin_type='master')
        
        for user in users_without_projects:
            violations.append({
                'type': 'user_no_project',
                'object': user,
                'description': f'User {user.username} ({user.user_type}) has no project assigned',
                'severity': 'high'
            })
        
        return violations

    def audit_worker_project_mismatches(self):
        """Audit workers whose project doesn't match their creator's project."""
        violations = []
        
        try:
            from worker.models import Worker
            
            workers = Worker.objects.select_related('created_by', 'project').all()
            
            for worker in workers:
                if worker.created_by and worker.created_by.project:
                    if worker.project != worker.created_by.project:
                        violations.append({
                            'type': 'worker_project_mismatch',
                            'object': worker,
                            'description': f'Worker {worker.worker_id} project ({worker.project}) '
                                         f'does not match creator project ({worker.created_by.project})',
                            'severity': 'high',
                            'suggested_fix': f'Set worker project to {worker.created_by.project}'
                        })
                elif not worker.project:
                    violations.append({
                        'type': 'worker_no_project',
                        'object': worker,
                        'description': f'Worker {worker.worker_id} has no project assigned',
                        'severity': 'high'
                    })
        
        except ImportError:
            self.stdout.write(
                self.style.WARNING('Worker model not available, skipping worker audit')
            )
        
        return violations

    def audit_induction_project_mismatches(self):
        """Audit induction trainings with project mismatches."""
        violations = []
        
        try:
            from inductiontraining.models import InductionTraining
            
            inductions = InductionTraining.objects.select_related('created_by', 'project').all()
            
            for induction in inductions:
                if induction.created_by and induction.created_by.project:
                    if induction.project != induction.created_by.project:
                        violations.append({
                            'type': 'induction_project_mismatch',
                            'object': induction,
                            'description': f'Induction {induction.title} project ({induction.project}) '
                                         f'does not match creator project ({induction.created_by.project})',
                            'severity': 'medium',
                            'suggested_fix': f'Set induction project to {induction.created_by.project}'
                        })
                elif not induction.project:
                    violations.append({
                        'type': 'induction_no_project',
                        'object': induction,
                        'description': f'Induction {induction.title} has no project assigned',
                        'severity': 'medium'
                    })
        
        except ImportError:
            self.stdout.write(
                self.style.WARNING('InductionTraining model not available, skipping induction audit')
            )
        
        return violations

    def audit_attendance_cross_project(self):
        """Audit attendance records for cross-project access."""
        violations = []
        
        try:
            from inductiontraining.models import InductionAttendance, InductionTraining
            from worker.models import Worker
            
            # Check attendance records where worker and induction are from different projects
            attendance_records = InductionAttendance.objects.select_related('induction').all()
            
            for attendance in attendance_records:
                if attendance.worker_id > 0:  # Positive IDs are workers
                    try:
                        worker = Worker.objects.get(id=attendance.worker_id)
                        if worker.project != attendance.induction.project:
                            violations.append({
                                'type': 'attendance_cross_project',
                                'object': attendance,
                                'description': f'Attendance record for worker {worker.worker_id} '
                                             f'in induction from different project',
                                'severity': 'high'
                            })
                    except Worker.DoesNotExist:
                        violations.append({
                            'type': 'attendance_orphaned_worker',
                            'object': attendance,
                            'description': f'Attendance record references non-existent worker ID {attendance.worker_id}',
                            'severity': 'medium'
                        })
                else:  # Negative IDs are users
                    user_id = -attendance.worker_id
                    try:
                        user = User.objects.get(id=user_id)
                        if user.project != attendance.induction.project:
                            violations.append({
                                'type': 'attendance_user_cross_project',
                                'object': attendance,
                                'description': f'Attendance record for user {user.username} '
                                             f'in induction from different project',
                                'severity': 'high'
                            })
                    except User.DoesNotExist:
                        violations.append({
                            'type': 'attendance_orphaned_user',
                            'object': attendance,
                            'description': f'Attendance record references non-existent user ID {user_id}',
                            'severity': 'medium'
                        })
        
        except ImportError:
            self.stdout.write(
                self.style.WARNING('Attendance models not available, skipping attendance audit')
            )
        
        return violations

    def report_violations(self, violations):
        """Report audit findings."""
        if not violations:
            self.stdout.write(
                self.style.SUCCESS('✓ No project isolation violations found!')
            )
            return
        
        # Group violations by type
        violation_types = {}
        for violation in violations:
            vtype = violation['type']
            if vtype not in violation_types:
                violation_types[vtype] = []
            violation_types[vtype].append(violation)
        
        self.stdout.write(
            self.style.ERROR(f'Found {len(violations)} project isolation violations:')
        )
        
        for vtype, vlist in violation_types.items():
            self.stdout.write(f'\n{vtype.upper().replace("_", " ")} ({len(vlist)} violations):')
            for violation in vlist[:5]:  # Show first 5 of each type
                severity_style = self.style.ERROR if violation['severity'] == 'high' else self.style.WARNING
                self.stdout.write(f'  {severity_style("●")} {violation["description"]}')
            
            if len(vlist) > 5:
                self.stdout.write(f'  ... and {len(vlist) - 5} more')

    def fix_violations(self, violations):
        """Fix project isolation violations."""
        if not violations:
            return
        
        self.stdout.write(
            self.style.WARNING(f'Attempting to fix {len(violations)} violations...')
        )
        
        fixed_count = 0
        
        with transaction.atomic():
            for violation in violations:
                try:
                    if self.fix_single_violation(violation):
                        fixed_count += 1
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'Failed to fix violation: {e}')
                    )
        
        self.stdout.write(
            self.style.SUCCESS(f'Fixed {fixed_count} out of {len(violations)} violations')
        )

    def fix_single_violation(self, violation):
        """Fix a single violation."""
        vtype = violation['type']
        obj = violation['object']
        
        if vtype == 'worker_project_mismatch':
            if obj.created_by and obj.created_by.project:
                obj.project = obj.created_by.project
                obj.save()
                return True
        
        elif vtype == 'induction_project_mismatch':
            if obj.created_by and obj.created_by.project:
                obj.project = obj.created_by.project
                obj.save()
                return True
        
        elif vtype in ['attendance_orphaned_worker', 'attendance_orphaned_user']:
            # Delete orphaned attendance records
            obj.delete()
            return True
        
        return False