import React, { useState, useEffect } from "react";
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Typography,
  message,
  Modal,
} from "antd";
import { EyeOutlined, DownloadOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate } from "react-router-dom";
import { inspectionService } from '../../services/inspectionService';
import useAuthStore from '@common/store/authStore';
import api from '@common/utils/axiosetup';
import PageLayout from '@common/components/PageLayout';
import DigitalSignature from '../../../../components/DigitalSignature';
import InspectionPrintPreview from '../InspectionPrintPreview';

const { Title } = Typography;

const checkListItems = [
  "Insulation resistance measurement before Hi-Pot test found within limits",
  "Hi-pot test results found within limits",
  "Insulation resistance measurement after Hi-Pot test found within limits",
  "After hi-pot test cable conductors are connected with earth until the termination",
  "Sealing of extra gland holes, conduit pipes etc.",
  "Removal of scraps from the area & clean the area. (As Applicable)",
];

const ACCableInspectionForm: React.FC = () => {
  const [form] = Form.useForm();
  const [page, setPage] = useState(1);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const navigate = useNavigate();
  const { username } = useAuthStore();

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        // Fetch user details and company data
        const [userResponse, companyResponse] = await Promise.all([
          api.get('/authentication/userdetail/'),
          api.get('/authentication/company-data/')
        ]);
        
        const userDetails = userResponse.data;
        const companyData = companyResponse.data;
        
        // Get signature template URL from API
        let signatureTemplate = null;
        
        try {
          const sigResponse = await api.get('/authentication/signature/template/preview/');
          if (sigResponse.data.success && sigResponse.data.template_url) {
            signatureTemplate = sigResponse.data.template_url.startsWith('http') 
              ? sigResponse.data.template_url 
              : `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}${sigResponse.data.template_url}`;
          }
        } catch (error) {
        }
        
        
        setUserDetails({
          ...userDetails,
          company_name: companyData.company_name,
          signature_template: signatureTemplate,
          logo_url: companyData.company_logo ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}${companyData.company_logo}` : null
        });
        
        // Auto-fill tested by fields with current user info
        const currentDate = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY format
        form.setFieldsValue({
          tested_by_name: userDetails.name || username,
          tested_by_company: companyData.company_name || '',
          tested_by_date: currentDate,
        });
      } catch (error) {
        // Fallback values
        const currentDate = new Date().toLocaleDateString('en-GB');
        form.setFieldsValue({
          tested_by_name: username,
          tested_by_company: '',
          tested_by_date: currentDate,
        });
      }
    };

    fetchUserDetails();
  }, [form, username]);

  const handleNext = () => setPage(2);
  const handlePrevious = () => setPage(1);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await inspectionService.createACCableForm(values);
      message.success("✅ AC Cable Testing Form submitted successfully!");
      form.resetFields();
      navigate("/dashboard/inspection/forms/ac-cable-testing/list");
    } catch (error) {
      message.error('Failed to submit form');
    }
  };

  const handleCancel = () => {
    form.resetFields();
    message.info("Form reset.");
    navigate("/dashboard/inspection/forms/ac-cable-testing/list");
  };

  const handleDownload = () => {
    message.info("Download started...");
  };

  return (
    <PageLayout
      title={page === 1 ? "AC Cable Testing - Page 1" : "AC Cable Testing - Page 2"}
      subtitle={page === 1 ? "Inspection Observation Card – AC Cable (Testing)" : "Pre-Commissioning Checklist – AC Cable (Testing)"}
      breadcrumbs={[
        { title: 'Inspection', href: '/dashboard/inspection' },
        { title: 'AC Cable Testing', href: '/dashboard/inspection/forms/ac-cable-testing/list' },
        { title: 'Create' }
      ]}
      actions={[
        <InspectionPrintPreview key="print-preview" />,
        <Button key="download" type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>Download PDF</Button>,
        <Button key="cancel" danger icon={<CloseOutlined />} onClick={handleCancel}>Cancel</Button>
      ]}
    >
      <Card className="bg-white">

        <Form layout="vertical" form={form}>
          {page === 1 ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <Form.Item label="Contractor" name="contractor" className="mb-4">
                  <Input size="large" />
                </Form.Item>
                <Form.Item label="Date" name="date" className="mb-4">
                  <DatePicker size="large" className="w-full" />
                </Form.Item>
                <Form.Item label="Block No." name="block" className="mb-4">
                  <Input size="large" />
                </Form.Item>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                <Form.Item label="Work Description" name="workDescription" className="mb-4">
                  <Input size="large" defaultValue="AC Cable Laying (Testing)" />
                </Form.Item>
                <Form.Item label="Ref Drg No." name="refDrgNo" className="mb-4">
                  <Input size="large" />
                </Form.Item>
                <Form.Item label="Cable Size" name="cableSize" className="mb-4">
                  <Input size="large" />
                </Form.Item>
                <Form.Item label="From / To" name="fromTo" className="mb-4">
                  <Input size="large" placeholder="From - To" />
                </Form.Item>
              </div>

              <Title level={4} className="text-gray-700 mb-6 border-b pb-2">⚙️ Instrument Details</Title>
              {["Digital Insulation Tester", "Hi-Pot test kit", "Digital Multimeter"].map((item, index) => (
                <div key={index} className="mb-6">
                  <Title level={5} className="text-gray-600 mb-4">{item}</Title>
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <Form.Item label="Make" name={`instrument_make_${index}`} className="mb-4">
                      <Input size="large" />
                    </Form.Item>
                    <Form.Item label="Range / Rating" name={`instrument_range_${index}`} className="mb-4">
                      <Input size="large" />
                    </Form.Item>
                    <Form.Item label="Sl. No." name={`instrument_serial_${index}`} className="mb-4">
                      <Input size="large" />
                    </Form.Item>
                    <Form.Item label="Calibration Due Date" name={`instrument_calibration_${index}`} className="mb-4">
                      <Input size="large" />
                    </Form.Item>
                  </div>
                </div>
              ))}

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
                <p className="text-yellow-800 font-semibold">
                  ⚠️ CAUTION: Make sure nobody touches cables at both ends during Meggaring / Hi-Pot Test
                </p>
              </div>

              <Title level={4} className="text-gray-700 mb-6 border-b pb-2">📄 Test Report</Title>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {["IR Value Before Hi-Pot", "Hi-Pot Test", "IR Value After Hi-Pot"].map((label, idx) => (
                  <Form.Item
                    key={idx}
                    label={label}
                    name={`test_${idx}`}
                    className="mb-4"
                  >
                    <Input.TextArea 
                      size="large" 
                      rows={4} 
                      placeholder="R-Y / Y-B / B-E / R-E / Y-E / B-E2"
                    />
                  </Form.Item>
                ))}
              </div>

              <div className="flex justify-end mt-8 pt-6 border-t">
                <Button type="primary" size="large" onClick={handleNext}>
                  Next Page →
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {checkListItems.map((item, idx) => (
                  <Form.Item
                    key={idx}
                    label={`#${idx + 1}. ${item}`}
                    name={`check_${idx}`}
                  >
                    <Input placeholder="Observation" />
                  </Form.Item>
                ))}
              </div>

              <Form.Item label="Remarks" name="remarks">
                <Input.TextArea rows={3} />
              </Form.Item>

              <Title level={4} className="text-gray-700 mb-6 border-b pb-2">✅ Verification & Approval</Title>
              <div className="mb-8">
                <table className="w-full border-collapse border border-gray-400">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-400 p-3 text-left font-semibold"></th>
                      <th className="border border-gray-400 p-3 text-center font-semibold">Tested By</th>
                      <th className="border border-gray-400 p-3 text-center font-semibold">Witnessed By</th>
                      <th className="border border-gray-400 p-3 text-center font-semibold">Witnessed By</th>
                      <th className="border border-gray-400 p-3 text-center font-semibold">Witnessed By</th>
                      <th className="border border-gray-400 p-3 text-center font-semibold">Witnessed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-400 p-3 font-semibold bg-gray-50">Signature</td>
                      <td className="border border-gray-400 p-1">
                        <Form.Item name="tested_by_signature" className="mb-0" style={{ height: 'auto' }}>
                          <div style={{ transform: 'scale(0.7)', transformOrigin: 'top left', width: '143%', height: 'auto', overflow: 'hidden' }}>
                            <DigitalSignature 
                              signerName={userDetails?.name || username}
                              designation={userDetails?.designation}
                              companyName={userDetails?.company_name}
                              date={new Date().toLocaleDateString('en-CA')}
                              time={new Date().toLocaleTimeString('en-GB')}
                              logoUrl={userDetails?.logo_url}
                              employeeId={userDetails?.employee_id}
                            />
                          </div>
                        </Form.Item>
                      </td>
                      <td className="border border-gray-400 p-1">
                        <Form.Item name="witness1_signature" className="mb-0">
                          <Input className="border-0" placeholder="" />
                        </Form.Item>
                      </td>
                      <td className="border border-gray-400 p-1">
                        <Form.Item name="witness2_signature" className="mb-0">
                          <Input className="border-0" placeholder="" />
                        </Form.Item>
                      </td>
                      <td className="border border-gray-400 p-1">
                        <Form.Item name="witness3_signature" className="mb-0">
                          <Input className="border-0" placeholder="" />
                        </Form.Item>
                      </td>
                      <td className="border border-gray-400 p-1">
                        <Form.Item name="witness4_signature" className="mb-0">
                          <Input className="border-0" placeholder="" />
                        </Form.Item>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-400 p-3 font-semibold bg-gray-50">Name</td>
                      <td className="border border-gray-400 p-1">
                        <Form.Item name="tested_by_name" className="mb-0">
                          <Input className="border-0 bg-gray-50" placeholder="" readOnly />
                        </Form.Item>
                      </td>
                      <td className="border border-gray-400 p-1">
                        <Form.Item name="witness1_name" className="mb-0">
                          <Input className="border-0" placeholder="" />
                        </Form.Item>
                      </td>
                      <td className="border border-gray-400 p-1">
                        <Form.Item name="witness2_name" className="mb-0">
                          <Input className="border-0" placeholder="" />
                        </Form.Item>
                      </td>
                      <td className="border border-gray-400 p-1">
                        <Form.Item name="witness3_name" className="mb-0">
                          <Input className="border-0" placeholder="" />
                        </Form.Item>
                      </td>
                      <td className="border border-gray-400 p-1">
                        <Form.Item name="witness4_name" className="mb-0">
                          <Input className="border-0" placeholder="" />
                        </Form.Item>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-400 p-3 font-semibold bg-gray-50">Date</td>
                      <td className="border border-gray-400 p-1">
                        <Form.Item name="tested_by_date" className="mb-0">
                          <Input className="border-0 bg-gray-50" placeholder="" readOnly />
                        </Form.Item>
                      </td>
                      <td className="border border-gray-400 p-1">
                        <Form.Item name="witness1_date" className="mb-0">
                          <Input className="border-0" placeholder="" />
                        </Form.Item>
                      </td>
                      <td className="border border-gray-400 p-1">
                        <Form.Item name="witness2_date" className="mb-0">
                          <Input className="border-0" placeholder="" />
                        </Form.Item>
                      </td>
                      <td className="border border-gray-400 p-1">
                        <Form.Item name="witness3_date" className="mb-0">
                          <Input className="border-0" placeholder="" />
                        </Form.Item>
                      </td>
                      <td className="border border-gray-400 p-1">
                        <Form.Item name="witness4_date" className="mb-0">
                          <Input className="border-0" placeholder="" />
                        </Form.Item>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-400 p-3 font-semibold bg-gray-50">Company</td>
                      <td className="border border-gray-400 p-1">
                        <Form.Item name="tested_by_company" className="mb-0">
                          <Input className="border-0 bg-gray-50" placeholder="" readOnly />
                        </Form.Item>
                      </td>
                      <td className="border border-gray-400 p-1">
                        <Form.Item name="witness1_company" className="mb-0">
                          <Input className="border-0" placeholder="" />
                        </Form.Item>
                      </td>
                      <td className="border border-gray-400 p-1">
                        <Form.Item name="witness2_company" className="mb-0">
                          <Input className="border-0" placeholder="" />
                        </Form.Item>
                      </td>
                      <td className="border border-gray-400 p-1">
                        <Form.Item name="witness3_company" className="mb-0">
                          <Input className="border-0" placeholder="" />
                        </Form.Item>
                      </td>
                      <td className="border border-gray-400 p-1">
                        <Form.Item name="witness4_company" className="mb-0">
                          <Input className="border-0" placeholder="" />
                        </Form.Item>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between mt-6">
                <Button onClick={handlePrevious}>
                  Previous Page
                </Button>
                <Button type="primary" onClick={handleSubmit}>
                  Submit Form
                </Button>
              </div>
            </>
          )}
        </Form>
      </Card>
      
      <Modal
        title="Digital Signature Preview"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={600}
        centered
      >
        {userDetails?.signature_template && (
          <div className="flex justify-center p-4">
            <img 
              src={userDetails.signature_template.startsWith('http') ? userDetails.signature_template : `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}${userDetails.signature_template}`}
              alt="Digital Signature Preview" 
              className="max-w-full max-h-96 object-contain"
            />
          </div>
        )}
      </Modal>
    </PageLayout>
  );
};

export default ACCableInspectionForm;