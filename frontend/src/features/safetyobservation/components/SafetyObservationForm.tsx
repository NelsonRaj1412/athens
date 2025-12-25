import React, { useState, useEffect } from 'react';
import { Form, Input, Button, DatePicker, TimePicker, Select, Upload, App, Card, Divider, Row, Col } from 'antd';
import { CameraOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import api from '../../../common/utils/axiosetup';
import useAuthStore from '../../../common/store/authStore';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

// EXACT BACKEND MODEL CHOICES - PERFECTLY ALIGNED
const observationTypeOptions = [
  { value: 'unsafe_act', label: 'Unsafe Act' },
  { value: 'unsafe_condition', label: 'Unsafe Condition' },
  { value: 'safe_act', label: 'Safe Act' },
  { value: 'near_miss', label: 'Near Miss' },
  { value: 'at_risk_behavior', label: 'At-Risk Behavior' },
  { value: 'improvement_opportunity', label: 'Improvement Opportunity' },
  { value: 'repeat_observation', label: 'Repeat Observation' },
  { value: 'ppe_non_compliance', label: 'PPE Non-Compliance' },
  { value: 'violation_procedure', label: 'Violation of Procedure/Permit' },
  { value: 'training_need', label: 'Training Need to be Identified' },
  { value: 'emergency_preparedness', label: 'Emergency Preparedness' },
];

const classificationOptions = [
  { value: 'ppe_compliance', label: 'PPE - Personal Protective Equipment' },
  { value: 'procedure_deviation', label: 'Procedure Deviation' },
  { value: 'emergency_preparedness', label: 'Emergency Preparedness' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'access_egress', label: 'Access Egress' },
  { value: 'barricade', label: 'Barricade' },
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'material_handling', label: 'Material Handling' },
  { value: 'work_at_height', label: 'Work at Height' },
  { value: 'environment_hygiene', label: 'Environment & Hygiene' },
  { value: 'permit', label: 'Permit' },
  { value: 'civil', label: 'Civil' },
  { value: 'chemical_exposure', label: 'Chemical Exposure' },
  { value: 'fire_safety', label: 'Fire Safety' },
  { value: 'machinery_equipment', label: 'Machinery & Equipment' },
];

const severityOptions = [
  { value: 1, label: 'Low' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'High' },
  { value: 4, label: 'Critical' },
];

const likelihoodOptions = [
  { value: 1, label: 'Rare' },
  { value: 2, label: 'Possible' },
  { value: 3, label: 'Likely' },
  { value: 4, label: 'Certain' },
];

const observationStatusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'pending_verification', label: 'Pending Verification' },
  { value: 'closed', label: 'Closed' },
  { value: 'rejected', label: 'Rejected' },
];

const departmentOptions = ['Electrical', 'Civil', 'Mechanical', 'Stores'];

interface SafetyObservationFormProps {
  observationID?: string;
  onSuccess?: () => void;
  initialData?: any;
  isEditMode?: boolean;
}

const SafetyObservationForm: React.FC<SafetyObservationFormProps> = ({
  observationID,
  onSuccess,
  initialData,
  isEditMode = false
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [epcUsers, setEpcUsers] = useState<any[]>([]);
  const [contractors, setContractors] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [observationPhotos, setObservationPhotos] = useState<any[]>([]);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const { message } = App.useApp();
  const { username, projectId } = useAuthStore();
  const params = useParams();

  // Generate unique observation ID
  const generateObservationID = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `SO-${year}${month}${day}-${hours}${minutes}${seconds}`;
  };

  // Generate observation ID only once when component mounts
  const [currentObservationID] = useState(() =>
    observationID || params.observationID || (isEditMode ? '' : generateObservationID())
  );

  // Set initial form values when initialData is provided
  useEffect(() => {
    if (initialData && isEditMode) {
      form.setFieldsValue({
        observationID: initialData.observationID,
        reportedBy: initialData.reportedBy,
        date: initialData.date ? dayjs(initialData.date) : null,
        time: initialData.time ? dayjs(initialData.time, 'HH:mm:ss') : null,
        department: initialData.department,
        workLocation: initialData.workLocation,
        activityPerforming: initialData.activityPerforming,
        contractorName: initialData.contractorName,
        typeOfObservation: initialData.typeOfObservation,
        classification: initialData.classification?.[0] || '',
        safetyObservationFound: initialData.safetyObservationFound,
        severity: initialData.severity,
        likelihood: initialData.likelihood,
        correctivePreventiveAction: initialData.correctivePreventiveAction,
        correctiveActionAssignedTo: initialData.correctiveActionAssignedTo,
        commitmentDate: initialData.commitmentDate ? dayjs(initialData.commitmentDate) : null,
        observationStatus: initialData.observationStatus,
        remarks: initialData.remarks,
      });
    }
  }, [initialData, isEditMode, form]);

  // Fetch EPC users and contractors on component mount
  useEffect(() => {
    const fetchUsersAndContractors = async () => {

      setLoadingUsers(true);
      try {
        // Fetch EPC users for corrective action assignment
        const epcResponse = await api.get('/authentication/epcuser-list/');
        setEpcUsers(epcResponse.data || []);

        // Fetch contractor users for contractor name dropdown
        const contractorResponse = await api.get('/authentication/contractoruser-list/');

        // Extract company names from contractor users
        const contractorUsers = contractorResponse.data || [];
        const companyNames = [...new Set(contractorUsers.map((user: any) => user.company_name).filter(Boolean))] as string[];
        setContractors(companyNames);

      } catch (error: any) {
        message.error('Failed to load users and contractors');
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsersAndContractors();
  }, [message]);

  // Photo upload handlers
  const handlePhotoUpload = (info: any) => {
    const { fileList } = info;
    setObservationPhotos(fileList);
  };

  const beforePhotoUpload = (file: any) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('You can only upload image files!');
      return false;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Image must be smaller than 5MB!');
      return false;
    }
    return false; // Prevent auto upload, we'll handle it manually
  };

  // Form submission handler
  const onFinish = async (values: any) => {

    // Generate unique submission ID
    const currentSubmissionId = `${currentObservationID}-${Date.now()}`;

    // Prevent multiple submissions
    if (loading) {
      return;
    }

    // Check if this exact submission was already processed
    if (submissionId === currentSubmissionId) {
      return;
    }

    setSubmissionId(currentSubmissionId);
    setLoading(true);

    try {
      // Prepare FormData for file uploads
      const formData = new FormData();

      // Basic Information (REQUIRED)
      formData.append('observationID', currentObservationID);
      
      // Handle date and time properly
      if (values.date) {
        formData.append('date', values.date.format('YYYY-MM-DD'));
      }
      if (values.time) {
        formData.append('time', values.time.format('HH:mm:ss'));
      }
      
      formData.append('reportedBy', username || '');
      formData.append('department', values.department || '');
      formData.append('workLocation', values.workLocation || '');
      formData.append('activityPerforming', values.activityPerforming || '');

      // Optional Basic Fields
      formData.append('contractorName', values.contractorName || '');

      // Observation Details (REQUIRED)
      formData.append('typeOfObservation', values.typeOfObservation);
      
      // Handle classification properly - backend expects JSON array
      if (values.classification) {
        const classification = Array.isArray(values.classification) ? values.classification : [values.classification];
        formData.append('classification', JSON.stringify(classification));
      } else {
        formData.append('classification', JSON.stringify([]));
      }
      
      formData.append('safetyObservationFound', values.safetyObservationFound || '');

      // Risk Assessment (REQUIRED)
      formData.append('severity', String(values.severity));
      formData.append('likelihood', String(values.likelihood));

      // CAPA Information (REQUIRED)
      formData.append('correctivePreventiveAction', values.correctivePreventiveAction || '');
      formData.append('correctiveActionAssignedTo', values.correctiveActionAssignedTo || '');

      // Commitment Date (Optional) - FIXED FIELD NAME
      if (values.commitmentDate) {
        formData.append('commitmentDate', values.commitmentDate.format('YYYY-MM-DD'));
      }

      // Status and Closure
      formData.append('observationStatus', values.observationStatus || 'open');
      formData.append('remarks', values.remarks || '');

      // Add observation photos
      observationPhotos.forEach((file) => {
        if (file.originFileObj) {
          formData.append('beforePictures', file.originFileObj);
        }
      });


      // Debug: Log all FormData entries
      for (let [key, value] of formData.entries()) {
      }

      let response;
      if (isEditMode && observationID) {
        response = await api.put(`/api/v1/safetyobservation/${observationID}/`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        message.success('Safety observation updated successfully!');
      } else {
        response = await api.post('/api/v1/safetyobservation/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        message.success('Safety observation created successfully!');
      }


      if (!isEditMode) {
        form.resetFields();
        setObservationPhotos([]); // Clear uploaded photos
      }
      if (onSuccess) onSuccess();

    } catch (error: any) {
      console.error('Safety Observation Update Error:', error);
      console.error('Error Response:', error.response);
      
      let errorMessage = isEditMode ? 'Failed to update safety observation' : 'Failed to create safety observation';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else {
          // Handle field-specific validation errors
          const fieldErrors = [];
          for (const [field, errors] of Object.entries(error.response.data)) {
            if (Array.isArray(errors)) {
              fieldErrors.push(`${field}: ${errors.join(', ')}`);
            } else {
              fieldErrors.push(`${field}: ${errors}`);
            }
          }
          if (fieldErrors.length > 0) {
            errorMessage = fieldErrors.join('; ');
          } else {
            errorMessage = JSON.stringify(error.response.data);
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      message.error(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Safety Observation Form" style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          observationID: currentObservationID,
          reportedBy: username,
          typeOfObservation: 'unsafe_act',
          severity: 1,
          likelihood: 1,
          observationStatus: 'open',
        }}
      >
        {/* Basic Information Section */}
        <Divider orientation="left">Basic Information</Divider>
        
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Observation ID"
              name="observationID"
            >
              <Input size="large" disabled />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Reported By"
              name="reportedBy"
            >
              <Input size="large" disabled />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Date"
              name="date"
              rules={[{ required: true, message: 'Please select date' }]}
            >
              <DatePicker size="large" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Time"
              name="time"
              rules={[{ required: true, message: 'Please select time' }]}
            >
              <TimePicker size="large" style={{ width: '100%' }} format="HH:mm" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Department"
              name="department"
              rules={[{ required: true, message: 'Please select department' }]}
            >
              <Select size="large" placeholder="Select department">
                {departmentOptions.map(dept => (
                  <Option key={dept} value={dept}>{dept}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Work Location"
              name="workLocation"
              rules={[{ required: true, message: 'Please enter work location' }]}
            >
              <Input size="large" placeholder="Enter work location" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Activity Performing"
              name="activityPerforming"
              rules={[{ required: true, message: 'Please enter activity' }]}
            >
              <Input size="large" placeholder="Enter activity being performed" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Contractor Name"
              name="contractorName"
            >
              <Select
                size="large"
                placeholder="Select contractor (optional)"
                loading={loadingUsers}
                allowClear
              >
                {contractors.map(contractor => (
                  <Option key={contractor} value={contractor}>{contractor}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Observation Details Section */}
        <Divider orientation="left">Observation Details</Divider>
        
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Type of Observation"
              name="typeOfObservation"
              rules={[{ required: true, message: 'Please select observation type' }]}
            >
              <Select size="large" placeholder="Select observation type">
                {observationTypeOptions.map(type => (
                  <Option key={type.value} value={type.value}>{type.label}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Classification"
              name="classification"
              rules={[{ required: true, message: 'Please select classification' }]}
            >
              <Select size="large" placeholder="Select classification">
                {classificationOptions.map(cls => (
                  <Option key={cls.value} value={cls.value}>{cls.label}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Safety Observation Found"
          name="safetyObservationFound"
          rules={[{ required: true, message: 'Please describe the observation' }]}
        >
          <TextArea rows={4} size="large" placeholder="Describe the safety observation found..." />
        </Form.Item>

        <Form.Item
          label="Observation Photos"
          name="observationPhotos"
          extra="Upload photos of the safety observation (Max 5MB per image)"
        >
          <Upload
            listType="picture-card"
            fileList={observationPhotos}
            onChange={handlePhotoUpload}
            beforeUpload={beforePhotoUpload}
            multiple
            accept="image/*"
            maxCount={5}
          >
            {observationPhotos.length >= 5 ? null : (
              <div>
                <CameraOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                <div>Upload Photos</div>
              </div>
            )}
          </Upload>
        </Form.Item>

        {/* Risk Assessment Section */}
        <Divider orientation="left">Risk Assessment</Divider>
        
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Severity"
              name="severity"
              rules={[{ required: true, message: 'Please select severity' }]}
            >
              <Select size="large" placeholder="Select severity">
                {severityOptions.map(sev => (
                  <Option key={sev.value} value={sev.value}>{sev.label}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Likelihood"
              name="likelihood"
              rules={[{ required: true, message: 'Please select likelihood' }]}
            >
              <Select size="large" placeholder="Select likelihood">
                {likelihoodOptions.map(like => (
                  <Option key={like.value} value={like.value}>{like.label}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* CAPA Section */}
        <Divider orientation="left">Corrective & Preventive Action</Divider>
        
        <Form.Item
          label="Corrective/Preventive Action"
          name="correctivePreventiveAction"
          rules={[{ required: true, message: 'Please enter corrective action' }]}
        >
          <TextArea rows={4} size="large" placeholder="Describe the corrective/preventive action required..." />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Assigned To"
              name="correctiveActionAssignedTo"
              rules={[{ required: true, message: 'Please select assigned person' }]}
            >
              <Select
                size="large"
                placeholder="Select person to assign corrective action"
                loading={loadingUsers}
                showSearch
                filterOption={(input, option) =>
                  String(option?.children || '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {epcUsers.map(user => (
                  <Option key={user.id} value={user.username}>
                    {user.first_name} {user.last_name} ({user.username})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Commitment Date (Optional)"
              name="commitmentDate"
            >
              <DatePicker
                size="large"
                style={{ width: '100%' }}
                placeholder="Select commitment date"
                disabledDate={(current) => current && current < dayjs().startOf('day')}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Observation Status"
              name="observationStatus"
              rules={[{ required: true, message: 'Please select status' }]}
            >
              <Select size="large" placeholder="Select status">
                {observationStatusOptions.map(status => (
                  <Option key={status.value} value={status.value}>{status.label}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Additional Information */}
        <Divider orientation="left">Additional Information</Divider>
        
        <Form.Item
          label="Remarks"
          name="remarks"
        >
          <TextArea rows={3} size="large" placeholder="Additional remarks (optional)..." />
        </Form.Item>

        {/* Submit Button */}
        <Form.Item style={{ textAlign: 'center', marginTop: 32 }}>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={loading}
            style={{ minWidth: 200, height: 48, fontSize: 16 }}
          >
            {loading
              ? (isEditMode ? 'Updating...' : 'Creating...')
              : (isEditMode ? 'Update Safety Observation' : 'Create Safety Observation')
            }
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default SafetyObservationForm;
