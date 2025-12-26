import React, { useCallback } from 'react';
import { Modal, Descriptions, Typography, Tag, Space } from 'antd';
import { BookOutlined, CalendarOutlined, EnvironmentOutlined, UserOutlined, ClockCircleOutlined, InfoCircleOutlined, EditOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import moment from 'moment';
import type { InductionTrainingData } from '../types';

const { Title, Text } = Typography;

// --- Interface Definition ---
interface InductionTrainingViewProps {
  inductionTraining: InductionTrainingData;
  visible: boolean;
  onClose: () => void;
}

// --- Styled Components for Themed UI ---
const StyledDescriptions = styled(Descriptions)`
  .ant-descriptions-item-label {
    font-weight: 500;
    color: var(--color-text-muted);
  }
  .ant-descriptions-item-content {
    color: var(--color-text-base);
  }
`;

// --- Component Definition ---
const InductionTrainingView: React.FC<InductionTrainingViewProps> = ({ inductionTraining, visible, onClose }) => {
  
  // Memoized helper function for status tags
  const getStatusTag = useCallback((status: string) => {
    switch (status?.toLowerCase()) {
      case 'planned':
        return <Tag color="blue">Planned</Tag>;
      case 'completed':
        return <Tag color="success">Completed</Tag>;
      case 'cancelled':
        return <Tag color="error">Cancelled</Tag>;
      default:
        return <Tag>{status || 'Unknown'}</Tag>;
    }
  }, []);

  // Helper to format dates consistently
  const formatDate = (dateStr: string | undefined) => {
    return dateStr ? moment(dateStr).format('MMMM D, YYYY, h:mm A') : 'N/A';
  };

  return (
    <Modal
      open={visible}
      title={<Title level={4} style={{color: 'var(--color-text-base)'}}>Induction Training Details</Title>}
      onCancel={onClose}
      footer={null} // This is a view-only modal
      width={700}
    >
      <StyledDescriptions bordered column={1} size="middle">
        <Descriptions.Item label={<Space><BookOutlined /> Title</Space>}>
          <Text strong>{inductionTraining.title}</Text>
        </Descriptions.Item>

        {inductionTraining.description && (
          <Descriptions.Item label={<Space><InfoCircleOutlined /> Description</Space>}>
            <Text>{inductionTraining.description}</Text>
          </Descriptions.Item>
        )}

        <Descriptions.Item label={<Space><CalendarOutlined /> Date</Space>}>
          <Text>{inductionTraining.date ? moment(inductionTraining.date).format('MMMM D, YYYY') : 'N/A'}</Text>
        </Descriptions.Item>
        
        <Descriptions.Item label={<Space><EnvironmentOutlined /> Location</Space>}>
          <Text>{inductionTraining.location || 'Not specified'}</Text>
        </Descriptions.Item>
        
        <Descriptions.Item label={<Space><UserOutlined /> Conducted By</Space>}>
          <Text>{inductionTraining.conducted_by || 'Not assigned'}</Text>
        </Descriptions.Item>
        
        <Descriptions.Item label={<Space><InfoCircleOutlined /> Status</Space>}>
          {getStatusTag(inductionTraining.status)}
        </Descriptions.Item>

        <Descriptions.Item label={<Space><ClockCircleOutlined /> Created At</Space>}>
          <Text type="secondary">{formatDate(inductionTraining.created_at)}</Text>
        </Descriptions.Item>
        
        <Descriptions.Item label={<Space><EditOutlined /> Last Updated</Space>}>
          <Text type="secondary">{formatDate(inductionTraining.updated_at)}</Text>
        </Descriptions.Item>

        {inductionTraining.attendances && inductionTraining.attendances.length > 0 && (
          <Descriptions.Item label={<Space><UserOutlined /> Attendance Summary</Space>}>
            <Space direction="vertical" size="small">
              <Text>Total Participants: <strong>{inductionTraining.attendances.length}</strong></Text>
              <Text>Present: <strong style={{color: 'var(--ant-color-success)'}}>
                {inductionTraining.attendances.filter(a => a.status === 'present').length}
              </strong></Text>
              <Text>Absent: <strong style={{color: 'var(--ant-color-error)'}}>
                {inductionTraining.attendances.filter(a => a.status === 'absent').length}
              </strong></Text>
            </Space>
          </Descriptions.Item>
        )}
      </StyledDescriptions>
    </Modal>
  );
};

export default InductionTrainingView;