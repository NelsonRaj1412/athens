import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, Statistic, Progress, Table, Tag, Button, Select, 
  DatePicker, Space, Tabs, Alert, Timeline, Tooltip, Badge 
} from 'antd';
import { 
  CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, 
  ExclamationCircleOutlined, TrophyOutlined, AlertOutlined,
  LineChartOutlined, BarChartOutlined, PieChartOutlined,
  RiseOutlined, FallOutlined, DashboardOutlined
} from '@ant-design/icons';
import { Line, Bar, Pie, Gauge } from '@ant-design/plots';
import PageLayout from '@common/components/PageLayout';
import { 
  getKPIDashboard, 
  getQualityTrends, 
  getQualityAlerts, 
  getInspectionStats 
} from '../api';

const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

interface QualityKPIs {
  quality_performance: {
    pass_rate: number;
    defect_density: number;
    first_pass_yield: number;
    quality_score_trend: number;
  };
  operational_efficiency: {
    avg_inspection_time: number;
    inspection_productivity: number;
    resource_utilization: number;
  };
  cost_of_quality: {
    prevention_costs: number;
    appraisal_costs: number;
    internal_failure_costs: number;
    external_failure_costs: number;
  };
  supplier_performance: {
    supplier_quality_index: number;
    supplier_defect_rate: number;
    on_time_delivery_rate: number;
  };
}

const QualityDashboardEnhanced: React.FC = () => {
  const [kpis, setKpis] = useState<QualityKPIs | null>(null);
  const [qualityTrends, setQualityTrends] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const days = dateRange ? 
        Math.ceil((dateRange[1].valueOf() - dateRange[0].valueOf()) / (1000 * 60 * 60 * 24)) : 
        30;

      const [kpiResponse, trendsResponse, alertsResponse] = await Promise.all([
        getKPIDashboard({ days }),
        getQualityTrends({ days }),
        getQualityAlerts({ acknowledged: false })
      ]);

      setKpis(kpiResponse.data);
      setQualityTrends(trendsResponse.data);
      setAlerts(alertsResponse.data.results || alertsResponse.data);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Fallback to empty data on error
      setKpis({
        quality_performance: {
          pass_rate: 0,
          defect_density: 0,
          first_pass_yield: 0,
          quality_score_trend: 0
        },
        operational_efficiency: {
          avg_inspection_time: 0,
          inspection_productivity: 0,
          resource_utilization: 0
        },
        cost_of_quality: {
          prevention_costs: 0,
          appraisal_costs: 0,
          internal_failure_costs: 0,
          external_failure_costs: 0
        },
        supplier_performance: {
          supplier_quality_index: 0,
          supplier_defect_rate: 0,
          on_time_delivery_rate: 0
        }
      });
      setQualityTrends([]);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const renderOverviewTab = () => (
    <div>
      {/* Executive Summary Cards */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="Overall Quality Score"
              value={kpis?.quality_performance.quality_score_trend || 0}
              precision={1}
              suffix="/100"
              prefix={<TrophyOutlined />}
              valueStyle={{ 
                color: (kpis?.quality_performance.quality_score_trend || 0) >= 85 ? '#3f8600' : '#cf1322' 
              }}
            />
            <Progress 
              percent={kpis?.quality_performance.quality_score_trend || 0} 
              showInfo={false}
              strokeColor={(kpis?.quality_performance.quality_score_trend || 0) >= 85 ? '#52c41a' : '#ff4d4f'}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pass Rate"
              value={kpis?.quality_performance.pass_rate || 0}
              precision={1}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
            <div className="text-xs text-gray-500 mt-2">
              Target: 95% | Trend: <RiseOutlined className="text-green-500" />
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="First Pass Yield"
              value={kpis?.quality_performance.first_pass_yield || 0}
              precision={1}
              suffix="%"
              prefix={<DashboardOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div className="text-xs text-gray-500 mt-2">
              Industry Benchmark: 92%
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Defect Density"
              value={kpis?.quality_performance.defect_density || 0}
              precision={1}
              suffix="/1K"
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
            <div className="text-xs text-gray-500 mt-2">
              Target: &lt;10/1K | Trend: <FallOutlined className="text-green-500" />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Quality Trends Chart */}
      <Row gutter={16} className="mb-6">
        <Col span={16}>
          <Card title="Quality Performance Trends" extra={<LineChartOutlined />}>
            <Line
              data={qualityTrends}
              xField="date"
              yField="pass_rate"
              seriesField="type"
              height={300}
              smooth={true}
              point={{ size: 5, shape: 'diamond' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Cost of Quality Breakdown" extra={<PieChartOutlined />}>
            <Pie
              data={[
                { type: 'Prevention', value: kpis?.cost_of_quality.prevention_costs || 0 },
                { type: 'Appraisal', value: kpis?.cost_of_quality.appraisal_costs || 0 },
                { type: 'Internal Failure', value: kpis?.cost_of_quality.internal_failure_costs || 0 },
                { type: 'External Failure', value: kpis?.cost_of_quality.external_failure_costs || 0 }
              ]}
              angleField="value"
              colorField="type"
              radius={0.8}
              height={300}
            />
          </Card>
        </Col>
      </Row>

      {/* Quality Alerts */}
      <Row gutter={16}>
        <Col span={12}>
          <Card title="Recent Quality Alerts" extra={<Badge count={alerts.length} />}>
            <Timeline>
              {alerts.map(alert => (
                <Timeline.Item
                  key={alert.id}
                  color={alert.severity === 'critical' ? 'red' : alert.severity === 'warning' ? 'orange' : 'blue'}
                >
                  <div className="flex justify-between items-center">
                    <span>{alert.title}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(alert.created_at).toLocaleString()}
                    </span>
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Operational Efficiency">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Avg Inspection Time"
                  value={kpis?.operational_efficiency.avg_inspection_time || 0}
                  precision={1}
                  suffix="hrs"
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Resource Utilization"
                  value={kpis?.operational_efficiency.resource_utilization || 0}
                  precision={1}
                  suffix="%"
                />
              </Col>
            </Row>
            <div className="mt-4">
              <Gauge
                percent={kpis?.operational_efficiency.resource_utilization || 0}
                range={{ color: '#30BF78' }}
                indicator={{
                  pointer: { style: { stroke: '#D0D0D0' } },
                  pin: { style: { stroke: '#D0D0D0' } }
                }}
                statistic={{
                  content: {
                    style: { fontSize: '16px', lineHeight: '16px' }
                  }
                }}
                height={200}
              />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );

  const renderSupplierTab = () => (
    <Row gutter={16}>
      <Col span={8}>
        <Card>
          <Statistic
            title="Supplier Quality Index"
            value={kpis?.supplier_performance.supplier_quality_index || 0}
            precision={1}
            suffix="/100"
            valueStyle={{ color: '#3f8600' }}
          />
        </Card>
      </Col>
      <Col span={8}>
        <Card>
          <Statistic
            title="On-Time Delivery Rate"
            value={kpis?.supplier_performance.on_time_delivery_rate || 0}
            precision={1}
            suffix="%"
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
      </Col>
      <Col span={8}>
        <Card>
          <Statistic
            title="Supplier Defect Rate"
            value={kpis?.supplier_performance.supplier_defect_rate || 0}
            precision={4}
            suffix="PPM"
            valueStyle={{ color: '#faad14' }}
          />
        </Card>
      </Col>
    </Row>
  );

  const renderComplianceTab = () => (
    <Row gutter={16}>
      <Col span={24}>
        <Card title="Compliance Status">
          <Row gutter={16}>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="ISO 9001:2015"
                  value="Compliant"
                  valueStyle={{ color: '#3f8600' }}
                  prefix={<CheckCircleOutlined />}
                />
                <div className="text-xs text-gray-500">Next Audit: Mar 2024</div>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="IEC 61215"
                  value="Compliant"
                  valueStyle={{ color: '#3f8600' }}
                  prefix={<CheckCircleOutlined />}
                />
                <div className="text-xs text-gray-500">Valid until: Dec 2024</div>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="ASTM Standards"
                  value="Review Due"
                  valueStyle={{ color: '#faad14' }}
                  prefix={<ClockCircleOutlined />}
                />
                <div className="text-xs text-gray-500">Due: Next Week</div>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="UL Certification"
                  value="Compliant"
                  valueStyle={{ color: '#3f8600' }}
                  prefix={<CheckCircleOutlined />}
                />
                <div className="text-xs text-gray-500">Valid until: Jun 2024</div>
              </Card>
            </Col>
          </Row>
        </Card>
      </Col>
    </Row>
  );

  return (
    <PageLayout
      title="Quality Management Dashboard"
      subtitle="World-Class Quality Analytics & Performance Monitoring"
      actions={
        <Space>
          <RangePicker onChange={setDateRange} />
          <Button type="primary" icon={<BarChartOutlined />}>
            Export Report
          </Button>
        </Space>
      }
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Executive Overview" key="overview">
          {renderOverviewTab()}
        </TabPane>
        <TabPane tab="Supplier Performance" key="supplier">
          {renderSupplierTab()}
        </TabPane>
        <TabPane tab="Compliance Status" key="compliance">
          {renderComplianceTab()}
        </TabPane>
      </Tabs>
    </PageLayout>
  );
};

export default QualityDashboardEnhanced;