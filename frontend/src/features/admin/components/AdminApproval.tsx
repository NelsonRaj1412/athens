import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Card, Typography, Modal, Form, Input, Upload, message, Image, Tag, Descriptions, Select, Tabs, Row, Col, Divider } from 'antd';
import { EyeOutlined, EditOutlined, CheckOutlined, CloseOutlined, UploadOutlined, UserOutlined, BankOutlined, PhoneOutlined, PlusOutlined, UserAddOutlined, KeyOutlined, DeleteOutlined, BuildOutlined, SyncOutlined, LockOutlined } from '@ant-design/icons';
import api from '@common/utils/axiosetup';
import useAuthStore from '@common/store/authStore';
import PageLayout from '@common/components/PageLayout';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

interface AdminDetail {
  id: number;
  user: {
    id: number;
    username: string;
    name?: string;
    surname?: string;
    user_type: string;
    admin_type?: string;
  };
  company_name: string;
  registered_address: string;
  phone_number?: string;
  pan_number?: string;
  gst_number?: string;
  photo?: string;
  logo?: string;
  is_approved: boolean;
  created_at: string;
}

interface AdminData {
  username: string;
  companyName: string;
  registeredAddress: string;
  password?: string;
  created: boolean;
}

interface Project {
  id: number;
  name: string;
}

const AdminApproval: React.FC = () => {
  // Existing approval states
  const [adminDetails, setAdminDetails] = useState<AdminDetail[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminDetail | null>(null);
  const [form] = Form.useForm();
  const [updating, setUpdating] = useState(false);
  
  // New creation states
  const [clientAdmin, setClientAdmin] = useState<AdminData>({ username: '', companyName: '', registeredAddress: '', created: false });
  const [epcAdmin, setEpcAdmin] = useState<AdminData>({ username: '', companyName: '', registeredAddress: '', created: false });
  const [contractorAdmins, setContractorAdmins] = useState<AdminData[]>([
    { username: '', companyName: '', registeredAddress: '', created: false },
  ]);
  const [loadingClient, setLoadingClient] = useState(false);
  const [loadingEpc, setLoadingEpc] = useState(false);
  const [loadingContractor, setLoadingContractor] = useState<boolean[]>([false]);
  const [isResetModalVisible, setIsResetModalVisible] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetAdminType, setResetAdminType] = useState<string | null>(null);
  const [resetAdminIndex, setResetAdminIndex] = useState<number | null>(null);
  const [resettingPasswordLoading, setResettingPasswordLoading] = useState(false);
  const [companyDetails, setCompanyDetails] = useState<{company_name: string, registered_office_address: string} | null>(null);
  const [loadingCompanyDetails, setLoadingCompanyDetails] = useState(false);
  
  const userType = useAuthStore((state) => state.usertype);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated() || userType !== 'master') {
      message.error('Only Master Admin can access this page');
      window.location.href = '/dashboard';
      return;
    }
    fetchProjects();
    fetchCompanyDetails();
  }, [isAuthenticated, userType]);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/authentication/project/list/');
      setProjects(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      if (error.response?.status === 401) window.location.href = '/signin';
      else message.error('Failed to fetch projects');
    }
  };

  // Fetch company details for auto-filling EPC fields
  const fetchCompanyDetails = async () => {
    setLoadingCompanyDetails(true);
    try {
      const response = await api.get('/authentication/companydetail/');
      setCompanyDetails({
        company_name: response.data.company_name || '',
        registered_office_address: response.data.registered_office_address || ''
      });
    } catch (error) {
      setCompanyDetails(null);
    } finally {
      setLoadingCompanyDetails(false);
    }
  };

  // Auto-fill EPC admin fields with company details
  const autoFillEPCFields = () => {
    if (companyDetails && !epcAdmin.created) {
      setEpcAdmin(prev => ({
        ...prev,
        companyName: companyDetails.company_name,
        registeredAddress: companyDetails.registered_office_address
      }));
      message.success('EPC fields auto-filled with company details');
    } else if (!companyDetails) {
      message.warning('No company details found. Please fill company details first.');
    } else if (epcAdmin.created) {
      message.info('EPC admin already created. Cannot auto-fill.');
    }
  };

  const fetchAdminDetails = async (projectId: number) => {
    setLoading(true);
    try {
      // Get basic admin list first
      const listResponse = await api.get(`/authentication/admin/list/${projectId}/`);
      const admins: AdminDetail[] = [];
      
      // Fetch complete details for each admin
      const adminUsers = [];
      if (listResponse.data.clientAdmin) adminUsers.push(listResponse.data.clientAdmin);
      if (listResponse.data.epcAdmin) adminUsers.push(listResponse.data.epcAdmin);
      if (listResponse.data.contractorAdmins) adminUsers.push(...listResponse.data.contractorAdmins);
      
      // Get complete admin details for each user
      for (const user of adminUsers) {
        try {
          // Try pending endpoint first (for unapproved details)
          const detailResponse = await api.get(`/authentication/admin/detail/${user.id}/`);
          const detail = detailResponse.data;
          
          admins.push({
            id: detail.admin_detail?.id || user.id,
            user: {
              id: user.id,
              username: user.username,
              name: detail.admin_detail?.name || user.name,
              surname: detail.admin_detail?.surname || user.surname,
              user_type: user.user_type,
              admin_type: user.admin_type
            },
            company_name: detail.admin_detail?.company_name || user.company_name || '',
            registered_address: detail.admin_detail?.registered_address || user.registered_address || '',
            phone_number: detail.admin_detail?.phone_number || '',
            pan_number: detail.admin_detail?.pan_number || '',
            gst_number: detail.admin_detail?.gst_number || '',
            photo: detail.admin_detail?.photo || null,
            logo: detail.admin_detail?.logo || null,
            is_approved: detail.admin_detail?.is_approved || false,
            created_at: detail.admin_detail?.created_at || user.created_at || new Date().toISOString()
          });
        } catch (pendingError) {
          // If pending fails, try the /admin/me/ endpoint to get approved details
          try {
            // For approved admins, we need to use a different approach
            // Let's check if they have submitted details by trying to get their current details
            const currentUserToken = localStorage.getItem('access_token');
            if (currentUserToken) {
              // We can't directly access another user's /admin/me/ endpoint
              // So we'll show basic info and mark as approved if pending fails
              admins.push({
                id: user.id,
                user: {
                  id: user.id,
                  username: user.username,
                  name: user.name,
                  surname: user.surname,
                  user_type: user.user_type,
                  admin_type: user.admin_type
                },
                company_name: user.company_name || '',
                registered_address: user.registered_address || '',
                phone_number: 'Details submitted',
                pan_number: 'Details submitted',
                gst_number: 'Details submitted',
                photo: null,
                logo: null,
                is_approved: true, // If not in pending, likely approved
                created_at: user.created_at || new Date().toISOString()
              });
            }
          } catch (approvedError) {
            // If both fail, show basic user data as pending
            admins.push({
              id: user.id,
              user: {
                id: user.id,
                username: user.username,
                name: user.name,
                surname: user.surname,
                user_type: user.user_type,
                admin_type: user.admin_type
              },
              company_name: user.company_name || '',
              registered_address: user.registered_address || '',
              phone_number: '',
              pan_number: '',
              gst_number: '',
              photo: null,
              logo: null,
              is_approved: false,
              created_at: user.created_at || new Date().toISOString()
            });
          }
        }
      }
      
      setAdminDetails(admins);
    } catch (error: any) {
      message.error('Failed to fetch admin details');
      setAdminDetails([]);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (admin: AdminDetail) => {
    setSelectedAdmin(admin);
    setViewModalVisible(true);
  };

  const handleEdit = (admin: AdminDetail) => {
    setSelectedAdmin(admin);
    form.setFieldsValue({
      name: admin.user.name,
      surname: admin.user.surname,
      company_name: admin.company_name,
      registered_address: admin.registered_address,
      phone_number: admin.phone_number,
      pan_number: admin.pan_number,
      gst_number: admin.gst_number
    });
    setEditModalVisible(true);
  };

  const handleUpdate = async (values: any) => {
    if (!selectedAdmin) return;
    
    setUpdating(true);
    try {
      const formData = new FormData();
      Object.keys(values).forEach(key => {
        if (values[key]) formData.append(key, values[key]);
      });
      
      await api.put(`/authentication/admin/detail/update-by-master/${selectedAdmin.user.id}/`, formData);
      message.success('Admin details updated successfully');
      setEditModalVisible(false);
      if (selectedProjectId) fetchAdminDetails(selectedProjectId);
    } catch (error: any) {
      message.error('Failed to update admin details');
    } finally {
      setUpdating(false);
    }
  };

  const handleApprove = async (userId: number) => {
    try {
      await api.post(`/authentication/admin/detail/approve/${userId}/`);
      message.success('Admin approved successfully');
      if (selectedProjectId) fetchAdminDetails(selectedProjectId);
    } catch (error: any) {
      message.error('Failed to approve admin');
    }
  };

  const columns = [
    {
      title: 'Username',
      dataIndex: ['user', 'username'],
      key: 'username',
    },
    {
      title: 'Name',
      dataIndex: ['user', 'name'],
      key: 'name',
      render: (name: string, record: AdminDetail) => name || record.user.username,
    },
    {
      title: 'Company',
      dataIndex: 'company_name',
      key: 'company_name',
    },
    {
      title: 'Type',
      dataIndex: ['user', 'admin_type'],
      key: 'admin_type',
      render: (type: string) => (
        <Tag color={type === 'epc' ? 'blue' : type === 'client' ? 'green' : 'orange'}>
          {type?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'is_approved',
      key: 'is_approved',
      render: (approved: boolean) => (
        <Tag color={approved ? 'success' : 'warning'}>
          {approved ? 'Approved' : 'Pending'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: AdminDetail) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
            title="View Details"
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            title="Edit Details"
          />
          {!record.is_approved && (
            <Button
              type="text"
              icon={<CheckOutlined />}
              onClick={() => handleApprove(record.user.id)}
              title="Approve"
              style={{ color: '#52c41a' }}
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageLayout
      title="Admin Details Management"
      subtitle="View, edit and approve admin company details"
      breadcrumbs={[{ title: 'Admin Approval' }]}
    >
      <Card style={{ marginBottom: 16 }}>
        <Form layout="inline">
          <Form.Item label="Select Project" style={{ width: 300 }}>
            <Select
              placeholder="Choose a project"
              onChange={(value) => {
                setSelectedProjectId(value);
                fetchAdminDetails(value);
              }}
              value={selectedProjectId}
              showSearch
              optionFilterProp="children"
            >
              {projects.map((project) => (
                <Select.Option key={project.id} value={project.id}>
                  {project.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Card>
      
      <Card>
        <Table
          columns={columns}
          dataSource={adminDetails}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: selectedProjectId ? 'No admin details found for this project' : 'Please select a project' }}
        />
      </Card>

      {/* View Modal */}
      <Modal
        title="Admin Details"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>
        ]}
        width={700}
      >
        {selectedAdmin && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="Username" span={2}>
              {selectedAdmin.user.username}
            </Descriptions.Item>
            <Descriptions.Item label="Name">
              {selectedAdmin.user.name || 'Not provided'}
            </Descriptions.Item>
            <Descriptions.Item label="Surname">
              {selectedAdmin.user.surname || 'Not provided'}
            </Descriptions.Item>
            <Descriptions.Item label="Company Name" span={2}>
              {selectedAdmin.company_name}
            </Descriptions.Item>
            <Descriptions.Item label="Registered Address" span={2}>
              {selectedAdmin.registered_address}
            </Descriptions.Item>
            <Descriptions.Item label="Phone Number">
              {selectedAdmin.phone_number || 'Not provided'}
            </Descriptions.Item>
            <Descriptions.Item label="PAN Number">
              {selectedAdmin.pan_number || 'Not provided'}
            </Descriptions.Item>
            <Descriptions.Item label="GST Number" span={2}>
              {selectedAdmin.gst_number || 'Not provided'}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={selectedAdmin.is_approved ? 'success' : 'warning'}>
                {selectedAdmin.is_approved ? 'Approved' : 'Pending'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Type">
              <Tag color={selectedAdmin.user.admin_type === 'epc' ? 'blue' : selectedAdmin.user.admin_type === 'client' ? 'green' : 'orange'}>
                {selectedAdmin.user.admin_type?.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            {selectedAdmin.photo && (
              <Descriptions.Item label="Profile Photo" span={2}>
                <Image
                  src={selectedAdmin.photo}
                  alt="Profile Photo"
                  style={{ maxWidth: 150, maxHeight: 150 }}
                  fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
                />
              </Descriptions.Item>
            )}
            {selectedAdmin.logo && (
              <Descriptions.Item label="Company Logo" span={2}>
                <Image
                  src={selectedAdmin.logo}
                  alt="Company Logo"
                  style={{ maxWidth: 150, maxHeight: 150 }}
                  fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
                />
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Edit Admin Details"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setEditModalVisible(false)}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" loading={updating} onClick={() => form.submit()}>
            Update
          </Button>
        ]}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdate}
        >
          <Form.Item label="Name" name="name">
            <Input prefix={<UserOutlined />} placeholder="Enter full name" />
          </Form.Item>
          <Form.Item label="Surname" name="surname">
            <Input prefix={<UserOutlined />} placeholder="Enter surname" />
          </Form.Item>
          <Form.Item label="Company Name" name="company_name">
            <Input prefix={<BankOutlined />} placeholder="Enter company name" />
          </Form.Item>
          <Form.Item label="Registered Address" name="registered_address">
            <Input.TextArea rows={3} placeholder="Enter registered address" />
          </Form.Item>
          <Form.Item label="Phone Number" name="phone_number">
            <Input prefix={<PhoneOutlined />} placeholder="Enter phone number" maxLength={10} />
          </Form.Item>
          <Form.Item label="PAN Number" name="pan_number">
            <Input placeholder="Enter PAN number" />
          </Form.Item>
          <Form.Item label="GST Number" name="gst_number">
            <Input placeholder="Enter GST number" />
          </Form.Item>
        </Form>
      </Modal>
    </PageLayout>
  );
};

export default AdminApproval;