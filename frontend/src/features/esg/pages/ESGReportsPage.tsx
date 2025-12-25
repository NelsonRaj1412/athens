import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Select, DatePicker, Table, message, Spin } from 'antd';
import { 
  FileTextOutlined, 
  DownloadOutlined, 
  BarChartOutlined,
  EnvironmentOutlined,
  SafetyOutlined,
  EyeOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import PageLayout from '../../../common/components/PageLayout';
import { generateESGReport, getESGReports, downloadESGReport } from '../services/esgAPI';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface ReportData {
  key: string;
  reportType: string;
  period: string;
  status: string;
  generatedDate: string;
  size: string;
}

const ESGReportsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportType, setReportType] = useState<string>('');
  const [dateRange, setDateRange] = useState<any>(null);
  const [existingReports, setExistingReports] = useState<ReportData[]>([]);

  const reportTypes = [
    { value: 'brsr', label: 'BRSR Report', icon: <FileTextOutlined /> },
    { value: 'ghg', label: 'GHG Inventory', icon: <EnvironmentOutlined /> },
    { value: 'environmental', label: 'Environmental Report', icon: <EnvironmentOutlined /> },
    { value: 'safety', label: 'Safety Performance', icon: <SafetyOutlined /> },
    { value: 'sustainability', label: 'Sustainability Report', icon: <BarChartOutlined /> }
  ];

  useEffect(() => {
    fetchExistingReports();
  }, []);

  const fetchExistingReports = async () => {
    try {
      setReportsLoading(true);
      const response = await getESGReports();
      let reports = response.data.map((report: any, index: number) => ({
        key: report.id?.toString() || index.toString(),
        reportType: report.report_type,
        period: report.period,
        status: report.status,
        generatedDate: report.generated_date,
        size: report.size
      }));
      
      // Add mock data if no reports exist (for testing)
      if (reports.length === 0) {
        reports = [
          {
            key: '1',
            reportType: 'BRSR Report',
            period: '2024 Q4',
            status: 'Generated',
            generatedDate: '2024-12-15',
            size: '2.3 MB'
          },
          {
            key: '2',
            reportType: 'Environmental Report',
            period: '2024 Q4',
            status: 'Generated',
            generatedDate: '2024-12-10',
            size: '1.8 MB'
          },
          {
            key: '3',
            reportType: 'GHG Inventory',
            period: '2024 Q4',
            status: 'In Progress',
            generatedDate: '2024-12-20',
            size: '1.2 MB'
          }
        ];
      }
      
      setExistingReports(reports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      // Fallback to mock data on error
      const mockReports = [
        {
          key: '1',
          reportType: 'BRSR Report',
          period: '2024 Q4',
          status: 'Generated',
          generatedDate: '2024-12-15',
          size: '2.3 MB'
        },
        {
          key: '2',
          reportType: 'Environmental Report',
          period: '2024 Q4',
          status: 'Generated',
          generatedDate: '2024-12-10',
          size: '1.8 MB'
        },
        {
          key: '3',
          reportType: 'GHG Inventory',
          period: '2024 Q4',
          status: 'In Progress',
          generatedDate: '2024-12-20',
          size: '1.2 MB'
        }
      ];
      setExistingReports(mockReports);
      message.warning('Using sample data - API connection failed');
    } finally {
      setReportsLoading(false);
    }
  };

  const columns: ColumnsType<ReportData> = [
    {
      title: 'Report Type',
      dataIndex: 'reportType',
      key: 'reportType',
    },
    {
      title: 'Period',
      dataIndex: 'period',
      key: 'period',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <span style={{ 
          color: status === 'Generated' ? '#52c41a' : 
                 status === 'In Progress' ? '#faad14' : '#ff4d4f'
        }}>
          {status}
        </span>
      ),
    },
    {
      title: 'Generated Date',
      dataIndex: 'generatedDate',
      key: 'generatedDate',
    },
    {
      title: 'Size',
      dataIndex: 'size',
      key: 'size',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record) => (
        <div>
          {record.status === 'Generated' && (
            <Button 
              type="link" 
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(record)}
            >
              Download
            </Button>
          )}
          <Button 
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewReport(record)}
          >
            View
          </Button>
        </div>
      ),
    },
  ];

  const handleGenerateReport = async () => {
    if (!reportType) {
      message.error('Please select a report type');
      return;
    }

    if (!dateRange) {
      message.error('Please select a date range');
      return;
    }

    setLoading(true);
    
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');
      
      console.log('Generating report:', { reportType, startDate, endDate });
      
      const response = await generateESGReport(reportType, startDate, endDate);
      
      console.log('Report generation response:', response.data);
      
      message.success(`${reportTypes.find(r => r.value === reportType)?.label} generation started. ${response.data.message}`);
      
      // Reset form and refresh reports list
      setReportType('');
      setDateRange(null);
      fetchExistingReports();
    } catch (error: any) {
      console.error('Error generating report:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      message.error(`Failed to generate report: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (record: ReportData) => {
    try {
      const response = await downloadESGReport(parseInt(record.key));
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${record.reportType.replace(/\s+/g, '_')}_${record.period}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success(`Downloaded ${record.reportType}`);
    } catch (error) {
      console.error('Error downloading report:', error);
      message.error('Failed to download report');
    }
  };

  const handleViewReport = async (record: ReportData) => {
    try {
      if (record.status !== 'Generated') {
        message.warning('Report is not yet generated');
        return;
      }

      // For demo purposes, if it's mock data, show a sample PDF
      if (['1', '2', '3'].includes(record.key)) {
        // Create a simple demo PDF content
        const demoContent = `
          ESG Report - ${record.reportType}
          Period: ${record.period}
          Generated: ${record.generatedDate}
          
          This is a demo report for testing purposes.
          
          Key Metrics:
          - Environmental Score: 94.2%
          - Social Score: 91.8%
          - Governance Score: 96.3%
          
          For actual report data, please ensure the backend API is properly configured.
        `;
        
        // Create a blob with demo content
        const blob = new Blob([demoContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        
        // Open in new tab
        const newWindow = window.open(url, '_blank');
        if (!newWindow) {
          message.error('Please allow popups to view the report');
          window.URL.revokeObjectURL(url);
          return;
        }
        
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 1000);
        
        message.success(`Opened demo ${record.reportType} report`);
        return;
      }

      // Try to get actual report from API
      const response = await downloadESGReport(parseInt(record.key));
      
      // Create blob URL and open in new tab
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Open PDF in new tab
      const newWindow = window.open(url, '_blank');
      if (!newWindow) {
        message.error('Please allow popups to view the report');
        window.URL.revokeObjectURL(url);
        return;
      }
      
      // Clean up the URL after a delay
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
      
      message.success(`Opened ${record.reportType} report`);
    } catch (error) {
      console.error('Error viewing report:', error);
      message.error('Failed to view report. Please check if the report file exists.');
    }
  };

  return (
    <PageLayout
      title="ESG Reports"
      subtitle="Generate and manage ESG compliance reports"
      breadcrumbs={[
        { title: 'ESG Management' },
        { title: 'Reports' }
      ]}
    >
      <Row gutter={[16, 16]}>
        {/* Report Generation Section */}
        <Col xs={24} lg={8}>
          <Card 
            title={
              <span>
                <FileTextOutlined style={{ marginRight: 8 }} />
                Generate ESG Report
              </span>
            }
          >
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Report Type
              </label>
              <Select
                style={{ width: '100%' }}
                placeholder="Select report type"
                value={reportType}
                onChange={setReportType}
              >
                {reportTypes.map(type => (
                  <Option key={type.value} value={type.value}>
                    <span style={{ marginRight: 8 }}>{type.icon}</span>
                    {type.label}
                  </Option>
                ))}
              </Select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Date Range
              </label>
              <RangePicker
                style={{ width: '100%' }}
                value={dateRange}
                onChange={setDateRange}
                format="YYYY-MM-DD"
              />
            </div>

            <Button 
              type="primary" 
              block
              loading={loading}
              onClick={handleGenerateReport}
              icon={<BarChartOutlined />}
            >
              Generate Report
            </Button>

            <div style={{ marginTop: 16, fontSize: '12px', color: '#666' }}>
              <p>Report generation may take several minutes depending on the data range and complexity.</p>
            </div>
          </Card>
        </Col>

        {/* Quick Actions */}
        <Col xs={24} lg={16}>
          <Card title="Quick Actions">
            <Row gutter={[8, 8]}>
              <Col xs={24} sm={12} md={6}>
                <Button 
                  block 
                  onClick={() => {
                    setReportType('brsr');
                    setDateRange([dayjs().subtract(3, 'month'), dayjs()]);
                  }}
                >
                  Generate BRSR
                </Button>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Button 
                  block
                  onClick={() => {
                    setReportType('ghg');
                    setDateRange([dayjs().subtract(1, 'month'), dayjs()]);
                  }}
                >
                  GHG Inventory
                </Button>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Button 
                  block
                  onClick={() => {
                    setReportType('environmental');
                    setDateRange([dayjs().subtract(1, 'month'), dayjs()]);
                  }}
                >
                  Environmental Report
                </Button>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Button 
                  block
                  onClick={() => {
                    setReportType('sustainability');
                    setDateRange([dayjs().subtract(6, 'month'), dayjs()]);
                  }}
                >
                  Sustainability Report
                </Button>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Existing Reports Table */}
        <Col xs={24}>
          <Card 
            title={
              <span>
                <FileTextOutlined style={{ marginRight: 8 }} />
                Generated Reports
              </span>
            }
          >
            <Table
              columns={columns}
              dataSource={existingReports}
              pagination={{ pageSize: 10 }}
              size="middle"
              loading={reportsLoading}
            />
          </Card>
        </Col>
      </Row>
    </PageLayout>
  );
};

export default ESGReportsPage;