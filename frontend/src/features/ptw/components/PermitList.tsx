import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Input, DatePicker, Select, App, Modal, Popconfirm, Card } from 'antd';
import { PlusOutlined, SearchOutlined, FilterOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getPermits, deletePermit } from '../api';
import * as Types from '../types';
import PTWRecordPrintPreview from './PTWRecordPrintPreview';

import useAuthStore from '../../../common/store/authStore';
import dayjs from 'dayjs';
import PageLayout from '../../../common/components/PageLayout';
import { usePermissionControl } from '../../../hooks/usePermissionControl';
import PermissionRequestModal from '../../../components/permissions/PermissionRequestModal';

const { RangePicker } = DatePicker;
const { Option } = Select;

const PermitList: React.FC = () => {
  const {message} = App.useApp();
  const [permits, setPermits] = useState<Types.Permit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const navigate = useNavigate();
  const usertype = useAuthStore((state) => state.usertype);
  const django_user_type = useAuthStore((state) => state.django_user_type);
  const grade = useAuthStore((state) => state.grade); // Get grade from auth store
  const currentUserId = useAuthStore((state) => state.userId); // Get current user ID
  const {
    requestPermission,
    hasPermission,
    isModalVisible,
    setIsModalVisible,
    currentRequest,
    isLoading: permissionLoading
  } = usePermissionControl();

  // Helper function to check if current user can create PTW forms
  const canCreatePermit = (): boolean => {
    if (!usertype || !django_user_type || !grade) return false;

    // Contractor users (any grade) can create PTW forms
    if (django_user_type === 'adminuser' && usertype === 'contractoruser') {
      return true;
    }

    // Only C grade EPC and Client users can create PTW forms
    // B and A grade users are blocked from creation
    if (
      django_user_type === 'adminuser' &&
      (usertype === 'epcuser' || usertype === 'clientuser') &&
      grade === 'C'
    ) {
      return true;
    }

    // Project admins can create PTW forms
    if (django_user_type === 'projectadmin') {
      return true;
    }

    return false;
  };

  // Helper function to check if current user can delete a permit
  const canDeletePermit = (permit: Types.Permit): boolean => {
    // Only the creator of the permit can delete it
    return permit.created_by === currentUserId;
  };

  // Handle permit editing with permission check
  const handleEditPermit = async (permit: Types.Permit) => {
    const hasEditPermission = await hasPermission(permit.id, 'edit', 'permit');
    if (hasEditPermission) {
      navigate(`/dashboard/ptw/edit/${permit.id}`);
    } else {
      await requestPermission(permit.id, 'edit', 'permit', `Edit permit: ${permit.permit_number}`);
    }
  };

  // Handle permit deletion with permission check
  const handleDeletePermit = async (permitId: number, permitNumber: string) => {
    const hasDeletePermission = await hasPermission(permitId, 'delete', 'permit');
    if (!hasDeletePermission) {
      await requestPermission(permitId, 'delete', 'permit', `Delete permit: ${permitNumber}`);
      return;
    }

    try {
      await deletePermit(permitId);
      message.success(`Permit ${permitNumber} deleted successfully`);
      fetchPermits();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to delete permit');
    }
  };

  // --- Auto-Navigation Logic ---
  const handlePaginationChange = React.useCallback((page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  }, []);


  const fetchPermits = async (navigateToNewItem = false) => {
    setLoading(true);
    try {
      const params: any = {};

      if (searchText) {
        params.search = searchText;
      }

      if (statusFilter) {
        params.status = statusFilter;
      }

      if (dateRange && dateRange[0] && dateRange[1]) {
        params.start_date = dateRange[0].format('YYYY-MM-DD');
        params.end_date = dateRange[1].format('YYYY-MM-DD');
      }

      const response = await getPermits(params);
      // Handle paginated response structure
      const newData = Array.isArray(response.data) ? response.data : (response.data?.results || []);

      // If navigateToNewItem is true, move to the page containing the newest item
      if (navigateToNewItem && newData.length > permits.length) {
        const newItemPage = Math.ceil(newData.length / pageSize);
        setCurrentPage(newItemPage);
        message.success(`New permit added and moved to page ${newItemPage}.`);
      }

      // Ensure we always set an array
      setPermits(Array.isArray(newData) ? newData : []);
    } catch (error) {
      message.error('Failed to load permits');
      // Ensure permits is reset to empty array on error
      setPermits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset to first page when filters change
    setCurrentPage(1);
    fetchPermits();
  }, [searchText, statusFilter, dateRange]);

  // Listen for page visibility changes to refresh data when returning from add/edit pages
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Check if we should navigate to new items (when returning from add page)
        const shouldNavigateToNew = sessionStorage.getItem('permitAdded') === 'true';
        if (shouldNavigateToNew) {
          sessionStorage.removeItem('permitAdded');
          fetchPermits(true); // Navigate to new item
        } else {
          fetchPermits(); // Regular refresh
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [permits.length, pageSize]);

  // Add status filter options to include verification statuses
  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'pending_verification', label: 'Pending Verification' },
    { value: 'verified', label: 'Verified' },
    { value: 'pending_approval', label: 'Pending Approval' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'closed', label: 'Closed' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'cancelled', label: 'Cancelled' },
  ];
  
  const columns = [
    {
      title: 'Permit Number',
      dataIndex: 'permit_number',
      key: 'permit_number',
      render: (text: string, record: Types.Permit) => (
        <a onClick={() => navigate(`/dashboard/ptw/view/${record.id}`)}>{text}</a>
      ),
    },

    {
      title: 'Type',
      dataIndex: 'permit_type_details',
      key: 'permit_type',
      render: (type: any) => (
        <Tag color={type.color_code}>{type.name}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: Types.PermitStatus) => {
        const statusColors: Record<string, string> = {
          draft: 'default',
          submitted: 'processing',
          under_review: 'warning',
          approved: 'success',
          active: 'success',
          suspended: 'warning',
          completed: 'purple',
          cancelled: 'default',
          expired: 'error',
          rejected: 'error'
        };
        return <Tag color={statusColors[status] || 'default'}>{status.replace('_', ' ').toUpperCase()}</Tag>;
      },
      filters: statusOptions.map(option => ({ text: option.label, value: option.value })),
      onFilter: (value: any, record: Types.Permit) => record.status === value,
    },
    {
      title: 'Verifier',
      key: 'verifier',
      render: (_: any, record: Types.Permit) => 
        record.verifier_details ? 
          `${record.verifier_details.first_name} ${record.verifier_details.last_name}` : 
          '-',
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: 'Planned Start',
      dataIndex: 'planned_start_time',
      key: 'planned_start_time',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Planned End',
      dataIndex: 'planned_end_time',
      key: 'planned_end_time',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Types.Permit) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            onClick={() => navigate(`/dashboard/ptw/view/${record.id}`)}
          >
            View
          </Button>
          <Button
            type="default"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              console.log('Edit button clicked for permit:', record.id);
              navigate(`/dashboard/ptw/edit/${record.id}`);
            }}
          >
            Edit
          </Button>
          <PTWRecordPrintPreview permitData={record} />
          {/* Add verification action buttons based on user role and permit status */}
          {record.status === 'pending_verification' && canVerifyPermit(record) && (
            <Button
              type="default"
              size="small"
              onClick={() => navigate(`/dashboard/ptw/view/${record.id}`)}
            >
              Verify
            </Button>
          )}
          {/* Add delete button - only for permit creator */}
          {canDeletePermit(record) && (
            <Popconfirm
              title="Delete Permit"
              description={`Are you sure you want to delete permit ${record.permit_number}? This action cannot be undone.`}
              onConfirm={() => handleDeletePermit(record.id, record.permit_number)}
              okText="Yes, Delete"
              cancelText="Cancel"
              okType="danger"
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                title="Delete Permit"
              >
                Delete
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // Helper function to check if current user can verify a permit
  const canVerifyPermit = (permit: Types.Permit): boolean => {
    if (!usertype || !django_user_type) return false;
    
    // Check if user is an epcuser with B grade and permit was created by contractoruser
    if (
      django_user_type === 'adminuser' && 
      usertype === 'epcuser' && 
      grade === 'B' && // Use grade from auth store
      permit.created_by_details?.usertype === 'contractoruser'
    ) {
      return true;
    }
    
    // Check if user is a clientuser with B grade and permit was created by epcuser
    if (
      django_user_type === 'adminuser' && 
      usertype === 'clientuser' && 
      grade === 'B' && // Use grade from auth store
      permit.created_by_details?.usertype === 'epcuser'
    ) {
      return true;
    }
    
    // Check if user is an epcuser with B grade and permit was created by epcuser with C grade
    if (
      django_user_type === 'adminuser' && 
      usertype === 'epcuser' && 
      grade === 'B' && // Use grade from auth store
      permit.created_by_details?.usertype === 'epcuser' && 
      permit.created_by_details?.grade === 'C'
    ) {
      return true;
    }
    
    // Check if user is a clientuser with B grade and permit was created by clientuser with C grade
    if (
      django_user_type === 'adminuser' && 
      usertype === 'clientuser' && 
      grade === 'B' && // Use grade from auth store
      permit.created_by_details?.usertype === 'clientuser' && 
      permit.created_by_details?.grade === 'C'
    ) {
      return true;
    }
    
    return false;
  };

  return (
    <PageLayout
      title="Permits"
      breadcrumbs={[
        { title: 'PTW Management' },
        { title: 'Permits' }
      ]}
      actions={
        canCreatePermit() && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/dashboard/ptw/create')}
          >
            Create New Permit
          </Button>
        )
      }
    >
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Filters */}
        <div style={{ marginBottom: 16, padding: '16px', backgroundColor: '#fff', borderRadius: '8px' }}>
          <Space wrap>
            <Input
              placeholder="Search permits"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<SearchOutlined />}
              style={{ width: 200 }}
            />
            
            <Select
              placeholder="Filter by status"
              allowClear
              style={{ width: 180 }}
              onChange={(value) => setStatusFilter(value)}
            >
              {statusOptions.map(option => (
                <Option key={option.value} value={option.value}>{option.label}</Option>
              ))}
            </Select>
            
            <RangePicker 
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null])}
            />
            
            <Button
              type="primary"
              icon={<FilterOutlined />}
              onClick={() => fetchPermits()}
            >
              Filter
            </Button>
          </Space>
        </div>
        
        {/* Table Container */}
        <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
          <Table
            columns={columns}
            dataSource={Array.isArray(permits) ? permits : []}
            rowKey="id"
            loading={loading}
            scroll={{ x: 'max-content', y: 'calc(100vh - 300px)' }}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: permits.length,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} permits`,
              position: ['bottomRight'],
              onChange: handlePaginationChange,
              onShowSizeChange: handlePaginationChange,
              pageSizeOptions: ['10', '20', '50', '100'],
            }}
          />
        </div>
      </div>
      
      <PermissionRequestModal
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        request={currentRequest}
        loading={permissionLoading}
      />
    </PageLayout>
  );
};

export default PermitList;
























