import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, Select, Space, App, InputNumber, DatePicker } from 'antd';
import { PlusOutlined, CheckCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { getQualityDefects, createQualityDefect, resolveDefect, getQualityInspections } from '../api';
import PageLayout from '@common/components/PageLayout';

const DefectManagement: React.FC = () => {
  const { message } = App.useApp();
  const [defects, setDefects] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedDefect, setSelectedDefect] = useState<any>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadDefects();
    loadInspections();
  }, []);

  const loadInspections = async () => {
    try {
      const { data } = await getQualityInspections();
      setInspections(data?.results || data || []);
    } catch (error) {
      console.error('Failed to load inspections:', error);
    }
  };

  const loadDefects = async () => {
    setLoading(true);
    try {
      const { data } = await getQualityDefects();
      setDefects(data?.results || data || []);
    } catch (error: any) {
      console.error('Failed to load defects:', error);
      if (error.response?.status === 401) {
        // Don't handle 401 here, let axios interceptor handle it
        return;
      }
      message.error('UpatePro: Failed to load defects');
      setDefects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDefect = async (values: any) => {
    try {
      await createQualityDefect(values);
      message.success('UpatePro: Quality defect created successfully');
      setModalVisible(false);
      form.resetFields();
      loadDefects();
    } catch (error: any) {
      message.error('UpatePro: Failed to create defect');
    }
  };

  const handleResolveDefect = async (id: number) => {
    try {
      await resolveDefect(id);
      message.success('UpatePro: Quality defect resolved successfully');
      loadDefects();
    } catch (error: any) {
      message.error('UpatePro: Failed to resolve defect');
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      minor: 'green',
      major: 'orange',
      critical: 'red'
    };
    return colors[severity as keyof typeof colors] || 'default';
  };

  const columns = [
    {
      title: 'Defect Code',
      dataIndex: 'defect_code',
      key: 'defect_code'
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => (
        <Tag>{category?.replace('_', ' ').toUpperCase()}</Tag>
      )
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity: string) => (
        <Tag color={getSeverityColor(severity)}>
          {severity?.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Cost Impact',
      dataIndex: 'cost_impact',
      key: 'cost_impact',
      render: (cost: number) => cost ? `$${cost.toLocaleString()}` : '-'
    },
    {
      title: 'Status',
      dataIndex: 'is_resolved',
      key: 'is_resolved',
      render: (resolved: boolean) => (
        <Tag color={resolved ? 'green' : 'orange'}>
          {resolved ? 'Resolved' : 'Open'}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedDefect(record);
              setViewModalVisible(true);
            }}
          >
            View
          </Button>
          {!record.is_resolved && (
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handleResolveDefect(record.id)}
            >
              Resolve
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <PageLayout
      title="Defect Management"
      subtitle="Track and manage quality defects"
    >
      <Card
        title="Quality Defects"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalVisible(true)}
          >
            Add Defect
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={defects}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="Create New Defect"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateDefect}
        >
          <Form.Item
            label="Inspection"
            name="inspection"
            rules={[{ required: true, message: 'Please select inspection' }]}
          >
            <Select 
              placeholder="Select inspection"
              showSearch
              optionFilterProp="children"
            >
              {inspections.map((inspection: any) => (
                <Select.Option key={inspection.id} value={inspection.id}>
                  {inspection.inspection_id?.slice(0, 8)} - {inspection.component_type} ({inspection.reference_number})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Defect Code"
            name="defect_code"
            rules={[{ required: true, message: 'Please enter defect code' }]}
          >
            <Input placeholder="Enter defect code" />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <Input.TextArea rows={3} placeholder="Enter defect description" />
          </Form.Item>

          <Form.Item
            label="Category"
            name="category"
            rules={[{ required: true, message: 'Please select category' }]}
          >
            <Select placeholder="Select category">
              <Select.Option value="dimensional">Dimensional</Select.Option>
              <Select.Option value="visual">Visual</Select.Option>
              <Select.Option value="material">Material</Select.Option>
              <Select.Option value="functional">Functional</Select.Option>
              <Select.Option value="packaging">Packaging</Select.Option>
              <Select.Option value="documentation">Documentation</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Severity"
            name="severity"
            rules={[{ required: true, message: 'Please select severity' }]}
          >
            <Select placeholder="Select severity">
              <Select.Option value="minor">Minor</Select.Option>
              <Select.Option value="major">Major</Select.Option>
              <Select.Option value="critical">Critical</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Cost Impact ($)"
            name="cost_impact"
          >
            <InputNumber 
              placeholder="Enter cost impact" 
              style={{ width: '100%' }}
              min={0}
              formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value!.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item
            label="Location Details"
            name="location_details"
          >
            <Input placeholder="Enter location details" />
          </Form.Item>

          <div className="flex justify-end gap-2">
            <Button onClick={() => setModalVisible(false)}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit">
              Create Defect
            </Button>
          </div>
        </Form>
      </Modal>

      {/* View Defect Modal */}
      <Modal
        title="Defect Details"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>
        ]}
        width={600}
      >
        {selectedDefect && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-semibold">Defect Code:</label>
                <p>{selectedDefect.defect_code}</p>
              </div>
              <div>
                <label className="font-semibold">Category:</label>
                <p><Tag>{selectedDefect.category?.replace('_', ' ').toUpperCase()}</Tag></p>
              </div>
              <div>
                <label className="font-semibold">Severity:</label>
                <p><Tag color={getSeverityColor(selectedDefect.severity)}>{selectedDefect.severity?.toUpperCase()}</Tag></p>
              </div>
              <div>
                <label className="font-semibold">Cost Impact:</label>
                <p>{selectedDefect.cost_impact ? `$${selectedDefect.cost_impact.toLocaleString()}` : 'N/A'}</p>
              </div>
              <div>
                <label className="font-semibold">Status:</label>
                <p><Tag color={selectedDefect.is_resolved ? 'green' : 'orange'}>
                  {selectedDefect.is_resolved ? 'Resolved' : 'Open'}
                </Tag></p>
              </div>
              <div>
                <label className="font-semibold">Created:</label>
                <p>{selectedDefect.created_at ? new Date(selectedDefect.created_at).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
            <div>
              <label className="font-semibold">Description:</label>
              <p className="mt-1 p-2 bg-gray-50 rounded">{selectedDefect.description}</p>
            </div>
            {selectedDefect.location_details && (
              <div>
                <label className="font-semibold">Location Details:</label>
                <p className="mt-1 p-2 bg-gray-50 rounded">{selectedDefect.location_details}</p>
              </div>
            )}
            {selectedDefect.corrective_action && (
              <div>
                <label className="font-semibold">Corrective Action:</label>
                <p className="mt-1 p-2 bg-gray-50 rounded">{selectedDefect.corrective_action}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </PageLayout>
  );
};

export default DefectManagement;