import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Space, Typography, Row, Col, Statistic, Progress, Modal, Form, Input, Select, App, Popconfirm } from 'antd';
import { TrophyOutlined, CheckCircleOutlined, ExclamationCircleOutlined, PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import PageLayout from '@common/components/PageLayout';
import { getQualityStandards, createQualityStandard, updateQualityStandard, deleteQualityStandard } from '../api';

const { Title, Text } = Typography;
const { Option } = Select;

interface QualityStandard {
  id: string;
  name: string;
  version: string;
  description: string;
  requirements: any;
  is_active: boolean;
}

const QualityStandards: React.FC = () => {
  const { message } = App.useApp();
  const [standards, setStandards] = useState<QualityStandard[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedStandard, setSelectedStandard] = useState<QualityStandard | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  useEffect(() => {
    loadStandards();
  }, []);

  const loadStandards = async () => {
    setLoading(true);
    try {
      const response = await getQualityStandards();
      setStandards(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to load quality standards:', error);
      message.error('UpatePro: Failed to load quality standards');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Standard Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: QualityStandard) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.description}</Text>
        </div>
      ),
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (is_active: boolean) => (
        <Tag color={is_active ? 'green' : 'red'}>
          {is_active ? 'ACTIVE' : 'INACTIVE'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: QualityStandard) => (
        <Space>
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            View
          </Button>
          <Button 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete Quality Standard"
            description="Are you sure you want to delete this standard?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button 
              size="small" 
              danger
              icon={<DeleteOutlined />}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleAddStandard = () => {
    setIsModalOpen(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      await createQualityStandard(values);
      message.success('UpatePro: Quality standard created successfully');
      setIsModalOpen(false);
      form.resetFields();
      loadStandards();
    } catch (error) {
      console.error('Failed to create quality standard:', error);
      message.error('UpatePro: Failed to create quality standard');
    }
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
  };

  const handleView = (standard: QualityStandard) => {
    setSelectedStandard(standard);
    setViewModalOpen(true);
  };

  const handleEdit = (standard: QualityStandard) => {
    setSelectedStandard(standard);
    editForm.setFieldsValue(standard);
    setEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      await updateQualityStandard(selectedStandard!.id, values);
      message.success('UpatePro: Quality standard updated successfully');
      setEditModalOpen(false);
      editForm.resetFields();
      loadStandards();
    } catch (error) {
      message.error('UpatePro: Failed to update quality standard');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteQualityStandard(id);
      message.success('UpatePro: Quality standard deleted successfully');
      loadStandards();
    } catch (error) {
      message.error('UpatePro: Failed to delete quality standard');
    }
  };

  const activeStandards = standards.filter(s => s.is_active).length;

  return (
    <PageLayout title="Quality Standards" icon={<TrophyOutlined />}>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Standards"
              value={standards.length}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Active Standards"
              value={activeStandards}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Inactive Standards"
              value={standards.length - activeStandards}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Quality Standards Management"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddStandard}>
            Add Standard
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={standards}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
        />
      </Card>

      <Modal
        title="Add Quality Standard"
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Standard Name"
            rules={[{ required: true, message: 'Please enter standard name' }]}
          >
            <Input placeholder="e.g., ISO 9001:2015" />
          </Form.Item>
          <Form.Item
            name="version"
            label="Version"
            rules={[{ required: true, message: 'Please enter version' }]}
          >
            <Input placeholder="e.g., 2015, 1.0" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <Input.TextArea rows={3} placeholder="Enter standard description" />
          </Form.Item>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal
        title="View Quality Standard"
        open={viewModalOpen}
        onCancel={() => setViewModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalOpen(false)}>
            Close
          </Button>
        ]}
        width={600}
      >
        {selectedStandard && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <strong>Standard Name:</strong>
                <p>{selectedStandard.name}</p>
              </Col>
              <Col span={12}>
                <strong>Version:</strong>
                <p>{selectedStandard.version}</p>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <strong>Status:</strong>
                <p>
                  <Tag color={selectedStandard.is_active ? 'green' : 'red'}>
                    {selectedStandard.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </Tag>
                </p>
              </Col>
            </Row>
            <Row>
              <Col span={24}>
                <strong>Description:</strong>
                <p>{selectedStandard.description}</p>
              </Col>
            </Row>
            {selectedStandard.requirements && Object.keys(selectedStandard.requirements).length > 0 && (
              <Row>
                <Col span={24}>
                  <strong>Requirements:</strong>
                  <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                    {JSON.stringify(selectedStandard.requirements, null, 2)}
                  </pre>
                </Col>
              </Row>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Edit Quality Standard"
        open={editModalOpen}
        onOk={handleEditSubmit}
        onCancel={() => {
          setEditModalOpen(false);
          editForm.resetFields();
        }}
        width={600}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="name"
            label="Standard Name"
            rules={[{ required: true, message: 'Please enter standard name' }]}
          >
            <Input placeholder="e.g., ISO 9001:2015" />
          </Form.Item>
          <Form.Item
            name="version"
            label="Version"
            rules={[{ required: true, message: 'Please enter version' }]}
          >
            <Input placeholder="e.g., 2015, 1.0" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <Input.TextArea rows={3} placeholder="Enter standard description" />
          </Form.Item>
          <Form.Item
            name="is_active"
            label="Status"
          >
            <Select>
              <Select.Option value={true}>Active</Select.Option>
              <Select.Option value={false}>Inactive</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </PageLayout>
  );
};

export default QualityStandards;