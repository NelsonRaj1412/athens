import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, Typography, Space, Modal, Spin, App } from 'antd';
import { 
  FileImageOutlined, 
  EyeOutlined, 
  ReloadOutlined, 
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import api from '@common/utils/axiosetup';
import DigitalSignature from '../../../components/DigitalSignature';

const { Text, Title } = Typography;

interface AdminTemplateInfo {
  success: boolean;
  can_create_template: boolean;
  missing_fields: string[];
  user_data: {
    full_name: string;
    designation: string;
    company_name: string;
    has_company_logo: boolean;
    logo_url?: string;
  };
  has_existing_template: boolean;
  template_data?: any;
}

interface AdminDigitalSignatureTemplateProps {
  onTemplateCreated?: () => void;
}

const AdminDigitalSignatureTemplate: React.FC<AdminDigitalSignatureTemplateProps> = ({ 
  onTemplateCreated 
}) => {
  const { message } = App.useApp();
  const [templateInfo, setTemplateInfo] = useState<AdminTemplateInfo | null>(null);
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  // Fetch template information
  const fetchTemplateInfo = async () => {
    setLoading(true);
    try {
      const response = await api.get('/authentication/admin/signature/template/data/');
      setTemplateInfo(response.data);
      
      // If template exists, fetch preview
      if (response.data.has_existing_template) {
        const previewResponse = await api.get('/authentication/admin/signature/template/preview/');
        if (previewResponse.data.success) {
          let templateUrl = previewResponse.data.template_url;
          // Convert relative URL to absolute URL
          if (templateUrl && !templateUrl.startsWith('http')) {
            templateUrl = `http://localhost:8000${templateUrl}`;
          }
          setTemplateUrl(templateUrl);
        }
      }
    } catch (error: any) {
      message.error('Failed to load admin signature template information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplateInfo();
  }, []);

  // Create new signature template
  const createTemplate = async () => {
    setCreating(true);
    try {
      const response = await api.post('/authentication/admin/signature/template/create/');
      if (response.data.success) {
        message.success('Admin digital signature template created successfully!');
        let templateUrl = response.data.template_url;
        // Convert relative URL to absolute URL
        if (templateUrl && !templateUrl.startsWith('http')) {
          templateUrl = `http://localhost:8000${templateUrl}`;
        }
        setTemplateUrl(templateUrl);
        await fetchTemplateInfo(); // Refresh info
        onTemplateCreated?.();
      } else {
        message.error(response.data.error || 'Failed to create admin template');
      }
    } catch (error: any) {
      message.error('Failed to create admin signature template');
    } finally {
      setCreating(false);
    }
  };

  // Regenerate existing template
  const regenerateTemplate = async () => {
    setCreating(true);
    try {
      const response = await api.put('/authentication/admin/signature/template/regenerate/');
      if (response.data.success) {
        message.success('Admin signature template regenerated successfully!');
        let templateUrl = response.data.template_url;
        // Convert relative URL to absolute URL
        if (templateUrl && !templateUrl.startsWith('http')) {
          templateUrl = `http://localhost:8000${templateUrl}`;
        }
        setTemplateUrl(templateUrl);
        await fetchTemplateInfo(); // Refresh info
        onTemplateCreated?.();
      } else {
        message.error(response.data.error || 'Failed to regenerate admin template');
      }
    } catch (error: any) {
      message.error('Failed to regenerate admin signature template');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <Card title="Admin Digital Signature Template" className="mb-6">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <Spin size="large" />
          <div style={{ marginTop: '1rem' }}>
            <Text type="secondary">Loading signature template information...</Text>
          </div>
        </div>
      </Card>
    );
  }

  if (!templateInfo) {
    return (
      <Card title="Admin Digital Signature Template" className="mb-6">
        <Alert
          message="Unable to load template information"
          description="Please try refreshing the page."
          type="error"
          showIcon
        />
      </Card>
    );
  }

  const { can_create_template, missing_fields, user_data, has_existing_template } = templateInfo;

  return (
    <Card 
      title={
        <Space>
          <FileImageOutlined />
          <span>Admin Digital Signature Template</span>
          {has_existing_template && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
        </Space>
      }
      className="mb-6"
      style={{ marginBottom: 0 }}
      extra={
        has_existing_template && templateUrl && (
          <Button 
            type="link" 
            icon={<EyeOutlined />} 
            onClick={() => setPreviewVisible(true)}
          >
            Preview
          </Button>
        )
      }
    >
      {/* Template Status */}
      {has_existing_template ? (
        <Alert
          message="Template Ready"
          description="Your admin digital signature template has been created and is ready for use in document signing."
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          style={{ marginBottom: 16 }}
        />
      ) : can_create_template ? (
        <Alert
          message="Ready to Create Template"
          description="All required information is available. You can now create your admin digital signature template."
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: 16 }}
        />
      ) : (
        <Alert
          message="Missing Required Information"
          description={
            <div>
              <div>Please complete and submit the admin form above first.</div>
              <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
                Missing: {missing_fields?.join(', ') || 'None'}
              </div>
            </div>
          }
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* User Information Preview */}
      <div style={{ marginBottom: 16 }}>
        <Title level={5}>Template Information:</Title>
        <div style={{ background: '#fafafa', padding: 12, borderRadius: 6 }}>
          <div><strong>Name:</strong> {user_data?.full_name || 'Not provided'}</div>
          {user_data?.designation && <div><strong>Designation:</strong> {user_data.designation}</div>}
          <div><strong>Company:</strong> {user_data?.company_name || 'Not provided'}</div>
          <div><strong>Company Logo:</strong> {user_data?.has_company_logo ? '✓ Available' : '✗ Not available'}</div>
        </div>
      </div>

      {/* Action Buttons */}
      <Space>
        {!has_existing_template ? (
          <Button
            type="primary"
            icon={<FileImageOutlined />}
            onClick={createTemplate}
            loading={creating}
            disabled={!can_create_template}
          >
            Create Admin Signature Template
          </Button>
        ) : (
          <Button
            type="default"
            icon={<ReloadOutlined />}
            onClick={regenerateTemplate}
            loading={creating}
          >
            Regenerate Template
          </Button>
        )}
        
        {has_existing_template && templateUrl && (
          <Button
            type="default"
            icon={<EyeOutlined />}
            onClick={() => setPreviewVisible(true)}
          >
            Preview Template
          </Button>
        )}
      </Space>

      {/* Template Usage Info */}
      {has_existing_template && (
        <div style={{ marginTop: 16, padding: 12, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
          <Text type="secondary">
            <InfoCircleOutlined style={{ marginRight: 8, color: '#52c41a' }} />
            This template will be automatically used when you sign documents. The date and time will be filled in dynamically during signing.
          </Text>
        </div>
      )}

      {/* Preview Modal */}
      <Modal
        title="Admin Signature Template Preview"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            Close
          </Button>
        ]}
        width={700}
        centered
      >
        {templateUrl ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ 
              border: '1px solid #d9d9d9', 
              borderRadius: '8px', 
              padding: '16px', 
              backgroundColor: '#fafafa',
              display: 'inline-block',
              maxWidth: '100%'
            }}>
              <DigitalSignature 
                signerName={user_data?.full_name || 'Admin User'}
                designation={user_data?.designation}
                companyName={user_data?.company_name}
                date={new Date().toLocaleDateString('en-CA')}
                time={new Date().toLocaleTimeString('en-GB')}
                logoUrl={user_data?.logo_url}
              />
            </div>
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">
                Professional digital signature layout with proper spacing and no overlap.
              </Text>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Alert
              message="No Template Available"
              description="The signature template could not be loaded. Please try creating or regenerating the template."
              type="warning"
              showIcon
            />
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default AdminDigitalSignatureTemplate;
