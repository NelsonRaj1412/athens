import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Input, Divider, Table, Button, message } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { SaveOutlined, DownloadOutlined } from "@ant-design/icons";
import PageLayout from '@common/components/PageLayout';
import { inspectionService } from '../../services/inspectionService';

const { Title, Text } = Typography;

export default function ConcretePourCardForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    project_name: '',
    project_location: '',
    date: '',
    vendor_contractor_name: '',
    location_of_pour: '',
    pour_no: '',
    // Pre-pour items
    pre_pour_0_status: '', pre_pour_0_remarks: '',
    pre_pour_1_status: '', pre_pour_1_remarks: '',
    pre_pour_2_status: '', pre_pour_2_remarks: '',
    pre_pour_3_status: '', pre_pour_3_remarks: '',
    pre_pour_4_status: '', pre_pour_4_remarks: '',
    pre_pour_5_status: '', pre_pour_5_remarks: '',
    pre_pour_6_status: '', pre_pour_6_remarks: '',
    pre_pour_7_status: '', pre_pour_7_remarks: '',
    pre_pour_8_status: '', pre_pour_8_remarks: '',
    pre_pour_9_status: '', pre_pour_9_remarks: '',
    pre_pour_10_status: '', pre_pour_10_remarks: '',
    pre_pour_11_status: '', pre_pour_11_remarks: '',
    pre_pour_12_status: '', pre_pour_12_remarks: '',
    // Post-pour items
    post_pour_0_status: '', post_pour_0_remarks: '',
    post_pour_1_status: '', post_pour_1_remarks: '',
    post_pour_2_status: '', post_pour_2_remarks: '',
    post_pour_3_status: '', post_pour_3_remarks: '',
    // Signatures
    contractor_engineer: '',
    contractor_pm: '',
    pgepl_qa1: '',
    pgepl_qa2: '',
    client_qa1: '',
    client_qa2: ''
  });

  useEffect(() => {
    if (isEdit && id) {
      fetchForm();
    }
  }, [id, isEdit]);

  const fetchForm = async () => {
    try {
      setLoading(true);
      const response = await inspectionService.getConcretePourCardForm(id!);
      setFormData(response.data);
    } catch (error) {
      message.error('Failed to fetch form data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (isEdit) {
        await inspectionService.updateConcretePourCardForm(id!, formData);
        message.success('Form updated successfully');
      } else {
        await inspectionService.createConcretePourCardForm(formData);
        message.success('Form created successfully');
      }
      navigate('/inspection/concrete-pour-card-forms');
    } catch (error) {
      message.error('Failed to save form');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    window.print();
  };

  const prePourData = [
    { key: 0, particular: "Approved drawing available in site" },
    { key: 1, particular: "Marking & layout" },
    { key: 2, particular: "Piling as per drawing" },
    { key: 3, particular: "Structure materials physical check" },
    { key: 4, particular: "Structure fixing as per drawing" },
    { key: 5, particular: "Structure alignment and level check" },
    { key: 6, particular: "Slump value" },
    { key: 7, particular: "MTC availability of construction materials at site" },
    { key: 8, particular: "Availability of Concrete mixer / Ajax machine (Ajax calibrated)" },
    { key: 9, particular: "Grade of cement" },
    { key: 10, particular: "Week of cement" },
    { key: 11, particular: "Work permit available at site" },
    { key: 12, particular: "Compaction vibrator available" },
  ];

  const postPourData = [
    { key: 0, particular: "No of cubes taken." },
    { key: 1, particular: "Level of concrete foundation" },
    { key: 2, particular: "Finishing of top of foundation" },
    { key: 3, particular: "Consumption Qty of cement (Bags)" },
  ];

  const signatureColumns = [
    {
      title: "Checked by",
      dataIndex: "checkedBy",
      key: "checkedBy",
      width: 120,
      fixed: "left" as const,
    },
    {
      title: "Contractor",
      children: [
        { 
          title: "Engineer", 
          dataIndex: "contractorEngineer", 
          key: "contractorEngineer", 
          render: () => (
            <Input 
              value={formData.contractor_engineer}
              onChange={(e) => handleInputChange('contractor_engineer', e.target.value)}
            />
          )
        },
        { 
          title: "P M", 
          dataIndex: "contractorPM", 
          key: "contractorPM", 
          render: () => (
            <Input 
              value={formData.contractor_pm}
              onChange={(e) => handleInputChange('contractor_pm', e.target.value)}
            />
          )
        },
      ],
    },
    {
      title: "PGEPL",
      children: [
        { 
          title: "QA", 
          dataIndex: "pgeplQA1", 
          key: "pgeplQA1", 
          render: () => (
            <Input 
              value={formData.pgepl_qa1}
              onChange={(e) => handleInputChange('pgepl_qa1', e.target.value)}
            />
          )
        },
        { 
          title: "QA", 
          dataIndex: "pgeplQA2", 
          key: "pgeplQA2", 
          render: () => (
            <Input 
              value={formData.pgepl_qa2}
              onChange={(e) => handleInputChange('pgepl_qa2', e.target.value)}
            />
          )
        },
      ],
    },
    {
      title: "Client",
      children: [
        { 
          title: "QA", 
          dataIndex: "clientQA1", 
          key: "clientQA1", 
          render: () => (
            <Input 
              value={formData.client_qa1}
              onChange={(e) => handleInputChange('client_qa1', e.target.value)}
            />
          )
        },
        { 
          title: "QA", 
          dataIndex: "clientQA2", 
          key: "clientQA2", 
          render: () => (
            <Input 
              value={formData.client_qa2}
              onChange={(e) => handleInputChange('client_qa2', e.target.value)}
            />
          )
        },
      ],
    },
  ];

  const signatureData = [
    { key: 1, checkedBy: <Text strong>Name</Text> },
    { key: 2, checkedBy: "" },
    { key: 3, checkedBy: "" },
  ];

  const breadcrumbs = [
    { title: 'Inspection', href: '/inspection' },
    { title: 'Concrete Pour Card Forms', href: '/inspection/concrete-pour-card-forms' },
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
      title={isEdit ? 'Edit Concrete Pour Card' : 'New Concrete Pour Card'}
      breadcrumbs={breadcrumbs}
      actions={headerActions}
    >
      <Card className="shadow-lg space-y-8">
        {/* Header with Logo */}
        <Row align="middle" gutter={16} className="border border-black p-4">
          <Col flex="100px" className="flex justify-center">
            <img src="" alt="Prozeal Logo" className="h-20 object-contain" style={{ height: '80px' }} />
          </Col>
          <Col flex="auto" className="text-center border-x border-black">
            <Title level={4} className="m-0 font-bold">Prozeal Green Energy Pvt. Ltd.</Title>
            <Text strong>CONCRETE POUR CARD</Text>
          </Col>
          <Col flex="220px" className="text-right space-y-1 text-sm">
            <div><Text strong>Format No.:</Text> IMS/FOR/PR/013</div>
            <Divider className="my-1" />
            <div><Text strong>Rev. No./ Date:</Text> 00 / 02.06.2023</div>
          </Col>
        </Row>

        {/* Project Details */}
        <Divider />
        <Row gutter={[16, 12]}>
          <Col span={12}>
            <Text strong>Project Name:</Text>
            <Input 
              className="mt-1" 
              value={formData.project_name}
              onChange={(e) => handleInputChange('project_name', e.target.value)}
            />
          </Col>
          <Col span={12}>
            <Text strong>Project Location:</Text>
            <Input 
              className="mt-1" 
              value={formData.project_location}
              onChange={(e) => handleInputChange('project_location', e.target.value)}
            />
          </Col>
          <Col span={12}>
            <Text strong>Date:</Text>
            <Input 
              type="date" 
              className="mt-1" 
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
            />
          </Col>
          <Col span={12}>
            <Text strong>Vendor/Contractor Name:</Text>
            <Input 
              className="mt-1" 
              value={formData.vendor_contractor_name}
              onChange={(e) => handleInputChange('vendor_contractor_name', e.target.value)}
            />
          </Col>
          <Col span={12}>
            <Text strong>Location of Pour:</Text>
            <Input 
              className="mt-1" 
              value={formData.location_of_pour}
              onChange={(e) => handleInputChange('location_of_pour', e.target.value)}
            />
          </Col>
          <Col span={12}>
            <Text strong>Pour No.:</Text>
            <Input 
              className="mt-1" 
              value={formData.pour_no}
              onChange={(e) => handleInputChange('pour_no', e.target.value)}
            />
          </Col>
        </Row>

        {/* Pre-Pour Table */}
        <Divider orientation="left" plain><span className="text-base font-semibold">PRE-POUR</span></Divider>
        <Table
          bordered
          size="small"
          pagination={false}
          columns={[
            { title: "Sr. No.", dataIndex: "key", key: "key", align: "center", width: 80, render: (_: any, record) => record.key + 1 },
            { title: "Particular", dataIndex: "particular", key: "particular" },
            { 
              title: "Inspection Status (OK/Not OK)", 
              dataIndex: "status", 
              key: "status", 
              render: (_: any, record) => (
                <Input 
                  value={formData[`pre_pour_${record.key}_status` as keyof typeof formData]}
                  onChange={(e) => handleInputChange(`pre_pour_${record.key}_status`, e.target.value)}
                />
              )
            },
            { 
              title: "Remarks (If Any)", 
              dataIndex: "remarks", 
              key: "remarks", 
              render: (_: any, record) => (
                <Input 
                  value={formData[`pre_pour_${record.key}_remarks` as keyof typeof formData]}
                  onChange={(e) => handleInputChange(`pre_pour_${record.key}_remarks`, e.target.value)}
                />
              )
            },
          ]}
          dataSource={prePourData}
        />

        {/* Post-Pour Table */}
        <Divider orientation="left" plain><span className="text-base font-semibold">POST-POUR</span></Divider>
        <Table
          bordered
          size="small"
          pagination={false}
          columns={[
            { title: "Sr. No.", dataIndex: "key", key: "key", align: "center", width: 80, render: (_: any, record) => record.key + 1 },
            { title: "Particular", dataIndex: "particular", key: "particular" },
            { 
              title: "Inspection Status (OK/Not OK)", 
              dataIndex: "status", 
              key: "status", 
              render: (_: any, record) => (
                <Input 
                  value={formData[`post_pour_${record.key}_status` as keyof typeof formData]}
                  onChange={(e) => handleInputChange(`post_pour_${record.key}_status`, e.target.value)}
                />
              )
            },
            { 
              title: "Remarks (If Any)", 
              dataIndex: "remarks", 
              key: "remarks", 
              render: (_: any, record) => (
                <Input 
                  value={formData[`post_pour_${record.key}_remarks` as keyof typeof formData]}
                  onChange={(e) => handleInputChange(`post_pour_${record.key}_remarks`, e.target.value)}
                />
              )
            },
          ]}
          dataSource={postPourData}
        />

        {/* Signature Section */}
        <Divider orientation="left" plain><span className="text-base font-semibold">Signatures</span></Divider>
        <Table
          columns={signatureColumns}
          dataSource={signatureData}
          bordered
          pagination={false}
          size="small"
          scroll={{ x: "max-content" }}
        />
      </Card>
    </PageLayout>
  );
}