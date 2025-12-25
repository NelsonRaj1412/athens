import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, DatePicker, Select, Input, message } from 'antd';
import { FileTextOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons';
import { inspectionService } from '../services/inspectionService';
import type { InspectionReport } from '../types';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Search } = Input;

const InspectionReports: React.FC = () => {
  const [reports, setReports] = useState<InspectionReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [filteredReports, setFilteredReports] = useState<InspectionReport[]>([]);
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  });

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await inspectionService.getInspectionReports();
      const data = response.data.results || [];
      setReports(data);
      setFilteredReports(data);
    } catch (error) {
      message.error('Failed to fetch inspection reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    let filtered = reports;
    
    if (filters.status) {
      filtered = filtered.filter(report => report.status === filters.status);
    }
    
    if (filters.search) {
      filtered = filtered.filter(report => 
        report.title?.toLowerCase().includes(filters.search.toLowerCase()) ||
        report.id?.toString().includes(filters.search)
      );
    }
    
    setFilteredReports(filtered);
  }, [reports, filters]);

  const columns = [
    {
      title: 'Report ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      sorter: (a: any, b: any) => a.id - b.id,
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      sorter: (a: any, b: any) => (a.title || '').localeCompare(b.title || ''),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag color="blue">{type}</Tag>,
      sorter: (a: any, b: any) => (a.type || '').localeCompare(b.type || ''),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'completed' ? 'green' : status === 'in_progress' ? 'orange' : 'red';
        return <Tag color={color}>{status?.replace('_', ' ').toUpperCase()}</Tag>;
      },
      sorter: (a: any, b: any) => (a.status || '').localeCompare(b.status || ''),
    },
    {
      title: 'Created Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
      sorter: (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: InspectionReport) => (
        <Space>
          <Button 
            type="primary" 
            icon={<EyeOutlined />} 
            size="small"
            onClick={() => handleViewReport(record.id)}
          >
            View
          </Button>
          <Button 
            icon={<DownloadOutlined />} 
            size="small"
            onClick={() => handleDownloadReport(record.id)}
          >
            Download
          </Button>
        </Space>
      )
    }
  ];

  const handleViewReport = (id: string) => {
    message.info(`Viewing report ${id}`);
  };

  const handleDownloadReport = (id: string) => {
    message.info(`Downloading report ${id}`);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileTextOutlined />
          Inspection Reports
        </h2>
      </div>
      
      <div className="mb-4 flex gap-4 flex-wrap">
        <Search
          placeholder="Search reports..."
          style={{ width: 200 }}
          onSearch={(value) => setFilters(prev => ({ ...prev, search: value }))}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
        />
        <Select
          placeholder="Filter by status"
          style={{ width: 150 }}
          allowClear
          onChange={(value) => setFilters(prev => ({ ...prev, status: value || '' }))}
        >
          <Option value="completed">Completed</Option>
          <Option value="in_progress">In Progress</Option>
          <Option value="pending">Pending</Option>
        </Select>
      </div>

      <Table
        columns={columns}
        dataSource={filteredReports}
        loading={loading}
        rowKey="id"
        size="middle"
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `Total ${total} reports`
        }}
      />
    </div>
  );
};

export default InspectionReports;