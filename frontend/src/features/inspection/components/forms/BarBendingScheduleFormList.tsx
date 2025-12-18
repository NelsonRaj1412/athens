import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Popconfirm, message, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnType } from 'antd/es/table';
import PageLayout from '@common/components/PageLayout';
import { inspectionService } from '../../services/inspectionService';
import useAuthStore from '@common/store/authStore';

interface BarBendingScheduleFormData {
  id: string;
  contractor: string;
  project: string;
  client: string;
  name_of_structure: string;
  drawing_no: string;
  created_at: string;
  created_by_username: string;
}

export default function BarBendingScheduleFormList() {
  const navigate = useNavigate();
  const { usertype: admin_type, username } = useAuthStore();
  const user = { admin_type, username };
  const [forms, setForms] = useState<BarBendingScheduleFormData[]>([]);
  const [loading, setLoading] = useState(false);

  const userType = user?.admin_type;
  const canCreate = userType === 'epcuser';
  const canEdit = (record: BarBendingScheduleFormData) => 
    ['client', 'epc', 'contractor'].includes(userType || '') && record.created_by_username === user?.username;
  const canDelete = (record: BarBendingScheduleFormData) => 
    ['client', 'epc', 'contractor'].includes(userType || '') && record.created_by_username === user?.username;

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const response = await inspectionService.getBarBendingScheduleForms();
      setForms(response.data.results || []);
    } catch (error) {
      message.error('Failed to fetch forms');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await inspectionService.deleteBarBendingScheduleForm(id);
      message.success('Form deleted successfully');
      fetchForms();
    } catch (error) {
      message.error('Failed to delete form');
    }
  };

  const columns: ColumnType<BarBendingScheduleFormData>[] = [
    {
      title: 'Project',
      dataIndex: 'project',
      key: 'project',
      render: (text) => text || '-'
    },
    {
      title: 'Contractor',
      dataIndex: 'contractor',
      key: 'contractor',
      render: (text) => text || '-'
    },
    {
      title: 'Structure Name',
      dataIndex: 'name_of_structure',
      key: 'name_of_structure',
      render: (text) => text || '-'
    },
    {
      title: 'Drawing No.',
      dataIndex: 'drawing_no',
      key: 'drawing_no',
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
            onClick={() => navigate(`/inspection/bar-bending-schedule-forms/${record.id}`)}
            title="View"
          />
          {canEdit(record) && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => navigate(`/inspection/bar-bending-schedule-forms/${record.id}/edit`)}
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
    { title: 'Bar Bending Schedule Forms' }
  ];

  const headerActions = canCreate ? [
    <Button
      key="create"
      type="primary"
      icon={<PlusOutlined />}
      onClick={() => navigate('/inspection/bar-bending-schedule-forms/new')}
    >
      New Form
    </Button>
  ] : [];

  return (
    <PageLayout
      title="Bar Bending Schedule Forms"
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