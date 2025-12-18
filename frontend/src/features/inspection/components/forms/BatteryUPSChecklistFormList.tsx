import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Popconfirm, message, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnType } from 'antd/es/table';
import PageLayout from '@common/components/PageLayout';
import { inspectionService } from '../../services/inspectionService';
import useAuthStore from '@common/store/authStore';

interface BatteryUPSChecklistFormData {
  id: string;
  client: string;
  date: string;
  location: string;
  battery_details: string;
  battery_rating: string;
  created_at: string;
  created_by_username: string;
}

export default function BatteryUPSChecklistFormList() {
  const navigate = useNavigate();
  const { usertype: admin_type, username } = useAuthStore();
  const user = { admin_type, username };
  const [forms, setForms] = useState<BatteryUPSChecklistFormData[]>([]);
  const [loading, setLoading] = useState(false);

  const userType = user?.admin_type;
  const canCreate = userType === 'epcuser';
  const canEdit = (record: BatteryUPSChecklistFormData) => 
    ['client', 'epc', 'contractor'].includes(userType || '') && record.created_by_username === user?.username;
  const canDelete = (record: BatteryUPSChecklistFormData) => 
    ['client', 'epc', 'contractor'].includes(userType || '') && record.created_by_username === user?.username;

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const response = await inspectionService.getBatteryUPSChecklistForms();
      setForms(response.data.results || []);
    } catch (error) {
      message.error('Failed to fetch forms');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await inspectionService.deleteBatteryUPSChecklistForm(id);
      message.success('Form deleted successfully');
      fetchForms();
    } catch (error) {
      message.error('Failed to delete form');
    }
  };

  const columns: ColumnType<BatteryUPSChecklistFormData>[] = [
    {
      title: 'Client',
      dataIndex: 'client',
      key: 'client',
      render: (text) => text || '-'
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      render: (text) => text || '-'
    },
    {
      title: 'Battery Details',
      dataIndex: 'battery_details',
      key: 'battery_details',
      render: (text) => text || '-'
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (text) => text ? new Date(text).toLocaleDateString() : '-'
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
            onClick={() => navigate(`/inspection/battery-ups-checklist-forms/${record.id}`)}
            title="View"
          />
          {canEdit(record) && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => navigate(`/inspection/battery-ups-checklist-forms/${record.id}/edit`)}
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
    { title: 'Battery UPS Checklist Forms' }
  ];

  const headerActions = canCreate ? [
    <Button
      key="create"
      type="primary"
      icon={<PlusOutlined />}
      onClick={() => navigate('/inspection/battery-ups-checklist-forms/new')}
    >
      New Form
    </Button>
  ] : [];

  return (
    <PageLayout
      title="Battery UPS Checklist Forms"
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