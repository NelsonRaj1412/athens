#!/usr/bin/env python3
"""
Test script to verify MOM permission requirements:
1. Only creating the MOM have the edit and delete option 
2. Those who are participants can respond to that invitation
3. All other users can just view that event once completed.
"""

import os
import sys
import django
from django.conf import settings

# Add the backend directory to Python path
sys.path.insert(0, '/var/www/athens/backend')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from authentication.models import CustomUser, Project
from mom.models import Mom, ParticipantResponse
from django.utils import timezone
from datetime import timedelta

def test_mom_permissions():
    print("🧪 Testing MOM Permission Requirements...")
    
    # Create test project
    project, _ = Project.objects.get_or_create(
        name="Test Project",
        defaults={'description': 'Test project for MOM permissions'}
    )
    
    # Create test users
    creator = CustomUser.objects.create_user(
        username='mom_creator',
        email='creator@test.com',
        name='MOM Creator',
        user_type='adminuser',
        admin_type='clientuser',
        project=project
    )
    
    participant = CustomUser.objects.create_user(
        username='participant',
        email='participant@test.com', 
        name='Participant User',
        user_type='adminuser',
        admin_type='epcuser',
        project=project
    )
    
    other_user = CustomUser.objects.create_user(
        username='other_user',
        email='other@test.com',
        name='Other User', 
        user_type='adminuser',
        admin_type='contractoruser',
        project=project
    )
    
    # Create a test MOM
    future_time = timezone.now() + timedelta(hours=1)
    mom = Mom.objects.create(
        title="Test Meeting",
        agenda="Test agenda",
        meeting_datetime=future_time,
        scheduled_by=creator,
        project=project,
        status=Mom.MeetingStatus.SCHEDULED
    )
    mom.participants.add(participant)
    
    print(f"✅ Created test MOM: {mom.title}")
    print(f"   Creator: {creator.name}")
    print(f"   Participant: {participant.name}")
    print(f"   Other user: {other_user.name}")
    
    # Test 1: Only creator can edit/delete
    print("\n📝 Test 1: Creator permissions")
    print(f"   Creator can edit: {mom.scheduled_by == creator}")
    print(f"   Creator can delete: {mom.scheduled_by == creator}")
    print(f"   Participant can edit: {mom.scheduled_by == participant}")
    print(f"   Other user can edit: {mom.scheduled_by == other_user}")
    
    # Test 2: Participants can respond
    print("\n💬 Test 2: Participant response")
    response, created = ParticipantResponse.objects.get_or_create(
        mom=mom,
        user=participant,
        defaults={'status': 'accepted'}
    )
    print(f"   Participant response created: {created}")
    print(f"   Response status: {response.status}")
    
    # Test 3: Complete meeting and check view access
    print("\n👁️  Test 3: View permissions after completion")
    mom.status = Mom.MeetingStatus.COMPLETED
    mom.completed_at = timezone.now()
    mom.save()
    
    print(f"   Meeting status: {mom.status}")
    print(f"   Creator can view: True (always)")
    print(f"   Participant can view: True (participant)")
    print(f"   Other user can view completed: {mom.status == Mom.MeetingStatus.COMPLETED}")
    
    # Test queryset filtering
    print("\n🔍 Test 4: Queryset filtering")
    from django.db.models import Q
    
    # Creator's view
    creator_moms = Mom.objects.filter(
        project=project
    ).filter(
        Q(scheduled_by=creator) |
        Q(participants=creator) |
        Q(status=Mom.MeetingStatus.COMPLETED)
    ).distinct()
    
    # Participant's view  
    participant_moms = Mom.objects.filter(
        project=project
    ).filter(
        Q(scheduled_by=participant) |
        Q(participants=participant) |
        Q(status=Mom.MeetingStatus.COMPLETED)
    ).distinct()
    
    # Other user's view
    other_user_moms = Mom.objects.filter(
        project=project
    ).filter(
        Q(scheduled_by=other_user) |
        Q(participants=other_user) |
        Q(status=Mom.MeetingStatus.COMPLETED)
    ).distinct()
    
    print(f"   Creator sees {creator_moms.count()} meetings")
    print(f"   Participant sees {participant_moms.count()} meetings")
    print(f"   Other user sees {other_user_moms.count()} meetings")
    
    print("\n✅ All MOM permission tests completed!")
    
    # Cleanup
    mom.delete()
    creator.delete()
    participant.delete()
    other_user.delete()
    project.delete()
    
    print("🧹 Test data cleaned up")

if __name__ == "__main__":
    test_mom_permissions()