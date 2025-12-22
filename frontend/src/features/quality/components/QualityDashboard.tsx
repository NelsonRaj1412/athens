import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Progress, Table, Tag, Button, Select } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { getInspectionStats, getQualityInspections, getSupplierStats } from '../api';
import PageLayout from '@common/components/PageLayout';

const QualityDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>({});
  const [supplierStats, setSupplierStats] = useState<any>({});
  const [recentInspections, setRecentInspections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, supplierRes, inspectionsRes] = await Promise.all([
        getInspectionStats(),
        getSupplierStats(),
        getQualityInspections({ limit: 10 })
      ]);
      
      setStats(statsRes.data || {});
      setSupplierStats(supplierRes.data || {});
      setRecentInspections(inspectionsRes.data?.results || inspectionsRes.data || []);
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      if (error.response?.status === 401) {
        // Don't handle 401 here, let axios interceptor handle it
        return;
      }
      // Set empty data on other errors
      setStats({});
      setSupplierStats({});
      setRecentInspections([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'orange',
      in_progress: 'blue',
      completed: 'green',
      failed: 'red',
      rework: 'purple'
    };
    return colors[status as keyof typeof colors] || 'default';
  };

  const getResultColor = (result: string) => {
    const colors = {
      pass: '#22c55e',
      fail: '#ef4444',
      conditional: '#f97316',
      rework: '#a855f7'
    };
    return colors[result as keyof typeof colors] || '#6b7280';
  };

  const inspectionColumns = [
    {
      title: 'Inspection ID',
      dataIndex: 'inspection_id',
      key: 'inspection_id',
      render: (id: string) => id.slice(0, 8)
    },
    {
      title: 'Component',
      dataIndex: 'component_type',
      key: 'component_type'
    },
    {
      title: 'Reference',
      dataIndex: 'reference_number',
      key: 'reference_number'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status.replace('_', ' ').toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Result',
      dataIndex: 'overall_result',
      key: 'overall_result',
      render: (result: string) => (
        <Tag color={getResultColor(result)}>
          {result.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Inspector',
      dataIndex: 'inspector_name',
      key: 'inspector_name'
    }
  ];

  return (
    <PageLayout
      title="Quality Management Dashboard"
      subtitle="Monitor quality inspections, defects, and supplier performance"
    >
      {/* Key Metrics */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Inspections"
              value={stats.total_inspections || 0}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pass Rate"
              value={stats.pass_rate || 0}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: stats.pass_rate >= 95 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="In Progress"
              value={stats.by_status?.in_progress || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Completed"
              value={stats.by_status?.completed || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Progress Overview */}
      <Row gutter={16} className="mb-6">
        <Col span={12}>
          <Card title="Inspection Progress" loading={loading}>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span>Completed</span>
                  <span>{stats.by_status?.completed || 0}</span>
                </div>
                <Progress 
                  percent={stats.total_inspections ? ((stats.by_status?.completed || 0) / stats.total_inspections) * 100 : 0} 
                  status="success" 
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span>In Progress</span>
                  <span>{stats.by_status?.in_progress || 0}</span>
                </div>
                <Progress 
                  percent={stats.total_inspections ? ((stats.by_status?.in_progress || 0) / stats.total_inspections) * 100 : 0} 
                  status="active" 
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span>Pending</span>
                  <span>{stats.by_status?.scheduled || 0}</span>
                </div>
                <Progress 
                  percent={stats.total_inspections ? ((stats.by_status?.scheduled || 0) / stats.total_inspections) * 100 : 0} 
                  status="normal" 
                />
              </div>
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Supplier Quality Overview" loading={loading}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Total Suppliers"
                  value={supplierStats.total_suppliers || 0}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Approved Suppliers"
                  value={supplierStats.approved_suppliers || 0}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>
            </Row>
            <div className="mt-4">
              <Statistic
                title="Average Quality Score"
                value={supplierStats.average_quality_score || 0}
                precision={2}
                suffix="/100"
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Recent Inspections */}
      <Card title="Recent Inspections" loading={loading}>
        <Table
          columns={inspectionColumns}
          dataSource={recentInspections}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>
    </PageLayout>
  );
};

export default QualityDashboard;