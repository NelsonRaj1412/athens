import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Button, Modal, Form, Input, Select, DatePicker, InputNumber } from 'antd';
import { GlobalOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import PageLayout from '../../../common/components/PageLayout';
import { getCarbonFootprint, createCarbonFootprint, updateCarbonFootprint, deleteCarbonFootprint } from '../services/esgAPI';

const { Option } = Select;
const { TextArea } = Input;

interface CarbonFootprintData {
  id?: number;
  scope: string;
  category: string;
  activity_description: string;
  activity_amount: number;
  activity_unit: string;
  emission_factor: number;
  emission_factor_source: string;
  co2_equivalent_tonnes: number;
  reporting_period_start: string;
  reporting_period_end: string;
  verified: boolean;
}

const CarbonFootprintDashboard: React.FC = () => {
  const [data, setData] = useState<CarbonFootprintData[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CarbonFootprintData | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await getCarbonFootprint();
      setData(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching carbon footprint data:', error);
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

  const handleEdit = (record: CarbonFootprintData) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      reporting_period_start: dayjs(record.reporting_period_start),
      reporting_period_end: dayjs(record.reporting_period_end),
    });
    setModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      const submitData = {
        ...values,
        reporting_period_start: values.reporting_period_start.format('YYYY-MM-DD'),
        reporting_period_end: values.reporting_period_end.format('YYYY-MM-DD'),
      };

      if (editingRecord) {
        await updateCarbonFootprint(editingRecord.id!, submitData);
      } else {
        await createCarbonFootprint(submitData);
      }

      setModalVisible(false);
      fetchData();
    } catch (error) {
      console.error('Error saving carbon footprint data:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteCarbonFootprint(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting carbon footprint data:', error);
    }
  };

  const totalEmissions = data.reduce((sum, item) => sum + item.co2_equivalent_tonnes, 0);
  const scope1Emissions = data.filter(item => item.scope === 'scope1').reduce((sum, item) => sum + item.co2_equivalent_tonnes, 0);
  const scope2Emissions = data.filter(item => item.scope === 'scope2').reduce((sum, item) => sum + item.co2_equivalent_tonnes, 0);
  const scope3Emissions = data.filter(item => item.scope === 'scope3').reduce((sum, item) => sum + item.co2_equivalent_tonnes, 0);

  const columns: ColumnsType<CarbonFootprintData> = [
    {
      title: 'Scope',
      dataIndex: 'scope',
      key: 'scope',
      render: (scope: string) => scope.toUpperCase(),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
    },
    {
      title: 'Activity',
      dataIndex: 'activity_description',
      key: 'activity_description',
    },
    {
      title: 'CO₂ Equivalent',
      dataIndex: 'co2_equivalent_tonnes',
      key: 'co2_equivalent_tonnes',
      render: (value: number) => `${value.toFixed(2)} tCO₂e`,
    },
    {
      title: 'Period',
      key: 'period',
      render: (_: any, record) => `${record.reporting_period_start} to ${record.reporting_period_end}`,
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
      title="Carbon Footprint Management"
      subtitle="Track and manage greenhouse gas emissions across all scopes"
      breadcrumbs={[
        { title: 'ESG Management' },
        { title: 'Carbon Footprint' }
      ]}
      actions={[
        <Button key="create" type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add Emission Source
        </Button>
      ]}
    >
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Emissions"
              value={totalEmissions}
              precision={2}
              suffix="tCO₂e"
              prefix={<GlobalOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Scope 1"
              value={scope1Emissions}
              precision={2}
              suffix="tCO₂e"
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Scope 2"
              value={scope2Emissions}
              precision={2}
              suffix="tCO₂e"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Scope 3"
              value={scope3Emissions}
              precision={2}
              suffix="tCO₂e"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Carbon Footprint Data">
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingRecord ? 'Edit Emission Source' : 'Add Emission Source'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="scope" label="Scope" rules={[{ required: true }]}>
                <Select>
                  <Option value="scope1">Scope 1 - Direct Emissions</Option>
                  <Option value="scope2">Scope 2 - Indirect Energy</Option>
                  <Option value="scope3">Scope 3 - Other Indirect</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="activity_description" label="Activity Description" rules={[{ required: true }]}>
            <TextArea rows={3} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="activity_amount" label="Activity Amount" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="activity_unit" label="Unit" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="emission_factor" label="Emission Factor" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="reporting_period_start" label="Period Start" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="reporting_period_end" label="Period End" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Button type="primary" htmlType="submit" style={{ marginRight: 8 }}>
              {editingRecord ? 'Update' : 'Create'}
            </Button>
            <Button onClick={() => setModalVisible(false)}>Cancel</Button>
          </Form.Item>
        </Form>
      </Modal>
    </PageLayout>
  );
};

export default CarbonFootprintDashboard;