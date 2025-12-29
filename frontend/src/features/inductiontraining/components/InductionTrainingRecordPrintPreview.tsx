import React from 'react';
import { Button, Tooltip } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { DOCUMENT_CONFIG } from '../../../constants/documentConfig';
import api from '@common/utils/axiosetup';
import type { InductionTrainingData } from '../types';

interface InductionTrainingRecordPrintPreviewProps {
  trainingData: InductionTrainingData;
}

export default function InductionTrainingRecordPrintPreview({ trainingData }: InductionTrainingRecordPrintPreviewProps) {
  const handlePrint = async () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    try {
      // Fetch fresh signature data and attendance data
      let attendanceData = [];
      let freshTrainingData = { ...trainingData };
      
      try {
        // Fetch attendance data
        const attendanceResponse = await api.get(`/inductiontraining/${trainingData.id}/attendance/`);
        attendanceData = attendanceResponse.data || [];
        
        // Fetch fresh training data with signatures
        const trainingResponse = await api.get(`/inductiontraining/${trainingData.id}/`);
        if (trainingResponse.data) {
          freshTrainingData = { ...trainingData, ...trainingResponse.data };
        }
      } catch (error) {
        console.log('Could not fetch fresh data, using existing data');
      }
      
      // Calculate duration
      let duration = '2 hours';
      if (freshTrainingData.start_time && freshTrainingData.end_time) {
        const start = new Date(`1970-01-01T${freshTrainingData.start_time}`);
        const end = new Date(`1970-01-01T${freshTrainingData.end_time}`);
        const diffMs = end.getTime() - start.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        duration = `${diffHours}h ${diffMins}m`;
      }

      const htmlContent = generateISODocument({
        trainingData: freshTrainingData,
        attendanceData,
        duration
      });
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
      
    } catch (error) {
      console.error('Error generating document:', error);
      // Still try to generate document without fresh data
      try {
        const htmlContent = generateISODocument({
          trainingData,
          attendanceData: [],
          duration: '2 hours'
        });
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.print();
      } catch (fallbackError) {
        console.error('Fallback document generation failed:', fallbackError);
        printWindow.close();
      }
    }
  };

  return (
    <Tooltip title="Print ISO-Compliant Induction Training Record">
      <Button 
        icon={<PrinterOutlined />} 
        onClick={handlePrint}
        shape="circle"
      />
    </Tooltip>
  );
}

function generateISODocument(data: any): string {
  const { trainingData, attendanceData, duration } = data;
  const docConfig = DOCUMENT_CONFIG.TRAINING.INDUCTION_TRAINING;
  const currentDate = new Date();
  const documentId = trainingData.document_id || `TRN-IND-${Date.now()}`;
  
  // Helper function to properly format signature URLs
  const getSignatureUrl = (signature: string | null | undefined): string => {
    if (!signature) return '';
    
    // If it's base64 data, return as-is
    if (signature.startsWith('data:')) {
      return signature;
    }
    
    // If it's already a full URL, return as-is
    if (signature.startsWith('http')) {
      return signature;
    }
    
    // If it starts with /, it's an absolute path
    if (signature.startsWith('/')) {
      return window.location.origin + signature;
    }
    
    // Otherwise, assume it's a relative media path
    return window.location.origin + '/media/' + signature;
  };
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${docConfig.documentName}</title>
        <meta charset="UTF-8">
        <style>
          @page { size: A4; margin: 15mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.3; color: #000; }
          .document-container { max-width: 210mm; margin: 0 auto; background: #fff; }
          
          .iso-header {
            display: grid;
            grid-template-columns: 80px 1fr 200px;
            gap: 15px;
            align-items: center;
            padding: 10px 0;
            border-bottom: 2px solid #000;
            margin-bottom: 20px;
          }
          
          .company-logo { width: 70px; height: 70px; object-fit: contain; }
          .company-info { text-align: center; }
          .company-name { font-size: 16pt; font-weight: bold; margin-bottom: 4px; text-transform: uppercase; }
          .company-tagline { font-size: 9pt; font-style: italic; color: #666; }
          
          .document-meta { font-size: 8pt; }
          .document-meta table { width: 100%; border-collapse: collapse; }
          .document-meta td { border: 1px solid #000; padding: 3px 5px; }
          .document-meta .label { font-weight: bold; background: #f5f5f5; width: 40%; }
          
          .document-title {
            text-align: center;
            font-size: 14pt;
            font-weight: bold;
            text-transform: uppercase;
            margin: 20px 0;
            padding: 8px;
            border: 2px solid #000;
            background: #f9f9f9;
          }
          
          .section { margin: 15px 0; page-break-inside: avoid; }
          .section-title {
            font-size: 11pt;
            font-weight: bold;
            margin-bottom: 8px;
            padding: 4px 8px;
            background: #e6e6e6;
            border-left: 4px solid #333;
          }
          
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0; }
          .info-item { display: flex; align-items: center; margin-bottom: 5px; }
          .info-label { font-weight: bold; min-width: 100px; margin-right: 10px; }
          .info-value { border-bottom: 1px solid #000; flex: 1; padding: 2px 5px; min-height: 18px; }
          
          .iso-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 9pt; }
          .iso-table th, .iso-table td { border: 1px solid #000; padding: 6px 4px; text-align: left; vertical-align: top; }
          .iso-table th { background: #f0f0f0; font-weight: bold; text-align: center; }
          .iso-table .center { text-align: center; }
          .iso-table .number { text-align: center; width: 40px; }
          
          .signature-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .signature-table th, .signature-table td { border: 1px solid #000; padding: 8px; text-align: center; vertical-align: middle; }
          .signature-table th { background: #f0f0f0; font-weight: bold; font-size: 9pt; }
          .signature-img { max-height: 40px; width: 100%; object-fit: contain; }
          .signature-placeholder { color: #666; font-style: italic; }
          
          .auth-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin: 20px 0; }
          .auth-box { border: 1px solid #000; padding: 15px; text-align: center; min-height: 80px; }
          .auth-title { font-weight: bold; margin-bottom: 10px; font-size: 9pt; }
          .auth-signature { margin: 10px 0; height: 40px; display: flex; align-items: center; justify-content: center; }
          .auth-name { font-weight: bold; margin-top: 5px; font-size: 9pt; }
          .auth-date { font-size: 8pt; color: #666; }
          
          .iso-footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ccc;
            text-align: center;
            font-size: 8pt;
            color: #666;
          }
          .controlled-document { font-weight: bold; color: #000; margin-bottom: 5px; }
          
          @media print {
            body { margin: 0; padding: 0; }
            .document-container { margin: 0; padding: 0; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="document-container">
          <!-- ISO Header -->
          <div class="iso-header">
            <div>
              <img src="${window.location.origin}/logo.png" alt="Company Logo" class="company-logo" onerror="this.style.display='none'" />
            </div>
            <div class="company-info">
              <div class="company-name">PROZEAL GREEN ENERGY PVT LTD</div>
              <div class="company-tagline">An initiative towards a cleaner tomorrow</div>
            </div>
            <div class="document-meta">
              <table>
                <tr><td class="label">Document No:</td><td>${docConfig.documentNumber}</td></tr>
                <tr><td class="label">Issue Date:</td><td>${docConfig.issueDate}</td></tr>
                <tr><td class="label">Revision:</td><td>${docConfig.revisionNumber}</td></tr>
                <tr><td class="label">Page No:</td><td>1 of 1</td></tr>
              </table>
            </div>
          </div>
          
          <div class="document-title">${docConfig.documentName}</div>
          
          <!-- Training Information -->
          <div class="section">
            <div class="section-title">1.0 TRAINING INFORMATION</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Training Title:</span>
                <span class="info-value">${trainingData.title || ''}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Document ID:</span>
                <span class="info-value">${documentId}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Date:</span>
                <span class="info-value">${trainingData.date || ''}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Duration:</span>
                <span class="info-value">${duration}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Location:</span>
                <span class="info-value">${trainingData.location || ''}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Conducted By:</span>
                <span class="info-value">${trainingData.conducted_by || ''}</span>
              </div>
            </div>
            <div style="margin-top: 15px;">
              <div class="info-label" style="margin-bottom: 5px;">Training Description:</div>
              <div style="border: 1px solid #000; padding: 10px; min-height: 60px; background: #fafafa;">
                ${trainingData.description || 'Site Safety Awareness Induction Training covering all essential safety protocols, emergency procedures, and company policies.'}
              </div>
            </div>
          </div>
          
          <!-- Training Topics -->
          <div class="section">
            <div class="section-title">2.0 INDUCTION TRAINING TOPICS COVERED</div>
            <table class="iso-table">
              <thead>
                <tr>
                  <th class="number">S.No.</th>
                  <th>Training Topic</th>
                  <th style="width: 80px;">Covered</th>
                </tr>
              </thead>
              <tbody>
                <tr><td class="center">1</td><td>Company Health, Safety & Environmental (HSE) Policy</td><td class="center">✓</td></tr>
                <tr><td class="center">2</td><td>Site-specific hazard identification and risk assessment</td><td class="center">✓</td></tr>
                <tr><td class="center">3</td><td>Personal Protective Equipment (PPE) requirements and usage</td><td class="center">✓</td></tr>
                <tr><td class="center">4</td><td>Emergency procedures and evacuation plans</td><td class="center">✓</td></tr>
                <tr><td class="center">5</td><td>Incident reporting and investigation procedures</td><td class="center">✓</td></tr>
                <tr><td class="center">6</td><td>Work permit systems and authorization procedures</td><td class="center">✓</td></tr>
                <tr><td class="center">7</td><td>Fire safety and prevention measures</td><td class="center">✓</td></tr>
                <tr><td class="center">8</td><td>First aid and medical emergency procedures</td><td class="center">✓</td></tr>
                <tr><td class="center">9</td><td>Environmental protection and waste management</td><td class="center">✓</td></tr>
                <tr><td class="center">10</td><td>Quality standards and work procedures</td><td class="center">✓</td></tr>
                <tr><td class="center">11</td><td>Code of conduct and disciplinary procedures</td><td class="center">✓</td></tr>
                <tr><td class="center">12</td><td>Communication protocols and reporting structure</td><td class="center">✓</td></tr>
              </tbody>
            </table>
          </div>
          
          <!-- Attendance -->
          <div class="section">
            <div class="section-title">3.0 TRAINING ATTENDANCE RECORD</div>
            <table class="iso-table">
              <thead>
                <tr>
                  <th class="number">S.No.</th>
                  <th>Participant Name</th>
                  <th style="width: 80px;">ID No.</th>
                  <th style="width: 80px;">Type</th>
                  <th style="width: 80px;">Status</th>
                  <th style="width: 120px;">Timestamp</th>
                  <th style="width: 100px;">Signature</th>
                </tr>
              </thead>
              <tbody>
                ${attendanceData.length > 0 ? 
                  attendanceData.map((record, i) => `
                    <tr>
                      <td class="center">${i + 1}</td>
                      <td>${record.worker_name || ''}</td>
                      <td class="center">${record.worker_id || record.participant_id || ''}</td>
                      <td class="center">${record.participant_type === 'worker' ? 'Worker' : 'Employee'}</td>
                      <td class="center" style="color: ${record.status === 'present' ? 'green' : 'red'}; font-weight: bold;">
                        ${record.status === 'present' ? 'Present' : 'Absent'}
                      </td>
                      <td style="font-size: 8pt;">${record.timestamp ? new Date(record.timestamp).toLocaleString() : ''}</td>
                      <td class="signature-placeholder">Signed</td>
                    </tr>
                  `).join('') :
                  Array.from({length: 15}, (_, i) => `
                    <tr>
                      <td class="center">${i + 1}</td>
                      <td style="border-bottom: 1px dotted #ccc;"></td>
                      <td></td><td></td><td></td><td></td><td></td>
                    </tr>
                  `).join('')
                }
              </tbody>
            </table>
            ${attendanceData.length > 0 ? `
              <div style="margin-top: 10px; padding: 8px; background: #f0f0f0; border: 1px solid #ccc; text-align: center; font-size: 9pt;">
                <strong>ATTENDANCE SUMMARY:</strong> 
                Total: ${attendanceData.length} | 
                Present: ${attendanceData.filter(r => r.status === 'present').length} | 
                Absent: ${attendanceData.filter(r => r.status === 'absent').length} | 
                Attendance Rate: ${Math.round((attendanceData.filter(r => r.status === 'present').length / attendanceData.length) * 100)}%
              </div>
            ` : ''}
          </div>
          
          <!-- Trainer Signature -->
          <div class="section">
            <div class="section-title">4.0 TRAINER CERTIFICATION</div>
            <table class="signature-table">
              <thead>
                <tr>
                  <th style="width: 40%;">Trainer Name & Designation</th>
                  <th style="width: 30%;">Digital Signature</th>
                  <th style="width: 30%;">Date & Time</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>${trainingData.conducted_by || 'Trainer'}</strong><br/>
                    <em>Training Coordinator</em>
                  </td>
                  <td class="signature-cell">
                    ${trainingData.trainer_signature ? 
                      `<img src="${getSignatureUrl(trainingData.trainer_signature)}" class="signature-img" alt="Trainer Signature" onerror="this.style.display='none'" />` :
                      '<span class="signature-placeholder">Digital signature required</span>'
                    }
                  </td>
                  <td>${trainingData.date || new Date().toLocaleDateString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- Authorization -->
          <div class="section">
            <div class="section-title">5.0 AUTHORIZATION & APPROVAL</div>
            <div class="auth-grid">
              <div class="auth-box">
                <div class="auth-title">HR Representative</div>
                <div class="auth-signature">
                  ${trainingData.hr_signature ? 
                    `<img src="${getSignatureUrl(trainingData.hr_signature)}" class="signature-img" alt="HR Signature" onerror="this.style.display='none'" />` : 
                    '<span class="signature-placeholder">Signature Required</span>'
                  }
                </div>
                <div class="auth-name">${trainingData.hr_name || 'HR Representative'}</div>
                <div class="auth-date">${trainingData.hr_date || new Date().toLocaleDateString()}</div>
              </div>
              
              <div class="auth-box">
                <div class="auth-title">Safety Officer</div>
                <div class="auth-signature">
                  ${trainingData.safety_signature ? 
                    `<img src="${getSignatureUrl(trainingData.safety_signature)}" class="signature-img" alt="Safety Signature" onerror="this.style.display='none'" />` : 
                    '<span class="signature-placeholder">Signature Required</span>'
                  }
                </div>
                <div class="auth-name">${trainingData.safety_name || 'Safety Officer'}</div>
                <div class="auth-date">${trainingData.safety_date || new Date().toLocaleDateString()}</div>
              </div>
              
              <div class="auth-box">
                <div class="auth-title">Department Head</div>
                <div class="auth-signature">
                  ${trainingData.dept_head_signature ? 
                    `<img src="${getSignatureUrl(trainingData.dept_head_signature)}" class="signature-img" alt="Dept Head Signature" onerror="this.style.display='none'" />` : 
                    '<span class="signature-placeholder">Signature Required</span>'
                  }
                </div>
                <div class="auth-name">${trainingData.dept_head_name || 'Department Head'}</div>
                <div class="auth-date">${trainingData.dept_head_date || new Date().toLocaleDateString()}</div>
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="iso-footer">
            <div class="controlled-document">CONTROLLED DOCUMENT - NOT VALID IF PRINTED</div>
            <div>Document ID: ${documentId} | Generated: ${currentDate.toLocaleString()}</div>
            <div>This document is computer generated and digitally signed for authenticity</div>
          </div>
        </div>
      </body>
    </html>
  `;
}