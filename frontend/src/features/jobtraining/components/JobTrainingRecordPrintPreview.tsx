import React from 'react';
import { Button, Tooltip } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import PrintDocumentTemplate from '../../../components/PrintDocumentTemplate';
import { DOCUMENT_CONFIG } from '../../../constants/documentConfig';
import type { JobTrainingData } from '../types';

interface JobTrainingRecordPrintPreviewProps {
  trainingData: JobTrainingData;
}

export default function JobTrainingRecordPrintPreview({ trainingData }: JobTrainingRecordPrintPreviewProps) {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = (
      <PrintDocumentTemplate
        documentType="Job Specific Training"
        documentNumber={DOCUMENT_CONFIG.TRAINING.JOB_SPECIFIC_TRAINING.documentNumber}
        title="JOB SPECIFIC TRAINING RECORD"
      >
        <div className="info-section">
          <div className="info-row">
            <span><strong>Title:</strong> {trainingData.title || '_________________'}</span>
            <span><strong>Date:</strong> {trainingData.date || '_________________'}</span>
          </div>
          <div className="info-row">
            <span><strong>Location:</strong> {trainingData.location || '_________________'}</span>
            <span><strong>Conducted By:</strong> {trainingData.conducted_by || '_________________'}</span>
          </div>
          <div className="info-row">
            <span><strong>Status:</strong> {trainingData.status || '_________________'}</span>
          </div>
        </div>

        <h3>Training Description</h3>
        <div className="description-section">
          {trainingData.description || 'No description provided'}
        </div>

        <h3>Training Objectives</h3>
        <div className="description-section">
          • Understand job-specific safety requirements<br/>
          • Learn proper use of tools and equipment<br/>
          • Follow standard operating procedures<br/>
          • Identify and mitigate job-related hazards
        </div>

        <div className="signature-section">
          <table className="signature-table">
            <thead>
              <tr>
                <th>Trainer</th>
                <th>Signature</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{trainingData.conducted_by || '________________'}</td>
                <td>________________</td>
                <td>{trainingData.date || '________________'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Training Attendance Record</h3>
        <table className="checklist-table">
          <thead>
            <tr>
              <th>S.No.</th>
              <th>Employee Name</th>
              <th>Employee ID</th>
              <th>Designation</th>
              <th>Department</th>
              <th>Signature</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({length: 12}, (_, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>________________</td>
                <td>________________</td>
                <td>________________</td>
                <td>________________</td>
                <td>________________</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>Training Completion Certificate</h3>
        <div className="description-section">
          This is to certify that the above-mentioned employees have successfully completed the job-specific training program and are competent to perform the assigned tasks safely and efficiently.
        </div>
      </PrintDocumentTemplate>
    );

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Job Training - ${trainingData.title || 'Document'}</title>
          <link rel="stylesheet" href="/src/components/PrintDocumentTemplate.css">
          <style>
            body { margin: 0; font-family: Arial, sans-serif; }
            .info-section { margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
            .description-section { margin: 15px 0; padding: 10px; border: 1px solid #ccc; min-height: 80px; }
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
    <Tooltip title="Print Training Record">
      <Button 
        icon={<PrinterOutlined />} 
        onClick={handlePrint}
        size="small"
        type="text"
      />
    </Tooltip>
  );
}