import React, { useState } from 'react';
import { Button, Modal } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import PrintDocumentTemplate from '../../../components/PrintDocumentTemplate';
import { getDocumentConfig } from '../../../constants/documentConfig';

const InspectionPrintPreview: React.FC = () => {
  const [previewVisible, setPreviewVisible] = useState(false);
  
  const documentInfo = getDocumentConfig('INSPECTION', 'AC_CABLE_TESTING');
  
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
        title="Inspection Print Preview"
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
          title="PRE-COMMISSIONING CHECKLIST"
          subtitle="AC Cable Testing"
        >
          <div className="form-section">
            <div className="form-section-title">Work Details</div>
            <div className="form-row">
              <span className="form-label">Contractor:</span>
              <span className="form-value">_________________________</span>
            </div>
            <div className="form-row">
              <span className="form-label">Date:</span>
              <span className="form-value">_________________________</span>
            </div>
          </div>
          <table className="checklist-table">
            <thead>
              <tr><th>S.No.</th><th>Description</th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr><td>1</td><td>Insulation resistance measurement</td><td>☐</td></tr>
              <tr><td>2</td><td>Hi-pot test results</td><td>☐</td></tr>
            </tbody>
          </table>
        </PrintDocumentTemplate>
      </Modal>
    </>
  );
};

export default InspectionPrintPreview;