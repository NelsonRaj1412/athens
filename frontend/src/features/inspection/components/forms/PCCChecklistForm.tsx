import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Input, Table, Button, Divider, Checkbox, message } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { SaveOutlined, DownloadOutlined } from "@ant-design/icons";
import PageLayout from '@common/components/PageLayout';
import { inspectionService } from '../../services/inspectionService';

const { Title, Text } = Typography;

export default function PCCChecklistForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    project_name: '',
    date_of_checking: '',
    description: '',
    ref_drawing_no: '',
    grade_mix_proportion: '',
    source_of_concrete: '',
    // Preparation items
    prep_0_yes: false, prep_0_no: false, prep_0_na: false, prep_0_remarks: '',
    prep_1_yes: false, prep_1_no: false, prep_1_na: false, prep_1_remarks: '',
    prep_2_yes: false, prep_2_no: false, prep_2_na: false, prep_2_remarks: '',
    prep_3_yes: false, prep_3_no: false, prep_3_na: false, prep_3_remarks: '',
    prep_4_yes: false, prep_4_no: false, prep_4_na: false, prep_4_remarks: '',
    prep_5_yes: false, prep_5_no: false, prep_5_na: false, prep_5_remarks: '',
    // In-process items
    inprocess_0_yes: false, inprocess_0_no: false, inprocess_0_na: false, inprocess_0_remarks: '',
    inprocess_1_yes: false, inprocess_1_no: false, inprocess_1_na: false, inprocess_1_remarks: '',
    inprocess_2_yes: false, inprocess_2_no: false, inprocess_2_na: false, inprocess_2_remarks: '',
    // Comments
    comments: '',
    // Signatures
    checked_by_signature: '', checked_by_name: '', checked_by_date: '', checked_by_company: '',
    witness1_signature: '', witness1_name: '', witness1_date: '', witness1_company: '',
    witness2_signature: '', witness2_name: '', witness2_date: '', witness2_company: '',
    witness3_signature: '', witness3_name: '', witness3_date: '', witness3_company: ''
  });

  useEffect(() => {
    if (isEdit && id) {
      fetchForm();
    }
  }, [id, isEdit]);

  const fetchForm = async () => {
    try {
      setLoading(true);
      const response = await inspectionService.getPCCChecklistForm(id!);
      setFormData(response.data);
    } catch (error) {
      message.error('Failed to fetch form data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (isEdit) {
        await inspectionService.updatePCCChecklistForm(id!, formData);
        message.success('Form updated successfully');
      } else {
        await inspectionService.createPCCChecklistForm(formData);
        message.success('Form created successfully');
      }
      navigate('/inspection/pcc-checklist-forms');
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
    {
      title: "Sl. No",
      dataIndex: "slNo",
      key: "slNo",
      width: 70,
      align: "center" as const,
    },
    {
      title: "Items to be checked",
      dataIndex: "item",
      key: "item",
    },
    {
      title: "YES",
      dataIndex: "yes",
      key: "yes",
      width: 60,
      render: (_: any, record: any) => record.type === 'header' ? null : (
        <Checkbox 
          checked={formData[`${record.section}_${record.index}_yes` as keyof typeof formData] as boolean}
          onChange={(e) => handleInputChange(`${record.section}_${record.index}_yes`, e.target.checked)}
        />
      ),
    },
    {
      title: "NO",
      dataIndex: "no",
      key: "no",
      width: 60,
      render: (_: any, record: any) => record.type === 'header' ? null : (
        <Checkbox 
          checked={formData[`${record.section}_${record.index}_no` as keyof typeof formData] as boolean}
          onChange={(e) => handleInputChange(`${record.section}_${record.index}_no`, e.target.checked)}
        />
      ),
    },
    {
      title: "N/A",
      dataIndex: "na",
      key: "na",
      width: 60,
      render: (_: any, record: any) => record.type === 'header' ? null : (
        <Checkbox 
          checked={formData[`${record.section}_${record.index}_na` as keyof typeof formData] as boolean}
          onChange={(e) => handleInputChange(`${record.section}_${record.index}_na`, e.target.checked)}
        />
      ),
    },
    {
      title: "Remarks",
      dataIndex: "remarks",
      key: "remarks",
      render: (_: any, record: any) => record.type === 'header' ? null : (
        <Input.TextArea 
          rows={1} 
          value={formData[`${record.section}_${record.index}_remarks` as keyof typeof formData] as string}
          onChange={(e) => handleInputChange(`${record.section}_${record.index}_remarks`, e.target.value)}
        />
      ),
    },
  ];

  const dataSource = [
    { key: "h1", item: "PREPARATION", type: 'header' },
    { key: "p1", slNo: 1, item: "Verify the compaction of the filled layer & provision of soling course.", section: 'prep', index: 0 },
    { key: "p2", slNo: 2, item: "Check the bottom level of PCC & evenness of the surface.", section: 'prep', index: 1 },
    { key: "p3", slNo: 3, item: "Verify test certificate for cement & aggregates.", section: 'prep', index: 2 },
    { key: "p4", slNo: 4, item: "Check the provision of bulls/gauges at frequent intervals to monitor the level.", section: 'prep', index: 3 },
    { key: "p5", slNo: 5, item: "Check the provision of form work if required.", section: 'prep', index: 4 },
    { key: "p6", slNo: 6, item: "Check adequacy of men & materials, equipments and allocation of supervisory staff.", section: 'prep', index: 5 },
    { key: "h2", item: "INPROCESS", type: 'header' },
    { key: "i1", slNo: 1, item: "Check the production, placing and compaction of concrete.", section: 'inprocess', index: 0 },
    { key: "i2", slNo: 2, item: "Check the top level of laid concrete.", section: 'inprocess', index: 1 },
    { key: "i3", slNo: 3, item: "Check for curing.", section: 'inprocess', index: 2 },
  ];

  const signatureColumns = [
    { title: "Field", dataIndex: "field", key: "field" },
    { 
      title: "Checked By", 
      dataIndex: "checkedBy", 
      key: "checkedBy", 
      render: (_: any, record: any) => (
        <Input 
          value={formData[`checked_by_${record.field.toLowerCase()}` as keyof typeof formData] as string}
          onChange={(e) => handleInputChange(`checked_by_${record.field.toLowerCase()}`, e.target.value)}
        />
      )
    },
    { 
      title: "Witnessed By 1", 
      dataIndex: "w1", 
      key: "w1", 
      render: (_: any, record: any) => (
        <Input 
          value={formData[`witness1_${record.field.toLowerCase()}` as keyof typeof formData] as string}
          onChange={(e) => handleInputChange(`witness1_${record.field.toLowerCase()}`, e.target.value)}
        />
      )
    },
    { 
      title: "Witnessed By 2", 
      dataIndex: "w2", 
      key: "w2", 
      render: (_: any, record: any) => (
        <Input 
          value={formData[`witness2_${record.field.toLowerCase()}` as keyof typeof formData] as string}
          onChange={(e) => handleInputChange(`witness2_${record.field.toLowerCase()}`, e.target.value)}
        />
      )
    },
    { 
      title: "Witnessed By 3", 
      dataIndex: "w3", 
      key: "w3", 
      render: (_: any, record: any) => (
        <Input 
          value={formData[`witness3_${record.field.toLowerCase()}` as keyof typeof formData] as string}
          onChange={(e) => handleInputChange(`witness3_${record.field.toLowerCase()}`, e.target.value)}
        />
      )
    },
  ];

  const signatureData = [
    { key: 1, field: "Signature" },
    { key: 2, field: "Name" },
    { key: 3, field: "Date" },
    { key: 4, field: "Company" },
  ];

  const breadcrumbs = [
    { title: 'Inspection', href: '/inspection' },
    { title: 'PCC Checklist Forms', href: '/inspection/pcc-checklist-forms' },
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
      title={isEdit ? 'Edit PCC Checklist' : 'New PCC Checklist'}
      breadcrumbs={breadcrumbs}
      actions={headerActions}
    >
      <Card className="shadow-lg space-y-6">
        {/* Header */}
        <Row gutter={16} align="middle" className="border border-black p-4">
          <Col span={6} className="flex justify-center">
            <img src="" alt="Prozeal Logo" className="h-20 object-contain" style={{ height: "80px" }} />
          </Col>
          <Col span={12} className="text-center border-x border-black">
            <Title level={4} className="m-0">Prozeal Green Energy Pvt. Ltd.</Title>
            <Text strong>Check List for Plain Cement Concrete Work</Text>
          </Col>
          <Col span={6} className="text-right space-y-1 text-sm">
            <div>IMS/FOR/PR/010</div>
            <Divider className="my-1" />
            <div>Rev. No.: 00</div>
            <Divider className="my-1" />
            <div>Rev. Date: 12.09.2023</div>
          </Col>
        </Row>

        <Divider />

        {/* Project Details */}
        <Row gutter={[16, 12]}>
          <Col span={8}>
            <Text strong>Project name:</Text> 
            <Input 
              className="mt-1" 
              value={formData.project_name}
              onChange={(e) => handleInputChange('project_name', e.target.value)}
            />
          </Col>
          <Col span={8}>
            <Text strong>Date of checking:</Text> 
            <Input 
              type="date"
              className="mt-1" 
              value={formData.date_of_checking}
              onChange={(e) => handleInputChange('date_of_checking', e.target.value)}
            />
          </Col>
          <Col span={8}>
            <Text strong>Description:</Text> 
            <Input 
              className="mt-1" 
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
            />
          </Col>
          <Col span={8}>
            <Text strong>Ref drawing No:</Text> 
            <Input 
              className="mt-1" 
              value={formData.ref_drawing_no}
              onChange={(e) => handleInputChange('ref_drawing_no', e.target.value)}
            />
          </Col>
          <Col span={8}>
            <Text strong>Grade/ Mix proportion of concrete:</Text> 
            <Input 
              className="mt-1" 
              value={formData.grade_mix_proportion}
              onChange={(e) => handleInputChange('grade_mix_proportion', e.target.value)}
            />
          </Col>
          <Col span={8}>
            <Text strong>Source of concrete:</Text> 
            <Input 
              className="mt-1" 
              value={formData.source_of_concrete}
              onChange={(e) => handleInputChange('source_of_concrete', e.target.value)}
            />
          </Col>
        </Row>

        <Divider />

        {/* Checklist Table */}
        <Table
          bordered
          size="small"
          pagination={false}
          columns={columns}
          dataSource={dataSource}
          rowClassName={(record) => (record.type === 'header' ? "font-bold text-center" : "")}
          rowKey="key"
        />

        <Divider />

        {/* Comments */}
        <div>
          <Text strong>Comments if any:</Text>
          <Input.TextArea 
            rows={4} 
            className="mt-2" 
            value={formData.comments}
            onChange={(e) => handleInputChange('comments', e.target.value)}
          />
        </div>

        {/* Signature Table */}
        <Divider orientation="left" plain><span className="text-base font-semibold">Signatures</span></Divider>
        <Table
          columns={signatureColumns}
          dataSource={signatureData}
          bordered
          pagination={false}
          size="small"
        />
      </Card>
    </PageLayout>
  );
}