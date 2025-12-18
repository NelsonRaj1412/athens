import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Button, Modal, Form, Input, Select, DatePicker, InputNumber, Tag } from 'antd';
import { AlertOutlined, PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import PageLayout from '../../../common/components/PageLayout';
import { getEnvironmentalIncidents, createEnvironmentalIncident, updateEnvironmentalIncident, deleteEnvironmentalIncident } from '../services/esgAPI';

const { Option } = Select;
const { TextArea } = Input;

interface EnvironmentalIncidentData {
  id?: number;
  incident_type: string;
  incident_date: string;
  location_description: string;
  severity: number;
  immediate_actions: string;
  containment_measures: string;
  status: string;
  cleanup_required: boolean;
  regulatory_notification: boolean;
}

const EnvironmentalIncidentDashboard: React.FC = () => {
  const [data, setData] = useState<EnvironmentalIncidentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EnvironmentalIncidentData | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await getEnvironmentalIncidents();
      setData(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching environmental incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = () => {
    setEditingRecord(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: EnvironmentalIncidentData) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      incident_date: dayjs(record.incident_date),
    });
    setModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      const submitData = {
        ...values,
        incident_date: values.incident_date.format('YYYY-MM-DD HH:mm:ss'),
      };

      if (editingRecord) {
        await updateEnvironmentalIncident(editingRecord.id!, submitData);
      } else {
        await createEnvironmentalIncident(submitData);
      }

      setModalVisible(false);
      fetchData();
    } catch (error) {
      console.error('Error saving environmental incident:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteEnvironmentalIncident(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting environmental incident:', error);
    }
  };

  const totalIncidents = data.length;
  const openIncidents = data.filter(item => item.status === 'open').length;
  const criticalIncidents = data.filter(item => item.severity >= 3).length;
  const regulatoryNotifications = data.filter(item => item.regulatory_notification).length;

  const getSeverityColor = (severity: number) => {
    switch (severity) {
      case 1: return 'green';
      case 2: return 'orange';
      case 3: return 'red';
      case 4: return 'purple';
      default: return 'default';
    }
  };

  const getSeverityText = (severity: number) => {
    switch (severity) {
      case 1: return 'Minor';
      case 2: return 'Moderate';
      case 3: return 'Major';
      case 4: return 'Critical';
      default: return 'Unknown';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'red';
      case 'investigating': return 'orange';
      case 'remediation': return 'blue';
      case 'closed': return 'green';
      default: return 'default';
    }
  };

  const columns: ColumnsType<EnvironmentalIncidentData> = [
    {
      title: 'Date',
      dataIndex: 'incident_date',
      key: 'incident_date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Type',
      dataIndex: 'incident_type',
      key: 'incident_type',
    },
    {
      title: 'Location',
      dataIndex: 'location_description',
      key: 'location_description',
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity: number) => (
        <Tag color={getSeverityColor(severity)}>
          {getSeverityText(severity)}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Regulatory',
      dataIndex: 'regulatory_notification',
      key: 'regulatory_notification',
      render: (notified: boolean) => (
        <Tag color={notified ? 'red' : 'green'}>
          {notified ? 'Notified' : 'Not Required'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record) => (
        <>
          <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id!)} />
        </>
      ),
    },
  ];

  return (
    <PageLayout
      title="Environmental Incidents"
      subtitle="Track and manage environmental incidents and near-misses"
      breadcrumbs={[
        { title: 'ESG Management' },
        { title: 'Environmental Incidents' }
      ]}
      actions={[
        <Button key="create" type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Report Incident
        </Button>
      ]}
    >
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Incidents"
              value={totalIncidents}
              prefix={<AlertOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Open Incidents"
              value={openIncidents}
              valueStyle={{ color: '#f5222d' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Critical Incidents"
              value={criticalIncidents}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Regulatory Notifications"
              value={regulatoryNotifications}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Environmental Incidents">
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingRecord ? 'Edit Environmental Incident' : 'Report Environmental Incident'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="incident_type" label="Incident Type" rules={[{ required: true }]}>
                <Select>
                  <Option value="spill">Chemical/Oil Spill</Option>
                  <Option value="emission">Uncontrolled Emission</Option>
                  <Option value="waste">Waste Management Incident</Option>
                  <Option value="water">Water Pollution</Option>
                  <Option value="noise">Noise Violation</Option>
                  <Option value="wildlife">Wildlife Impact</Option>
                  <Option value="soil">Soil Contamination</Option>
                  <Option value="air">Air Quality Incident</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="incident_date" label="Incident Date" rules={[{ required: true }]}>
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="location_description" label="Location Description" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="severity" label="Severity" rules={[{ required: true }]}>
                <Select>
                  <Option value={1}>Minor - No environmental impact</Option>
                  <Option value={2}>Moderate - Limited environmental impact</Option>
                  <Option value={3}>Major - Significant environmental impact</Option>
                  <Option value={4}>Critical - Severe environmental damage</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                <Select>
                  <Option value="open">Open</Option>
                  <Option value="investigating">Under Investigation</Option>
                  <Option value="remediation">Remediation in Progress</Option>
                  <Option value="closed">Closed</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="immediate_actions" label="Immediate Actions Taken" rules={[{ required: true }]}>
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item name="containment_measures" label="Containment Measures" rules={[{ required: true }]}>
            <TextArea rows={3} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="cleanup_required" label="Cleanup Required" valuePropName="checked">
                <Select>
                  <Option value={true}>Yes</Option>
                  <Option value={false}>No</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="regulatory_notification" label="Regulatory Notification" valuePropName="checked">
                <Select>
                  <Option value={true}>Yes</Option>
                  <Option value={false}>No</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Button type="primary" htmlType="submit" style={{ marginRight: 8 }}>
              {editingRecord ? 'Update' : 'Report'}
            </Button>
            <Button onClick={() => setModalVisible(false)}>Cancel</Button>
          </Form.Item>
        </Form>
      </Modal>
    </PageLayout>
  );
};

export default EnvironmentalIncidentDashboard;