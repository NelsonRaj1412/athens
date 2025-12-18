import React, { useState, useEffect } from 'react';
import { Table, Button, Space, message, Modal, Tag, Popconfirm } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import PageLayout from '../../../common/components/PageLayout';
import { getEnvironmentAspects, deleteEnvironmentAspect } from '../services/esgAPI';
import { EnvironmentAspect } from '../types';
import EnvironmentAspectForm from './EnvironmentAspectForm';
import EnvironmentAspectAnalytics from './analytics/EnvironmentAspectAnalytics';

const EnvironmentAspectList: React.FC = () => {
  const [aspects, setAspects] = useState<EnvironmentAspect[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAspect, setEditingAspect] = useState<EnvironmentAspect | null>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedAspect, setSelectedAspect] = useState<EnvironmentAspect | null>(null);

  const fetchAspects = async () => {
    setLoading(true);
    try {
      const response = await getEnvironmentAspects();
      const data = response.data.results || response.data || [];
      setAspects(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error('Failed to fetch environment aspects');
      setAspects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAspects();
  }, []);

  const handleDelete = async (record: EnvironmentAspect) => {
    if (!record.id) {
      message.error('Cannot delete: Invalid record ID');
      return;
    }
    
    try {
      await deleteEnvironmentAspect(record.id);
      message.success('Environment aspect deleted successfully');
      fetchAspects();
    } catch (error) {
      console.error('Delete error:', error);
      message.error('Failed to delete environment aspect');
    }
  };

  const handleView = (record: EnvironmentAspect) => {
    setSelectedAspect(record);
    setViewModalVisible(true);
  };

  const handleEdit = (record: EnvironmentAspect) => {
    setEditingAspect(record);
    setModalVisible(true);
  };

  const handleCreate = () => {
    setEditingAspect(null);
    setModalVisible(true);
  };

  const handleFormSuccess = () => {
    setModalVisible(false);
    setEditingAspect(null);
    fetchAspects();
  };

  const getSeverityColor = (severity: number) => {
    switch (severity) {
      case 1: return 'green';
      case 2: return 'orange';
      case 3: return 'red';
      case 4: return 'purple';
      default: return 'default';
    }
  };

  const getSeverityText = (severity: number) => {
    switch (severity) {
      case 1: return 'Low';
      case 2: return 'Medium';
      case 3: return 'High';
      case 4: return 'Critical';
      default: return 'Unknown';
    }
  };

  const columns: ColumnsType<EnvironmentAspect> = [
    {
      title: 'Aspect Type',
      dataIndex: 'aspect_type',
      key: 'aspect_type',
      render: (type: string) => type.replace('_', ' ').toUpperCase(),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity: number) => (
        <Tag color={getSeverityColor(severity)}>
          {getSeverityText(severity)}
        </Tag>
      ),
    },
    {
      title: 'Likelihood',
      dataIndex: 'likelihood',
      key: 'likelihood',
      render: (likelihood: number) => (
        <Tag color={getSeverityColor(likelihood)}>
          {getSeverityText(likelihood)}
        </Tag>
      ),
    },
    {
      title: 'Significance',
      dataIndex: 'significance',
      key: 'significance',
      render: (significance: number) => significance ? significance : 'Not calculated',
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
      render: (_: any, record) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Are you sure you want to delete this environment aspect?"
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageLayout
      title="Environment Aspects"
      subtitle="Environmental impact assessment and management"
      breadcrumbs={[
        { title: 'ESG Management' },
        { title: 'Environment Aspects' }
      ]}
      actions={[
        <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          Add Environment Aspect
        </Button>
      ]}
    >
      <EnvironmentAspectAnalytics data={aspects} />
      <Table
        columns={columns}
        dataSource={aspects}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        className="bg-white rounded-lg"
      />

      {/* Create/Edit Modal */}
      <Modal
        title={editingAspect ? 'Edit Environment Aspect' : 'Create Environment Aspect'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <EnvironmentAspectForm
          initialData={editingAspect}
          onSuccess={handleFormSuccess}
        />
      </Modal>

      {/* View Modal */}
      <Modal
        title="Environment Aspect Details"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>
        ]}
        width={700}
      >
        {selectedAspect && (
          <div>
            <p><strong>Aspect Type:</strong> {selectedAspect.aspect_type.replace('_', ' ')}</p>
            <p><strong>Description:</strong> {selectedAspect.description}</p>
            <p><strong>Severity:</strong> <Tag color={getSeverityColor(selectedAspect.severity)}>{getSeverityText(selectedAspect.severity)}</Tag></p>
            <p><strong>Likelihood:</strong> <Tag color={getSeverityColor(selectedAspect.likelihood)}>{getSeverityText(selectedAspect.likelihood)}</Tag></p>
            <p><strong>Significance:</strong> {selectedAspect.significance ? selectedAspect.significance : 'Not calculated'}</p>
            <p><strong>Control Measures:</strong></p>
            <ul>
              {selectedAspect.controls && selectedAspect.controls.length > 0 ? 
                selectedAspect.controls.map((control, index) => (
                  <li key={index}>{control}</li>
                )) : 
                <li>No control measures specified</li>
              }
            </ul>
            <p><strong>Created:</strong> {new Date(selectedAspect.created_at!).toLocaleString()}</p>
          </div>
        )}
      </Modal>
    </PageLayout>
  );
};

export default EnvironmentAspectList;