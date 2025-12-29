import React from 'react';
import { Card, Row, Col, Table, Typography } from 'antd';

const { Title, Text } = Typography;

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

interface DocumentTemplateProps {
  documentInfo: DocumentInfo;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  companyLogo?: string;
  companyName?: string;
  companyTagline?: string;
  headerColor?: string;
}

const DocumentTemplate: React.FC<DocumentTemplateProps> = ({
  documentInfo,
  title,
  subtitle,
  children,
  companyLogo = "/logo.png",
  companyName = "PROZEAL GREEN ENERGY PVT LTD",
  companyTagline = "An initiative towards a cleaner tomorrow",
  headerColor = "#1890ff"
}) => {
  const documentInfoData = [
    ["Document Name:", documentInfo.documentName],
    ["Document No.:", documentInfo.documentNumber],
    ["Format No.:", documentInfo.formatNumber],
    ["Page No.:", documentInfo.pageNumber],
    ["Issue No.:", documentInfo.issueNumber],
    ["Revision No.:", documentInfo.revisionNumber],
    ["Issue Date:", documentInfo.issueDate],
    ["Revision Date:", documentInfo.revisionDate]
  ];

  if (documentInfo.approvedBy) {
    documentInfoData.push(["Approved By:", documentInfo.approvedBy]);
  }
  if (documentInfo.reviewedBy) {
    documentInfoData.push(["Reviewed By:", documentInfo.reviewedBy]);
  }

  return (
    <Card className="shadow-lg" style={{ minHeight: '100vh' }}>
      {/* Document Header */}
      <div style={{ 
        borderBottom: `3px solid ${headerColor}`, 
        paddingBottom: '16px', 
        marginBottom: '24px' 
      }}>
        <Row align="middle" gutter={[16, 16]}>
          {/* Company Logo */}
          <Col xs={24} sm={6} className="text-center">
            <img 
              src={companyLogo} 
              alt="Company Logo" 
              style={{ maxHeight: '80px', maxWidth: '100%' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </Col>

          {/* Company Info */}
          <Col xs={24} sm={12} className="text-center">
            <Title level={3} style={{ margin: 0, color: headerColor }}>
              {companyName}
            </Title>
            <Text italic style={{ fontSize: '14px', color: '#666' }}>
              {companyTagline}
            </Text>
            <div style={{ marginTop: '8px' }}>
              <Title level={4} style={{ margin: 0, color: '#333' }}>
                {title}
              </Title>
              {subtitle && (
                <Text style={{ fontSize: '12px', color: '#888' }}>
                  {subtitle}
                </Text>
              )}
            </div>
          </Col>

          {/* Document Information Table */}
          <Col xs={24} sm={6}>
            <Table
              dataSource={documentInfoData.map(([label, value], index) => ({ 
                key: index, 
                label, 
                value 
              }))}
              columns={[
                { 
                  title: "", 
                  dataIndex: "label", 
                  key: "label",
                  width: '60%',
                  render: (text) => <Text strong style={{ fontSize: '11px' }}>{text}</Text>
                },
                { 
                  title: "", 
                  dataIndex: "value", 
                  key: "value",
                  width: '40%',
                  render: (text) => <Text style={{ fontSize: '11px' }}>{text}</Text>
                }
              ]}
              pagination={false}
              size="small"
              bordered
              showHeader={false}
            />
          </Col>
        </Row>
      </div>

      {/* Document Content */}
      <div style={{ minHeight: 'calc(100vh - 200px)' }}>
        {children}
      </div>

      {/* Document Footer */}
      <div style={{ 
        borderTop: `1px solid #d9d9d9`, 
        paddingTop: '16px', 
        marginTop: '24px',
        textAlign: 'center'
      }}>
        <Text style={{ fontSize: '10px', color: '#999' }}>
          This document is confidential and proprietary to {companyName}
        </Text>
      </div>
    </Card>
  );
};

export default DocumentTemplate;