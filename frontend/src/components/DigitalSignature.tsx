import React from 'react';
import './DigitalSignature.css';

interface DigitalSignatureProps {
  signerName: string;
  designation?: string;
  companyName?: string;
  signedBy?: string;
  date?: string;
  time?: string;
  logoUrl?: string;
  employeeId?: string;
}

const DigitalSignature: React.FC<DigitalSignatureProps> = ({
  signerName,
  designation,
  companyName,
  signedBy = "Digitally signed by",
  date,
  time,
  logoUrl,
  employeeId
}) => {
  return (
    <div className="digital-signature-container" style={logoUrl ? { backgroundImage: `url(${logoUrl})` } : {}}>
      <div className="signature-content">
        <div className="signature-left-section">
          <div className="signer-name">{signerName}</div>
          {designation && <div className="signer-designation">{designation}</div>}
          {companyName && <div className="signer-company">{companyName}</div>}
        </div>
        
        <div className="signature-divider"></div>
        
        <div className="signature-right-section">
          <div className="verification-text">{signedBy}</div>
          <div className="verification-text">{signerName}</div>
          {employeeId && <div className="verification-text">ID: {employeeId}</div>}
          {date && <div className="verification-text">Date: {date}</div>}
          {time && <div className="verification-text">Time: {time}</div>}
        </div>
      </div>
    </div>
  );
};

export default DigitalSignature;