// src/features/dashboard/components/DashboardOverview.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Typography, Select, List, Progress, Space, Divider, Tag, Button, Avatar, Spin, Alert, Row, Col, Statistic } from 'antd';
import {
  FileTextOutlined,
  SafetyOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MoreOutlined,
  PlusOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  FireOutlined,
  SecurityScanOutlined,
  UserOutlined,
  CalendarOutlined,
  BarChartOutlined,
  AlertOutlined
} from '@ant-design/icons';
import {
  LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart,
  PieChart, Pie, Cell, BarChart, Bar, ComposedChart, RadialBarChart, RadialBar
} from 'recharts';
import { useTheme } from '@common/contexts/ThemeContext';
import useAuthStore from '@common/store/authStore';
import api from '@common/utils/axiosetup';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// Comprehensive Mock Data for Client Presentation
const MOCK_DASHBOARD_DATA = {
  period: 'week',
  date_range: {
    start: '2025-01-01',
    end: '2025-01-07'
  },
  statistics: {
    permits: {
      total: 1247,
      this_period: 89,
      change_percentage: 12.5,
      pending_approvals: 23,
      approved_today: 8,
      expired_this_week: 3
    },
    safety_observations: {
      total: 856,
      this_period: 67,
      change_percentage: 8.3,
      critical: 12,
      resolved: 789
    },
    workers: {
      total: 2340,
      active: 2156,
      this_period: 45,
      change_percentage: 3.2,
      on_leave: 89,
      new_joiners: 23
    },
    pending_approvals: {
      total: 34,
      permits: 23,
      incidents: 11,
      urgent: 8
    },
    attendance: {
      today: 92.5,
      yesterday: 89.3,
      weekly_avg: 91.2,
      present_count: 2156,
      absent_count: 184
    },
    incidents: {
      total: 127,
      this_period: 8,
      change_percentage: -15.2,
      severity_breakdown: {
        critical: 2,
        high: 12,
        medium: 45,
        low: 68
      },
      resolved: 98,
      under_investigation: 15
    },
    compliance: {
      score: 94.2,
      audits_completed: 156,
      non_conformities: 23,
      corrective_actions: 45,
      overdue_actions: 3
    },
    training: {
      completed_sessions: 234,
      pending_sessions: 45,
      certified_workers: 1890,
      expiring_certificates: 67
    },
    environmental: {
      waste_generated: 45.6, // tons
      water_consumption: 12340, // liters
      energy_consumption: 8900, // kWh
      carbon_footprint: 234.5 // tons CO2
    }
  },
  charts: {
    permit_status: [
      { status: 'approved', count: 456, color: '#22c55e' },
      { status: 'pending_approval', count: 234, color: '#f59e0b' },
      { status: 'pending_verification', count: 189, color: '#3b82f6' },
      { status: 'rejected', count: 67, color: '#ef4444' },
      { status: 'draft', count: 123, color: '#6b7280' },
      { status: 'expired', count: 45, color: '#dc2626' }
    ],
    safety_trend: [
      { name: 'Mon', value: 45, incidents: 2, near_miss: 8, date: '2025-01-01' },
      { name: 'Tue', value: 52, incidents: 1, near_miss: 12, date: '2025-01-02' },
      { name: 'Wed', value: 38, incidents: 3, near_miss: 6, date: '2025-01-03' },
      { name: 'Thu', value: 67, incidents: 0, near_miss: 15, date: '2025-01-04' },
      { name: 'Fri', value: 71, incidents: 2, near_miss: 18, date: '2025-01-05' },
      { name: 'Sat', value: 29, incidents: 0, near_miss: 4, date: '2025-01-06' },
      { name: 'Sun', value: 34, incidents: 0, near_miss: 7, date: '2025-01-07' }
    ],
    incident_trend: [
      { name: 'Jan', incidents: 23, near_miss: 45, observations: 156, resolved: 20 },
      { name: 'Feb', incidents: 18, near_miss: 52, observations: 189, resolved: 16 },
      { name: 'Mar', incidents: 15, near_miss: 38, observations: 234, resolved: 14 },
      { name: 'Apr', incidents: 12, near_miss: 41, observations: 267, resolved: 11 },
      { name: 'May', incidents: 8, near_miss: 35, observations: 298, resolved: 7 },
      { name: 'Jun', incidents: 11, near_miss: 29, observations: 312, resolved: 10 }
    ],
    worker_distribution: [
      { department: 'Construction', count: 856, percentage: 36.6, active: 798 },
      { department: 'Maintenance', count: 567, percentage: 24.2, active: 523 },
      { department: 'Operations', count: 423, percentage: 18.1, active: 401 },
      { department: 'Quality', count: 289, percentage: 12.3, active: 267 },
      { department: 'Safety', count: 205, percentage: 8.8, active: 189 }
    ],
    compliance_score: [
      { month: 'Jan', score: 89.2, audits: 12, issues: 8 },
      { month: 'Feb', score: 91.5, audits: 15, issues: 6 },
      { month: 'Mar', score: 93.1, audits: 18, issues: 4 },
      { month: 'Apr', score: 94.8, audits: 20, issues: 3 },
      { month: 'May', score: 92.3, audits: 16, issues: 5 },
      { month: 'Jun', score: 94.2, audits: 22, issues: 4 }
    ],
    attendance_trend: [
      { date: '2025-01-01', percentage: 89.5, present: 2089, absent: 251 },
      { date: '2025-01-02', percentage: 91.2, present: 2134, absent: 206 },
      { date: '2025-01-03', percentage: 88.7, present: 2075, absent: 265 },
      { date: '2025-01-04', percentage: 93.1, present: 2179, absent: 161 },
      { date: '2025-01-05', percentage: 90.8, present: 2125, absent: 215 },
      { date: '2025-01-06', percentage: 87.3, present: 2043, absent: 297 },
      { date: '2025-01-07', percentage: 92.5, present: 2165, absent: 175 }
    ],
    training_progress: [
      { category: 'Safety Training', completed: 89, total: 100, percentage: 89 },
      { category: 'Technical Skills', completed: 76, total: 95, percentage: 80 },
      { category: 'Compliance', completed: 92, total: 100, percentage: 92 },
      { category: 'Emergency Response', completed: 67, total: 85, percentage: 79 },
      { category: 'Environmental', completed: 54, total: 70, percentage: 77 }
    ],
    environmental_metrics: [
      { metric: 'Energy', current: 8900, target: 8500, unit: 'kWh', status: 'warning' },
      { metric: 'Water', current: 12340, target: 12000, unit: 'L', status: 'warning' },
      { metric: 'Waste', current: 45.6, target: 50, unit: 'tons', status: 'good' },
      { metric: 'CO2', current: 234.5, target: 220, unit: 'tons', status: 'warning' }
    ]
  },
  recent_activity: [
    {
      id: 1,
      title: 'Hot Work Permit #HW-2025-001 Approved',
      type: 'Approval',
      module: 'PTW',
      timestamp: '2025-01-07T10:30:00Z',
      priority: 'high',
      user: 'John Smith'
    },
    {
      id: 2,
      title: 'Safety Observation: Unsafe Scaffolding',
      type: 'Observation',
      module: 'Safety',
      timestamp: '2025-01-07T09:15:00Z',
      priority: 'medium',
      user: 'Sarah Johnson'
    },
    {
      id: 3,
      title: 'Incident Report: Minor Slip & Fall',
      type: 'Incident',
      module: 'Incident',
      timestamp: '2025-01-07T08:45:00Z',
      priority: 'high',
      user: 'Mike Wilson'
    },
    {
      id: 4,
      title: 'Worker Training Completed: 25 Personnel',
      type: 'Training',
      module: 'Training',
      timestamp: '2025-01-06T16:20:00Z',
      priority: 'low',
      user: 'Training Dept'
    },
    {
      id: 5,
      title: 'Confined Space Entry Permit Expired',
      type: 'Expiry',
      module: 'PTW',
      timestamp: '2025-01-06T14:00:00Z',
      priority: 'medium',
      user: 'System'
    },
    {
      id: 6,
      title: 'Environmental Audit Completed',
      type: 'Audit',
      module: 'ESG',
      timestamp: '2025-01-06T11:30:00Z',
      priority: 'low',
      user: 'ESG Team'
    },
    {
      id: 7,
      title: 'Emergency Drill Conducted',
      type: 'Drill',
      module: 'Safety',
      timestamp: '2025-01-06T09:00:00Z',
      priority: 'medium',
      user: 'Safety Officer'
    },
    {
      id: 8,
      title: 'New Worker Onboarding: 5 Personnel',
      type: 'Onboarding',
      module: 'HR',
      timestamp: '2025-01-05T14:15:00Z',
      priority: 'low',
      user: 'HR Department'
    }
  ],
  alerts: [
    {
      id: 1,
      type: 'warning',
      title: 'Permits Expiring Soon',
      message: '3 permits require renewal within 24 hours',
      timestamp: '2025-01-07T10:00:00Z'
    },
    {
      id: 2,
      type: 'warning',
      title: 'High Incident Rate',
      message: 'Construction department has 15% increase in incidents',
      timestamp: '2025-01-07T08:30:00Z'
    },
    {
      id: 3,
      type: 'info',
      title: 'Training Reminder',
      message: '67 workers have certificates expiring this month',
      timestamp: '2025-01-07T07:00:00Z'
    }
  ],
  kpis: [
    { name: 'Safety Score', value: 94.2, target: 95, unit: '%', trend: 'up' },
    { name: 'Compliance Rate', value: 91.8, target: 90, unit: '%', trend: 'up' },
    { name: 'Training Completion', value: 87.5, target: 85, unit: '%', trend: 'up' },
    { name: 'Incident Rate', value: 2.1, target: 2.5, unit: 'per 1000', trend: 'down' }
  ]
};

// Interfaces for dashboard data
interface DashboardStatistics {
  permits: {
    total: number;
    this_period: number;
    change_percentage: number;
    pending_approvals: number;
  };
  safety_observations: {
    total: number;
    this_period: number;
    change_percentage: number;
  };
  workers: {
    total: number;
    active: number;
    this_period: number;
    change_percentage: number;
  };
  pending_approvals: {
    total: number;
    permits: number;
    incidents: number;
  };
  attendance: {
    today: number;
  };
  incidents?: {
    total: number;
    this_period: number;
    change_percentage: number;
    severity_breakdown: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  compliance?: {
    score: number;
    audits_completed: number;
    non_conformities: number;
  };
}

interface ChartData {
  permit_status: Array<{ status: string; count: number }>;
  safety_trend: Array<{ name: string; value: number; date: string }>;
  incident_trend?: Array<{ name: string; incidents: number; near_miss: number; observations: number }>;
  worker_distribution?: Array<{ department: string; count: number; percentage: number }>;
  compliance_score?: Array<{ month: string; score: number }>;
}

interface RecentActivity {
  title: string;
  type: string;
  module: string;
  timestamp: string;
  id: number;
  priority?: string;
}

interface DashboardData {
  period: string;
  date_range: {
    start: string;
    end: string;
  };
  statistics: DashboardStatistics;
  charts: ChartData;
  recent_activity: RecentActivity[];
}

// Status color mapping
const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    'approved': '#22c55e',
    'pending_approval': '#f59e0b',
    'pending_verification': '#f59e0b',
    'rejected': '#ef4444',
    'draft': '#3b82f6',
    'completed': '#10b981',
    'cancelled': '#6b7280',
    'expired': '#ef4444'
  };
  return colorMap[status] || '#6b7280';
};

// Module icon mapping
const getModuleIcon = (module: string) => {
  switch (module) {
    case 'PTW': return <FileTextOutlined />;
    case 'Safety': return <SafetyOutlined />;
    case 'Incident': return <ExclamationCircleOutlined />;
    case 'Training': return <UserOutlined />;
    case 'ESG': return <SecurityScanOutlined />;
    case 'HR': return <TeamOutlined />;
    default: return <FileTextOutlined />;
  }
};

// Reusable component for the custom tooltip seen in the video
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg bg-color-ui-base p-2 px-3 shadow-lg border border-color-border">
        <p className="text-sm text-color-text-muted">{`Date: ${label}`}</p>
        <p className="text-sm font-bold text-color-text-base">{`Value: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

// --- MAIN COMPONENT ---
const DashboardOverview: React.FC = () => {
  const { effectiveTheme } = useTheme();
  const navigate = useNavigate();
  const { usertype, django_user_type, department } = useAuthStore();
  const [timeRange, setTimeRange] = useState('week');
  const [dashboardData, setDashboardData] = useState<DashboardData>(MOCK_DASHBOARD_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inductionStatus, setInductionStatus] = useState<{
    hasCompleted: boolean;
    isEPCSafety: boolean;
    isMasterAdmin: boolean;
  } | null>(null);

  // Check induction status on component mount
  useEffect(() => {
    const checkInductionStatus = async () => {
      try {
        const response = await api.get('/authentication/induction-status/');
        setInductionStatus(response.data);
      } catch (error) {
        console.error('Failed to check induction status:', error);
      }
    };
    
    checkInductionStatus();
  }, []);

  // Check if user needs induction training
  const needsInductionTraining = inductionStatus && 
    !inductionStatus.hasCompleted && 
    !inductionStatus.isEPCSafety && 
    !inductionStatus.isMasterAdmin;

  // Check if user is EPC Safety (restricted to induction training only)
  const isEPCSafetyUser = inductionStatus?.isEPCSafety;

  // Handle time range change with mock data simulation
  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
    // Simulate data change based on time range
    const updatedData = { ...MOCK_DASHBOARD_DATA };
    if (value === 'month') {
      updatedData.statistics.permits.total = 4567;
      updatedData.statistics.permits.this_period = 234;
      updatedData.statistics.safety_observations.total = 2890;
      updatedData.statistics.workers.active = 2340;
    } else if (value === 'year') {
      updatedData.statistics.permits.total = 15678;
      updatedData.statistics.permits.this_period = 1234;
      updatedData.statistics.safety_observations.total = 8945;
      updatedData.statistics.workers.active = 2456;
    }
    setDashboardData(updatedData);
  };

  // Show loading state (minimal for presentation)
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96" style={{ paddingTop: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  // Prepare chart data
  const safetyTrendData = dashboardData.charts.safety_trend.map(item => ({
    name: item.name,
    value: item.value,
    pv: item.value, // For compatibility with existing chart
    uv: item.value * 1.2, // Add some variation
    amt: item.value
  }));

  const permitStatusData = dashboardData.charts.permit_status.map(item => ({
    name: item.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: item.count,
    color: getStatusColor(item.status)
  }));

  return (
    <div className="space-y-6" style={{ paddingTop: 80 }}>
      {/* Induction Training Requirement Banner */}
      {needsInductionTraining && (
        <Alert
          message="Induction Training Required"
          description={
            <div className="space-y-3">
              <p className="text-red-800 font-medium">You must complete induction training before accessing any operational modules. Please contact the EPC Safety Department to schedule your induction training session.</p>
              <div className="flex items-center gap-2 bg-red-100 p-2 rounded">
                <WarningOutlined className="text-red-600" />
                <Text strong className="text-red-800">All system features are restricted until training completion.</Text>
              </div>
            </div>
          }
          type="error"
          showIcon
          banner
          className="mb-6 border-l-4 border-l-red-600 bg-red-50 border-red-200"
          style={{
            backgroundColor: '#fef2f2',
            borderColor: '#fecaca',
            color: '#991b1b'
          }}
        />
      )}



      {/* Header section */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <Title level={3} className="!mb-0 !text-color-text-base">Dashboard Overview</Title>
        <Select value={timeRange} onChange={handleTimeRangeChange} size="large">
          <Option value="week">This Week</Option>
          <Option value="month">This Month</Option>
          <Option value="year">This Year</Option>
        </Select>
      </div>

      {/* Modern Alert Banner */}
      {dashboardData.alerts && dashboardData.alerts.length > 0 && (
        <Card className="mb-6 border-l-4 border-l-orange-400 bg-gradient-to-r from-orange-50 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-full">
                <ClockCircleOutlined className="text-orange-600 text-lg" />
              </div>
              <div>
                <Title level={5} className="!mb-1 !text-orange-800">
                  {dashboardData.alerts[0].title}
                </Title>
                <Text className="text-orange-700">
                  {dashboardData.alerts[0].message}
                </Text>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                type="primary" 
                size="small" 
                className="bg-orange-500 border-orange-500"
                onClick={() => navigate('/dashboard/alerts')}
              >
                View All Alerts
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* KPI Cards Row */}
      <Row gutter={[16, 16]} className="mb-6">
        {dashboardData.kpis.map((kpi, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card className="text-center">
              <Statistic
                title={kpi.name}
                value={kpi.value}
                suffix={kpi.unit}
                valueStyle={{ color: kpi.trend === 'up' ? '#3f8600' : kpi.trend === 'down' ? '#cf1322' : '#1890ff' }}
                prefix={kpi.trend === 'up' ? <ArrowUpOutlined /> : kpi.trend === 'down' ? <ArrowDownOutlined /> : <RiseOutlined />}
              />
              <Text className="text-xs text-color-text-muted">Target: {kpi.target}{kpi.unit}</Text>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Left Column (3/4 width) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Top Stat Cards - 2 cards per row */}
          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} sm={12}>
              <Card className="hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <Text className="text-color-text-muted">Total Permits</Text>
                      <Title level={2} className="!text-color-text-base !mt-2 !mb-0">
                        {dashboardData.statistics.permits.total.toLocaleString()}
                      </Title>
                      <Text className="text-xs text-color-text-muted">
                        {dashboardData.statistics.permits.this_period} new this {timeRange}
                      </Text>
                    </div>
                    <div className="text-right">
                      <FileTextOutlined className="text-2xl text-blue-500 mb-2" />
                      <Tag
                        color={dashboardData.statistics.permits.change_percentage >= 0 ? "success" : "error"}
                        icon={dashboardData.statistics.permits.change_percentage >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                        className="font-semibold"
                      >
                        {Math.abs(dashboardData.statistics.permits.change_percentage)}%
                      </Tag>
                    </div>
                  </div>
              </Card>
            </Col>
            
            <Col xs={24} sm={12}>
              <Card className="hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <Text className="text-color-text-muted">Safety Observations</Text>
                      <Title level={2} className="!text-color-text-base !mt-2 !mb-0">
                        {dashboardData.statistics.safety_observations.total.toLocaleString()}
                      </Title>
                      <Text className="text-xs text-color-text-muted">
                        {dashboardData.statistics.safety_observations.critical} critical
                      </Text>
                    </div>
                    <div className="text-right">
                      <SafetyOutlined className="text-2xl text-orange-500 mb-2" />
                      <Tag
                        color={dashboardData.statistics.safety_observations.change_percentage >= 0 ? "success" : "error"}
                        icon={dashboardData.statistics.safety_observations.change_percentage >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                        className="font-semibold"
                      >
                        {Math.abs(dashboardData.statistics.safety_observations.change_percentage)}%
                      </Tag>
                    </div>
                  </div>
              </Card>
            </Col>
            
            <Col xs={24} sm={12}>
              <Card className="hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <Text className="text-color-text-muted">Active Workers</Text>
                      <Title level={2} className="!text-color-text-base !mt-2 !mb-0">
                        {dashboardData.statistics.workers.active.toLocaleString()}
                      </Title>
                      <Text className="text-xs text-color-text-muted">
                        {dashboardData.statistics.workers.on_leave} on leave
                      </Text>
                    </div>
                    <div className="text-right">
                      <TeamOutlined className="text-2xl text-green-500 mb-2" />
                      <Tag
                        color={dashboardData.statistics.workers.change_percentage >= 0 ? "success" : "error"}
                        icon={dashboardData.statistics.workers.change_percentage >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                        className="font-semibold"
                      >
                        {Math.abs(dashboardData.statistics.workers.change_percentage)}%
                      </Tag>
                    </div>
                  </div>
              </Card>
            </Col>
            
            <Col xs={24} sm={12}>
              <Card className="hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <Text className="text-color-text-muted">Attendance Today</Text>
                      <Title level={2} className="!text-color-text-base !mt-2 !mb-0">
                        {dashboardData.statistics.attendance.today}%
                      </Title>
                      <Text className="text-xs text-color-text-muted">
                        {dashboardData.statistics.attendance.present_count} present
                      </Text>
                    </div>
                    <div className="text-right">
                      <UserOutlined className="text-2xl text-purple-500 mb-2" />
                      <Progress 
                        type="circle" 
                        percent={dashboardData.statistics.attendance.today} 
                        size={40}
                        strokeColor="#722ed1"
                      />
                    </div>
                  </div>
              </Card>
            </Col>
          </Row>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Safety Trend Chart */}
            <Card className="card-glow">
              <div className="flex justify-between items-center mb-4">
                <Title level={5} className="!mb-0 !text-color-text-base">Safety Observations Trend</Title>
                <Tag icon={<RiseOutlined />} color="blue">Weekly View</Tag>
              </div>
              <div style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={safetyTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="var(--color-text-muted)" tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--color-text-muted)" tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--color-primary)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                        <Area type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorUv)" />
                    </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Incident Trend Chart */}
            <Card>
              <Title level={5} className="!mb-4 !text-color-text-base">Incident Analysis</Title>
              <div style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dashboardData.charts.incident_trend}>
                    <XAxis dataKey="name" stroke="var(--color-text-muted)" />
                    <YAxis stroke="var(--color-text-muted)" />
                    <Tooltip />
                    <Bar dataKey="incidents" fill="#ef4444" name="Incidents" />
                    <Bar dataKey="near_miss" fill="#f59e0b" name="Near Miss" />
                    <Line type="monotone" dataKey="resolved" stroke="#22c55e" strokeWidth={2} name="Resolved" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Department Performance */}
          <Card>
            <Title level={5} className="!mb-4 !text-color-text-base">Department Performance</Title>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Text strong>Worker Distribution</Text>
                <div className="mt-4 space-y-3">
                  {dashboardData.charts.worker_distribution.map((dept, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <Text>{dept.department}</Text>
                      <div className="flex items-center gap-2">
                        <Progress percent={dept.percentage} size="small" className="w-20" />
                        <Text className="text-xs">{dept.count}</Text>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Text strong>Training Progress</Text>
                <div className="mt-4 space-y-3">
                  {dashboardData.charts.training_progress.map((training, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <Text className="text-sm">{training.category}</Text>
                      <div className="flex items-center gap-2">
                        <Progress 
                          percent={training.percentage} 
                          size="small" 
                          className="w-20"
                          strokeColor={training.percentage >= 90 ? '#52c41a' : training.percentage >= 70 ? '#faad14' : '#ff4d4f'}
                        />
                        <Text className="text-xs">{training.completed}/{training.total}</Text>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column (1/4 width) */}
        <div className="lg:col-span-1 space-y-6">
            {/* Permit Status Pie Chart */}
            <Card>
                <Title level={5} className="!mb-4 !text-color-text-base">Permit Status</Title>
                <div style={{ height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={permitStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" paddingAngle={3}>
                                {permitStatusData.map((entry) => <Cell key={`cell-${entry.name}`} fill={entry.color} stroke="none" />)}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: 'var(--color-ui-base)', borderColor: 'var(--color-border)' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-1 gap-2 mt-4">
                    {permitStatusData.slice(0, 4).map(item => (
                        <div key={item.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                <Text className="text-color-text-muted text-xs">{item.name}</Text>
                            </div>
                            <Text className="text-xs font-semibold">{item.value}</Text>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Environmental Metrics */}
            <Card>
                <Title level={5} className="!mb-4 !text-color-text-base">Environmental KPIs</Title>
                <div className="space-y-4">
                    {dashboardData.charts.environmental_metrics.map((metric, index) => (
                        <div key={index} className="flex items-center justify-between">
                            <div>
                                <Text className="text-sm font-medium">{metric.metric}</Text>
                                <div className="flex items-center gap-2">
                                    <Text className="text-xs text-color-text-muted">
                                        {metric.current} {metric.unit}
                                    </Text>
                                    <Tag 
                                        color={metric.status === 'good' ? 'green' : 'orange'} 
                                        size="small"
                                    >
                                        {metric.status === 'good' ? 'On Track' : 'Monitor'}
                                    </Tag>
                                </div>
                            </div>
                            <Progress 
                                type="circle" 
                                percent={Math.round((metric.current / metric.target) * 100)} 
                                size={40}
                                strokeColor={metric.status === 'good' ? '#52c41a' : '#faad14'}
                            />
                        </div>
                    ))}
                </div>
            </Card>

            {/* Quick Actions */}
            <Card>
                <Title level={5} className="!mb-4 !text-color-text-base">Quick Actions</Title>
                <div className="space-y-3">
                    {/* Show restricted message for users who need induction training */}
                    {needsInductionTraining ? (
                      <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <ExclamationCircleOutlined className="text-2xl text-orange-500 mb-2" />
                        <Text className="block text-sm text-orange-700 mb-2">Actions Restricted</Text>
                        <Text className="text-xs text-orange-600">Complete induction training to access system features</Text>
                      </div>
                    ) : isEPCSafetyUser ? (
                      <Button 
                        type="primary" 
                        block 
                        icon={<UserOutlined />}
                        onClick={() => navigate('/dashboard/inductiontraining')}
                      >
                        Induction Training
                      </Button>
                    ) : (
                      <>
                        <Button 
                            type="primary" 
                            block 
                            icon={<PlusOutlined />}
                            onClick={() => navigate('/dashboard/ptw/create')}
                        >
                            New Permit
                        </Button>
                        <Button 
                            block 
                            icon={<SafetyOutlined />}
                            onClick={() => navigate('/dashboard/safetyobservation/form')}
                        >
                            Safety Report
                        </Button>
                        <Button 
                            block 
                            icon={<AlertOutlined />}
                            onClick={() => navigate('/dashboard/incidentmanagement/create')}
                        >
                            Incident Report
                        </Button>
                        <Button 
                            block 
                            icon={<BarChartOutlined />}
                            onClick={() => navigate('/dashboard/analytics')}
                        >
                            View Analytics
                        </Button>
                      </>
                    )}
                </div>
            </Card>

            {/* Recent Activity List */}
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <Title level={5} className="!mb-0 !text-color-text-base">Recent Activity</Title>
                    <Button type="text" shape="circle" icon={<MoreOutlined />} />
                </div>
                <List
                    itemLayout="horizontal"
                    dataSource={dashboardData.recent_activity.slice(0, 6)}
                    renderItem={(item) => (
                        <List.Item className="!border-b !border-color-border !px-0 !py-2">
                            <List.Item.Meta
                                avatar={<Avatar size="small" icon={getModuleIcon(item.module)} />}
                                title={<Text className="text-color-text-base text-sm">{item.title}</Text>}
                                description={
                                  <div className="flex items-center gap-1">
                                    <Tag color="blue">{item.type}</Tag>
                                    <Text className="text-xs text-color-text-muted">
                                      {new Date(item.timestamp).toLocaleDateString()}
                                    </Text>
                                  </div>
                                }
                            />
                        </List.Item>
                    )}
                />
            </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;