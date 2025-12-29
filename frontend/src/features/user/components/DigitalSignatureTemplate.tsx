import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, Space, Typography, Image, Spin, Modal, Descriptions } from 'antd';
import { 
  FileImageOutlined, 
  ReloadOutlined, 
  EyeOutlined, 
  CheckCircleOutlined,
  ExclamationCircleOutlined 
} from '@ant-design/icons';
import api from '@common/utils/axiosetup';
import { App } from 'antd';
import DigitalSignature from '../../../components/DigitalSignature';

const { Title, Text, Paragraph } = Typography;

interface SignatureTemplateData {
  user_id: number;
  full_name: string;
  designation: string;
  company_name: string;
  template_created_at: string;
  template_version: string;
}

interface TemplateInfo {
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
  template_data?: SignatureTemplateData;
}

interface DigitalSignatureTemplateProps {
  onTemplateCreated?: () => void;
  disabled?: boolean;
}

const DigitalSignatureTemplate: React.FC<DigitalSignatureTemplateProps> = ({ 
  onTemplateCreated, 
  disabled = false 
}) => {
  const { message } = App.useApp();
  
  const [templateInfo, setTemplateInfo] = useState<TemplateInfo | null>(null);
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  // Fetch template information
  const fetchTemplateInfo = async () => {
    setLoading(true);
    try {
      // Add timestamp to prevent caching
      const timestamp = Date.now();
      const response = await api.get(`/authentication/signature/template/data/?t=${timestamp}`);
      setTemplateInfo(response.data);
      
      // If template exists, fetch preview with cache busting
      if (response.data.has_existing_template) {
        const previewResponse = await api.get(`/authentication/signature/template/preview/?t=${timestamp}`);
        if (previewResponse.data.success) {
          let templateUrl = previewResponse.data.template_url;
          // Add cache busting to image URL
          if (templateUrl) {
            templateUrl += `?t=${timestamp}`;
          }
          setTemplateUrl(templateUrl);
        }
      }
    } catch (error: any) {
      message.error('Failed to load signature template information');
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
      const response = await api.post('/authentication/signature/template/create/');
      if (response.data.success) {
        message.success('Digital signature template created successfully!');
        setTemplateUrl(response.data.template_url);
        await fetchTemplateInfo(); // Refresh info
        onTemplateCreated?.();
      } else {
        message.error(response.data.error || 'Failed to create template');
      }
    } catch (error: any) {
      message.error('Failed to create signature template');
    } finally {
      setCreating(false);
    }
  };

  // Regenerate existing template
  const regenerateTemplate = async () => {
    setCreating(true);
    try {
      const response = await api.put('/authentication/signature/template/regenerate/', {
        logo_opacity: 0.5  // Set to 50% opacity
      });
      if (response.data.success) {
        message.success('Signature template regenerated successfully!');
        // Force refresh template info to get new URL
        await fetchTemplateInfo();
        onTemplateCreated?.();
      } else {
        message.error(response.data.error || 'Failed to regenerate template');
      }
    } catch (error: any) {
      message.error('Failed to regenerate signature template');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Loading signature template information...</div>
        </div>
      </Card>
    );
  }

  if (!templateInfo) {
    return (
      <Card>
        <Alert 
          message="Error" 
          description="Failed to load signature template information" 
          type="error" 
        />
      </Card>
    );
  }

  return (
    <Card 
      title={
        <Space>
          <FileImageOutlined />
          <span>Digital Signature Template</span>
        </Space>
      }
      extra={
        templateInfo.has_existing_template && templateUrl && (
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
      {templateInfo.has_existing_template ? (
        <Alert
          message="Digital Signature Template Ready"
          description="Your digital signature template is ready to use. No need to upload signature images anymore!"
          type="success"
          icon={<CheckCircleOutlined />}
          style={{ marginBottom: 16 }}
        />
      ) : templateInfo.can_create_template ? (
        <Alert
          message="Template Will Be Created Automatically"
          description="Your digital signature template will be created automatically when you submit your profile details."
          type="info"
          icon={<ExclamationCircleOutlined />}
          style={{ marginBottom: 16 }}
        />
      ) : (
        <Alert
          message="Complete Your Profile First"
          description="Please fill in all required information below to enable digital signature template creation."
          type="warning"
          icon={<ExclamationCircleOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* User Information Display */}
      <Descriptions 
        title="Template Information" 
        size="small" 
        column={1}
        style={{ marginBottom: 16 }}
      >
        <Descriptions.Item label="Full Name">
          {templateInfo.user_data?.full_name || 'Not set'}
        </Descriptions.Item>
        <Descriptions.Item label="Designation">
          {templateInfo.user_data?.designation || 'Not set'}
        </Descriptions.Item>
        <Descriptions.Item label="Company">
          {templateInfo.user_data?.company_name || 'Not set'}
        </Descriptions.Item>
        <Descriptions.Item label="Company Logo">
          {templateInfo.user_data?.has_company_logo ? 'Available' : 'Not available'}
        </Descriptions.Item>
      </Descriptions>

      {/* Missing Fields Warning */}
      {!templateInfo.can_create_template && (
        <Alert
          message="Missing Required Information"
          description={
            <div>
              <Paragraph>Please complete the following information before creating a signature template:</Paragraph>
              <ul>
                {templateInfo.missing_fields?.map((field, index) => (
                  <li key={index}>{field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</li>
                ))}
              </ul>
            </div>
          }
          type="warning"
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Template Preview */}
      {templateInfo.has_existing_template && templateUrl && (
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <Image
            src={templateUrl}
            alt="Signature Template Preview"
            style={{ 
              maxWidth: '100%', 
              maxHeight: '150px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px'
            }}
            preview={false}
          />
        </div>
      )}

      {/* Action Buttons - Removed regenerate button */}
      {/* Templates are automatically managed by the system */}

      {/* Information for users without templates */}
      {!templateInfo.has_existing_template && (
        <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '6px' }}>
          <Text type="secondary">
            {templateInfo.can_create_template
              ? "💡 Your signature template will be created automatically when you save your profile details."
              : "📝 Complete all required fields above, then save your profile to create your signature template."
            }
          </Text>
        </div>
      )}

      {/* Template Creation Info */}
      {templateInfo.template_data && (
        <div style={{ marginTop: 16, fontSize: '12px', color: '#666' }}>
          <Text type="secondary">
            Template created: {new Date(templateInfo.template_data.template_created_at).toLocaleString()}
          </Text>
        </div>
      )}

      {/* Preview Modal */}
      <Modal
        title="Signature Template Preview"
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
        {templateUrl && templateInfo ? (
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
                signerName={templateInfo.user_data?.full_name || 'User'}
                designation={templateInfo.user_data?.designation}
                companyName={templateInfo.user_data?.company_name}
                date={new Date().toLocaleDateString('en-CA')}
                time={new Date().toLocaleTimeString('en-GB')}
                logoUrl={templateInfo.user_data?.logo_url}
              />
            </div>
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">
                This template will be used for document signing with automatic date/time filling.
              </Text>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Alert
              message="No Template Available"
              description="The signature template could not be loaded."
              type="warning"
              showIcon
            />
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default DigitalSignatureTemplate;
