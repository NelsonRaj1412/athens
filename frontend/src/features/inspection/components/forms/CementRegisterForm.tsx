import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Input, Table, Button, Divider, message } from "antd";
import type { ColumnType } from "antd/es/table";
import { useNavigate, useParams } from "react-router-dom";
import { DownloadOutlined, SaveOutlined } from "@ant-design/icons";
import PageLayout from '@common/components/PageLayout';
import { inspectionService } from '../../services/inspectionService';

type AlignType = "left" | "right" | "center" | undefined;

const { Title, Text } = Typography;

interface CementRegisterRow {
  key: number;
  sr: number;
  dateReceipt?: string;
  storeSign?: string;
  invoiceNo?: string;
  weekNo?: string;
  qtyReceived?: string;
  cumQtyReceived?: string;
  dateConsumption?: string;
  totalConsumption?: string;
  cumTotalConsumption?: string;
  stockBalance?: string;
  locationWork?: string;
  signVendor?: string;
  signProzeal?: string;
}

export default function CementRegisterForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    project_name: '',
    project_location: '',
    vendor_contractor_name: '',
    last_updated_on: '',
    last_updated_by: '',
    table_data: Array.from({ length: 25 }).map((_, index) => ({
      key: index,
      sr: index + 1,
      dateReceipt: '',
      storeSign: '',
      invoiceNo: '',
      weekNo: '',
      qtyReceived: '',
      cumQtyReceived: '',
      dateConsumption: '',
      totalConsumption: '',
      cumTotalConsumption: '',
      stockBalance: '',
      locationWork: '',
      signVendor: '',
      signProzeal: ''
    }))
  });

  useEffect(() => {
    if (isEdit && id) {
      fetchForm();
    }
  }, [id, isEdit]);

  const fetchForm = async () => {
    try {
      setLoading(true);
      const response = await inspectionService.getCementRegisterForm(id!);
      const data = response.data;
      setFormData({
        project_name: data.project_name || '',
        project_location: data.project_location || '',
        vendor_contractor_name: data.vendor_contractor_name || '',
        last_updated_on: data.last_updated_on || '',
        last_updated_by: data.last_updated_by || '',
        table_data: data.table_data?.length ? data.table_data : formData.table_data
      });
    } catch (error) {
      message.error('Failed to fetch form data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTableChange = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      table_data: prev.table_data.map((row, i) => 
        i === index ? { ...row, [field]: value } : row
      )
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (isEdit) {
        await inspectionService.updateCementRegisterForm(id!, formData);
        message.success('Form updated successfully');
      } else {
        await inspectionService.createCementRegisterForm(formData);
        message.success('Form created successfully');
      }
      navigate('/inspection/cement-register-forms');
    } catch (error) {
      message.error('Failed to save form');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    window.print();
  };

  const columns: ColumnType<CementRegisterRow>[] = [
    { title: "Sr. No.", dataIndex: "sr", key: "sr", width: 70, align: "center" as AlignType },
    { 
      title: "Date of Receipt", 
      dataIndex: "dateReceipt", 
      key: "dateReceipt", 
      render: (_: any, record) => (
        <Input 
          size="small" 
          value={formData.table_data[record.key]?.dateReceipt || ''}
          onChange={(e) => handleTableChange(record.key, 'dateReceipt', e.target.value)}
        />
      )
    },
    { 
      title: "Store Manager Sign", 
      dataIndex: "storeSign", 
      key: "storeSign", 
      render: (_: any, record) => (
        <Input 
          size="small" 
          value={formData.table_data[record.key]?.storeSign || ''}
          onChange={(e) => handleTableChange(record.key, 'storeSign', e.target.value)}
        />
      )
    },
    { 
      title: "Invoice No.", 
      dataIndex: "invoiceNo", 
      key: "invoiceNo", 
      render: (_: any, record) => (
        <Input 
          size="small" 
          value={formData.table_data[record.key]?.invoiceNo || ''}
          onChange={(e) => handleTableChange(record.key, 'invoiceNo', e.target.value)}
        />
      )
    },
    { 
      title: "Week No.", 
      dataIndex: "weekNo", 
      key: "weekNo", 
      render: (_: any, record) => (
        <Input 
          size="small" 
          value={formData.table_data[record.key]?.weekNo || ''}
          onChange={(e) => handleTableChange(record.key, 'weekNo', e.target.value)}
        />
      )
    },
    { 
      title: "Qty Received (Bags)", 
      dataIndex: "qtyReceived", 
      key: "qtyReceived", 
      render: (_: any, record) => (
        <Input 
          size="small" 
          value={formData.table_data[record.key]?.qtyReceived || ''}
          onChange={(e) => handleTableChange(record.key, 'qtyReceived', e.target.value)}
        />
      )
    },
    { 
      title: "Cum Qty Received (Bags)", 
      dataIndex: "cumQtyReceived", 
      key: "cumQtyReceived", 
      render: (_: any, record) => (
        <Input 
          size="small" 
          value={formData.table_data[record.key]?.cumQtyReceived || ''}
          onChange={(e) => handleTableChange(record.key, 'cumQtyReceived', e.target.value)}
        />
      )
    },
    { 
      title: "Date of Consumption", 
      dataIndex: "dateConsumption", 
      key: "dateConsumption", 
      render: (_: any, record) => (
        <Input 
          size="small" 
          value={formData.table_data[record.key]?.dateConsumption || ''}
          onChange={(e) => handleTableChange(record.key, 'dateConsumption', e.target.value)}
        />
      )
    },
    { 
      title: "Total Consumption (Bags)", 
      dataIndex: "totalConsumption", 
      key: "totalConsumption", 
      render: (_: any, record) => (
        <Input 
          size="small" 
          value={formData.table_data[record.key]?.totalConsumption || ''}
          onChange={(e) => handleTableChange(record.key, 'totalConsumption', e.target.value)}
        />
      )
    },
    { 
      title: "Cum. Total Consumption (Bags)", 
      dataIndex: "cumTotalConsumption", 
      key: "cumTotalConsumption", 
      render: (_: any, record) => (
        <Input 
          size="small" 
          value={formData.table_data[record.key]?.cumTotalConsumption || ''}
          onChange={(e) => handleTableChange(record.key, 'cumTotalConsumption', e.target.value)}
        />
      )
    },
    { 
      title: "Stock / Balance (Bags)", 
      dataIndex: "stockBalance", 
      key: "stockBalance", 
      render: (_: any, record) => (
        <Input 
          size="small" 
          value={formData.table_data[record.key]?.stockBalance || ''}
          onChange={(e) => handleTableChange(record.key, 'stockBalance', e.target.value)}
        />
      )
    },
    { 
      title: "Location of Work", 
      dataIndex: "locationWork", 
      key: "locationWork", 
      render: (_: any, record) => (
        <Input 
          size="small" 
          value={formData.table_data[record.key]?.locationWork || ''}
          onChange={(e) => handleTableChange(record.key, 'locationWork', e.target.value)}
        />
      )
    },
    { 
      title: "Sign of Vendor", 
      dataIndex: "signVendor", 
      key: "signVendor", 
      render: (_: any, record) => (
        <Input 
          size="small" 
          value={formData.table_data[record.key]?.signVendor || ''}
          onChange={(e) => handleTableChange(record.key, 'signVendor', e.target.value)}
        />
      )
    },
    { 
      title: "Sign of Prozeal Quality", 
      dataIndex: "signProzeal", 
      key: "signProzeal", 
      render: (_: any, record) => (
        <Input 
          size="small" 
          value={formData.table_data[record.key]?.signProzeal || ''}
          onChange={(e) => handleTableChange(record.key, 'signProzeal', e.target.value)}
        />
      )
    },
  ];

  const breadcrumbs = [
    { title: 'Inspection', href: '/inspection' },
    { title: 'Cement Register Forms', href: '/inspection/cement-register-forms' },
    { title: isEdit ? 'Edit Form' : 'New Form' }
  ];

  const headerActions = [
    <Button key="download" icon={<DownloadOutlined />} onClick={handleDownload}>
      Download
    </Button>,
    <Button key="submit" type="primary" icon={<SaveOutlined />} loading={loading} onClick={handleSubmit}>
      {isEdit ? 'Update' : 'Submit'}
    </Button>
  ];

  return (
    <PageLayout
      title={isEdit ? 'Edit Cement Register' : 'New Cement Register'}
      breadcrumbs={breadcrumbs}
      actions={headerActions}
    >
      <Card className="shadow-lg">
        {/* Header Section */}
        <Row gutter={16} align="middle" className="border border-black p-4">
          <Col span={6} className="flex justify-center">
            <img src="" alt="Prozeal Logo" className="h-20 object-contain" style={{ height: '80px' }} />
          </Col>
          <Col span={12} className="text-center border-x border-black">
            <Title level={4} className="m-0">Prozeal Green Energy Pvt. Ltd.</Title>
            <Text strong>CEMENT REGISTER</Text>
          </Col>
          <Col span={6} className="text-right space-y-1 text-sm">
            <div>IMS/FOR/PR/003</div>
            <Divider className="my-1" />
            <div>Rev. No.: 00</div>
            <Divider className="my-1" />
            <div>Rev. Date: 01.06.2023</div>
          </Col>
        </Row>
        <Divider />

        {/* Project Info Section */}
        <Row gutter={[16, 12]}>
          <Col span={8}>
            <Text strong>Project Name:</Text> 
            <Input 
              className="mt-1" 
              value={formData.project_name}
              onChange={(e) => handleInputChange('project_name', e.target.value)}
            />
          </Col>
          <Col span={8}>
            <Text strong>Project Location:</Text> 
            <Input 
              className="mt-1" 
              value={formData.project_location}
              onChange={(e) => handleInputChange('project_location', e.target.value)}
            />
          </Col>
          <Col span={8}>
            <Text strong>Vendor/Contractor Name:</Text> 
            <Input 
              className="mt-1" 
              value={formData.vendor_contractor_name}
              onChange={(e) => handleInputChange('vendor_contractor_name', e.target.value)}
            />
          </Col>
          <Col span={8}>
            <Text strong>Last Updated On:</Text> 
            <Input 
              className="mt-1" 
              value={formData.last_updated_on}
              onChange={(e) => handleInputChange('last_updated_on', e.target.value)}
            />
          </Col>
          <Col span={16}>
            <Text strong>Last Updated By:</Text> 
            <Input 
              className="mt-1" 
              value={formData.last_updated_by}
              onChange={(e) => handleInputChange('last_updated_by', e.target.value)}
            />
          </Col>
        </Row>
        <Divider />

        {/* Main Table */}
        <Table
          bordered
          size="small"
          pagination={false}
          columns={columns}
          dataSource={formData.table_data}
          scroll={{ x: "max-content" }}
        />
      </Card>
    </PageLayout>
  );
}