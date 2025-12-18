import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Progress, Button, DatePicker, Select, Alert } from 'antd';
import { 
  ExperimentOutlined, 
  AlertOutlined, 
  CheckCircleOutlined,
  WarningOutlined,
  EnvironmentOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import PageLayout from '../../../common/components/PageLayout';
import { getEnvironmentalMonitoring, getComplianceDashboard } from '../services/esgAPI';
import { EnvironmentalMonitoring } from '../types';

const { RangePicker } = DatePicker;
const { Option } = Select;

const EnvironmentalMonitoringDashboard: React.FC = () => {
  const [monitoring, setMonitoring] = useState<EnvironmentalMonitoring[]>([]);
  const [complianceData, setComplianceData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedParameter, setSelectedParameter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [monitoringRes, complianceRes] = await Promise.allSettled([
        getEnvironmentalMonitoring(),
        getComplianceDashboard()
      ]);

      if (monitoringRes.status === 'fulfilled') {
        setMonitoring(monitoringRes.value.data.results || monitoringRes.value.data || []);
      }

      if (complianceRes.status === 'fulfilled') {
        setComplianceData(complianceRes.value.data);
      }
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'compliant': return '#52c41a';
      case 'warning': return '#faad14';
      case 'exceeded': return '#fa8c16';
      case 'critical': return '#f5222d';
      default: return '#d9d9d9';
    }
  };

  const getComplianceIcon = (status: string) => {
    switch (status) {
      case 'compliant': return <CheckCircleOutlined />;
      case 'warning': return <WarningOutlined />;
      case 'exceeded': return <AlertOutlined />;
      case 'critical': return <AlertOutlined />;
      default: return <ExperimentOutlined />;
    }
  };

  const filteredData = monitoring.filter(item => {
    const parameterMatch = selectedParameter === 'all' || item.parameter === selectedParameter;
    const dateMatch = !dateRange || (
      dayjs(item.measurement_date).isAfter(dateRange[0]) &&
      dayjs(item.measurement_date).isBefore(dateRange[1])
    );
    return parameterMatch && dateMatch;
  });

  const columns: ColumnsType<EnvironmentalMonitoring> = [
    {
      title: 'Parameter',
      dataIndex: 'parameter',
      key: 'parameter',
      render: (parameter: string) => (
        <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
          {parameter.replace('_', ' ')}
        </span>
      ),
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (value: number, record: EnvironmentalMonitoring) => (
        <span style={{ fontWeight: 'bold' }}>
          {value.toFixed(3)} {record.unit}
        </span>
      ),
    },
    {
      title: 'Regulatory Limit',
      dataIndex: 'regulatory_limit',
      key: 'regulatory_limit',
      render: (limit: number, record: EnvironmentalMonitoring) => (
        limit ? `${limit.toFixed(3)} ${record.unit}` : 'Not Set'
      ),
    },
    {
      title: 'Compliance Status',
      dataIndex: 'compliance_status',
      key: 'compliance_status',
      render: (status: string) => (
        <Tag 
          color={getComplianceColor(status)} 
          icon={getComplianceIcon(status)}
          style={{ fontWeight: 'bold' }}
        >
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Station',
      dataIndex: 'monitoring_station',
      key: 'monitoring_station',
    },
    {
      title: 'Date',
      dataIndex: 'measurement_date',
      key: 'measurement_date',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Method',
      dataIndex: 'measurement_method',
      key: 'measurement_method',
      ellipsis: true,
    },
  ];

  const uniqueParameters = [...new Set(monitoring.map(item => item.parameter))];

  return (
    <PageLayout
      title="Environmental Monitoring"
      subtitle="Real-time environmental parameter monitoring and compliance tracking"
      breadcrumbs={[
        { title: 'ESG Management' },
        { title: 'Environmental Monitoring' }
      ]}
    >
      {/* Compliance Overview */}
      {complianceData && (
        <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={6}>
            <Card className="monitoring-summary-card">
              <Statistic
                title="Overall Compliance"
                value={
                  complianceData.compliance_breakdown?.find((item: any) => item.compliance_status === 'compliant')?.count || 0
                }
                suffix={`/${monitoring.length}`}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a', fontSize: '1.8rem', fontWeight: 'bold' }}
              />
              <Progress 
                percent={monitoring.length > 0 ? 
                  ((complianceData.compliance_breakdown?.find((item: any) => item.compliance_status === 'compliant')?.count || 0) / monitoring.length) * 100 : 0
                } 
                strokeColor="#52c41a" 
                showInfo={false} 
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={6}>
            <Card className="monitoring-summary-card">
              <Statistic
                title="Warning Levels"
                value={
                  complianceData.compliance_breakdown?.find((item: any) => item.compliance_status === 'warning')?.count || 0
                }
                prefix={<WarningOutlined style={{ color: '#faad14' }} />}
                valueStyle={{ color: '#faad14', fontSize: '1.8rem', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={6}>
            <Card className="monitoring-summary-card">
              <Statistic
                title="Limit Exceeded"
                value={
                  complianceData.compliance_breakdown?.find((item: any) => item.compliance_status === 'exceeded')?.count || 0
                }
                prefix={<AlertOutlined style={{ color: '#fa8c16' }} />}
                valueStyle={{ color: '#fa8c16', fontSize: '1.8rem', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={6}>
            <Card className="monitoring-summary-card">
              <Statistic
                title="Critical Levels"
                value={
                  complianceData.compliance_breakdown?.find((item: any) => item.compliance_status === 'critical')?.count || 0
                }
                prefix={<AlertOutlined style={{ color: '#f5222d' }} />}
                valueStyle={{ color: '#f5222d', fontSize: '1.8rem', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Recent Exceedances Alert */}
      {complianceData?.recent_exceedances?.length > 0 && (
        <Alert
          message="Recent Compliance Exceedances Detected"
          description={`${complianceData.recent_exceedances.length} recent measurements have exceeded regulatory limits. Immediate attention required.`}
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
          action={
            <Button size="small" type="primary" ghost>
              View Details
            </Button>
          }
        />
      )}

      {/* Parameter Summary Cards */}
      {complianceData?.parameter_summary && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24}>
            <Card 
              title={
                <span>
                  <LineChartOutlined style={{ marginRight: 8 }} />
                  Parameter Performance Summary
                </span>
              }
              size="small"
            >
              <Row gutter={[16, 16]}>
                {complianceData.parameter_summary.slice(0, 6).map((param: any, index: number) => (
                  <Col xs={24} sm={12} md={8} lg={4} key={index}>
                    <Card size="small" className="parameter-card">
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: 4 }}>
                          {param.parameter.replace('_', ' ').toUpperCase()}
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
                          {param.avg_value?.toFixed(2) || 0}
                        </div>
                        <div style={{ fontSize: '10px', color: '#999' }}>
                          {param.measurement_count} measurements
                        </div>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8}>
            <Select
              placeholder="Select Parameter"
              value={selectedParameter}
              onChange={setSelectedParameter}
              style={{ width: '100%' }}
            >
              <Option value="all">All Parameters</Option>
              {uniqueParameters.map(param => (
                <Option key={param} value={param}>
                  {param.replace('_', ' ').toUpperCase()}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8}>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              style={{ width: '100%' }}
              placeholder={['Start Date', 'End Date']}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Button 
              type="primary" 
              icon={<EnvironmentOutlined />}
              onClick={fetchData}
              loading={loading}
            >
              Refresh Data
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Monitoring Data Table */}
      <Card title="Environmental Monitoring Data">
        <Table
          columns={columns}
          dataSource={filteredData}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} measurements`,
          }}
          rowClassName={(record) => {
            switch (record.compliance_status) {
              case 'critical': return 'critical-row';
              case 'exceeded': return 'exceeded-row';
              case 'warning': return 'warning-row';
              default: return '';
            }
          }}
        />
      </Card>

      <style>{`
        .monitoring-summary-card {
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          transition: transform 0.2s ease;
        }
        .monitoring-summary-card:hover {
          transform: translateY(-2px);
        }
        .parameter-card {
          border-radius: 8px;
          border: 1px solid #f0f0f0;
        }
        .critical-row {
          background-color: #fff2f0;
        }
        .exceeded-row {
          background-color: #fff7e6;
        }
        .warning-row {
          background-color: #fffbe6;
        }
      `}</style>
    </PageLayout>
  );
};

export default EnvironmentalMonitoringDashboard;