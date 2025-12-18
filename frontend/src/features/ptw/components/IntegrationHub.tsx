import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Button, Space, Table, Tag, Modal, Form,
  Input, Select, Switch, Alert, Tabs, List, Avatar, Badge,
  Typography, Divider, Progress, Tooltip, message, Upload,
  Timeline, Statistic, Rate, Checkbox, InputNumber
} from 'antd';
import {
  ApiOutlined, CloudOutlined, DatabaseOutlined, MailOutlined,
  MessageOutlined, BellOutlined, SyncOutlined, SettingOutlined,
  CheckCircleOutlined, CloseCircleOutlined, WarningOutlined,
  LinkOutlined, DisconnectOutlined, MonitorOutlined,
  FileTextOutlined, SafetyOutlined, ToolOutlined, TeamOutlined,
  UploadOutlined, DownloadOutlined, LinkOutlined, KeyOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;

interface Integration {
  id: string;
  name: string;
  type: 'erp' | 'safety' | 'maintenance' | 'hr' | 'notification' | 'iot' | 'analytics';
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  lastSync: string;
  config: any;
  endpoints: string[];
  dataFlow: 'inbound' | 'outbound' | 'bidirectional';
  priority: 'high' | 'medium' | 'low';
}

interface APIEndpoint {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  authentication: 'none' | 'basic' | 'bearer' | 'oauth' | 'api_key';
  status: 'active' | 'inactive' | 'error';
  lastCall: string;
  responseTime: number;
  successRate: number;
}

interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'slack' | 'teams' | 'webhook' | 'push';
  config: any;
  enabled: boolean;
  templates: string[];
}

const IntegrationHub: React.FC = () => {
  // State management
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [apiEndpoints, setApiEndpoints] = useState<APIEndpoint[]>([]);
  const [notificationChannels, setNotificationChannels] = useState<NotificationChannel[]>([]);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  
  // UI state
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [currentIntegration, setCurrentIntegration] = useState<Integration | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Form instances
  const [configForm] = Form.useForm();
  const [testForm] = Form.useForm();

  useEffect(() => {
    loadIntegrations();
    loadAPIEndpoints();
    loadNotificationChannels();
    loadSyncLogs();
  }, []);

  const loadIntegrations = () => {
    const mockIntegrations: Integration[] = [
      {
        id: 'sap_erp',
        name: 'SAP ERP',
        type: 'erp',
        status: 'connected',
        lastSync: '2025-01-07 10:30:00',
        config: {
          host: 'sap.company.com',
          username: 'ptw_user',
          database: 'PROD'
        },
        endpoints: ['/api/workorders', '/api/employees', '/api/locations'],
        dataFlow: 'bidirectional',
        priority: 'high'
      },
      {
        id: 'maximo',
        name: 'IBM Maximo',
        type: 'maintenance',
        status: 'connected',
        lastSync: '2025-01-07 09:45:00',
        config: {
          url: 'https://maximo.company.com/api',
          apiKey: '***hidden***'
        },
        endpoints: ['/workorders', '/assets', '/locations'],
        dataFlow: 'inbound',
        priority: 'high'
      },
      {
        id: 'gas_monitoring',
        name: 'Gas Monitoring System',
        type: 'iot',
        status: 'syncing',
        lastSync: '2025-01-07 10:35:00',
        config: {
          mqttBroker: 'mqtt.sensors.com',
          topics: ['gas/readings', 'gas/alarms']
        },
        endpoints: ['/api/sensors', '/api/readings'],
        dataFlow: 'inbound',
        priority: 'high'
      },
      {
        id: 'active_directory',
        name: 'Active Directory',
        type: 'hr',
        status: 'connected',
        lastSync: '2025-01-07 08:00:00',
        config: {
          ldapUrl: 'ldap://ad.company.com',
          baseDN: 'DC=company,DC=com'
        },
        endpoints: ['/api/users', '/api/groups'],
        dataFlow: 'inbound',
        priority: 'medium'
      },
      {
        id: 'safety_system',
        name: 'Safety Management System',
        type: 'safety',
        status: 'error',
        lastSync: '2025-01-06 16:20:00',
        config: {
          apiUrl: 'https://safety.company.com/api',
          version: 'v2'
        },
        endpoints: ['/incidents', '/training', '/certifications'],
        dataFlow: 'bidirectional',
        priority: 'high'
      }
    ];
    setIntegrations(mockIntegrations);
  };

  const loadAPIEndpoints = () => {
    const mockEndpoints: APIEndpoint[] = [
      {
        id: 'create_permit',
        name: 'Create Permit',
        url: '/api/permits',
        method: 'POST',
        authentication: 'bearer',
        status: 'active',
        lastCall: '2025-01-07 10:30:00',
        responseTime: 245,
        successRate: 99.2
      },
      {
        id: 'get_workers',
        name: 'Get Workers',
        url: '/api/workers',
        method: 'GET',
        authentication: 'api_key',
        status: 'active',
        lastCall: '2025-01-07 10:25:00',
        responseTime: 156,
        successRate: 100
      },
      {
        id: 'sync_locations',
        name: 'Sync Locations',
        url: '/api/locations/sync',
        method: 'POST',
        authentication: 'oauth',
        status: 'error',
        lastCall: '2025-01-07 09:15:00',
        responseTime: 0,
        successRate: 85.3
      }
    ];
    setApiEndpoints(mockEndpoints);
  };

  const loadNotificationChannels = () => {
    const mockChannels: NotificationChannel[] = [
      {
        id: 'email_smtp',
        name: 'Email (SMTP)',
        type: 'email',
        enabled: true,
        config: {
          host: 'smtp.company.com',
          port: 587,
          username: 'ptw@company.com',
          encryption: 'tls'
        },
        templates: ['permit_created', 'approval_required', 'permit_expired']
      },
      {
        id: 'sms_twilio',
        name: 'SMS (Twilio)',
        type: 'sms',
        enabled: true,
        config: {
          accountSid: 'AC***hidden***',
          authToken: '***hidden***',
          fromNumber: '+1234567890'
        },
        templates: ['urgent_approval', 'permit_expired']
      },
      {
        id: 'slack_webhook',
        name: 'Slack Notifications',
        type: 'slack',
        enabled: false,
        config: {
          webhookUrl: 'https://hooks.slack.com/services/***',
          channel: '#safety-alerts'
        },
        templates: ['incident_report', 'safety_alert']
      },
      {
        id: 'teams_webhook',
        name: 'Microsoft Teams',
        type: 'teams',
        enabled: true,
        config: {
          webhookUrl: 'https://company.webhook.office.com/***',
          cardFormat: 'adaptive'
        },
        templates: ['permit_approval', 'workflow_update']
      }
    ];
    setNotificationChannels(mockChannels);
  };

  const loadSyncLogs = () => {
    const mockLogs = [
      {
        id: '1',
        integration: 'SAP ERP',
        operation: 'Employee Sync',
        status: 'success',
        timestamp: '2025-01-07 10:30:00',
        records: 1247,
        duration: 45,
        message: 'Successfully synced employee data'
      },
      {
        id: '2',
        integration: 'Gas Monitoring',
        operation: 'Sensor Reading',
        status: 'success',
        timestamp: '2025-01-07 10:35:00',
        records: 156,
        duration: 12,
        message: 'Real-time sensor data updated'
      },
      {
        id: '3',
        integration: 'Safety System',
        operation: 'Incident Sync',
        status: 'error',
        timestamp: '2025-01-07 09:15:00',
        records: 0,
        duration: 30,
        message: 'Connection timeout - retrying in 5 minutes'
      }
    ];
    setSyncLogs(mockLogs);
  };

  const handleIntegrationConfig = (integration: Integration) => {
    setCurrentIntegration(integration);
    configForm.setFieldsValue(integration.config);
    setConfigModalVisible(true);
  };

  const handleTestConnection = (integration: Integration) => {
    setCurrentIntegration(integration);
    setTestModalVisible(true);
  };

  const saveIntegrationConfig = async (values: any) => {
    if (!currentIntegration) return;

    try {
      setLoading(true);
      
      // Update integration config
      const updatedIntegrations = integrations.map(int => 
        int.id === currentIntegration.id 
          ? { ...int, config: values, status: 'connected' as const }
          : int
      );
      
      setIntegrations(updatedIntegrations);
      setConfigModalVisible(false);
      message.success('Integration configuration saved successfully');
    } catch (error) {
      message.error('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (values: any) => {
    if (!currentIntegration) return;

    try {
      setLoading(true);
      
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      message.success('Connection test successful');
      setTestModalVisible(false);
    } catch (error) {
      message.error('Connection test failed');
    } finally {
      setLoading(false);
    }
  };

  const triggerSync = async (integrationId: string) => {
    try {
      setLoading(true);
      
      // Update integration status
      const updatedIntegrations = integrations.map(int => 
        int.id === integrationId 
          ? { ...int, status: 'syncing' as const }
          : int
      );
      setIntegrations(updatedIntegrations);
      
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Update status back to connected
      const finalIntegrations = integrations.map(int => 
        int.id === integrationId 
          ? { ...int, status: 'connected' as const, lastSync: new Date().toISOString() }
          : int
      );
      setIntegrations(finalIntegrations);
      
      message.success('Sync completed successfully');
    } catch (error) {
      message.error('Sync failed');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'green';
      case 'syncing': return 'blue';
      case 'error': return 'red';
      case 'disconnected': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircleOutlined />;
      case 'syncing': return <SyncOutlined spin />;
      case 'error': return <CloseCircleOutlined />;
      case 'disconnected': return <DisconnectOutlined />;
      default: return <LinkOutlined />;
    }
  };

  const renderIntegrationCard = (integration: Integration) => (
    <Card
      key={integration.id}
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{integration.name}</span>
          <Tag color={getStatusColor(integration.status)} icon={getStatusIcon(integration.status)}>
            {integration.status.toUpperCase()}
          </Tag>
        </div>
      }
      extra={
        <Space>
          <Tooltip title="Configure">
            <Button 
              type="text" 
              icon={<SettingOutlined />}
              onClick={() => handleIntegrationConfig(integration)}
            />
          </Tooltip>
          <Tooltip title="Test Connection">
            <Button 
              type="text" 
              icon={<MonitorOutlined />}
              onClick={() => handleTestConnection(integration)}
            />
          </Tooltip>
          <Tooltip title="Sync Now">
            <Button 
              type="text" 
              icon={<SyncOutlined />}
              onClick={() => triggerSync(integration.id)}
              loading={integration.status === 'syncing'}
            />
          </Tooltip>
        </Space>
      }
      size="small"
    >
      <div style={{ marginBottom: 8 }}>
        <Text type="secondary">Type: </Text>
        <Tag>{integration.type.toUpperCase()}</Tag>
        <Text type="secondary" style={{ marginLeft: 16 }}>Priority: </Text>
        <Tag color={integration.priority === 'high' ? 'red' : integration.priority === 'medium' ? 'orange' : 'green'}>
          {integration.priority.toUpperCase()}
        </Tag>
      </div>
      
      <div style={{ marginBottom: 8 }}>
        <Text type="secondary">Data Flow: </Text>
        <Tag color="blue">{integration.dataFlow.toUpperCase()}</Tag>
      </div>
      
      <div style={{ marginBottom: 8 }}>
        <Text type="secondary">Last Sync: </Text>
        <Text>{dayjs(integration.lastSync).format('YYYY-MM-DD HH:mm')}</Text>
      </div>
      
      <div>
        <Text type="secondary">Endpoints: </Text>
        <Text>{integration.endpoints.length}</Text>
      </div>
    </Card>
  );

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>Integration Hub</Title>
        <Text type="secondary">
          Manage external system integrations and API connections
        </Text>
      </div>

      {/* Overview Stats */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Integrations"
              value={integrations.length}
              prefix={<ApiOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Connections"
              value={integrations.filter(i => i.status === 'connected').length}
              prefix={<LinkOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Failed Connections"
              value={integrations.filter(i => i.status === 'error').length}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Sync Operations Today"
              value={156}
              prefix={<SyncOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Tabs defaultActiveKey="1">
        <TabPane tab="System Integrations" key="1">
          <Row gutter={16}>
            {integrations.map(integration => (
              <Col span={8} key={integration.id} style={{ marginBottom: 16 }}>
                {renderIntegrationCard(integration)}
              </Col>
            ))}
          </Row>
        </TabPane>

        <TabPane tab="API Endpoints" key="2">
          <Card>
            <Table
              dataSource={apiEndpoints}
              columns={[
                { title: 'Name', dataIndex: 'name', key: 'name' },
                { title: 'URL', dataIndex: 'url', key: 'url' },
                { title: 'Method', dataIndex: 'method', key: 'method', render: (method) => <Tag>{method}</Tag> },
                { 
                  title: 'Status', 
                  dataIndex: 'status', 
                  key: 'status',
                  render: (status) => (
                    <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
                  )
                },
                { 
                  title: 'Response Time', 
                  dataIndex: 'responseTime', 
                  key: 'responseTime',
                  render: (time) => `${time}ms`
                },
                { 
                  title: 'Success Rate', 
                  dataIndex: 'successRate', 
                  key: 'successRate',
                  render: (rate) => (
                    <div>
                      <Progress percent={rate} size="small" />
                      <Text type="secondary">{rate}%</Text>
                    </div>
                  )
                },
                {
                  title: 'Actions',
                  key: 'actions',
                  render: (_: any, record) => (
                    <Space>
                      <Button type="text" icon={<MonitorOutlined />} size="small">Test</Button>
                      <Button type="text" icon={<SettingOutlined />} size="small">Config</Button>
                    </Space>
                  )
                }
              ]}
              pagination={false}
            />
          </Card>
        </TabPane>

        <TabPane tab="Notification Channels" key="3">
          <Row gutter={16}>
            {notificationChannels.map(channel => (
              <Col span={12} key={channel.id} style={{ marginBottom: 16 }}>
                <Card
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{channel.name}</span>
                      <Switch 
                        checked={channel.enabled} 
                        size="small"
                        onChange={(checked) => {
                          const updated = notificationChannels.map(c => 
                            c.id === channel.id ? { ...c, enabled: checked } : c
                          );
                          setNotificationChannels(updated);
                        }}
                      />
                    </div>
                  }
                  size="small"
                >
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary">Type: </Text>
                    <Tag>{channel.type.toUpperCase()}</Tag>
                  </div>
                  
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary">Templates: </Text>
                    <Text>{channel.templates.length}</Text>
                  </div>
                  
                  <Space>
                    <Button type="text" icon={<SettingOutlined />} size="small">
                      Configure
                    </Button>
                    <Button type="text" icon={<MessageOutlined />} size="small">
                      Test
                    </Button>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </TabPane>

        <TabPane tab="Sync Logs" key="4">
          <Card>
            <Timeline>
              {syncLogs.map(log => (
                <Timeline.Item
                  key={log.id}
                  color={log.status === 'success' ? 'green' : 'red'}
                  dot={log.status === 'success' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                >
                  <div>
                    <Text strong>{log.integration}</Text> - <Text>{log.operation}</Text>
                  </div>
                  <div>
                    <Tag color={log.status === 'success' ? 'green' : 'red'}>
                      {log.status.toUpperCase()}
                    </Tag>
                    <Text type="secondary">
                      {dayjs(log.timestamp).format('YYYY-MM-DD HH:mm')}
                    </Text>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary">
                      Records: {log.records} | Duration: {log.duration}s
                    </Text>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <Text>{log.message}</Text>
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        </TabPane>

        <TabPane tab="Webhooks" key="5">
          <Card title="Webhook Configuration">
            <Alert
              message="Webhook Endpoints"
              description="Configure webhook endpoints to receive real-time updates from external systems"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            <Table
              dataSource={[
                {
                  id: '1',
                  name: 'Permit Status Updates',
                  url: '/api/webhooks/permit-status',
                  events: ['permit.created', 'permit.approved', 'permit.expired'],
                  active: true
                },
                {
                  id: '2',
                  name: 'Safety Alerts',
                  url: '/api/webhooks/safety-alerts',
                  events: ['incident.reported', 'gas.alarm', 'emergency.declared'],
                  active: true
                }
              ]}
              columns={[
                { title: 'Name', dataIndex: 'name', key: 'name' },
                { title: 'URL', dataIndex: 'url', key: 'url' },
                { 
                  title: 'Events', 
                  dataIndex: 'events', 
                  key: 'events',
                  render: (events) => events.map((event: string) => <Tag key={event}>{event}</Tag>)
                },
                { 
                  title: 'Status', 
                  dataIndex: 'active', 
                  key: 'active',
                  render: (active) => (
                    <Tag color={active ? 'green' : 'red'}>
                      {active ? 'ACTIVE' : 'INACTIVE'}
                    </Tag>
                  )
                },
                {
                  title: 'Actions',
                  key: 'actions',
                  render: () => (
                    <Space>
                      <Button type="text" size="small">Edit</Button>
                      <Button type="text" size="small">Test</Button>
                      <Button type="text" size="small" danger>Delete</Button>
                    </Space>
                  )
                }
              ]}
              pagination={false}
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* Configuration Modal */}
      <Modal
        title={`Configure ${currentIntegration?.name}`}
        open={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={configForm} layout="vertical" onFinish={saveIntegrationConfig}>
          {currentIntegration?.type === 'erp' && (
            <>
              <Form.Item name="host" label="Host" rules={[{ required: true }]}>
                <Input placeholder="Enter host URL" />
              </Form.Item>
              <Form.Item name="username" label="Username" rules={[{ required: true }]}>
                <Input placeholder="Enter username" />
              </Form.Item>
              <Form.Item name="password" label="Password" rules={[{ required: true }]}>
                <Input.Password placeholder="Enter password" />
              </Form.Item>
              <Form.Item name="database" label="Database">
                <Input placeholder="Enter database name" />
              </Form.Item>
            </>
          )}
          
          {currentIntegration?.type === 'maintenance' && (
            <>
              <Form.Item name="url" label="API URL" rules={[{ required: true }]}>
                <Input placeholder="Enter API URL" />
              </Form.Item>
              <Form.Item name="apiKey" label="API Key" rules={[{ required: true }]}>
                <Input.Password placeholder="Enter API key" />
              </Form.Item>
              <Form.Item name="version" label="API Version">
                <Select>
                  <Select.Option value="v1">Version 1</Select.Option>
                  <Select.Option value="v2">Version 2</Select.Option>
                </Select>
              </Form.Item>
            </>
          )}
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Save Configuration
              </Button>
              <Button onClick={() => setConfigModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Test Connection Modal */}
      <Modal
        title={`Test Connection - ${currentIntegration?.name}`}
        open={testModalVisible}
        onCancel={() => setTestModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={testForm} layout="vertical" onFinish={testConnection}>
          <Alert
            message="Connection Test"
            description="This will test the connection to the external system using current configuration"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          <Form.Item name="timeout" label="Timeout (seconds)" initialValue={30}>
            <InputNumber min={5} max={300} style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item name="validateSsl" valuePropName="checked" initialValue={true}>
            <Checkbox>Validate SSL Certificate</Checkbox>
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Test Connection
              </Button>
              <Button onClick={() => setTestModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default IntegrationHub;