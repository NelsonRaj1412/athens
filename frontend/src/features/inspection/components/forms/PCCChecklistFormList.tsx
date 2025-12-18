import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Popconfirm, message, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnType } from 'antd/es/table';
import PageLayout from '@common/components/PageLayout';
import { inspectionService } from '../../services/inspectionService';
import useAuthStore from '@common/store/authStore';

interface PCCChecklistFormData {
  id: string;
  project_name: string;
  date_of_checking: string;
  description: string;
  ref_drawing_no: string;
  grade_mix_proportion: string;
  source_of_concrete: string;
  created_at: string;
  created_by_username: string;
}

export default function PCCChecklistFormList() {
  const navigate = useNavigate();
  const { usertype: admin_type, username } = useAuthStore();
  const user = { admin_type, username };
  const [forms, setForms] = useState<PCCChecklistFormData[]>([]);
  const [loading, setLoading] = useState(false);

  const userType = user?.admin_type;
  const canCreate = userType === 'epcuser';
  const canEdit = (record: PCCChecklistFormData) => 
    ['client', 'epc', 'contractor'].includes(userType || '') && record.created_by_username === user?.username;
  const canDelete = (record: PCCChecklistFormData) => 
    ['client', 'epc', 'contractor'].includes(userType || '') && record.created_by_username === user?.username;

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const response = await inspectionService.getPCCChecklistForms();
      setForms(response.data.results || []);
    } catch (error) {
      message.error('Failed to fetch forms');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await inspectionService.deletePCCChecklistForm(id);
      message.success('Form deleted successfully');
      fetchForms();
    } catch (error) {
      message.error('Failed to delete form');
    }
  };

  const columns: ColumnType<PCCChecklistFormData>[] = [
    {
      title: 'Project Name',
      dataIndex: 'project_name',
      key: 'project_name',
      render: (text) => text || '-'
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text) => text || '-'
    },
    {
      title: 'Ref Drawing No.',
      dataIndex: 'ref_drawing_no',
      key: 'ref_drawing_no',
      render: (text) => text || '-'
    },
    {
      title: 'Date of Checking',
      dataIndex: 'date_of_checking',
      key: 'date_of_checking',
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
            onClick={() => navigate(`/inspection/pcc-checklist-forms/${record.id}`)}
            title="View"
          />
          {canEdit(record) && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => navigate(`/inspection/pcc-checklist-forms/${record.id}/edit`)}
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
    { title: 'PCC Checklist Forms' }
  ];

  const headerActions = canCreate ? [
    <Button
      key="create"
      type="primary"
      icon={<PlusOutlined />}
      onClick={() => navigate('/inspection/pcc-checklist-forms/new')}
    >
      New Form
    </Button>
  ] : [];

  return (
    <PageLayout
      title="PCC Checklist Forms"
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