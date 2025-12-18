import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Button, Modal, Form, Input, Select, DatePicker, InputNumber } from 'antd';
import { ThunderboltOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import PageLayout from '../../../common/components/PageLayout';
import { getEnergyManagement, createEnergyManagement, updateEnergyManagement, deleteEnergyManagement } from '../services/esgAPI';

const { Option } = Select;

interface EnergyManagementData {
  id?: number;
  measurement_date: string;
  energy_type: string;
  consumption_amount: number;
  consumption_unit: string;
  cost_amount?: number;
  renewable_percentage: number;
  co2_emissions_kg?: number;
}

const EnergyManagementDashboard: React.FC = () => {
  const [data, setData] = useState<EnergyManagementData[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EnergyManagementData | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await getEnergyManagement();
      setData(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching energy management data:', error);
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

  const handleEdit = (record: EnergyManagementData) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      measurement_date: dayjs(record.measurement_date),
    });
    setModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      const submitData = {
        ...values,
        measurement_date: values.measurement_date.format('YYYY-MM-DD'),
      };

      if (editingRecord) {
        await updateEnergyManagement(editingRecord.id!, submitData);
      } else {
        await createEnergyManagement(submitData);
      }

      setModalVisible(false);
      fetchData();
    } catch (error) {
      console.error('Error saving energy management data:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteEnergyManagement(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting energy management data:', error);
    }
  };

  const totalConsumption = data.reduce((sum, item) => sum + item.consumption_amount, 0);
  const totalCost = data.reduce((sum, item) => sum + (item.cost_amount || 0), 0);
  const totalEmissions = data.reduce((sum, item) => sum + (item.co2_emissions_kg || 0), 0);
  const avgRenewablePercentage = data.length > 0 ? data.reduce((sum, item) => sum + item.renewable_percentage, 0) / data.length : 0;

  const columns: ColumnsType<EnergyManagementData> = [
    {
      title: 'Date',
      dataIndex: 'measurement_date',
      key: 'measurement_date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: 'Energy Type',
      dataIndex: 'energy_type',
      key: 'energy_type',
    },
    {
      title: 'Consumption',
      key: 'consumption',
      render: (_: any, record) => `${record.consumption_amount} ${record.consumption_unit}`,
    },
    {
      title: 'Renewable %',
      dataIndex: 'renewable_percentage',
      key: 'renewable_percentage',
      render: (value: number) => `${value.toFixed(1)}%`,
    },
    {
      title: 'Cost',
      dataIndex: 'cost_amount',
      key: 'cost_amount',
      render: (value?: number) => value ? `$${value.toFixed(2)}` : '-',
    },
    {
      title: 'CO₂ Emissions',
      dataIndex: 'co2_emissions_kg',
      key: 'co2_emissions_kg',
      render: (value?: number) => value ? `${value.toFixed(2)} kg` : '-',
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
      title="Energy Management"
      subtitle="Monitor energy consumption, costs, and renewable energy usage"
      breadcrumbs={[
        { title: 'ESG Management' },
        { title: 'Energy Management' }
      ]}
      actions={[
        <Button key="create" type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add Energy Data
        </Button>
      ]}
    >
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Consumption"
              value={totalConsumption}
              precision={2}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Cost"
              value={totalCost}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="CO₂ Emissions"
              value={totalEmissions}
              precision={2}
              suffix="kg"
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Renewable Energy"
              value={avgRenewablePercentage}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Energy Management Data">
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingRecord ? 'Edit Energy Data' : 'Add Energy Data'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="measurement_date" label="Measurement Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="energy_type" label="Energy Type" rules={[{ required: true }]}>
                <Select>
                  <Option value="electricity_grid">Grid Electricity</Option>
                  <Option value="electricity_renewable">Renewable Electricity</Option>
                  <Option value="natural_gas">Natural Gas</Option>
                  <Option value="diesel">Diesel</Option>
                  <Option value="petrol">Petrol</Option>
                  <Option value="lpg">LPG</Option>
                  <Option value="coal">Coal</Option>
                  <Option value="biomass">Biomass</Option>
                  <Option value="solar">Solar Energy</Option>
                  <Option value="wind">Wind Energy</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="consumption_unit" label="Unit" rules={[{ required: true }]}>
                <Select>
                  <Option value="kwh">kWh</Option>
                  <Option value="mwh">MWh</Option>
                  <Option value="gj">GJ</Option>
                  <Option value="liters">Liters</Option>
                  <Option value="kg">Kilograms</Option>
                  <Option value="m3">Cubic Meters</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="consumption_amount" label="Consumption Amount" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="renewable_percentage" label="Renewable %" initialValue={0}>
                <InputNumber style={{ width: '100%' }} min={0} max={100} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="cost_amount" label="Cost Amount">
                <InputNumber style={{ width: '100%' }} min={0} prefix="$" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="co2_emissions_kg" label="CO₂ Emissions (kg)">
                <InputNumber style={{ width: '100%' }} min={0} />
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

export default EnergyManagementDashboard;