import React, { useState, useEffect } from 'react';
import { Card, List, Badge, Button, Tag, Space, Typography, Row, Col, Statistic, Alert, App, Tabs } from 'antd';
import { AlertOutlined, ExclamationCircleOutlined, CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@common/components/PageLayout';
import { getQualityAlerts, acknowledgeAlert } from '../../quality/api';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface AlertItem {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'urgent' | 'warning' | 'info';
  alert_type: string;
  category?: string;
  is_acknowledged: boolean;
  created_at: string;
  acknowledged_at?: string;
  module?: string;
}

// Mock system alerts that match dashboard data
const SYSTEM_ALERTS: AlertItem[] = [
  {
    id: 'sys_001',
    title: 'Permits Expiring Soon',
    description: '3 permits require renewal within 24 hours',
    severity: 'warning',
    alert_type: 'permit_expiry',
    category: 'PTW',
    module: 'PTW',
    is_acknowledged: false,
    created_at: '2025-01-07T10:00:00Z'
  },
  {
    id: 'sys_002',
    title: 'High Incident Rate',
    description: 'Construction department has 15% increase in incidents',
    severity: 'warning',
    alert_type: 'incident_trend',
    category: 'Safety',
    module: 'Safety',
    is_acknowledged: false,
    created_at: '2025-01-07T08:30:00Z'
  },
  {
    id: 'sys_003',
    title: 'Training Reminder',
    description: '67 workers have certificates expiring this month',
    severity: 'info',
    alert_type: 'training_expiry',
    category: 'Training',
    module: 'Training',
    is_acknowledged: false,
    created_at: '2025-01-07T07:00:00Z'
  },
  {
    id: 'sys_004',
    title: 'Environmental Compliance Alert',
    description: 'Water consumption exceeded target by 2.8%',
    severity: 'warning',
    alert_type: 'environmental',
    category: 'Environmental',
    module: 'ESG',
    is_acknowledged: false,
    created_at: '2025-01-06T16:30:00Z'
  },
  {
    id: 'sys_005',
    title: 'Safety Equipment Inspection Due',
    description: '12 safety equipment items require inspection',
    severity: 'urgent',
    alert_type: 'equipment_inspection',
    category: 'Safety',
    module: 'Safety',
    is_acknowledged: false,
    created_at: '2025-01-06T14:15:00Z'
  }
];

const AlertsPage: React.FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [qualityAlerts, setQualityAlerts] = useState<AlertItem[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<AlertItem[]>(SYSTEM_ALERTS);
  const [loading, setLoading] = useState(false);

  const getNavigationUrl = (category: string) => {
    switch (category) {
      case 'PTW':
        return '/dashboard/ptw';
      case 'Safety':
        return '/dashboard/safetyobservation/list';
      case 'Environmental':
        return '/dashboard/esg';
      case 'Training':
        return '/dashboard/inductiontraining';
      default:
        return '/dashboard';
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const response = await getQualityAlerts();
      setQualityAlerts(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to load alerts:', error);
      message.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      // Handle system alerts
      if (alertId.startsWith('sys_')) {
        setSystemAlerts(prev => 
          prev.map(alert => 
            alert.id === alertId 
              ? { ...alert, is_acknowledged: true, acknowledged_at: new Date().toISOString() }
              : alert
          )
        );
        message.success('Alert acknowledged successfully');
        return;
      }
      
      // Handle quality alerts
      await acknowledgeAlert(parseInt(alertId));
      message.success('Alert acknowledged successfully');
      loadAlerts();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      message.error('Failed to acknowledge alert');
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      critical: '#ff4d4f',
      urgent: '#ff7a45',
      warning: '#ffa940',
      info: '#52c41a'
    };
    return colors[severity as keyof typeof colors];
  };

  const allAlerts = [...systemAlerts, ...qualityAlerts];
  const criticalAlerts = allAlerts.filter(a => a.severity === 'critical' && !a.is_acknowledged).length;
  const activeAlerts = allAlerts.filter(a => !a.is_acknowledged).length;
  const permitAlerts = systemAlerts.filter(a => a.category === 'PTW');
  const safetyAlerts = [...systemAlerts.filter(a => a.category === 'Safety'), ...qualityAlerts];
  const environmentalAlerts = systemAlerts.filter(a => a.category === 'Environmental');
  const trainingAlerts = systemAlerts.filter(a => a.category === 'Training');

  const renderAlertList = (alerts: AlertItem[]) => (
    <List
      itemLayout="vertical"
      dataSource={alerts}
      loading={loading}
      renderItem={(alert) => (
        <List.Item
          key={alert.id}
          actions={[
            <Button 
              key="acknowledge" 
              size="small"
              onClick={() => handleAcknowledge(alert.id)}
              disabled={alert.is_acknowledged}
            >
              {alert.is_acknowledged ? 'Acknowledged' : 'Acknowledge'}
            </Button>,
            <Button key="view" size="small" type="primary"
              onClick={() => navigate(getNavigationUrl(alert.category || ''))}
            >
              View Details
            </Button>
          ]}
        >
          <List.Item.Meta
            title={
              <Space>
                <Badge 
                  color={getSeverityColor(alert.severity)} 
                  text={alert.title}
                />
                <Tag color={alert.is_acknowledged ? 'green' : 'red'}>
                  {alert.is_acknowledged ? 'ACKNOWLEDGED' : 'ACTIVE'}
                </Tag>
              </Space>
            }
            description={
              <div>
                <Text>{alert.description}</Text>
                <br />
                <Space style={{ marginTop: 8 }}>
                  <Tag>{alert.category}</Tag>
                  <Text type="secondary">
                    Created: {new Date(alert.created_at).toLocaleDateString()}
                  </Text>
                  {alert.acknowledged_at && (
                    <Text type="secondary">
                      Acknowledged: {new Date(alert.acknowledged_at).toLocaleDateString()}
                    </Text>
                  )}
                </Space>
              </div>
            }
          />
        </List.Item>
      )}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
      }}
    />
  );

  return (
    <PageLayout title="System Alerts" icon={<AlertOutlined />}>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Critical Alerts"
              value={criticalAlerts}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Active Alerts"
              value={activeAlerts}
              prefix={<AlertOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Alerts"
              value={allAlerts.length}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Resolved Today"
              value={0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      {criticalAlerts > 0 && (
        <Alert
          message="Critical Issues Detected"
          description={`${criticalAlerts} critical alert(s) require immediate attention.`}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card>
        <Tabs defaultActiveKey="all">
          <TabPane tab={`All Alerts (${allAlerts.length})`} key="all">
            {renderAlertList(allAlerts)}
          </TabPane>
          <TabPane tab={`Permits (${permitAlerts.length})`} key="permits">
            {renderAlertList(permitAlerts)}
          </TabPane>
          <TabPane tab={`Safety (${safetyAlerts.length})`} key="safety">
            {renderAlertList(safetyAlerts)}
          </TabPane>
          <TabPane tab={`Environmental (${environmentalAlerts.length})`} key="environmental">
            {renderAlertList(environmentalAlerts)}
          </TabPane>
          <TabPane tab={`Training (${trainingAlerts.length})`} key="training">
            {renderAlertList(trainingAlerts)}
          </TabPane>
        </Tabs>
      </Card>
    </PageLayout>
  );
};

export default AlertsPage;