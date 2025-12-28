import React, { useState } from 'react';
import { Card, Row, Col, Select, Typography, Statistic, Progress } from 'antd';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  ResponsiveContainer, XAxis, YAxis, Tooltip, Legend 
} from 'recharts';
import { 
  SafetyOutlined, FileTextOutlined, TeamOutlined, 
  ExclamationCircleOutlined, CheckCircleOutlined 
} from '@ant-design/icons';

const { Title } = Typography;
const { Option } = Select;

const ANALYTICS_DATA = {
  permits: [
    { month: 'Jan', approved: 45, pending: 12, rejected: 3 },
    { month: 'Feb', approved: 52, pending: 8, rejected: 2 },
    { month: 'Mar', approved: 38, pending: 15, rejected: 5 },
    { month: 'Apr', approved: 67, pending: 9, rejected: 1 },
    { month: 'May', approved: 71, pending: 11, rejected: 4 },
    { month: 'Jun', approved: 58, pending: 7, rejected: 2 }
  ],
  safety: [
    { month: 'Jan', observations: 23, incidents: 5, resolved: 20 },
    { month: 'Feb', observations: 18, incidents: 3, resolved: 16 },
    { month: 'Mar', observations: 25, incidents: 7, resolved: 22 },
    { month: 'Apr', observations: 31, incidents: 4, resolved: 28 },
    { month: 'May', observations: 28, incidents: 2, resolved: 26 },
    { month: 'Jun', observations: 35, incidents: 6, resolved: 32 }
  ],
  departments: [
    { name: 'Construction', value: 35, color: '#8884d8' },
    { name: 'Maintenance', value: 25, color: '#82ca9d' },
    { name: 'Operations', value: 20, color: '#ffc658' },
    { name: 'Quality', value: 12, color: '#ff7300' },
    { name: 'Safety', value: 8, color: '#00ff00' }
  ]
};

const AnalyticsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState('6months');

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <Title level={2}>Analytics Dashboard</Title>
        <Select value={timeRange} onChange={setTimeRange} style={{ width: 150 }}>
          <Option value="3months">Last 3 Months</Option>
          <Option value="6months">Last 6 Months</Option>
          <Option value="1year">Last Year</Option>
        </Select>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Permits"
              value={1247}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Safety Observations"
              value={856}
              prefix={<SafetyOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Workers"
              value={2340}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Compliance Rate"
              value={94.2}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Permit Trends">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ANALYTICS_DATA.permits}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="approved" fill="#52c41a" name="Approved" />
                <Bar dataKey="pending" fill="#faad14" name="Pending" />
                <Bar dataKey="rejected" fill="#ff4d4f" name="Rejected" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Safety Performance">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={ANALYTICS_DATA.safety}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="observations" stroke="#1890ff" name="Observations" />
                <Line type="monotone" dataKey="incidents" stroke="#ff4d4f" name="Incidents" />
                <Line type="monotone" dataKey="resolved" stroke="#52c41a" name="Resolved" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Department Distribution">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ANALYTICS_DATA.departments}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {ANALYTICS_DATA.departments.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Performance Metrics">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span>Safety Score</span>
                  <span>94%</span>
                </div>
                <Progress percent={94} strokeColor="#52c41a" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span>Permit Efficiency</span>
                  <span>87%</span>
                </div>
                <Progress percent={87} strokeColor="#1890ff" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span>Training Completion</span>
                  <span>91%</span>
                </div>
                <Progress percent={91} strokeColor="#722ed1" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span>Incident Resolution</span>
                  <span>96%</span>
                </div>
                <Progress percent={96} strokeColor="#faad14" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AnalyticsPage;