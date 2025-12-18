import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Checkbox, message, Card } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { inspectionService } from '../../services/inspectionService';
import PageLayout from '@common/components/PageLayout';

const sections = [
  {
    key: 'control_relay',
    title: '1. Control & Relay Panel',
    points: [
      'Check cleanliness of the Panel',
      'Check vermin proofing of panels.',
      'Check tightening of wiring connections.',
      'Check indication and annunciation scheme.',
      'Test report of Ammeter, Voltmeter, MFM and protection relays.',
      'Check fuse and links.',
      'Check working of push buttons.',
      'Check for working of heater (if applicable) and door light.',
      'Check earthing of panels.'
    ]
  },
  {
    key: 'switchgear',
    title: '2. Switchgear Panel',
    points: [
      'Check cleaning of voltage interrupter porcelain bushings.',
      'Check the IR test report.',
      'Check the operating mechanism.',
      'Check operation counter',
      'Check tripping through relays.',
      'Check finger contacts.',
      'Check tightening of the auxiliary terminal connections.',
      'High voltage test for VCB.',
      'Earthing of panels'
    ]
  },
  {
    key: 'busbar',
    title: '3. Bus-Bar Portion',
    points: [
      'Check cleaning of the bus-bar and the tightening bus-bar connections.',
      'Check for IR value',
      'Check working of heater in provided.'
    ]
  },
  {
    key: 'cables',
    title: '4. Outgoing & Incoming Cable',
    points: [
      'Check for tightening of cable termination connections.',
      'Check for IR value and Hipot Test value of the cables.'
    ]
  },
  {
    key: 'control_circuit',
    title: '5. Control Circuit Portion',
    points: [
      'Check for vermin proofing',
      'Check tightening of wire connections.',
      'Check other volts/nuts',
      'Check working of heater in provided.'
    ]
  },
  {
    key: 'ct_portion',
    title: '6. Current Transformer(CT)',
    points: [
      'Check cleanliness of the CT chamber',
      'Check for vermin proofing',
      'Check tightness of wiring connections',
      'Take ratio test Report'
    ]
  },
  {
    key: 'pt_portion',
    title: '7. Voltage Transformer(PT)',
    points: [
      'Check cleanliness of the PT chamber',
      'Check for vermin proofing',
      'Check tightness of wiring connections',
      'Take ratio test Report'
    ]
  },
  {
    key: 'battery_charger',
    title: '8. Battery Charger',
    points: [
      'Check for cleanliness of the panel',
      'Check for vermin proofing',
      'Check tightness of wiring connections',
      'Check fuse for proper rating as per drawing',
      'Check working of alarm and/or indicators for earth leakage, under voltage etc.',
      'Check for testing of relay.',
      'Check float / boost function of charger'
    ]
  },
  {
    key: 'battery_bank',
    title: '9. Battery Bank',
    points: [
      'Check battery room is properly ventilated with exhaust fan.',
      'Check battery stand is earthed.',
      'Check cleanliness of the contacts.',
      'Check the tightness of the connectors and application of the anti oxidant grease.',
      'Check for battery bank test report.'
    ]
  },
  {
    key: 'scada',
    title: '10. SCADA Room',
    points: [
      'Check cleanliness of the SCADA room',
      'Check working of the air conditioners',
      'Check separate earthing of SCADA box.'
    ]
  },
  {
    key: 'fire_fighting',
    title: '11. Fire Fighting Equipments',
    points: [
      'Check working condition of equipment',
      'Check refilling date on the cylinder',
      'Check cleanliness of equipment externally.',
      'Check gas pressure inside cylinder',
      'Check gas leakage',
      'Weigh cylinder to check the quality of gas inside cylinder'
    ]
  },
  {
    key: 'safety',
    title: '12. Safety Appliances',
    points: [
      'Check the availability and working condition of the followings: Hand Gloves, Discharge/Earthing Rod, Rubber Mat, Emergency Light, First Aid Box, Display Board of emergency phone numbers, Healthiness of communication facilities'
    ]
  },
  {
    key: 'key_board',
    title: '13. Key Board',
    points: [
      'Check for all keys at proper place.'
    ]
  },
  {
    key: 'lighting_fans',
    title: '14. Control of Lighting & Fans',
    points: [
      'Check proper installation as per drawing/BOQ',
      'Check fan operation'
    ]
  },
  {
    key: 'sld_board',
    title: '15. Single Line Diagram Board',
    points: [
      'Check if SLD board is installed in the control room'
    ]
  }
];

const ControlRoomAuditChecklistForm: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  useEffect(() => {
    if (isEdit && id) {
      fetchFormData(id);
    }
  }, [id, isEdit]);

  const fetchFormData = async (formId: string) => {
    try {
      setLoading(true);
      const response = await inspectionService.getControlRoomAuditChecklistForm(formId);
      const data = response.data;
      setInitialData(data);
      
      // Set form values
      const formValues: any = {};
      
      sections.forEach((section) => {
        section.points.forEach((_, pointIndex) => {
          const fieldPrefix = `${section.key}_${pointIndex}`;
          formValues[`${fieldPrefix}_yes`] = data[`${fieldPrefix}_yes`] || false;
          formValues[`${fieldPrefix}_no`] = data[`${fieldPrefix}_no`] || false;
          formValues[`${fieldPrefix}_remarks`] = data[`${fieldPrefix}_remarks`] || '';
        });
      });
      
      form.setFieldsValue(formValues);
    } catch (error) {
      message.error('Failed to load form data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      if (isEdit && id) {
        await inspectionService.updateControlRoomAuditChecklistForm(id, values);
        message.success('Control Room Audit Checklist updated successfully!');
      } else {
        await inspectionService.createControlRoomAuditChecklistForm(values);
        message.success('Control Room Audit Checklist created successfully!');
      }
      
      navigate('/inspection/control-room-audit-checklist');
    } catch (error) {
      message.error('Failed to save form');
    } finally {
      setLoading(false);
    }
  };

  const breadcrumbs = [
    { title: 'Inspection', href: '/inspection' },
    { title: 'Control Room Audit Checklist', href: '/inspection/control-room-audit-checklist' },
    { title: isEdit ? 'Edit Form' : 'New Form' }
  ];

  return (
    <PageLayout
      title={isEdit ? 'Edit Control Room Audit Checklist' : 'New Control Room Audit Checklist'}
      breadcrumbs={breadcrumbs}
    >
      <div className="max-w-6xl mx-auto">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="space-y-6"
        >
          {/* Header */}
          <Card className="mb-6">
            <div className="flex justify-between items-center border-b-2 border-gray-500 pb-4 mb-6">
              <div className="flex gap-4 items-center">
                <img src="/logo.png" alt="Logo" className="w-[60px]" />
                <h2 className="text-lg font-bold uppercase">Control Room General Audit Checklist</h2>
              </div>
              <div className="text-xs text-gray-800 leading-5">
                <div><strong>Form No.:</strong> IMS/FOR/PR/098</div>
                <div><strong>Rev. No.:</strong> 00</div>
                <div><strong>Rev. Date:</strong> 19/12/2023</div>
              </div>
            </div>
          </Card>

          {/* Sections */}
          {sections.map((section) => (
            <Card key={section.key} className="mb-6">
              <h3 className="text-base font-semibold text-gray-700 mb-4 border-l-4 border-gray-400 pl-2">
                {section.title}
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-400 border-collapse text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-400 p-2 w-[5%]">S. No.</th>
                      <th className="border border-gray-400 p-2 w-[60%] text-left">Check Point</th>
                      <th className="border border-gray-400 p-2 w-[10%]">Yes</th>
                      <th className="border border-gray-400 p-2 w-[10%]">No</th>
                      <th className="border border-gray-400 p-2 w-[15%]">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.points.map((point, index) => {
                      const fieldPrefix = `${section.key}_${index}`;
                      return (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 p-2 text-center">{index + 1}</td>
                          <td className="border border-gray-300 p-2">{point}</td>
                          <td className="border border-gray-300 p-2 text-center">
                            <Form.Item name={`${fieldPrefix}_yes`} valuePropName="checked" className="mb-0">
                              <Checkbox />
                            </Form.Item>
                          </td>
                          <td className="border border-gray-300 p-2 text-center">
                            <Form.Item name={`${fieldPrefix}_no`} valuePropName="checked" className="mb-0">
                              <Checkbox />
                            </Form.Item>
                          </td>
                          <td className="border border-gray-300 p-2">
                            <Form.Item name={`${fieldPrefix}_remarks`} className="mb-0">
                              <Input placeholder="Remarks" bordered={false} className="border-b border-gray-400 rounded-none px-1 py-1" />
                            </Form.Item>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}

          {/* Submit Button */}
          <div className="flex justify-end gap-4 pt-4">
            <Button onClick={() => navigate('/inspection/control-room-audit-checklist')}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {isEdit ? 'Update Form' : 'Submit Form'}
            </Button>
          </div>
        </Form>
      </div>
    </PageLayout>
  );
};

export default ControlRoomAuditChecklistForm;