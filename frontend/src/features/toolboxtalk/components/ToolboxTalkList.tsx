import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Space, Modal, App, Tag, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined, PlusOutlined, TeamOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import api from '@common/utils/axiosetup';
import useAuthStore from '@common/store/authStore';
// import { usePermissionControl } from '../../../hooks/usePermissionControl';
// import PermissionRequestModal from '../../../components/permissions/PermissionRequestModal';
import type { ToolboxTalkData } from '../types';
import ToolboxTalkView from './ToolboxTalkView';
import ToolboxTalkEdit from './ToolboxTalkEdit';
import ToolboxTalkCreation from './ToolboxTalkCreation';
import ToolboxTalkAttendance from './ToolboxTalkAttendance';
import PageLayout from '@common/components/PageLayout';

const ToolboxTalkList: React.FC = () => {
  const {message, modal} = App.useApp();
  const [toolboxTalks, setToolboxTalks] = useState<ToolboxTalkData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [viewingTBT, setViewingTBT] = useState<ToolboxTalkData | null>(null);
  const [editingTBT, setEditingTBT] = useState<ToolboxTalkData | null>(null);
  const [addingTBT, setAddingTBT] = useState<boolean>(false);
  const [conductingTBT, setConductingTBT] = useState<ToolboxTalkData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Use usertype from auth store
  const usertype = useAuthStore((state) => state.usertype);
  const userId = useAuthStore((state) => state.userId);
  const django_user_type = useAuthStore((state) => state.django_user_type);
  
  // Permission control removed to avoid authentication issues
  // const { executeWithPermission, showPermissionModal, permissionRequest, closePermissionModal, onPermissionRequestSuccess } = usePermissionControl({
  //   onPermissionGranted: () => fetchToolboxTalks()
  // });

  // Check permissions based on usertype - allow admin users and project admins
  const hasPermission = usertype === 'clientuser' || usertype === 'epcuser' ||
                        usertype === 'contractoruser' || usertype === 'projectadmin' ||
                        usertype === 'adminuser' || usertype === 'masteradmin' || usertype === 'superadmin';

  // --- Pagination Logic ---
  const handlePaginationChange = useCallback((page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  }, []);

  const fetchToolboxTalks = useCallback(async () => {
    setLoading(true);
    try {
      // Use simple endpoint without query parameters to avoid issues
      const endpoint = '/tbt/list/';
      
      const response = await api.get(endpoint);
      if (Array.isArray(response.data)) {
        const fetchedTBTs: ToolboxTalkData[] = response.data.map((tbt: any) => ({
          key: String(tbt.id),
          id: tbt.id,
          title: tbt.title,
          description: tbt.description,
          date: tbt.date,
          location: tbt.location,
          conducted_by: tbt.conducted_by,
          status: tbt.status,
          created_at: tbt.created_at,
          updated_at: tbt.updated_at
        }));
        setToolboxTalks(fetchedTBTs);
      } else if (response.data?.results && Array.isArray(response.data.results)) {
        // Handle paginated response
        const fetchedTBTs: ToolboxTalkData[] = response.data.results.map((tbt: any) => ({
          key: String(tbt.id),
          id: tbt.id,
          title: tbt.title,
          description: tbt.description,
          date: tbt.date,
          location: tbt.location,
          conducted_by: tbt.conducted_by,
          status: tbt.status,
          created_at: tbt.created_at,
          updated_at: tbt.updated_at
        }));
        setToolboxTalks(fetchedTBTs);
      } else {
        setToolboxTalks([]);
      }
    } catch (error) {
      message.error('Failed to fetch toolbox talks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasPermission) {
      fetchToolboxTalks();
    }
  }, [fetchToolboxTalks, hasPermission]);

  const handleView = (tbt: ToolboxTalkData) => {
    setViewingTBT(tbt);
  };

  const handleEdit = async (tbt: ToolboxTalkData) => {
    if (!tbt.id && tbt.key) {
      tbt.id = Number(tbt.key);
    }
    
    // For non-adminusers, open edit modal directly
    if (django_user_type !== 'adminuser') {
      setEditingTBT(tbt);
      return;
    }
    
    // For adminuser, just open edit modal directly - skip permission check to avoid logout issues
    setEditingTBT(tbt);
  };

  const handleAddTBT = () => {
    setAddingTBT(true);
  };

  const handleCancel = () => {
    setViewingTBT(null);
    setEditingTBT(null);
    setAddingTBT(false);
    setConductingTBT(null);
  };

  const handleDelete = (record: ToolboxTalkData) => {
    const id = record.id || record.key;

    if (!id) {
      message.error('Cannot delete: Invalid record ID');
      return;
    }

      // Use modal from App.useApp() instead of Modal.confirm
      modal.confirm({
        title: 'Are you sure you want to delete this toolbox talk?',
        icon: <ExclamationCircleOutlined />,
        content: 'This action cannot be undone.',
        okText: 'Yes, Delete',
        okType: 'danger',
        cancelText: 'Cancel',
        centered: true,
        maskClosable: false,
        destroyOnClose: true,
      onOk: () => {
        return new Promise(async (resolve, reject) => {
          try {
            // Delete directly without permission check to avoid logout issues
            await api.delete(`/tbt/delete/${id}/`);
            
            setToolboxTalks((prev) => prev.filter((tbt) => tbt.key !== record.key));
            message.success('Toolbox talk deleted successfully');
            resolve(true);
          } catch (error: any) {
            if (error) {
              let errorMessage = 'Failed to delete toolbox talk';
              if (error.response?.status === 403) {
                errorMessage = 'You do not have permission to delete this toolbox talk';
              } else if (error.response?.data?.detail) {
                errorMessage = error.response.data.detail;
              }
              message.error(errorMessage);
            }
            reject(error);
          }
        });
      }
    });
  };

  const handleSaveNewTBT = async (newTBT: any) => {
    try {
      // Update the endpoint from /toolboxtalk/ to /tbt/create/
      const response = await api.post('/tbt/create/', newTBT);

      setToolboxTalks((prev) => [
        ...prev,
        {
          key: String(response.data.id),
          id: response.data.id,
          title: response.data.title,
          description: response.data.description,
          date: response.data.date,
          location: response.data.location,
          conducted_by: response.data.conducted_by,
          status: response.data.status,
          created_at: response.data.created_at,
          updated_at: response.data.updated_at
        },
      ]);
      message.success('Toolbox talk added successfully');
      setAddingTBT(false);
    } catch (error) {
      message.error('Failed to add toolbox talk');
    }
  };

  const handleSaveEditedTBT = async (updatedTBT: ToolboxTalkData) => {
    try {
      // Update the endpoint from /toolboxtalk/update/ to /tbt/update/
      const response = await api.put(`/tbt/update/${updatedTBT.id}/`, updatedTBT);
      const updated = response.data;
      setToolboxTalks((prev) =>
        prev.map((tbt) =>
          tbt.key === String(updated.id)
            ? {
                key: String(updated.id),
                id: updated.id,
                title: updated.title,
                description: updated.description,
                date: updated.date,
                location: updated.location,
                conducted_by: updated.conducted_by,
                status: updated.status,
                created_at: updated.created_at,
                updated_at: updated.updated_at
              }
            : tbt
        )
      );
      message.success('Toolbox talk updated successfully');
      setEditingTBT(null);
      // Stay on current page after update
    } catch (error) {
      message.error('Failed to update toolbox talk');
    }
  };

  const handleConductTBT = (tbt: ToolboxTalkData) => {
    setConductingTBT(tbt);
  };

  const getStatusTag = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'planned':
        return <Tag color="blue">Planned</Tag>;
      case 'completed':
        return <Tag color="green">Completed</Tag>;
      case 'cancelled':
        return <Tag color="red">Cancelled</Tag>;
      default:
        return <Tag color="default">{status || 'Unknown'}</Tag>;
    }
  };

  const columns = [
    { title: 'Title', dataIndex: 'title', key: 'title' },
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Location', dataIndex: 'location', key: 'location' },
    { title: 'Conducted By', dataIndex: 'conducted_by', key: 'conducted_by' },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string) => getStatusTag(status)
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ToolboxTalkData) => (
        <Space size="middle">
          <Tooltip title="View Details">
            <Button 
              icon={<EyeOutlined />} 
              onClick={() => handleView(record)}
              style={{ borderRadius: 4 }}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button 
              icon={<EditOutlined />} 
              onClick={() => handleEdit(record)}
              style={{ borderRadius: 4 }}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              icon={<DeleteOutlined />}
              danger
              onClick={() => handleDelete(record)}
              style={{ borderRadius: 4 }}
            />
          </Tooltip>
          <Tooltip title="Conduct TBT & Take Attendance">
            <Button 
              icon={<TeamOutlined />} 
              type="primary"
              onClick={() => handleConductTBT(record)}
              style={{ borderRadius: 4 }}
              disabled={record.status === 'completed' || record.status === 'cancelled'}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (!hasPermission) {
    return (
      <PageLayout title="Toolbox Talk" subtitle="Access denied">
        <div>You do not have permission to view this page.</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Toolbox Talk Management"
      subtitle="Manage toolbox talk sessions and attendance"
      breadcrumbs={[
        { title: 'Training' },
        { title: 'Toolbox Talk' }
      ]}
      actions={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddTBT}
        >
          Add Toolbox Talk
        </Button>
      }
    >
      <div>
      
      <Table
        columns={columns}
        dataSource={toolboxTalks}
        loading={loading}
        rowKey="key"
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: toolboxTalks.length,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} toolbox talks`,
          position: ['bottomRight'],
          onChange: handlePaginationChange,
          onShowSizeChange: handlePaginationChange,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        bordered
        scroll={{ x: 'max-content' }}
      />

      {viewingTBT && (
        <ToolboxTalkView 
          toolboxTalk={viewingTBT} 
          visible={true} 
          onClose={handleCancel} 
        />
      )}

      {editingTBT && (
        <ToolboxTalkEdit 
          toolboxTalk={editingTBT} 
          visible={true} 
          onSave={handleSaveEditedTBT} 
          onCancel={handleCancel} 
        />
      )}

      {addingTBT && (
        <Modal 
          open={addingTBT} 
          title="Add New Toolbox Talk" 
          footer={null} 
          onCancel={handleCancel} 
          destroyOnClose
          width={800}
        >
          <ToolboxTalkCreation onFinish={handleSaveNewTBT} />
        </Modal>
      )}

      {conductingTBT && (
        <ToolboxTalkAttendance
          toolboxTalk={conductingTBT}
          visible={true}
          onClose={() => {
            setConductingTBT(null);
            fetchToolboxTalks(); // Refresh the list after taking attendance
          }}
        />
      )}
    </div>
      
      {/* Permission modal removed to avoid authentication issues */}
      {/* {showPermissionModal && permissionRequest && (
        <PermissionRequestModal
          visible={showPermissionModal}
          onCancel={closePermissionModal}
          onSuccess={onPermissionRequestSuccess}
          permissionType={permissionRequest.permissionType}
          objectId={permissionRequest.objectId}
          contentType={permissionRequest.contentType}
          objectName={permissionRequest.objectName}
        />
      )} */}
    </PageLayout>
  );
};

export default ToolboxTalkList;
