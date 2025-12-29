import React, { useState, useEffect } from 'react';
import { Modal, Button, List, Typography, Space, message, Badge } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, BellOutlined } from '@ant-design/icons';
import api from '@common/utils/axiosetup';

const { Title, Text } = Typography;

interface SignatureRequest {
  id: number;
  form_type: string;
  form_id: number;
  signature_type: string;
  requested_by: string;
  created_at: string;
}

export default function SignatureApprovalModal() {
  const [visible, setVisible] = useState(false);
  const [requests, setRequests] = useState<SignatureRequest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPendingRequests();
    // Poll for new requests every 30 seconds
    const interval = setInterval(fetchPendingRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPendingRequests = async () => {
    try {
      const response = await api.get('/authentication/signature/request/pending/');
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching signature requests:', error);
    }
  };

  const handleApprove = async (requestId: number) => {
    try {
      setLoading(true);
      await api.post(`/authentication/signature/request/approve/${requestId}/`);
      message.success('Signature approved successfully');
      fetchPendingRequests();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to approve signature');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      setLoading(true);
      await api.post(`/authentication/signature/request/reject/${requestId}/`);
      message.success('Signature request rejected');
      fetchPendingRequests();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to reject signature');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Badge count={requests.length} offset={[10, 0]}>
        <Button 
          icon={<BellOutlined />} 
          onClick={() => setVisible(true)}
          type={requests.length > 0 ? "primary" : "default"}
        >
          Signature Requests
        </Button>
      </Badge>

      <Modal
        title="Pending Signature Requests"
        open={visible}
        onCancel={() => setVisible(false)}
        footer={null}
        width={600}
      >
        {requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Text type="secondary">No pending signature requests</Text>
          </div>
        ) : (
          <List
            dataSource={requests}
            renderItem={(request) => (
              <List.Item
                actions={[
                  <Button
                    key="approve"
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={() => handleApprove(request.id)}
                    loading={loading}
                  >
                    Approve
                  </Button>,
                  <Button
                    key="reject"
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={() => handleReject(request.id)}
                    loading={loading}
                  >
                    Reject
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={`${request.signature_type.toUpperCase()} Signature Request`}
                  description={
                    <Space direction="vertical" size="small">
                      <Text>
                        <strong>Document:</strong> {request.form_type} #{request.form_id}
                      </Text>
                      <Text>
                        <strong>Requested by:</strong> {request.requested_by}
                      </Text>
                      <Text type="secondary">
                        {new Date(request.created_at).toLocaleString()}
                      </Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Modal>
    </>
  );
}