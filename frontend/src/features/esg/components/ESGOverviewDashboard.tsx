import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Progress, Button, Divider, Tag, Alert, Typography, Space, Avatar, List, Tooltip, Badge } from 'antd';
import { 
  EnvironmentOutlined, 
  ThunderboltOutlined, 
  DeleteOutlined,
  BugOutlined,
  RiseOutlined,
  FallOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  TrophyOutlined,
  GlobalOutlined,
  FireOutlined,
  SecurityScanOutlined,
  TeamOutlined,
  BarChartOutlined,
  LineChartOutlined,
  DashboardOutlined,
  SafetyOutlined,
  ReconciliationOutlined,
  ExperimentOutlined,
  CloudOutlined,
  HeartOutlined,
  StarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  WarningOutlined,
  SyncOutlined,
  EyeOutlined,
  SettingOutlined
} from '@ant-design/icons';
import {
  LineChart, Line, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, Area, AreaChart,
  PieChart, Pie, Cell, BarChart, Bar, ComposedChart, RadialBarChart, RadialBar, Legend,
  ScatterChart, Scatter, Treemap, Sankey, FunnelChart, Funnel, LabelList
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@common/contexts/ThemeContext';
import { 
  getEnvironmentAspects, 
  getGenerationData, 
  getWasteManifests, 
  getBiodiversityEvents,
  getComprehensiveESGDashboard,
  getEnvironmentAspectAnalytics,
  getComplianceDashboard,
  getCarbonEmissionsSummary,
  getSustainabilityProgress
} from '../services/esgAPI';

const { Title, Text, Paragraph } = Typography;

// Comprehensive Mock Data for Futuristic ESG Dashboard
const MOCK_ESG_DATA = {
  executive_summary: {
    esg_score: 94.2,
    carbon_footprint_avoided: 2847.6,
    total_carbon_footprint: 1234.5,
    sustainability_progress: 91.8,
    risk_management_score: 96.3,
    compliance_rate: 98.7,
    certification_level: 'Gold'
  },
  environmental: {
    total_aspects: 156,
    high_risk_aspects: 8,
    critical_aspects: 2,
    compliance_rate: 98.7,
    total_generation_kwh: 45678.9,
    renewable_percentage: 87.3,
    total_waste_kg: 12456.7,
    recycling_rate: 89.4,
    water_consumption: 234567,
    water_recycled: 156789,
    co2_avoided_tonnes: 2847.6,
    environmental_incidents: 3,
    open_incidents: 1,
    biodiversity_events: 23,
    critical_biodiversity: 1,
    air_quality_index: 42,
    noise_compliance: 96.8,
    soil_health_score: 88.5
  },
  social: {
    worker_safety_score: 96.4,
    training_completion: 94.7,
    community_engagement: 87.2,
    diversity_index: 78.9,
    grievances_resolved: 98.3,
    local_employment: 67.8,
    health_wellness_score: 91.5,
    human_rights_compliance: 100
  },
  governance: {
    active_policies: 28,
    total_policies: 32,
    board_diversity: 45.6,
    ethics_training: 98.9,
    transparency_score: 92.1,
    audit_completion: 100,
    risk_management: 94.8,
    stakeholder_engagement: 89.3
  },
  sustainability: {
    total_targets: 24,
    on_track_targets: 22,
    achieved_targets: 18,
    avg_progress: 91.8,
    sdg_aligned_targets: 20,
    paris_agreement_aligned: 16,
    net_zero_progress: 73.4,
    circular_economy_score: 82.7
  },
  real_time_metrics: {
    current_energy_generation: 1247.8,
    current_consumption: 987.3,
    grid_efficiency: 94.6,
    carbon_intensity: 0.23,
    water_usage_today: 12456,
    waste_generated_today: 234.5,
    air_quality_now: 'Good',
    noise_level_now: 45.2
  },
  trends: {
    carbon_footprint: [
      { month: 'Jan', value: 1456, target: 1400, reduction: 12.3 },
      { month: 'Feb', value: 1389, target: 1350, reduction: 15.7 },
      { month: 'Mar', value: 1298, target: 1300, reduction: 18.9 },
      { month: 'Apr', value: 1234, target: 1250, reduction: 22.1 },
      { month: 'May', value: 1187, target: 1200, reduction: 25.4 },
      { month: 'Jun', value: 1156, target: 1150, reduction: 27.8 }
    ],
    energy_mix: [
      { source: 'Solar', percentage: 45.6, capacity: 2340, generation: 1876 },
      { source: 'Wind', percentage: 32.1, capacity: 1650, generation: 1298 },
      { source: 'Hydro', percentage: 9.6, capacity: 490, generation: 387 },
      { source: 'Grid', percentage: 12.7, capacity: 650, generation: 512 }
    ],
    waste_streams: [
      { type: 'Recyclable', amount: 5678, percentage: 45.6, trend: 'up' },
      { type: 'Organic', amount: 3456, percentage: 27.8, trend: 'stable' },
      { type: 'Hazardous', amount: 1234, percentage: 9.9, trend: 'down' },
      { type: 'General', amount: 2088, percentage: 16.7, trend: 'down' }
    ],
    biodiversity_index: [
      { species: 'Birds', count: 156, status: 'Stable', trend: 'up' },
      { species: 'Mammals', count: 23, status: 'Increasing', trend: 'up' },
      { species: 'Reptiles', count: 34, status: 'Stable', trend: 'stable' },
      { species: 'Amphibians', count: 12, status: 'Monitoring', trend: 'down' },
      { species: 'Insects', count: 2340, status: 'Thriving', trend: 'up' }
    ]
  },
  certifications: [
    { name: 'ISO 14001', status: 'Active', expiry: '2025-12-31', score: 98.5 },
    { name: 'ISO 45001', status: 'Active', expiry: '2025-08-15', score: 96.7 },
    { name: 'LEED Platinum', status: 'Active', expiry: '2026-03-20', score: 94.2 },
    { name: 'Carbon Neutral', status: 'Pending', expiry: '2024-12-31', score: 87.3 },
    { name: 'B-Corp', status: 'Active', expiry: '2025-06-30', score: 91.8 }
  ],
  alerts: [
    {
      id: 1,
      type: 'warning',
      category: 'Environmental',
      title: 'Water Usage Above Target',
      message: 'Daily water consumption exceeded target by 8.3%',
      timestamp: '2025-01-07T14:30:00Z',
      priority: 'medium'
    },
    {
      id: 2,
      type: 'success',
      category: 'Energy',
      title: 'Renewable Energy Milestone',
      message: 'Achieved 90% renewable energy for the week',
      timestamp: '2025-01-07T10:15:00Z',
      priority: 'low'
    },
    {
      id: 3,
      type: 'info',
      category: 'Compliance',
      title: 'Audit Scheduled',
      message: 'ISO 14001 surveillance audit scheduled for next week',
      timestamp: '2025-01-07T08:00:00Z',
      priority: 'medium'
    }
  ],
  recent_activities: [
    {
      id: 1,
      type: 'Environmental Monitoring',
      description: 'Air quality monitoring completed - All parameters within limits',
      timestamp: '2025-01-07T16:45:00Z',
      status: 'completed',
      impact: 'positive'
    },
    {
      id: 2,
      type: 'Waste Management',
      description: 'Hazardous waste disposal manifest submitted',
      timestamp: '2025-01-07T14:20:00Z',
      status: 'completed',
      impact: 'neutral'
    },
    {
      id: 3,
      type: 'Biodiversity',
      description: 'Rare bird species sighting recorded in protected area',
      timestamp: '2025-01-07T11:30:00Z',
      status: 'monitoring',
      impact: 'positive'
    },
    {
      id: 4,
      type: 'Energy Generation',
      description: 'Solar panel efficiency optimization completed',
      timestamp: '2025-01-07T09:15:00Z',
      status: 'completed',
      impact: 'positive'
    }
  ]
};

const ESGOverviewDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { effectiveTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('month');
  const [data, setData] = useState({
    aspects: [],
    generation: [],
    waste: [],
    biodiversity: []
  });
  
  const [comprehensiveData, setComprehensiveData] = useState<any>(MOCK_ESG_DATA);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  useEffect(() => {
    // Simulate loading for presentation
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.dataKey}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return '#52c41a';
      case 'good': return '#1890ff';
      case 'warning': return '#fa8c16';
      case 'critical': return '#f5222d';
      default: return '#d9d9d9';
    }
  };

  // Get trend icon
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowUpOutlined style={{ color: '#52c41a' }} />;
      case 'down': return <ArrowDownOutlined style={{ color: '#f5222d' }} />;
      default: return <RiseOutlined style={{ color: '#1890ff' }} />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Space direction="vertical" align="center">
          <SyncOutlined spin style={{ fontSize: 48, color: '#1890ff' }} />
          <Text>Loading ESG Performance Center...</Text>
        </Space>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {comprehensiveData.alerts && comprehensiveData.alerts.length > 0 && (
        <Alert
          message={comprehensiveData.alerts[0].title}
          description={comprehensiveData.alerts[0].message}
          type={comprehensiveData.alerts[0].type as any}
          showIcon
          closable
          className="mb-6"
        />
      )}

      {/* Executive Summary - Futuristic Design */}
      <Row gutter={[24, 24]} className="mb-8">
        <Col xs={24}>
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-0 shadow-xl">
            <div className="text-center mb-6">
              <Title level={2} className="!mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                🌍 ESG Performance Center
              </Title>
              <Text className="text-lg text-gray-600">Real-time Environmental, Social & Governance Analytics</Text>
            </div>
            
            <Row gutter={[24, 24]}>
              <Col xs={24} sm={12} lg={6}>
                <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-50 to-emerald-50">
                  <div className="mb-4">
                    <Avatar size={64} className="bg-gradient-to-r from-green-400 to-emerald-500">
                      <TrophyOutlined style={{ fontSize: 28 }} />
                    </Avatar>
                  </div>
                  <Statistic
                    title="ESG Performance Score"
                    value={comprehensiveData.executive_summary.esg_score}
                    suffix="/100"
                    valueStyle={{ 
                      color: '#059669', 
                      fontSize: '2.5rem', 
                      fontWeight: 'bold' 
                    }}
                  />
                  <Progress 
                    percent={comprehensiveData.executive_summary.esg_score} 
                    strokeColor={{ '0%': '#10b981', '100%': '#059669' }}
                    showInfo={false}
                    className="mt-3"
                  />
                  <Tag color="green" className="mt-2">{comprehensiveData.executive_summary.certification_level}</Tag>
                </Card>
              </Col>
              
              <Col xs={24} sm={12} lg={6}>
                <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-cyan-50">
                  <div className="mb-4">
                    <Avatar size={64} className="bg-gradient-to-r from-blue-400 to-cyan-500">
                      <GlobalOutlined style={{ fontSize: 28 }} />
                    </Avatar>
                  </div>
                  <Statistic
                    title="Carbon Avoided"
                    value={comprehensiveData.executive_summary.carbon_footprint_avoided}
                    precision={1}
                    suffix="tCO₂"
                    valueStyle={{ color: '#0891b2', fontSize: '2.5rem', fontWeight: 'bold' }}
                  />
                  <div className="mt-3">
                    <Text className="text-sm text-gray-600">
                      Net Footprint: {comprehensiveData.executive_summary.total_carbon_footprint}tCO₂
                    </Text>
                  </div>
                  <Tag color="blue" className="mt-2">Carbon Neutral Path</Tag>
                </Card>
              </Col>
              
              <Col xs={24} sm={12} lg={6}>
                <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-50 to-pink-50">
                  <div className="mb-4">
                    <Avatar size={64} className="bg-gradient-to-r from-purple-400 to-pink-500">
                      <StarOutlined style={{ fontSize: 28 }} />
                    </Avatar>
                  </div>
                  <Statistic
                    title="Sustainability Progress"
                    value={comprehensiveData.executive_summary.sustainability_progress}
                    precision={1}
                    suffix="%"
                    valueStyle={{ color: '#c026d3', fontSize: '2.5rem', fontWeight: 'bold' }}
                  />
                  <Progress 
                    percent={comprehensiveData.executive_summary.sustainability_progress} 
                    strokeColor={{ '0%': '#d946ef', '100%': '#c026d3' }}
                    showInfo={false}
                    className="mt-3"
                  />
                  <Tag color="purple" className="mt-2">
                    {comprehensiveData.sustainability.on_track_targets}/{comprehensiveData.sustainability.total_targets} On Track
                  </Tag>
                </Card>
              </Col>
              
              <Col xs={24} sm={12} lg={6}>
                <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-orange-50 to-red-50">
                  <div className="mb-4">
                    <Avatar size={64} className="bg-gradient-to-r from-orange-400 to-red-500">
                      <SecurityScanOutlined style={{ fontSize: 28 }} />
                    </Avatar>
                  </div>
                  <Statistic
                    title="Risk Management"
                    value={comprehensiveData.executive_summary.risk_management_score}
                    precision={1}
                    suffix="%"
                    valueStyle={{ color: '#ea580c', fontSize: '2.5rem', fontWeight: 'bold' }}
                  />
                  <div className="mt-3">
                    <Text className="text-sm text-gray-600">
                      {comprehensiveData.environmental.high_risk_aspects}/{comprehensiveData.environmental.total_aspects} High Risk
                    </Text>
                  </div>
                  <Tag color="orange" className="mt-2">Compliance: {comprehensiveData.environmental.compliance_rate}%</Tag>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Real-time Metrics Dashboard */}
      <Row gutter={[24, 24]} className="mb-8">
        <Col xs={24}>
          <Card className="border-0 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <Title level={3} className="!mb-0 flex items-center gap-2">
                <DashboardOutlined className="text-blue-500" />
                Real-time Environmental Metrics
              </Title>
              <Space>
                <Tag color="green" icon={<SyncOutlined spin />}>Live Data</Tag>
                <Button type="primary" icon={<EyeOutlined />}>View Details</Button>
              </Space>
            </div>
            
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" className="text-center bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <ThunderboltOutlined className="text-2xl text-green-500 mb-2" />
                  <Statistic
                    title="Energy Generation"
                    value={comprehensiveData.real_time_metrics.current_energy_generation}
                    suffix="kW"
                    valueStyle={{ color: '#059669', fontSize: '1.5rem' }}
                  />
                  <Progress percent={94.6} size="small" strokeColor="#10b981" showInfo={false} />
                </Card>
              </Col>
              
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" className="text-center bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                  <CloudOutlined className="text-2xl text-blue-500 mb-2" />
                  <Statistic
                    title="Air Quality"
                    value={comprehensiveData.environmental.air_quality_index}
                    suffix="AQI"
                    valueStyle={{ color: '#0891b2', fontSize: '1.5rem' }}
                  />
                  <Tag color="green">{comprehensiveData.real_time_metrics.air_quality_now}</Tag>
                </Card>
              </Col>
              
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" className="text-center bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                  <DeleteOutlined className="text-2xl text-purple-500 mb-2" />
                  <Statistic
                    title="Waste Today"
                    value={comprehensiveData.real_time_metrics.waste_generated_today}
                    suffix="kg"
                    valueStyle={{ color: '#c026d3', fontSize: '1.5rem' }}
                  />
                  <Progress percent={89.4} size="small" strokeColor="#d946ef" showInfo={false} />
                </Card>
              </Col>
              
              <Col xs={12} sm={6} lg={3}>
                <Card size="small" className="text-center bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
                  <SafetyOutlined className="text-2xl text-orange-500 mb-2" />
                  <Statistic
                    title="Noise Level"
                    value={comprehensiveData.real_time_metrics.noise_level_now}
                    suffix="dB"
                    valueStyle={{ color: '#ea580c', fontSize: '1.5rem' }}
                  />
                  <Tag color="green">Within Limits</Tag>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Advanced Analytics Grid */}
      <Row gutter={[24, 24]} className="mb-8">
        {/* Carbon Footprint Trend */}
        <Col xs={24} lg={12}>
          <Card className="border-0 shadow-xl h-full">
            <div className="flex justify-between items-center mb-4">
              <Title level={4} className="!mb-0 flex items-center gap-2">
                <GlobalOutlined className="text-green-500" />
                Carbon Footprint Reduction
              </Title>
              <Tag color="green">-27.8% YTD</Tag>
            </div>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={comprehensiveData.trends.carbon_footprint}>
                  <defs>
                    <linearGradient id="carbonGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fill="url(#carbonGradient)" />
                  <Area type="monotone" dataKey="target" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        {/* Energy Mix */}
        <Col xs={24} lg={12}>
          <Card className="border-0 shadow-xl h-full">
            <div className="flex justify-between items-center mb-4">
              <Title level={4} className="!mb-0 flex items-center gap-2">
                <ThunderboltOutlined className="text-yellow-500" />
                Renewable Energy Mix
              </Title>
              <Tag color="blue">{comprehensiveData.environmental.renewable_percentage}% Renewable</Tag>
            </div>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={comprehensiveData.trends.energy_mix} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={60} 
                    outerRadius={120} 
                    dataKey="percentage"
                    paddingAngle={2}
                  >
                    {comprehensiveData.trends.energy_mix.map((entry: any, index: number) => {
                      const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Comprehensive ESG Modules */}
      <Row gutter={[24, 24]} className="mb-8">
        {/* Environmental Module */}
        <Col xs={24} lg={8}>
          <Card className="border-0 shadow-xl h-full bg-gradient-to-br from-green-50 to-emerald-50">
            <div className="text-center mb-6">
              <Avatar size={64} className="bg-gradient-to-r from-green-400 to-emerald-500 mb-4">
                <EnvironmentOutlined style={{ fontSize: 28 }} />
              </Avatar>
              <Title level={4} className="!mb-2">Environmental</Title>
              <Text className="text-gray-600">Comprehensive environmental impact management</Text>
            </div>
            
            <Space direction="vertical" className="w-full" size="middle">
              <div className="flex justify-between items-center">
                <Text>Environmental Aspects</Text>
                <Badge count={comprehensiveData.environmental.total_aspects} style={{ backgroundColor: '#10b981' }} />
              </div>
              <div className="flex justify-between items-center">
                <Text>High Risk Items</Text>
                <Badge count={comprehensiveData.environmental.high_risk_aspects} style={{ backgroundColor: '#f59e0b' }} />
              </div>
              <div className="flex justify-between items-center">
                <Text>Compliance Rate</Text>
                <Tag color="green">{comprehensiveData.environmental.compliance_rate}%</Tag>
              </div>
              <div className="flex justify-between items-center">
                <Text>Air Quality Index</Text>
                <Tag color="blue">{comprehensiveData.environmental.air_quality_index} AQI</Tag>
              </div>
            </Space>
            
            <Button 
              type="primary" 
              block 
              className="mt-6 bg-gradient-to-r from-green-500 to-emerald-600 border-0"
              onClick={() => navigate('/dashboard/esg/environment')}
            >
              Explore Environmental Data
            </Button>
          </Card>
        </Col>

        {/* Social Module */}
        <Col xs={24} lg={8}>
          <Card className="border-0 shadow-xl h-full bg-gradient-to-br from-blue-50 to-cyan-50">
            <div className="text-center mb-6">
              <Avatar size={64} className="bg-gradient-to-r from-blue-400 to-cyan-500 mb-4">
                <TeamOutlined style={{ fontSize: 28 }} />
              </Avatar>
              <Title level={4} className="!mb-2">Social</Title>
              <Text className="text-gray-600">Worker safety and community engagement</Text>
            </div>
            
            <Space direction="vertical" className="w-full" size="middle">
              <div className="flex justify-between items-center">
                <Text>Safety Score</Text>
                <Tag color="green">{comprehensiveData.social.worker_safety_score}%</Tag>
              </div>
              <div className="flex justify-between items-center">
                <Text>Training Completion</Text>
                <Tag color="blue">{comprehensiveData.social.training_completion}%</Tag>
              </div>
              <div className="flex justify-between items-center">
                <Text>Community Engagement</Text>
                <Tag color="purple">{comprehensiveData.social.community_engagement}%</Tag>
              </div>
              <div className="flex justify-between items-center">
                <Text>Diversity Index</Text>
                <Tag color="orange">{comprehensiveData.social.diversity_index}%</Tag>
              </div>
            </Space>
            
            <Button 
              type="primary" 
              block 
              className="mt-6 bg-gradient-to-r from-blue-500 to-cyan-600 border-0"
              onClick={() => navigate('/dashboard/esg/social')}
            >
              Explore Social Metrics
            </Button>
          </Card>
        </Col>

        {/* Governance Module */}
        <Col xs={24} lg={8}>
          <Card className="border-0 shadow-xl h-full bg-gradient-to-br from-purple-50 to-pink-50">
            <div className="text-center mb-6">
              <Avatar size={64} className="bg-gradient-to-r from-purple-400 to-pink-500 mb-4">
                <ReconciliationOutlined style={{ fontSize: 28 }} />
              </Avatar>
              <Title level={4} className="!mb-2">Governance</Title>
              <Text className="text-gray-600">Policies, compliance and risk management</Text>
            </div>
            
            <Space direction="vertical" className="w-full" size="middle">
              <div className="flex justify-between items-center">
                <Text>Active Policies</Text>
                <Badge count={`${comprehensiveData.governance.active_policies}/${comprehensiveData.governance.total_policies}`} style={{ backgroundColor: '#d946ef' }} />
              </div>
              <div className="flex justify-between items-center">
                <Text>Ethics Training</Text>
                <Tag color="green">{comprehensiveData.governance.ethics_training}%</Tag>
              </div>
              <div className="flex justify-between items-center">
                <Text>Transparency Score</Text>
                <Tag color="blue">{comprehensiveData.governance.transparency_score}%</Tag>
              </div>
              <div className="flex justify-between items-center">
                <Text>Risk Management</Text>
                <Tag color="purple">{comprehensiveData.governance.risk_management}%</Tag>
              </div>
            </Space>
            
            <Button 
              type="primary" 
              block 
              className="mt-6 bg-gradient-to-r from-purple-500 to-pink-600 border-0"
              onClick={() => navigate('/dashboard/esg/governance')}
            >
              Explore Governance
            </Button>
          </Card>
        </Col>
      </Row>

      {/* Bottom Section - Certifications & Recent Activities */}
      <Row gutter={[24, 24]}>
        {/* Certifications */}
        <Col xs={24} lg={12}>
          <Card className="border-0 shadow-xl">
            <Title level={4} className="!mb-4 flex items-center gap-2">
              <TrophyOutlined className="text-yellow-500" />
              ESG Certifications
            </Title>
            <List
              dataSource={comprehensiveData.certifications}
              renderItem={(cert: any) => (
                <List.Item className="border-0 px-0">
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        className={`${cert.status === 'Active' ? 'bg-green-500' : 'bg-orange-500'}`}
                      >
                        {cert.status === 'Active' ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
                      </Avatar>
                    }
                    title={<Text strong>{cert.name}</Text>}
                    description={
                      <Space>
                        <Tag color={cert.status === 'Active' ? 'green' : 'orange'}>{cert.status}</Tag>
                        <Text className="text-xs text-gray-500">Expires: {cert.expiry}</Text>
                      </Space>
                    }
                  />
                  <div className="text-right">
                    <Text strong className="text-green-600">{cert.score}%</Text>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* Recent Activities */}
        <Col xs={24} lg={12}>
          <Card className="border-0 shadow-xl">
            <Title level={4} className="!mb-4 flex items-center gap-2">
              <ExperimentOutlined className="text-blue-500" />
              Recent ESG Activities
            </Title>
            <List
              dataSource={comprehensiveData.recent_activities}
              renderItem={(activity: any) => (
                <List.Item className="border-0 px-0">
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        className={`${
                          activity.impact === 'positive' ? 'bg-green-500' : 
                          activity.impact === 'negative' ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                      >
                        {activity.impact === 'positive' ? <ArrowUpOutlined /> : 
                         activity.impact === 'negative' ? <ArrowDownOutlined /> : <RiseOutlined />}
                      </Avatar>
                    }
                    title={<Text strong className="text-sm">{activity.type}</Text>}
                    description={
                      <div>
                        <Text className="text-xs">{activity.description}</Text>
                        <div className="mt-1">
                          <Tag color={activity.status === 'completed' ? 'green' : 'blue'}>
                            {activity.status}
                          </Tag>
                          <Text className="text-xs text-gray-500 ml-2">
                            {new Date(activity.timestamp).toLocaleDateString()}
                          </Text>
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <style>{`
        .ant-card {
          border-radius: 16px;
          transition: all 0.3s ease;
        }
        .ant-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .ant-progress-bg {
          border-radius: 10px;
        }
        .ant-statistic-content {
          font-family: 'Inter', sans-serif;
        }
        .bg-gradient-to-r {
          background: linear-gradient(to right, var(--tw-gradient-stops));
        }
        .bg-gradient-to-br {
          background: linear-gradient(to bottom right, var(--tw-gradient-stops));
        }
        .bg-clip-text {
          -webkit-background-clip: text;
          background-clip: text;
        }
        .text-transparent {
          color: transparent;
        }
      `}</style>
    </div>
  );
};

export default ESGOverviewDashboard;