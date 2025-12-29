import React from 'react';
import { Button, Tooltip } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import PrintDocumentTemplate from '../../../components/PrintDocumentTemplate';
import { DOCUMENT_CONFIG } from '../../../constants/documentConfig';
import type { ToolboxTalkData } from '../types';

interface TBTRecordPrintPreviewProps {
  tbtData: ToolboxTalkData;
}

export default function TBTRecordPrintPreview({ tbtData }: TBTRecordPrintPreviewProps) {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = (
      <PrintDocumentTemplate
        documentType="Tool Box Talk"
        documentNumber={DOCUMENT_CONFIG.TBT.GENERAL_SAFETY.documentNumber}
        title="TOOL BOX TALK RECORD"
      >
        <div className="info-section">
          <div className="info-row">
            <span><strong>Title:</strong> {tbtData.title || '_________________'}</span>
            <span><strong>Date:</strong> {tbtData.date || '_________________'}</span>
          </div>
          <div className="info-row">
            <span><strong>Location:</strong> {tbtData.location || '_________________'}</span>
            <span><strong>Conducted By:</strong> {tbtData.conducted_by || '_________________'}</span>
          </div>
          <div className="info-row">
            <span><strong>Status:</strong> {tbtData.status || '_________________'}</span>
          </div>
        </div>

        <h3>Description</h3>
        <div className="description-section">
          {tbtData.description || 'No description provided'}
        </div>

        <div className="signature-section">
          <table className="signature-table">
            <thead>
              <tr>
                <th>Conducted By</th>
                <th>Signature</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{tbtData.conducted_by || '________________'}</td>
                <td>________________</td>
                <td>{tbtData.date || '________________'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Attendance Record</h3>
        <table className="checklist-table">
          <thead>
            <tr>
              <th>S.No.</th>
              <th>Name</th>
              <th>Designation</th>
              <th>Signature</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({length: 10}, (_, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
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
          <title>TBT Record - ${tbtData.title || 'Document'}</title>
          <link rel="stylesheet" href="/src/components/PrintDocumentTemplate.css">
          <style>
            body { margin: 0; font-family: Arial, sans-serif; }
            .info-section { margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
            .description-section { margin: 15px 0; padding: 10px; border: 1px solid #ccc; min-height: 100px; }
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
    <Tooltip title="Print TBT Record">
      <Button 
        icon={<PrinterOutlined />} 
        onClick={handlePrint}
        size="small"
        style={{ borderRadius: 4 }}
      />
    </Tooltip>
  );
}