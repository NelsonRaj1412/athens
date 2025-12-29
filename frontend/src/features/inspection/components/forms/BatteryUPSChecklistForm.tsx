import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Typography, Table, Row, Col, message } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { SaveOutlined, DownloadOutlined } from "@ant-design/icons";
import PageLayout from '@common/components/PageLayout';
import { inspectionService } from '../../services/inspectionService';
import BatteryUPSChecklistPrintPreview from '../BatteryUPSChecklistPrintPreview';

const { Title } = Typography;

export default function BatteryUPSChecklistForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    client: '',
    date: '',
    location: '',
    battery_details: '',
    battery_rating: '',
    charging_discharging_room_amp: '',
    // General checklist (16 items)
    check_0_status: '', check_1_status: '', check_2_status: '', check_3_status: '',
    check_4_status: '', check_5_status: '', check_6_status: '', check_7_status: '',
    check_8_status: '', check_9_status: '', check_10_status: '', check_11_status: '',
    check_12_status: '', check_13_status: '', check_14_status: '', check_15_status: '',
    // Charging/Discharging Amount
    charging_discharging_amount: '',
    // First signature table
    tested_by_signature: '', tested_by_name: '', tested_by_date: '', tested_by_company: '',
    witness1_signature: '', witness1_name: '', witness1_date: '', witness1_company: '',
    witness2_signature: '', witness2_name: '', witness2_date: '', witness2_company: '',
    witness3_signature: '', witness3_name: '', witness3_date: '', witness3_company: '',
    // Battery cell test data
    cell_test_data: Array.from({ length: 6 }, (_, i) => ({
      key: i,
      cellNo: i + 1,
      gravity: '',
      voltage: '',
      temp: ''
    })),
    // Second signature table
    signed_by_signature: '', signed_by_name: '', signed_by_date: '', signed_by_company: '',
    witness4_signature: '', witness4_name: '', witness4_date: '', witness4_company: '',
    witness5_signature: '', witness5_name: '', witness5_date: '', witness5_company: '',
    witness6_signature: '', witness6_name: '', witness6_date: '', witness6_company: ''
  });

  const infoFields = [
    { key: 'client', label: 'Client' },
    { key: 'date', label: 'Date' },
    { key: 'location', label: 'Location' },
    { key: 'battery_details', label: 'Battery Details' },
    { key: 'battery_rating', label: 'Battery Rating' },
    { key: 'charging_discharging_room_amp', label: 'Charging/Discharging Room Amp' }
  ];

  const checklistDescriptions = [
    "Check for proper ventilation of battery room.",
    "Ensure the availability of gloves, apron, water",
    "Visual & physical inspection of all cells.",
    "Check the installation of battery rack as per approved shop drawing",
    "Before installation of battery on rack ensure that tightness of battery stand",
    "Check all cell no are marked and are visible",
    "Identification of polarity and interconnection of cells.",
    "Ensure the polarity and inter connection of battery terminal.",
    "Tightness of bus bar interconnection links of all the cells.",
    "Check the specific gravity of electrolyte before filling",
    "Check that the electrolyte is filled up to the required level",
    "Check the cell voltage",
    "Check that the Vaseline is applied on the terminals",
    "Check that the vents plugs are in position",
    "Record Cell voltage, temperature, and specific gravity",
    "All the mentioned activities under proper safety surveillance."
  ];

  useEffect(() => {
    if (isEdit && id) {
      fetchForm();
    }
  }, [id, isEdit]);

  const fetchForm = async () => {
    try {
      setLoading(true);
      const response = await inspectionService.getBatteryUPSChecklistForm(id!);
      const data = response.data;
      setFormData({
        ...data,
        cell_test_data: data.cell_test_data?.length ? data.cell_test_data : formData.cell_test_data
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

  const handleCellTestChange = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      cell_test_data: prev.cell_test_data.map((row, i) => 
        i === index ? { ...row, [field]: value } : row
      )
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (isEdit) {
        await inspectionService.updateBatteryUPSChecklistForm(id!, formData);
        message.success('Form updated successfully');
      } else {
        await inspectionService.createBatteryUPSChecklistForm(formData);
        message.success('Form created successfully');
      }
      navigate('/inspection/battery-ups-checklist-forms');
    } catch (error) {
      message.error('Failed to save form');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    window.print();
  };

  const breadcrumbs = [
    { title: 'Inspection', href: '/inspection' },
    { title: 'Battery UPS Checklist Forms', href: '/inspection/battery-ups-checklist-forms' },
    { title: isEdit ? 'Edit Form' : 'New Form' }
  ];

  const headerActions = [
    <BatteryUPSChecklistPrintPreview key="print-preview" formData={formData} />,
    <Button key="download" icon={<DownloadOutlined />} onClick={handleDownload}>
      Download
    </Button>,
    <Button key="submit" type="primary" icon={<SaveOutlined />} loading={loading} onClick={handleSubmit}>
      {isEdit ? 'Update' : 'Submit'}
    </Button>
  ];

  return (
    <PageLayout
      title={isEdit ? 'Edit Battery UPS Checklist' : 'New Battery UPS Checklist'}
      breadcrumbs={breadcrumbs}
      actions={headerActions}
    >
      <Card className="shadow-lg">
        {/* Header */}
        <Row className="mb-4 items-center">
          <Col span={6} className="text-center">
            <img src="/logo.png" alt="Prozeal Logo" className="max-h-16" />
          </Col>
          <Col span={12} className="text-center">
            <p className="font-bold text-base">PROZEAL GREEN ENERGY PVT LTD</p>
            <p className="text-xs italic">An initiative towards a cleaner tomorrow</p>
          </Col>
          <Col span={6}>
            <Table
              dataSource={[
                ["Document Name:", "Pre-Commissioning Checklist"],
                ["Format No.", "IMS/FOR/PR/077"],
                ["Page No.", "01"],
                ["Issue No.", "01"],
                ["Revision No.", "00"],
                ["Issue Date:", "18-01-2024"],
                ["Revision Date:", "NA"]
              ].map(([label, value], index) => ({ key: index, label, value }))}
              columns={[
                { title: "", dataIndex: "label", key: "label" },
                { title: "", dataIndex: "value", key: "value" }
              ]}
              pagination={false}
              size="small"
              bordered
            />
          </Col>
        </Row>

        <Title level={4} className="text-center text-red-600 underline mb-4 uppercase">Battery & UPS</Title>

        {/* Info Fields */}
        <Row gutter={[16, 16]} className="mb-6">
          {infoFields.map((field, i) => (
            <Col span={8} key={i}>
              <label className="block text-sm font-medium mb-1">{field.label}:</label>
              <Input 
                size="small" 
                type={field.key === 'date' ? 'date' : 'text'}
                value={formData[field.key as keyof typeof formData] as string}
                onChange={(e) => handleInputChange(field.key, e.target.value)}
              />
            </Col>
          ))}
        </Row>

        {/* General Checklist */}
        <Title level={5} className="mb-2">General Checklist</Title>
        <Table
          dataSource={checklistDescriptions.map((desc, i) => ({
            key: i,
            srNo: i + 1,
            desc,
            status: (
              <Input 
                size="small" 
                value={formData[`check_${i}_status` as keyof typeof formData] as string}
                onChange={(e) => handleInputChange(`check_${i}_status`, e.target.value)}
              />
            )
          }))}
          columns={[
            { title: "Sr. No.", dataIndex: "srNo", key: "srNo", width: 80 },
            { title: "Description", dataIndex: "desc", key: "desc" },
            { title: "Status", dataIndex: "status", key: "status" }
          ]}
          pagination={false}
          size="small"
          bordered
          className="mb-6"
        />

        <Title level={5}>
          Charging/Discharging Amount: 
          <Input 
            style={{ width: 100, marginLeft: 8 }} 
            size="small" 
            value={formData.charging_discharging_amount}
            onChange={(e) => handleInputChange('charging_discharging_amount', e.target.value)}
          /> AH
        </Title>
        
        <Table
          dataSource={[
            { key: 0, label: "Signature", field: "signature" },
            { key: 1, label: "Name", field: "name" },
            { key: 2, label: "Date", field: "date" },
            { key: 3, label: "Company", field: "company" }
          ]}
          columns={[
            { title: "", dataIndex: "label", key: "label" },
            { 
              title: "Tested By", 
              dataIndex: "one", 
              key: "one", 
              render: (_: any, record) => (
                <Input 
                  size="small" 
                  value={formData[`tested_by_${record.field}` as keyof typeof formData] as string}
                  onChange={(e) => handleInputChange(`tested_by_${record.field}`, e.target.value)}
                />
              )
            },
            { 
              title: "Witnessed By", 
              dataIndex: "two", 
              key: "two", 
              render: (_: any, record) => (
                <Input 
                  size="small" 
                  value={formData[`witness1_${record.field}` as keyof typeof formData] as string}
                  onChange={(e) => handleInputChange(`witness1_${record.field}`, e.target.value)}
                />
              )
            },
            { 
              title: "Witnessed By", 
              dataIndex: "three", 
              key: "three", 
              render: (_: any, record) => (
                <Input 
                  size="small" 
                  value={formData[`witness2_${record.field}` as keyof typeof formData] as string}
                  onChange={(e) => handleInputChange(`witness2_${record.field}`, e.target.value)}
                />
              )
            },
            { 
              title: "Witnessed By", 
              dataIndex: "four", 
              key: "four", 
              render: (_: any, record) => (
                <Input 
                  size="small" 
                  value={formData[`witness3_${record.field}` as keyof typeof formData] as string}
                  onChange={(e) => handleInputChange(`witness3_${record.field}`, e.target.value)}
                />
              )
            }
          ]}
          pagination={false}
          size="small"
          bordered
          className="mb-6"
        />

        <Title level={5} className="mb-2">Battery Cell Test Results</Title>
        <Table
          dataSource={formData.cell_test_data}
          columns={[
            { title: "Cell No.", dataIndex: "cellNo", key: "cellNo", width: 100 },
            { 
              title: "Specific Gravity", 
              dataIndex: "gravity", 
              key: "gravity", 
              render: (_: any, record) => (
                <Input 
                  size="small" 
                  value={formData.cell_test_data[record.key]?.gravity || ''}
                  onChange={(e) => handleCellTestChange(record.key, 'gravity', e.target.value)}
                />
              )
            },
            { 
              title: "Voltage", 
              dataIndex: "voltage", 
              key: "voltage", 
              render: (_: any, record) => (
                <Input 
                  size="small" 
                  value={formData.cell_test_data[record.key]?.voltage || ''}
                  onChange={(e) => handleCellTestChange(record.key, 'voltage', e.target.value)}
                />
              )
            },
            { 
              title: "Temp °C", 
              dataIndex: "temp", 
              key: "temp", 
              render: (_: any, record) => (
                <Input 
                  size="small" 
                  value={formData.cell_test_data[record.key]?.temp || ''}
                  onChange={(e) => handleCellTestChange(record.key, 'temp', e.target.value)}
                />
              )
            }
          ]}
          pagination={false}
          size="small"
          bordered
          className="mb-6"
        />

        <Table
          dataSource={[
            { key: 0, label: "Signature", field: "signature" },
            { key: 1, label: "Name", field: "name" },
            { key: 2, label: "Date", field: "date" },
            { key: 3, label: "Company", field: "company" }
          ]}
          columns={[
            { title: "", dataIndex: "label", key: "label" },
            { 
              title: "Signed By", 
              dataIndex: "one", 
              key: "one", 
              render: (_: any, record) => (
                <Input 
                  size="small" 
                  value={formData[`signed_by_${record.field}` as keyof typeof formData] as string}
                  onChange={(e) => handleInputChange(`signed_by_${record.field}`, e.target.value)}
                />
              )
            },
            { 
              title: "Witnessed By", 
              dataIndex: "two", 
              key: "two", 
              render: (_: any, record) => (
                <Input 
                  size="small" 
                  value={formData[`witness4_${record.field}` as keyof typeof formData] as string}
                  onChange={(e) => handleInputChange(`witness4_${record.field}`, e.target.value)}
                />
              )
            },
            { 
              title: "Witnessed By", 
              dataIndex: "three", 
              key: "three", 
              render: (_: any, record) => (
                <Input 
                  size="small" 
                  value={formData[`witness5_${record.field}` as keyof typeof formData] as string}
                  onChange={(e) => handleInputChange(`witness5_${record.field}`, e.target.value)}
                />
              )
            },
            { 
              title: "Witnessed By", 
              dataIndex: "four", 
              key: "four", 
              render: (_: any, record) => (
                <Input 
                  size="small" 
                  value={formData[`witness6_${record.field}` as keyof typeof formData] as string}
                  onChange={(e) => handleInputChange(`witness6_${record.field}`, e.target.value)}
                />
              )
            }
          ]}
          pagination={false}
          size="small"
          bordered
          className="mb-6"
        />
      </Card>
    </PageLayout>
  );
}