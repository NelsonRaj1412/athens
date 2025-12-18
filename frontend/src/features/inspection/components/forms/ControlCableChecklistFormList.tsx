import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Popconfirm, message, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnType } from 'antd/es/table';
import PageLayout from '@common/components/PageLayout';
import { inspectionService } from '../../services/inspectionService';
import useAuthStore from '@common/store/authStore';

interface ControlCableChecklistFormData {
  id: string;
  drawing_specification_no: string;
  site_location_area: string;
  created_at: string;
  created_by_username: string;
}

export default function ControlCableChecklistFormList() {
  const navigate = useNavigate();
  const { usertype: admin_type, userId, username } = useAuthStore();
  const user = { admin_type, id: userId, username };
  const [forms, setForms] = useState<ControlCableChecklistFormData[]>([]);
  const [loading, setLoading] = useState(false);

  const canCreate = admin_type === 'epcuser';
  const canEdit = (record: ControlCableChecklistFormData) => 
    ['client', 'epc', 'contractor'].includes(admin_type || '') && record.created_by_username === username;
  const canDelete = (record: ControlCableChecklistFormData) => 
    ['client', 'epc', 'contractor'].includes(admin_type || '') && record.created_by_username === username;

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const response = await inspectionService.getControlCableChecklistForms();
      setForms(response.data.results || []);
    } catch (error) {
      message.error('Failed to fetch forms');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await inspectionService.deleteControlCableChecklistForm(id);
      message.success('Form deleted successfully');
      fetchForms();
    } catch (error) {
      message.error('Failed to delete form');
    }
  };

  const columns: ColumnType<ControlCableChecklistFormData>[] = [
    {
      title: 'Drawing/Specification No.',
      dataIndex: 'drawing_specification_no',
      key: 'drawing_specification_no',
      render: (text) => text || '-'
    },
    {
      title: 'Site Location/Area',
      dataIndex: 'site_location_area',
      key: 'site_location_area',
      render: (text) => text || '-'
    },
    {
      title: 'Created By',
      dataIndex: 'created_by_username',
      key: 'created_by_username',
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => new Date(text).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/inspection/control-cable-checklist-forms/${record.id}`)}
            title="View"
          />
          {canEdit(record) && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => navigate(`/inspection/control-cable-checklist-forms/${record.id}/edit`)}
              title="Edit"
            />
          )}
          {canDelete(record) && (
            <Popconfirm
              title="Are you sure you want to delete this form?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                title="Delete"
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const breadcrumbs = [
    { title: 'Inspection', href: '/inspection' },
    { title: 'Control Cable Checklist Forms' }
  ];

  const headerActions = canCreate ? [
    <Button
      key="create"
      type="primary"
      icon={<PlusOutlined />}
      onClick={() => navigate('/inspection/control-cable-checklist-forms/new')}
    >
      New Form
    </Button>
  ] : [];

  return (
    <PageLayout
      title="Control Cable Checklist Forms"
      breadcrumbs={breadcrumbs}
      actions={headerActions}
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
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
        }}
      />
    </PageLayout>
  );
}