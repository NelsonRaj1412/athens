import React, { useState } from 'react';
import { Button, Modal } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import PrintDocumentTemplate from '../../../components/PrintDocumentTemplate';
import { getDocumentConfig } from '../../../constants/documentConfig';

const TrainingPrintPreview: React.FC = () => {
  const [previewVisible, setPreviewVisible] = useState(false);
  
  const documentInfo = getDocumentConfig('TRAINING', 'INDUCTION_TRAINING');
  
  if (!documentInfo) return null;

  return (
    <>
      <Button 
        icon={<PrinterOutlined />} 
        onClick={() => setPreviewVisible(true)}
      >
        Print Preview
      </Button>
      
      <Modal
        title="Training Print Preview"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width="90%"
        footer={[
          <Button key="print" type="primary" onClick={() => window.print()}>
            Print
          </Button>,
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            Close
          </Button>
        ]}
      >
        <PrintDocumentTemplate
          documentInfo={{ ...documentInfo, pageNumber: "01 of 01" }}
          title="INDUCTION TRAINING RECORD"
          subtitle="New Employee Orientation"
        >
          <div className="form-section">
            <div className="form-section-title">Trainee Information</div>
            <div className="form-row">
              <span className="form-label">Name:</span>
              <span className="form-value">_________________________</span>
            </div>
            <div className="form-row">
              <span className="form-label">Employee ID:</span>
              <span className="form-value">_________________________</span>
            </div>
          </div>
          <div className="training-record">
            <table className="checklist-table">
              <thead>
                <tr><th>Training Module</th><th>Status</th></tr>
              </thead>
              <tbody>
                <tr><td>Safety Orientation</td><td>☐</td></tr>
                <tr><td>Company Policies</td><td>☐</td></tr>
                <tr><td>Emergency Procedures</td><td>☐</td></tr>
              </tbody>
            </table>
          </div>
        </PrintDocumentTemplate>
      </Modal>
    </>
  );
};

export default TrainingPrintPreview;