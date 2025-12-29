import React, { useState, useEffect, useCallback } from 'react';
import {
  Form, Input, Button, Select, DatePicker, Switch, Steps, Card, Row, Col, 
  App, Spin, Space, Checkbox, Upload, Modal, Result, Badge, Alert, 
  Progress, Divider, Typography, Tabs, Table, Tag
} from 'antd';
import {
  UploadOutlined, SaveOutlined, SendOutlined, CloseOutlined, 
  CameraOutlined, QrcodeOutlined, WarningOutlined, CheckCircleOutlined,
  ClockCircleOutlined, UserOutlined, SafetyOutlined, FileTextOutlined,
  EnvironmentOutlined, ToolOutlined, TeamOutlined, AuditOutlined,
  BellOutlined, SignatureOutlined, MobileOutlined, SyncOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import TextArea from 'antd/es/input/TextArea';
import useAuthStore from '../../../common/store/authStore';
import { createPermit, updatePermit, getPermitTypes, getPermit } from '../api';
import PageLayout from '../../../common/components/PageLayout';
import PTWPrintPreview from './PTWPrintPreview';

const { Option } = Select;
const { Step } = Steps;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

// Risk Matrix Configuration
const RISK_MATRIX = {
  probability: [
    { value: 1, label: 'Rare', description: 'May occur in exceptional circumstances' },
    { value: 2, label: 'Unlikely', description: 'Could occur at some time' },
    { value: 3, label: 'Possible', description: 'Might occur at some time' },
    { value: 4, label: 'Likely', description: 'Will probably occur' },
    { value: 5, label: 'Almost Certain', description: 'Expected to occur' }
  ],
  severity: [
    { value: 1, label: 'Insignificant', description: 'No injury, minimal impact' },
    { value: 2, label: 'Minor', description: 'First aid treatment' },
    { value: 3, label: 'Moderate', description: 'Medical treatment required' },
    { value: 4, label: 'Major', description: 'Extensive injuries' },
    { value: 5, label: 'Catastrophic', description: 'Death or permanent disability' }
  ]
};

// Hazard Library
const HAZARD_LIBRARY = {
  electrical: {
    name: 'Electrical Hazards',
    hazards: [
      { id: 'elec_001', name: 'Live electrical equipment', controls: ['LOTO', 'Electrical PPE', 'Qualified electrician'] },
      { id: 'elec_002', name: 'Arc flash potential', controls: ['Arc flash suit', 'De-energize equipment', 'Safe distance'] }
    ]
  },
  mechanical: {
    name: 'Mechanical Hazards',
    hazards: [
      { id: 'mech_001', name: 'Moving machinery', controls: ['Machine guarding', 'LOTO', 'Safety training'] },
      { id: 'mech_002', name: 'Stored energy', controls: ['Energy isolation', 'Pressure relief', 'Verification'] }
    ]
  },
  chemical: {
    name: 'Chemical Hazards',
    hazards: [
      { id: 'chem_001', name: 'Toxic substances', controls: ['Respiratory protection', 'Ventilation', 'Chemical suits'] },
      { id: 'chem_002', name: 'Corrosive materials', controls: ['Chemical resistant PPE', 'Eye wash stations', 'Spill kits'] }
    ]
  },
  height: {
    name: 'Working at Height',
    hazards: [
      { id: 'height_001', name: 'Fall from height', controls: ['Fall protection harness', 'Guardrails', 'Safety nets'] },
      { id: 'height_002', name: 'Falling objects', controls: ['Hard hats', 'Toe boards', 'Exclusion zones'] }
    ]
  },
  confined: {
    name: 'Confined Space',
    hazards: [
      { id: 'conf_001', name: 'Oxygen deficiency', controls: ['Gas monitoring', 'Ventilation', 'Rescue plan'] },
      { id: 'conf_002', name: 'Toxic atmosphere', controls: ['Atmospheric testing', 'Respiratory protection', 'Continuous monitoring'] }
    ]
  }
};

// Dynamic Checklists - Fallback for when backend doesn't provide checklist
const SAFETY_CHECKLISTS = {
  hot_work: [
    'Fire watch assigned and trained',
    'Combustible materials removed 35ft radius',
    'Fire extinguisher readily available',
    'Hot work permit displayed at location',
    'Atmospheric testing completed',
    'Ventilation adequate for fume removal'
  ],
  confined_space: [
    'Atmospheric testing completed (O2, LEL, H2S, CO)',
    'Continuous gas monitoring in place',
    'Mechanical ventilation operating',
    'Entry supervisor assigned and present',
    'Rescue team on standby',
    'Communication system established',
    'Emergency evacuation plan reviewed'
  ],
  electrical: [
    'Electrical isolation completed and verified',
    'LOTO procedures implemented',
    'Qualified electrician assigned',
    'Arc flash analysis completed',
    'Appropriate PPE worn',
    'Insulated tools used',
    'Electrical safety boundaries established'
  ],
  height: [
    'Fall protection system in place',
    'Guardrails installed where required',
    'Weather conditions acceptable',
    'Rescue plan established',
    'Exclusion zone established below',
    'Equipment inspected by competent person'
  ],
  excavation: [
    'Underground utilities located and marked',
    'Soil conditions assessed',
    'Proper sloping or shoring in place',
    'Safe entry/exit provided',
    'Competent person assigned'
  ],
  chemical: [
    'SDS reviewed for all chemicals',
    'Chemical compatibility verified',
    'Spill response kit available',
    'Emergency shower/eyewash accessible',
    'Proper ventilation provided',
    'Waste disposal plan in place'
  ],
  crane_lifting: [
    'Crane operator certified and current',
    'Crane inspection completed',
    'Lift plan prepared and reviewed',
    'Load weight verified',
    'Rigging equipment inspected',
    'Exclusion zone established'
  ],
  cold_work: [
    'Work area inspected for hazards',
    'Tools and equipment inspected',
    'LOTO procedures followed if required',
    'Housekeeping standards maintained'
  ],
  specialized: [
    'Specialized training verified',
    'Equipment calibrated and certified',
    'Emergency procedures reviewed',
    'Regulatory compliance verified'
  ],
  airline: [
    'Aircraft maintenance manual consulted',
    'Airworthiness directives reviewed',
    'Ground support equipment inspected',
    'Communication with air traffic control established',
    'Safety zones established around aircraft',
    'Fire suppression equipment available',
    'Personnel certified for aircraft type'
  ]
};

const EnhancedPermitForm: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const { usertype, django_user_type, grade } = useAuthStore();

  // Form State Management
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [allFormValues, setAllFormValues] = useState<any>({});
  
  // Risk Assessment State
  const [riskScore, setRiskScore] = useState(0);
  const [riskLevel, setRiskLevel] = useState('');
  const [selectedHazards, setSelectedHazards] = useState<string[]>([]);
  const [controlMeasures, setControlMeasures] = useState<string[]>([]);
  
  // Workflow State
  const [approvalChain, setApprovalChain] = useState<any[]>([]);
  const [currentApprover, setCurrentApprover] = useState<any>(null);
  const [signatures, setSignatures] = useState<any[]>([]);
  
  // Advanced Features State
  const [qrCode, setQrCode] = useState('');
  const [workPhotos, setWorkPhotos] = useState<any[]>([]);
  const [gasReadings, setGasReadings] = useState<any[]>([]);
  const [timeTracking, setTimeTracking] = useState<any>({});
  const [offlineMode, setOfflineMode] = useState(false);
  const [syncStatus, setSyncStatus] = useState('synced');
  const [permitTypes, setPermitTypes] = useState<any[]>([]);
  const [apiError, setApiError] = useState<string>('');

  // Form Steps Configuration
  const steps = [
    { title: 'Basic Info', icon: <FileTextOutlined style={{ color: '#1890ff', fontSize: '18px' }} /> },
    { title: 'Risk Assessment', icon: <WarningOutlined style={{ color: '#ff4d4f', fontSize: '18px' }} /> },
    { title: 'Safety Measures', icon: <SafetyOutlined style={{ color: '#52c41a', fontSize: '18px' }} /> },
    { title: 'Documentation', icon: <CameraOutlined style={{ color: '#fa8c16', fontSize: '18px' }} /> },
    { title: 'Review', icon: <AuditOutlined style={{ color: '#13c2c2', fontSize: '18px' }} /> }
  ];

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!formData || Object.keys(formData).length === 0) return;
    
    setAutoSaving(true);
    try {
      // Save to localStorage for offline support
      localStorage.setItem(`ptw_draft_${id || 'new'}`, JSON.stringify({
        ...formData,
        lastSaved: new Date().toISOString()
      }));
      
      // If online, save to server
      if (!offlineMode) {
        // API call to save draft
      }
    } catch (error) {
    } finally {
      setAutoSaving(false);
    }
  }, [formData, id, offlineMode]);

  // Auto-save every 30 seconds
  // Load permit types and permit data on component mount
  useEffect(() => {
    const loadPermitTypes = async () => {
      try {
        const response = await getPermitTypes();
        const data = response.data?.results || response.data || [];
        
        if (Array.isArray(data) && data.length > 0) {
          setPermitTypes(data);
          setApiError('');
        } else {
          setFallbackPermitTypes();
        }
      } catch (error) {
        setApiError(`API Error: ${error.message}`);
        setFallbackPermitTypes();
      }
    };
    
    const setFallbackPermitTypes = () => {
      // Fallback permit types matching the backend database
      const fallbackTypes = [
        // Hot Work
        { id: 1, name: 'Hot Work - Arc Welding', category: 'hot_work' },
        { id: 2, name: 'Hot Work - Gas Welding/Cutting', category: 'hot_work' },
        { id: 3, name: 'Hot Work - Cutting & Grinding', category: 'hot_work' },
        { id: 4, name: 'Hot Work - Brazing & Soldering', category: 'hot_work' },
        // Confined Space
        { id: 5, name: 'Confined Space - Entry', category: 'confined_space' },
        { id: 6, name: 'Confined Space - Non-Entry', category: 'confined_space' },
        // Electrical
        { id: 7, name: 'Electrical - High Voltage (>1kV)', category: 'electrical' },
        { id: 8, name: 'Electrical - Low Voltage (<1kV)', category: 'electrical' },
        { id: 9, name: 'Electrical - Live Work', category: 'electrical' },
        // Work at Height
        { id: 10, name: 'Work at Height - Scaffolding', category: 'height' },
        { id: 11, name: 'Work at Height - Ladder Work', category: 'height' },
        { id: 12, name: 'Work at Height - Rope Access', category: 'height' },
        // Excavation
        { id: 13, name: 'Excavation - Manual Digging', category: 'excavation' },
        { id: 14, name: 'Excavation - Mechanical', category: 'excavation' },
        // Chemical
        { id: 15, name: 'Chemical Handling - Hazardous', category: 'chemical' },
        { id: 16, name: 'Chemical Handling - Corrosive', category: 'chemical' },
        // Crane & Lifting
        { id: 17, name: 'Crane Operations - Mobile Crane', category: 'crane_lifting' },
        { id: 18, name: 'Crane Operations - Overhead Crane', category: 'crane_lifting' },
        { id: 19, name: 'Rigging Operations', category: 'crane_lifting' },
        // Cold Work
        { id: 20, name: 'Cold Work - General Maintenance', category: 'cold_work' },
        { id: 21, name: 'Cold Work - Mechanical', category: 'cold_work' },
        // Specialized
        { id: 22, name: 'Radiography Work', category: 'specialized' },
        { id: 23, name: 'Pressure Testing', category: 'specialized' },
        { id: 24, name: 'Asbestos Work', category: 'specialized' },
        { id: 25, name: 'Demolition Work', category: 'specialized' },
        // Airline
        { id: 26, name: 'Airline - Aircraft Maintenance', category: 'airline' },
        { id: 27, name: 'Airline - Engine Work', category: 'airline' },
        { id: 28, name: 'Airline - Fuel System Work', category: 'airline' },
        { id: 29, name: 'Airline - Avionics Work', category: 'airline' },
        { id: 30, name: 'Airline - Ground Support Equipment', category: 'airline' }
      ];
      setPermitTypes(fallbackTypes);
    };
    
    const loadPermitData = async () => {
      if (isEditing && id) {
        setLoading(true);
        try {
          const response = await getPermit(parseInt(id));
          const permit = response.data;
          
          // Set form values
          form.setFieldsValue({
            permit_number: permit.permit_number,
            permit_type: permit.permit_type,
            description: permit.description,
            location: permit.location,
            gps_coordinates: permit.gps_coordinates,
            planned_start_time: permit.planned_start_time ? dayjs(permit.planned_start_time) : null,
            planned_end_time: permit.planned_end_time ? dayjs(permit.planned_end_time) : null,
            risk_assessment_completed: permit.risk_assessment_completed,
            probability: permit.probability,
            severity: permit.severity,
            control_measures: permit.control_measures,
            ppe_requirements: permit.ppe_requirements,
            special_instructions: permit.special_instructions,
            safety_checklist: permit.safety_checklist,
            requires_isolation: permit.requires_isolation,
            mobile_created: permit.mobile_created,
            offline_id: permit.offline_id
          });
          
          // Set risk calculation
          if (permit.probability && permit.severity) {
            calculateRisk(permit.probability, permit.severity);
          }
          
        } catch (error) {
          message.error('Failed to load permit data');
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadPermitTypes();
    
    if (isEditing) {
      loadPermitData();
    } else {
      const generatePermitNumber = () => {
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const day = String(new Date().getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `PTW-${year}${month}${day}-${random}`;
      };
      
      const permitNumber = generatePermitNumber();
      form.setFieldsValue({ permit_number: permitNumber });
      setFormData(prev => ({ ...prev, permit_number: permitNumber }));
      setAllFormValues(prev => ({ ...prev, permit_number: permitNumber }));
    }
  }, [isEditing, id, form]);

  useEffect(() => {
    const interval = setInterval(autoSave, 30000);
    return () => clearInterval(interval);
  }, [autoSave]);

  // Risk calculation
  const calculateRisk = (probability: number, severity: number) => {
    const score = probability * severity;
    setRiskScore(score);
    
    if (score <= 4) setRiskLevel('Low');
    else if (score <= 9) setRiskLevel('Medium');
    else if (score <= 16) setRiskLevel('High');
    else setRiskLevel('Extreme');
    
    return { score, level: score <= 4 ? 'Low' : score <= 9 ? 'Medium' : score <= 16 ? 'High' : 'Extreme' };
  };

  // Form validation by step
  const validateStep = async (step: number) => {
    const fieldsToValidate = getFieldsByStep(step);
    try {
      await form.validateFields(fieldsToValidate);
      return true;
    } catch (error) {
      return false;
    }
  };

  const getFieldsByStep = (step: number) => {
    switch (step) {
      case 0: return ['permit_number', 'permit_type', 'location', 'planned_start_time', 'planned_end_time', 'description'];
      case 1: return ['probability', 'severity', 'control_measures'];
      case 2: return ['ppe_requirements', 'safety_checklist'];
      case 3: return [];
      case 4: return [];
      default: return [];
    }
  };

  const nextStep = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Generate QR Code
  const generateQRCode = () => {
    const permitData = {
      id: id || 'new',
      number: form.getFieldValue('permit_number'),
      type: form.getFieldValue('permit_type'),
      location: form.getFieldValue('location'),
      status: 'active'
    };
    const qrData = btoa(JSON.stringify(permitData));
    setQrCode(qrData);
  };

  // Digital Signature Component
  const DigitalSignature = ({ onSign }: { onSign: (signature: string) => void }) => (
    <div style={{ border: '1px dashed #d9d9d9', padding: 20, textAlign: 'center' }}>
      <SignatureOutlined style={{ fontSize: 24, marginBottom: 8 }} />
      <div>Click to add digital signature</div>
      <Button type="link" onClick={() => onSign('signature_data')}>
        Sign Here
      </Button>
    </div>
  );

  // Gas Testing Component
  const GasTestingForm = () => (
    <Card title="Gas Testing Results" size="small">
      <Table
        size="small"
        dataSource={gasReadings}
        columns={[
          { title: 'Gas Type', dataIndex: 'type', key: 'type' },
          { title: 'Reading', dataIndex: 'reading', key: 'reading' },
          { title: 'Unit', dataIndex: 'unit', key: 'unit' },
          { title: 'Acceptable Range', dataIndex: 'range', key: 'range' },
          { title: 'Status', dataIndex: 'status', key: 'status', render: (status) => (
            <Tag color={status === 'Safe' ? 'green' : 'red'}>{status}</Tag>
          )}
        ]}
      />
      <Button 
        type="dashed" 
        onClick={() => setGasReadings([...gasReadings, { 
          key: Date.now(), 
          type: 'O2', 
          reading: 20.9, 
          unit: '%', 
          range: '19.5-23.5%', 
          status: 'Safe' 
        }])}
      >
        Add Gas Reading
      </Button>
    </Card>
  );

  // Render form steps
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Card title="Basic Information" className="step-card">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="permit_number" label="Permit Number" rules={[{ required: true, message: 'Permit number is required' }]}>
                  <Input placeholder="Auto-generated" disabled style={{ backgroundColor: '#f5f5f5', color: '#000' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  name="permit_type" 
                  label="Permit Type" 
                  rules={[
                    { required: true, message: 'Please select a permit type' },
                    {
                      validator: (_, value) => {
                        if (!value || (Array.isArray(value) && value.length === 0)) {
                          return Promise.reject(new Error('Please select a permit type'));
                        }
                        const actualValue = Array.isArray(value) ? value[0] : value;
                        if (!actualValue || isNaN(Number(actualValue))) {
                          return Promise.reject(new Error('Invalid permit type selected'));
                        }
                        return Promise.resolve();
                      }
                    }
                  ]}
                >
                  <Select 
                    placeholder="Select permit type" 
                    loading={permitTypes.length === 0}
                    showSearch
                    optionFilterProp="children"
                    style={{ width: '100%' }}
                    dropdownStyle={{ maxHeight: 600, overflow: 'auto' }}
                    filterOption={(input, option) => {
                      const searchText = input.toLowerCase();
                      const optionText = option?.children?.toString().toLowerCase() || '';
                      return optionText.includes(searchText);
                    }}
                    notFoundContent={permitTypes.length === 0 ? 'Loading...' : 'No permit types found'}
                    onChange={(value) => {
                      console.log('Permit type selected:', value, typeof value);
                      console.log('Selected permit type details:', permitTypes.find(t => t.id === value));
                      
                      // Set the field value directly
                      form.setFieldValue('permit_type', value);
                      
                      // Update both form data states
                      setFormData(prev => ({ ...prev, permit_type: value }));
                      setAllFormValues(prev => ({ ...prev, permit_type: value }));
                      
                      // Verify it was set
                      setTimeout(() => {
                        console.log('Form value after setting:', form.getFieldValue('permit_type'));
                        console.log('All form values after setting:', form.getFieldsValue());
                        console.log('AllFormValues state:', allFormValues);
                      }, 100);
                    }}
                    value={form.getFieldValue('permit_type')}
                  >
                    {permitTypes.length === 0 ? (
                      <Option disabled value="loading">Loading permit types...</Option>
                    ) : (
                      permitTypes.map(type => (
                        <Option key={`permit-type-${type.id}`} value={type.id}>
                          {type.name} {type.category && `(${type.category.replace('_', ' ')})`}
                        </Option>
                      ))
                    )}
                  </Select>
                  {permitTypes.length > 0 && (
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      {permitTypes.length} permit types available
                      {apiError && <span style={{ color: '#ff4d4f' }}> (Using fallback data: {apiError})</span>}
                    </div>
                  )}
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item 
                  name="description" 
                  label="Work Description" 
                  rules={[
                    { required: true, message: 'Work description is required', whitespace: true },
                    { min: 10, message: 'Work description must be at least 10 characters' },
                    { max: 1000, message: 'Work description cannot exceed 1000 characters' }
                  ]}
                >
                  <TextArea 
                    rows={3} 
                    placeholder="Detailed work description (minimum 10 characters)" 
                    showCount
                    maxLength={1000}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  name="location" 
                  label="Location" 
                  rules={[
                    { required: true, message: 'Location is required', whitespace: true },
                    { min: 3, message: 'Location must be at least 3 characters' },
                    { max: 255, message: 'Location cannot exceed 255 characters' }
                  ]}
                >
                  <Input placeholder="Work location" maxLength={255} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  name="gps_coordinates" 
                  label="GPS Coordinates"
                  rules={[
                    {
                      pattern: /^-?([1-8]?[1-9]|[1-9]0)\.\d{1,6},-?([1-8]?[1-9]|[1-9]0)\.\d{1,6}$/,
                      message: 'Please enter valid GPS coordinates (lat,lng format)'
                    }
                  ]}
                >
                  <Input 
                    placeholder="Lat, Long (e.g., 40.7128,-74.0060)" 
                    addonAfter={
                      <Button 
                        type="primary" 
                        icon={<EnvironmentOutlined />}
                        onClick={() => {
                          if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition(
                              (position) => {
                                const { latitude, longitude } = position.coords;
                                const coordinates = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
                                form.setFieldValue('gps_coordinates', coordinates);
                                message.success('Location fetched successfully');
                              },
                              (error) => {
                                message.error('Failed to get location. Please enable location services.');
                              },
                              { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
                            );
                          } else {
                            message.error('Geolocation is not supported by this browser.');
                          }
                        }}
                      >
                        Get Location
                      </Button>
                    }
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  name="planned_start_time" 
                  label="Start Time" 
                  rules={[
                    { required: true, message: 'Start time is required' },
                    {
                      validator: (_, value) => {
                        if (!value) return Promise.resolve();
                        if (value.isBefore(dayjs())) {
                          return Promise.reject(new Error('Start time cannot be in the past'));
                        }
                        return Promise.resolve();
                      }
                    }
                  ]}
                >
                  <DatePicker 
                    showTime 
                    style={{ width: '100%' }}
                    disabledDate={(current) => current && current < dayjs().startOf('day')}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  name="planned_end_time" 
                  label="End Time" 
                  rules={[
                    { required: true, message: 'End time is required' },
                    {
                      validator: (_, value) => {
                        if (!value) return Promise.resolve();
                        const startTime = form.getFieldValue('planned_start_time');
                        if (startTime && value.isBefore(startTime)) {
                          return Promise.reject(new Error('End time must be after start time'));
                        }
                        return Promise.resolve();
                      }
                    }
                  ]}
                >
                  <DatePicker 
                    showTime 
                    style={{ width: '100%' }}
                    disabledDate={(current) => current && current < dayjs().startOf('day')}
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Divider orientation="left">Work Nature</Divider>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="work_nature" label="Work Nature" rules={[{ required: true }]} initialValue="day">
                  <Select placeholder="Select work nature">
                    <Option value="day">Day Work</Option>
                    <Option value="night">Night Work</Option>
                    <Option value="both">Day & Night Work</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Alert
                  message="Work Hours Policy"
                  description="Work hours are managed centrally by admin. Day and night work times are configured in master settings."
                  type="info"
                  showIcon
                />
              </Col>
            </Row>


          </Card>
        );

      case 1:
        return (
          <Card title="Risk Assessment" className="step-card">
            {(() => {
              const selectedPermitType = form.getFieldValue('permit_type');
              const selectedType = permitTypes.find(type => type.id === selectedPermitType);
              
              return (
                <>
                  {selectedType && (
                    <Alert
                      message={`Permit Type: ${selectedType.name}`}
                      description={`Base Risk Level: ${selectedType.risk_level?.toUpperCase()} | Category: ${selectedType.category?.replace('_', ' ').toUpperCase()}`}
                      type={selectedType.risk_level === 'low' ? 'success' : selectedType.risk_level === 'medium' ? 'warning' : 'error'}
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                  )}
                  
                  <Alert
                    message={`Current Risk Level: ${riskLevel}`}
                    description={`Risk Score: ${riskScore}/25`}
                    type={riskLevel === 'Low' ? 'success' : riskLevel === 'Medium' ? 'warning' : 'error'}
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  
                  {selectedType?.risk_factors && selectedType.risk_factors.length > 0 && (
                    <Card size="small" title="Specific Risk Factors for this Permit Type" style={{ marginBottom: 16 }}>
                      <ul>
                        {selectedType.risk_factors.map((factor, index) => (
                          <li key={index}>{factor}</li>
                        ))}
                      </ul>
                    </Card>
                  )}
                  
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item 
                        name="probability" 
                        label="Probability" 
                        rules={[
                          { required: true, message: 'Please select probability level' },
                          {
                            validator: (_, value) => {
                              if (value && (value < 1 || value > 5)) {
                                return Promise.reject(new Error('Probability must be between 1 and 5'));
                              }
                              return Promise.resolve();
                            }
                          }
                        ]}
                      >
                        <Select 
                          placeholder="Select probability"
                          onChange={(value) => {
                            const severity = form.getFieldValue('severity') || 1;
                            calculateRisk(value, severity);
                          }}
                        >
                          {RISK_MATRIX.probability.map(item => (
                            <Option key={item.value} value={item.value}>
                              {item.label} - {item.description}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item 
                        name="severity" 
                        label="Severity" 
                        rules={[
                          { required: true, message: 'Please select severity level' },
                          {
                            validator: (_, value) => {
                              if (value && (value < 1 || value > 5)) {
                                return Promise.reject(new Error('Severity must be between 1 and 5'));
                              }
                              return Promise.resolve();
                            }
                          }
                        ]}
                      >
                        <Select 
                          placeholder="Select severity"
                          onChange={(value) => {
                            const probability = form.getFieldValue('probability') || 1;
                            calculateRisk(probability, value);
                          }}
                        >
                          {RISK_MATRIX.severity.map(item => (
                            <Option key={item.value} value={item.value}>
                              {item.label} - {item.description}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item name="hazards" label="Identified Hazards" rules={[{ required: true }]}>
                    <Checkbox.Group onChange={setSelectedHazards}>
                      {Object.entries(HAZARD_LIBRARY).map(([category, data]) => (
                        <div key={category} style={{ marginBottom: 16 }}>
                          <Title level={5}>{data.name}</Title>
                          {data.hazards.map(hazard => (
                            <div key={hazard.id} style={{ marginLeft: 16 }}>
                              <Checkbox value={hazard.id}>{hazard.name}</Checkbox>
                            </div>
                          ))}
                        </div>
                      ))}
                    </Checkbox.Group>
                  </Form.Item>



                  <Form.Item 
                    name="control_measures" 
                    label="Control Measures" 
                    rules={[
                      { required: true, message: 'Control measures are required', whitespace: true },
                      { min: 10, message: 'Control measures must be at least 10 characters' },
                      { max: 1000, message: 'Control measures cannot exceed 1000 characters' }
                    ]}
                  >
                    <TextArea 
                      rows={4} 
                      placeholder={selectedType?.control_measures?.length > 0 ? 
                        `Suggested: ${selectedType.control_measures.join(', ')}` : 
                        "Describe control measures (minimum 10 characters)"}
                      showCount
                      maxLength={1000}
                    />
                  </Form.Item>
                  
                  {selectedType?.emergency_procedures && selectedType.emergency_procedures.length > 0 && (
                    <Card size="small" title="Emergency Procedures" type="inner">
                      <ul>
                        {selectedType.emergency_procedures.map((procedure, index) => (
                          <li key={index}>{procedure}</li>
                        ))}
                      </ul>
                    </Card>
                  )}
                </>
              );
            })()}
          </Card>
        );

      case 2:
        return (
          <Card title="Safety Measures" className="step-card">
            {(() => {
              const selectedPermitType = form.getFieldValue('permit_type');
              const selectedType = permitTypes.find(type => type.id === selectedPermitType);
              
              return (
                <>
                  {selectedType && (
                    <div style={{ marginBottom: 16 }}>
                      <Row gutter={16}>
                        {selectedType.requires_gas_testing && (
                          <Col span={6}>
                            <Tag color="orange" icon={<WarningOutlined />}>Gas Testing Required</Tag>
                          </Col>
                        )}
                        {selectedType.requires_fire_watch && (
                          <Col span={6}>
                            <Tag color="red" icon={<WarningOutlined />}>Fire Watch Required</Tag>
                          </Col>
                        )}
                        {selectedType.requires_isolation && (
                          <Col span={6}>
                            <Tag color="purple" icon={<WarningOutlined />}>LOTO Required</Tag>
                          </Col>
                        )}
                        {selectedType.requires_medical_surveillance && (
                          <Col span={6}>
                            <Tag color="blue" icon={<UserOutlined />}>Medical Surveillance</Tag>
                          </Col>
                        )}
                      </Row>
                    </div>
                  )}
                  
                  <Form.Item 
                    name="ppe_requirements" 
                    label="PPE Requirements" 
                    rules={[
                      { required: true, message: 'Please select required PPE' },
                      {
                        validator: (_, value) => {
                          if (!value || (Array.isArray(value) && value.length === 0)) {
                            return Promise.reject(new Error('At least one PPE item must be selected'));
                          }
                          return Promise.resolve();
                        }
                      }
                    ]}
                  >
                    <Checkbox.Group>
                      {(() => {
                        // Default PPE options
                        const defaultPPE = [
                          { value: 'helmet', label: 'Safety Helmet' },
                          { value: 'gloves', label: 'Safety Gloves' },
                          { value: 'shoes', label: 'Safety Shoes' },
                          { value: 'goggles', label: 'Safety Goggles' },
                          { value: 'harness', label: 'Fall Protection' },
                          { value: 'respirator', label: 'Respirator' },
                          { value: 'coveralls', label: 'Protective Coveralls' },
                          { value: 'ear_protection', label: 'Ear Protection' },
                          { value: 'face_shield', label: 'Face Shield' },
                          { value: 'chemical_suit', label: 'Chemical Resistant Suit' },
                          { value: 'high_vis', label: 'High Visibility Vest' },
                          { value: 'electrical_ppe', label: 'Electrical PPE' },
                          { value: 'rope_access_ppe', label: 'Rope Access PPE' },
                          { value: 'radiation_badge', label: 'Radiation Badge' },
                          { value: 'lead_apron', label: 'Lead Apron' },
                          { value: 'disposable_coveralls', label: 'Disposable Coveralls' }
                        ];
                        
                        let mandatoryPPE = [];
                        if (selectedType?.mandatory_ppe && Array.isArray(selectedType.mandatory_ppe)) {
                          mandatoryPPE = selectedType.mandatory_ppe;
                        }
                        
                        return (
                          <>
                            {mandatoryPPE.length > 0 && (
                              <Alert 
                                message="Mandatory PPE for this permit type" 
                                description={mandatoryPPE.join(', ')}
                                type="warning" 
                                showIcon 
                                style={{ marginBottom: 16 }}
                              />
                            )}
                            <Row>
                              {defaultPPE.map(ppe => (
                                <Col span={8} key={ppe.value} style={{ marginBottom: 8 }}>
                                  <Checkbox 
                                    value={ppe.value}
                                    disabled={mandatoryPPE.includes(ppe.value)}
                                    defaultChecked={mandatoryPPE.includes(ppe.value)}
                                  >
                                    {ppe.label}
                                    {mandatoryPPE.includes(ppe.value) && (
                                      <Tag color="red" style={{ marginLeft: 4 }}>Required</Tag>
                                    )}
                                  </Checkbox>
                                </Col>
                              ))}
                            </Row>
                          </>
                        );
                      })()}
                    </Checkbox.Group>
                  </Form.Item>

                  <Form.Item 
                    name="safety_checklist" 
                    label="Safety Checklist" 
                    rules={[
                      { required: true, message: 'Please complete safety checklist' },
                      {
                        validator: (_, value) => {
                          if (!value || (Array.isArray(value) && value.length === 0) || 
                              (typeof value === 'object' && Object.keys(value).length === 0)) {
                            return Promise.reject(new Error('At least one safety checklist item must be checked'));
                          }
                          return Promise.resolve();
                        }
                      }
                    ]}
                  >
                    <Checkbox.Group>
                      {(() => {
                        const category = selectedType?.category;
                        
                        // Use backend safety_checklist if available, otherwise fall back to predefined
                        let checklistItems = [];
                        
                        if (selectedType?.safety_checklist && Array.isArray(selectedType.safety_checklist) && selectedType.safety_checklist.length > 0) {
                          checklistItems = selectedType.safety_checklist;
                        } else if (category && SAFETY_CHECKLISTS[category as keyof typeof SAFETY_CHECKLISTS]) {
                          checklistItems = SAFETY_CHECKLISTS[category as keyof typeof SAFETY_CHECKLISTS];
                        }
                        
                        if (!checklistItems || checklistItems.length === 0) {
                          return (
                            <div style={{ color: '#999', fontStyle: 'italic' }}>
                              {selectedPermitType ? 'No specific safety checklist for this permit type' : 'Please select a permit type to see safety checklist items'}
                            </div>
                          );
                        }
                        
                        return checklistItems.map((item, index) => (
                          <div key={index} style={{ marginBottom: 8 }}>
                            <Checkbox value={`check_${index}`}>{item}</Checkbox>
                          </div>
                        ));
                      })()}
                    </Checkbox.Group>
                  </Form.Item>

                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item name="requires_isolation" valuePropName="checked" label="LOTO Required">
                        <Switch disabled={selectedType?.requires_isolation} defaultChecked={selectedType?.requires_isolation} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="risk_assessment_completed" valuePropName="checked" label="Risk Assessment Done">
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="training_verified" valuePropName="checked" label="Training Verified">
                        <Switch disabled={selectedType?.requires_training_verification} defaultChecked={selectedType?.requires_training_verification} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="special_instructions" label="Special Instructions">
                        <TextArea rows={3} placeholder="Any special safety instructions or precautions" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="emergency_contacts" label="Emergency Contacts">
                        <TextArea rows={3} placeholder="Emergency contact numbers and procedures" />
                      </Form.Item>
                    </Col>
                  </Row>



                  {selectedType?.min_personnel_required > 1 && (
                    <Alert 
                      message={`Minimum ${selectedType.min_personnel_required} personnel required for this work`}
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                  )}

                  {selectedType?.requires_gas_testing && <GasTestingForm />}


                </>
              );
            })()}
          </Card>
        );

      case 3:
        return (
          <Card title="Documentation & Personnel" className="step-card">
            <Tabs defaultActiveKey="1">
              <TabPane tab="Documentation" key="1">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="work_photos" label="Work Area Photos">
                      <Upload
                        listType="picture-card"
                        multiple
                        beforeUpload={() => false}
                        onChange={(info) => setWorkPhotos(info.fileList)}
                      >
                        <div>
                          <CameraOutlined />
                          <div style={{ marginTop: 8 }}>Upload Photos</div>
                        </div>
                      </Upload>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="site_layout" label="Site Layout/Drawing">
                      <Upload beforeUpload={() => false}>
                        <Button icon={<UploadOutlined />}>Upload Site Layout</Button>
                      </Upload>
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item name="method_statement" label="Method Statement">
                      <Upload beforeUpload={() => false}>
                        <Button icon={<UploadOutlined />}>Upload Method Statement</Button>
                      </Upload>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="risk_assessment_doc" label="Risk Assessment">
                      <Upload beforeUpload={() => false}>
                        <Button icon={<UploadOutlined />}>Upload Risk Assessment</Button>
                      </Upload>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="work_procedure" label="Work Procedure">
                      <Upload beforeUpload={() => false}>
                        <Button icon={<UploadOutlined />}>Upload Work Procedure</Button>
                      </Upload>
                    </Form.Item>
                  </Col>
                </Row>


              </TabPane>

              <TabPane tab="Personnel" key="2">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="supervisor" label="Work Supervisor">
                      <Input placeholder="Supervisor name" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="fire_watch_person" label="Fire Watch Person">
                      <Input placeholder="Fire watch person (if required)" />
                    </Form.Item>
                  </Col>
                </Row>
              </TabPane>

              <TabPane tab="QR & Mobile" key="3">
                <Card title="QR Code Generation" size="small">
                  <Button type="primary" icon={<QrcodeOutlined />} onClick={generateQRCode}>
                    Generate QR Code
                  </Button>
                  {qrCode && (
                    <div style={{ marginTop: 16, textAlign: 'center' }}>
                      <div style={{ border: '1px solid #d9d9d9', padding: 20, display: 'inline-block' }}>
                        QR Code: {qrCode.substring(0, 20)}...
                      </div>
                    </div>
                  )}
                </Card>

                <Card title="Mobile Access" size="small" style={{ marginTop: 16 }}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="mobile_created" valuePropName="checked" label="Created on Mobile">
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="offline_id" label="Offline ID">
                        <Input placeholder="Offline sync ID" />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
              </TabPane>
            </Tabs>
          </Card>
        );

      case 4:
        return (
          <Card title="Review & Submit" className="step-card">
            <Alert
              message="Review all information before submitting"
              description="Once submitted, the permit will enter the approval workflow"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Tabs defaultActiveKey="1">
              <TabPane tab="Basic Information" key="1">
                <Row gutter={16}>
                  <Col span={12}>
                    <div><strong>Permit Number:</strong> {form.getFieldValue('permit_number')}</div>
                  </Col>
                  <Col span={12}>
                    <div><strong>Location:</strong> {form.getFieldValue('location')}</div>
                    <div><strong>GPS:</strong> {form.getFieldValue('gps_coordinates') || 'N/A'}</div>
                  </Col>
                </Row>
                <div style={{ marginTop: 16 }}>
                  <strong>Description:</strong> {form.getFieldValue('description')}
                </div>
                <div style={{ marginTop: 8 }}>
                  <strong>Special Instructions:</strong> {form.getFieldValue('special_instructions') || 'None'}
                </div>
              </TabPane>
              
              <TabPane tab="Risk Assessment" key="2">
                <Row gutter={16}>
                  <Col span={12}>
                    <div><strong>Risk Level:</strong> <Tag color={riskLevel === 'Low' ? 'green' : riskLevel === 'Medium' ? 'orange' : 'red'}>{riskLevel}</Tag></div>
                    <div><strong>Risk Score:</strong> {riskScore}/25</div>
                    <div><strong>Probability:</strong> {form.getFieldValue('probability') || 'Not set'}</div>
                    <div><strong>Severity:</strong> {form.getFieldValue('severity') || 'Not set'}</div>
                  </Col>
                  <Col span={12}>
                    <div><strong>Risk Assessment Done:</strong> {form.getFieldValue('risk_assessment_completed') ? 'Yes' : 'No'}</div>
                    <div><strong>Hazards Identified:</strong> {selectedHazards.length} hazards</div>
                  </Col>
                </Row>
                <div style={{ marginTop: 16 }}>
                  <strong>Control Measures:</strong> {form.getFieldValue('control_measures') || 'Not specified'}
                </div>
              </TabPane>
              
              <TabPane tab="Safety Measures" key="3">
                <Row gutter={16}>
                  <Col span={12}>
                    <div><strong>PPE Required:</strong></div>
                    <div style={{ marginLeft: 16 }}>
                      {form.getFieldValue('ppe_requirements')?.join(', ') || 'None specified'}
                    </div>
                    <div style={{ marginTop: 8 }}><strong>LOTO Required:</strong> {form.getFieldValue('requires_isolation') ? 'Yes' : 'No'}</div>
                    <div><strong>Training Verified:</strong> {form.getFieldValue('training_verified') ? 'Yes' : 'No'}</div>
                  </Col>
                  <Col span={12}>
                    <div><strong>Safety Checklist:</strong></div>
                    <div style={{ marginLeft: 16 }}>
                      {form.getFieldValue('safety_checklist')?.length || 0} items checked
                    </div>
                    <div style={{ marginTop: 8 }}><strong>Isolation Details:</strong></div>
                    <div style={{ marginLeft: 16 }}>
                      {form.getFieldValue('isolation_details') || 'Not specified'}
                    </div>
                  </Col>
                </Row>
              </TabPane>
              
              <TabPane tab="Personnel & Documentation" key="4">
                <Row gutter={16}>
                  <Col span={12}>
                    <div><strong>Supervisor:</strong> {form.getFieldValue('supervisor') || 'Not assigned'}</div>
                    <div><strong>Fire Watch:</strong> {form.getFieldValue('fire_watch_person') || 'Not assigned'}</div>
                  </Col>
                  <Col span={12}>
                    <div><strong>Documents:</strong> {workPhotos.length} photos uploaded</div>
                  </Col>
                </Row>
              </TabPane>
            </Tabs>

            <div style={{ marginTop: 16 }}>
              <Progress 
                percent={100} 
                status="success" 
                format={() => 'Ready to Submit'} 
              />
            </div>
            
            <Alert
              message="Permit Validity"
              description={(() => {
                const selectedType = permitTypes.find(type => type.id === form.getFieldValue('permit_type'));
                return selectedType ? `This permit will be valid for ${selectedType.validity_hours || 8} hours after approval.` : 'Validity period will be determined by permit type.';
              })()}
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
            />
          </Card>
        );

      default:
        return null;
    }
  };

  const handleSubmit = async () => {
    console.log('=== FORM SUBMIT STARTED ===');
    setSubmitting(true);
    try {
      // Validate all form fields first
      await form.validateFields();
      
      // Get current form values and merge with persistent state
      const currentFormValues = form.getFieldsValue();
      const values = { ...allFormValues, ...currentFormValues };
      
      console.log('Current form values:', currentFormValues);
      console.log('AllFormValues state:', allFormValues);
      console.log('Final combined values:', values);
      
      // Clean and validate permit type
      let permitTypeId = values.permit_type;
      if (Array.isArray(permitTypeId)) {
        permitTypeId = permitTypeId[0];
      }
      
      if (!permitTypeId || isNaN(Number(permitTypeId))) {
        console.error('Invalid permit type:', permitTypeId);
        message.error('Please select a valid permit type');
        setCurrentStep(0);
        return;
      }
      
      // Validate required fields with proper error messages
      const validationErrors = [];
      
      if (!values.description?.trim()) {
        validationErrors.push('Work description is required');
      } else if (values.description.trim().length < 10) {
        validationErrors.push('Work description must be at least 10 characters');
      }
      
      if (!values.location?.trim()) {
        validationErrors.push('Location is required');
      }
      
      if (!values.planned_start_time) {
        validationErrors.push('Start time is required');
      }
      
      if (!values.planned_end_time) {
        validationErrors.push('End time is required');
      }
      
      if (values.planned_start_time && values.planned_end_time && 
          values.planned_start_time.isAfter(values.planned_end_time)) {
        validationErrors.push('Start time must be before end time');
      }
      
      if (!values.probability || !values.severity) {
        validationErrors.push('Risk assessment (probability and severity) is required');
      }
      
      if (!values.control_measures?.trim()) {
        validationErrors.push('Control measures are required');
      }
      
      if (!values.ppe_requirements || values.ppe_requirements.length === 0) {
        validationErrors.push('PPE requirements must be selected');
      }
      
      if (!values.safety_checklist || Object.keys(values.safety_checklist).length === 0) {
        validationErrors.push('Safety checklist items must be checked');
      }
      
      if (validationErrors.length > 0) {
        message.error(validationErrors[0]);
        // Navigate to appropriate step based on error
        if (validationErrors[0].includes('permit type') || validationErrors[0].includes('description') || 
            validationErrors[0].includes('location') || validationErrors[0].includes('time')) {
          setCurrentStep(0);
        } else if (validationErrors[0].includes('risk') || validationErrors[0].includes('probability') || 
                   validationErrors[0].includes('severity') || validationErrors[0].includes('control')) {
          setCurrentStep(1);
        } else if (validationErrors[0].includes('PPE') || validationErrors[0].includes('safety')) {
          setCurrentStep(2);
        }
        return;
      }
      
      // Transform form data to match backend API
      const submitData = {
        permit_type: Number(permitTypeId),
        description: values.description?.trim() || '',
        location: values.location?.trim() || '',
        gps_coordinates: values.gps_coordinates?.trim() || '',
        planned_start_time: values.planned_start_time?.toISOString(),
        planned_end_time: values.planned_end_time?.toISOString(),
        work_nature: values.work_nature || 'day',
        risk_assessment_id: values.risk_assessment_id?.trim() || '',
        risk_assessment_completed: Boolean(values.risk_assessment_completed),
        probability: Number(values.probability) || 1,
        severity: Number(values.severity) || 1,
        control_measures: values.control_measures?.trim() || '',
        ppe_requirements: Array.isArray(values.ppe_requirements) ? values.ppe_requirements : [],
        special_instructions: values.special_instructions?.trim() || '',
        safety_checklist: values.safety_checklist || {},
        requires_isolation: Boolean(values.requires_isolation),
        isolation_details: values.isolation_details?.trim() || '',
        mobile_created: Boolean(values.mobile_created),
        offline_id: values.offline_id?.trim() || ''
      };
      
      console.log('Submitting permit data:', submitData);
      
      let response;
      if (isEditing) {
        response = await updatePermit(parseInt(id!), submitData);
      } else {
        response = await createPermit(submitData);
      }
      
      if (response && response.data) {
        message.success(`Permit ${response.data.permit_number || 'PTW'} ${isEditing ? 'updated' : 'created'} successfully`);
        
        if (!isEditing && response.data.id) {
          try {
            const { submitForVerification } = await import('../api');
            await submitForVerification(response.data.id);
            message.info('Permit submitted for verification');
          } catch (error) {
            console.warn('Failed to auto-submit for verification:', error);
          }
          sessionStorage.setItem('permitAdded', 'true');
        }
        
        setTimeout(() => {
          navigate('/dashboard/ptw');
        }, 1000);
      } else {
        throw new Error('No response data received');
      }
    } catch (error: any) {
      console.error('Permit submission error:', error);
      
      // Handle form validation errors
      if (error?.errorFields) {
        const firstError = error.errorFields[0];
        if (firstError?.name?.[0] === 'permit_type') {
          setCurrentStep(0);
        }
        message.error(firstError?.errors?.[0] || 'Please fill in all required fields correctly');
        return;
      }
      
      let errorMessage = 'Failed to submit permit';
      
      if (error?.response?.data) {
        const errorData = error.response.data;
        
        if (typeof errorData === 'object' && !errorData.detail && !errorData.message) {
          const fieldErrors = Object.keys(errorData).map(field => ({
            name: field,
            errors: Array.isArray(errorData[field]) ? errorData[field] : [errorData[field]]
          }));
          
          if (fieldErrors.length > 0) {
            form.setFields(fieldErrors);
            const firstFieldError = fieldErrors[0];
            if (firstFieldError.name === 'permit_type') {
              setCurrentStep(0);
            }
            errorMessage = firstFieldError.errors[0] || 'Please check your input';
          }
        } else {
          errorMessage = errorData.detail || errorData.message || errorData;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout
      title={isEditing ? 'Edit Permit to Work' : 'Create Permit to Work'}
      breadcrumbs={[
        { title: 'PTW Management' },
        { title: 'Permits', href: '/dashboard/ptw' },
        { title: isEditing ? 'Edit' : 'Create' }
      ]}
      actions={
        <Space>
          <PTWPrintPreview />
          {autoSaving && <Spin size="small" />}
          <Badge 
            status={syncStatus === 'synced' ? 'success' : 'processing'} 
            text={syncStatus === 'synced' ? 'Synced' : 'Syncing...'} 
          />
          <Button icon={<MobileOutlined />} type={offlineMode ? 'primary' : 'default'}>
            {offlineMode ? 'Offline Mode' : 'Online Mode'}
          </Button>
        </Space>
      }
    >
      <div style={{ height: '100%', overflow: 'auto' }}>

      {/* Progress Steps */}
      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        {steps.map((step, index) => (
          <Step key={index} title={step.title} icon={step.icon} />
        ))}
      </Steps>

      {/* Form Content */}
      <Form form={form} layout="vertical" onValuesChange={(changedValues, allValues) => {
        console.log('Form values changed:', changedValues, allValues);
        setFormData(allValues);
        // Update the comprehensive form values state
        setAllFormValues(prev => ({ ...prev, ...changedValues }));
      }}>
        {renderStepContent()}
      </Form>

      {/* Navigation Buttons */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Space>
          {currentStep > 0 && (
            <Button onClick={prevStep}>Previous</Button>
          )}
          {currentStep < steps.length - 1 && (
            <Button type="primary" onClick={nextStep}>Next</Button>
          )}
          {currentStep === steps.length - 1 && (
            <Button type="primary" loading={submitting} onClick={handleSubmit}>
              Submit Permit
            </Button>
          )}
          <Button onClick={() => navigate('/dashboard/ptw')}>Back to List</Button>
          {isEditing && (
            <Button onClick={() => navigate(`/dashboard/ptw/view/${id}`)}>Back to View</Button>
          )}
        </Space>
      </div>

      {/* Floating Action Buttons for Mobile */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
        <Space direction="vertical">
          <Button 
            type="primary" 
            shape="circle" 
            icon={<CameraOutlined />} 
            size="large"
            title="Quick Photo"
          />
          <Button 
            type="primary" 
            shape="circle" 
            icon={<QrcodeOutlined />} 
            size="large"
            title="Scan QR"
          />
          <Button 
            type="primary" 
            shape="circle" 
            icon={<BellOutlined />} 
            size="large"
            title="Notifications"
          />
        </Space>
      </div>
      </div>
    </PageLayout>
  );
};

export default EnhancedPermitForm;