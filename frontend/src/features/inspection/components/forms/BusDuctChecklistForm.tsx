import React, { useState, useEffect } from 'react';
import { Card, Input, Button, message } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { SaveOutlined, DownloadOutlined } from "@ant-design/icons";
import PageLayout from '@common/components/PageLayout';
import { inspectionService } from '../../services/inspectionService';

export default function BusDuctChecklistForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    client: '',
    location: '',
    date_of_testing: '',
    equipment_rating: '',
    ref_drawing_no: '',
    // Main checklist (12 items)
    check_0_remarks: '', check_1_remarks: '', check_2_remarks: '', check_3_remarks: '',
    check_4_remarks: '', check_5_remarks: '', check_6_remarks: '', check_7_remarks: '',
    check_8_remarks: '', check_9_remarks: '', check_10_remarks: '', check_11_remarks: '',
    // General checks (7 items)
    general_0_input: '', general_1_input: '', general_2_input: '', general_3_input: '',
    general_4_input: '', general_5_input: '', general_6_input: ''
  });

  const descriptions = [
    "Check for site physical layout as per drawing.",
    "Ensure that no fouling with civil / structural.",
    "Check the foundation readiness and level of foundation.",
    "Check for erection of Base frames",
    "Check for the tightness of inters panel bolting.",
    "Ensure the tightness of Bus bars.",
    "Check for Phase to Phase & Phase to earth Clearance",
    "Check proper earthing as per drawing.",
    "Check that all unused holes are sealed.",
    "Check the Busbar tightness",
    "Ensure that the Bus duct is cleaned and closed in all respect.",
    "All above procedure under proper safety surveillance."
  ];

  const generalChecks = [
    "Ensure that the erection work of the transformer and associated equipment is complete in all respect",
    "Check no part of transformer and associated equipment is damaged.",
    "Check that labeling and identification is permanent and satisfactory.",
    "Check that all external fittings are as per the Drawing",
    "Ensure all cables are tightly and correctly connected and proper glands are provided",
    "Ensure cooling fans working status",
    "Ensure all the holes are covered at the gland plate"
  ];

  useEffect(() => {
    if (isEdit && id) {
      fetchForm();
    }
  }, [id, isEdit]);

  const fetchForm = async () => {
    try {
      setLoading(true);
      const response = await inspectionService.getBusDuctChecklistForm(id!);
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
        await inspectionService.updateBusDuctChecklistForm(id!, formData);
        message.success('Form updated successfully');
      } else {
        await inspectionService.createBusDuctChecklistForm(formData);
        message.success('Form created successfully');
      }
      navigate('/inspection/bus-duct-checklist-forms');
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
    { title: 'Bus Duct Checklist Forms', href: '/inspection/bus-duct-checklist-forms' },
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
      title={isEdit ? 'Edit Bus Duct Checklist' : 'New Bus Duct Checklist'}
      breadcrumbs={breadcrumbs}
      actions={headerActions}
    >
      <Card className="shadow-lg">
        <div className="mx-auto w-full bg-white p-6 space-y-6 text-sm text-black border-4 border-black">
          {/* Header */}
          <table className="w-full border border-black text-xs">
            <tbody>
              <tr>
                <td rowSpan={4} className="border border-black w-[80px]">
                  <img src="" alt="Logo" className="h-20 mx-auto" />
                </td>
                <td colSpan={6} className="border border-black text-center font-bold">
                  PROZEAL GREEN ENERGY PVT LTD
                </td>
              </tr>
              <tr>
                <td className="border border-black font-semibold">Document Name:</td>
                <td colSpan={5} className="border border-black">Pre-Commissioning Checklist</td>
              </tr>
              <tr>
                <td className="border border-black font-semibold">Format No.</td>
                <td className="border border-black">: IMS/FOR/PR/079</td>
                <td className="border border-black font-semibold">Page No.:</td>
                <td className="border border-black">01</td>
                <td className="border border-black font-semibold">Issue No.:</td>
                <td className="border border-black">01</td>
              </tr>
              <tr>
                <td className="border border-black font-semibold">Issue Date:</td>
                <td className="border border-black">18-01-2024</td>
                <td className="border border-black font-semibold">Revision No.</td>
                <td className="border border-black">00</td>
                <td className="border border-black font-semibold">Revision Date:</td>
                <td className="border border-black">NA</td>
              </tr>
            </tbody>
          </table>

          {/* Title */}
          <h1 className="text-center font-bold underline">
            BUS DUCT AND AUXILIARY TRANSFORMER
          </h1>

          {/* Client Info */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            <div className="flex items-center space-x-2">
              <label className="w-40 text-right">Client:</label>
              <Input
                className="flex-1"
                value={formData.client}
                onChange={(e) => handleInputChange('client', e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="w-40 text-right">Location:</label>
              <Input
                className="flex-1"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="w-40 text-right">Date of Testing:</label>
              <Input
                type="date"
                className="flex-1"
                value={formData.date_of_testing}
                onChange={(e) => handleInputChange('date_of_testing', e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="w-40 text-right">Equipment Rating:</label>
              <Input
                className="flex-1"
                value={formData.equipment_rating}
                onChange={(e) => handleInputChange('equipment_rating', e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="w-40 text-right">Ref. Drawing No:</label>
              <Input
                className="flex-1"
                value={formData.ref_drawing_no}
                onChange={(e) => handleInputChange('ref_drawing_no', e.target.value)}
              />
            </div>
          </div>

          {/* Checklist Table */}
          <table className="w-full border border-black text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-2 py-1">Sr. No.</th>
                <th className="border border-black px-2 py-1">Description</th>
                <th className="border border-black px-2 py-1">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {descriptions.map((desc, idx) => (
                <tr key={idx}>
                  <td className="border border-black px-2 py-1 text-center">{idx + 1}</td>
                  <td className="border border-black px-2 py-1">{desc}</td>
                  <td className="border border-black px-2 py-1">
                    <Input
                      value={formData[`check_${idx}_remarks` as keyof typeof formData] as string}
                      onChange={(e) => handleInputChange(`check_${idx}_remarks`, e.target.value)}
                      placeholder="Remarks"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* General Checks Table */}
          <h2 className="font-semibold">General Checks</h2>
          <table className="w-full border border-black text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-2 py-1">S.No</th>
                <th className="border border-black px-2 py-1">Description</th>
                <th className="border border-black px-2 py-1">Input</th>
              </tr>
            </thead>
            <tbody>
              {generalChecks.map((desc, idx) => (
                <tr key={idx}>
                  <td className="border border-black px-2 py-1 text-center">{idx + 1}</td>
                  <td className="border border-black px-2 py-1">{desc}</td>
                  <td className="border border-black px-2 py-1">
                    <Input
                      value={formData[`general_${idx}_input` as keyof typeof formData] as string}
                      onChange={(e) => handleInputChange(`general_${idx}_input`, e.target.value)}
                      placeholder="Enter note"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PageLayout>
  );
}