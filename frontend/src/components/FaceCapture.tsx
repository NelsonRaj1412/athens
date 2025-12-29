import React, { useRef, useState, useCallback } from 'react';
import { Modal, Button, App } from 'antd';
import { CameraOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import Webcam from 'react-webcam';
import api from '@common/utils/axiosetup';

interface FaceCaptureProps {
  visible: boolean;
  onClose: () => void;
  onCapture: (result: { matched: boolean; score: number; photo: string }) => void;
  referencePhoto?: string;
  title?: string;
  userName?: string;
}

const FaceCapture: React.FC<FaceCaptureProps> = ({
  visible,
  onClose,
  onCapture,
  referencePhoto,
  title = "Face Verification",
  userName = "User"
}) => {
  const { message } = App.useApp();
  const webcamRef = useRef<Webcam>(null);
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const [matchResult, setMatchResult] = useState<{ matched: boolean; score: number } | null>(null);

  const videoConstraints = {
    width: 480,
    height: 360,
    facingMode: "user",
    frameRate: { ideal: 10, max: 15 } // Lower frame rate for better laptop performance
  };

  const capturePhoto = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setPhotoSrc(imageSrc || '');
      
      if (imageSrc && referencePhoto) {
        comparePhotos(imageSrc, referencePhoto);
      } else {
        // No reference photo, just capture
        onCapture({ matched: true, score: 100, photo: imageSrc || '' });
      }
    }
  }, [referencePhoto, onCapture]);

  const comparePhotos = async (capturedPhoto: string, refPhoto: string) => {
    setComparing(true);
    try {
      // Convert base64 data URL to blob
      const response = await fetch(capturedPhoto);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('captured_photo', blob, 'captured.jpg');
      formData.append('reference_photo_url', refPhoto);
      
      const apiResponse = await api.post('/authentication/compare-faces/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const { matched, confidence } = apiResponse.data;
      const score = Math.round(confidence * 100);
      
      setMatchResult({ matched, score });
      
      if (matched) {
        message.success(`Match confirmed! Confidence: ${score}%`);
      } else {
        message.error(`Match failed. Confidence: ${score}%`);
      }
    } catch (error) {
      message.error('Failed to compare photos');
      setMatchResult({ matched: false, score: 0 });
    } finally {
      setComparing(false);
    }
  };

  const handleConfirm = () => {
    if (photoSrc && matchResult) {
      // Strict validation: Only allow Present if face matches
      if (matchResult.matched) {
        onCapture({ ...matchResult, photo: photoSrc });
        handleClose();
      } else {
        // Face doesn't match - show error and don't allow Present
        message.error(`Face verification failed. Cannot mark as Present. Please ensure the correct person is being photographed.`);
        // Don't close modal, allow retake
      }
    }
  };

  const handleMarkAbsent = () => {
    if (photoSrc && matchResult) {
      // Allow marking as absent even if face doesn't match
      onCapture({ matched: false, score: matchResult.score, photo: photoSrc });
      handleClose();
    }
  };

  const handleClose = () => {
    setPhotoSrc(null);
    setMatchResult(null);
    setComparing(false);
    onClose();
  };

  const retakePhoto = () => {
    setPhotoSrc(null);
    setMatchResult(null);
  };

  return (
    <Modal
      open={visible}
      title={title}
      onCancel={handleClose}
      width={720}
      footer={[
        <Button key="cancel" onClick={handleClose}>Cancel</Button>,
        photoSrc ? (
          <Button key="retake" onClick={retakePhoto}>Retake</Button>
        ) : (
          <Button key="capture" type="primary" onClick={capturePhoto} icon={<CameraOutlined />}>
            Capture
          </Button>
        ),
        matchResult && matchResult.matched && (
          <Button 
            key="confirm" 
            type="primary" 
            onClick={handleConfirm}
            icon={<CheckCircleOutlined />}
          >
            Confirm Present
          </Button>
        ),
        matchResult && !matchResult.matched && (
          <Button 
            key="absent" 
            danger
            onClick={handleMarkAbsent}
            icon={<CloseCircleOutlined />}
          >
            Mark Absent
          </Button>
        )
      ]}
    >
      <div style={{ textAlign: 'center' }}>
        {!photoSrc ? (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              style={{ borderRadius: 8 }}
            />
            {/* Face guide overlay */}
            <div style={{
              position: 'absolute',
              top: '20%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 200,
              height: 250,
              border: '3px solid #1890ff',
              borderRadius: '50%',
              pointerEvents: 'none',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.3)'
            }}>
              <div style={{
                position: 'absolute',
                bottom: -40,
                left: '50%',
                transform: 'translateX(-50%)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 'bold',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
              }}>
                Position face in oval
              </div>
            </div>
          </div>
        ) : (
          <div>
            {comparing ? (
              <div style={{ padding: 40 }}>
                <div className="ant-spin ant-spin-spinning">
                  <span className="ant-spin-dot ant-spin-dot-spin">
                    <i className="ant-spin-dot-item"></i>
                    <i className="ant-spin-dot-item"></i>
                    <i className="ant-spin-dot-item"></i>
                    <i className="ant-spin-dot-item"></i>
                  </span>
                </div>
                <p style={{ marginTop: 16 }}>Comparing faces...</p>
              </div>
            ) : matchResult ? (
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                {referencePhoto && (
                  <div style={{ textAlign: 'center' }}>
                    <h4>Reference</h4>
                    <img src={referencePhoto} alt="Reference" style={{ width: 150, height: 150, objectFit: 'cover', borderRadius: 8 }} />
                    <p>{userName}</p>
                  </div>
                )}
                <div style={{ textAlign: 'center' }}>
                  <h4>Captured</h4>
                  <img src={photoSrc} alt="Captured" style={{ width: 150, height: 150, objectFit: 'cover', borderRadius: 8 }} />
                  <div style={{ marginTop: 16 }}>
                    <h3 style={{ color: matchResult.matched ? '#52c41a' : '#ff4d4f' }}>
                      {matchResult.matched ? 'Face Match Verified ✓' : 'Face Match Failed ✗'}
                    </h3>
                    <p>Confidence: {matchResult.score}%</p>
                    {!matchResult.matched && (
                      <p style={{ color: '#ff4d4f', fontSize: '12px', marginTop: 8 }}>
                        ⚠️ Cannot mark as Present - Face verification required
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <img src={photoSrc} alt="Captured" style={{ maxWidth: '100%', borderRadius: 8 }} />
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default FaceCapture;