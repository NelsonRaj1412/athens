import React, { useState, useEffect } from 'react';
import { Table, Button, Space, message, Modal, Tag, Popconfirm } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined, DeleteOutlined as WasteIcon } from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import PageLayout from '../../../common/components/PageLayout';
import { getWasteManifests, updateWasteManifest, deleteWasteManifest } from '../services/esgAPI';
import { WasteManifest } from '../types';
import WasteManifestForm from './WasteManifestForm';
import WasteManifestAnalytics from './analytics/WasteManifestAnalytics';

const WasteManifestList: React.FC = () => {
  const [manifests, setManifests] = useState<WasteManifest[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingManifest, setEditingManifest] = useState<WasteManifest | null>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedManifest, setSelectedManifest] = useState<WasteManifest | null>(null);

  const fetchManifests = async () => {
    setLoading(true);
    try {
      const response = await getWasteManifests();
      const data = response.data.results || response.data || [];
      setManifests(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error('Failed to fetch waste manifests');
      setManifests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManifests();
  }, []);

  const handleView = (record: WasteManifest) => {
    setSelectedManifest(record);
    setViewModalVisible(true);
  };

  const handleEdit = (record: WasteManifest) => {
    setEditingManifest(record);
    setModalVisible(true);
  };

  const handleCreate = () => {
    setEditingManifest(null);
    setModalVisible(true);
  };

  const handleFormSuccess = () => {
    setModalVisible(false);
    setEditingManifest(null);
    fetchManifests();
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      await updateWasteManifest(id, { status });
      message.success('Status updated successfully');
      fetchManifests();
    } catch (error) {
      message.error('Failed to update status');
    }
  };

  const handleDelete = async (record: WasteManifest) => {
    if (!record.id) {
      message.error('Cannot delete: Invalid record ID');
      return;
    }
    
    try {
      await deleteWasteManifest(record.id);
      message.success('Waste manifest deleted successfully');
      fetchManifests();
    } catch (error) {
      console.error('Delete error:', error);
      message.error('Failed to delete waste manifest');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'generated': return 'orange';
      case 'transported': return 'blue';
      case 'disposed': return 'green';
      case 'cancelled': return 'red';
      default: return 'default';
    }
  };

  const getWasteTypeColor = (type: string) => {
    switch (type) {
      case 'Hazardous Waste': return 'red';
      case 'Non-Hazardous Waste': return 'green';
      case 'Recyclable Materials': return 'blue';
      case 'Electronic Waste': return 'purple';
      default: return 'default';
    }
  };

  const columns: ColumnsType<WasteManifest> = [
    {
      title: 'Waste Type',
      dataIndex: 'waste_type',
      key: 'waste_type',
      render: (type: string) => (
        <Tag color={getWasteTypeColor(type)} icon={<WasteIcon />}>
          {type}
        </Tag>
      ),
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity: number, record: WasteManifest) => (
        <span style={{ fontWeight: 'bold' }}>
          {quantity} {record.uom}
        </span>
      ),
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
      title: 'Stored Since',
      dataIndex: 'stored_since',
      key: 'stored_since',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Transporter',
      dataIndex: 'transporter_name',
      key: 'transporter_name',
      render: (name: string) => name || 'Not assigned',
    },
    {
      title: 'TSDF ID',
      dataIndex: 'tsdf_id',
      key: 'tsdf_id',
      render: (id: string) => id || 'TBD',
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
          {record.status === 'generated' && (
            <Button
              type="text"
              size="small"
              onClick={() => handleStatusUpdate(record.id!, 'transported')}
            >
              Mark Transported
            </Button>
          )}
          {record.status === 'transported' && (
            <Button
              type="text"
              size="small"
              onClick={() => handleStatusUpdate(record.id!, 'disposed')}
            >
              Mark Disposed
            </Button>
          )}
          <Popconfirm
            title="Are you sure you want to delete this waste manifest?"
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
      title="Waste Manifests"
      subtitle="Waste generation and disposal tracking"
      breadcrumbs={[
        { title: 'ESG Management' },
        { title: 'Waste Management' }
      ]}
      actions={[
        <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          Create Waste Manifest
        </Button>
      ]}
    >
      <WasteManifestAnalytics data={manifests} />
      <Table
        columns={columns}
        dataSource={manifests}
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
        title={editingManifest ? 'Edit Waste Manifest' : 'Create Waste Manifest'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <WasteManifestForm
          initialData={editingManifest}
          onSuccess={handleFormSuccess}
        />
      </Modal>

      {/* View Modal */}
      <Modal
        title="Waste Manifest Details"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>
        ]}
        width={700}
      >
        {selectedManifest && (
          <div>
            <p><strong>Waste Type:</strong> <Tag color={getWasteTypeColor(selectedManifest.waste_type)}>{selectedManifest.waste_type}</Tag></p>
            <p><strong>Quantity:</strong> {selectedManifest.quantity} {selectedManifest.uom}</p>
            <p><strong>Status:</strong> <Tag color={getStatusColor(selectedManifest.status)}>{selectedManifest.status.toUpperCase()}</Tag></p>
            <p><strong>Stored Since:</strong> {dayjs(selectedManifest.stored_since).format('DD/MM/YYYY')}</p>
            <p><strong>Transporter:</strong> {selectedManifest.transporter_name || 'Not assigned'}</p>
            <p><strong>TSDF ID:</strong> {selectedManifest.tsdf_id}</p>
            <p><strong>Manifest Documents:</strong> {selectedManifest.manifest_docs?.length || 0} files</p>
            <p><strong>Created:</strong> {dayjs(selectedManifest.created_at).format('DD/MM/YYYY HH:mm:ss')}</p>
          </div>
        )}
      </Modal>
    </PageLayout>
  );
};

export default WasteManifestList;