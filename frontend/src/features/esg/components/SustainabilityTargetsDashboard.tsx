import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Progress, Table, Tag, Button, Modal, Form, Input, Select, DatePicker, InputNumber } from 'antd';
import { 
  TrophyOutlined, 
  RiseOutlined, 
  FallOutlined,
  GlobalOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import PageLayout from '../../../common/components/PageLayout';
import { 
  getSustainabilityTargets, 
  getSustainabilityProgress,
  createSustainabilityTarget,
  updateSustainabilityTarget,
  deleteSustainabilityTarget
} from '../services/esgAPI';
import { SustainabilityTarget } from '../types';

const { Option } = Select;
const { TextArea } = Input;

const SustainabilityTargetsDashboard: React.FC = () => {
  const [targets, setTargets] = useState<SustainabilityTarget[]>([]);
  const [progressData, setProgressData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTarget, setEditingTarget] = useState<SustainabilityTarget | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [targetsRes, progressRes] = await Promise.allSettled([
        getSustainabilityTargets(),
        getSustainabilityProgress()
      ]);

      if (targetsRes.status === 'fulfilled') {
        setTargets(targetsRes.value.data.results || targetsRes.value.data || []);
      }

      if (progressRes.status === 'fulfilled') {
        setProgressData(progressRes.value.data);
      }
    } catch (error) {
      console.error('Error fetching sustainability data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = () => {
    setEditingTarget(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (target: SustainabilityTarget) => {
    setEditingTarget(target);
    form.setFieldsValue({
      ...target,
      baseline_year: dayjs().year(target.baseline_year),
      target_year: dayjs().year(target.target_year),
    });
    setModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      const targetData = {
        ...values,
        baseline_year: values.baseline_year.year(),
        target_year: values.target_year.year(),
        sdg_alignment: values.sdg_alignment || [],
      };

      if (editingTarget) {
        await updateSustainabilityTarget(editingTarget.id!, targetData);
      } else {
        await createSustainabilityTarget(targetData);
      }

      setModalVisible(false);
      fetchData();
    } catch (error) {
      console.error('Error saving target:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteSustainabilityTarget(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting target:', error);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      carbon: '#52c41a',
      energy: '#fa8c16',
      water: '#1890ff',
      waste: '#722ed1',
      biodiversity: '#13c2c2',
      renewable: '#faad14'
    };
    return colors[category] || '#d9d9d9';
  };

  const getProgressColor = (progress: number, onTrack: boolean) => {
    if (!onTrack) return '#f5222d';
    if (progress >= 80) return '#52c41a';
    if (progress >= 60) return '#faad14';
    return '#fa8c16';
  };

  const columns: ColumnsType<SustainabilityTarget> = [
    {
      title: 'Target Name',
      dataIndex: 'target_name',
      key: 'target_name',
      render: (name: string, record: SustainabilityTarget) => (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{name}</div>
          <Tag color={getCategoryColor(record.category)}>
            {record.category.toUpperCase()}
          </Tag>
        </div>
      ),
    },
    {
      title: 'Progress',
      dataIndex: 'progress_percentage',
      key: 'progress_percentage',
      render: (progress: number, record: SustainabilityTarget) => (
        <div>
          <Progress
            percent={progress || 0}
            strokeColor={getProgressColor(progress || 0, record.on_track || false)}
            size="small"
            format={(percent) => `${percent?.toFixed(1)}%`}
          />
          <div style={{ fontSize: '12px', marginTop: 4 }}>
            {record.on_track ? (
              <Tag color="success" icon={<CheckCircleOutlined />}>On Track</Tag>
            ) : (
              <Tag color="error" icon={<ExclamationCircleOutlined />}>Behind</Tag>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Current vs Target',
      key: 'values',
      render: (_: any, record: SustainabilityTarget) => (
        <div>
          <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
            {record.current_value?.toFixed(2) || 0} / {record.target_value.toFixed(2)} {record.unit_of_measure}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Baseline: {record.baseline_value.toFixed(2)} ({record.baseline_year})
          </div>
        </div>
      ),
    },
    {
      title: 'Timeline',
      key: 'timeline',
      render: (_: any, record: SustainabilityTarget) => {
        const currentYear = dayjs().year();
        const totalYears = record.target_year - record.baseline_year;
        const elapsedYears = currentYear - record.baseline_year;
        const timeProgress = Math.min((elapsedYears / totalYears) * 100, 100);
        
        return (
          <div>
            <div style={{ fontSize: '12px', marginBottom: 4 }}>
              {record.baseline_year} → {record.target_year}
            </div>
            <Progress
              percent={timeProgress}
              strokeColor="#1890ff"
              size="small"
              format={() => `${currentYear}`}
            />
          </div>
        );
      },
    },
    {
      title: 'SDG Alignment',
      dataIndex: 'sdg_alignment',
      key: 'sdg_alignment',
      render: (sdgs: string[]) => (
        <div>
          {sdgs && sdgs.length > 0 ? (
            sdgs.slice(0, 3).map(sdg => (
              <Tag key={sdg} color="blue">SDG {sdg}</Tag>
            ))
          ) : (
            <span style={{ color: '#999' }}>Not aligned</span>
          )}
          {sdgs && sdgs.length > 3 && (
            <Tag>+{sdgs.length - 3} more</Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: SustainabilityTarget) => (
        <div>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id!)}
            size="small"
          />
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      title="Sustainability Targets"
      subtitle="Track progress towards sustainability goals and UN SDG alignment"
      breadcrumbs={[
        { title: 'ESG Management' },
        { title: 'Sustainability Targets' }
      ]}
      actions={[
        <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          Add Target
        </Button>
      ]}
    >
      {/* Progress Overview */}
      {progressData && (
        <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={6}>
            <Card className="sustainability-summary-card">
              <Statistic
                title="Total Targets"
                value={progressData.total_targets}
                prefix={<TrophyOutlined style={{ color: '#1890ff' }} />}
                valueStyle={{ color: '#1890ff', fontSize: '2rem', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={6}>
            <Card className="sustainability-summary-card">
              <Statistic
                title="On Track"
                value={progressData.on_track_targets}
                suffix={`/${progressData.total_targets}`}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a', fontSize: '2rem', fontWeight: 'bold' }}
              />
              <Progress 
                percent={progressData.total_targets > 0 ? (progressData.on_track_targets / progressData.total_targets) * 100 : 0}
                strokeColor="#52c41a" 
                showInfo={false} 
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={6}>
            <Card className="sustainability-summary-card">
              <Statistic
                title="SDG Aligned"
                value={progressData.sdg_aligned}
                suffix={`/${progressData.total_targets}`}
                prefix={<GlobalOutlined style={{ color: '#722ed1' }} />}
                valueStyle={{ color: '#722ed1', fontSize: '2rem', fontWeight: 'bold' }}
              />
              <Progress 
                percent={progressData.total_targets > 0 ? (progressData.sdg_aligned / progressData.total_targets) * 100 : 0}
                strokeColor="#722ed1" 
                showInfo={false} 
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={6}>
            <Card className="sustainability-summary-card">
              <Statistic
                title="Paris Aligned"
                value={progressData.paris_aligned}
                suffix={`/${progressData.total_targets}`}
                prefix={<RiseOutlined style={{ color: '#fa8c16' }} />}
                valueStyle={{ color: '#fa8c16', fontSize: '2rem', fontWeight: 'bold' }}
              />
              <Progress 
                percent={progressData.total_targets > 0 ? (progressData.paris_aligned / progressData.total_targets) * 100 : 0}
                strokeColor="#fa8c16" 
                showInfo={false} 
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Category Progress */}
      {progressData?.category_progress && (
        <Card 
          title="Progress by Category" 
          style={{ marginBottom: 24 }}
          size="small"
        >
          <Row gutter={[16, 16]}>
            {progressData.category_progress.map((category: any, index: number) => (
              <Col xs={24} sm={12} md={8} lg={4} key={index}>
                <Card size="small" className="category-progress-card">
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: 'bold', 
                      color: getCategoryColor(category.category),
                      marginBottom: 8 
                    }}>
                      {category.category.toUpperCase()}
                    </div>
                    <Progress
                      type="circle"
                      percent={category.avg_progress || 0}
                      strokeColor={getCategoryColor(category.category)}
                      width={60}
                      format={(percent) => `${percent?.toFixed(0)}%`}
                    />
                    <div style={{ fontSize: '12px', color: '#666', marginTop: 8 }}>
                      {category.on_track_count}/{category.total_count} on track
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Targets Table */}
      <Card title="Sustainability Targets">
        <Table
          columns={columns}
          dataSource={targets}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingTarget ? 'Edit Sustainability Target' : 'Create Sustainability Target'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="target_name"
                label="Target Name"
                rules={[{ required: true, message: 'Please enter target name' }]}
              >
                <Input placeholder="e.g., Reduce Carbon Emissions by 50%" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="category"
                label="Category"
                rules={[{ required: true, message: 'Please select category' }]}
              >
                <Select placeholder="Select category">
                  <Option value="carbon">Carbon Reduction</Option>
                  <Option value="energy">Energy Efficiency</Option>
                  <Option value="water">Water Conservation</Option>
                  <Option value="waste">Waste Reduction</Option>
                  <Option value="biodiversity">Biodiversity Protection</Option>
                  <Option value="renewable">Renewable Energy</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <TextArea rows={3} placeholder="Detailed description of the sustainability target" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="baseline_value"
                label="Baseline Value"
                rules={[{ required: true, message: 'Please enter baseline value' }]}
              >
                <InputNumber style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="target_value"
                label="Target Value"
                rules={[{ required: true, message: 'Please enter target value' }]}
              >
                <InputNumber style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="unit_of_measure"
                label="Unit of Measure"
                rules={[{ required: true, message: 'Please enter unit' }]}
              >
                <Input placeholder="e.g., tCO2, kWh, liters" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="baseline_year"
                label="Baseline Year"
                rules={[{ required: true, message: 'Please select baseline year' }]}
              >
                <DatePicker picker="year" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="target_year"
                label="Target Year"
                rules={[{ required: true, message: 'Please select target year' }]}
              >
                <DatePicker picker="year" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="sdg_alignment"
                label="UN SDG Alignment"
              >
                <Select mode="multiple" placeholder="Select SDG goals">
                  {Array.from({ length: 17 }, (_, i) => i + 1).map(num => (
                    <Option key={num} value={num.toString()}>SDG {num}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="paris_agreement_aligned"
                label="Paris Agreement Aligned"
                valuePropName="checked"
              >
                <Select>
                  <Option value={true}>Yes</Option>
                  <Option value={false}>No</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Button type="primary" htmlType="submit" style={{ marginRight: 8 }}>
              {editingTarget ? 'Update Target' : 'Create Target'}
            </Button>
            <Button onClick={() => setModalVisible(false)}>
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .sustainability-summary-card {
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          transition: transform 0.2s ease;
        }
        .sustainability-summary-card:hover {
          transform: translateY(-2px);
        }
        .category-progress-card {
          border-radius: 8px;
          border: 1px solid #f0f0f0;
        }
      `}</style>
    </PageLayout>
  );
};

export default SustainabilityTargetsDashboard;