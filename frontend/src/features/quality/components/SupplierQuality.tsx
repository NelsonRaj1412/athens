import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Card, Row, Col, Statistic, Progress, Select, Modal, Form, Input, App } from 'antd';
import { PlusOutlined, StarOutlined } from '@ant-design/icons';
import { getSuppliers, getSupplierStats, createSupplier } from '../api';
import PageLayout from '@common/components/PageLayout';

const SupplierQuality: React.FC = () => {
  const { message } = App.useApp();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ industry: '', rating: '' });
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [suppliersRes, statsRes] = await Promise.all([
        getSuppliers(filters),
        getSupplierStats()
      ]);
      setSuppliers(suppliersRes.data?.results || suppliersRes.data || []);
      setStats(statsRes.data || {});
    } catch (error: any) {
      console.error('Failed to load supplier data:', error);
      if (error.response?.status !== 401) {
        setSuppliers([]);
        setStats({});
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSupplier = async (values: any) => {
    try {
      await createSupplier(values);
      message.success('UpatePro: Supplier created successfully');
      setModalVisible(false);
      form.resetFields();
      loadData();
    } catch (error: any) {
      console.error('Failed to create supplier:', error);
      if (error.response?.status !== 401) {
        message.error('UpatePro: Failed to create supplier');
      }
    }
  };

  const getRatingColor = (rating: string) => {
    const colors = { A: 'green', B: 'blue', C: 'orange', D: 'red' };
    return colors[rating as keyof typeof colors] || 'default';
  };

  const columns = [
    {
      title: 'Supplier Name',
      dataIndex: 'supplier_name'
    },
    {
      title: 'Code',
      dataIndex: 'supplier_code'
    },
    {
      title: 'Type',
      dataIndex: 'supplier_type',
      render: (type: string) => type.replace('_', ' ').toUpperCase()
    },
    {
      title: 'Industry',
      dataIndex: 'industry',
      render: (industry: string) => industry.replace('_', ' ').toUpperCase()
    },
    {
      title: 'Quality Score',
      dataIndex: 'quality_score',
      render: (score: number) => (
        <Progress 
          percent={score} 
          size="small" 
          status={score >= 80 ? 'success' : score >= 60 ? 'normal' : 'exception'}
        />
      )
    },
    {
      title: 'Rating',
      dataIndex: 'overall_rating',
      render: (rating: string) => (
        <Tag color={getRatingColor(rating)} icon={<StarOutlined />}>
          {rating}
        </Tag>
      )
    },
    {
      title: 'Status',
      dataIndex: 'is_approved',
      render: (approved: boolean) => (
        <Tag color={approved ? 'green' : 'red'}>
          {approved ? 'Approved' : 'Pending'}
        </Tag>
      )
    },
    {
      title: 'Last Audit',
      dataIndex: 'last_audit_date'
    }
  ];

  return (
    <PageLayout
      title="Supplier Quality Management"
      subtitle="Monitor and evaluate supplier performance"
      actions={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
          Add Supplier
        </Button>
      }
    >
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Suppliers"
              value={stats.total_suppliers || 0}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Approved Suppliers"
              value={stats.approved_suppliers || 0}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Average Quality Score"
              value={stats.average_quality_score || 0}
              precision={1}
              suffix="/100"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="A-Rated Suppliers"
              value={stats.rating_distribution?.A || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card className="mb-4">
        <Row gutter={16}>
          <Col span={8}>
            <Select
              placeholder="Filter by Industry"
              value={filters.industry}
              onChange={(value) => setFilters({ ...filters, industry: value })}
              style={{ width: '100%' }}
              allowClear
            >
              <Select.Option value="solar_pv">Solar Photovoltaic</Select.Option>
              <Select.Option value="solar_thermal">Solar Thermal</Select.Option>
              <Select.Option value="wind_onshore">Wind Onshore</Select.Option>
              <Select.Option value="wind_offshore">Wind Offshore</Select.Option>
              <Select.Option value="energy_storage">Energy Storage</Select.Option>
              <Select.Option value="grid_integration">Grid Integration</Select.Option>
              <Select.Option value="hybrid_systems">Hybrid Systems</Select.Option>
            </Select>
          </Col>
          <Col span={8}>
            <Select
              placeholder="Filter by Rating"
              value={filters.rating}
              onChange={(value) => setFilters({ ...filters, rating: value })}
              style={{ width: '100%' }}
              allowClear
            >
              <Select.Option value="A">A Rating</Select.Option>
              <Select.Option value="B">B Rating</Select.Option>
              <Select.Option value="C">C Rating</Select.Option>
              <Select.Option value="D">D Rating</Select.Option>
            </Select>
          </Col>
        </Row>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={suppliers}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title="Add New Supplier"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateSupplier}
        >
          <Form.Item
            label="Supplier Name"
            name="supplier_name"
            rules={[{ required: true, message: 'Please enter supplier name' }]}
          >
            <Input placeholder="Enter supplier name" />
          </Form.Item>

          <Form.Item
            label="Supplier Code"
            name="supplier_code"
            rules={[{ required: true, message: 'Please enter supplier code' }]}
          >
            <Input placeholder="Enter supplier code" />
          </Form.Item>

          <Form.Item
            label="Supplier Type"
            name="supplier_type"
            rules={[{ required: true, message: 'Please select supplier type' }]}
          >
            <Select placeholder="Select supplier type">
              <Select.Option value="manufacturer">Manufacturer</Select.Option>
              <Select.Option value="distributor">Distributor</Select.Option>
              <Select.Option value="contractor">Contractor</Select.Option>
              <Select.Option value="service_provider">Service Provider</Select.Option>
              <Select.Option value="consultant">Consultant</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Industry"
            name="industry"
            rules={[{ required: true, message: 'Please select industry' }]}
          >
            <Select placeholder="Select industry">
              <Select.Option value="solar_pv">Solar Photovoltaic</Select.Option>
              <Select.Option value="solar_thermal">Solar Thermal</Select.Option>
              <Select.Option value="wind_onshore">Wind Onshore</Select.Option>
              <Select.Option value="wind_offshore">Wind Offshore</Select.Option>
              <Select.Option value="energy_storage">Energy Storage</Select.Option>
              <Select.Option value="grid_integration">Grid Integration</Select.Option>
              <Select.Option value="hybrid_systems">Hybrid Systems</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Overall Rating"
            name="overall_rating"
            rules={[{ required: true, message: 'Please select rating' }]}
          >
            <Select placeholder="Select rating">
              <Select.Option value="A">A</Select.Option>
              <Select.Option value="B">B</Select.Option>
              <Select.Option value="C">C</Select.Option>
              <Select.Option value="D">D</Select.Option>
            </Select>
          </Form.Item>

          <div className="flex justify-end gap-2">
            <Button onClick={() => setModalVisible(false)}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit">
              Create Supplier
            </Button>
          </div>
        </Form>
      </Modal>
    </PageLayout>
  );
};

export default SupplierQuality;