import React from 'react';
import { Button, Tooltip } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import PrintDocumentTemplate from '../../../components/PrintDocumentTemplate';
import { DOCUMENT_CONFIG } from '../../../constants/documentConfig';
import * as Types from '../types';

interface PTWRecordPrintPreviewProps {
  permitData: Types.Permit;
}

export default function PTWRecordPrintPreview({ permitData }: PTWRecordPrintPreviewProps) {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = (
      <PrintDocumentTemplate
        documentType="Permit to Work"
        documentNumber={DOCUMENT_CONFIG.PTW.HOT_WORK.documentNumber}
        title="PERMIT TO WORK"
      >
        <div className="info-section">
          <div className="info-row">
            <span><strong>Permit Number:</strong> {permitData.permit_number || '_________________'}</span>
            <span><strong>Type:</strong> {permitData.permit_type_details?.name || '_________________'}</span>
          </div>
          <div className="info-row">
            <span><strong>Location:</strong> {permitData.location || '_________________'}</span>
            <span><strong>Status:</strong> {permitData.status || '_________________'}</span>
          </div>
          <div className="info-row">
            <span><strong>Planned Start:</strong> {permitData.planned_start_time || '_________________'}</span>
            <span><strong>Planned End:</strong> {permitData.planned_end_time || '_________________'}</span>
          </div>
        </div>

        <h3>Work Description</h3>
        <div className="description-section">
          {permitData.work_description || 'No description provided'}
        </div>

        <h3>Hazards & Precautions</h3>
        <div className="description-section">
          {permitData.hazards_identified || 'No hazards identified'}
        </div>

        <h3>Safety Measures</h3>
        <div className="description-section">
          {permitData.safety_measures || 'No safety measures specified'}
        </div>

        <div className="signature-section">
          <table className="signature-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Name</th>
                <th>Signature</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Permit Requester</td>
                <td>{permitData.created_by_details ? `${permitData.created_by_details.first_name} ${permitData.created_by_details.last_name}` : '________________'}</td>
                <td>________________</td>
                <td>{permitData.created_at ? new Date(permitData.created_at).toLocaleDateString() : '________________'}</td>
              </tr>
              <tr>
                <td>Verifier</td>
                <td>{permitData.verifier_details ? `${permitData.verifier_details.first_name} ${permitData.verifier_details.last_name}` : '________________'}</td>
                <td>________________</td>
                <td>{permitData.verified_at ? new Date(permitData.verified_at).toLocaleDateString() : '________________'}</td>
              </tr>
              <tr>
                <td>Approver</td>
                <td>{permitData.approver_details ? `${permitData.approver_details.first_name} ${permitData.approver_details.last_name}` : '________________'}</td>
                <td>________________</td>
                <td>{permitData.approved_at ? new Date(permitData.approved_at).toLocaleDateString() : '________________'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Work Team</h3>
        <table className="checklist-table">
          <thead>
            <tr>
              <th>S.No.</th>
              <th>Name</th>
              <th>Designation</th>
              <th>Company</th>
              <th>Signature</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({length: 8}, (_, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>________________</td>
                <td>________________</td>
                <td>________________</td>
                <td>________________</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PrintDocumentTemplate>
    );

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>PTW - ${permitData.permit_number || 'Document'}</title>
          <link rel="stylesheet" href="/src/components/PrintDocumentTemplate.css">
          <style>
            body { margin: 0; font-family: Arial, sans-serif; }
            .info-section { margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
            .description-section { margin: 15px 0; padding: 10px; border: 1px solid #ccc; min-height: 60px; }
            .checklist-table, .signature-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .checklist-table th, .checklist-table td, .signature-table th, .signature-table td { 
              border: 1px solid #000; padding: 8px; text-align: left; 
            }
            .signature-section { margin: 30px 0; }
            h3 { margin: 20px 0 10px 0; font-weight: bold; }
          </style>
        </head>
        <body>
          ${printWindow.document.createElement('div').innerHTML = content}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Tooltip title="Print PTW Record">
      <Button 
        icon={<PrinterOutlined />} 
        onClick={handlePrint}
        size="small"
        style={{ borderRadius: 4 }}
      />
    </Tooltip>
  );
}