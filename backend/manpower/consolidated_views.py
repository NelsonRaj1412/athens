from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q, Count, Sum
from django.utils import timezone
from datetime import datetime, timedelta
from collections import defaultdict

from authentication.models_attendance import ProjectAttendance
from tbt.models import ToolboxTalkAttendance, ToolboxTalk
from inductiontraining.models import InductionAttendance, InductionTraining
from worker.models import Worker
from authentication.models import CustomUser as User
from .permissions import CanManageManpower


@api_view(['GET'])
@permission_classes([IsAuthenticated, CanManageManpower])
def consolidated_attendance_view(request):
    """
    Consolidated attendance view that combines:
    1. Clock-in/Clock-out attendance (ProjectAttendance)
    2. TBT (Toolbox Talk) attendance
    3. Training attendance (Induction Training)
    
    Returns deduplicated attendance records for a given date.
    """
    try:
        # Get date parameter (default to today)
        date_str = request.GET.get('date', timezone.now().date().isoformat())
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)

        # Get user's project for filtering
        user_project = getattr(request.user, 'project', None)
        if not user_project:
            return Response({'error': 'User must be assigned to a project'}, status=status.HTTP_403_FORBIDDEN)

        # Initialize consolidated attendance dictionary
        consolidated_attendance = {}
        
        # 1. Get Clock-in/Clock-out attendance
        clock_attendance = ProjectAttendance.objects.filter(
            project=user_project,
            check_in_time__date=target_date
        ).select_related('user')
        
        for attendance in clock_attendance:
            user_id = f"user_{attendance.user.id}"
            consolidated_attendance[user_id] = {
                'id': user_id,
                'name': attendance.user.get_full_name(),
                'employee_id': getattr(attendance.user.user_detail, 'employee_id', '') if hasattr(attendance.user, 'user_detail') else '',
                'type': 'employee',
                'attendance_sources': ['clock_in'],
                'clock_in_time': attendance.check_in_time,
                'clock_out_time': attendance.check_out_time,
                'working_hours': str(attendance.working_time) if attendance.working_time else None,
                'status': attendance.status,
                'photo': attendance.check_in_photo.url if attendance.check_in_photo else None
            }

        # 2. Get TBT attendance for the date
        tbt_sessions = ToolboxTalk.objects.filter(
            project=user_project,
            date=target_date,
            status='completed'
        )
        
        tbt_attendance = ToolboxTalkAttendance.objects.filter(
            toolbox_talk__in=tbt_sessions,
            status='present'
        ).select_related('worker', 'toolbox_talk')
        
        for attendance in tbt_attendance:
            worker_id = f"worker_{attendance.worker.id}"
            if worker_id not in consolidated_attendance:
                consolidated_attendance[worker_id] = {
                    'id': worker_id,
                    'name': attendance.worker.name,
                    'employee_id': attendance.worker.employee_id or '',
                    'type': 'worker',
                    'attendance_sources': [],
                    'clock_in_time': None,
                    'clock_out_time': None,
                    'working_hours': None,
                    'status': 'present',
                    'photo': attendance.worker.photo.url if attendance.worker.photo else None
                }
            
            if 'tbt' not in consolidated_attendance[worker_id]['attendance_sources']:
                consolidated_attendance[worker_id]['attendance_sources'].append('tbt')
                consolidated_attendance[worker_id]['tbt_sessions'] = []
            
            consolidated_attendance[worker_id]['tbt_sessions'].append({
                'title': attendance.toolbox_talk.title,
                'time': attendance.timestamp,
                'match_score': attendance.match_score
            })

        # 3. Get Training attendance for the date
        training_sessions = InductionTraining.objects.filter(
            project=user_project,
            date=target_date,
            status='completed'
        )
        
        training_attendance = InductionAttendance.objects.filter(
            induction__in=training_sessions,
            status='present'
        ).select_related('induction')
        
        for attendance in training_attendance:
            # Handle both workers and users in training attendance
            if attendance.participant_type == 'worker' and attendance.worker_id > 0:
                try:
                    worker = Worker.objects.get(id=attendance.worker_id, project=user_project)
                    person_id = f"worker_{worker.id}"
                    if person_id not in consolidated_attendance:
                        consolidated_attendance[person_id] = {
                            'id': person_id,
                            'name': worker.name,
                            'employee_id': worker.employee_id or '',
                            'type': 'worker',
                            'attendance_sources': [],
                            'clock_in_time': None,
                            'clock_out_time': None,
                            'working_hours': None,
                            'status': 'present',
                            'photo': worker.photo.url if worker.photo else None
                        }
                except Worker.DoesNotExist:
                    continue
                    
            elif attendance.participant_type == 'user' and attendance.worker_id < 0:
                try:
                    user = User.objects.get(id=-attendance.worker_id, project=user_project)
                    person_id = f"user_{user.id}"
                    if person_id not in consolidated_attendance:
                        consolidated_attendance[person_id] = {
                            'id': person_id,
                            'name': user.get_full_name(),
                            'employee_id': getattr(user.user_detail, 'employee_id', '') if hasattr(user, 'user_detail') else '',
                            'type': 'employee',
                            'attendance_sources': [],
                            'clock_in_time': None,
                            'clock_out_time': None,
                            'working_hours': None,
                            'status': 'present',
                            'photo': getattr(user.user_detail, 'photo', None).url if hasattr(user, 'user_detail') and user.user_detail.photo else None
                        }
                except User.DoesNotExist:
                    continue
            else:
                continue
            
            if 'training' not in consolidated_attendance[person_id]['attendance_sources']:
                consolidated_attendance[person_id]['attendance_sources'].append('training')
                consolidated_attendance[person_id]['training_sessions'] = []
            
            consolidated_attendance[person_id]['training_sessions'].append({
                'title': attendance.induction.title,
                'time': attendance.induction.date,
                'match_score': attendance.match_score
            })

        # Convert to list and add summary statistics
        attendance_list = list(consolidated_attendance.values())
        
        # Calculate summary statistics
        total_attendees = len(attendance_list)
        workers_count = len([a for a in attendance_list if a['type'] == 'worker'])
        employees_count = len([a for a in attendance_list if a['type'] == 'employee'])
        
        # Count by attendance source
        source_stats = defaultdict(int)
        for attendee in attendance_list:
            for source in attendee['attendance_sources']:
                source_stats[source] += 1
        
        # Sort by name
        attendance_list.sort(key=lambda x: x['name'])
        
        return Response({
            'date': target_date.isoformat(),
            'project': user_project.projectName,
            'summary': {
                'total_attendees': total_attendees,
                'workers_count': workers_count,
                'employees_count': employees_count,
                'attendance_sources': dict(source_stats)
            },
            'attendance_records': attendance_list
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {'error': f'Failed to fetch consolidated attendance: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated, CanManageManpower])
def consolidated_attendance_summary(request):
    """
    Get attendance summary for a date range with consolidated data
    """
    try:
        # Get date range parameters
        start_date_str = request.GET.get('start_date', (timezone.now().date() - timedelta(days=7)).isoformat())
        end_date_str = request.GET.get('end_date', timezone.now().date().isoformat())
        
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)

        # Get user's project
        user_project = getattr(request.user, 'project', None)
        if not user_project:
            return Response({'error': 'User must be assigned to a project'}, status=status.HTTP_403_FORBIDDEN)

        # Generate summary for each date in range
        summary_data = []
        current_date = start_date
        
        while current_date <= end_date:
            # Get consolidated attendance for this date
            daily_summary = _get_daily_consolidated_summary(current_date, user_project)
            summary_data.append(daily_summary)
            current_date += timedelta(days=1)
        
        # Calculate overall statistics
        total_unique_attendees = set()
        total_clock_ins = 0
        total_tbt_sessions = 0
        total_training_sessions = 0
        
        for day_data in summary_data:
            total_unique_attendees.update(day_data['unique_attendees'])
            total_clock_ins += day_data['clock_in_count']
            total_tbt_sessions += day_data['tbt_count']
            total_training_sessions += day_data['training_count']
        
        return Response({
            'date_range': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            },
            'project': user_project.projectName,
            'overall_summary': {
                'total_unique_attendees': len(total_unique_attendees),
                'total_clock_ins': total_clock_ins,
                'total_tbt_sessions': total_tbt_sessions,
                'total_training_sessions': total_training_sessions,
                'total_days': len(summary_data)
            },
            'daily_summaries': summary_data
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to fetch attendance summary: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def _get_daily_consolidated_summary(date, project):
    """Helper function to get consolidated summary for a single date"""
    unique_attendees = set()
    
    # Clock-in attendance
    clock_attendance = ProjectAttendance.objects.filter(
        project=project,
        check_in_time__date=date
    )
    clock_in_count = clock_attendance.count()
    for attendance in clock_attendance:
        unique_attendees.add(f"user_{attendance.user.id}")
    
    # TBT attendance
    tbt_sessions = ToolboxTalk.objects.filter(
        project=project,
        date=date,
        status='completed'
    )
    tbt_attendance = ToolboxTalkAttendance.objects.filter(
        toolbox_talk__in=tbt_sessions,
        status='present'
    )
    tbt_count = tbt_attendance.count()
    for attendance in tbt_attendance:
        unique_attendees.add(f"worker_{attendance.worker.id}")
    
    # Training attendance
    training_sessions = InductionTraining.objects.filter(
        project=project,
        date=date,
        status='completed'
    )
    training_attendance = InductionAttendance.objects.filter(
        induction__in=training_sessions,
        status='present'
    )
    training_count = training_attendance.count()
    for attendance in training_attendance:
        if attendance.participant_type == 'worker' and attendance.worker_id > 0:
            unique_attendees.add(f"worker_{attendance.worker_id}")
        elif attendance.participant_type == 'user' and attendance.worker_id < 0:
            unique_attendees.add(f"user_{-attendance.worker_id}")
    
    return {
        'date': date.isoformat(),
        'unique_attendees': list(unique_attendees),
        'total_unique_count': len(unique_attendees),
        'clock_in_count': clock_in_count,
        'tbt_count': tbt_count,
        'training_count': training_count,
        'tbt_sessions_conducted': tbt_sessions.count(),
        'training_sessions_conducted': training_sessions.count()
    }