import React, { useState, useEffect } from 'react';
import { Card, Table, Button, message, Tag } from 'antd';
import { EyeOutlined, CheckOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '@common/utils/axiosetup';
import PageLayout from '@common/components/PageLayout';
import { useNavigate } from 'react-router-dom';

interface PendingAdmin {
  id: number;
  user: number;
  username: string;
  name: string;
  company_name: string;
  phone_number: string;
  created_at: string;
  status: string;
}

const PendingApprovals: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [pendingAdmins, setPendingAdmins] = useState<PendingAdmin[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadPendingApprovals();
  }, []);

  const loadPendingApprovals = async () => {
    setLoading(true);
    try {
      // Since the backend endpoint doesn't exist, show a message
      setPendingAdmins([]);
      message.info('Please check notifications for pending admin approvals');
    } catch (error) {
      console.error('Failed to load pending approvals:', error);
      setPendingAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (record: PendingAdmin) => {
    // Store admin data for approval
    sessionStorage.setItem('adminToApprove', JSON.stringify(record));
    navigate('/dashboard/admindetail');
  };

  const handleApprove = async (record: PendingAdmin) => {
    try {
      await api.post(`/authentication/admin/detail/approve/${record.user}/`);
      message.success('Admin approved successfully!');
      loadPendingApprovals(); // Refresh list
    } catch (error) {
      message.error('Failed to approve admin');
    }
  };

  const columns: ColumnsType<PendingAdmin> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'Company',
      dataIndex: 'company_name',
      key: 'company_name',
    },
    {
      title: 'Phone',
      dataIndex: 'phone_number',
      key: 'phone_number',
    },
    {
      title: 'Submitted',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: () => <Tag color="orange">Pending</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <div>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
            style={{ marginRight: 8 }}
          >
            View
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => handleApprove(record)}
          >
            Approve
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      title="Pending Approvals"
      subtitle="Review and approve admin detail submissions"
    >
      <Card>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔔</div>
          <h3>Check Notifications for Pending Approvals</h3>
          <p>Admin approval requests are sent as notifications.</p>
          <p>Click on the notification bell icon in the header to view and approve pending requests.</p>
          <div style={{ marginTop: '20px', color: '#666' }}>
            <p><strong>How to approve:</strong></p>
            <p>1. Click the notification bell (🔔) in the top right</p>
            <p>2. Find admin detail notifications</p>
            <p>3. Click "View Details" to review and approve</p>
          </div>
        </div>
      </Card>
    </PageLayout>
  );
};

export default PendingApprovals;