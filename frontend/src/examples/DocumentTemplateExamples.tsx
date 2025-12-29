import React from 'react';
import PrintDocumentTemplate from '../components/PrintDocumentTemplate';
import { getDocumentConfig } from '../constants/documentConfig';

// Example: TBT Form with standardized template
const TBTForm: React.FC = () => {
  const documentInfo = getDocumentConfig('TBT', 'GENERAL_SAFETY');
  
  if (!documentInfo) return null;

  return (
    <PrintDocumentTemplate
      documentInfo={{
        ...documentInfo,
        pageNumber: "01 of 02"
      }}
      title="TOOL BOX TALK"
      subtitle="General Safety Guidelines"
      classification="INTERNAL"
    >
      <div className="form-section">
        <div className="form-section-title">Meeting Information</div>
        
        <div className="form-row">
          <span className="form-label">Date:</span>
          <span className="form-value">_________________________</span>
        </div>
        
        <div className="form-row">
          <span className="form-label">Time:</span>
          <span className="form-value">_________________________</span>
        </div>
        
        <div className="form-row">
          <span className="form-label">Location:</span>
          <span className="form-value">_________________________</span>
        </div>
      </div>

      <table className="signature-table">
        <thead>
          <tr>
            <th>S.No.</th>
            <th>Name</th>
            <th>Designation</th>
            <th>Signature</th>
          </tr>
        </thead>
        <tbody>
          {[1,2,3,4,5].map(num => (
            <tr key={num}>
              <td>{num}</td>
              <td></td>
              <td></td>
              <td className="signature-cell"></td>
            </tr>
          ))}
        </tbody>
      </table>
    </PrintDocumentTemplate>
  );
};

export { TBTForm };