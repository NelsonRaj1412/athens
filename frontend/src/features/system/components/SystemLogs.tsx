import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Select, DatePicker, Input, Space, message } from 'antd';
import { DownloadOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getSystemLogs, exportSystemLogs } from '../api';
import PageLayout from '@common/components/PageLayout';

const { Option } = Select;
const { RangePicker } = DatePicker;

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  module: string;
  message: string;
  user?: string;
  ip_address?: string;
}

const SystemLogs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<{
    level: string;
    module: string;
    search: string;
    dateRange: [any, any] | null;
  }>({
    level: 'all',
    module: 'all',
    search: '',
    dateRange: null
  });

  // Logs data will be loaded from API

  useEffect(() => {
    loadLogs();
  }, [page, pageSize, filters]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, page_size: pageSize };
      if (filters.level !== 'all') params.level = filters.level;
      if (filters.module !== 'all') params.module = filters.module;
      if (filters.search) params.search = filters.search;
      if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
        params.start = filters.dateRange[0].format('YYYY-MM-DD');
        params.end = filters.dateRange[1].format('YYYY-MM-DD');
      }
      const { data } = await getSystemLogs(params);
      const rows = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      setLogs(rows);
      setTotal(data?.count ?? rows.length);
    } catch (error: any) {
      console.error('Failed to load logs:', error);
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const { data } = await exportSystemLogs({});
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'system-logs.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success('Logs exported successfully');
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to export logs');
    }
  };

  const getLevelColor = (level: string) => {
    const colors = {
      DEBUG: 'default',
      INFO: 'blue',
      WARNING: 'orange',
      ERROR: 'red',
      CRITICAL: 'red'
    };
    return colors[level as keyof typeof colors] || 'default';
  };

  const columns: ColumnsType<LogEntry> = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
    },
    {
      title: 'Level',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level: string) => (
        <Tag color={getLevelColor(level)}>{level}</Tag>
      ),
    },
    {
      title: 'Module',
      dataIndex: 'module',
      key: 'module',
      width: 150,
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
    {
      title: 'User',
      dataIndex: 'user',
      key: 'user',
      width: 150,
    },
    {
      title: 'IP Address',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 130,
    },
  ];

  return (
    <PageLayout
      title="System Logs"
      subtitle="View and analyze system logs for monitoring and troubleshooting"
    >
      <Card>
        <div className="mb-4">
          <Space wrap>
            <Select
              value={filters.level}
              onChange={(value) => setFilters({ ...filters, level: value })}
              style={{ width: 120 }}
            >
              <Option value="all">All Levels</Option>
              <Option value="DEBUG">Debug</Option>
              <Option value="INFO">Info</Option>
              <Option value="WARNING">Warning</Option>
              <Option value="ERROR">Error</Option>
              <Option value="CRITICAL">Critical</Option>
            </Select>

            <Select
              value={filters.module}
              onChange={(value) => setFilters({ ...filters, module: value })}
              style={{ width: 150 }}
            >
              <Option value="all">All Modules</Option>
              <Option value="authentication">Authentication</Option>
              <Option value="incidentmanagement">Incidents</Option>
              <Option value="ptw">PTW</Option>
              <Option value="safetyobservation">Safety</Option>
              <Option value="worker">Worker</Option>
            </Select>

            <Input
              placeholder="Search logs..."
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              style={{ width: 200 }}
            />

            <RangePicker
              value={filters.dateRange}
              onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
            />

            <Button
              icon={<ReloadOutlined />}
              onClick={() => { setPage(1); loadLogs(); }}
              loading={loading}
            >
              Refresh
            </Button>

            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExport}
            >
              Export
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            total: total,
            pageSize: pageSize,
            showSizeChanger: true,
            showQuickJumper: true,
            onChange: (p, ps) => { setPage(p); setPageSize(ps || 50); },
            showTotal: (t, range) => `${range[0]}-${range[1]} of ${t} logs`,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>
    </PageLayout>
  );
};

export default SystemLogs;
