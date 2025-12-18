import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Popconfirm, message, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { inspectionService } from '../../services/inspectionService';
import PageLayout from '@common/components/PageLayout';
import useAuthStore from '@common/store/authStore';

const ControlRoomAuditChecklistFormList: React.FC = () => {
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { usertype: admin_type, userId, username } = useAuthStore();
  const user = { admin_type, id: userId, username };

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const response = await inspectionService.getControlRoomAuditChecklistForms();
      setForms(response.data.results || []);
    } catch (error) {
      message.error('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await inspectionService.deleteControlRoomAuditChecklistForm(id);
      message.success('Form deleted successfully');
      fetchForms();
    } catch (error) {
      message.error('Failed to delete form');
    }
  };

  const canEdit = (record: any) => {
    const userType = user?.admin_type;
    return ['client', 'epc', 'contractor'].includes(userType) && record.created_by_username === user?.username;
  };

  const canDelete = (record: any) => {
    const userType = user?.admin_type;
    return ['client', 'epc', 'contractor'].includes(userType) && record.created_by_username === user?.username;
  };

  const columns = [
    {
      title: 'Form ID',
      dataIndex: 'id',
      key: 'id',
      render: (text: string) => text.slice(0, 8),
    },
    {
      title: 'Created By',
      dataIndex: 'created_by_username',
      key: 'created_by_username',
    },
    {
      title: 'Created Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleDateString(),
    },
    {
      title: 'Status',
      key: 'status',
      render: () => <Tag color="green">Completed</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/inspection/control-room-audit-checklist/view/${record.id}`)}
          >
            View
          </Button>
          {canEdit(record) && (
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => navigate(`/inspection/control-room-audit-checklist/edit/${record.id}`)}
            >
              Edit
            </Button>
          )}
          {canDelete(record) && (
            <Popconfirm
              title="Are you sure you want to delete this form?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const breadcrumbs = [
    { title: 'Inspection', href: '/inspection' },
    { title: 'Control Room Audit Checklist' }
  ];

  const canCreate = user?.admin_type === 'epcuser';

  return (
    <PageLayout
      title="Control Room Audit Checklist Forms"
      breadcrumbs={breadcrumbs}
      extra={
        canCreate ? (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/inspection/control-room-audit-checklist/new')}
          >
            New Form
          </Button>
        ) : null
      }
    >
      <Table
        columns={columns}
        dataSource={forms}
        rowKey="id"
        loading={loading}
        pagination={{
          total: forms.length,
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
      />
    </PageLayout>
  );
};

export default ControlRoomAuditChecklistFormList;