import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Form, Input, Select, DatePicker, Upload, Button, Row, Col, App, Alert, Typography, Modal } from 'antd';
import { UploadOutlined, UserOutlined, IdcardOutlined, FileTextOutlined, SolutionOutlined, CameraOutlined } from '@ant-design/icons';
import type { RcFile, UploadChangeParam, UploadFile } from 'antd/es/upload';
import moment from 'moment';
import styled from 'styled-components';
import api from '../../../common/utils/axiosetup';
import { useNotificationsContext } from '../../../common/contexts/NotificationsContext';
import type { NotificationType } from '../../../common/utils/webSocketNotificationService';
import { useOutletContext } from 'react-router-dom';
import useAuthStore from '../../../common/store/authStore';
import Webcam from 'react-webcam';
import DigitalSignatureTemplate from './DigitalSignatureTemplate';

// --- Type Definitions ---
const { Option } = Select;
const { Title, Text } = Typography;

export interface UserDetailApiResponse {
  id: number;
  user: number;
  employee_id: string;
  gender: string;
  father_or_spouse_name: string;
  date_of_birth: string | null;
  nationality: string;
  education_level: string;
  date_of_joining: string | null;
  mobile: string;
  uan: string;
  pan: string;
  pan_attachment: string | null;
  aadhaar: string;
  aadhaar_attachment: string | null;
  mark_of_identification: string;
  photo: string | null;
  specimen_signature: string | null;
  is_approved: boolean;
  approved_by: number | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  name: string;
  surname: string;
  designation: string;
  department: string;
  email: string;
}

interface UserDetailProps {
  initialMobile?: string;
}

// --- Helper Functions ---
const normFile = (e: any) => e && (Array.isArray(e) ? e : e.fileList);
const createFileListItem = (url: string | null, fieldName: string): UploadFile[] => {
  if (!url) return [];
  return [{ uid: `-${fieldName}-${Date.now()}`, name: url.substring(url.lastIndexOf('/') + 1) || fieldName, status: 'done', url }];
};

const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error('Invalid data URL');
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
};

// --- Styled Components ---
const UserDetailContainer = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 32px;
  background-color: var(--color-ui-base);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
`;
const FormHeader = styled.div`
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
`;
const Section = styled.div`
  margin-bottom: 32px;
`;
const SectionTitle = styled(Title)`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px !important;
  font-size: 1.1rem !important;
  color: var(--color-text-base) !important;
`;
const SubmissionStatusContainer = styled.div`
  max-width: 800px;
  margin: 40px auto;
`;

// --- Component Definition ---
const UserDetail: React.FC<UserDetailProps> = ({ initialMobile }) => {
  // --- Hooks and State ---
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const outletContext = useOutletContext<{ userToApprove?: any | null; onApprovalSuccess?: (id: number) => void }>();
  const userToApprove = outletContext?.userToApprove;
  const onApprovalSuccess = outletContext?.onApprovalSuccess;
  
  const [fileObjects, setFileObjects] = useState({
    panAttachment: null as RcFile | null,
    aadhaarAttachment: null as RcFile | null,
    photo: null as RcFile | null,
    specimenSignature: null as RcFile | null,
  });

  const [initialPhotoUrl, setInitialPhotoUrl] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [approvalSuccess, setApprovalSuccess] = useState(false);
  const [photoFileList, setPhotoFileList] = useState<UploadFile[]>([]);
  const [isCameraModalVisible, setIsCameraModalVisible] = useState(false);
  const webcamRef = useRef<Webcam>(null);

  const { sendNotification, notifications } = useNotificationsContext();
  const { django_user_type: djangoUserType, userId: currentUserId } = useAuthStore();
  
  // --- Data Fetching and Effects ---
  const fetchUserDetail = useCallback(async () => {
    try {
      let data: any;
      if (userToApprove?.user) {
        // Data from approval flow - map to expected structure
        data = {
          id: userToApprove.id,  // UserDetail ID
          user: userToApprove.user,
          employee_id: userToApprove.employee_id || '',
          gender: userToApprove.gender || '',
          father_or_spouse_name: userToApprove.father_or_spouse_name || '',
          date_of_birth: userToApprove.date_of_birth,
          nationality: userToApprove.nationality || '',
          education_level: userToApprove.education_level || '',
          date_of_joining: userToApprove.date_of_joining,
          mobile: userToApprove.mobile || '',
          uan: userToApprove.uan || '',
          pan: userToApprove.pan || '',
          aadhaar: userToApprove.aadhaar || '',
          mark_of_identification: userToApprove.mark_of_identification || '',
          photo: userToApprove.photo_url,
          pan_attachment: userToApprove.pan_attachment_url,
          aadhaar_attachment: userToApprove.aadhaar_attachment_url,
          specimen_signature: userToApprove.specimen_signature_url,
          name: userToApprove.name || '',
          surname: userToApprove.surname || '',
          designation: userToApprove.designation || '',
          department: userToApprove.department || '',
          email: userToApprove.email || '',
          company_name: userToApprove.company_name || '',
          is_approved: false, // Always false for approval flow
          approved_by: null,
          approved_at: null,
          created_at: '',
          updated_at: ''
        };
      } else {
        const response = await api.get<UserDetailApiResponse>('authentication/userdetail/');
        data = response.data;
      }
      
      setIsApproved(data.is_approved || false);
      setInitialPhotoUrl(data.photo);

      // Set photo file list if photo exists
      if (data.photo) {
        const photoUrl = data.photo.startsWith('http') ? data.photo : `https://prozeal.athenas.co.in${data.photo}`;
        setPhotoFileList([{
          uid: '-1',
          name: 'profile_photo.png',
          status: 'done',
          url: photoUrl,
          thumbUrl: photoUrl,
        }]);
      }

      const formValues = {
        employeeId: data.employee_id || '', name: data.name || '', surname: data.surname || '',
        gender: data.gender || '', fatherOrSpouseName: data.father_or_spouse_name || '',
        dateOfBirth: data.date_of_birth ? moment(data.date_of_birth) : null,
        nationality: data.nationality || '', educationLevel: data.education_level || '',
        dateOfJoining: data.date_of_joining ? moment(data.date_of_joining) : null,
        department: data.department || '', designation: data.designation || '', email: data.email || '',
        mobile: data.mobile || initialMobile || '',
        uan: data.uan || '', pan: data.pan || '', aadhaar: data.aadhaar || '', markOfIdentification: data.mark_of_identification || '',
        panAttachment: createFileListItem(data.pan_attachment ? (data.pan_attachment.startsWith('http') ? data.pan_attachment : `https://prozeal.athenas.co.in${data.pan_attachment}`) : null, 'pan'),
        aadhaarAttachment: createFileListItem(data.aadhaar_attachment ? (data.aadhaar_attachment.startsWith('http') ? data.aadhaar_attachment : `https://prozeal.athenas.co.in${data.aadhaar_attachment}`) : null, 'aadhaar'),
        specimenSignature: createFileListItem(data.specimen_signature ? (data.specimen_signature.startsWith('http') ? data.specimen_signature : `https://prozeal.athenas.co.in${data.specimen_signature}`) : null, 'specimen_signature'),
      };
      form.setFieldsValue(formValues);
    } catch (error) {
      message.error('Failed to load user details.');
    }
  }, [form, userToApprove, initialMobile, message]);

  useEffect(() => {
    fetchUserDetail();
  }, [fetchUserDetail]);
  
  useEffect(() => {
    if (djangoUserType !== 'projectadmin') {
      const approvalNotification = notifications.find(n => n.type === 'approval' && n.data?.formType === 'userdetail' && n.data?.approved && !n.read);
      if (approvalNotification) {
        message.success('Your details have been approved!');
        setIsApproved(true);
        fetchUserDetail();
      }
    }
  }, [notifications, djangoUserType, fetchUserDetail, message]);

  // --- Handlers ---
  const handleUploadChange = useCallback((fieldName: keyof typeof fileObjects) => (info: UploadChangeParam) => {
    const file = info.fileList.length > 0 ? info.fileList[0].originFileObj || null : null;
    setFileObjects(prev => ({ ...prev, [fieldName]: file }));
  }, []);

  const handleCapture = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        const file = dataURLtoFile(imageSrc, `capture_${Date.now()}.jpg`);
        (file as any).uid = `rc-upload-${Date.now()}`;
        setFileObjects(prev => ({ ...prev, photo: file as RcFile }));
        setPhotoFileList([{
          uid: (file as any).uid,
          name: file.name,
          status: 'done',
          originFileObj: file as any,
          thumbUrl: imageSrc,
        }]);
        message.success('Photo captured!');
        setIsCameraModalVisible(false);
        // Clear any validation errors on the photo field
        form.setFields([{ name: 'photo', errors: [] }]);
      } else {
        message.error('Could not capture photo.');
      }
    }
  };

  const handlePhotoUploadChange = useCallback((info: UploadChangeParam) => {
    setPhotoFileList(info.fileList);
    if (info.fileList.length > 0 && info.fileList[0].originFileObj) {
      setFileObjects(prev => ({ ...prev, photo: info.fileList[0].originFileObj as RcFile }));
    } else {
      setFileObjects(prev => ({ ...prev, photo: null }));
    }
  }, []);

  const onFinish = useCallback(async (values: any) => {
    console.log('Form submission started with values:', values);
    console.log('File objects:', fileObjects);
    
    setSubmitting(true);
    const formPayload = new FormData();
    
    formPayload.append('employee_id', values.employeeId || '');
    formPayload.append('gender', values.gender || '');
    formPayload.append('father_or_spouse_name', values.fatherOrSpouseName || '');
    formPayload.append('date_of_birth', values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : '');
    formPayload.append('nationality', values.nationality || '');
    formPayload.append('education_level', values.educationLevel || '');
    formPayload.append('date_of_joining', values.dateOfJoining ? values.dateOfJoining.format('YYYY-MM-DD') : '');
    formPayload.append('mobile', values.mobile || '');
    formPayload.append('uan', values.uan || '');
    formPayload.append('pan', values.pan || '');
    formPayload.append('aadhaar', values.aadhaar || '');
    formPayload.append('mark_of_identification', values.markOfIdentification || '');
    
    if (fileObjects.panAttachment) formPayload.append('pan_attachment', fileObjects.panAttachment);
    if (fileObjects.aadhaarAttachment) formPayload.append('aadhaar_attachment', fileObjects.aadhaarAttachment);
    if (fileObjects.photo) formPayload.append('photo', fileObjects.photo);
    if (fileObjects.specimenSignature) formPayload.append('specimen_signature', fileObjects.specimenSignature);
    
    console.log('FormData prepared, making API call...');
    
    try {
      const response = await api.put('authentication/userdetail/', formPayload, { headers: { 'Content-Type': 'multipart/form-data' } });
      console.log('API response:', response.data);
      
      if (userToApprove?.id) {
        await api.post(`authentication/userdetail/approve/${userToApprove.id}/`);
        await sendNotification(userToApprove.user, { title: 'Your Details Approved', message: 'Your details have been approved by the administrator.', type: 'approval' as NotificationType, data: { formType: 'userdetail', approved: true } });
        if (currentUserId) {
            await sendNotification(currentUserId, { title: 'User Approved Successfully', message: `You approved details for ${userToApprove.name}.`, type: 'approval' as NotificationType, data: { formType: 'userdetail', approved: true, adminAction: true }});
        }
        message.success('User details approved successfully.');
        setApprovalSuccess(true);
        onApprovalSuccess?.(userToApprove.user);
      } else {
        const createdById = response.data.created_by;
        if (createdById) {
          await sendNotification(String(createdById), { title: 'User Details Submitted', message: `${values.name || 'A user'} submitted details for approval.`, type: 'approval' as NotificationType, data: { userId: response.data.user, formType: 'userdetail' }, link: `/dashboard/profile` });
        }
        message.success('Details submitted successfully for admin approval.');
        setFormSubmitted(true);
      }
    } catch (error: any) {
      console.error('API error:', error);
      console.error('Error response:', error.response?.data);
      let errorMessages = 'Failed to update user details. ';
      if (error.response?.status === 413) {
        errorMessages = 'File size too large. Please reduce image sizes and try again.';
      } else if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessages += error.response.data;
        } else {
          for (const key in error.response.data) {
            const value = error.response.data[key];
            if (Array.isArray(value)) {
              errorMessages += `${key}: ${value.join(', ')} `;
            } else {
              errorMessages += `${key}: ${value} `;
            }
          }
        }
      }
      message.error(errorMessages);
    } finally {
      setSubmitting(false);
    }
  }, [fileObjects, userToApprove, onApprovalSuccess, sendNotification, currentUserId, message]);

  // --- Render Logic ---
  if (formSubmitted) return <SubmissionStatusContainer><Alert message="Form Submitted" description="Your details have been submitted for approval. You will be notified once reviewed." type="success" showIcon /></SubmissionStatusContainer>;
  if (approvalSuccess) return <SubmissionStatusContainer><Alert message="User Approved" description="The user has been approved successfully." type="success" showIcon /></SubmissionStatusContainer>;
  
  const isReadOnly = isApproved && !userToApprove;

  return (
    <UserDetailContainer>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <FormHeader>
            <Title level={3} style={{color: 'var(--color-text-base)', margin: 0}}>User Profile Details</Title>
            <Text type="secondary">Please fill out all the required fields accurately.</Text>
        </FormHeader>

        {isReadOnly && <Alert message="Approved Details" description="Your details are approved and cannot be edited." type="success" showIcon style={{ marginBottom: 24 }} />}
        
        <Row gutter={32}>
          {/* --- Left Column: Form Fields --- */}
          <Col xs={24} md={16}>
            <Section>
                <SectionTitle level={4}><UserOutlined />Personal Details</SectionTitle>
                <Row gutter={24}>
                    <Col xs={24} sm={12}><Form.Item label="Name" name="name"><Input readOnly /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Surname" name="surname"><Input readOnly /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Gender" name="gender" rules={[{ required: true }]}><Select placeholder="Select Gender" disabled={isReadOnly}><Option value="Male">Male</Option><Option value="Female">Female</Option><Option value="Other">Other</Option></Select></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Father’s/Spouse Name" name="fatherOrSpouseName" rules={[{ required: true }, { pattern: /^[A-Za-z\s]+$/, message: 'Only letters and spaces'}]}><Input disabled={isReadOnly} /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Date of Birth" name="dateOfBirth" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} disabled={isReadOnly} disabledDate={(c) => c && c > moment().subtract(18, 'years')} /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Nationality" name="nationality" rules={[{ required: true }, { pattern: /^[A-Za-z\s]+$/, message: 'Only letters and spaces'}]}><Input disabled={isReadOnly} /></Form.Item></Col>
                </Row>
            </Section>

            <Section>
                <SectionTitle level={4}><SolutionOutlined />Official & Contact Details</SectionTitle>
                <Row gutter={24}>
                    <Col xs={24} sm={12}><Form.Item label="Employee ID" name="employeeId" rules={[{ required: true }]}><Input disabled={isReadOnly} /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Education Level" name="educationLevel" rules={[{ required: true }, { pattern: /^[A-Za-z0-9\s.,()]+$/, message: 'Invalid characters'}]}><Input disabled={isReadOnly} /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Date of Joining" name="dateOfJoining" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} disabled={isReadOnly} /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Department" name="department"><Input readOnly /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Designation" name="designation"><Input readOnly /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Email" name="email"><Input readOnly /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Mobile" name="mobile" rules={[{ required: true }, { pattern: /^\d{10}$/, message: 'Must be 10 digits' }]}><Input maxLength={10} disabled={isReadOnly} /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Mark of Identification" name="markOfIdentification" rules={[{ required: true }]}><Input disabled={isReadOnly} /></Form.Item></Col>
                </Row>
            </Section>
          </Col>
          
          {/* --- Right Column: Profile Photo --- */}
          <Col xs={24} md={8}>
            <Section>
              <SectionTitle level={4}>Profile Photo</SectionTitle>
              <Form.Item name="photo" rules={[{ required: !initialPhotoUrl && !fileObjects.photo, message: 'Profile photo is required' }]}>
                <Upload
                  fileList={photoFileList}
                  onChange={handlePhotoUploadChange}
                  beforeUpload={() => false}
                  accept="image/*"
                  maxCount={1}
                  disabled={isReadOnly}
                >
                  <Button icon={<UploadOutlined />} disabled={isReadOnly}>Upload Photo</Button>
                </Upload>
                {!isReadOnly && (
                  <Button
                    type="link"
                    icon={<CameraOutlined />}
                    onClick={() => setIsCameraModalVisible(true)}
                    style={{ marginLeft: 8 }}
                  >
                    Take Photo
                  </Button>
                )}
              </Form.Item>
            </Section>
          </Col>
        </Row>
        
        {/* --- Attachments and Submission --- */}
        <Section>
            <SectionTitle level={4}><IdcardOutlined />Identity & Financials</SectionTitle>
            <Row gutter={24}>
                <Col xs={24} sm={12}>
                    <Form.Item
                        label="UAN"
                        name="uan"
                        rules={[
                            { required: true, message: 'UAN is required' },
                            { pattern: /^\d{12}$/, message: 'UAN must be exactly 12 digits' }
                        ]}
                        extra="Format: 123456789012 (12 digits)"
                    >
                        <Input
                            placeholder="Enter 12-digit UAN number"
                            maxLength={12}
                            disabled={isReadOnly}
                            onKeyPress={(e) => {
                                if (!/[0-9]/.test(e.key)) {
                                    e.preventDefault();
                                }
                            }}
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                    <Form.Item
                        label="PAN"
                        name="pan"
                        rules={[
                            { required: true, message: 'PAN is required' },
                            { pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, message: 'Invalid PAN format (e.g., ABCDE1234F)' }
                        ]}
                        extra="Format: ABCDE1234F (5 letters + 4 digits + 1 letter)"
                    >
                        <Input
                            placeholder="Enter PAN (e.g., ABCDE1234F)"
                            maxLength={10}
                            disabled={isReadOnly}
                            style={{ textTransform: 'uppercase' }}
                            onKeyPress={(e) => {
                                const value = e.currentTarget.value;
                                const key = e.key.toUpperCase();

                                // First 5 characters should be letters
                                if (value.length < 5 && !/[A-Z]/.test(key)) {
                                    e.preventDefault();
                                }
                                // Next 4 characters should be digits
                                else if (value.length >= 5 && value.length < 9 && !/[0-9]/.test(key)) {
                                    e.preventDefault();
                                }
                                // Last character should be a letter
                                else if (value.length === 9 && !/[A-Z]/.test(key)) {
                                    e.preventDefault();
                                }
                            }}
                            onChange={(e) => {
                                e.target.value = e.target.value.toUpperCase();
                            }}
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                    <Form.Item
                        label="AADHAAR"
                        name="aadhaar"
                        rules={[
                            { required: true, message: 'Aadhaar is required' },
                            { pattern: /^\d{12}$/, message: 'Aadhaar must be exactly 12 digits' }
                        ]}
                        extra="Format: 123456789012 (12 digits)"
                    >
                        <Input
                            placeholder="Enter 12-digit Aadhaar number"
                            maxLength={12}
                            disabled={isReadOnly}
                            onKeyPress={(e) => {
                                if (!/[0-9]/.test(e.key)) {
                                    e.preventDefault();
                                }
                            }}
                        />
                    </Form.Item>
                </Col>
            </Row>
        </Section>
        <Section>
            <SectionTitle level={4}><FileTextOutlined />Attachments</SectionTitle>
            <Row gutter={24}>
                <Col xs={24} sm={12} md={8}>
                    <Form.Item label="PAN Attachment" name="panAttachment" valuePropName="fileList" getValueFromEvent={normFile} rules={[{ required: true, message: 'PAN is required' }]}>
                        <Upload beforeUpload={() => false} onChange={handleUploadChange('panAttachment')} accept=".pdf,image/*" maxCount={1} disabled={isReadOnly}><Button icon={<UploadOutlined />} disabled={isReadOnly}>Upload</Button></Upload>
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Form.Item label="AADHAAR Attachment" name="aadhaarAttachment" valuePropName="fileList" getValueFromEvent={normFile} rules={[{ required: true, message: 'Aadhaar is required' }]}>
                        <Upload beforeUpload={() => false} onChange={handleUploadChange('aadhaarAttachment')} accept=".pdf,image/*" maxCount={1} disabled={isReadOnly}><Button icon={<UploadOutlined />} disabled={isReadOnly}>Upload</Button></Upload>
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Form.Item label="Digital Signature Template" name="signatureTemplate">
                        <DigitalSignatureTemplate
                          disabled={isReadOnly}
                          onTemplateCreated={() => {
                            message.success('Digital signature template will be created automatically when you submit your details.');
                          }}
                        />
                    </Form.Item>
                </Col>
            </Row>
        </Section>

        {!isApproved || userToApprove ? (
            <Form.Item style={{ marginTop: '32px', textAlign: 'right' }}>
                <Button type="primary" htmlType="submit" loading={submitting} size="large">
                    {userToApprove ? 'Update & Approve' : 'Submit for Approval'}
                </Button>
            </Form.Item>
        ) : null}
      </Form>

      <Modal
        title="Take Photo"
        open={isCameraModalVisible}
        onCancel={() => setIsCameraModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsCameraModalVisible(false)}>
            Cancel
          </Button>,
          <Button key="capture" type="primary" onClick={handleCapture}>
            Capture
          </Button>,
        ]}
        width={640}
      >
        <div style={{ textAlign: 'center' }}>
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            width={600}
            height={450}
            videoConstraints={{ width: 600, height: 450, facingMode: 'user' }}
          />
        </div>
      </Modal>
    </UserDetailContainer>
  );
};

export default UserDetail;