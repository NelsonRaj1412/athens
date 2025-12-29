import React, { useState, useEffect, useCallback } from 'react';
import { Form, Input, Button, Select, DatePicker, App, Typography, Row, Col, Checkbox, Upload, Space, Spin } from 'antd';
import { CameraOutlined, UserOutlined, IdcardOutlined, HomeOutlined, SolutionOutlined, UploadOutlined } from '@ant-design/icons';
import type { RcFile, UploadChangeParam } from 'antd/es/upload';
import styled from 'styled-components';
import api from '@common/utils/axiosetup';
import moment from 'moment';
import FaceCapture from '../../../components/FaceCapture';
import { DEPARTMENTS, DESIGNATIONS_BY_DEPARTMENT } from '../constants';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// --- Interface & Utility (Unchanged) ---
interface WorkerCreationProps {
  onFinish?: (values: any) => void;
}

const dataURLtoFile = (dataurl: string, filename: string): File => {

  const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]); let n = bstr.length; const u8arr = new Uint8Array(n);
  while (n--) { u8arr[n] = bstr.charCodeAt(n); }
  return new File([u8arr], filename, { type: mime });
};

// --- Styled Components for Themed UI ---
const FormContainer = styled.div`
  max-width: 900px; margin: 0 auto; padding: 24px;
  background-color: var(--color-ui-base);
  border-radius: var(--border-radius-lg);
  border: 1px solid var(--color-border);

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Remove conflicting modal styles - handled globally */
`;
const Section = styled.div` margin-bottom: 32px; `;
const SectionTitle = styled(Title)`
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 24px !important; font-size: 1.1rem !important;
  color: var(--color-text-base) !important;
`;
const PhotoSection = styled.div`
  display: flex; flex-direction: column; align-items: center;
  padding: 16px; border: 1px dashed var(--color-border);
  border-radius: var(--border-radius-lg);
`;
const PhotoPreview = styled.img`
  width: 200px; height: 200px; object-fit: cover;
  border-radius: 50%; margin-bottom: 16px;
  border: 4px solid var(--color-border);
`;
const WebcamWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 450px;
  background: white;
  border-radius: 8px;
  padding: 20px;

  .webcam-video {
    border-radius: 8px;
    max-width: 100%;
    height: auto;
    background: white;
  }
`;

const CameraErrorWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 450px;
  background: white;
  border-radius: 8px;
  padding: 20px;
  text-align: center;

  .error-icon {
    font-size: 48px;
    color: #ff4d4f;
    margin-bottom: 16px;
  }

  .error-text {
    color: #666;
    margin-bottom: 16px;
    font-size: 16px;
  }
`;

const LoadingWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 450px;
  background: white;
  border-radius: 8px;
  padding: 20px;

  .loading-text {
    margin-top: 16px;
    color: #666;
    font-size: 16px;
  }
`;

// --- Component Definition ---
const WorkerCreation: React.FC<WorkerCreationProps> = ({ onFinish }) => {
  const [form] = Form.useForm();
  const {message} = App.useApp();
  const [loading, setLoading] = useState(false);
  const [sameAsPresent, setSameAsPresent] = useState(false);
  const [showOtherEducation, setShowOtherEducation] = useState(false);
  const [faceCapture, setFaceCapture] = useState<{ visible: boolean }>({ visible: false });
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<RcFile | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [availableDesignations, setAvailableDesignations] = useState<Array<{value: string, label: string}>>([]);
  const [aadhaarValidating, setAadhaarValidating] = useState(false);

  // Initialize designations when department changes
  useEffect(() => {
    if (selectedDepartment) {
      const designations = DESIGNATIONS_BY_DEPARTMENT[selectedDepartment] || [];
      setAvailableDesignations(designations);
    } else {
      setAvailableDesignations([]);
    }
  }, [selectedDepartment]);

  const handleSameAddressChange = useCallback((e: any) => {
    const isChecked = e.target.checked;
    setSameAsPresent(isChecked);
    if (isChecked) form.setFieldsValue({ permanent_address: form.getFieldValue('present_address') });
  }, [form]);

  const handleEducationChange = useCallback((value: string) => setShowOtherEducation(value === 'Other'), []);

  const handleDepartmentChange = useCallback((value: string) => {
    setSelectedDepartment(value);
    const designations = DESIGNATIONS_BY_DEPARTMENT[value] || [];
    setAvailableDesignations(designations);
    form.setFieldsValue({ designation: undefined }); // Clear designation when department changes
  }, [form]);

  // Function to check for duplicate Aadhaar number across ALL workers in the database
  const checkDuplicateAadhaar = useCallback(async (aadhaarNumber: string, showLoading: boolean = false) => {
    if (!aadhaarNumber || aadhaarNumber.length !== 12) {
      return { isDuplicate: false };
    }

    try {
      if (showLoading) setAadhaarValidating(true);

      const response = await api.get('/worker/check_duplicate_aadhaar/', {
        params: { aadhaar: aadhaarNumber }
      });

      if (response.data.isDuplicate) {
        return {
          isDuplicate: true,
          existingWorker: response.data.existingWorker
        };
      }

      return { isDuplicate: false };
    } catch (error: any) {
      return { isDuplicate: false };
    } finally {
      if (showLoading) setAadhaarValidating(false);
    }
  }, []);

  const handleUploadChange = useCallback((info: UploadChangeParam) => {
    const file = info.fileList[0]?.originFileObj || null;
    if (file) { setUploadedFile(file as RcFile); setPhotoSrc(null); } 
    else { setUploadedFile(null); }
    form.validateFields(['photo']);
  }, [form]);

  const handleAlphaInputChange = useCallback((fieldName: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    // Restrict input to characters only, no numeric values
    // Improved: prevent input if any non-letter character is present
    if (/^[A-Za-z\s]*$/.test(value)) {
      form.setFieldsValue({ [fieldName]: value });
    } else {
      // Remove all non-letter characters from input
      const filteredValue = value.replace(/[^A-Za-z\s]/g, '');
      form.setFieldsValue({ [fieldName]: filteredValue });
    }
  }, [form]);

const handleNumericInputChange = useCallback((fieldName: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    if (/^\d*$/.test(value)) {
      if ((fieldName === 'phone_number' || fieldName === 'uan' || fieldName === 'aadhaar') && value.length > 10) {
        // Prevent input if length exceeds 10 for phone_number, uan, aadhaar
        return;
      }
      form.setFieldsValue({ [fieldName]: value });
    } else {
      form.setFieldsValue({ [fieldName]: form.getFieldValue(fieldName) });
    }
  }, [form]);

  const internalOnFinish = useCallback(async (values: any) => {
    setLoading(true);

    // Pre-submission duplicate check for Aadhaar
    if (values.aadhaar) {
      const duplicateCheck = await checkDuplicateAadhaar(values.aadhaar);
      if (duplicateCheck.isDuplicate) {
        const existingWorker = duplicateCheck.existingWorker;
        const createdByInfo = existingWorker.created_by ? ` (Created by: ${existingWorker.created_by})` : '';
        const projectInfo = existingWorker.project ? ` in project: ${existingWorker.project}` : '';
        const errorMessage = `Cannot create worker: This Aadhaar number (${values.aadhaar}) is already registered with ${existingWorker.name} ${existingWorker.surname} (Worker ID: ${existingWorker.worker_id})${createdByInfo}${projectInfo}`;
        message.error({
          content: errorMessage,
          duration: 8, // Show error for 8 seconds since message is longer
          style: {
            marginTop: '20vh',
          },
        });

        // Also set form field error to highlight the problematic field
        form.setFields([{
          name: 'aadhaar',
          errors: [errorMessage]
        }]);

        setLoading(false);
        return;
      }
    }

    const formData = new FormData();
    const formattedValues = { ...values, date_of_birth: values.date_of_birth?.format('YYYY-MM-DD'), date_of_joining: values.date_of_joining?.format('YYYY-MM-DD'), employment_status: values.employment_status || 'initiated' };
    Object.keys(formattedValues).forEach(key => { if (key !== 'photo' && formattedValues[key] != null) formData.append(key, formattedValues[key]); });
    if (photoSrc) formData.append('photo', dataURLtoFile(photoSrc, 'worker_photo.jpg'));
    else if (uploadedFile) formData.append('photo', uploadedFile);

    try {
      const response = await api.post('/worker/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      message.success('Worker created successfully');
      form.resetFields();
      setPhotoSrc(null); setUploadedFile(null);
      if (onFinish) onFinish(response.data);
    } catch (error: any) {

      // Handle specific validation errors
      if (error.response?.data) {
        const errorData = error.response.data;

        // Handle field-specific errors
        if (typeof errorData === 'object') {
          const errorMessages = [];

          // Check for specific field errors
          if (errorData.aadhaar) {
            errorMessages.push(`Aadhaar: ${Array.isArray(errorData.aadhaar) ? errorData.aadhaar[0] : errorData.aadhaar}`);
          }
          if (errorData.pan) {
            errorMessages.push(`PAN: ${Array.isArray(errorData.pan) ? errorData.pan[0] : errorData.pan}`);
          }
          if (errorData.uan) {
            errorMessages.push(`UAN: ${Array.isArray(errorData.uan) ? errorData.uan[0] : errorData.uan}`);
          }
          if (errorData.phone_number) {
            errorMessages.push(`Phone: ${Array.isArray(errorData.phone_number) ? errorData.phone_number[0] : errorData.phone_number}`);
          }
          if (errorData.esic_ip) {
            errorMessages.push(`ESIC IP: ${Array.isArray(errorData.esic_ip) ? errorData.esic_ip[0] : errorData.esic_ip}`);
          }

          if (errorMessages.length > 0) {
            message.error(`Validation Error: ${errorMessages.join('; ')}`);
          } else {
            message.error('Failed to create worker: ' + (errorData.detail || errorData.message || 'Unknown error'));
          }
        } else {
          message.error('Failed to create worker: ' + errorData);
        }
      } else {
        message.error('Failed to create worker: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  }, [photoSrc, uploadedFile, form, onFinish]);

  const previewSrc = photoSrc || (uploadedFile ? URL.createObjectURL(uploadedFile) : null);

  return (
    <FormContainer>
      <Title level={3} style={{ textAlign: 'center', marginBottom: 24, color: 'var(--color-text-base)' }}>Add New Worker</Title>
      <Form form={form} layout="vertical" onFinish={internalOnFinish} initialValues={{ status: 'active', nationality: 'Indian', employment_type: 'temporary', employment_status: 'initiated' }}>
        
        <Section><SectionTitle level={4}><UserOutlined />Personal Information</SectionTitle>
            <Row gutter={16}>
                <Col xs={24} sm={12}><Form.Item label="Name" name="name" rules={[{ required: true }, { pattern: /^[A-Za-z\s]+$/, message: 'Only letters and spaces' }]}><Input placeholder="Enter worker name" onChange={handleAlphaInputChange('name')} /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Surname" name="surname" rules={[{ required: true }, { pattern: /^[A-Za-z\s]+$/, message: 'Only letters and spaces' }]}><Input placeholder="Enter surname" onChange={handleAlphaInputChange('surname')} /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Father's/Spouse Name" name="father_or_spouse_name" rules={[{ required: true }, { pattern: /^[A-Za-z\s]+$/, message: 'Only letters and spaces' }]}><Input placeholder="Enter name" onChange={handleAlphaInputChange('father_or_spouse_name')} /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Date of Birth" name="date_of_birth" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} disabledDate={(c) => c && c > moment().subtract(18, 'years')} /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Gender" name="gender" rules={[{ required: true }]}><Select placeholder="Select gender"><Option value="Male">Male</Option><Option value="Female">Female</Option><Option value="Other">Other</Option></Select></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Nationality" name="nationality" rules={[{ required: true }]}><Input placeholder="Enter nationality" onChange={handleAlphaInputChange('nationality')} /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Mark of Identification" name="mark_of_identification" rules={[{ required: true }]}><Input placeholder="e.g., Mole on right cheek" onChange={handleAlphaInputChange('mark_of_identification')} /></Form.Item></Col>
            </Row>
        </Section>
        
        <Section><SectionTitle level={4}><SolutionOutlined />Employment Details</SectionTitle>
             <Row gutter={16}>

                <Col xs={24} sm={12}><Form.Item label="Date of Joining" name="date_of_joining" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
<Col xs={24} sm={12}>
                  <Form.Item label="Department" name="department" rules={[{ required: true }]}>
                    <Select placeholder="Select department" onChange={handleDepartmentChange}>
                      {DEPARTMENTS.map(dept => (
                        <Option key={dept.value} value={dept.value}>{dept.label}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Designation" name="designation" rules={[{ required: true }]}>
                    <Select placeholder="Select designation" disabled={!selectedDepartment}>
                      {availableDesignations.map(designation => (
                        <Option key={designation.value} value={designation.value}>{designation.label}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}><Form.Item label="Category" name="category" rules={[{ required: true }]}><Select placeholder="Select category"><Option value="Highly Skilled">Highly Skilled</Option><Option value="Skilled">Skilled</Option><Option value="Semi Skilled">Semi Skilled</Option><Option value="Unskilled">Unskilled</Option></Select></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Employment Type" name="employment_type" rules={[{ required: true }]}><Select placeholder="Select type"><Option value="temporary">Temporary</Option><Option value="permanent">Permanent</Option></Select></Form.Item></Col>
                {/* ** RESTORED FULL EDUCATION LIST ** */}
                <Col xs={24} sm={12}><Form.Item label="Education Level" name="education_level" rules={[{ required: true }]}><Select placeholder="Select education" onChange={handleEducationChange}><Option value="No Formal Education">No Formal Education</Option><Option value="High School Diploma / Equivalent">High School Diploma / Equivalent</Option><Option value="Vocational Training / Certification">Vocational Training / Certification</Option><Option value="Associate Degree">Associate Degree</Option><Option value="Bachelor's Degree">Bachelor's Degree</Option><Option value="Master's Degree">Master's Degree</Option><Option value="Doctorate / PhD">Doctorate / PhD</Option><Option value="Other">Other (Please specify)</Option></Select></Form.Item></Col>
                {showOtherEducation && <Col xs={24} sm={12}><Form.Item label="Other (Specify)" name="education_other" rules={[{ required: true }]}><Input placeholder="Specify education" /></Form.Item></Col>}
                 {/* ** RESTORED MISSING STATUS FIELDS ** */}
                <Col xs={24} sm={12}><Form.Item label="Status" name="status" rules={[{ required: true }]}><Select placeholder="Select status"><Option value="active">Active</Option><Option value="inactive">Inactive</Option><Option value="on_leave">On Leave</Option></Select></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Employment Status" name="employment_status" rules={[{ required: true }]}><Select placeholder="Select employment status"><Option value="initiated">Initiated</Option><Option value="deployed">Deployed</Option><Option value="terminated">Terminated</Option><Option value="site_transferred">Site Transferred</Option></Select></Form.Item></Col>
            </Row>
        </Section>

        <Section><SectionTitle level={4}><IdcardOutlined />Identity & Contact</SectionTitle>
            <Row gutter={16}>
                {/* Contact Information */}
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Mobile Number"
                    name="phone_number"
                    rules={[
                      { required: true, message: 'Mobile number is required' },
                      { pattern: /^[6-9]\d{9}$/, message: 'Enter valid 10-digit number starting with 6, 7, 8, or 9' }
                    ]}
                    extra="10-digit Indian mobile number"
                  >
                    <Input
                      placeholder="Enter 10-digit mobile number"
                      maxLength={10}
                      onChange={handleNumericInputChange('phone_number')}
                      onKeyPress={(e) => { if (!/[0-9]/.test(e.key)) { e.preventDefault(); } }}
                      style={{ fontSize: '16px' }}
                    />
                  </Form.Item>
                </Col>

                {/* Identity Documents */}
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Aadhaar Number"
                    name="aadhaar"
                    rules={[
                      { required: true, message: 'Aadhaar number is required' },
                      { pattern: /^\d{12}$/, message: 'Aadhaar must be exactly 12 digits' },
                      {
                        validator: async (_, value) => {
                          if (value && value.length === 12) {
                            const duplicateCheck = await checkDuplicateAadhaar(value, true); // Show loading
                            if (duplicateCheck.isDuplicate) {
                              const existingWorker = duplicateCheck.existingWorker;
                              const createdByInfo = existingWorker.created_by ? ` (Created by: ${existingWorker.created_by})` : '';
                              const projectInfo = existingWorker.project ? ` in project: ${existingWorker.project}` : '';
                              const errorMessage = `This Aadhaar number is already registered with worker: ${existingWorker.name} ${existingWorker.surname} (ID: ${existingWorker.worker_id})${createdByInfo}${projectInfo}`;
                              throw new Error(errorMessage);
                            }
                          }
                          return Promise.resolve();
                        }
                      }
                    ]}
                    extra={
                      <span>
                        12-digit unique Aadhaar number
                        {aadhaarValidating && <span style={{ color: '#1890ff', marginLeft: '8px' }}>
                          <Spin size="small" style={{ marginRight: '4px' }} />
                          Checking for duplicates...
                        </span>}
                      </span>
                    }
                    hasFeedback
                    validateStatus={aadhaarValidating ? 'validating' : undefined}
                  >
                    <Input
                      placeholder="Enter 12-digit Aadhaar number"
                      maxLength={12}
                      onChange={(e) => {
                        handleNumericInputChange('aadhaar')(e);
                        // Clear previous validation errors when user starts typing
                        if (e.target.value.length < 12) {
                          form.setFields([{
                            name: 'aadhaar',
                            errors: []
                          }]);
                        }
                        // Trigger validation after user completes 12 digits
                        if (e.target.value.length === 12) {
                          setTimeout(() => {
                            form.validateFields(['aadhaar']);
                          }, 800); // Increased delay to reduce API calls
                        }
                      }}
                      onKeyPress={(e) => { if (!/[0-9]/.test(e.key)) { e.preventDefault(); } }}
                      style={{ fontSize: '16px', letterSpacing: '1px' }}
                      suffix={aadhaarValidating ? <Spin size="small" /> : null}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item
                    label="UAN Number"
                    name="uan"
                    rules={[
                      { pattern: /^\d{12}$/, message: 'UAN must be exactly 12 digits if provided' }
                    ]}
                    extra="12-digit UAN number (optional)"
                  >
                    <Input
                      placeholder="Enter 12-digit UAN (optional)"
                      maxLength={12}
                      onChange={handleNumericInputChange('uan')}
                      onKeyPress={(e) => { if (!/[0-9]/.test(e.key)) { e.preventDefault(); } }}
                      style={{ fontSize: '16px', letterSpacing: '1px' }}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item
                    label="PAN Number"
                    name="pan"
                    rules={[
                      { pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, message: 'Invalid PAN format (e.g., ABCDE1234F)' }
                    ]}
                    extra="10-character PAN number (optional)"
                  >
                    <Input
                      placeholder="Enter PAN (e.g., ABCDE1234F)"
                      maxLength={10}
                      style={{ textTransform: 'uppercase', fontSize: '16px', letterSpacing: '1px' }}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        form.setFieldsValue({ pan: value });
                      }}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item
                    label="ESIC IP Number"
                    name="esic_ip"
                    extra="Employee State Insurance IP number (optional)"
                  >
                    <Input
                      placeholder="Enter ESIC IP number (optional)"
                      style={{ fontSize: '16px' }}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item
                    label="LWF Number"
                    name="lwf"
                    extra="Labour Welfare Fund number (optional)"
                  >
                    <Input
                      placeholder="Enter LWF number (optional)"
                      style={{ fontSize: '16px' }}
                    />
                  </Form.Item>
                </Col>
            </Row>
        </Section>
        
        <Section><SectionTitle level={4}><HomeOutlined />Address</SectionTitle>
            <Row gutter={16}>
                <Col span={24}><Form.Item label="Present Address" name="present_address" rules={[{ required: true }]}><TextArea rows={3} placeholder="Enter present address" /></Form.Item></Col>
                <Col span={24}><Form.Item><Checkbox checked={sameAsPresent} onChange={handleSameAddressChange}>Permanent Address is same as Present Address</Checkbox></Form.Item></Col>
                <Col span={24}><Form.Item label="Permanent Address" name="permanent_address" rules={[{ required: true }]}><TextArea rows={3} placeholder="Enter permanent address" disabled={sameAsPresent} /></Form.Item></Col>
            </Row>
        </Section>
        
        <Section><SectionTitle level={4}><CameraOutlined />Photo</SectionTitle>
            <Form.Item name="photo" rules={[{ validator: async () => { if (previewSrc) return Promise.resolve(); return Promise.reject(new Error('Please provide a photo')); } }]}>
                <PhotoSection>{previewSrc && <PhotoPreview src={previewSrc} alt="Worker" />}
                    <Space>
                        <Upload accept="image/*" maxCount={1} showUploadList={false} beforeUpload={() => false} onChange={handleUploadChange}><Button icon={<UploadOutlined />}>Upload from Device</Button></Upload>
                        <Button icon={<CameraOutlined />} onClick={() => setFaceCapture({ visible: true })}>Use Camera</Button>
                    </Space>
                </PhotoSection>
            </Form.Item>
        </Section>
        
        <Form.Item><Button type="primary" htmlType="submit" loading={loading} block size="large">Create Worker</Button></Form.Item>
      </Form>
      
      <FaceCapture
        visible={faceCapture.visible}
        onClose={() => setFaceCapture({ visible: false })}
        onCapture={(result) => {
          setPhotoSrc(result.photo);
          setUploadedFile(null);
          setFaceCapture({ visible: false });
          form.validateFields(['photo']);
          message.success('Photo captured successfully!');
        }}
        title="Take Worker Photo"
        userName="Worker"
      />
    </FormContainer>
  );
};

export default WorkerCreation;