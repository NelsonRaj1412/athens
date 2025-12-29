import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Tag, Spin, Alert, Typography } from 'antd';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '@common/utils/axiosetup';

const { Title, Text } = Typography;

interface MobilePermitData {
  id: number;
  permit_number: string;
  permit_type: string;
  status: string;
  location: string;
  description: string;
  planned_start_time: string;
  planned_end_time: string;
  risk_level: string;
  created_by: string;
  created_at: string;
  control_measures: string;
  ppe_requirements: string;
}

const MobilePermitView: React.FC = () => {
  const { permitId } = useParams<{ permitId: string }>();
  const [permit, setPermit] = useState<MobilePermitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPermit = async () => {
      try {
        const response = await api.get(`/api/ptw/mobile-permit/${permitId}/`);
        const data = response.data;
        setPermit(data);
      } catch (err) {
        setError('Network error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (permitId) {
      fetchPermit();
    }
  }, [permitId]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'default',
      pending_verification: 'processing',
      verified: 'success',
      pending_approval: 'orange',
      approved: 'green',
      rejected: 'red',
      in_progress: 'blue',
      completed: 'cyan',
      closed: 'default',
      cancelled: 'magenta'
    };
    return colors[status] || 'default';
  };

  const getRiskColor = (risk: string) => {
    const colors: Record<string, string> = {
      low: 'green',
      medium: 'orange',
      high: 'red',
      extreme: 'purple'
    };
    return colors[risk] || 'default';
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>Loading permit details...</div>
      </div>
    );
  }

  if (error || !permit) {
    return (
      <div style={{ padding: '20px' }}>
        <Alert
          message="Error"
          description={error || 'Permit not found'}
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
      <Card>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Title level={3} style={{ margin: 0 }}>
            {permit.permit_number}
          </Title>
          <Text type="secondary">{permit.permit_type}</Text>
        </div>

        <div style={{ marginBottom: '16px', textAlign: 'center' }}>
          <Tag color={getStatusColor(permit.status)} style={{ fontSize: '14px', padding: '4px 12px' }}>
            {permit.status.replace('_', ' ').toUpperCase()}
          </Tag>
        </div>

        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Location">
            {permit.location}
          </Descriptions.Item>
          
          <Descriptions.Item label="Risk Level">
            <Tag color={getRiskColor(permit.risk_level)}>
              {permit.risk_level.toUpperCase()}
            </Tag>
          </Descriptions.Item>
          
          <Descriptions.Item label="Planned Start">
            {dayjs(permit.planned_start_time).format('MMM DD, YYYY HH:mm')}
          </Descriptions.Item>
          
          <Descriptions.Item label="Planned End">
            {dayjs(permit.planned_end_time).format('MMM DD, YYYY HH:mm')}
          </Descriptions.Item>
          
          <Descriptions.Item label="Created By">
            {permit.created_by}
          </Descriptions.Item>
          
          <Descriptions.Item label="Created On">
            {dayjs(permit.created_at).format('MMM DD, YYYY HH:mm')}
          </Descriptions.Item>
          
          <Descriptions.Item label="Description">
            {permit.description}
          </Descriptions.Item>
          
          {permit.control_measures && (
            <Descriptions.Item label="Control Measures">
              {permit.control_measures}
            </Descriptions.Item>
          )}
          
          {permit.ppe_requirements && (
            <Descriptions.Item label="PPE Requirements">
              {permit.ppe_requirements}
            </Descriptions.Item>
          )}
        </Descriptions>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Scanned via QR Code • Mobile View
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default MobilePermitView;