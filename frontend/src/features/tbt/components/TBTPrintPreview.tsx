import React, { useState } from 'react';
import { Button, Modal } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import PrintDocumentTemplate from '../../../components/PrintDocumentTemplate';
import { getDocumentConfig } from '../../../constants/documentConfig';

const TBTPrintPreview: React.FC = () => {
  const [previewVisible, setPreviewVisible] = useState(false);
  
  const documentInfo = getDocumentConfig('TBT', 'GENERAL_SAFETY');
  
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
        title="TBT Print Preview"
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
          title="TOOL BOX TALK"
          subtitle="General Safety Guidelines"
        >
          <div className="form-section">
            <div className="form-section-title">Meeting Information</div>
            <div className="form-row">
              <span className="form-label">Date:</span>
              <span className="form-value">_________________________</span>
            </div>
            <div className="form-row">
              <span className="form-label">Location:</span>
              <span className="form-value">_________________________</span>
            </div>
          </div>
          <table className="signature-table">
            <thead>
              <tr><th>Name</th><th>Signature</th></tr>
            </thead>
            <tbody>
              {[1,2,3].map(num => (
                <tr key={num}><td></td><td className="signature-cell"></td></tr>
              ))}
            </tbody>
          </table>
        </PrintDocumentTemplate>
      </Modal>
    </>
  );
};

export default TBTPrintPreview;