import React, { useState } from 'react';
import { Button, Modal } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import PrintDocumentTemplate from '../../../components/PrintDocumentTemplate';
import { getDocumentConfig } from '../../../constants/documentConfig';

const PTWPrintPreview: React.FC = () => {
  const [previewVisible, setPreviewVisible] = useState(false);
  
  const documentInfo = getDocumentConfig('PTW', 'HOT_WORK');
  
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
        title="PTW Print Preview"
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
          documentInfo={{ ...documentInfo, pageNumber: "01 of 02" }}
          title="PERMIT TO WORK"
          subtitle="Hot Work Operations"
        >
          <div className="form-section">
            <div className="form-section-title">Work Details</div>
            <div className="form-row">
              <span className="form-label">Permit No.:</span>
              <span className="form-value">_________________________</span>
            </div>
            <div className="form-row">
              <span className="form-label">Work Description:</span>
              <span className="form-value">_________________________</span>
            </div>
          </div>
          <div className="emergency-contacts">
            <div className="emergency-title">EMERGENCY CONTACTS</div>
            <div>Fire Emergency: 101 | Medical Emergency: 108</div>
          </div>
        </PrintDocumentTemplate>
      </Modal>
    </>
  );
};

export default PTWPrintPreview;