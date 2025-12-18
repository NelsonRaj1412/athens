import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Button, Modal, Form, Input, Select, DatePicker, InputNumber } from 'antd';
import { DropboxOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import PageLayout from '../../../common/components/PageLayout';
import { getWaterManagement, createWaterManagement, updateWaterManagement, deleteWaterManagement } from '../services/esgAPI';

const { Option } = Select;

interface WaterManagementData {
  id?: number;
  measurement_date: string;
  water_source: string;
  usage_type: string;
  volume_consumed_liters: number;
  volume_recycled_liters: number;
  volume_discharged_liters: number;
  recycling_rate: number;
  regulatory_compliance: boolean;
}

const WaterManagementDashboard: React.FC = () => {
  const [data, setData] = useState<WaterManagementData[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<WaterManagementData | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await getWaterManagement();
      setData(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching water management data:', error);
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

  const handleEdit = (record: WaterManagementData) => {
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
        await updateWaterManagement(editingRecord.id!, submitData);
      } else {
        await createWaterManagement(submitData);
      }

      setModalVisible(false);
      fetchData();
    } catch (error) {
      console.error('Error saving water management data:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteWaterManagement(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting water management data:', error);
    }
  };

  const totalConsumption = data.reduce((sum, item) => sum + item.volume_consumed_liters, 0);
  const totalRecycled = data.reduce((sum, item) => sum + item.volume_recycled_liters, 0);
  const totalDischarged = data.reduce((sum, item) => sum + item.volume_discharged_liters, 0);
  const avgRecyclingRate = data.length > 0 ? data.reduce((sum, item) => sum + (item.recycling_rate || 0), 0) / data.length : 0;

  const columns: ColumnsType<WaterManagementData> = [
    {
      title: 'Date',
      dataIndex: 'measurement_date',
      key: 'measurement_date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: 'Source',
      dataIndex: 'water_source',
      key: 'water_source',
    },
    {
      title: 'Usage Type',
      dataIndex: 'usage_type',
      key: 'usage_type',
    },
    {
      title: 'Consumed (L)',
      dataIndex: 'volume_consumed_liters',
      key: 'volume_consumed_liters',
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: 'Recycled (L)',
      dataIndex: 'volume_recycled_liters',
      key: 'volume_recycled_liters',
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: 'Recycling Rate',
      dataIndex: 'recycling_rate',
      key: 'recycling_rate',
      render: (value: number) => `${(value || 0).toFixed(1)}%`,
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
      title="Water Management"
      subtitle="Monitor water consumption, recycling, and discharge"
      breadcrumbs={[
        { title: 'ESG Management' },
        { title: 'Water Management' }
      ]}
      actions={[
        <Button key="create" type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add Water Data
        </Button>
      ]}
    >
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Consumption"
              value={totalConsumption}
              suffix="L"
              prefix={<DropboxOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Recycled"
              value={totalRecycled}
              suffix="L"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Discharged"
              value={totalDischarged}
              suffix="L"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Avg Recycling Rate"
              value={avgRecyclingRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Water Management Data">
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingRecord ? 'Edit Water Data' : 'Add Water Data'}
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
              <Form.Item name="water_source" label="Water Source" rules={[{ required: true }]}>
                <Select>
                  <Option value="municipal">Municipal Supply</Option>
                  <Option value="groundwater">Groundwater</Option>
                  <Option value="surface_water">Surface Water</Option>
                  <Option value="rainwater">Rainwater Harvesting</Option>
                  <Option value="recycled">Recycled Water</Option>
                  <Option value="desalinated">Desalinated Water</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="usage_type" label="Usage Type" rules={[{ required: true }]}>
                <Select>
                  <Option value="domestic">Domestic Use</Option>
                  <Option value="industrial">Industrial Process</Option>
                  <Option value="cooling">Cooling Systems</Option>
                  <Option value="irrigation">Irrigation</Option>
                  <Option value="construction">Construction Activities</Option>
                  <Option value="fire_safety">Fire Safety Systems</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="volume_consumed_liters" label="Consumed (L)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="volume_recycled_liters" label="Recycled (L)">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="volume_discharged_liters" label="Discharged (L)">
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

export default WaterManagementDashboard;