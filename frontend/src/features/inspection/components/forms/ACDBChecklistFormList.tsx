import React, { useState, useEffect } from 'react';
import { Table, Button, Space, message, Modal } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { inspectionService } from '../../services/inspectionService';
import useAuthStore from '@common/store/authStore';
import PageLayout from '@common/components/PageLayout';

const ACDBChecklistFormList: React.FC = () => {
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
      const response = await inspectionService.getACDBChecklistForms();
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
          await inspectionService.deleteACDBChecklistForm(id);
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
      title: 'Client',
      dataIndex: 'client',
      key: 'client',
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: 'Date of Inspection',
      dataIndex: 'date_of_inspection',
      key: 'date_of_inspection',
    },
    {
      title: 'Equipment Description',
      dataIndex: 'equipment_description',
      key: 'equipment_description',
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
            onClick={() => navigate(`/dashboard/inspection/forms/acdb-checklist/view/${record.id}`)}
          />
          {canEditDelete(record) && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => navigate(`/dashboard/inspection/forms/acdb-checklist/edit/${record.id}`)}
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
      title="ACDB Checklist Forms"
      subtitle="Pre-Commissioning Checklist – LT Swgr / ACDB / DCDB / UPS panel"
      breadcrumbs={[
        { title: 'Inspection', href: '/dashboard/inspection' },
        { title: 'ACDB Checklist' }
      ]}
      actions={canCreateForm ? [
        <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/dashboard/inspection/forms/acdb-checklist/create')}
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

export default ACDBChecklistFormList;