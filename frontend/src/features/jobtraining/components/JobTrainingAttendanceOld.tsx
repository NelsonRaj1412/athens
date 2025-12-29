import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, List, Avatar, App, Space, Input, Empty, Typography, Tag, Result } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, CameraOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import Webcam from 'react-webcam';
import api from '@common/utils/axiosetup';
import FaceCapture from '../../../components/FaceCapture';
import type { JobTrainingData, JobTrainingAttendanceData } from '../types';
import type { WorkerData } from '@features/worker/types';

const { Title, Text } = Typography;
const { Search } = Input;

interface JobTrainingAttendanceProps {
  jobTraining: JobTrainingData;
  visible: boolean;
  onClose: () => void;
}

const JobTrainingAttendance: React.FC<JobTrainingAttendanceProps> = ({ jobTraining, visible, onClose }) => {
  const {message} = App.useApp();
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [faceCapture, setFaceCapture] = useState<{ visible: boolean; worker: WorkerData | null }>({ visible: false, worker: null });
  const [attendanceList, setAttendanceList] = useState<JobTrainingAttendanceData[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [completed, setCompleted] = useState<boolean>(false);
  const [evidencePhotoSrc, setEvidencePhotoSrc] = useState<string>('');
  const [evidenceCameraOpen, setEvidenceCameraOpen] = useState<boolean>(false);
  const evidenceWebcamRef = useRef<Webcam>(null);

  // Fetch workers when component mounts
  useEffect(() => {
    const fetchWorkers = async () => {
      setLoading(true);
      try {
        // Fetch trained personnel (both workers and users) from job training endpoint
        const response = await api.get('/jobtraining/trained-personnel/');
        
        if (response.data && response.data.workers) {
          const allParticipants = response.data.workers.map((participant: any) => ({
            key: String(participant.id),
            id: participant.id,
            name: participant.name,
            worker_id: participant.worker_id || participant.employee_id || participant.username,
            surname: participant.surname || '',
            photo: participant.photo,
            department: participant.department || 'N/A',
            designation: participant.designation || (participant.participant_type === 'user' ? 'Employee' : 'Worker'),
            status: participant.status || 'trained',
            phone_number: participant.phone_number || '',
            email: participant.email || '',
            address: participant.address || '',
            joining_date: participant.joining_date || participant.date_of_joining || '',
            employment_status: participant.employment_status || 'trained',
            participant_type: participant.participant_type || 'worker'
          }));
          
          setWorkers(allParticipants as WorkerData[]);
        }
        
      } catch (error) {
        message.error('Failed to fetch trained personnel');
      } finally {
        setLoading(false);
      }
    };

    // Check if there's already attendance data for this Job Training
    const checkExistingAttendance = async () => {
      try {
        const response = await api.get(`/jobtraining/${jobTraining.id}/attendance/`);
        if (response.data && response.data.length > 0) {
          setAttendanceList(response.data);
          if (response.data.some((a: any) => a.status === 'present')) {
            message.info('Some attendance records already exist for this job training.');
          }
        }
      } catch (error) {
      }
    };

    if (visible) {
      fetchWorkers();
      checkExistingAttendance();
    }
  }, [visible, jobTraining.id]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredWorkers = workers.filter(worker => 
    worker.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    worker.worker_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (worker.surname && worker.surname.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCameraOpen = (worker: WorkerData) => {
    setFaceCapture({ visible: true, worker });
  };

  const handleFaceCapture = (result: { matched: boolean; score: number; photo: string }) => {
    if (!faceCapture.worker) return;
    
    const newAttendance: JobTrainingAttendanceData = {
      id: 0,
      key: `temp-${faceCapture.worker.id}`,
      job_training_id: jobTraining.id,
      worker_id: faceCapture.worker.id,
      participant_type: faceCapture.worker.participant_type || 'worker',
      participant_id: faceCapture.worker.id,
      worker_name: `${faceCapture.worker.name} ${faceCapture.worker.surname || ''}`,
      worker_photo: faceCapture.worker.photo || '',
      attendance_photo: result.photo,
      status: result.matched ? 'present' : 'absent',
      timestamp: new Date().toISOString(),
      match_score: result.score
    };
    
    setAttendanceList(prev => {
      const filtered = prev.filter(a => a.worker_id !== faceCapture.worker!.id);
      return [...filtered, newAttendance];
    });
    
    setFaceCapture({ visible: false, worker: null });
    message.success(`${faceCapture.worker.name} marked as ${result.matched ? 'present' : 'absent'}`);
  };

  const getAttendanceStatus = (workerId: number) => {
    const record = attendanceList.find(a => a.worker_id === workerId);
    return record ? record.status : null;
  };

  const handleSubmit = async () => {
    if (attendanceList.length === 0) {
      message.error('Please mark attendance for at least one worker');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Submit all attendance records to the backend
      await api.post(`/jobtraining/${jobTraining.id}/attendance/`, {
        job_training_id: jobTraining.id,
        attendance_records: attendanceList,
        evidence_photo: evidencePhotoSrc
      });
      
      // The backend will update the status to completed automatically
      // No need for a separate PUT request
      
      message.success('Attendance submitted successfully');
      setCompleted(true);
    } catch (error) {
      message.error('Failed to submit attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const isWorkerMarked = (workerId: number) => {
    return attendanceList.some(a => a.worker_id === workerId);
  };

  const handleEvidenceCameraOpen = () => {
    setEvidenceCameraOpen(true);
  };

  const handleEvidenceCameraClose = () => {
    setEvidenceCameraOpen(false);
  };

  const captureEvidencePhoto = () => {
    if (evidenceWebcamRef.current) {
      const imageSrc = evidenceWebcamRef.current.getScreenshot();
      if (imageSrc) {
        setEvidencePhotoSrc(imageSrc);
        setEvidenceCameraOpen(false);
        message.success('Evidence photo captured successfully');
      }
    }
  };

  // Render the evidence camera modal
  const renderEvidenceCameraModal = () => (
    <Modal
      open={evidenceCameraOpen}
      title="Take Group Photo for Evidence"
      onCancel={handleEvidenceCameraClose}
      footer={[
        <Button key="back" onClick={handleEvidenceCameraClose}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={captureEvidencePhoto}>
          Capture
        </Button>,
      ]}
      width={650}
    >
      <div style={{ textAlign: 'center' }}>
        <Webcam
          audio={false}
          ref={evidenceWebcamRef}
          screenshotFormat="image/jpeg"
          width={600}
          height={450}
          videoConstraints={{
            width: 600,
            height: 450,
            facingMode: "user"
          }}
          style={{ marginBottom: 16 }}
        />
      </div>
    </Modal>
  );

  return (
    <Modal
      open={visible}
      title={`Take Attendance: ${jobTraining.title}`}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={submitting}>
          {completed ? 'Close' : 'Cancel'}
        </Button>,
        !completed && (
          <Button 
            key="submit" 
            type="primary" 
            onClick={handleSubmit}
            loading={submitting}
            disabled={attendanceList.length === 0}
          >
            Submit Attendance
          </Button>
        )
      ]}
      width={800}
      destroyOnClose
    >
      {completed ? (
        <Result
          status="success"
          title="Attendance Submitted Successfully"
          subTitle={`All attendance records for "${jobTraining.title}" have been saved.`}
        />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Search
            placeholder="Search workers by name or ID"
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            onSearch={value => setSearchTerm(value)}
            onChange={handleSearch}
          />
          
          <div style={{ marginBottom: 16 }}>
            <Title level={5}>Attendance Summary</Title>
            <Text>
              Total Workers: {workers.length} | 
              Present: {attendanceList.filter(a => a.status === 'present').length} | 
              Absent: {attendanceList.filter(a => a.status === 'absent').length} | 
              Unmarked: {workers.length - attendanceList.length}
            </Text>
          </div>
          
          <List
            loading={loading}
            dataSource={filteredWorkers}
            renderItem={worker => {
              const isMarked = isWorkerMarked(worker.id);
              const status = getAttendanceStatus(worker.id);
              
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
                        <Text type="secondary">ID: {worker.worker_id}</Text>
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
          
          {/* Face Capture Modal */}
          <FaceCapture
            visible={faceCapture.visible}
            onClose={() => setFaceCapture({ visible: false, worker: null })}
            onCapture={handleFaceCapture}
            referencePhoto={faceCapture.worker?.photo}
            title={`Take Photo of ${faceCapture.worker?.name || 'Worker'}`}
            userName={`${faceCapture.worker?.name || ''} ${faceCapture.worker?.surname || ''}`.trim()}
          />
          
          {/* Evidence Photo Section */}
          <div style={{ marginTop: 24, marginBottom: 24, border: '1px solid #f0f0f0', padding: 16, borderRadius: 8 }}>
            <Title level={5}>Evidence Photo</Title>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {evidencePhotoSrc ? (
                <div style={{ marginBottom: 16 }}>
                  <img 
                    src={evidencePhotoSrc} 
                    alt="Group Evidence" 
                    style={{ width: '100%', maxWidth: 600, objectFit: 'cover', borderRadius: 4 }} 
                  />
                </div>
              ) : (
                <div style={{ marginBottom: 16 }}>
                  <Empty description="No evidence photo taken" />
                </div>
              )}
              <Button 
                type="primary" 
                icon={<CameraOutlined />} 
                onClick={handleEvidenceCameraOpen}
              >
                {evidencePhotoSrc ? 'Retake Evidence Photo' : 'Take Evidence Photo'}
              </Button>
            </div>
          </div>
        </Space>
      )}
      
      {/* Render Evidence Camera Modal */}
      {renderEvidenceCameraModal()}
    </Modal>
  );
};

export default JobTrainingAttendance;
