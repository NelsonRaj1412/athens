import React from 'react';
import { Button } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { DOCUMENT_CONFIG } from '../../../constants/documentConfig';

interface BatteryUPSChecklistPrintPreviewProps {
  formData: any;
}

export default function BatteryUPSChecklistPrintPreview({ formData }: BatteryUPSChecklistPrintPreviewProps) {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const checklistDescriptions = [
      "Check for proper ventilation of battery room.",
      "Ensure the availability of gloves, apron, water",
      "Visual & physical inspection of all cells.",
      "Check the installation of battery rack as per approved shop drawing",
      "Before installation of battery on rack ensure that tightness of battery stand",
      "Check all cell no are marked and are visible",
      "Identification of polarity and interconnection of cells.",
      "Ensure the polarity and inter connection of battery terminal.",
      "Tightness of bus bar interconnection links of all the cells.",
      "Check the specific gravity of electrolyte before filling",
      "Check that the electrolyte is filled up to the required level",
      "Check the cell voltage",
      "Check that the Vaseline is applied on the terminals",
      "Check that the vents plugs are in position",
      "Record Cell voltage, temperature, and specific gravity",
      "All the mentioned activities under proper safety surveillance."
    ];

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Battery UPS Checklist - ${formData.client || 'Document'}</title>
          <style>
            body { margin: 0; font-family: Arial, sans-serif; font-size: 12px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .company-name { font-size: 18px; font-weight: bold; margin: 5px 0; }
            .document-title { font-size: 16px; font-weight: bold; margin: 10px 0; color: red; text-decoration: underline; }
            .info-section { margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; margin: 8px 0; }
            .checklist-table, .signature-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .checklist-table th, .checklist-table td, .signature-table th, .signature-table td { 
              border: 1px solid #000; padding: 6px; text-align: left; font-size: 11px;
            }
            .signature-section { margin: 30px 0; }
            h3 { margin: 20px 0 10px 0; font-weight: bold; font-size: 14px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">PROZEAL GREEN ENERGY PVT LTD</div>
            <div style="font-style: italic; font-size: 12px;">An initiative towards a cleaner tomorrow</div>
            <div class="document-title">BATTERY & UPS PRE-COMMISSIONING CHECKLIST</div>
            <div style="font-size: 11px;">Document No: ${DOCUMENT_CONFIG.INSPECTION.BATTERY_UPS.documentNumber}</div>
          </div>

          <div class="info-section">
            <div class="info-row">
              <span><strong>Client:</strong> ${formData.client || '_________________'}</span>
              <span><strong>Date:</strong> ${formData.date || '_________________'}</span>
            </div>
            <div class="info-row">
              <span><strong>Location:</strong> ${formData.location || '_________________'}</span>
              <span><strong>Battery Details:</strong> ${formData.battery_details || '_________________'}</span>
            </div>
            <div class="info-row">
              <span><strong>Battery Rating:</strong> ${formData.battery_rating || '_________________'}</span>
              <span><strong>Charging/Discharging Room Amp:</strong> ${formData.charging_discharging_room_amp || '_________________'}</span>
            </div>
          </div>

          <h3>General Checklist</h3>
          <table class="checklist-table">
            <thead>
              <tr>
                <th style="width: 60px">Sr. No.</th>
                <th>Description</th>
                <th style="width: 100px">Status</th>
              </tr>
            </thead>
            <tbody>
              ${checklistDescriptions.map((desc, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${desc}</td>
                  <td>${formData[`check_${i}_status`] || '______'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="info-row">
            <span><strong>Charging/Discharging Amount:</strong> ${formData.charging_discharging_amount || '_________________'}</span>
          </div>

          <h3>Battery Cell Test Data</h3>
          <table class="checklist-table">
            <thead>
              <tr>
                <th>Cell No.</th>
                <th>Specific Gravity</th>
                <th>Voltage (V)</th>
                <th>Temperature (°C)</th>
              </tr>
            </thead>
            <tbody>
              ${(formData.cell_test_data || Array.from({length: 6}, (_, i) => ({cellNo: i+1}))).map((cell, i) => `
                <tr>
                  <td>${cell.cellNo || i + 1}</td>
                  <td>${cell.gravity || '______'}</td>
                  <td>${cell.voltage || '______'}</td>
                  <td>${cell.temp || '______'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="signature-section">
            <table class="signature-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Signature</th>
                  <th>Name</th>
                  <th>Date</th>
                  <th>Company</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Tested By</td>
                  <td>${formData.tested_by_signature || ''}</td>
                  <td>${formData.tested_by_name || '________________'}</td>
                  <td>${formData.tested_by_date || '________________'}</td>
                  <td>${formData.tested_by_company || '________________'}</td>
                </tr>
                <tr>
                  <td>Witness 1</td>
                  <td>${formData.witness1_signature || ''}</td>
                  <td>${formData.witness1_name || '________________'}</td>
                  <td>${formData.witness1_date || '________________'}</td>
                  <td>${formData.witness1_company || '________________'}</td>
                </tr>
                <tr>
                  <td>Witness 2</td>
                  <td>${formData.witness2_signature || ''}</td>
                  <td>${formData.witness2_name || '________________'}</td>
                  <td>${formData.witness2_date || '________________'}</td>
                  <td>${formData.witness2_company || '________________'}</td>
                </tr>
                <tr>
                  <td>Witness 3</td>
                  <td>${formData.witness3_signature || ''}</td>
                  <td>${formData.witness3_name || '________________'}</td>
                  <td>${formData.witness3_date || '________________'}</td>
                  <td>${formData.witness3_company || '________________'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="signature-section">
            <table class="signature-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Signature</th>
                  <th>Name</th>
                  <th>Date</th>
                  <th>Company</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Signed By</td>
                  <td>${formData.signed_by_signature || ''}</td>
                  <td>${formData.signed_by_name || '________________'}</td>
                  <td>${formData.signed_by_date || '________________'}</td>
                  <td>${formData.signed_by_company || '________________'}</td>
                </tr>
                <tr>
                  <td>Witness 4</td>
                  <td>${formData.witness4_signature || ''}</td>
                  <td>${formData.witness4_name || '________________'}</td>
                  <td>${formData.witness4_date || '________________'}</td>
                  <td>${formData.witness4_company || '________________'}</td>
                </tr>
                <tr>
                  <td>Witness 5</td>
                  <td>${formData.witness5_signature || ''}</td>
                  <td>${formData.witness5_name || '________________'}</td>
                  <td>${formData.witness5_date || '________________'}</td>
                  <td>${formData.witness5_company || '________________'}</td>
                </tr>
                <tr>
                  <td>Witness 6</td>
                  <td>${formData.witness6_signature || ''}</td>
                  <td>${formData.witness6_name || '________________'}</td>
                  <td>${formData.witness6_date || '________________'}</td>
                  <td>${formData.witness6_company || '________________'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Button icon={<PrinterOutlined />} onClick={handlePrint}>
      Print Preview
    </Button>
  );
}