import React, { useState, useEffect } from 'react';
import { Input, Checkbox, Button, message } from 'antd';
import { useNavigate, useParams } from "react-router-dom";
import { SaveOutlined, DownloadOutlined } from "@ant-design/icons";
import PageLayout from '@common/components/PageLayout';
import { inspectionService } from '../../services/inspectionService';

const checkPoints = [
  "Check for physical damage of the cables",
  "Check cable make, size, voltage grade, conductor & insulation type as per design/specifications",
  "Check Cable route as per drawings",
  "Adequate looping at the termination ends",
  "Check that DWC Pipes Should be sealed",
  "Check for proper Dressing of the cables",
  "Check the cable should be laid on blocks",
  "Check tightness of the cable terminations at connection",
  "Check the cable gland tightness sealed to cover any openings or leaks observed",
  "Check Feruling as per drawing",
  "Check Cable tag should as per Drawing"
];

export default function ControlCableChecklistForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    drawing_specification_no: '',
    site_location_area: '',
    // Checklist items (11 items)
    check_0_yes: false, check_0_no: false, check_0_na: false, check_0_remarks: '',
    check_1_yes: false, check_1_no: false, check_1_na: false, check_1_remarks: '',
    check_2_yes: false, check_2_no: false, check_2_na: false, check_2_remarks: '',
    check_3_yes: false, check_3_no: false, check_3_na: false, check_3_remarks: '',
    check_4_yes: false, check_4_no: false, check_4_na: false, check_4_remarks: '',
    check_5_yes: false, check_5_no: false, check_5_na: false, check_5_remarks: '',
    check_6_yes: false, check_6_no: false, check_6_na: false, check_6_remarks: '',
    check_7_yes: false, check_7_no: false, check_7_na: false, check_7_remarks: '',
    check_8_yes: false, check_8_no: false, check_8_na: false, check_8_remarks: '',
    check_9_yes: false, check_9_no: false, check_9_na: false, check_9_remarks: '',
    check_10_yes: false, check_10_no: false, check_10_na: false, check_10_remarks: '',
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
      const response = await inspectionService.getControlCableChecklistForm(id!);
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
        await inspectionService.updateControlCableChecklistForm(id!, formData);
        message.success('Form updated successfully');
      } else {
        await inspectionService.createControlCableChecklistForm(formData);
        message.success('Form created successfully');
      }
      navigate('/inspection/control-cable-checklist-forms');
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
    { title: 'Control Cable Checklist Forms', href: '/inspection/control-cable-checklist-forms' },
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
      title={isEdit ? 'Edit Control Cable Checklist' : 'New Control Cable Checklist'}
      breadcrumbs={breadcrumbs}
      actions={headerActions}
    >
      <div className="max-w-[960px] mx-auto p-6 bg-gray-50 rounded-md shadow-md text-gray-700 font-sans text-sm">
        {/* Header */}
        <div className="border border-gray-400 rounded-md p-4 mb-6 text-xs">
          <div className="flex items-center gap-4 mb-4">
            <img src="/logo.png" alt="Company Logo" className="w-[60px]" />
            <h2 className="text-base font-extrabold uppercase tracking-wide text-gray-800">
              Installation Checklist for Control Cable
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-4 text-gray-700">
            <div><strong>Form No.:</strong> IMS/FOR/PR/055</div>
            <div><strong>Rev.:</strong> 00</div>
            <div><strong>Date:</strong> 14.03.2024</div>
          </div>
        </div>

        {/* Drawing Info */}
        <table className="w-full border border-gray-400 border-collapse mb-8 table-fixed">
          <tbody>
            <tr>
              <td className="border border-gray-400 p-3 font-medium bg-gray-50 w-1/2">Drawing / Specification No.:</td>
              <td className="border border-gray-400 p-3">
                <Input
                  placeholder="Enter drawing number"
                  bordered={false}
                  className="border-b border-gray-400 rounded-none px-1 py-1"
                  value={formData.drawing_specification_no}
                  onChange={(e) => handleInputChange('drawing_specification_no', e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td className="border border-gray-400 p-3 font-medium bg-gray-50">Site Location / Area:</td>
              <td className="border border-gray-400 p-3">
                <Input
                  placeholder="Enter site location"
                  bordered={false}
                  className="border-b border-gray-400 rounded-none px-1 py-1"
                  value={formData.site_location_area}
                  onChange={(e) => handleInputChange('site_location_area', e.target.value)}
                />
              </td>
            </tr>
          </tbody>
        </table>

        {/* Checklist */}
        <table className="w-full border border-gray-400 border-collapse mb-8 table-fixed">
          <colgroup>
            <col style={{ width: '5%' }} />
            <col style={{ width: '55%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-400 p-2 text-center font-semibold">Sr. No.</th>
              <th className="border border-gray-400 p-2 text-left font-semibold">Check Points</th>
              <th className="border border-gray-400 p-2 text-center font-semibold">Yes</th>
              <th className="border border-gray-400 p-2 text-center font-semibold">No</th>
              <th className="border border-gray-400 p-2 text-center font-semibold">N/A</th>
              <th className="border border-gray-400 p-2 text-left font-semibold">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {checkPoints.map((point, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border border-gray-300 p-2 text-center">{idx + 1}</td>
                <td className="border border-gray-300 p-2">{point}</td>
                <td className="border border-gray-300 p-2 text-center">
                  <Checkbox 
                    checked={formData[`check_${idx}_yes` as keyof typeof formData] as boolean}
                    onChange={(e) => handleInputChange(`check_${idx}_yes`, e.target.checked)}
                  />
                </td>
                <td className="border border-gray-300 p-2 text-center">
                  <Checkbox 
                    checked={formData[`check_${idx}_no` as keyof typeof formData] as boolean}
                    onChange={(e) => handleInputChange(`check_${idx}_no`, e.target.checked)}
                  />
                </td>
                <td className="border border-gray-300 p-2 text-center">
                  <Checkbox 
                    checked={formData[`check_${idx}_na` as keyof typeof formData] as boolean}
                    onChange={(e) => handleInputChange(`check_${idx}_na`, e.target.checked)}
                  />
                </td>
                <td className="border border-gray-300 p-2">
                  <Input
                    placeholder="Remarks"
                    bordered={false}
                    className="border-b border-gray-400 rounded-none px-1 py-1"
                    value={formData[`check_${idx}_remarks` as keyof typeof formData] as string}
                    onChange={(e) => handleInputChange(`check_${idx}_remarks`, e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Comments Section */}
        <div className="mb-8">
          <p className="font-semibold text-gray-800 mb-1">Comments / Remarks:</p>
          <Input.TextArea 
            rows={4} 
            value={formData.comments}
            onChange={(e) => handleInputChange('comments', e.target.value)}
          />
        </div>

        {/* Signature Table */}
        <table className="w-full border border-gray-400 border-collapse text-center mb-8">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-400 p-2"></th>
              <th className="border border-gray-400 p-2">Checked By</th>
              <th className="border border-gray-400 p-2">Witnessed By</th>
              <th className="border border-gray-400 p-2">Witnessed By</th>
              <th className="border border-gray-400 p-2">Witnessed By</th>
            </tr>
          </thead>
          <tbody>
            {['signature', 'name', 'date', 'company'].map((label, i) => (
              <tr key={i}>
                <td className="border border-gray-300 p-2 font-medium bg-gray-50 capitalize">{label}</td>
                <td className="border border-gray-300 p-2">
                  <Input
                    placeholder={label}
                    bordered={false}
                    className="text-center border-b border-gray-400 rounded-none px-1 py-1"
                    value={formData[`checked_by_${label}` as keyof typeof formData] as string}
                    onChange={(e) => handleInputChange(`checked_by_${label}`, e.target.value)}
                  />
                </td>
                {[1, 2, 3].map((witnessNum) => (
                  <td key={witnessNum} className="border border-gray-300 p-2">
                    <Input
                      placeholder={label}
                      bordered={false}
                      className="text-center border-b border-gray-400 rounded-none px-1 py-1"
                      value={formData[`witness${witnessNum}_${label}` as keyof typeof formData] as string}
                      onChange={(e) => handleInputChange(`witness${witnessNum}_${label}`, e.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageLayout>
  );
}