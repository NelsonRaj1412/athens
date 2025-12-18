import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Space, Badge, message, Modal, Form, Input, Select } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, EyeOutlined, ClockCircleOutlined } from '@ant-design/icons';
import useAuthStore from '@common/store/authStore';
import ptwAPI from '../../../services/ptwAPI';
import type { ColumnsType } from 'antd/es/table';

const { TextArea } = Input;
const { Option } = Select;

interface WorkflowTask {
  step_id: number;
  step_type: string;
  step_name: string;
  permit_id: number;
  permit_number: string;
  permit_type: string;
  location: string;
  created_by: string;
  created_at: string;
  escalation_time: number;
  order: number;
}

const WorkflowTaskDashboard: React.FC = () => {
  const { username, usertype, userId } = useAuthStore();
  const user = { username, usertype, userId, full_name: username };
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<WorkflowTask | null>(null);
  const [actionType, setActionType] = useState<'verify' | 'approve'>('verify');
  const [availableApprovers, setAvailableApprovers] = useState<any[]>([]);
  
  const [form] = Form.useForm();

  useEffect(() => {
    fetchMyTasks();
    // Set up polling for real-time updates
    const interval = setInterval(fetchMyTasks, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchMyTasks = async () => {
    setLoading(true);
    try {
      const response = await ptwAPI.getMyWorkflowTasks();
      setTasks(response.data.tasks);
    } catch (error) {
      message.error('Failed to fetch workflow tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableApprovers = async () => {
    try {
      const response = await ptwAPI.getAvailableApprovers();
      setAvailableApprovers(response.data.approvers);
    } catch (error) {
    }
  };

  const handleTaskAction = (task: WorkflowTask, action: 'verify' | 'approve') => {
    setSelectedTask(task);
    setActionType(action);
    if (action === 'verify') {
      fetchAvailableApprovers();
    }
    setActionModalVisible(true);
  };

  const handleSubmitAction = async (values: any) => {
    if (!selectedTask) return;

    setLoading(true);
    try {
      const payload = {
        action: values.action,
        comments: values.comments || '',
        ...(actionType === 'verify' && values.approver_id && { approver_id: values.approver_id })
      };

      if (actionType === 'verify') {
        await ptwAPI.verifyPermit(selectedTask.permit_id, payload);
      } else {
        await ptwAPI.approvePermit(selectedTask.permit_id, payload);
      }

      message.success(`Permit ${values.action}d successfully`);
      setActionModalVisible(false);
      form.resetFields();
      fetchMyTasks();
    } catch (error: any) {
      message.error(error.response?.data?.error || `Failed to ${values.action} permit`);
    } finally {
      setLoading(false);
    }
  };

  const getTaskPriority = (task: WorkflowTask) => {
    const createdAt = new Date(task.created_at);
    const now = new Date();
    const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursElapsed >= task.escalation_time) {
      return { level: 'high', color: 'red', text: 'Overdue' };
    } else if (hoursElapsed >= task.escalation_time * 0.8) {
      return { level: 'medium', color: 'orange', text: 'Due Soon' };
    } else {
      return { level: 'low', color: 'green', text: 'On Time' };
    }
  };

  const getStepTypeColor = (stepType: string) => {
    switch (stepType) {
      case 'verification':
        return 'blue';
      case 'approval':
        return 'green';
      case 'selection':
        return 'orange';
      default:
        return 'default';
    }
  };

  const columns: ColumnsType<WorkflowTask> = [
    {
      title: 'Priority',
      key: 'priority',
      width: 100,
      render: (_: any, record) => {
        const priority = getTaskPriority(record);
        return (
          <Badge 
            status={priority.level === 'high' ? 'error' : priority.level === 'medium' ? 'warning' : 'success'}
            text={priority.text}
          />
        );
      },
    },
    {
      title: 'Permit Number',
      dataIndex: 'permit_number',
      key: 'permit_number',
      width: 150,
      render: (text, record) => (
        <Button 
          type="link" 
          onClick={() => window.open(`/ptw/permits/${record.permit_id}`, '_blank')}
        >
          {text}
        </Button>
      ),
    },
    {
      title: 'Task Type',
      dataIndex: 'step_type',
      key: 'step_type',
      width: 120,
      render: (stepType) => (
        <Tag color={getStepTypeColor(stepType)}>
          {stepType.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Task Name',
      dataIndex: 'step_name',
      key: 'step_name',
      width: 180,
    },
    {
      title: 'Permit Type',
      dataIndex: 'permit_type',
      key: 'permit_type',
      width: 150,
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Created By',
      dataIndex: 'created_by',
      key: 'created_by',
      width: 150,
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Time Elapsed',
      key: 'time_elapsed',
      width: 120,
      render: (_: any, record) => {
        const createdAt = new Date(record.created_at);
        const now = new Date();
        const hoursElapsed = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
        const priority = getTaskPriority(record);
        
        return (
          <Tag color={priority.color}>
            {hoursElapsed}h
          </Tag>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_: any, record) => (
        <Space>
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => window.open(`/ptw/permits/${record.permit_id}`, '_blank')}
          >
            View
          </Button>
          
          {record.step_type === 'verification' && (
            <Button 
              size="small" 
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handleTaskAction(record, 'verify')}
            >
              Verify
            </Button>
          )}
          
          {record.step_type === 'approval' && (
            <Button 
              size="small" 
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handleTaskAction(record, 'approve')}
            >
              Approve
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const getTaskSummary = () => {
    const verificationTasks = tasks.filter(task => task.step_type === 'verification').length;
    const approvalTasks = tasks.filter(task => task.step_type === 'approval').length;
    const overdueTasks = tasks.filter(task => getTaskPriority(task).level === 'high').length;
    
    return { verificationTasks, approvalTasks, overdueTasks };
  };

  const summary = getTaskSummary();

  return (
    <div className="workflow-task-dashboard">
      {/* Summary Cards */}
      <div style={{ marginBottom: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <Card size="small">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
              {summary.verificationTasks}
            </div>
            <div>Verification Tasks</div>
          </div>
        </Card>
        
        <Card size="small">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
              {summary.approvalTasks}
            </div>
            <div>Approval Tasks</div>
          </div>
        </Card>
        
        <Card size="small">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>
              {summary.overdueTasks}
            </div>
            <div>Overdue Tasks</div>
          </div>
        </Card>
        
        <Card size="small">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#722ed1' }}>
              {tasks.length}
            </div>
            <div>Total Tasks</div>
          </div>
        </Card>
      </div>

      {/* Tasks Table */}
      <Card 
        title={
          <Space>
            <ClockCircleOutlined />
            My Workflow Tasks
            <Badge count={tasks.length} style={{ backgroundColor: '#52c41a' }} />
          </Space>
        }
        extra={
          <Button onClick={fetchMyTasks} loading={loading}>
            Refresh
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="step_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} tasks`,
          }}
          scroll={{ x: 1400 }}
          rowClassName={(record) => {
            const priority = getTaskPriority(record);
            return priority.level === 'high' ? 'task-overdue' : '';
          }}
        />
      </Card>

      {/* Action Modal */}
      <Modal
        title={`${actionType === 'verify' ? 'Verify' : 'Approve'} Permit - ${selectedTask?.permit_number}`}
        open={actionModalVisible}
        onCancel={() => setActionModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedTask && (
          <div style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div><strong>Permit Type:</strong> {selectedTask.permit_type}</div>
              <div><strong>Location:</strong> {selectedTask.location}</div>
              <div><strong>Created By:</strong> {selectedTask.created_by}</div>
              <div><strong>Created At:</strong> {new Date(selectedTask.created_at).toLocaleString()}</div>
            </Space>
          </div>
        )}

        <Form form={form} onFinish={handleSubmitAction} layout="vertical">
          <Form.Item 
            label="Action" 
            name="action" 
            rules={[{ required: true, message: 'Please select an action' }]}
          >
            <Select placeholder="Select action">
              <Option value="approve">Approve</Option>
              <Option value="reject">Reject</Option>
            </Select>
          </Form.Item>

          {actionType === 'verify' && (
            <Form.Item label="Select Approver (Optional)" name="approver_id">
              <Select placeholder="Select approver for next stage">
                {availableApprovers.map(approver => (
                  <Option key={approver.id} value={approver.id}>
                    {approver.user.full_name} ({approver.admin_user_type.toUpperCase()} - Grade {approver.grade.toUpperCase()})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item 
            label="Comments" 
            name="comments"
            rules={[
              { required: true, message: 'Please provide comments' },
              { min: 10, message: 'Comments must be at least 10 characters' }
            ]}
          >
            <TextArea 
              rows={4} 
              placeholder="Enter your comments and reasoning for this decision"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Submit {actionType === 'verify' ? 'Verification' : 'Approval'}
              </Button>
              <Button onClick={() => setActionModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .task-overdue {
          background-color: #fff2f0;
        }
        .task-overdue:hover {
          background-color: #ffebe6 !important;
        }
      `}</style>
    </div>
  );
};

export default WorkflowTaskDashboard;