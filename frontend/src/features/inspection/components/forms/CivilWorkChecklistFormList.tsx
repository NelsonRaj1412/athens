import React, { useState, useEffect } from 'react';
import { Table, Button, Space, message, Modal } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { inspectionService } from '../../services/inspectionService';
import useAuthStore from '@common/store/authStore';
import PageLayout from '@common/components/PageLayout';

const CivilWorkChecklistFormList: React.FC = () => {
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { usertype, username } = useAuthStore();

  const canCreateForm = usertype === 'epcuser';
  const canEditDelete = (form: any) => {
    const isProjectAdmin = ['client', 'epc', 'contractor'].includes(usertype || '');
    const isFormCreator = form.created_by_username === username;
    return isProjectAdmin && isFormCreator;
  };

  const fetchForms = async () => {
    setLoading(true);
    try {
      const response = await inspectionService.getCivilWorkChecklistForms();
      setForms(response.data.results);
    } catch (error) {
      message.error('Failed to fetch forms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, []);

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Delete Form',
      content: 'Are you sure you want to delete this form?',
      onOk: async () => {
        try {
          await inspectionService.deleteCivilWorkChecklistForm(id);
          message.success('Form deleted successfully');
          fetchForms();
        } catch (error) {
          message.error('Failed to delete form');
        }
      },
    });
  };

  const columns = [
    {
      title: 'Contractor Name',
      dataIndex: 'contractor_name',
      key: 'contractor_name',
    },
    {
      title: 'Location No.',
      dataIndex: 'location_no',
      key: 'location_no',
    },
    {
      title: 'Project Code',
      dataIndex: 'project_code',
      key: 'project_code',
    },
    {
      title: 'Customer Name',
      dataIndex: 'customer_name',
      key: 'customer_name',
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/dashboard/inspection/forms/civil-work-checklist/view/${record.id}`)}
          />
          {canEditDelete(record) && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => navigate(`/dashboard/inspection/forms/civil-work-checklist/edit/${record.id}`)}
            />
          )}
          {canEditDelete(record) && (
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageLayout
      title="Civil Work Checklist Forms"
      subtitle="Civil Work Checklist - Before Start of Work"
      breadcrumbs={[
        { title: 'Inspection', href: '/dashboard/inspection' },
        { title: 'Civil Work Checklist' }
      ]}
      actions={canCreateForm ? [
        <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/dashboard/inspection/forms/civil-work-checklist/create')}
        >
          Create New Form
        </Button>
      ] : []}
    >
      <Table
        columns={columns}
        dataSource={forms}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        className="bg-white rounded-lg"
      />
    </PageLayout>
  );
};

export default CivilWorkChecklistFormList;