import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Space, Modal, App, Tag, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined, PlusOutlined, TeamOutlined } from '@ant-design/icons';
import api from '@common/utils/axiosetup';
import useAuthStore from '@common/store/authStore';
import { usePermissionControl } from '../../../hooks/usePermissionControl';
import PermissionRequestModal from '../../../components/permissions/PermissionRequestModal';
import type { JobTrainingData } from '../types';
import JobTrainingView from './JobTrainingView';
import JobTrainingEdit from './JobTrainingEdit';
import JobTrainingCreation from './JobTrainingCreation';
import JobTrainingAttendance from './JobTrainingAttendance';
import JobTrainingRecordPrintPreview from './JobTrainingRecordPrintPreview';
import type { ColumnsType } from 'antd/es/table';
import TrainingPrintPreview from '../../training/components/TrainingPrintPreview';

const JobTrainingList: React.FC = () => {
  const {message} = App.useApp();
  const [jobTrainings, setJobTrainings] = useState<JobTrainingData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [viewingJT, setViewingJT] = useState<JobTrainingData | null>(null);
  const [editingJT, setEditingJT] = useState<JobTrainingData | null>(null);
  const [addingJT, setAddingJT] = useState<boolean>(false);
  const [conductingJT, setConductingJT] = useState<JobTrainingData | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  const [deletingJT, setDeletingJT] = useState<JobTrainingData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Get user info from auth store
  const userId = useAuthStore((state) => state.userId);
  const usertype = useAuthStore((state) => state.usertype);
  const django_user_type = useAuthStore((state) => state.django_user_type);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  // Helper function to check if user can edit/delete
  const canModifyRecord = (record: JobTrainingData) => {
    // Project admin can always modify
    if (django_user_type === 'projectadmin') {
      return true;
    }
    // Creator can modify their own records
    return record.created_by === userId;
  };
  
  // Permission control
  const { executeWithPermission, showPermissionModal, permissionRequest, closePermissionModal, onPermissionRequestSuccess } = usePermissionControl({
    onPermissionGranted: () => fetchJobTrainings()
  });

  // --- Auto-Navigation Logic ---
  const handlePaginationChange = useCallback((page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  }, []);


  const fetchJobTrainings = useCallback(async (navigateToNewItem = false) => {
    setLoading(true);
    try {
      // Use simple endpoint without filtering
      let endpoint = '/jobtraining/';
      
      const response = await api.get(endpoint);
      
      // Handle both paginated and direct array responses
      const dataArray = response.data.results || response.data;
      
      if (Array.isArray(dataArray)) {
        const fetchedJTs: JobTrainingData[] = dataArray.map((jt: any) => ({
          key: String(jt.id),
          id: jt.id,
          title: jt.title,
          description: jt.description,
          date: jt.date,
          location: jt.location,
          conducted_by: jt.conducted_by,
          status: jt.status,
          created_by: jt.created_by,
          created_by_username: jt.created_by_username,
          created_at: jt.created_at,
          updated_at: jt.updated_at
        }));
        // If navigateToNewItem is true, move to the page containing the newest item
        if (navigateToNewItem && fetchedJTs.length > jobTrainings.length) {
          const newItemPage = Math.ceil(fetchedJTs.length / pageSize);
          setCurrentPage(newItemPage);
          message.success(`New job training added and moved to page ${newItemPage}.`);
        }

        setJobTrainings(fetchedJTs);
      } else {
        setJobTrainings([]);
      }
    } catch (error) {
      message.error('Failed to fetch job trainings');
    } finally {
      setLoading(false);
    }
  }, [django_user_type, userId, message, jobTrainings.length, pageSize]);

  useEffect(() => {
    if (isAuthenticated()) {
      fetchJobTrainings();
    }
  }, [fetchJobTrainings, isAuthenticated]);

  // Check for permission approval notifications and auto-trigger actions
  useEffect(() => {
    if (jobTrainings.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const permissionAction = urlParams.get('permission_action');
      const objectId = urlParams.get('object_id');
      
      if (permissionAction && objectId) {
        const targetTraining = jobTrainings.find(jt => jt.id === parseInt(objectId));
        if (targetTraining) {
          // Clear URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Trigger the appropriate action
          if (permissionAction === 'edit') {
            setEditingJT(targetTraining);
          } else if (permissionAction === 'delete') {
            setDeletingJT(targetTraining);
            setDeleteModalVisible(true);
          }
        }
      }
    }
  }, [jobTrainings]);

  const handleView = (jt: JobTrainingData) => {
    setViewingJT(jt);
  };

  const handleEdit = async (jt: JobTrainingData) => {
    if (!jt.id && jt.key) {
      jt.id = Number(jt.key);
    }
    
    // For non-adminusers, open edit modal directly
    if (django_user_type !== 'adminuser') {
      setEditingJT(jt);
      return;
    }
    
    try {
      // Check if user has active permission
      const response = await api.get('/api/v1/permissions/check/', {
        params: {
          permission_type: 'edit',
          object_id: jt.id,
          app_label: 'jobtraining',
          model: 'jobtraining'
        }
      });
      
      if (response.data.has_permission) {
        // User has permission, open edit modal directly
        setEditingJT(jt);
      } else {
        // No permission, trigger permission request flow
        executeWithPermission(
          () => api.patch(`/jobtraining/${jt.id}/`, {}),
          'edit job training'
        ).then(() => {
          setEditingJT(jt);
        }).catch((error) => {
          if (error) {
          }
        });
      }
    } catch (error) {
      // Fallback to permission request flow
      executeWithPermission(
        () => api.patch(`/jobtraining/${jt.id}/`, {}),
        'edit job training'
      ).then(() => {
        setEditingJT(jt);
      }).catch((error) => {
        if (error) {
        }
      });
    }
  };

  const handleAddJT = () => {
    setAddingJT(true);
  };

  const handleCancel = () => {
    setViewingJT(null);
    setEditingJT(null);
    setAddingJT(false);
    setConductingJT(null);
  };

  const handleSaveEdit = async (updatedJT: JobTrainingData) => {
    try {
      await api.put(`/jobtraining/${updatedJT.id}/`, updatedJT);
      message.success('Job training updated successfully');
      setEditingJT(null);
      
      // Clear URL parameters if they exist
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('permission_action')) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      fetchJobTrainings();
    } catch (error) {
      message.error('Failed to update job training');
    }
  };

  const handleSaveNewJT = async (newJT: any) => {
    try {
      await api.post('/jobtraining/', newJT);

      // Calculate which page the new job training will be on
      const newTrainingPage = Math.ceil((jobTrainings.length + 1) / pageSize);
      setCurrentPage(newTrainingPage);

      message.success(`Job training created successfully and moved to page ${newTrainingPage}.`);
      setAddingJT(false);
      fetchJobTrainings(true); // Navigate to new item
    } catch (error) {
      message.error('Failed to create job training');
    }
  };

  const handleDelete = (jt: JobTrainingData) => {
    setDeletingJT(jt);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!deletingJT) return;

    try {
      if (django_user_type === 'adminuser') {
        // Check if user has active permission
        try {
          const response = await api.get('/api/v1/permissions/check/', {
            params: {
              permission_type: 'delete',
              object_id: deletingJT.id,
              app_label: 'jobtraining',
              model: 'jobtraining'
            }
          });
          
          if (response.data.has_permission) {
            // User has permission, delete directly
            await api.delete(`/jobtraining/${deletingJT.id}/`);
          } else {
            // No permission, use permission flow
            await executeWithPermission(
              () => api.delete(`/jobtraining/${deletingJT.id}/`),
              'delete job training'
            );
          }
        } catch (permError) {
          // Fallback to permission flow
          await executeWithPermission(
            () => api.delete(`/jobtraining/${deletingJT.id}/`),
            'delete job training'
          );
        }
      } else {
        await api.delete(`/jobtraining/${deletingJT.id}/`);
      }
      
      // Check if we need to adjust current page after deletion
      const newDataLength = jobTrainings.length - 1;
      const maxPage = Math.ceil(newDataLength / pageSize);
      if (currentPage > maxPage && maxPage > 0) {
        setCurrentPage(maxPage);
      }
      message.success('Job training deleted successfully');
      
      fetchJobTrainings();
    } catch (error: any) {
      if (error) {
        message.error('Failed to delete job training');
      }
    } finally {
      setDeleteModalVisible(false);
      setDeletingJT(null);
    }
  };

  const handleConductJT = (jt: JobTrainingData) => {
    setConductingJT(jt);
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'planned':
        return <Tag color="blue">Planned</Tag>;
      case 'completed':
        return <Tag color="green">Completed</Tag>;
      case 'cancelled':
        return <Tag color="red">Cancelled</Tag>;
      default:
        return <Tag color="default">{status}</Tag>;
    }
  };

  const columns: ColumnsType<JobTrainingData> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      sorter: (a: JobTrainingData, b: JobTrainingData) => a.title.localeCompare(b.title),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      sorter: (a: JobTrainingData, b: JobTrainingData) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: 'Conducted By',
      dataIndex: 'conducted_by',
      key: 'conducted_by',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
      filters: [
        { text: 'Planned', value: 'planned' },
        { text: 'Completed', value: 'completed' },
        { text: 'Cancelled', value: 'cancelled' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: JobTrainingData) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => handleView(record)} 
            />
          </Tooltip>
          
          <JobTrainingRecordPrintPreview trainingData={record} />
          
          {record.status !== 'completed' && (
            <Tooltip title="Take Attendance">
              <Button 
                type="text" 
                icon={<TeamOutlined />} 
                onClick={() => handleConductJT(record)} 
              />
            </Tooltip>
          )}
          
          {record.status !== 'completed' && canModifyRecord(record) && (
            <Tooltip title="Edit">
              <Button 
                type="text" 
                icon={<EditOutlined />} 
                onClick={() => handleEdit(record)} 
              />
            </Tooltip>
          )}
          
          {canModifyRecord(record) && (
            <Tooltip title="Delete">
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />} 
                onClick={() => handleDelete(record)} 
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Job Training Management</h1>
          <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '14px' }}>Manage and track job training sessions</p>
        </div>
        <Space>
          <TrainingPrintPreview />
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAddJT}
          >
            Add Job Training
          </Button>
        </Space>
      </div>
      
      <Table
        columns={columns}
        dataSource={jobTrainings}
        loading={loading}
        rowKey="key"
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: jobTrainings.length,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} job trainings`,
          position: ['bottomRight'],
          onChange: handlePaginationChange,
          onShowSizeChange: handlePaginationChange,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
      />
      
      {viewingJT && (
        <Modal 
          open={!!viewingJT} 
          title="Job Training Details" 
          footer={[
            <Button key="close" onClick={handleCancel}>
              Close
            </Button>
          ]} 
          onCancel={handleCancel}
          width={700}
        >
          <JobTrainingView 
            jobTraining={viewingJT} 
            visible={!!viewingJT}
            onClose={handleCancel}
          />
        </Modal>
      )}
      
      {editingJT && (
        <JobTrainingEdit 
          jobTraining={editingJT} 
          visible={!!editingJT} 
          onSave={handleSaveEdit} 
          onCancel={handleCancel} 
        />
      )}
      
      <Modal
        title="Confirm Delete"
        open={deleteModalVisible}
        onOk={confirmDelete}
        onCancel={() => setDeleteModalVisible(false)}
      >
        <p>Are you sure you want to delete this job training?</p>
        {deletingJT && <p>Title: {deletingJT.title}</p>}
      </Modal>
      
      {addingJT && (
        <Modal 
          open={addingJT} 
          title="Add New Job Training" 
          footer={null} 
          onCancel={handleCancel} 
          destroyOnClose
          width={800}
        >
          <JobTrainingCreation onFinish={handleSaveNewJT} />
        </Modal>
      )}

      {conductingJT && (
        <JobTrainingAttendance
          jobTraining={conductingJT}
          visible={true}
          onClose={() => {
            setConductingJT(null);
            fetchJobTrainings(); // Refresh the list after taking attendance
          }}
        />
      )}
      
      {showPermissionModal && permissionRequest && (
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
    </div>
  );
};

export default JobTrainingList;
