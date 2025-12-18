import React, { useState, useEffect } from 'react';
import { Table, Button, Space, message, Modal, Tag, Popconfirm } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import PageLayout from '../../../common/components/PageLayout';
import { getGenerationData, deleteGenerationData } from '../services/esgAPI';
import { GenerationData } from '../types';
import GenerationDataForm from './GenerationDataForm';
import GenerationDataAnalytics from './analytics/GenerationDataAnalytics';

const GenerationDataList: React.FC = () => {
  const [generationData, setGenerationData] = useState<GenerationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingData, setEditingData] = useState<GenerationData | null>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedData, setSelectedData] = useState<GenerationData | null>(null);

  const fetchGenerationData = async () => {
    setLoading(true);
    try {
      const response = await getGenerationData();
      const data = response.data.results || response.data || [];
      setGenerationData(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error('Failed to fetch generation data');
      setGenerationData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGenerationData();
  }, []);

  const handleView = (record: GenerationData) => {
    setSelectedData(record);
    setViewModalVisible(true);
  };

  const handleEdit = (record: GenerationData) => {
    setEditingData(record);
    setModalVisible(true);
  };

  const handleCreate = () => {
    setEditingData(null);
    setModalVisible(true);
  };

  const handleFormSuccess = () => {
    setModalVisible(false);
    setEditingData(null);
    fetchGenerationData();
  };

  const handleDelete = async (record: GenerationData) => {
    if (!record.id) {
      message.error('Cannot delete: Invalid record ID');
      return;
    }
    
    try {
      await deleteGenerationData(record.id);
      message.success('Generation data deleted successfully');
      fetchGenerationData();
    } catch (error) {
      console.error('Delete error:', error);
      message.error('Failed to delete generation data');
    }
  };

  const getAssetTypeColor = (type: string) => {
    switch (type) {
      case 'wind': return 'blue';
      case 'solar': return 'orange';
      case 'battery': return 'green';
      case 'grid': return 'purple';
      default: return 'default';
    }
  };

  const columns: ColumnsType<GenerationData> = [
    {
      title: 'Asset ID',
      dataIndex: 'asset_id',
      key: 'asset_id',
      render: (text: string) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{text}</span>
      ),
    },
    {
      title: 'Asset Type',
      dataIndex: 'asset_type',
      key: 'asset_type',
      render: (type: string) => (
        <Tag color={getAssetTypeColor(type)} icon={<ThunderboltOutlined />}>
          {type.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Energy Generated (kWh)',
      dataIndex: 'kwh',
      key: 'kwh',
      render: (kwh: number) => (
        <span style={{ fontWeight: 'bold' }}>{kwh.toLocaleString()}</span>
      ),
    },
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: string) => dayjs(timestamp).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Source Tag',
      dataIndex: 'source_tag',
      key: 'source_tag',
      render: (tag: string) => tag || '-',
    },
    {
      title: 'Import Method',
      dataIndex: 'imported_via',
      key: 'imported_via',
      render: (method: string) => (
        <Tag color={method === 'manual' ? 'blue' : 'green'}>
          {method?.toUpperCase() || 'MANUAL'}
        </Tag>
      ),
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
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
            title="Are you sure you want to delete this generation data?"
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
      title="Generation Data"
      subtitle="Energy generation tracking and monitoring"
      breadcrumbs={[
        { title: 'ESG Management' },
        { title: 'Generation Data' }
      ]}
      actions={[
        <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          Record Generation Data
        </Button>
      ]}
    >
      <GenerationDataAnalytics data={generationData} />
      <Table
        columns={columns}
        dataSource={generationData}
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
        title={editingData ? 'Edit Generation Data' : 'Record Generation Data'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <GenerationDataForm
          initialData={editingData}
          onSuccess={handleFormSuccess}
        />
      </Modal>

      {/* View Modal */}
      <Modal
        title="Generation Data Details"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>
        ]}
        width={600}
      >
        {selectedData && (
          <div>
            <p><strong>Asset ID:</strong> {selectedData.asset_id}</p>
            <p><strong>Asset Type:</strong> <Tag color={getAssetTypeColor(selectedData.asset_type)}>{selectedData.asset_type.toUpperCase()}</Tag></p>
            <p><strong>Energy Generated:</strong> {selectedData.kwh.toLocaleString()} kWh</p>
            <p><strong>Timestamp:</strong> {dayjs(selectedData.timestamp).format('DD/MM/YYYY HH:mm:ss')}</p>
            <p><strong>Source Tag:</strong> {selectedData.source_tag || 'Not specified'}</p>
            <p><strong>Import Method:</strong> <Tag color={selectedData.imported_via === 'manual' ? 'blue' : 'green'}>{selectedData.imported_via?.toUpperCase() || 'MANUAL'}</Tag></p>
            <p><strong>Created:</strong> {dayjs(selectedData.created_at).format('DD/MM/YYYY HH:mm:ss')}</p>
          </div>
        )}
      </Modal>
    </PageLayout>
  );
};

export default GenerationDataList;