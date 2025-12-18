import React, { useState, useEffect } from 'react';
import { Table, Button, Space, message, Modal, Tag, Popconfirm } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined, TeamOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import { getGrievances, updateGrievance, deleteGrievance } from '../services/esgAPI';
import { Grievance } from '../types';
import GrievanceForm from './GrievanceForm';

const GrievanceList: React.FC = () => {
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);
  const [editingGrievance, setEditingGrievance] = useState<Grievance | null>(null);

  const fetchGrievances = async () => {
    setLoading(true);
    try {
      const response = await getGrievances();
      console.log('Grievances response:', response.data);
      const data = response.data.results || response.data || [];
      setGrievances(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching grievances:', error);
      message.error('Failed to fetch grievances');
      setGrievances([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrievances();
  }, []);

  const handleView = (record: Grievance) => {
    setSelectedGrievance(record);
    setViewModalVisible(true);
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      await updateGrievance(id, { status });
      message.success('Grievance status updated successfully');
      fetchGrievances();
    } catch (error) {
      message.error('Failed to update grievance status');
    }
  };

  const handleDelete = async (record: Grievance) => {
    try {
      await deleteGrievance(record.id!);
      message.success('Grievance deleted successfully');
      fetchGrievances();
    } catch (error) {
      message.error('Failed to delete grievance');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return 'red';
      case 'under investigation': return 'orange';
      case 'resolved': return 'green';
      case 'closed': return 'blue';
      default: return 'default';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'environmental': return 'green';
      case 'workplace safety': return 'orange';
      case 'discrimination': return 'red';
      case 'harassment': return 'purple';
      default: return 'blue';
    }
  };

  const columns: ColumnsType<Grievance> = [
    {
      title: 'Grievance ID',
      dataIndex: 'id',
      key: 'id',
      render: (id: number) => `GRV-${String(id).padStart(3, '0')}`,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={getTypeColor(type)}>
          {type}
        </Tag>
      ),
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
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
      title: 'Anonymous',
      dataIndex: 'anonymous_flag',
      key: 'anonymous_flag',
      render: (anonymous: boolean) => (
        <Tag color={anonymous ? 'blue' : 'green'}>
          {anonymous ? 'Yes' : 'No'}
        </Tag>
      ),
    },
    {
      title: 'Assigned To',
      dataIndex: 'assigned_to_name',
      key: 'assigned_to_name',
      render: (name: string) => name || 'Unassigned',
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: any, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handleView(record)}
          />
          {record.status !== 'resolved' && record.status !== 'closed' && (
            <Button
              type="link"
              size="small"
              onClick={() => handleStatusUpdate(record.id!, 'resolved')}
            >
              Resolve
            </Button>
          )}
          <Popconfirm
            title="Are you sure you want to delete this grievance?"
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
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
          <TeamOutlined style={{ marginRight: 8 }} />
          Grievance Management
        </h3>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingGrievance(null);
            setFormModalVisible(true);
          }}
        >
          Report Grievance
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={grievances}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 5,
          showSizeChanger: false,
        }}
        size="small"
      />

      <Modal
        title="Grievance Details"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>
        ]}
        width={700}
      >
        {selectedGrievance && (
          <div>
            <p><strong>Grievance ID:</strong> GRV-{String(selectedGrievance.id).padStart(3, '0')}</p>
            <p><strong>Type:</strong> <Tag color={getTypeColor(selectedGrievance.type)}>{selectedGrievance.type}</Tag></p>
            <p><strong>Source:</strong> {selectedGrievance.source}</p>
            <p><strong>Status:</strong> <Tag color={getStatusColor(selectedGrievance.status)}>{selectedGrievance.status}</Tag></p>
            <p><strong>Anonymous:</strong> <Tag color={selectedGrievance.anonymous_flag ? 'blue' : 'green'}>{selectedGrievance.anonymous_flag ? 'Yes' : 'No'}</Tag></p>
            <p><strong>Assigned To:</strong> {selectedGrievance.assigned_to_name || 'Unassigned'}</p>
            <p><strong>Description:</strong></p>
            <div style={{ backgroundColor: '#f5f5f5', padding: 12, borderRadius: 6, marginBottom: 16 }}>
              {selectedGrievance.description}
            </div>
            <p><strong>Resolution Date:</strong> {selectedGrievance.resolution_date ? new Date(selectedGrievance.resolution_date).toLocaleDateString() : 'Not resolved'}</p>
            <p><strong>Evidence Files:</strong> {selectedGrievance.evidence_ids?.length || 0} files</p>
            <p><strong>Created:</strong> {selectedGrievance.created_at ? new Date(selectedGrievance.created_at).toLocaleString() : 'N/A'}</p>
          </div>
        )}
      </Modal>

      <Modal
        title={editingGrievance ? 'Edit Grievance' : 'Report Grievance'}
        open={formModalVisible}
        onCancel={() => setFormModalVisible(false)}
        footer={null}
        width={800}
      >
        <GrievanceForm
          initialData={editingGrievance}
          onSuccess={() => {
            setFormModalVisible(false);
            setEditingGrievance(null);
            fetchGrievances();
          }}
        />
      </Modal>
    </div>
  );
};

export default GrievanceList;