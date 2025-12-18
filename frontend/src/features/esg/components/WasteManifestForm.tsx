import React, { useState } from 'react';
import { Form, Input, Select, DatePicker, InputNumber, Button, Card, Row, Col, App } from 'antd';
import { DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { createWasteManifest, updateWasteManifest } from '../services/esgAPI';
import { WasteManifest } from '../types';
import useAuthStore from '../../../common/store/authStore';

const { Option } = Select;
const { TextArea } = Input;

interface WasteManifestFormProps {
  onSuccess?: () => void;
  initialData?: WasteManifest | null;
}

const WasteManifestForm: React.FC<WasteManifestFormProps> = ({ onSuccess, initialData }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const wasteTypes = [
    'Hazardous Waste',
    'Non-Hazardous Waste',
    'Recyclable Materials',
    'Electronic Waste',
    'Construction Debris',
    'Organic Waste'
  ];

  const disposalMethods = [
    'Recycling',
    'Incineration',
    'Landfill',
    'Treatment',
    'Reuse',
    'Composting'
  ];

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      const { projectId } = useAuthStore.getState();
      const formData = {
        ...values,
        stored_since: values.generation_date?.format('YYYY-MM-DD HH:mm:ss'),
        uom: 'kg',
        tsdf_id: values.tsdf_id || 'TBD',
        status: 'generated',
        site: projectId!
      };
      delete formData.generation_date;
      if (formData.transporter === '') {
        delete formData.transporter;
      }
      
      if (initialData?.id) {
        await updateWasteManifest(initialData.id, formData);
        message.success('Waste manifest updated successfully');
      } else {
        await createWasteManifest(formData);
        message.success('Waste manifest created successfully');
      }
      form.resetFields();
      onSuccess?.();
    } catch (error) {
      message.error('Failed to create waste manifest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={<><DeleteOutlined /> Create Waste Manifest</>}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="waste_type"
              label="Waste Type"
              rules={[{ required: true, message: 'Please select waste type' }]}
            >
              <Select placeholder="Select waste type">
                {wasteTypes.map(type => (
                  <Option key={type} value={type}>{type}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          
          <Col xs={24} md={12}>
            <Form.Item
              name="quantity"
              label="Quantity (kg)"
              rules={[{ required: true, message: 'Please enter quantity' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                placeholder="Enter quantity in kg"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="generation_date"
              label="Generation Date"
              rules={[{ required: true, message: 'Please select generation date' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          
          <Col xs={24} md={12}>
            <Form.Item
              name="disposal_method"
              label="Disposal Method"
              rules={[{ required: true, message: 'Please select disposal method' }]}
            >
              <Select placeholder="Select disposal method">
                {disposalMethods.map(method => (
                  <Option key={method} value={method}>{method}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="transporter_name"
              label="Transporter Name"
            >
              <Input placeholder="Enter transporter name" />
            </Form.Item>
          </Col>
          
          <Col xs={24} md={12}>
            <Form.Item
              name="tsdf_id"
              label="TSDF ID"
            >
              <Input placeholder="Enter Treatment, Storage & Disposal Facility ID" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="description"
          label="Description"
        >
          <TextArea
            rows={3}
            placeholder="Enter waste description and any additional notes"
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<SaveOutlined />}
          >
            Create Waste Manifest
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default WasteManifestForm;