import React, { useState, useEffect } from 'react';
import { Card, Input, Table, Typography, Form, Row, Col, Button, message } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { SaveOutlined, DownloadOutlined } from "@ant-design/icons";
import PageLayout from '@common/components/PageLayout';
import { inspectionService } from '../../services/inspectionService';

const { Title } = Typography;

export default function BarBendingScheduleForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    contractor: '',
    project: '',
    client: '',
    sub_contractor: '',
    name_of_structure: '',
    name_of_drawing: '',
    drawing_no: '',
    rev_no_date: '',
    table_data: Array.from({ length: 10 }, (_, index) => ({
      key: index,
      slno: index + 1,
      barMark: '',
      description: '',
      dia: '',
      length: '',
      deduction: '',
      cutLength: '',
      noOfBar: '',
      sixmm: '',
      eightmm: '',
      tenmm: '',
      twelvemm: '',
      sixteenmm: '',
      twentymm: '',
      twentyfivemm: '',
      thirtytwomm: '',
      remarks: '',
    })),
    unit_weight: '',
    total_length: '',
    total_weight: '',
    gross_weight: '',
    prepared_by: '',
    checked_by: '',
    approved_by: ''
  });

  useEffect(() => {
    if (isEdit && id) {
      fetchForm();
    }
  }, [id, isEdit]);

  const fetchForm = async () => {
    try {
      setLoading(true);
      const response = await inspectionService.getBarBendingScheduleForm(id!);
      const data = response.data;
      setFormData({
        ...data,
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
        await inspectionService.updateBarBendingScheduleForm(id!, formData);
        message.success('Form updated successfully');
      } else {
        await inspectionService.createBarBendingScheduleForm(formData);
        message.success('Form created successfully');
      }
      navigate('/inspection/bar-bending-schedule-forms');
    } catch (error) {
      message.error('Failed to save form');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    window.print();
  };

  const columns = [
    { title: "Sl.No", dataIndex: "slno", width: 80, render: (_: any, record: any) => record.slno },
    { 
      title: "Bar Mark", 
      dataIndex: "barMark", 
      render: (_: any, record: any) => (
        <Input 
          value={formData.table_data[record.key]?.barMark || ''}
          onChange={(e) => handleTableChange(record.key, 'barMark', e.target.value)}
        />
      )
    },
    { 
      title: "Description/Shape of Bar", 
      dataIndex: "description", 
      render: (_: any, record: any) => (
        <Input 
          value={formData.table_data[record.key]?.description || ''}
          onChange={(e) => handleTableChange(record.key, 'description', e.target.value)}
        />
      )
    },
    { 
      title: "Dia of Bar", 
      dataIndex: "dia", 
      render: (_: any, record: any) => (
        <Input 
          value={formData.table_data[record.key]?.dia || ''}
          onChange={(e) => handleTableChange(record.key, 'dia', e.target.value)}
        />
      )
    },
    { 
      title: "Bar Length", 
      dataIndex: "length", 
      render: (_: any, record: any) => (
        <Input 
          value={formData.table_data[record.key]?.length || ''}
          onChange={(e) => handleTableChange(record.key, 'length', e.target.value)}
        />
      )
    },
    { 
      title: "Deduction", 
      dataIndex: "deduction", 
      render: (_: any, record: any) => (
        <Input 
          value={formData.table_data[record.key]?.deduction || ''}
          onChange={(e) => handleTableChange(record.key, 'deduction', e.target.value)}
        />
      )
    },
    { 
      title: "Cut Length in (M)", 
      dataIndex: "cutLength", 
      render: (_: any, record: any) => (
        <Input 
          value={formData.table_data[record.key]?.cutLength || ''}
          onChange={(e) => handleTableChange(record.key, 'cutLength', e.target.value)}
        />
      )
    },
    { 
      title: "No of Bar", 
      dataIndex: "noOfBar", 
      render: (_: any, record: any) => (
        <Input 
          value={formData.table_data[record.key]?.noOfBar || ''}
          onChange={(e) => handleTableChange(record.key, 'noOfBar', e.target.value)}
        />
      )
    },
    { 
      title: "6mm", 
      dataIndex: "sixmm", 
      render: (_: any, record: any) => (
        <Input 
          value={formData.table_data[record.key]?.sixmm || ''}
          onChange={(e) => handleTableChange(record.key, 'sixmm', e.target.value)}
        />
      )
    },
    { 
      title: "8mm", 
      dataIndex: "eightmm", 
      render: (_: any, record: any) => (
        <Input 
          value={formData.table_data[record.key]?.eightmm || ''}
          onChange={(e) => handleTableChange(record.key, 'eightmm', e.target.value)}
        />
      )
    },
    { 
      title: "10mm", 
      dataIndex: "tenmm", 
      render: (_: any, record: any) => (
        <Input 
          value={formData.table_data[record.key]?.tenmm || ''}
          onChange={(e) => handleTableChange(record.key, 'tenmm', e.target.value)}
        />
      )
    },
    { 
      title: "12mm", 
      dataIndex: "twelvemm", 
      render: (_: any, record: any) => (
        <Input 
          value={formData.table_data[record.key]?.twelvemm || ''}
          onChange={(e) => handleTableChange(record.key, 'twelvemm', e.target.value)}
        />
      )
    },
    { 
      title: "16mm", 
      dataIndex: "sixteenmm", 
      render: (_: any, record: any) => (
        <Input 
          value={formData.table_data[record.key]?.sixteenmm || ''}
          onChange={(e) => handleTableChange(record.key, 'sixteenmm', e.target.value)}
        />
      )
    },
    { 
      title: "20mm", 
      dataIndex: "twentymm", 
      render: (_: any, record: any) => (
        <Input 
          value={formData.table_data[record.key]?.twentymm || ''}
          onChange={(e) => handleTableChange(record.key, 'twentymm', e.target.value)}
        />
      )
    },
    { 
      title: "25mm", 
      dataIndex: "twentyfivemm", 
      render: (_: any, record: any) => (
        <Input 
          value={formData.table_data[record.key]?.twentyfivemm || ''}
          onChange={(e) => handleTableChange(record.key, 'twentyfivemm', e.target.value)}
        />
      )
    },
    { 
      title: "32mm", 
      dataIndex: "thirtytwomm", 
      render: (_: any, record: any) => (
        <Input 
          value={formData.table_data[record.key]?.thirtytwomm || ''}
          onChange={(e) => handleTableChange(record.key, 'thirtytwomm', e.target.value)}
        />
      )
    },
    { 
      title: "Remarks", 
      dataIndex: "remarks", 
      render: (_: any, record: any) => (
        <Input 
          value={formData.table_data[record.key]?.remarks || ''}
          onChange={(e) => handleTableChange(record.key, 'remarks', e.target.value)}
        />
      )
    },
  ];

  const breadcrumbs = [
    { title: 'Inspection', href: '/inspection' },
    { title: 'Bar Bending Schedule Forms', href: '/inspection/bar-bending-schedule-forms' },
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
      title={isEdit ? 'Edit Bar Bending Schedule' : 'New Bar Bending Schedule'}
      breadcrumbs={breadcrumbs}
      actions={headerActions}
    >
      <Card className="shadow-lg rounded-xl">
        <Title level={3} className="text-center mb-8">
          Bar Bending Schedule (BBS)
        </Title>
        <Form layout="vertical">
          <Row gutter={[24, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Contractor">
                <Input 
                  value={formData.contractor}
                  onChange={(e) => handleInputChange('contractor', e.target.value)}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Project">
                <Input 
                  value={formData.project}
                  onChange={(e) => handleInputChange('project', e.target.value)}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Client">
                <Input 
                  value={formData.client}
                  onChange={(e) => handleInputChange('client', e.target.value)}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Sub-contractor">
                <Input 
                  value={formData.sub_contractor}
                  onChange={(e) => handleInputChange('sub_contractor', e.target.value)}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[24, 16]} className="mb-6">
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Name of Structure">
                <Input 
                  value={formData.name_of_structure}
                  onChange={(e) => handleInputChange('name_of_structure', e.target.value)}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Name of Drawing">
                <Input 
                  value={formData.name_of_drawing}
                  onChange={(e) => handleInputChange('name_of_drawing', e.target.value)}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Drawing No">
                <Input 
                  value={formData.drawing_no}
                  onChange={(e) => handleInputChange('drawing_no', e.target.value)}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Rev No & Date">
                <Input 
                  value={formData.rev_no_date}
                  onChange={(e) => handleInputChange('rev_no_date', e.target.value)}
                />
              </Form.Item>
            </Col>
          </Row>

          <Table
            bordered
            columns={columns}
            dataSource={formData.table_data}
            pagination={false}
            scroll={{ x: "max-content" }}
            className="my-6"
          />

          <Row gutter={[24, 16]}>
            <Col span={24}>
              <Form.Item label="Unit Weight of each dia of bars (kg/m)">
                <Input 
                  placeholder="6mm: 0.221, 8mm: 0.394, 10mm: 0.616, etc." 
                  value={formData.unit_weight}
                  onChange={(e) => handleInputChange('unit_weight', e.target.value)}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Total length of bars (in meters)">
                <Input 
                  value={formData.total_length}
                  onChange={(e) => handleInputChange('total_length', e.target.value)}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Total Weight of Bar for each dia (in kgs)">
                <Input 
                  value={formData.total_weight}
                  onChange={(e) => handleInputChange('total_weight', e.target.value)}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Gross Weight (in Tons)">
                <Input 
                  value={formData.gross_weight}
                  onChange={(e) => handleInputChange('gross_weight', e.target.value)}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[24, 16]} className="mt-6">
            <Col xs={24} md={8}>
              <Form.Item label="Prepared by - Name/Signature/Date">
                <Input 
                  value={formData.prepared_by}
                  onChange={(e) => handleInputChange('prepared_by', e.target.value)}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Checked by - Name/Signature/Date">
                <Input 
                  value={formData.checked_by}
                  onChange={(e) => handleInputChange('checked_by', e.target.value)}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Approved by - Name/Signature/Date">
                <Input 
                  value={formData.approved_by}
                  onChange={(e) => handleInputChange('approved_by', e.target.value)}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>
    </PageLayout>
  );
}