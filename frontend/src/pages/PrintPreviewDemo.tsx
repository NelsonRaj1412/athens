import React from 'react';
import { Card, Row, Col, Typography } from 'antd';
import TBTPrintPreview from '../features/tbt/components/TBTPrintPreview';
import PTWPrintPreview from '../features/ptw/components/PTWPrintPreview';
import TrainingPrintPreview from '../features/training/components/TrainingPrintPreview';
import InspectionPrintPreview from '../features/inspection/components/InspectionPrintPreview';

const { Title, Text } = Typography;

const PrintPreviewDemo: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Document Print Preview Demo</Title>
      
      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card title="TBT" extra={<TBTPrintPreview />}>
            <Text>Tool Box Talk</Text>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card title="PTW" extra={<PTWPrintPreview />}>
            <Text>Permit to Work</Text>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card title="Training" extra={<TrainingPrintPreview />}>
            <Text>Training Records</Text>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card title="Inspection" extra={<InspectionPrintPreview />}>
            <Text>Inspection Forms</Text>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default PrintPreviewDemo;