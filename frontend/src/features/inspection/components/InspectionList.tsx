import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Tag, Space, Input, Select, message, Modal } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { inspectionService } from '../services/inspectionService';
import type { Inspection } from '../types';
import useAuthStore from '@common/store/authStore';
import { authGuard } from '../../../common/utils/authGuard';

const { Search } = Input;
const { Option } = Select;

const InspectionList: React.FC = () => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const navigate = useNavigate();
  const { selectedProject } = useAuthStore();

  const fetchInspections = async () => {
    // Check authentication before making API call
    if (!authGuard.canMakeApiCall()) {
      console.log('User not authenticated, skipping inspections fetch');
      return;
    }

    setLoading(true);
    try {
      const params: any = {};
      if (selectedProject) params.project_id = selectedProject;
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      if (searchText) params.search = searchText;

      const response = await inspectionService.getInspections(params);
      setInspections(response.data.results);
    } catch (error) {
      // Only show error message if user is authenticated
      if (authGuard.canMakeApiCall()) {
        message.error('Failed to fetch inspections');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, [selectedProject, statusFilter, typeFilter, searchText]);

  const handleStartInspection = async (id: string) => {
    try {
      await inspectionService.startInspection(id);
      message.success('Inspection started successfully');
      fetchInspections();
    } catch (error) {
      message.error('Failed to start inspection');
    }
  };

  const handleCompleteInspection = async (id: string) => {
    try {
      await inspectionService.completeInspection(id);
      message.success('Inspection completed successfully');
      fetchInspections();
    } catch (error) {
      message.error('Failed to complete inspection');
    }
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Delete Inspection',
      content: 'Are you sure you want to delete this inspection?',
      onOk: async () => {
        try {
          await inspectionService.deleteInspection(id);
          message.success('Inspection deleted successfully');
          fetchInspections();
        } catch (error) {
          message.error('Failed to delete inspection');
        }
      },
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'default',
      scheduled: 'blue',
      in_progress: 'orange',
      completed: 'green',
      cancelled: 'red',
    };
    return colors[status as keyof typeof colors] || 'default';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'green',
      medium: 'orange',
      high: 'red',
      critical: 'purple',
    };
    return colors[priority as keyof typeof colors] || 'default';
  };

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Inspection) => (
        <div>
          <div className="font-medium">{text}</div>
          <div className="text-sm text-gray-500">{record.location}</div>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'inspection_type',
      key: 'inspection_type',
      render: (type: string) => (
        <Tag>{type.replace('_', ' ').toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => (
        <Tag color={getPriorityColor(priority)}>
          {priority.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Inspector',
      dataIndex: 'inspector_name',
      key: 'inspector_name',
    },
    {
      title: 'Scheduled Date',
      dataIndex: 'scheduled_date',
      key: 'scheduled_date',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Inspection) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/dashboard/inspection/view/${record.id}`)}
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => navigate(`/dashboard/inspection/edit/${record.id}`)}
          />
          {record.status === 'scheduled' && (
            <Button
              type="text"
              icon={<PlayCircleOutlined />}
              onClick={() => handleStartInspection(record.id)}
            />
          )}
          {record.status === 'in_progress' && (
            <Button
              type="text"
              icon={<CheckCircleOutlined />}
              onClick={() => handleCompleteInspection(record.id)}
            />
          )}
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Inspections</h2>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/dashboard/inspection/create')}
          >
            Create Inspection
          </Button>
        </div>

        <div className="flex gap-4 mb-6">
          <Search
            placeholder="Search inspections..."
            allowClear
            style={{ width: 300 }}
            onSearch={setSearchText}
            onChange={(e) => !e.target.value && setSearchText('')}
          />
          <Select
            placeholder="Filter by status"
            style={{ width: 150 }}
            allowClear
            onChange={setStatusFilter}
          >
            <Option value="draft">Draft</Option>
            <Option value="scheduled">Scheduled</Option>
            <Option value="in_progress">In Progress</Option>
            <Option value="completed">Completed</Option>
            <Option value="cancelled">Cancelled</Option>
          </Select>
          <Select
            placeholder="Filter by type"
            style={{ width: 150 }}
            allowClear
            onChange={setTypeFilter}
          >
            <Option value="safety">Safety</Option>
            <Option value="quality">Quality</Option>
            <Option value="environmental">Environmental</Option>
            <Option value="equipment">Equipment</Option>
            <Option value="housekeeping">Housekeeping</Option>
            <Option value="fire_safety">Fire Safety</Option>
            <Option value="electrical">Electrical</Option>
            <Option value="structural">Structural</Option>
          </Select>
        </div>

        <Table
          columns={columns}
          dataSource={inspections}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
        />
      </Card>
    </div>
  );
};

export default InspectionList;