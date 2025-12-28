from django.urls import path, include
from rest_framework.routers import DefaultRouter
#from .views import EPCUserListView
from . import views
from . import views_delete_admin
from . import views_user_by_username
from . import notification_views
from . import signature_views
from . import views_admin_delete
from rest_framework_simplejwt.views import TokenRefreshView
from .views import CustomTokenObtainPairView
from .views_attendance import check_in, check_out, get_attendance_status
from .face_comparison_api import compare_faces_api
from .views import CurrentAdminDetailView, AdminDetailUpdateView, AdminDetailUpdateByMasterView
from .secure_views import SecureCompatibleLoginAPIView
from .views_dashboard import dashboard_overview
from .team_member_views import TeamMemberViewSet
from .epc_logo_test import EPCLogoTestView
from .induction_views import induction_status

# Create router for team member endpoints
router = DefaultRouter()
router.register(r'team-members', TeamMemberViewSet, basename='team-member')

urlpatterns = [
    path('', views.index, name='index'),
    # New secure login endpoint (backward compatible)
    path('login/', SecureCompatibleLoginAPIView.as_view(), name='secure_login'),
    # Keep legacy endpoint for other parts of the app
    path('login/legacy/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', views.LogoutView.as_view(), name='auth_logout'),

    # Project management
    path('project/create/', views.ProjectCreateView.as_view(), name='project_create'),
    path('project/list/', views.ProjectListView.as_view(), name='project_list'),
    path('project/update/<int:pk>/', views.ProjectUpdateView.as_view(), name='project_update'),
    path('project/delete/<int:pk>/', views.ProjectDeleteView.as_view(), name='project_delete'),
    path('project/cleanup/<int:pk>/', views.ProjectCleanupView.as_view(), name='project_cleanup'),

    # Master admin project and admin creation
    path('master-admin/projects/create/', views.MasterAdminProjectCreateView.as_view(), name='master_admin_project_create'),
    path('master-admin/projects/create-admins/', views.MasterAdminCreateProjectAdminsView.as_view(), name='master_admin_create_project_admins'),
    path('master-admin/projects/<int:project_id>/admins/', views.MasterAdminCreateProjectAdminsView.as_view(), name='master_admin_project_admins'),
    path('master-admin/projects/admin/delete/<int:user_id>/', views_delete_admin.MasterAdminDeleteProjectAdminView.as_view(), name='master_admin_delete_project_admin'),
    path('master-admin/reset-admin-password/', views.MasterAdminResetAdminPasswordView.as_view(), name='master_admin_reset_admin_password'),
    path('master-admin/create/', views.CreateMasterAdminView.as_view(), name='create_master_admin'),
    path('admin/user-by-username/<str:username>/', views_user_by_username.MasterAdminGetUserByUsernameView.as_view(), name='master_admin_get_user_by_username'),

    # Project admin management (client, epc, contractor)
    path('admin/reset-password/', views.ProjectAdminResetPasswordView.as_view(), name='project_admin_reset_password'),
    path('admin/list/<int:project_id>/', views.ProjectAdminListByProjectView.as_view(), name='project_admin_list_by_project'),

    # Project admin creates/edits/deletes their own users
    path('projectadminuser/create/', views.ProjectAdminUserCreateView.as_view(), name='projectadminuser_create'),
    path('projectadminuser/list/', views.ProjectAdminUserListView.as_view(), name='projectadminuser_list'),
    path('projectadminuser/update/<int:pk>/', views.ProjectAdminUserUpdateView.as_view(), name='projectadminuser_update'),
    path('projectadminuser/delete/<int:pk>/', views.ProjectAdminUserDeleteView.as_view(), name='projectadminuser_delete'),
    
    path('projectadminuser/reset-password/<int:pk>/', views.ProjectAdminUserResetPasswordView.as_view(), name='projectadminuser_reset_password'),

    # UserDetail endpoints
    path('userdetail/', views.UserDetailRetrieveUpdateView.as_view(), name='userdetail_retrieve_update'),
    path('userdetail/approve/<int:pk>/', views.UserDetailApproveView.as_view(), name='userdetail_approve'),
    path('userdetail/pending/', views.PendingUserDetailsForAdminView.as_view(), name='userdetail_pending_for_admin'),
    path('userdetail/pending/<int:user_id>/', views.UserDetailPendingView.as_view(), name='userdetail_pending_detail'),

    # CompanyDetail endpoints
    path('companydetail/', views.CompanyDetailRetrieveUpdateView.as_view(), name='companydetail_retrieve_update'),

    # (Optional) Legacy adminuser endpoints (commented out because views do not exist)
    # path('adminuser/create/', views.AdminUserCreateView.as_view(), name='adminuser_create'),
    # path('adminuser/update/<int:pk>/', views.AdminUserUpdateView.as_view(), name='adminuser_update'),
    # path('adminuser/list/', views.AdminUserListView.as_view(), name='adminuser_list'),
    # path('adminuser/delete/<int:pk>/', views.AdminUserDeleteView.as_view(), name='adminuser_delete'),

    # New EPC user list endpoint
    path('epcuser-list/', views.EPCUserListAPIView.as_view(), name='epcuser_list'),

    path('project/<int:project_id>/contractor-company/', views.ContractorCompanyNameView.as_view(), name='contractor_company_name'),

    path('epc-clientuser-list/', views.EPCAndClientUserListAPIView.as_view(), name='epc_clientuser_list'),

    # Comprehensive admin users list endpoints
    path('all-adminusers/', views.AllAdminUsersListAPIView.as_view(), name='all_adminusers_list'),
    path('debug-contractors/', views.DebugContractorListAPIView.as_view(), name='debug_contractors'),
    path('contractoruser-list/', views.ContractorUsersListAPIView.as_view(), name='contractoruser_list'),
    path('users-overview/', views.UsersByTypeOverviewAPIView.as_view(), name='users_overview'),
    
    # Master admin delete admin user
    path('master-admin/delete-admin-user/<int:user_id>/', views_admin_delete.MasterAdminDeleteAdminUserView.as_view(), name='master_admin_delete_admin_user'),

    # Notification endpoints
    path('notifications/', notification_views.NotificationListView.as_view(), name='notification_list'),
    path('notifications/create/', notification_views.NotificationCreateView.as_view(), name='notification_create'),
    path('notifications/<int:pk>/read/', notification_views.NotificationMarkReadView.as_view(), name='notification_mark_read'),
    path('notifications/mark-all-read/', notification_views.NotificationMarkAllReadView.as_view(), name='notification_mark_all_read'),
    path('notifications/<int:pk>/delete/', notification_views.NotificationDeleteView.as_view(), name='notification_delete'),
    path('notifications/unread-count/', notification_views.NotificationUnreadCountView.as_view(), name='notification_unread_count'),
    path('notifications/preferences/', notification_views.NotificationPreferenceView.as_view(), name='notification_preferences'),
    path('notifications/broadcast/', notification_views.NotificationBroadcastView.as_view(), name='notification_broadcast'),

    # Attendance endpoints
    path('api/attendance/check-in/', check_in, name='check-in'),
    path('api/attendance/check-out/', check_out, name='check-out'),
    path('api/attendance/status/<int:project_id>/', get_attendance_status, name='attendance-status'),
    path('compare-faces/', compare_faces_api, name='compare-faces'),
    path('admin/me/', CurrentAdminDetailView.as_view(), name='current-admin-detail'),
    path('user/project/', views.CurrentUserProjectView.as_view(), name='current-user-project'),

    # AdminDetail update endpoint
    path('admin/detail/update/<str:usertype>/', AdminDetailUpdateView.as_view(), name='admin_detail_update'),
    path('admin/update/<int:user_id>/', AdminDetailUpdateByMasterView.as_view(), name='admin_update'),
    
    # Master admin endpoint
    path('master-admin/', views.MasterAdminView.as_view(), name='master_admin'),
    path('admin/pending/<int:user_id>/', views.AdminPendingDetailView.as_view(), name='admin_pending_detail'),
    path('admin/detail/<int:user_id>/', views.AdminDetailView.as_view(), name='admin_detail'),
    path('admin/detail/update-by-master/<int:user_id>/', views.AdminDetailUpdateByMasterView.as_view(), name='admin_detail_update_by_master'),
    path('admin/detail/approve/<int:user_id>/', views.AdminDetailApproveView.as_view(), name='admin_detail_approve'),

    # Dashboard endpoint
    path('dashboard/overview/', dashboard_overview, name='dashboard_overview'),

    # Unified company data endpoint
    path('company-data/', views.UnifiedCompanyDataView.as_view(), name='unified_company_data'),

    # Digital Signature Template endpoints (UserDetail)
    path('signature/template/create/', signature_views.SignatureTemplateCreateView.as_view(), name='signature_template_create'),
    path('signature/template/preview/', signature_views.SignatureTemplatePreviewView.as_view(), name='signature_template_preview'),
    path('signature/template/data/', signature_views.SignatureTemplateDataView.as_view(), name='signature_template_data'),
    path('signature/template/regenerate/', signature_views.RegenerateSignatureTemplateView.as_view(), name='signature_template_regenerate'),
    path('signature/generate/', signature_views.GenerateDocumentSignatureView.as_view(), name='generate_document_signature'),

    # Admin Digital Signature Template endpoints (AdminDetail)
    path('admin/signature/template/create/', signature_views.AdminSignatureTemplateCreateView.as_view(), name='admin_signature_template_create'),
    path('admin/signature/template/preview/', signature_views.AdminSignatureTemplatePreviewView.as_view(), name='admin_signature_template_preview'),
    path('admin/signature/template/data/', signature_views.AdminSignatureTemplateDataView.as_view(), name='admin_signature_template_data'),
    path('admin/signature/template/regenerate/', signature_views.AdminRegenerateSignatureTemplateView.as_view(), name='admin_signature_template_regenerate'),

    # Public Signature Template endpoints (for MOM participants)
    path('signature/template/by-user/', signature_views.UserSignatureTemplateByIdView.as_view(), name='user_signature_template_by_id'),
    path('admin/signature/template/by-user/', signature_views.AdminSignatureTemplateByIdView.as_view(), name='admin_signature_template_by_id'),
    
    # Team member selection endpoints
    path('api/', include(router.urls)),

    # Approval status endpoints
    path('approval/status/', views.UserApprovalStatusView.as_view(), name='user_approval_status'),
    path('admin/detail/approve/<int:admin_detail_id>/', views.AdminDetailApprovalView.as_view(), name='admin_detail_approval'),
    path('admin/pending-details/', views.PendingAdminDetailsView.as_view(), name='pending_admin_details'),
    
    # EPC logo test endpoint
    path('epc-logo-test/', EPCLogoTestView.as_view(), name='epc_logo_test'),
    
    # Induction training status
    path('induction-status/', induction_status, name='induction_status'),
]
