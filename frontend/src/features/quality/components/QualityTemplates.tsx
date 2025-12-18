import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Tag, Space, Modal, Form, Input, Select, App, Popconfirm, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { getQualityTemplates, createQualityTemplate, updateQualityTemplate, deleteQualityTemplate } from '../api';
import PageLayout from '@common/components/PageLayout';

const QualityTemplates: React.FC = () => {
  const { message } = App.useApp();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const handleView = (template: any) => {
    setSelectedTemplate(template);
    setViewModalOpen(true);
  };

  const handleEdit = (template: any) => {
    setSelectedTemplate(template);
    editForm.setFieldsValue(template);
    setEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      await updateQualityTemplate(selectedTemplate!.id, values);
      message.success('UpatePro: Quality template updated successfully');
      setEditModalOpen(false);
      editForm.resetFields();
      loadTemplates();
    } catch (error) {
      message.error('UpatePro: Failed to update template');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteQualityTemplate(id);
      message.success('UpatePro: Quality template deleted successfully');
      loadTemplates();
    } catch (error) {
      message.error('UpatePro: Failed to delete template');
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await getQualityTemplates();
      setTemplates(response.data.results || response.data);
    } catch (error: any) {
      console.error('Failed to load templates:', error);
      if (error.response?.status === 401) {
        // Don't handle 401 here, let axios interceptor handle it
        return;
      }
      message.error('UpatePro: Failed to load templates');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values: any) => {
    try {
      await createQualityTemplate(values);
      message.success('UpatePro: Quality template created successfully');
      setModalVisible(false);
      form.resetFields();
      loadTemplates();
    } catch (error: any) {
      console.error('Failed to create template:', error);
      if (error.response?.status === 401) {
        return;
      }
      message.error('UpatePro: Failed to create template');
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'Industry',
      dataIndex: 'industry',
      key: 'industry',
      render: (industry: string) => (
        <Tag color={industry.includes('solar') ? 'orange' : industry.includes('wind') ? 'blue' : 'green'}>
          {industry.replace('_', ' ').toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Type',
      dataIndex: 'inspection_type',
      key: 'inspection_type',
      render: (type: string) => type.replace('_', ' ').toUpperCase()
    },
    {
      title: 'Checklist Items',
      dataIndex: 'checklist_items',
      key: 'checklist_items',
      render: (items: any[]) => items?.length || 0
    },
    {
      title: 'Criticality',
      dataIndex: 'criticality',
      key: 'criticality',
      render: (criticality: string) => (
        <Tag color={criticality === 'critical' ? 'red' : criticality === 'high' ? 'orange' : 'blue'}>
          {criticality.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? 'Active' : 'Inactive'}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: any) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)}>View</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>Edit</Button>
          <Popconfirm
            title="Delete Template"
            description="Are you sure you want to delete this template?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>Delete</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <PageLayout
      title="Quality Templates"
      subtitle="Manage inspection templates for solar and wind industries"
      actions={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
          New Template
        </Button>
      }
    >
      <Card>
        <Table
          columns={columns}
          dataSource={templates}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title="Create Quality Template"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item label="Template Name" name="name" rules={[{ required: true }]}>
            <Input placeholder="Enter template name" />
          </Form.Item>
          
          <Form.Item label="Industry" name="industry" rules={[{ required: true }]}>
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
          
          <Form.Item label="Inspection Type" name="inspection_type" rules={[{ required: true }]}>
            <Select placeholder="Select inspection type">
              <Select.Option value="incoming_inspection">Incoming Material Inspection</Select.Option>
              <Select.Option value="in_process_inspection">In-Process Quality Control</Select.Option>
              <Select.Option value="final_inspection">Final Product Inspection</Select.Option>
              <Select.Option value="installation_qa">Installation Quality Assurance</Select.Option>
              <Select.Option value="commissioning_test">Commissioning & Testing</Select.Option>
              <Select.Option value="periodic_audit">Periodic Quality Audit</Select.Option>
              <Select.Option value="supplier_audit">Supplier Quality Audit</Select.Option>
              <Select.Option value="compliance_check">Regulatory Compliance Check</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item label="Criticality" name="criticality" rules={[{ required: true }]}>
            <Select placeholder="Select criticality level">
              <Select.Option value="low">Low Impact</Select.Option>
              <Select.Option value="medium">Medium Impact</Select.Option>
              <Select.Option value="high">High Impact</Select.Option>
              <Select.Option value="critical">Mission Critical</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item label="Description" name="description" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Template description" />
          </Form.Item>
          
          <Form.Item label="Scope" name="scope" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="What this template covers (e.g., Visual inspection, electrical testing, mechanical checks)" />
          </Form.Item>
          
          <div className="flex justify-end gap-2">
            <Button onClick={() => setModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">Create Template</Button>
          </div>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal
        title="View Quality Template"
        open={viewModalOpen}
        onCancel={() => setViewModalOpen(false)}
        footer={[<Button key="close" onClick={() => setViewModalOpen(false)}>Close</Button>]}
        width={800}
      >
        {selectedTemplate && (
          <div>
            <Row gutter={16}>
              <Col span={12}><strong>Name:</strong> {selectedTemplate.name}</Col>
              <Col span={12}><strong>Industry:</strong> {selectedTemplate.industry?.replace('_', ' ')}</Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><strong>Type:</strong> {selectedTemplate.inspection_type?.replace('_', ' ')}</Col>
              <Col span={12}><strong>Criticality:</strong> {selectedTemplate.criticality}</Col>
            </Row>
            <Row><Col span={24}><strong>Description:</strong> {selectedTemplate.description}</Col></Row>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Edit Quality Template"
        open={editModalOpen}
        onOk={handleEditSubmit}
        onCancel={() => { setEditModalOpen(false); editForm.resetFields(); }}
        width={800}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item label="Template Name" name="name" rules={[{ required: true }]}>
            <Input placeholder="Enter template name" />
          </Form.Item>
          <Form.Item label="Industry" name="industry" rules={[{ required: true }]}>
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
          <Form.Item label="Inspection Type" name="inspection_type" rules={[{ required: true }]}>
            <Select placeholder="Select inspection type">
              <Select.Option value="incoming_inspection">Incoming Material Inspection</Select.Option>
              <Select.Option value="in_process_inspection">In-Process Quality Control</Select.Option>
              <Select.Option value="final_inspection">Final Product Inspection</Select.Option>
              <Select.Option value="installation_qa">Installation Quality Assurance</Select.Option>
              <Select.Option value="commissioning_test">Commissioning & Testing</Select.Option>
              <Select.Option value="periodic_audit">Periodic Quality Audit</Select.Option>
              <Select.Option value="supplier_audit">Supplier Quality Audit</Select.Option>
              <Select.Option value="compliance_check">Regulatory Compliance Check</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="Criticality" name="criticality" rules={[{ required: true }]}>
            <Select placeholder="Select criticality level">
              <Select.Option value="low">Low Impact</Select.Option>
              <Select.Option value="medium">Medium Impact</Select.Option>
              <Select.Option value="high">High Impact</Select.Option>
              <Select.Option value="critical">Mission Critical</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="Description" name="description" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Template description" />
          </Form.Item>
          <Form.Item label="Scope" name="scope" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="What this template covers" />
          </Form.Item>
        </Form>
      </Modal>
    </PageLayout>
  );
};

export default QualityTemplates;