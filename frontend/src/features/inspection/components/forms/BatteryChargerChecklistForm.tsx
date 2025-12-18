import React, { useState, useEffect } from 'react';
import { Card, Input, Table, Button, message, Checkbox } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { SaveOutlined, DownloadOutlined } from "@ant-design/icons";
import PageLayout from '@common/components/PageLayout';
import { inspectionService } from '../../services/inspectionService';

export default function BatteryChargerChecklistForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    drawing_specification_no: '',
    site_location_area: '',
    // Checklist items (18 items)
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
    check_11_yes: false, check_11_no: false, check_11_na: false, check_11_remarks: '',
    check_12_yes: false, check_12_no: false, check_12_na: false, check_12_remarks: '',
    check_13_yes: false, check_13_no: false, check_13_na: false, check_13_remarks: '',
    check_14_yes: false, check_14_no: false, check_14_na: false, check_14_remarks: '',
    check_15_yes: false, check_15_no: false, check_15_na: false, check_15_remarks: '',
    check_16_yes: false, check_16_no: false, check_16_na: false, check_16_remarks: '',
    check_17_yes: false, check_17_no: false, check_17_na: false, check_17_remarks: '',
    // Comments
    comments: '',
    // Signatures
    checked_by_signature: '', checked_by_name: '', checked_by_date: '', checked_by_company: '',
    witness1_signature: '', witness1_name: '', witness1_date: '', witness1_company: '',
    witness2_signature: '', witness2_name: '', witness2_date: '', witness2_company: '',
    witness3_signature: '', witness3_name: '', witness3_date: '', witness3_company: '',
    witness4_signature: '', witness4_name: '', witness4_date: '', witness4_company: ''
  });

  const batteryChecklistItems = [
    "Check & verify Battery & Charger panel lifting and its handling equipment",
    "Check Erection/installation manual available before installation",
    "Check for correctness of foundation as per drawing",
    "Check for level and alignment of the foundation & base frame",
    "Adequate space should be provided for effective ventilation and to carry out the maintenance work - Refer Approved drawings for installation",
    "Install the equipment as per approved drawings",
    "Check for series connection of equipment",
    "Check for the tightness of Bus Bars with torque wrench as specified by manufacturer instruction/ design drawings",
    "Check for proper earthing as per drawing",
    "Check that all unused holes are sealed to cover any openings or leaks observed",
    "Check completion of all wiring & the cable tags, ferrules are provided as per cable schedule",
    "Check for polarity of DC and phase sequence of AC sources",
    "Check for all cables are tightened properly",
    "Check door earthing as per drawing",
    "Check for the Work area displayed with danger boards and necessary barricading provided",
    "Touch up painting applied if required",
    "Labels installed on enclosure as per drawing",
    "Check for availability of OEM drawing and test reports"
  ];

  useEffect(() => {
    if (isEdit && id) {
      fetchForm();
    }
  }, [id, isEdit]);

  const fetchForm = async () => {
    try {
      setLoading(true);
      const response = await inspectionService.getBatteryChargerChecklistForm(id!);
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
        await inspectionService.updateBatteryChargerChecklistForm(id!, formData);
        message.success('Form updated successfully');
      } else {
        await inspectionService.createBatteryChargerChecklistForm(formData);
        message.success('Form created successfully');
      }
      navigate('/inspection/battery-charger-checklist-forms');
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
    { title: 'Battery Charger Checklist Forms', href: '/inspection/battery-charger-checklist-forms' },
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
      title={isEdit ? 'Edit Battery Charger Installation Checklist' : 'New Battery Charger Installation Checklist'}
      breadcrumbs={breadcrumbs}
      actions={headerActions}
    >
      <Card className="shadow-lg">
        {/* Header */}
        <div className="border border-black p-2 mb-4">
          <table className="w-full text-center">
            <tbody>
              <tr>
                <td rowSpan={3} className="w-[120px] border border-black">
                  <img src="" alt="Logo" className="h-24 object-contain mx-auto" />
                </td>
                <td rowSpan={3} className="border border-black align-middle">
                  <div className="font-bold text-base">
                    INSTALLATION CHECKLIST FOR BATTERY BANK & BATTERY CHARGER
                  </div>
                </td>
                <td className="border border-black font-bold align-top">IMS/FOR/PR/082</td>
              </tr>
              <tr>
                <td className="border border-black font-bold align-top">Rev.00</td>
              </tr>
              <tr>
                <td className="border border-black font-bold align-top">Date. 14.03.2024</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Details Section */}
        <div className="border border-black p-2 mb-4">
          <table className="w-full">
            <tbody>
              <tr>
                <td className="border border-black p-2 font-semibold w-1/3">Drawing / Specification No.:</td>
                <td className="border border-black p-2">
                  <Input 
                    value={formData.drawing_specification_no}
                    onChange={(e) => handleInputChange('drawing_specification_no', e.target.value)}
                  />
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-semibold">Site Location / Area:</td>
                <td className="border border-black p-2">
                  <Input 
                    value={formData.site_location_area}
                    onChange={(e) => handleInputChange('site_location_area', e.target.value)}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Checklist Section */}
        <div className="border border-black p-2 mb-4">
          <table className="w-full border border-black text-center text-xs">
            <thead>
              <tr className="bg-gray-100 font-semibold">
                <th className="border border-black px-2 py-1" rowSpan={2}>Sr. No.</th>
                <th className="border border-black px-2 py-1" rowSpan={2}>CHECK POINTS</th>
                <th className="border border-black px-2 py-1" colSpan={3}>Status (✔)(×)</th>
                <th className="border border-black px-2 py-1" rowSpan={2}>Remarks</th>
              </tr>
              <tr className="bg-gray-100 font-semibold">
                <th className="border border-black px-1 py-1">Yes</th>
                <th className="border border-black px-1 py-1">No</th>
                <th className="border border-black px-1 py-1">N/A</th>
              </tr>
            </thead>
            <tbody>
              {batteryChecklistItems.map((item, idx) => (
                <tr key={idx}>
                  <td className="border border-black px-2 py-1">{idx + 1}</td>
                  <td className="border border-black text-left px-2 py-1">{item}</td>
                  <td className="border border-black">
                    <Checkbox 
                      checked={formData[`check_${idx}_yes` as keyof typeof formData] as boolean}
                      onChange={(e) => handleInputChange(`check_${idx}_yes`, e.target.checked)}
                    />
                  </td>
                  <td className="border border-black">
                    <Checkbox 
                      checked={formData[`check_${idx}_no` as keyof typeof formData] as boolean}
                      onChange={(e) => handleInputChange(`check_${idx}_no`, e.target.checked)}
                    />
                  </td>
                  <td className="border border-black">
                    <Checkbox 
                      checked={formData[`check_${idx}_na` as keyof typeof formData] as boolean}
                      onChange={(e) => handleInputChange(`check_${idx}_na`, e.target.checked)}
                    />
                  </td>
                  <td className="border border-black">
                    <Input 
                      value={formData[`check_${idx}_remarks` as keyof typeof formData] as string}
                      onChange={(e) => handleInputChange(`check_${idx}_remarks`, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Comments */}
        <div className="border border-black p-2 mb-4">
          <b>Comments/ Remarks:</b>
          <Input.TextArea 
            className="w-full mt-1 border border-black p-2 h-24 resize-none" 
            value={formData.comments}
            onChange={(e) => handleInputChange('comments', e.target.value)}
          />
        </div>

        {/* Signatures */}
        <div className="border border-black p-2">
          <table className="w-full border border-black text-center text-xs">
            <thead>
              <tr className="bg-gray-100 font-semibold">
                <th className="border border-black px-2 py-1">Checked By</th>
                <th className="border border-black px-2 py-1" colSpan={4}>Witnessed By</th>
              </tr>
            </thead>
            <tbody>
              {["signature", "name", "date", "company"].map((label, idx) => (
                <tr key={idx}>
                  <td className="border border-black font-semibold px-2 py-1 capitalize">{label}</td>
                  <td className="border border-black px-1 py-1">
                    <Input 
                      value={formData[`checked_by_${label}` as keyof typeof formData] as string}
                      onChange={(e) => handleInputChange(`checked_by_${label}`, e.target.value)}
                    />
                  </td>
                  {Array(4).fill(0).map((_, i) => (
                    <td key={i} className="border border-black px-1 py-1">
                      <Input 
                        value={formData[`witness${i+1}_${label}` as keyof typeof formData] as string}
                        onChange={(e) => handleInputChange(`witness${i+1}_${label}`, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PageLayout>
  );
}