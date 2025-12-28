from django.urls import path
from .views import ToolboxTalkViewSet, user_search, user_list, submit_attendance, trained_personnel, create_toolbox_talk

urlpatterns = [
    # User endpoints for dropdown
    path('users/list/', user_list, name='user-list'),
    path('users/search/', user_search, name='user-search'),
    
    # Attendance endpoint
    path('attendance/', submit_attendance, name='submit-attendance'),

    # Worker endpoints
    path('trained-personnel/', trained_personnel, name='trained-personnel'),
    
    # Toolbox talk endpoints
    path('list/', ToolboxTalkViewSet.as_view({'get': 'list'}), name='toolboxtalk-list'),
    path('create/', create_toolbox_talk, name='toolboxtalk-create'),
    path('update/<int:pk>/', ToolboxTalkViewSet.as_view({'put': 'update', 'patch': 'partial_update'}), name='toolboxtalk-update'),
    path('delete/<int:pk>/', ToolboxTalkViewSet.as_view({'delete': 'destroy'}), name='toolboxtalk-delete'),
    path('<int:pk>/', ToolboxTalkViewSet.as_view({'get': 'retrieve'}), name='toolboxtalk-detail'),
    path('<int:pk>/attendance/', ToolboxTalkViewSet.as_view({'get': 'attendance'}), name='toolboxtalk-attendance'),
]
