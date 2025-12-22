import React, { useEffect, useState, useRef } from 'react';
import { Form, Input, Button, Upload, Typography, Card, Spin, Alert, Modal, App } from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import {
    UploadOutlined,
    UserOutlined,
    PhoneOutlined,
    BankOutlined,
    CameraOutlined,
    CheckOutlined
} from '@ant-design/icons';
import api from '@common/utils/axiosetup';
import useAuthStore from '@common/store/authStore';
import Webcam from 'react-webcam';
import { useNotificationsContext } from '../../../common/contexts/NotificationsContext';
import type { NotificationType } from '../../../common/utils/webSocketNotificationService';
import PageLayout from '@common/components/PageLayout';
import { useOutletContext } from 'react-router-dom';
import AdminDigitalSignatureTemplate from './AdminDigitalSignatureTemplate';

const { Title } = Typography;

interface AdminDetailData {
  username: string;
  name?: string;
  designation?: string;
  company_name: string;
  registered_address: string;
  phone_number: string;
  pan_number?: string;
  gst_number?: string;
  logo_url?: string;
}

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

const AdminDetail: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasDetails, setHasDetails] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [fileListLogo, setFileListLogo] = useState<UploadFile[]>([]);
  const [isCameraModalVisible, setIsCameraModalVisible] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const { usertype: userType, userId: currentUserId, username: authUsername, django_user_type } = useAuthStore.getState();

  // Get admin data for approval from Dashboard context (for master admin)
  const { adminToApprove: contextAdminToApprove, onAdminApprovalSuccess } = useOutletContext<{
    adminToApprove?: any | null;
    onAdminApprovalSuccess?: (id: number) => void;
  }>() || {};

  // Fallback: Check sessionStorage if context doesn't have data
  const [sessionAdminToApprove, setSessionAdminToApprove] = useState<any | null>(null);

  useEffect(() => {
    if (!contextAdminToApprove && userType === 'master') {
      const storedAdmin = sessionStorage.getItem('adminToApprove');
      if (storedAdmin) {
        try {
          const parsedAdmin = JSON.parse(storedAdmin);
          setSessionAdminToApprove(parsedAdmin);
        } catch (error) {
          console.error('Failed to parse stored admin data:', error);
        }
      }
    }
  }, [contextAdminToApprove, userType]);

  // Use context data first, fallback to session data
  const adminToApprove = contextAdminToApprove || sessionAdminToApprove;

  // Persist adminToApprove data to sessionStorage when it changes
  useEffect(() => {
    if (adminToApprove && userType === 'master') {
      sessionStorage.setItem('adminToApprove', JSON.stringify(adminToApprove));
    }
  }, [adminToApprove, userType]);

  // Check if this is approval mode (master admin reviewing another admin's details)
  const isApprovalMode = userType === 'master' && adminToApprove;

  // Debug logging
  console.log('AdminDetail debug:', {
    userType,
    contextAdminToApprove,
    sessionAdminToApprove,
    adminToApprove,
    isApprovalMode,
    hasAdminData: !!adminToApprove
  });




  const { sendNotification, notifications } = useNotificationsContext();

  useEffect(() => {
    const fetchMyDetails = async () => {
      setFetching(true);
      setError(null);
      try {
        // If in approval mode, use the admin data from context or session
        if (isApprovalMode && adminToApprove) {
          form.setFieldsValue({
            username: adminToApprove.username,
            name: adminToApprove.name,
            designation: adminToApprove.designation,
            company_name: adminToApprove.company_name,
            registered_address: adminToApprove.registered_address,
            phone_number: adminToApprove.phone_number,
            pan_number: adminToApprove.pan_number,
            gst_number: adminToApprove.gst_number,
          });

          // Set photo if available
          if (adminToApprove.photo_url) {
            const photoUrl = adminToApprove.photo_url.startsWith('http') ? adminToApprove.photo_url : `${api.defaults.baseURL}${adminToApprove.photo_url}`;
            setFileList([{
              uid: '-1',
              name: 'profile_photo.png',
              status: 'done',
              url: photoUrl,
              thumbUrl: photoUrl,
            }]);
          }

          // Set logo if available
          if (adminToApprove.logo_url) {
            const logoUrl = adminToApprove.logo_url.startsWith('http') ? adminToApprove.logo_url : `${api.defaults.baseURL}${adminToApprove.logo_url}`;
            setFileListLogo([{
              uid: '-1',
              name: 'company_logo.png',
              status: 'done',
              url: logoUrl,
              thumbUrl: logoUrl,
            }]);
          }
          setFetching(false);
          return; // Exit early for approval mode
        } else if (userType !== 'master') {
          // Ensure username is prefilled from auth store even before any data exists
          form.setFieldsValue({ username: authUsername });
        }
        
        const response = await api.get('/authentication/admin/me/');
        if (response.data) {
          form.setFieldsValue(response.data);
          setIsApproved(response.data.is_approved || false);
          setHasDetails(response.data.has_details || false);
          // If details exist and are submitted, mark as submitted
          if (response.data.has_details) {
            setFormSubmitted(true);
          }
          if (response.data.photo_url) {
            setFileList([{
              uid: '-1',
              name: 'profile_photo.png',
              status: 'done',
              url: response.data.photo_url,
              thumbUrl: response.data.photo_url,
            }]);
          }
          if (response.data.logo_url) {
            setFileListLogo([{
              uid: '-1',
              name: 'company_logo.png',
              status: 'done',
              url: response.data.logo_url,
              thumbUrl: response.data.logo_url,
            }]);
          }

          // Auto-populate PAN, GST, and Logo for EPC users from company details
          // Check for both 'epc' and 'epcuser' user types
          if (userType === 'epc' || userType === 'epcuser') {
            try {
              const companyResponse = await api.get('/authentication/companydetail/');

              if (companyResponse.data) {
                const updatedFormData = { ...response.data };
                let hasUpdates = false;
                let updateMessages = [];

                // Auto-fill PAN if not already set
                if (!response.data.pan_number && companyResponse.data.pan) {
                  updatedFormData.pan_number = companyResponse.data.pan;
                  updateMessages.push('PAN');
                  hasUpdates = true;
                }

                // Auto-fill GST if not already set
                if (!response.data.gst_number && companyResponse.data.gst) {
                  updatedFormData.gst_number = companyResponse.data.gst;
                  updateMessages.push('GST');
                  hasUpdates = true;
                }

                // Auto-fill company logo if not already set
                if (!response.data.logo_url && companyResponse.data.company_logo) {
                  const logoFileList = [{
                    uid: '-1',
                    name: 'company_logo.png',
                    status: 'done',
                    url: companyResponse.data.company_logo,
                    thumbUrl: companyResponse.data.company_logo,
                  }];
                  setFileListLogo(logoFileList);
                  updateMessages.push('Logo');
                  hasUpdates = true;
                }

                // Update form with auto-filled data
                if (hasUpdates) {
                  form.setFieldsValue(updatedFormData);
                  message.info(`Company details (${updateMessages.join(', ')}) have been auto-filled from company settings`);
                }
              }
            } catch (companyErr) {
              // Ignore company detail errors for non-EPC users
            }
          }
        }
      } catch (err) {
        // If no admin details exist yet, backend may return 404.
        // In that case, show an empty form so the user can fill details.
        if (err?.response?.status === 404 || err?.response?.status === 403) {
          // Treat missing or unauthorized details as zero-state: allow filling the form
          setError(null);
          setHasDetails(false);
          setFormSubmitted(false);
          // Prefill username to make the form immediately usable
          form.setFieldsValue({ username: authUsername });
        } else {
          setError('Failed to fetch your details. Please try refreshing the page.');
        }
      } finally {
        setFetching(false);
      }
    };
    fetchMyDetails();
  }, [form, userType, isApprovalMode, adminToApprove, authUsername]);

  useEffect(() => {
    if (userType !== 'master') {
      const approvalNotification = notifications.find(n => n.type === 'approval' && n.data?.formType === 'admindetail' && n.data?.approved && !n.read);
      if (approvalNotification) {
        message.success('Your details have been approved!');
        setIsApproved(true);
        setFormSubmitted(true); // Keep form submitted state - no editing after approval
        setHasDetails(true); // Mark as having details

        // Refresh the form data to get the latest approved details
        const fetchUpdatedDetails = async () => {
          try {
            const response = await api.get('/authentication/admin/me/');
            if (response.data) {
              form.setFieldsValue(response.data);

              // Trigger dashboard updates when admin details are approved
              const companyDataEvent = new CustomEvent('company_data_updated', {
                detail: {
                  logoUrl: response.data.logo_url,
                  company_logo: response.data.logo_url,
                  companyName: response.data.company_name,
                  company_name: response.data.company_name,
                  source: 'admin_detail_approval'
                }
              });
              window.dispatchEvent(companyDataEvent);

              if (response.data.company_name) {
                const nameUpdateEvent = new CustomEvent('admin_company_updated', {
                  detail: { companyName: response.data.company_name }
                });
                window.dispatchEvent(nameUpdateEvent);
                localStorage.setItem('company_name', response.data.company_name);
              }
            }
          } catch (err) {
          }
        };
        fetchUpdatedDetails();
      }
    }
  }, [notifications, userType, message, form]);

  const handleCapture = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        try {
          const file = dataURLtoFile(imageSrc, `capture_${Date.now()}.jpg`);
          const uid = `rc-upload-${Date.now()}`;
          
          setFileList([{
            uid,
            name: file.name,
            status: 'done',
            originFileObj: file,
            thumbUrl: imageSrc,
          }]);
          message.success('Photo captured!');
          setIsCameraModalVisible(false);
        } catch (error) {
          message.error('Failed to process captured photo.');
        }
      } else {
        message.error('Could not capture photo.');
      }
    }
  };

  const handleUploadChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    // Validate file before setting
    if (newFileList.length > 0 && newFileList[0].originFileObj) {
      const file = newFileList[0].originFileObj;
      if (!file.type.startsWith('image/')) {
        message.error('Please upload a valid image file.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        message.error('Image must be smaller than 5MB.');
        return;
      }
      setPhotoFile(file);
    } else {
      setPhotoFile(null);
    }
    setFileList(newFileList);
  };

  // Approval function for master admin
  const handleApproval = async () => {
    if (!adminToApprove) return;

    setLoading(true);
    try {
      // Call the approval API
      await api.post(`/authentication/admin/detail/approve/${adminToApprove.user}/`);

      message.success('Admin details approved successfully!');

      // Call the success callback to update Dashboard state
      onAdminApprovalSuccess?.(adminToApprove.user);

      // Clear sessionStorage after successful approval
      sessionStorage.removeItem('adminToApprove');

      // Set approved state
      setIsApproved(true);

    } catch (error) {
      message.error('Failed to approve admin details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values: AdminDetailData) => {
    setLoading(true);
    const formData = new FormData();

    // Sanitize and add form fields
    const sanitizeString = (str: string) => str.replace(/[<>"'&]/g, '').trim();
    
    if (values.name) formData.append('name', sanitizeString(values.name));
    if (values.designation) formData.append('designation', sanitizeString(values.designation));
    if (values.phone_number) formData.append('phone_number', values.phone_number.replace(/\D/g, ''));
    if (values.pan_number) formData.append('pan_number', values.pan_number.toUpperCase().replace(/[^A-Z0-9]/g, ''));
    if (values.gst_number) formData.append('gst_number', values.gst_number.toUpperCase().replace(/[^A-Z0-9]/g, ''));
    if (values.company_name) formData.append('company_name', sanitizeString(values.company_name));
    if (values.registered_address) formData.append('registered_address', sanitizeString(values.registered_address));

    // Send files that have originFileObj (new uploads)
    if (fileList.length > 0 && fileList[0].originFileObj) {
      formData.append('photo', fileList[0].originFileObj);
    }
    
    if (fileListLogo.length > 0 && fileListLogo[0].originFileObj) {
      formData.append('logo', fileListLogo[0].originFileObj);
    }

    try {
      const response = await api.put(`/authentication/admin/detail/update/${userType}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Send notification to master admin only for initial submission
      if (currentUserId && !isApproved && !formSubmitted) {
        try {
          // Send notification to user ID 5 (the master admin)
          await sendNotification('5', {
            title: 'Admin Details Submitted',
            message: `${values.name || 'An admin'} submitted details for approval.`,
            type: 'approval' as NotificationType,
            data: { 
              userId: currentUserId, 
              user_id: currentUserId,
              formType: 'admindetail',
              username: authUsername,
              admin_type: userType
            },
            link: `/dashboard/admindetail`
          });
          console.log('Notification sent to master admin');
        } catch (notificationError) {
          console.error('Failed to send notification:', notificationError);
          // Don't fail the form submission if notification fails
        }
      }

      message.success('Details submitted successfully for master admin approval.');
      setFormSubmitted(true);
      setHasDetails(true);

      if (response.data) {
        // Trigger unified company data update event for Dashboard
        const companyDataEvent = new CustomEvent('company_data_updated', {
          detail: {
            logoUrl: response.data.logo_url,
            company_logo: response.data.logo_url,
            companyName: response.data.company_name,
            company_name: response.data.company_name,
            source: 'admin_detail_save'
          }
        });
        window.dispatchEvent(companyDataEvent);
        
        // Also trigger admin logo update event
        const adminLogoEvent = new CustomEvent('admin_logo_updated', {
          detail: {
            logoUrl: response.data.logo_url,
            companyName: response.data.company_name
          }
        });
        window.dispatchEvent(adminLogoEvent);
      }
    } catch (err) {
      message.error(`Update failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <Card><Spin tip="Loading your details..." /></Card>;
  if (error) return <Card><Alert message={error} type="error" /></Card>;
  if (formSubmitted && !isApproved) return <Card><Alert message="Form Submitted" description="Your details have been submitted for approval. You will be notified once reviewed." type="success" showIcon /></Card>;

  // Show message if master admin but no admin data to approve
  if (userType === 'master' && !adminToApprove && !fetching) {
    return (
      <PageLayout title="Admin Approval" subtitle="No admin details to review">
        <Card>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📋</div>
            <h3>No Admin Details Found</h3>
            <p>There are no admin details pending approval at this time.</p>
            <p>Please click on a notification to review admin details.</p>
          </div>
        </Card>
      </PageLayout>
    );
  }

  const canEdit = !formSubmitted && !isApproved; // Only allow editing if not submitted and not approved
  const isReadOnly = formSubmitted || isApproved; // Read-only when submitted or approved

  return (
    <PageLayout
      title={isApprovalMode ? "Admin Approval" : "Admin Profile"}
      subtitle={isApprovalMode ? "Review and approve admin details" : "Manage your admin profile details and upload required documents"}
      breadcrumbs={[
        { title: isApprovalMode ? 'Admin Approval' : 'Admin Detail' }
      ]}
      actions={
        isApprovalMode ? (
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={handleApproval}
            loading={loading}
            disabled={isApproved}
          >
            {loading ? 'Approving...' : isApproved ? 'Approved' : 'Approve Admin'}
          </Button>
        ) : canEdit ? (
          <Button type="primary" onClick={() => form.submit()} loading={loading}>
            {loading ? 'Submitting...' : 'Submit for Approval'}
          </Button>
        ) : null
      }
    >
      <Card>
        {isApprovalMode && isApproved && (
          <Alert
            message="Admin Approved"
            description="This admin's details have been approved successfully."
            type="success"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}
        {!isApprovalMode && isApproved && (
          <Alert
            message="Details Approved"
            description="Your details have been approved by the master administrator. No further changes are allowed."
            type="success"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}
        {!isApprovalMode && !hasDetails && !formSubmitted && (
          <Alert
            message="No details found yet"
            description="Please fill the form below and submit for approval."
            type="warning"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}
        {isApprovalMode && (
          <Alert
            message="Review Admin Details"
            description="Please review the admin details below and click 'Approve Admin' to approve."
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}
        <Form form={form} layout="vertical" onFinish={onFinish} disabled={isApprovalMode}>
          <Form.Item label="Username" name="username">
            <Input prefix={<UserOutlined />} disabled />
          </Form.Item>
          <Form.Item
            label={<span>Name <span style={{ color: 'red' }}>*</span></span>}
            name="name"
            rules={[
              { required: true, message: 'Please enter your name' },
              { pattern: /^[A-Za-z\s]+$/, message: 'Name must contain only letters and spaces' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              onKeyPress={(e) => {
                if (!/[A-Za-z\s]/.test(e.key)) {
                  e.preventDefault();
                }
              }}
              disabled={isReadOnly}
            />
          </Form.Item>
          <Form.Item label="Company Name" name="company_name">
            <Input prefix={<BankOutlined />} disabled />
          </Form.Item>
          
          {/* Designation field only for adminuser, not for projectadmin */}
          {django_user_type === 'adminuser' && (
            <Form.Item
              label={<span>Designation <span style={{ color: 'red' }}>*</span></span>}
              name="designation"
              rules={[{ required: true, message: 'Please enter your designation' }]}
            >
              <Input
                placeholder="Enter your designation (e.g., Site Engineer, Safety Officer)"
                disabled={isReadOnly}
              />
            </Form.Item>
          )}
          
          <Form.Item label="Registered Official Address" name="registered_address">
            <Input.TextArea rows={3} disabled />
          </Form.Item>
          <Form.Item
            label={<span>Phone Number <span style={{ color: 'red' }}>*</span></span>}
            name="phone_number"
            rules={[
              { required: true, message: 'Please enter your phone number' },
              { len: 10, message: 'Phone number must be exactly 10 digits' },
            ]}
          >
            <Input
              prefix={<PhoneOutlined />}
              maxLength={10}
              onKeyPress={(e) => {
                if (!/[0-9]/.test(e.key)) {
                  e.preventDefault();
                }
              }}
              disabled={isReadOnly}
            />
          </Form.Item>
          <Form.Item
            label="PAN Number"
            name="pan_number"
            rules={[{ pattern: /^[A-Z]{5}[0-9]{4}[A-Z]$/, message: 'Invalid PAN Number format' }]}
            extra={(userType === 'epc' || userType === 'epcuser') ? "Auto-filled from company details" : "Example: ABCDE1234F"}
          >
            <Input
              placeholder="Enter PAN Number"
              disabled={isReadOnly || userType === 'epc' || userType === 'epcuser'}
              style={(userType === 'epc' || userType === 'epcuser') ? { backgroundColor: '#f5f5f5', color: '#666' } : {}}
            />
          </Form.Item>
          <Form.Item
            label="GST Number"
            name="gst_number"
            rules={[{ pattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, message: 'Invalid GST Number format' }]}
            extra={(userType === 'epc' || userType === 'epcuser') ? "Auto-filled from company details" : "Example: 22ABCDE1234F1Z5"}
          >
            <Input
              placeholder="Enter GST Number"
              disabled={isReadOnly || userType === 'epc' || userType === 'epcuser'}
              style={(userType === 'epc' || userType === 'epcuser') ? { backgroundColor: '#f5f5f5', color: '#666' } : {}}
            />
          </Form.Item>
          <Form.Item label="Profile Photo">
            {fileList.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '100px',
                  height: '100px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  backgroundColor: '#fafafa'
                }}>
                  <img
                    src={fileList[0].url || fileList[0].thumbUrl}
                    alt="Profile Photo"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }}
                  />
                </div>
                <div style={{ color: '#52c41a', fontSize: '14px' }}>
                  ✓ Profile photo uploaded
                </div>
              </div>
            ) : (
              <Upload
                fileList={fileList}
                onChange={handleUploadChange}
                beforeUpload={(file) => {
                  if (!file.type.startsWith('image/')) {
                    message.error('Please upload a valid image file.');
                    return false;
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    message.error('Image must be smaller than 5MB.');
                    return false;
                  }
                  return false;
                }}
                accept="image/*"
                maxCount={1}
                disabled={isReadOnly}
              >
                <Button icon={<UploadOutlined />} disabled={isReadOnly}>Upload Photo</Button>
              </Upload>
            )}
            {canEdit && (
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
          <Form.Item
            name="company_logo"
            label="Company Logo"
            valuePropName="fileList"
            getValueFromEvent={(e) => {
              if (Array.isArray(e)) {
                return e;
              }
              return e?.fileList;
            }}
            extra={(userType === 'epc' || userType === 'epcuser') ? "Auto-filled from company details" : "Upload your company logo"}
          >
            {(userType === 'epc' || userType === 'epcuser') && fileListLogo.length > 0 ? (
              // Show auto-filled logo for EPC users
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '100px',
                  height: '100px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  backgroundColor: '#fafafa'
                }}>
                  <img
                    src={fileListLogo[0].url || fileListLogo[0].thumbUrl}
                    alt="Company Logo"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }}
                  />
                </div>
                <div style={{ color: '#52c41a', fontSize: '14px' }}>
                  ✓ Auto-filled from company details
                </div>
              </div>
            ) : fileListLogo.length > 0 ? (
              // Show uploaded logo for all users
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '100px',
                  height: '100px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  backgroundColor: '#fafafa'
                }}>
                  <img
                    src={fileListLogo[0].url || fileListLogo[0].thumbUrl}
                    alt="Company Logo"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }}
                  />
                </div>
                <div style={{ color: '#52c41a', fontSize: '14px' }}>
                  ✓ Company logo uploaded
                </div>
              </div>
            ) : (userType === 'epc' || userType === 'epcuser') ? (
              // Show message when no company logo is available for EPC users
              <div style={{
                padding: '20px',
                border: '1px dashed #d9d9d9',
                borderRadius: '6px',
                textAlign: 'center',
                backgroundColor: '#fafafa'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🏢</div>
                <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>
                  No company logo found
                </div>
                <div style={{ color: '#999', fontSize: '12px' }}>
                  Please upload a logo in <strong>Company Details</strong> first,<br />
                  then it will automatically appear here.
                </div>
                <div style={{ marginTop: '12px' }}>
                  <a
                    href="/dashboard/companydetails"
                    style={{
                      color: '#1890ff',
                      fontSize: '12px',
                      textDecoration: 'none'
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      window.location.href = '/dashboard/companydetails';
                    }}
                  >
                    → Go to Company Details
                  </a>
                </div>
              </div>
            ) : (
              // Regular upload component for other users or when no logo
              <Upload
                fileList={fileListLogo}
                onChange={({ fileList }) => {
                  // Validate logo file before setting
                  if (fileList.length > 0 && fileList[0].originFileObj) {
                    const file = fileList[0].originFileObj;
                    if (!file.type.startsWith('image/')) {
                      message.error('Please upload a valid image file.');
                      return;
                    }
                    if (file.size > 5 * 1024 * 1024) { // 5MB limit
                      message.error('Image must be smaller than 5MB.');
                      return;
                    }
                  }
                  setFileListLogo(fileList);
                }}
                beforeUpload={(file) => {
                  // Validate file type and size
                  if (!file.type.startsWith('image/')) {
                    message.error('Please upload a valid image file.');
                    return false;
                  }
                  if (file.size > 5 * 1024 * 1024) { // 5MB limit
                    message.error('Image must be smaller than 5MB.');
                    return false;
                  }
                  return false; // Prevent auto upload
                }}
                accept="image/*"
                maxCount={1}
                disabled={isReadOnly}
                listType="picture-card"
                showUploadList={{
                  showPreviewIcon: true,
                  showRemoveIcon: !isReadOnly,
                }}
              >
                {fileListLogo.length < 1 && (
                  <Button
                    icon={<UploadOutlined />}
                    disabled={isReadOnly}
                  >
                    Upload Logo
                  </Button>
                )}
              </Upload>
            )}
          </Form.Item>
          {canEdit && (
            <Form.Item>
              <Alert
                message="Required Fields"
                description="Please fill Name and Phone Number (10 digits) to submit the form."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            </Form.Item>
          )}
        </Form>
      </Card>

      {/* Digital Signature Template Section - Only for non-master admins */}
      {userType !== 'master' && (
        <Card style={{ marginTop: 24 }} title="Digital Signature Template">
          <AdminDigitalSignatureTemplate
            onTemplateCreated={() => {
              // Optionally refresh form data or show success message
              message.success('Signature template updated successfully');
            }}
          />
        </Card>
      )}

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
    </PageLayout>
  );
};

export default AdminDetail;
