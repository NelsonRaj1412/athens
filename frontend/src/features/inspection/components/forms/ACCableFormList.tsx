import React, { useState, useEffect } from 'react';
import { Table, Button, Space, message, Modal } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { inspectionService } from '../../services/inspectionService';
import useAuthStore from '@common/store/authStore';
import PageLayout from '@common/components/PageLayout';

const ACCableFormList: React.FC = () => {
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { usertype, username } = useAuthStore();

  // Check if user can create forms - epcuser can create forms
  const canCreateForm = usertype === 'epcuser';
  const canEditDelete = (form: any) => {
    // Only project admins (client, epc, contractor) can edit/delete forms they created
    const isProjectAdmin = ['client', 'epc', 'contractor'].includes(usertype || '');
    const isFormCreator = form.created_by_username === username;
    return isProjectAdmin && isFormCreator;
  };

  // Debug logging

  const fetchForms = async () => {
    setLoading(true);
    try {
      const response = await inspectionService.getACCableForms();
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
          await inspectionService.deleteACCableForm(id);
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
      title: 'Contractor',
      dataIndex: 'contractor',
      key: 'contractor',
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'Block No.',
      dataIndex: 'block_no',
      key: 'block_no',
    },
    {
      title: 'Work Description',
      dataIndex: 'work_description',
      key: 'work_description',
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
            onClick={() => navigate(`/dashboard/inspection/forms/ac-cable-testing/view/${record.id}`)}
          />
          {canEditDelete(record) && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => navigate(`/dashboard/inspection/forms/ac-cable-testing/edit/${record.id}`)}
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
      title="AC Cable Testing Forms"
      subtitle="Inspection Observation Card – AC Cable (Testing)"
      breadcrumbs={[
        { title: 'Inspection', href: '/dashboard/inspection' },
        { title: 'AC Cable Testing' }
      ]}
      actions={canCreateForm ? [
        <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/dashboard/inspection/forms/ac-cable-testing/create')}
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

export default ACCableFormList;