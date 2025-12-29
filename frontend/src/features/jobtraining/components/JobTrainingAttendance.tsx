import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Button, List, Avatar, App, Space, Input, Empty, Typography, Tag, Result } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, CameraOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import Webcam from 'react-webcam';
import api from '@common/utils/axiosetup';
import FaceCapture from '../../../components/FaceCapture';
import type { JobTrainingData, JobTrainingAttendanceData } from '../types';
import type { WorkerData } from '@features/worker/types';

const { Title, Text } = Typography;

// --- Styled Components for Themed UI ---
const AttendanceContainer = styled.div`
  /* The Modal provides the background color */
`;

const HeaderSection = styled.div`
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
`;

const SummarySection = styled.div`
  margin-bottom: 16px;
  padding: 12px;
  background-color: var(--color-bg-base);
  border-radius: var(--border-radius-lg);
`;

const WebcamContainer = styled.div`
  text-align: center;

  .webcam-video {
    border-radius: 8px;
    margin-bottom: 16px;
    border: 1px solid var(--color-border);
  }
`;

const EvidenceSection = styled.div`
  margin-top: 24px;
  border: 1px solid var(--color-border);
  padding: 16px;
  border-radius: var(--border-radius-lg);
  text-align: center;
  
  img {
    width: 100%;
    max-width: 400px;
    object-fit: cover;
    border-radius: 8px;
    margin-bottom: 16px;
  }
`;

interface JobTrainingAttendanceProps {
  jobTraining: JobTrainingData;
  visible: boolean;
  onClose: () => void;
}

const JobTrainingAttendance: React.FC<JobTrainingAttendanceProps> = ({ jobTraining, visible, onClose }) => {
  // --- State and Refs ---
  const {message} = App.useApp();
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [faceCapture, setFaceCapture] = useState<{ visible: boolean; worker: WorkerData | null }>({ visible: false, worker: null });
  const [attendanceList, setAttendanceList] = useState<JobTrainingAttendanceData[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [completed, setCompleted] = useState<boolean>(false);
  const [evidencePhotoSrc, setEvidencePhotoSrc] = useState<string | null>(null);
  const [evidenceCameraOpen, setEvidenceCameraOpen] = useState<boolean>(false);
  const [workerStatistics, setWorkerStatistics] = useState<any>(null);
  const evidenceWebcamRef = useRef<Webcam>(null);

  // --- Effects ---
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [workersResponse, attendanceResponse] = await Promise.all([
          api.get('/jobtraining/trained-personnel/'),
          api.get(`/jobtraining/${jobTraining.id}/attendance/`),
        ]);

        // Handle the response format with both workers and users
        if (workersResponse.data?.all_participants && Array.isArray(workersResponse.data.all_participants)) {
          setWorkers(workersResponse.data.all_participants);
          setWorkerStatistics({
            total_workers: workersResponse.data.count || 0,
            workers_count: workersResponse.data.workers_count || 0,
            users_count: workersResponse.data.users_count || 0,
            message: workersResponse.data.message
          });
        } else if (workersResponse.data?.workers && Array.isArray(workersResponse.data.workers)) {
          setWorkers(workersResponse.data.workers);
          setWorkerStatistics({
            total_workers: workersResponse.data.count || 0,
            workers_count: workersResponse.data.workers_count || 0,
            users_count: workersResponse.data.users_count || 0,
            message: workersResponse.data.message
          });
        }

        if (Array.isArray(attendanceResponse.data) && attendanceResponse.data.length > 0) {
          setAttendanceList(attendanceResponse.data);
        }
      } catch (error) {
        message.error('Failed to load trained personnel. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    if (visible) fetchInitialData();
  }, [visible, jobTraining.id, message]);

  // --- Handlers (Memoized) ---
  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleCameraOpen = useCallback((worker: WorkerData) => {
    setFaceCapture({ visible: true, worker });
  }, []);

  const handleFaceCapture = useCallback((result: { matched: boolean; score: number; photo: string }) => {
    if (!faceCapture.worker) return;
    
    const newAttendance: JobTrainingAttendanceData = {
      id: 0,
      key: `temp-${faceCapture.worker.participant_id || faceCapture.worker.id}`,
      job_training_id: jobTraining.id,
      worker_id: faceCapture.worker.participant_id || faceCapture.worker.id,
      participant_type: faceCapture.worker.participant_type || 'worker',
      participant_id: faceCapture.worker.participant_id || faceCapture.worker.id,
      worker_name: `${faceCapture.worker.name} ${faceCapture.worker.surname || ''}`.trim(),
      worker_photo: faceCapture.worker.photo || '',
      attendance_photo: result.photo,
      status: result.matched ? 'present' : 'absent',
      timestamp: new Date().toISOString(),
      match_score: result.score
    };
    
    setAttendanceList(prev => {
      const filtered = prev.filter(a => (a.participant_id || a.worker_id) !== (faceCapture.worker!.participant_id || faceCapture.worker!.id));
      return [...filtered, newAttendance];
    });
    
    setFaceCapture({ visible: false, worker: null });
    message.success(`${faceCapture.worker.name} marked as ${result.matched ? 'present' : 'absent'}`);
  }, [jobTraining.id, faceCapture.worker, message]);

  const handleEvidenceCameraOpen = useCallback(() => setEvidenceCameraOpen(true), []);
  const handleEvidenceCameraClose = useCallback(() => setEvidenceCameraOpen(false), []);

  const captureEvidencePhoto = useCallback(() => {
    if (evidenceWebcamRef.current) {
      const imageSrc = evidenceWebcamRef.current.getScreenshot();
      if (imageSrc) {
        setEvidencePhotoSrc(imageSrc);
        setEvidenceCameraOpen(false);
        message.success('Evidence photo captured successfully');
      }
    }
  }, [message]);

  const handleSubmit = useCallback(async () => {
    if (attendanceList.length === 0) {
      message.error('Please mark attendance for at least one participant');
      return;
    }
    if (!evidencePhotoSrc) {
      message.error('Please take an evidence photo');
      return;
    }
    
    setSubmitting(true);
    
    try {
      await api.post(`/jobtraining/${jobTraining.id}/attendance/`, {
        job_training_id: jobTraining.id,
        attendance_records: attendanceList,
        evidence_photo: evidencePhotoSrc
      });
      
      message.success('Attendance submitted successfully');
      setCompleted(true);
    } catch (error) {
      message.error('Failed to submit attendance');
    } finally {
      setSubmitting(false);
    }
  }, [attendanceList, evidencePhotoSrc, jobTraining.id, message]);

  // --- Helper Functions for Rendering ---
  const isWorkerMarked = useCallback((workerId: number) => 
    attendanceList.some(a => (a.participant_id || a.worker_id) === workerId), [attendanceList]);
  const getAttendanceStatus = useCallback((workerId: number) => 
    attendanceList.find(a => (a.participant_id || a.worker_id) === workerId)?.status, [attendanceList]);

  const filteredWorkers = workers.filter(worker => {
    const fullName = `${worker.name} ${worker.surname || ''}`.toLowerCase();
    const workerId = (worker.worker_id || worker.employee_id || '')?.toLowerCase() || '';
    return fullName.includes(searchTerm.toLowerCase()) || workerId.includes(searchTerm.toLowerCase());
  });

  // --- Render Methods ---
  if (completed) return (
    <Modal open={visible} title="Attendance Completed" footer={<Button type="primary" onClick={onClose}>Close</Button>} onCancel={onClose}>
      <Result status="success" title="Attendance Submitted Successfully!" subTitle={`Recorded attendance for ${attendanceList.length} participants.`} />
    </Modal>
  );

  return (
    <Modal
      open={visible}
      title={`Job Training Attendance: ${jobTraining.title}`}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          onClick={handleSubmit}
          loading={submitting}
          disabled={attendanceList.length === 0 || !evidencePhotoSrc}
        >
          Submit Attendance
        </Button>
      ]}
      width={800}
      destroyOnClose
    >
      <AttendanceContainer>
        <HeaderSection>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space wrap>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                📋 {workerStatistics?.message || 'Showing all trained personnel eligible for job training'}
              </Text>
              {workerStatistics && (
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  (Total: {workerStatistics.total_workers} | Workers: {workerStatistics.workers_count} | Users: {workerStatistics.users_count})
                </Text>
              )}
            </Space>
            <Input 
              placeholder="Search participants by name or ID" 
              prefix={<SearchOutlined />} 
              onChange={handleSearch} 
            />
          </Space>
        </HeaderSection>

        <SummarySection>
          <Space size="large">
            <Text>Available Participants: <strong>{workers.length}</strong></Text>
            <Text>Present: <strong style={{color: 'var(--ant-color-success)'}}>{attendanceList.filter(a => a.status === 'present').length}</strong></Text>
            <Text>Absent: <strong style={{color: 'var(--ant-color-error)'}}>{attendanceList.filter(a => a.status === 'absent').length}</strong></Text>
            <Text>Unmarked: <strong>{workers.length - attendanceList.length}</strong></Text>
          </Space>
        </SummarySection>
        
        <List
          loading={loading}
          dataSource={filteredWorkers}
          renderItem={worker => {
            const isMarked = isWorkerMarked(worker.participant_id || worker.id);
            const status = getAttendanceStatus(worker.participant_id || worker.id);
            
            return (
              <List.Item
                actions={[
                  isMarked ? (
                    status === 'present' ? (
                      <Tag color="success" icon={<CheckCircleOutlined />}>Present</Tag>
                    ) : (
                      <Tag color="error" icon={<CloseCircleOutlined />}>Absent</Tag>
                    )
                  ) : (
                    <Button 
                      type="primary" 
                      icon={<CameraOutlined />} 
                      onClick={() => handleCameraOpen(worker)}
                    >
                      Take Photo
                    </Button>
                  )
                ]}
              >
                <List.Item.Meta
                  avatar={
                    worker.photo ? (
                      <Avatar src={worker.photo} size={48} />
                    ) : (
                      <Avatar icon={<UserOutlined />} size={48} />
                    )
                  }
                  title={<>
                    {`${worker.name} ${worker.surname || ''}`}
                    {worker.participant_type === 'user' && <Tag color="blue" style={{marginLeft: 8}}>User</Tag>}
                  </>}
                  description={
                    <Space direction="vertical" size={0}>
                      <Text type="secondary">ID: {worker.worker_id || worker.employee_id}</Text>
                      <Text type="secondary">{worker.designation}, {worker.department}</Text>
                    </Space>
                  }
                />
              </List.Item>
            );
          }}
          pagination={{
            pageSize: 10,
            size: 'small',
            showSizeChanger: false
          }}
        />
        
        <EvidenceSection>
          <Title level={5} style={{color: 'var(--color-text-base)'}}>Group Evidence Photo</Title>
          {evidencePhotoSrc ? (
            <img src={evidencePhotoSrc} alt="Group Evidence" />
          ) : (
            <Empty description="No evidence photo taken" />
          )}
          <Button 
            type="default" 
            icon={<CameraOutlined />} 
            onClick={handleEvidenceCameraOpen}
          >
            {evidencePhotoSrc ? 'Retake Evidence Photo' : 'Take Evidence Photo'}
          </Button>
        </EvidenceSection>
      </AttendanceContainer>
      
      {/* Face Capture Modal */}
      <FaceCapture
        visible={faceCapture.visible}
        onClose={() => setFaceCapture({ visible: false, worker: null })}
        onCapture={handleFaceCapture}
        referencePhoto={faceCapture.worker?.photo}
        title={`Verify: ${faceCapture.worker?.name || 'Participant'}`}
        userName={`${faceCapture.worker?.name || ''} ${faceCapture.worker?.surname || ''}`.trim()}
      />
      
      {/* Evidence Camera Modal */}
      <Modal 
        open={evidenceCameraOpen} 
        title="Take Group Evidence Photo" 
        onCancel={handleEvidenceCameraClose} 
        footer={null} 
        width={650} 
        destroyOnClose
      >
        <WebcamContainer>
          <Webcam 
            audio={false} 
            ref={evidenceWebcamRef} 
            screenshotFormat="image/jpeg" 
            width={600} 
            height={450} 
            className="webcam-video" 
          />
          <Button 
            key="submit" 
            type="primary" 
            onClick={captureEvidencePhoto} 
            size="large"
          >
            Capture Evidence Photo
          </Button>
        </WebcamContainer>
      </Modal>
    </Modal>
  );
};

export default JobTrainingAttendance;