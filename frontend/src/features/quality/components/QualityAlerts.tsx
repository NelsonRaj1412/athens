import React, { useState, useEffect } from 'react';
import { Card, List, Badge, Button, Tag, Space, Typography, Row, Col, Statistic, Alert, App } from 'antd';
import { AlertOutlined, ExclamationCircleOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import PageLayout from '@common/components/PageLayout';
import { getQualityAlerts, acknowledgeAlert } from '../api';

const { Title, Text } = Typography;

interface QualityAlert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'urgent' | 'warning' | 'info';
  alert_type: string;
  category?: string;
  is_acknowledged: boolean;
  created_at: string;
  acknowledged_at?: string;
}

const QualityAlerts: React.FC = () => {
  const { message } = App.useApp();
  const [alerts, setAlerts] = useState<QualityAlert[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const response = await getQualityAlerts();
      setAlerts(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to load quality alerts:', error);
      message.error('UpatePro: Failed to load quality alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeAlert(parseInt(alertId));
      message.success('UpatePro: Quality alert acknowledged successfully');
      loadAlerts();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      message.error('UpatePro: Failed to acknowledge alert');
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

  const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.is_acknowledged).length;
  const activeAlerts = alerts.filter(a => !a.is_acknowledged).length;
  const overdueAlerts = alerts.filter(a => a.created_at && new Date(a.created_at) < new Date(Date.now() - 24*60*60*1000)).length;

  return (
    <PageLayout title="Quality Alerts" icon={<AlertOutlined />}>
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
              title="Overdue Actions"
              value={overdueAlerts}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#cf1322' }}
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
          message="Critical Quality Issues Detected"
          description={`${criticalAlerts} critical quality alert(s) require immediate attention.`}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" danger>
              View All Critical
            </Button>
          }
        />
      )}

      <Card title="Quality Alerts">
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
                <Button key="view" size="small" type="primary">
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
            pageSize: 5,
            showSizeChanger: true,
          }}
        />
      </Card>
    </PageLayout>
  );
};

export default QualityAlerts;