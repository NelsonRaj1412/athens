import React, { useState, useEffect } from 'react';
import { Table, Button, Space, message, Modal, Tag, Popconfirm } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined, FileTextOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import { getESGPolicies, deleteESGPolicy } from '../services/esgAPI';
import { ESGPolicy } from '../types';
import ESGPolicyForm from './ESGPolicyForm';

const ESGPolicyList: React.FC = () => {
  const [policies, setPolicies] = useState<ESGPolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<ESGPolicy | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<ESGPolicy | null>(null);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const response = await getESGPolicies();
      console.log('ESG Policies full response:', response);
      console.log('ESG Policies response.data:', response.data);
      console.log('ESG Policies response.data type:', typeof response.data);
      console.log('ESG Policies response.data.results:', response.data.results);
      
      const data = response.data.results || response.data || [];
      console.log('Processed data:', data);
      console.log('Is data array?', Array.isArray(data));
      
      setPolicies(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching ESG policies:', error);
      console.error('Error details:', error.response?.data);
      message.error('Failed to fetch ESG policies');
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleView = (record: ESGPolicy) => {
    setSelectedPolicy(record);
    setViewModalVisible(true);
  };

  const handleDelete = async (record: ESGPolicy) => {
    try {
      await deleteESGPolicy(record.id!);
      message.success('Policy deleted successfully');
      fetchPolicies();
    } catch (error) {
      message.error('Failed to delete policy');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'green';
      case 'under review': return 'orange';
      case 'draft': return 'blue';
      case 'archived': return 'red';
      default: return 'default';
    }
  };

  const columns: ColumnsType<ESGPolicy> = [
    {
      title: 'Policy Title',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => (
        <span style={{ fontWeight: 'bold' }}>{text}</span>
      ),
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Effective Date',
      dataIndex: 'effective_date',
      key: 'effective_date',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'ISO Clauses',
      dataIndex: 'mapped_iso_clauses',
      key: 'mapped_iso_clauses',
      render: (clauses: string[]) => (
        <span>{clauses?.length || 0} clauses</span>
      ),
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
            onClick={() => {
              setEditingPolicy(record);
              setFormModalVisible(true);
            }}
          />
          <Popconfirm
            title="Are you sure you want to delete this policy?"
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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>
          <FileTextOutlined style={{ marginRight: 8 }} />
          ESG Policies
        </h3>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingPolicy(null);
            setFormModalVisible(true);
          }}
        >
          Add Policy
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={policies}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 5,
          showSizeChanger: false,
        }}
        size="small"
      />

      <Modal
        title="Policy Details"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>
        ]}
        width={600}
      >
        {selectedPolicy && (
          <div>
            <p><strong>Title:</strong> {selectedPolicy.title}</p>
            <p><strong>Version:</strong> {selectedPolicy.version}</p>
            <p><strong>Status:</strong> <Tag color={getStatusColor(selectedPolicy.status)}>{selectedPolicy.status}</Tag></p>
            <p><strong>Effective Date:</strong> {new Date(selectedPolicy.effective_date).toLocaleDateString()}</p>
            <p><strong>ISO Clauses:</strong> {selectedPolicy.mapped_iso_clauses?.join(', ') || 'None mapped'}</p>
            <p><strong>Created:</strong> {selectedPolicy.created_at ? new Date(selectedPolicy.created_at).toLocaleString() : 'N/A'}</p>
          </div>
        )}
      </Modal>

      <Modal
        title={editingPolicy ? 'Edit ESG Policy' : 'Create ESG Policy'}
        open={formModalVisible}
        onCancel={() => setFormModalVisible(false)}
        footer={null}
        width={800}
      >
        <ESGPolicyForm
          initialData={editingPolicy}
          onSuccess={() => {
            setFormModalVisible(false);
            setEditingPolicy(null);
            fetchPolicies();
          }}
        />
      </Modal>
    </div>
  );
};

export default ESGPolicyList;