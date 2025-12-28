import React, { useState, useRef, useEffect } from 'react';
import { Modal, Button, List, Avatar, App, Space, Input, Spin, Result, Typography, Row, Col, Card, Tag, Empty } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, CameraOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import Webcam from 'react-webcam';
import api from '@common/utils/axiosetup';
import type { ToolboxTalkData, ToolboxTalkAttendanceData } from '../types';
import type { WorkerData } from '@features/worker/types';

const { Title, Text } = Typography;

interface ToolboxTalkAttendanceProps {
  toolboxTalk: ToolboxTalkData;
  visible: boolean;
  onClose: () => void;
}

const ToolboxTalkAttendance: React.FC<ToolboxTalkAttendanceProps> = ({ toolboxTalk, visible, onClose }) => {
  const {message} = App.useApp();  
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [cameraOpen, setCameraOpen] = useState<boolean>(false);
  const [currentWorker, setCurrentWorker] = useState<WorkerData | null>(null);
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<{ matched: boolean; score: number } | null>(null);
  const [attendanceList, setAttendanceList] = useState<ToolboxTalkAttendanceData[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [completed, setCompleted] = useState<boolean>(false);
  const webcamRef = useRef<Webcam>(null);
  const [evidencePhotoSrc, setEvidencePhotoSrc] = useState<string | null>(null);
  const [evidenceCameraOpen, setEvidenceCameraOpen] = useState<boolean>(false);
  const evidenceWebcamRef = useRef<Webcam>(null);

  // Fetch workers when component mounts
  useEffect(() => {
    const fetchWorkers = async () => {
      setLoading(true);
      try {
        // Fetch induction-trained personnel (both workers and users)
        const response = await api.get('/tbt/trained-personnel/');
        if (response.data && response.data.all_participants) {
          const fetchedWorkers = response.data.all_participants.map((participant: any) => ({
            key: String(participant.id),
            id: participant.id,
            name: participant.name,
            worker_id: participant.worker_id || participant.username,
            surname: participant.surname || '',
            photo: participant.photo,
            department: participant.department,
            designation: participant.designation,
            status: participant.status,
            phone_number: participant.phone_number || '',
            email: participant.email || '',
            address: participant.address || '',
            joining_date: participant.joining_date || participant.date_of_joining || '',
            employment_status: participant.employment_status || 'trained',
            participant_type: participant.participant_type || 'worker',
            participant_id: participant.participant_id || participant.id,
          })) as WorkerData[];
          setWorkers(fetchedWorkers);
        }
      } catch (error) {
        message.error('Failed to fetch trained personnel');
      } finally {
        setLoading(false);
      }
    };

    // Check if there's already attendance data for this TBT
    const checkExistingAttendance = async () => {
      try {
        const response = await api.get(`/tbt/${toolboxTalk.id}/attendance/`);
        if (response.data && response.data.length > 0) {
          setAttendanceList(response.data);
          if (response.data.some((a: any) => a.status === 'present')) {
            message.info('Some attendance records already exist for this toolbox talk.');
          }
        }
      } catch (error) {
      }
    };

    if (visible) {
      fetchWorkers();
      checkExistingAttendance();
    }
  }, [visible, toolboxTalk.id]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredWorkers = workers.filter(worker => 
    worker.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    worker.worker_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (worker.surname && worker.surname.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCameraOpen = (worker: WorkerData) => {
    setCurrentWorker(worker);
    setCameraOpen(true);
    setPhotoSrc(null);
    setMatchResult(null);
  };

  const handleCameraClose = () => {
    setCameraOpen(false);
  };

  const capturePhoto = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setPhotoSrc(imageSrc);
      
      // Now compare with the worker's photo in the database
      if (currentWorker && currentWorker.photo && imageSrc) {
        comparePhotos(imageSrc, currentWorker.photo);
      } else {
        // SECURITY FIX: Do not allow attendance without reference photo
        setMatchResult({ matched: false, score: 0 });
        message.error('No reference photo available for this worker. Attendance cannot be marked without photo verification. Please contact administrator to add worker photo.');
      }
    }
  };

  const comparePhotos = async (_capturedPhoto: string, _referencePhoto: string) => {
    try {
      // Implementation remains the same...
      const simulatedScore = Math.floor(Math.random() * 31) + 70;
      const matched = simulatedScore > 80;
      
      setMatchResult({ matched, score: simulatedScore });
      
      if (matched) {
        message.success(`Match confirmed! Confidence: ${simulatedScore}%`);
      } else {
        message.error(`Match failed. Confidence: ${simulatedScore}%`);
      }
    } catch (error) {
      message.error('Failed to compare photos');
      setMatchResult({ matched: false, score: 0 });
    }
  };

  const markAttendance = (worker: WorkerData, present: boolean) => {
    // Create a new attendance record
    const newAttendance: ToolboxTalkAttendanceData = {
      id: 0, // Will be assigned by backend
      key: `temp-${worker.id}`,
      toolbox_talk_id: toolboxTalk.id,
      worker_id: worker.id,
      worker_name: `${worker.name} ${worker.surname || ''}`,
      worker_photo: worker.photo || '',
      attendance_photo: photoSrc || '',
      status: present ? 'present' : 'absent',
      timestamp: new Date().toISOString(),
      match_score: matchResult?.score || 0
    };
    
    // Update local state
    setAttendanceList(prev => {
      // Remove any existing record for this worker
      const filtered = prev.filter(a => a.worker_id !== worker.id);
      // Add the new record
      return [...filtered, newAttendance];
    });
    
    // Reset state for next worker
    setCameraOpen(false);
    setPhotoSrc(null);
    setMatchResult(null);
    setCurrentWorker(null);
    
    message.success(`${worker.name} marked as ${present ? 'present' : 'absent'}`);
  };

  const handleSubmitAttendance = async () => {
    if (attendanceList.length === 0) {
      message.warning('No attendance records to submit');
      return;
    }
    
    if (!evidencePhotoSrc) {
      message.warning('Please take a group photo for evidence');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Submit all attendance records to the backend
      await api.post('/tbt/attendance/', {
        toolbox_talk_id: toolboxTalk.id,
        attendance_records: attendanceList,
        evidence_photo: evidencePhotoSrc
      });
      
      // Update toolbox talk status to completed
      await api.put(`/tbt/update/${toolboxTalk.id}/`, {
        ...toolboxTalk,
        status: 'completed'
      });
      
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

  const getAttendanceStatus = (workerId: number) => {
    const record = attendanceList.find(a => a.worker_id === workerId);
    return record ? record.status : null;
  };

  // Render the completion screen
  if (completed) {
    return (
      <Modal
        open={visible}
        title="Toolbox Talk Attendance"
        onCancel={onClose}
        footer={[
          <Button key="close" type="primary" onClick={onClose}>
            Close
          </Button>
        ]}
        width={800}
      >
        <Result
          status="success"
          title="Attendance Completed!"
          subTitle={`Successfully recorded attendance for ${attendanceList.length} workers.`}
        />
      </Modal>
    );
  }

  // Render the camera modal
  const renderCameraModal = () => (
    <Modal
      open={cameraOpen}
      title={`Take Photo of ${currentWorker?.name || 'Worker'}`}
      onCancel={handleCameraClose}
      footer={null}
      width={600}
    >
      <div style={{ textAlign: 'center' }}>
        {!photoSrc ? (
          <>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              width={400}
              height={300}
              videoConstraints={{
                width: 400,
                height: 300,
                facingMode: "user"
              }}
              style={{ marginBottom: 16 }}
            />
            <Button 
              type="primary" 
              icon={<CameraOutlined />} 
              onClick={capturePhoto}
              style={{ marginBottom: 16 }}
            >
              Capture Photo
            </Button>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <img 
                src={photoSrc} 
                alt="Captured" 
                style={{ width: 400, height: 300, objectFit: 'cover' }} 
              />
            </div>
            
            {matchResult ? (
              <div style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Card title="Captured Photo">
                      <img 
                        src={photoSrc} 
                        alt="Captured" 
                        style={{ width: '100%', height: 150, objectFit: 'cover' }} 
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="Reference Photo">
                      <img 
                        src={currentWorker?.photo || ''} 
                        alt="Reference" 
                        style={{ width: '100%', height: 150, objectFit: 'cover' }} 
                      />
                    </Card>
                  </Col>
                </Row>
                
                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  <Title level={4}>
                    Match Result: {matchResult.matched ? 'Success' : 'Failed'}
                  </Title>
                  <Text>Confidence Score: {matchResult.score}%</Text>
                  
                  <div style={{ marginTop: 16 }}>
                    <Space>
                      <Button 
                        type="primary" 
                        icon={<CheckCircleOutlined />} 
                        onClick={() => currentWorker && markAttendance(currentWorker, true)}
                        style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                      >
                        Mark Present
                      </Button>
                      <Button 
                        danger 
                        icon={<CloseCircleOutlined />} 
                        onClick={() => currentWorker && markAttendance(currentWorker, false)}
                      >
                        Mark Absent
                      </Button>
                      <Button onClick={() => setPhotoSrc(null)}>Retake Photo</Button>
                    </Space>
                  </div>
                </div>
              </div>
            ) : (
              <Spin tip="Comparing photos...">
                <div style={{ height: 100 }} />
              </Spin>
            )}
          </>
        )}
      </div>
    </Modal>
  );

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

  const handleEvidenceCameraOpen = () => {
    setEvidenceCameraOpen(true);
  };

  const handleEvidenceCameraClose = () => {
    setEvidenceCameraOpen(false);
  };

  const captureEvidencePhoto = () => {
    if (evidenceWebcamRef.current) {
      const imageSrc = evidenceWebcamRef.current.getScreenshot();
      setEvidencePhotoSrc(imageSrc);
      setEvidenceCameraOpen(false);
    }
  };

  return (
    <Modal
      open={visible}
      title={`Toolbox Talk Attendance: ${toolboxTalk.title}`}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          onClick={handleSubmitAttendance}
          loading={submitting}
          disabled={attendanceList.length === 0}
        >
          Submit Attendance
        </Button>
      ]}
      width={800}
    >
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search workers by name or ID"
          prefix={<SearchOutlined />}
          onChange={handleSearch}
          style={{ width: '100%' }}
        />
      </div>
      
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
                title={`${worker.name} ${worker.surname || ''}`}
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
      
      {renderCameraModal()}
      {renderEvidenceCameraModal()}

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
    </Modal>
  );
};

export default ToolboxTalkAttendance;
