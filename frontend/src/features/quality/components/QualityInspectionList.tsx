import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, Select, Input, Card, App, Modal, Row, Col, Descriptions, Form, Checkbox, Radio } from 'antd';
const { TextArea } = Input;
import { PlusOutlined, EyeOutlined, PlayCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { getQualityInspections, startInspection, completeInspection } from '../api';
import PageLayout from '@common/components/PageLayout';

const QualityInspectionList: React.FC = () => {
  const { message } = App.useApp();
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: '', result: '' });
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<any>(null);
  const [checklistModalOpen, setChecklistModalOpen] = useState(false);
  const [form] = Form.useForm();

  const handleStartInspection = async (inspectionId: number) => {
    try {
      await startInspection(inspectionId);
      message.success('UpatePro: Inspection started successfully');
      loadInspections(); // Refresh the list
    } catch (error) {
      message.error('UpatePro: Failed to start inspection');
    }
  };

  const handleViewInspection = (inspection: any) => {
    setSelectedInspection(inspection);
    setViewModalOpen(true);
  };

  const handleCompleteInspection = (inspection: any) => {
    setSelectedInspection(inspection);
    setChecklistModalOpen(true);
    form.resetFields();
  };

  const handleSubmitInspection = async (values: any) => {
    try {
      const completionData = {
        checklist_results: {
          dimensional_check: values.dimensional_check || false,
          visual_inspection: values.visual_inspection || false,
          material_verification: values.material_verification || false,
          functional_test: values.functional_test || false,
          documentation_check: values.documentation_check || false
        },
        overall_result: values.overall_result,
        inspector_notes: values.inspector_notes,
        quality_score: values.overall_result === 'pass' ? 95 : values.overall_result === 'conditional' ? 75 : 50
      };
      
      await completeInspection(selectedInspection.id, completionData);
      message.success('UpatePro: Inspection completed successfully');
      setChecklistModalOpen(false);
      loadInspections();
    } catch (error) {
      message.error('UpatePro: Failed to complete inspection');
    }
  };

  useEffect(() => {
    loadInspections();
  }, [filters]);

  const loadInspections = async () => {
    setLoading(true);
    try {
      const response = await getQualityInspections(filters);
      setInspections(response.data?.results || response.data || []);
    } catch (error: any) {
      console.error('Failed to load inspections:', error);
      if (error.response?.status !== 401) {
        setInspections([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = { pending: 'orange', in_progress: 'blue', completed: 'green', failed: 'red' };
    return colors[status as keyof typeof colors] || 'default';
  };

  const getResultColor = (result: string) => {
    const colors = { pass: '#22c55e', fail: '#ef4444', conditional: '#f97316', rework: '#a855f7' };
    return colors[result as keyof typeof colors] || '#6b7280';
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'inspection_id',
      render: (id: string) => id.slice(0, 8)
    },
    {
      title: 'Component',
      dataIndex: 'component_type'
    },
    {
      title: 'Reference',
      dataIndex: 'reference_number'
    },
    {
      title: 'Template',
      dataIndex: 'template_name'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status.replace('_', ' ').toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Result',
      dataIndex: 'overall_result',
      render: (result: string) => (
        <Tag color={getResultColor(result)}>
          {result.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Inspector',
      dataIndex: 'inspector_name'
    },
    {
      title: 'Actions',
      render: (record: any) => (
        <Space>
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleViewInspection(record)}
          >
            View
          </Button>
          {record.status === 'scheduled' && (
            <Button 
              size="small" 
              type="primary" 
              icon={<PlayCircleOutlined />}
              onClick={() => handleStartInspection(record.id)}
            >
              Start
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <PageLayout
      title="Quality Inspections"
      subtitle="Manage and track quality inspections"
      actions={
        <Button type="primary" icon={<PlusOutlined />}>
          New Inspection
        </Button>
      }
    >
      <Card className="mb-4">
        <Space>
          <Select
            placeholder="Filter by Status"
            value={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value })}
            style={{ width: 150 }}
            allowClear
          >
            <Select.Option value="pending">Pending</Select.Option>
            <Select.Option value="in_progress">In Progress</Select.Option>
            <Select.Option value="completed">Completed</Select.Option>
            <Select.Option value="failed">Failed</Select.Option>
          </Select>
          
          <Select
            placeholder="Filter by Result"
            value={filters.result}
            onChange={(value) => setFilters({ ...filters, result: value })}
            style={{ width: 150 }}
            allowClear
          >
            <Select.Option value="pass">Pass</Select.Option>
            <Select.Option value="fail">Fail</Select.Option>
            <Select.Option value="conditional">Conditional</Select.Option>
            <Select.Option value="rework">Rework</Select.Option>
          </Select>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={inspections}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      {/* View Inspection Modal */}
      <Modal
        title="Inspection Details"
        open={viewModalOpen}
        onCancel={() => setViewModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalOpen(false)}>
            Close
          </Button>,
          selectedInspection?.status === 'in_progress' && (
            <Button 
              key="complete" 
              type="primary" 
              icon={<CheckCircleOutlined />}
              onClick={() => {
                setViewModalOpen(false);
                handleCompleteInspection(selectedInspection);
              }}
            >
              Complete Inspection
            </Button>
          )
        ]}
        width={800}
      >
        {selectedInspection && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Inspection ID">
              {selectedInspection.inspection_id}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={getStatusColor(selectedInspection.status)}>
                {selectedInspection.status?.replace('_', ' ').toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Component Type">
              {selectedInspection.component_type}
            </Descriptions.Item>
            <Descriptions.Item label="Reference Number">
              {selectedInspection.reference_number}
            </Descriptions.Item>
            <Descriptions.Item label="Template">
              {selectedInspection.template_name}
            </Descriptions.Item>
            <Descriptions.Item label="Result">
              <Tag color={getResultColor(selectedInspection.overall_result)}>
                {selectedInspection.overall_result?.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Inspector">
              {selectedInspection.inspector_name}
            </Descriptions.Item>
            <Descriptions.Item label="Quantity">
              {selectedInspection.quantity} {selectedInspection.unit_of_measure}
            </Descriptions.Item>
            <Descriptions.Item label="Scheduled Date" span={2}>
              {selectedInspection.scheduled_date ? new Date(selectedInspection.scheduled_date).toLocaleString() : 'N/A'}
            </Descriptions.Item>
            {selectedInspection.started_at && (
              <Descriptions.Item label="Started At" span={2}>
                {new Date(selectedInspection.started_at).toLocaleString()}
              </Descriptions.Item>
            )}
            {selectedInspection.completed_at && (
              <Descriptions.Item label="Completed At" span={2}>
                {new Date(selectedInspection.completed_at).toLocaleString()}
              </Descriptions.Item>
            )}
            {selectedInspection.inspector_notes && (
              <Descriptions.Item label="Inspector Notes" span={2}>
                {selectedInspection.inspector_notes}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* Complete Inspection Modal */}
      <Modal
        title="Complete Inspection Checklist"
        open={checklistModalOpen}
        onCancel={() => setChecklistModalOpen(false)}
        onOk={() => form.submit()}
        okText="Complete Inspection"
        width={900}
      >
        {selectedInspection && (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmitInspection}
          >
            <div className="mb-4 p-4 bg-gray-50 rounded">
              <h4>Inspection: {selectedInspection.inspection_id}</h4>
              <p>Component: {selectedInspection.component_type} | Template: {selectedInspection.template_name}</p>
            </div>

            <h4>Quality Checklist</h4>
            
            <Form.Item name="dimensional_check" valuePropName="checked">
              <Checkbox>Dimensional specifications met</Checkbox>
            </Form.Item>
            
            <Form.Item name="visual_inspection" valuePropName="checked">
              <Checkbox>Visual inspection passed (no defects, scratches, or damage)</Checkbox>
            </Form.Item>
            
            <Form.Item name="material_verification" valuePropName="checked">
              <Checkbox>Material verification completed</Checkbox>
            </Form.Item>
            
            <Form.Item name="functional_test" valuePropName="checked">
              <Checkbox>Functional testing passed</Checkbox>
            </Form.Item>
            
            <Form.Item name="documentation_check" valuePropName="checked">
              <Checkbox>Documentation and certifications verified</Checkbox>
            </Form.Item>

            <Form.Item 
              name="overall_result" 
              label="Overall Result" 
              rules={[{ required: true, message: 'Please select overall result' }]}
            >
              <Radio.Group>
                <Radio value="pass">Pass</Radio>
                <Radio value="fail">Fail</Radio>
                <Radio value="conditional">Conditional Pass</Radio>
                <Radio value="rework">Requires Rework</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item name="inspector_notes" label="Inspector Notes">
              <TextArea rows={4} placeholder="Enter any additional notes or observations..." />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </PageLayout>
  );
};

export default QualityInspectionList;