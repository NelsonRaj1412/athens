import React, { useState, useEffect } from 'react';
import { Table, Button, Space, message, Modal, Tag, Popconfirm } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined, BugOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import PageLayout from '../../../common/components/PageLayout';
import { getBiodiversityEvents, deleteBiodiversityEvent } from '../services/esgAPI';
import { BiodiversityEvent } from '../types';
import BiodiversityEventForm from './BiodiversityEventForm';
import BiodiversityEventAnalytics from './analytics/BiodiversityEventAnalytics';

const BiodiversityEventList: React.FC = () => {
  const [events, setEvents] = useState<BiodiversityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<BiodiversityEvent | null>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<BiodiversityEvent | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await getBiodiversityEvents();
      const data = response.data.results || response.data || [];
      setEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error('Failed to fetch biodiversity events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleView = (record: BiodiversityEvent) => {
    setSelectedEvent(record);
    setViewModalVisible(true);
  };

  const handleEdit = (record: BiodiversityEvent) => {
    setEditingEvent(record);
    setModalVisible(true);
  };

  const handleCreate = () => {
    setEditingEvent(null);
    setModalVisible(true);
  };

  const handleFormSuccess = () => {
    setModalVisible(false);
    setEditingEvent(null);
    fetchEvents();
  };

  const handleDelete = async (record: BiodiversityEvent) => {
    if (!record.id) {
      message.error('Cannot delete: Invalid record ID');
      return;
    }
    
    try {
      await deleteBiodiversityEvent(record.id);
      message.success('Biodiversity event deleted successfully');
      fetchEvents();
    } catch (error) {
      console.error('Delete error:', error);
      message.error('Failed to delete biodiversity event');
    }
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

  const getEventTypeColor = (species: string) => {
    if (species.toLowerCase().includes('bird')) return 'blue';
    if (species.toLowerCase().includes('bat')) return 'purple';
    if (species.toLowerCase().includes('wildlife')) return 'green';
    return 'default';
  };

  const columns: ColumnsType<BiodiversityEvent> = [
    {
      title: 'Species/Event',
      dataIndex: 'species',
      key: 'species',
      render: (species: string) => (
        <Tag color={getEventTypeColor(species)} icon={<BugOutlined />}>
          {species}
        </Tag>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Time',
      dataIndex: 'time',
      key: 'time',
      render: (time: string) => time,
    },
    {
      title: 'Location',
      dataIndex: 'location_geo',
      key: 'location_geo',
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
      title: 'Related Incident',
      dataIndex: 'related_incident_id',
      key: 'related_incident_id',
      render: (incidentId: string) => incidentId || 'None',
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
            title="Are you sure you want to delete this biodiversity event?"
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
      title="Biodiversity Events"
      subtitle="Wildlife and biodiversity impact tracking"
      breadcrumbs={[
        { title: 'ESG Management' },
        { title: 'Biodiversity Events' }
      ]}
      actions={[
        <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          Report Biodiversity Event
        </Button>
      ]}
    >
      <BiodiversityEventAnalytics data={events} />
      <Table
        columns={columns}
        dataSource={events}
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
        title={editingEvent ? 'Edit Biodiversity Event' : 'Report Biodiversity Event'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <BiodiversityEventForm
          initialData={editingEvent}
          onSuccess={handleFormSuccess}
        />
      </Modal>

      {/* View Modal */}
      <Modal
        title="Biodiversity Event Details"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>
        ]}
        width={700}
      >
        {selectedEvent && (
          <div>
            <p><strong>Species/Event:</strong> <Tag color={getEventTypeColor(selectedEvent.species)}>{selectedEvent.species}</Tag></p>
            <p><strong>Date:</strong> {dayjs(selectedEvent.date).format('DD/MM/YYYY')}</p>
            <p><strong>Time:</strong> {selectedEvent.time}</p>
            <p><strong>Location:</strong> {selectedEvent.location_geo}</p>
            <p><strong>Severity:</strong> <Tag color={getSeverityColor(selectedEvent.severity)}>{getSeverityText(selectedEvent.severity)}</Tag></p>
            <p><strong>Actions Taken:</strong></p>
            <div style={{ backgroundColor: '#f5f5f5', padding: 12, borderRadius: 6, marginBottom: 16 }}>
              {selectedEvent.actions_taken}
            </div>
            <p><strong>Related Incident:</strong> {selectedEvent.related_incident_id || 'None'}</p>
            <p><strong>Created:</strong> {dayjs(selectedEvent.created_at).format('DD/MM/YYYY HH:mm:ss')}</p>
          </div>
        )}
      </Modal>
    </PageLayout>
  );
};

export default BiodiversityEventList;