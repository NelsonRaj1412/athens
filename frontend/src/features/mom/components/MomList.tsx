import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Popconfirm, Card, Modal, App } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../../common/utils/axiosetup';
import useAuthStore from '@common/store/authStore';
import moment from 'moment';
import MomCreationForm from './MomCreationForm';
import PageLayout from '@common/components/PageLayout';
import { useTheme } from '@common/contexts/ThemeContext';
import { usePermissionControl } from '../../../hooks/usePermissionControl';
import PermissionRequestModal from '../../../components/permissions/PermissionRequestModal';
import { authGuard } from '../../../common/utils/authGuard';

// const { Title } = Typography; // Unused import

interface Mom {
  id: number;
  title: string;
  agenda: string;
  meeting_datetime: string;
  scheduled_by: number;
  status?: string; // added optional status field
}

interface ApiResponse {
  results?: Mom[];
  [key: string]: any;
}

const MomList: React.FC = () => {
  const [moms, setMoms] = useState<Mom[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const navigate = useNavigate();

  const { message } = App.useApp();
  const { effectiveTheme } = useTheme();
  const {
    showPermissionModal,
    permissionRequest,
    executeWithPermission,
    closePermissionModal,
    onPermissionRequestSuccess
  } = usePermissionControl();

  // --- Auto-Navigation Logic ---
  const handlePaginationChange = React.useCallback((page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  }, []);

  // Auto-advance to next page when current page is filled
  React.useEffect(() => {
    const totalPages = Math.ceil(moms.length / pageSize);
    const currentPageStartIndex = (currentPage - 1) * pageSize;
    const currentPageEndIndex = currentPageStartIndex + pageSize;
    const momsOnCurrentPage = moms.slice(currentPageStartIndex, currentPageEndIndex);

    // If current page is full and there are more pages, auto-advance
    if (momsOnCurrentPage.length === pageSize && currentPage < totalPages) {
      // Small delay to make the transition smooth
      setTimeout(() => {
        setCurrentPage(currentPage + 1);
        message.info(`Page ${currentPage} is full. Automatically moved to page ${currentPage + 1}.`);
      }, 500);
    }
  }, [moms.length, pageSize, currentPage, message]);

  const fetchMoms = async (navigateToNewItem = false) => {
    // Check authentication before making API call
    if (!authGuard.canMakeApiCall()) {
      console.log('User not authenticated, skipping MOM list fetch');
      return;
    }

    setLoading(true);
    try {
      const response = await api.get<Mom[] | ApiResponse>('/api/v1/mom/list/');
      
      // Handle different response formats
      let responseData: Mom[];
      if (Array.isArray(response.data)) {
        responseData = response.data;
      } else if (response.data && typeof response.data === 'object' && 'results' in response.data && Array.isArray(response.data.results)) {
        responseData = response.data.results;
      } else {
        responseData = [];
      }
      
      const momsWithStatus = responseData.map(mom => {
        if (mom?.status) {
          return mom;
        }
        // Derive status if not present
        const now = moment();
        const meetingTime = moment(mom?.meeting_datetime);
        if (now.isBefore(meetingTime)) {
          return { ...mom, status: 'scheduled' };
        } else {
          return { ...mom, status: 'live' };
        }
      });

      // If navigateToNewItem is true, move to the page containing the newest item
      if (navigateToNewItem && momsWithStatus.length > moms.length) {
        const newItemPage = Math.ceil(momsWithStatus.length / pageSize);
        setCurrentPage(newItemPage);
        message.success(`New meeting added and moved to page ${newItemPage}.`);
      }

      setMoms(momsWithStatus || []);
    } catch (error: any) {
      // Only show error message if user is authenticated (to avoid showing errors on login page)
      if (authGuard.canMakeApiCall()) {
        message.error('Failed to fetch meeting list.');
      }
      setMoms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMoms();
  }, []);

  const handleView = (id: number) => {
    navigate(`/dashboard/mom/view/${id}`);
  };

  const handleEdit = async (mom: Mom) => {
    await executeWithPermission(
      () => {
        navigate(`/dashboard/mom/edit/${mom.id}`);
        return Promise.resolve();
      },
      'edit meeting'
    );
  };

  const handleDelete = async (mom: Mom) => {
    console.log('Delete MOM attempt:', {
      momId: mom.id,
      momTitle: mom.title,
      userType: useAuthStore.getState().django_user_type,
      adminType: useAuthStore.getState().usertype
    });
    
    await executeWithPermission(
      async () => {
        await api.delete(`/api/v1/mom/${mom.id}/delete/`);

        // Check if we need to adjust current page after deletion
        const newDataLength = moms.length - 1;
        const maxPage = Math.ceil(newDataLength / pageSize);
        if (currentPage > maxPage && maxPage > 0) {
          setCurrentPage(maxPage);
        }

        message.success('Meeting deleted successfully.');
        fetchMoms();
      },
      'delete meeting'
    );
  };

  const handleSchedule = () => {
    setIsModalVisible(true);
  };

  const handleLive = (id: number) => {
    navigate(`/dashboard/mom/live/${id}`);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
  };

  const handleFormSuccess = () => {
    // Calculate which page the new meeting will be on
    const newMeetingPage = Math.ceil((moms.length + 1) / pageSize);
    setCurrentPage(newMeetingPage);

    setIsModalVisible(false);
    fetchMoms(true); // Refresh the list and navigate to new meeting
  };

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => text || 'N/A',
    },
    {
      title: 'Agenda',
      dataIndex: 'agenda',
      key: 'agenda',
      render: (text: string) => text || 'N/A',
    },
    {
      title: 'Meeting Date & Time',
      dataIndex: 'meeting_datetime',
      key: 'meeting_datetime',
      render: (text: string) => text ? moment(text).format('YYYY-MM-DD HH:mm') : 'N/A',
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: Mom) => {
        if (!record) return 'N/A';
        
        // Assuming record has a 'status' field that can be 'live' or 'complete'
        if (record.status === 'completed') {
          return (
            <Button type="primary" disabled>
              Live
            </Button>
          );
        }
        
        if (!record.meeting_datetime) {
          return <span style={{ color: '#999' }}>No Date Set</span>;
        }
        
        const now = moment();
        const meetingTime = moment(record.meeting_datetime);

        // Show different states based on timing
        if (now.isBefore(meetingTime)) {
          const timeUntilMeeting = meetingTime.diff(now, 'minutes');
          if (timeUntilMeeting > 60) {
            return <span style={{ color: '#1890ff' }}>Scheduled</span>;
          } else {
            return <span style={{ color: '#faad14' }}>Starting Soon ({timeUntilMeeting}m)</span>;
          }
        } else {
          // Meeting time has arrived or passed - show Live button
          return (
            <Button type="primary" onClick={() => handleLive(record.id)}>
              Live
            </Button>
          );
        }
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Mom) => {
        if (!record) return null;
        
        return (
          <Space size="middle">
            <Button type="link" onClick={() => handleView(record.id)}>
              View
            </Button>
            <Button 
              type="link" 
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              Edit
            </Button>
            <Popconfirm
              title="Are you sure to delete this meeting?"
              onConfirm={() => handleDelete(record)}
              okText="Yes"
              cancelText="No"
            >
              <Button 
                type="link" 
                danger
                icon={<DeleteOutlined />}
              >
                Delete
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <PageLayout
      title="Minutes of Meeting"
      subtitle="Schedule and manage meeting minutes"
      breadcrumbs={[
        { title: 'MOM' }
      ]}
      actions={
        <Button type="primary" onClick={handleSchedule}>
          Add Meeting
        </Button>
      }
    >
      <Card
        className={`theme-card ${effectiveTheme === 'dark' ? 'dark-theme' : 'light-theme'}`}
        bordered={false}
      >
        <Table
          columns={columns}
          dataSource={moms}
          rowKey="id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: moms.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} meetings`,
            position: ['bottomRight'],
            onChange: handlePaginationChange,
            onShowSizeChange: handlePaginationChange,
            pageSizeOptions: ['5', '10', '20', '50'],
          }}
          scroll={{ x: 800 }}
        />
      <Modal
        title="Schedule New Meeting"
        open={isModalVisible}
        onCancel={handleModalCancel}
        footer={null}
        destroyOnHidden
        width={700}
      >
        <MomCreationForm onFinishSuccess={handleFormSuccess} onCancel={handleModalCancel} />
      </Modal>
      
      {permissionRequest && (
        <PermissionRequestModal
          visible={showPermissionModal}
          onCancel={closePermissionModal}
          onSuccess={onPermissionRequestSuccess}
          permissionType={permissionRequest.permissionType}
          objectId={permissionRequest.objectId}
          contentType={permissionRequest.contentType}
          objectName={permissionRequest.objectName}
        />
      )}
    </Card>
    </PageLayout>
  );
};

export default MomList;
