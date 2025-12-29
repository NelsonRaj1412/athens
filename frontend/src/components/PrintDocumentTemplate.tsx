import React from 'react';
import './PrintDocumentTemplate.css';

interface DocumentInfo {
  documentName: string;
  documentNumber: string;
  formatNumber: string;
  pageNumber: string;
  issueNumber: string;
  revisionNumber: string;
  issueDate: string;
  revisionDate: string;
  approvedBy?: string;
  reviewedBy?: string;
}

interface PrintDocumentTemplateProps {
  documentInfo: DocumentInfo;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  companyLogo?: string;
  companyName?: string;
  companyTagline?: string;
  classification?: 'CONFIDENTIAL' | 'INTERNAL' | 'PUBLIC';
}

const PrintDocumentTemplate: React.FC<PrintDocumentTemplateProps> = ({
  documentInfo,
  title,
  subtitle,
  children,
  companyLogo = "/logo.png",
  companyName = "PROZEAL GREEN ENERGY PVT LTD",
  companyTagline = "An initiative towards a cleaner tomorrow",
  classification = 'INTERNAL'
}) => {
  return (
    <div className="print-document">
      {/* Print Header */}
      <div className="print-header">
        <table className="header-table">
          <tr>
            <td className="logo-section">
              <img src={companyLogo} alt="Company Logo" className="company-logo" />
            </td>
            <td className="company-section">
              <div className="company-name">{companyName}</div>
              <div className="company-tagline">{companyTagline}</div>
              <div className="document-title">{title}</div>
              {subtitle && <div className="document-subtitle">{subtitle}</div>}
            </td>
            <td className="info-section">
              <table className="document-info-table">
                <tr><td className="info-label">Document Name:</td><td className="info-value">{documentInfo.documentName}</td></tr>
                <tr><td className="info-label">Document No.:</td><td className="info-value">{documentInfo.documentNumber}</td></tr>
                <tr><td className="info-label">Format No.:</td><td className="info-value">{documentInfo.formatNumber}</td></tr>
                <tr><td className="info-label">Page No.:</td><td className="info-value">{documentInfo.pageNumber}</td></tr>
                <tr><td className="info-label">Issue No.:</td><td className="info-value">{documentInfo.issueNumber}</td></tr>
                <tr><td className="info-label">Revision No.:</td><td className="info-value">{documentInfo.revisionNumber}</td></tr>
                <tr><td className="info-label">Issue Date:</td><td className="info-value">{documentInfo.issueDate}</td></tr>
                <tr><td className="info-label">Revision Date:</td><td className="info-value">{documentInfo.revisionDate}</td></tr>
                {documentInfo.approvedBy && (
                  <tr><td className="info-label">Approved By:</td><td className="info-value">{documentInfo.approvedBy}</td></tr>
                )}
                {documentInfo.reviewedBy && (
                  <tr><td className="info-label">Reviewed By:</td><td className="info-value">{documentInfo.reviewedBy}</td></tr>
                )}
              </table>
            </td>
          </tr>
        </table>
        
        {/* Classification Banner */}
        <div className={`classification-banner ${classification.toLowerCase()}`}>
          {classification}
        </div>
      </div>

      {/* Document Content */}
      <div className="print-content">
        {children}
      </div>

      {/* Print Footer */}
      <div className="print-footer">
        <div className="footer-left">
          <span className="document-number">{documentInfo.documentNumber}</span>
          <span className="revision">Rev. {documentInfo.revisionNumber}</span>
        </div>
        <div className="footer-center">
          Page {documentInfo.pageNumber}
        </div>
        <div className="footer-right">
          <span className="issue-date">{documentInfo.issueDate}</span>
        </div>
      </div>
    </div>
  );
};

export default PrintDocumentTemplate;