import React, { useRef } from "react";
import { Form, Input, Table, Button, DatePicker, message } from "antd";
import { useNavigate } from "react-router-dom";
import { DownloadOutlined, CloseOutlined } from '@ant-design/icons';
import { inspectionService } from '../../services/inspectionService';
import PageLayout from '@common/components/PageLayout';

const dataSource = [
  'Reinforcement', 'Cement', '20mm Aggregate', '10 mm Aggregate', 'Sand',
  'Mixture machine', 'Vibrator + needle', 'Supervisors (Contractor) at Execution place',
  'Cube moulds at location', 'Mixture machine operator', 'Skilled masons', 'Labors for casting location',
  'Slump cone with tamping rod', 'Table vibrator at location', 'Lighting arrangement at location',
  'Auto level', 'Shuttering with support', 'Gunny bags', 'Welding machine', 'Water tank',
  'Cube test machine', 'Weight machine', 'Measuring Tape', 'Bituminous paint'
].map((item, idx) => ({
  key: idx + 1,
  srNo: idx + 1,
  description: item,
  uom:
    item === 'Cement' ? 'Ton/bag' :
    item === 'Bituminous paint' ? 'kg' :
    ['Lighting arrangement at location', 'Shuttering with support'].includes(item) ? 'Yes/No' :
    "Nos",
}));

const CivilWorkChecklistForm: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const componentRef = useRef(null);

  const handleCancel = () => {
    navigate("/dashboard/inspection/forms/civil-work-checklist/list");
  };

  const handleDownload = () => {
    window.print();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await inspectionService.createCivilWorkChecklistForm(values);
      message.success("Civil Work Checklist submitted successfully!");
      navigate("/dashboard/inspection/forms/civil-work-checklist/list");
    } catch (error) {
      message.error('Failed to submit form');
    }
  };

  return (
    <PageLayout
      title="Civil Work Checklist"
      subtitle="Civil Work Checklist - Before Start of Work"
      breadcrumbs={[
        { title: 'Inspection', href: '/dashboard/inspection' },
        { title: 'Civil Work Checklist', href: '/dashboard/inspection/forms/civil-work-checklist/list' },
        { title: 'Create' }
      ]}
      actions={[
        <Button key="download" icon={<DownloadOutlined />} onClick={handleDownload}>Download</Button>,
        <Button key="cancel" danger icon={<CloseOutlined />} onClick={handleCancel}>Cancel</Button>
      ]}
    >
      <div ref={componentRef} className="bg-white p-6 rounded-lg shadow max-w-6xl mx-auto">
        <Form form={form} layout="vertical">
          {/* Header */}
          <div className="border border-black p-4 mb-6 flex items-center">
            <div className="w-1/6 flex justify-center">
              <img src="/logo.png" alt="Prozeal Logo" className="h-20 object-contain" />
            </div>
            <div className="w-2/3 text-center border-x border-black px-4">
              <h2 className="text-lg font-bold m-0">Prozeal Green Energy Pvt. Ltd.</h2>
              <p className="font-semibold">CIVIL WORK CHECKLIST - BEFORE START OF WORK</p>
            </div>
            <div className="w-1/6 text-right text-sm space-y-1">
              <div>IMS/FOR/PR/002</div>
              <hr className="my-1" />
              <div>Rev. No.: 00</div>
              <hr className="my-1" />
              <div>Rev. Date: 01.06.2023</div>
            </div>
          </div>

          {/* Project Details */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Form.Item label="Date" name="date">
              <DatePicker className="w-full" />
            </Form.Item>
            <Form.Item label="Contractor Name" name="contractor_name">
              <Input />
            </Form.Item>
            <Form.Item label="Location No." name="location_no">
              <Input />
            </Form.Item>
            <Form.Item label="Project Code" name="project_code">
              <Input />
            </Form.Item>
            <Form.Item label="Customer Name" name="customer_name" className="col-span-2">
              <Input />
            </Form.Item>
          </div>

          {/* Materials Checklist Table */}
          <Table
            dataSource={dataSource}
            bordered
            size="small"
            pagination={false}
            columns={[
              { title: "Sr. No.", dataIndex: "srNo", key: "srNo", width: 70, align: "center" },
              { title: "Item Description", dataIndex: "description", key: "description" },
              { title: "UOM", dataIndex: "uom", key: "uom", width: 100, align: "center" },
              {
                title: "Min Req. Qty.",
                key: "minReq",
                render: (_: any, record, index) => (
                  <Form.Item name={`item_${index}_min_qty`} className="mb-0">
                    <Input size="small" />
                  </Form.Item>
                ),
              },
              {
                title: "Available Qty.",
                key: "availableQty",
                render: (_: any, record, index) => (
                  <Form.Item name={`item_${index}_available_qty`} className="mb-0">
                    <Input size="small" />
                  </Form.Item>
                ),
              },
              {
                title: "Remarks",
                key: "remarks",
                render: (_: any, record, index) => (
                  <Form.Item name={`item_${index}_remarks`} className="mb-0">
                    <Input size="small" />
                  </Form.Item>
                ),
              },
            ]}
            className="mb-6"
          />

          {/* Remarks */}
          <Form.Item label="Remarks/Comments" name="general_remarks">
            <Input.TextArea rows={4} />
          </Form.Item>

          {/* Signatures Table */}
          <Table
            bordered
            size="small"
            pagination={false}
            columns={[
              { title: "Checked by", dataIndex: "checkedBy", key: "checkedBy", align: "center" },
              { title: "Contractor", dataIndex: "contractor", key: "contractor", align: "center" },
              { title: "Prozeal Green", dataIndex: "prozeal", key: "prozeal", align: "center" },
              { title: "Client", dataIndex: "client", key: "client", align: "center" },
            ]}
            dataSource={[
              {
                key: 1,
                checkedBy: "Name:",
                contractor: <Form.Item name="contractor_name_sig" className="mb-0"><Input size="small" /></Form.Item>,
                prozeal: <Form.Item name="prozeal_name_sig" className="mb-0"><Input size="small" /></Form.Item>,
                client: <Form.Item name="client_name_sig" className="mb-0"><Input size="small" /></Form.Item>,
              },
              {
                key: 2,
                checkedBy: "Signature:",
                contractor: <Form.Item name="contractor_signature" className="mb-0"><Input size="small" /></Form.Item>,
                prozeal: <Form.Item name="prozeal_signature" className="mb-0"><Input size="small" /></Form.Item>,
                client: <Form.Item name="client_signature" className="mb-0"><Input size="small" /></Form.Item>,
              },
            ]}
            className="mb-6"
          />

          {/* Submit Button */}
          <div className="flex justify-center">
            <Button type="primary" size="large" onClick={handleSubmit} className="px-16 py-4 rounded-xl">
              Submit
            </Button>
          </div>
        </Form>
      </div>
    </PageLayout>
  );
};

export default CivilWorkChecklistForm;