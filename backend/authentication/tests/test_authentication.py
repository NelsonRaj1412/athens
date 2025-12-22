import pytest
import os
from rest_framework.test import APIClient
from django.urls import reverse
from authentication.models import CustomUser

TEST_PASSWORD = os.environ.get('TEST_PASSWORD', 'masterpassword')

@pytest.mark.django_db
class TestAuthentication:

    def setup_method(self):
        self.client = APIClient()
        self.master_admin = CustomUser.objects.create_user(
            username='masteradmin',
            password=TEST_PASSWORD,
            admin_type='client',
            company_name='Master Company',
            registered_address='Master Address',
            is_staff=True,
            is_active=True,
            is_superuser=True,
        )

    def test_login_master_admin(self):
        url = reverse('token_obtain_pair')
        response = self.client.post(url, {'username': 'masteradmin', 'password': TEST_PASSWORD}, format='json')
        assert response.status_code == 200
        assert 'access' in response.data or 'token' in response.data
        assert 'refresh' in response.data

    def test_logout(self):
        login_url = reverse('token_obtain_pair')
        logout_url = reverse('auth_logout')
        login_response = self.client.post(login_url, {'username': 'masteradmin', 'password': TEST_PASSWORD}, format='json')
        refresh_token = login_response.data.get('refresh')
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + login_response.data.get('access'))
        response = self.client.post(logout_url, {'refresh': refresh_token}, format='json')
        assert response.status_code == 205

    def test_create_admin_user(self):
        self.client.force_authenticate(user=self.master_admin)
        url = reverse('project_admin_create')
        data = {
            'username': 'adminuser',
            'password': 'adminpassword',
            'admin_type': 'client',
            'company_name': 'Admin Company',
            'registered_address': 'Admin Address',
            'user_type': 'projectadmin',
            'project': None,
        }
        response = self.client.post(url, data, format='json')
        assert response.status_code == 201
        assert response.data['username'] == 'adminuser'

    def test_password_reset(self):
        self.client.force_authenticate(user=self.master_admin)
        url = reverse('project_admin_reset_password')
        data = {
            'username': 'masteradmin',
            'password': 'newpassword123',
        }
        response = self.client.put(url, data, format='json')
        assert response.status_code == 200
        assert response.data['detail'] == 'Password reset successful.'

    def test_master_admin_create_project(self):
        self.client.force_authenticate(user=self.master_admin)
        url = reverse('master_admin_project_create')
        data = {
            'projectName': 'Test Project',
            'projectCategory': 'residential',
            'capacity': '100',
            'location': 'Test Location',
            'nearestPoliceStation': 'Test Police Station',
            'nearestPoliceStationContact': '1234567890',
            'nearestHospital': 'Test Hospital',
            'nearestHospitalContact': '0987654321',
            'commencementDate': '2024-01-01',
        }
        response = self.client.post(url, data, format='json')
        assert response.status_code == 201
        assert response.data['name'] == 'Test Project'

    def test_master_admin_create_project_admins(self):
        self.client.force_authenticate(user=self.master_admin)
        # First create a project
        project_url = reverse('master_admin_project_create')
        project_data = {
            'projectName': 'Test Project 2',
            'projectCategory': 'commercial',
            'capacity': '200',
            'location': 'Test Location 2',
            'nearestPoliceStation': 'Test Police Station 2',
            'nearestPoliceStationContact': '1234567891',
            'nearestHospital': 'Test Hospital 2',
            'nearestHospitalContact': '0987654322',
            'commencementDate': '2024-02-01',
        }
        project_response = self.client.post(project_url, project_data, format='json')
        assert project_response.status_code == 201
        project_id = project_response.data['id']

        # Now create three admins for the project
        create_admins_url = reverse('master_admin_create_project_admins')
        create_admins_data = {
            'project_id': project_id
        }
        response = self.client.post(create_admins_url, create_admins_data, format='json')
        assert response.status_code == 201
        assert 'created_admins' in response.data
        assert len(response.data['created_admins']) == 3
        for admin in response.data['created_admins']:
            assert 'username' in admin
            assert 'password' in admin
            assert 'admin_type' in admin
