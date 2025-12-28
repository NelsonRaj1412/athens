import React, { useCallback, useState, useEffect } from 'react';
import { Modal, Descriptions, Typography, Tag, Space, List, Avatar, Image, Divider, Empty } from 'antd';
import { BookOutlined, CalendarOutlined, EnvironmentOutlined, UserOutlined, ClockCircleOutlined, InfoCircleOutlined, EditOutlined, CameraOutlined, TeamOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import moment from 'moment';
import api from '@common/utils/axiosetup';
import type { InductionTrainingData, InductionTrainingAttendanceData } from '../types';

const { Title, Text } = Typography;

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

const EvidenceSection = styled.div`
  margin: 16px 0;
  text-align: center;
  
  .evidence-image {
    max-width: 100%;
    max-height: 300px;
    border-radius: 8px;
    border: 1px solid var(--color-border);
  }
`;

const ParticipantsSection = styled.div`
  margin: 16px 0;
  
  .participant-list {
    max-height: 300px;
    overflow-y: auto;
  }
`;

// --- Interface Definition ---
interface InductionTrainingViewProps {
  inductionTraining: InductionTrainingData;
  visible: boolean;
  onClose: () => void;
}

// --- Component Definition ---
const InductionTrainingView: React.FC<InductionTrainingViewProps> = ({ inductionTraining, visible, onClose }) => {
  const [attendanceDetails, setAttendanceDetails] = useState<InductionTrainingAttendanceData[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch detailed attendance data when modal opens
  useEffect(() => {
    if (visible && inductionTraining.id) {
      fetchAttendanceDetails();
    }
  }, [visible, inductionTraining.id]);

  const fetchAttendanceDetails = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/induction/${inductionTraining.id}/attendance/`);
      if (Array.isArray(response.data)) {
        setAttendanceDetails(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch attendance details:', error);
    } finally {
      setLoading(false);
    }
  };
  
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
    if (!dateStr) return 'N/A';
    return moment(dateStr).format('MMMM D, YYYY, h:mm A');
  };

  return (
    <Modal
      open={visible}
      title={<Title level={4} style={{color: 'var(--color-text-base)'}}>Induction Training Details (Enhanced)</Title>}
      onCancel={onClose}
      footer={null} // This is a view-only modal
      width={800}
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

        {(inductionTraining.attendances || attendanceDetails).length > 0 && (
          <Descriptions.Item label={<Space><UserOutlined /> Attendance Summary</Space>}>
            <Space direction="vertical" size="small">
              <Text>Total Participants: <strong>{(inductionTraining.attendances || attendanceDetails).length}</strong></Text>
              <Text>Present: <strong style={{color: 'var(--ant-color-success)'}}>
                {(inductionTraining.attendances || attendanceDetails).filter(a => a.status === 'present').length}
              </strong></Text>
              <Text>Absent: <strong style={{color: 'var(--ant-color-error)'}}>
                {(inductionTraining.attendances || attendanceDetails).filter(a => a.status === 'absent').length}
              </strong></Text>
            </Space>
          </Descriptions.Item>
        )}
      </StyledDescriptions>

      {/* Evidence Photo Section */}
      {inductionTraining.status === 'completed' && inductionTraining.evidence_photo && (
        <>
          <Divider orientation="left">
            <Space>
              <CameraOutlined />
              <Text strong>Training Evidence</Text>
            </Space>
          </Divider>
          <EvidenceSection>
            <Image
              src={inductionTraining.evidence_photo}
              alt="Training Evidence"
              className="evidence-image"
              placeholder={<div>Loading evidence photo...</div>}
            />
          </EvidenceSection>
        </>
      )}

      {/* Participants Details Section */}
      {attendanceDetails.length > 0 && (
        <>
          <Divider orientation="left">
            <Space>
              <TeamOutlined />
              <Text strong>Participants Details</Text>
            </Space>
          </Divider>
          <ParticipantsSection>
            <List
              className="participant-list"
              dataSource={attendanceDetails}
              loading={loading}
              renderItem={(participant) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        src={participant.worker_photo || undefined} 
                        icon={<UserOutlined />} 
                        size={40}
                      />
                    }
                    title={
                      <Space>
                        <Text strong>{participant.worker_name}</Text>
                        {participant.participant_type === 'user' && (
                          <Tag color="blue" size="small">User</Tag>
                        )}
                        {participant.status === 'present' ? (
                          <Tag color="success" size="small">Present</Tag>
                        ) : (
                          <Tag color="error" size="small">Absent</Tag>
                        )}
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={0}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          ID: {Math.abs(participant.worker_id)}
                        </Text>
                        {participant.match_score && participant.match_score > 0 && (
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Match Score: {participant.match_score}%
                          </Text>
                        )}
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Recorded: {moment(participant.timestamp || participant.created_at).format('MMM D, YYYY h:mm A')}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </ParticipantsSection>
        </>
      )}
    </Modal>
  );
};

export default InductionTrainingView;