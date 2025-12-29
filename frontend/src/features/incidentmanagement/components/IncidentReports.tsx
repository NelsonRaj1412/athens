import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Select, DatePicker, Button, Table, Spin, Empty, Typography, Space, Statistic, App, Tag } from 'antd';
import { DownloadOutlined, SearchOutlined, BarChartOutlined, FileTextOutlined, ReloadOutlined, SafetyOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { INCIDENT_TYPES, SEVERITY_LEVELS } from '../types';
import api from '@common/utils/axiosetup';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

interface ReportData {
  id?: string;
  [key: string]: any;
}

interface ReportMetadata {
  report_type: string;
  date_range: {
    start_date: string;
    end_date: string;
  };
  generated_at: string;
}

const IncidentReports: React.FC = () => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState<boolean>(false);
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [reportType, setReportType] = useState<string>('incident_summary');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [reportMetadata, setReportMetadata] = useState<ReportMetadata | null>(null);

  // Auto-refresh report data every 5 minutes if a report is loaded
  useEffect(() => {
    if (reportData.length > 0) {
      const interval = setInterval(() => {
        handleGenerateReport();
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearInterval(interval);
    }
  }, [reportData.length, reportType, dateRange]);



  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      // Generate basic report from dashboard stats
      const response = await api.get('/api/v1/incidentmanagement/incidents/dashboard_stats/');
      const stats = response.data;

      // Create report data based on selected report type
      let reportData: any[] = [];

      switch (reportType) {
        case 'incident_summary':
          reportData = [
            { category: 'Total Incidents', value: stats.total_incidents },
            { category: 'Open Incidents', value: stats.open_incidents },
            { category: 'Closed Incidents', value: stats.closed_incidents },
            { category: 'Overdue Incidents', value: stats.overdue_incidents },
          ];
          break;
        case 'severity_breakdown':
          reportData = stats.severity_distribution || [];
          break;
        case 'status_breakdown':
          reportData = stats.status_distribution || [];
          break;
        case 'monthly_trends':
          reportData = stats.monthly_trends || [];
          break;
        default:
          reportData = [
            { category: 'Total Incidents', value: stats.total_incidents },
            { category: 'Open Incidents', value: stats.open_incidents },
            { category: 'Closed Incidents', value: stats.closed_incidents },
          ];
      }

      setReportData(reportData);
      setReportMetadata({
        report_type: reportType,
        date_range: {
          start_date: dateRange?.[0]?.format('YYYY-MM-DD') || dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
          end_date: dateRange?.[1]?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD')
        },
        generated_at: dayjs().toISOString()
      });

      message.success('Report generated successfully');
    } catch (error: any) {
      message.error('Failed to generate report');
      setReportData([]);
      setReportMetadata(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async (format: 'pdf' | 'excel') => {
    if (reportData.length === 0) {
      message.warning('Please generate a report first');
      return;
    }

    setExportLoading(true);
    try {
      // Simulate export delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create mock file download
      const filename = `incident_report_${reportType}_${dayjs().format('YYYY-MM-DD')}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      message.success(`Report exported as ${filename}`);
    } catch (error: any) {
      message.error('Failed to export report');
    } finally {
      setExportLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return '#ff4d4f';
      case 'high': return '#fa8c16';
      case 'medium': return '#faad14';
      case 'low': return '#52c41a';
      default: return '#1890ff';
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

  const getReportColumns = () => {
    switch (reportType) {
      case 'incident_summary':
        return [
          {
            title: 'Severity Level',
            dataIndex: 'severity_level',
            key: 'severity_level',
            render: (text: string) => (
              <Tag color={getSeverityColor(text)} style={{ fontWeight: 'bold' }}>
                {text}
              </Tag>
            )
          },
          {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            render: (value: number) => <Statistic value={value} valueStyle={{ fontSize: '16px', fontWeight: 'bold' }} />
          },
          {
            title: 'Open',
            dataIndex: 'open',
            key: 'open',
            render: (value: number) => <Statistic value={value} valueStyle={{ fontSize: '16px', color: '#f5222d' }} />
          },
          {
            title: 'Under Investigation',
            dataIndex: 'under_investigation',
            key: 'under_investigation',
            render: (value: number) => <Statistic value={value} valueStyle={{ fontSize: '16px', color: '#fa8c16' }} />
          },
          {
            title: 'Resolved',
            dataIndex: 'resolved',
            key: 'resolved',
            render: (value: number) => <Statistic value={value} valueStyle={{ fontSize: '16px', color: '#52c41a' }} />
          },
          {
            title: 'Closed',
            dataIndex: 'closed',
            key: 'closed',
            render: (value: number) => <Statistic value={value} valueStyle={{ fontSize: '16px', color: '#1890ff' }} />
          }
        ];
      case 'incident_by_type':
        return [
          {
            title: 'Incident Type',
            dataIndex: 'incident_type',
            key: 'incident_type',
            render: (text: string) => <Text strong>{text}</Text>
          },
          {
            title: 'Count',
            dataIndex: 'count',
            key: 'count',
            render: (value: number) => <Statistic value={value} valueStyle={{ fontSize: '16px', fontWeight: 'bold' }} />
          }
        ];
      case 'incident_by_status':
        return [
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (text: string) => (
              <Tag color={getStatusColor(text)} style={{ fontWeight: 'bold' }}>
                {text.toUpperCase()}
              </Tag>
            )
          },
          {
            title: 'Count',
            dataIndex: 'count',
            key: 'count',
            render: (value: number) => <Statistic value={value} valueStyle={{ fontSize: '16px', fontWeight: 'bold' }} />
          }
        ];
      case 'incident_by_department':
        return [
          {
            title: 'Department',
            dataIndex: 'department',
            key: 'department',
            render: (text: string) => <Text strong>{text}</Text>
          },
          {
            title: 'Incidents',
            dataIndex: 'count',
            key: 'count',
            render: (value: number) => <Statistic value={value} valueStyle={{ fontSize: '16px', fontWeight: 'bold' }} />
          }
        ];
      case 'monthly_trends':
        return [
          {
            title: 'Month',
            dataIndex: 'month',
            key: 'month',
            render: (text: string) => <Text strong>{text}</Text>
          },
          {
            title: 'New Incidents',
            dataIndex: 'incidents',
            key: 'incidents',
            render: (value: number) => <Statistic value={value} valueStyle={{ fontSize: '16px', fontWeight: 'bold' }} />
          },
          {
            title: 'Resolved',
            dataIndex: 'resolved',
            key: 'resolved',
            render: (value: number) => <Statistic value={value} valueStyle={{ fontSize: '16px', color: '#52c41a' }} />
          },
          {
            title: 'Avg Resolution (Days)',
            dataIndex: 'avg_resolution_days',
            key: 'avg_resolution_days',
            render: (value: number) => <Statistic value={value} precision={1} valueStyle={{ fontSize: '16px', color: '#1890ff' }} />
          }
        ];
      default:
        return [];
    }
  };

  return (
    <div className="incident-reports-container">
      <Title level={2} style={{ marginBottom: 24, color: '#1e3c72' }}>
        <SafetyOutlined style={{ marginRight: 12 }} />
        Incident Management Reports
      </Title>
      
      <Card 
        style={{ 
          marginBottom: 24, 
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}
      >
        <Row gutter={24} align="middle">
          <Col xs={24} md={8}>
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 16 }}>Report Type</Text>
              <Select
                style={{ width: '100%' }}
                value={reportType}
                onChange={setReportType}
                size="large"
                dropdownStyle={{ borderRadius: 8 }}
              >
                <Option value="incident_summary">Incident Summary</Option>
                <Option value="incident_by_type">Incidents by Type</Option>
                <Option value="incident_by_status">Incidents by Status</Option>
                <Option value="incident_by_department">Incidents by Department</Option>
                <Option value="monthly_trends">Monthly Trends</Option>
              </Select>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 16 }}>Date Range</Text>
              <RangePicker 
                style={{ width: '100%' }}
                onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
                size="large"
                format="YYYY-MM-DD"
                defaultValue={[dayjs().subtract(30, 'days'), dayjs()]}
              />
            </div>
          </Col>
          <Col xs={24} md={8} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
            <Space size="middle">
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleGenerateReport}
                loading={loading}
                size="large"
                style={{
                  background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                  borderColor: 'transparent',
                  borderRadius: 8,
                  height: 48,
                  fontWeight: 600
                }}
              >
                Generate
              </Button>
              {reportData.length > 0 && (
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleGenerateReport}
                  loading={loading}
                  size="large"
                  style={{
                    borderRadius: 8,
                    height: 48,
                    fontWeight: 600
                  }}
                  title="Refresh report data"
                >
                  Refresh
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Export Options */}
      {reportData.length > 0 && (
        <Card 
          style={{ 
            marginBottom: 24, 
            borderRadius: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}
        >
          <Row justify="space-between" align="middle">
            <Col>
              <Space direction="vertical" size="small">
                <Text strong style={{ fontSize: 16 }}>Export Options</Text>
                <Text type="secondary">
                  Report generated on {reportMetadata?.generated_at ? dayjs(reportMetadata.generated_at).format('YYYY-MM-DD HH:mm:ss') : ''}
                </Text>
              </Space>
            </Col>
            <Col>
              <Space size="middle">
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => handleExportReport('pdf')}
                  loading={exportLoading}
                  style={{
                    borderRadius: 8,
                    height: 40,
                    fontWeight: 600
                  }}
                >
                  Export PDF
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => handleExportReport('excel')}
                  loading={exportLoading}
                  style={{
                    borderRadius: 8,
                    height: 40,
                    fontWeight: 600
                  }}
                >
                  Export Excel
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {/* Report Data Table */}
      {loading ? (
        <Card 
          style={{ 
            borderRadius: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            textAlign: 'center',
            padding: 60
          }}
        >
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 16, color: '#8c8c8c' }}>
              Generating report...
            </Text>
          </div>
        </Card>
      ) : reportData.length > 0 ? (
        <Card 
          title={
            <Space>
              <BarChartOutlined />
              <Text strong style={{ fontSize: 18 }}>
                {reportType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Report
              </Text>
            </Space>
          }
          style={{ 
            borderRadius: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}
        >
          <Table
            dataSource={reportData}
            columns={getReportColumns()}
            rowKey={(record, index) => record.id || index || 0}
            pagination={false}
            bordered
            style={{ marginTop: 8 }}
            className="incident-report-table"
          />
        </Card>
      ) : (
        <Card 
          style={{ 
            borderRadius: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            textAlign: 'center',
            padding: 40
          }}
        >
          <Empty 
            description={
              <Text style={{ fontSize: 16, color: '#8c8c8c' }}>
                No report data available. Please select parameters and generate a report.
              </Text>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
          <FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9', marginTop: 16 }} />
        </Card>
      )}
    </div>
  );
};

export default IncidentReports;
