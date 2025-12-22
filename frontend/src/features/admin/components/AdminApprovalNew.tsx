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
          // If pending fails, show basic user data as pending
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
      
      setAdminDetails(admins);
    } catch (error: any) {
      message.error('Failed to fetch admin details');
      setAdminDetails([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminsForProject = async (projectId: number) => {
    try {
      const response = await api.get(`/authentication/admin/list/${projectId}/`);
      const { clientAdmin, epcAdmin, contractorAdmins } = response.data;

      setClientAdmin(clientAdmin ? {
        username: clientAdmin.username,
        companyName: clientAdmin.company_name || '',
        registeredAddress: clientAdmin.registered_address || '',
        created: true,
      } : { username: '', companyName: '', registeredAddress: '', created: false });

      setEpcAdmin(epcAdmin ? {
        username: epcAdmin.username,
        companyName: epcAdmin.company_name || '',
        registeredAddress: epcAdmin.registered_address || '',
        created: true,
      } : { username: '', companyName: '', registeredAddress: '', created: false });

      if (contractorAdmins?.length > 0) {
        setContractorAdmins(contractorAdmins.map((admin: any) => ({
          username: admin.username,
          companyName: admin.company_name || '',
          registeredAddress: admin.registered_address || '',
          created: true,
        })));
        setLoadingContractor(new Array(contractorAdmins.length).fill(false));
      } else {
        setContractorAdmins([{ username: '', companyName: '', registeredAddress: '', created: false }]);
        setLoadingContractor([false]);
      }
    } catch (error: any) {
      // Reset all fields on error/not found
      setClientAdmin({ username: '', companyName: '', registeredAddress: '', created: false });
      setEpcAdmin({ username: '', companyName: '', registeredAddress: '', created: false });
      setContractorAdmins([{ username: '', companyName: '', registeredAddress: '', created: false }]);
      setLoadingContractor([false]);
      if (error.response?.status !== 404) {
        message.error('Failed to fetch admin users for selected project');
      }
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

  const handleProjectChange = (value: number) => {
    setSelectedProjectId(value);
    fetchAdminDetails(value);
    fetchAdminsForProject(value);
  };

  const handleDeleteAdmin = async (adminType: string, index?: number) => {
    if (!selectedProjectId) {
      message.error('Please select a project first');
      return;
    }

    const confirmDelete = window.confirm('Are you sure you want to permanently delete this admin?');
    if (!confirmDelete) {
      return;
    }

    let usernameToDelete: string | null = null;

    if (adminType === 'client') {
      usernameToDelete = clientAdmin.username;
    } else if (adminType === 'epc') {
      usernameToDelete = epcAdmin.username;
    } else if (adminType === 'contractor' && typeof index === 'number') {
      usernameToDelete = contractorAdmins[index]?.username || null;
    }

    if (!usernameToDelete) {
      message.error('Admin username not found for deletion');
      return;
    }

    try {
      // Find user ID by username
      const userResponse = await api.get(`/authentication/admin/user-by-username/${usernameToDelete}/`);
      const userId = userResponse.data.id;

      await api.delete(`/authentication/master-admin/projects/admin/delete/${userId}/`);
      message.success(`${adminType.toUpperCase()} Admin deleted successfully.`);

      // Refresh admin list for the project
      await fetchAdminsForProject(selectedProjectId);
      await fetchAdminDetails(selectedProjectId);
    } catch (error: any) {
      message.error(`Failed to delete ${adminType} admin: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleInputChange = (adminType: string, field: string, value: string, index?: number) => {
    const updateAdmin = (admin: AdminData) => ({ ...admin, [field]: value });
    if (adminType === 'client') setClientAdmin(updateAdmin(clientAdmin));
    else if (adminType === 'epc') setEpcAdmin(updateAdmin(epcAdmin));
    else if (adminType === 'contractor' && typeof index === 'number') {
      const updatedContractors = [...contractorAdmins];
      updatedContractors[index] = updateAdmin(updatedContractors[index]);
      setContractorAdmins(updatedContractors);
    }
  };

  const createOrResetAdmin = async (adminType: string, index?: number) => {
    if (!selectedProjectId) {
      message.error('Please select a project first');
      return;
    }
    let adminData: AdminData;
    let setLoading: (loading: boolean) => void;

    if (adminType === 'client') {
      adminData = clientAdmin;
      setLoading = setLoadingClient;
    } else if (adminType === 'epc') {
      adminData = epcAdmin;
      setLoading = setLoadingEpc;
    } else if (adminType === 'contractor' && typeof index === 'number') {
      adminData = contractorAdmins[index];
      setLoading = (loading: boolean) => {
        const newLoading = [...loadingContractor];
        newLoading[index] = loading;
        setLoadingContractor(newLoading);
      };
    } else {
      message.error('Invalid admin type or index');
      return;
    }

    if (!adminData.username || !adminData.companyName || !adminData.registeredAddress) {
      message.error(`Please fill all fields for ${adminType.toUpperCase()} Admin`);
      return;
    }

    // Handle admin update for existing admins
    if (adminData.created) {
      setLoading(true);
      try {
        // Get user ID by username
        const userResponse = await api.get(`/authentication/admin/user-by-username/${adminData.username}/`);
        const userId = userResponse.data.id;
        
        // Update admin details
        const updatePayload = {
          company_name: adminData.companyName,
          registered_address: adminData.registeredAddress
        };
        
        await api.put(`/authentication/admin/update/${userId}/`, updatePayload);
        message.success(`${adminType.toUpperCase()} Admin updated successfully`);
        
        // Refresh admin list
        await fetchAdminsForProject(selectedProjectId);
        await fetchAdminDetails(selectedProjectId);
        
      } catch (error: any) {
        message.error(`Failed to update ${adminType} admin: ${error.response?.data?.error || error.message}`);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Handle admin creation
    setLoading(true);
    try {
      const payload = {
        project_id: selectedProjectId,
        [`${adminType}_username`]: adminData.username,
        [`${adminType}_company`]: adminData.companyName,
        [`${adminType}_residentAddress`]: adminData.registeredAddress,
      };
      const response = await api.post('/authentication/master-admin/projects/create-admins/', payload);

      // Extract password and trigger download
      let backendPassword: string | undefined;
      if (response.data?.password) {
        backendPassword = response.data.password;
      } else if (Array.isArray(response.data?.created_admins) && response.data.created_admins[0]?.password) {
        backendPassword = response.data.created_admins[0].password;
      }

      if (!backendPassword) {
        message.error('Admin created, but password was not returned. Please contact support.');
        await fetchAdminsForProject(selectedProjectId);
        await fetchAdminDetails(selectedProjectId);
        return;
      }
      
      message.success(`${adminType.toUpperCase()} Admin created. Credentials are being downloaded.`);

      const textContent = `Admin Type: ${adminType.toUpperCase()}\nUsername: ${adminData.username}\nPassword: ${backendPassword}\nCompany Name: ${adminData.companyName}\nRegistered Address: ${adminData.registeredAddress}\n`;

      const element = document.createElement('a');
      const file = new Blob([textContent], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `${adminType}_admin_credentials_${adminData.username}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      // Refresh data from server to get the canonical state
      await fetchAdminsForProject(selectedProjectId);
      await fetchAdminDetails(selectedProjectId);

    } catch (error: any) {
      message.error(`Failed to create ${adminType} admin: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetAdmin = async () => {
    if (!resetPassword || resetPassword.length < 8) {
      message.error('Password must be at least 8 characters');
      return;
    }
    if (!resetAdminType || selectedProjectId === null) return;

    setResettingPasswordLoading(true);
    try {
      const payload = {
        project_id: selectedProjectId,
        admin_type: resetAdminType,
        new_password: resetPassword,
        admin_index: resetAdminIndex,
      };

      const response = await api.post('/authentication/master-admin/reset-admin-password/', payload);

      if (response.data?.success) {
        message.success(`Password reset successfully for ${resetAdminType} admin`);
        setIsResetModalVisible(false);
        setResetPassword('');
        await fetchAdminsForProject(selectedProjectId);
        await fetchAdminDetails(selectedProjectId);
      } else {
        message.error(response.data?.error || 'Failed to reset password');
      }
    } catch (error: any) {
      message.error(`Failed to reset password: ${error.response?.data?.error || error.message}`);
    } finally {
      setResettingPasswordLoading(false);
    }
  };

  const handleAddContractor = () => {
    setContractorAdmins([...contractorAdmins, { username: '', companyName: '', registeredAddress: '', created: false }]);
    setLoadingContractor([...loadingContractor, false]);
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
      title="Admin User Management"
      subtitle="Create new admins and manage existing admin details"
      breadcrumbs={[{ title: 'Admin Users' }]}
    >
      <Card style={{ marginBottom: 16 }}>
        <Form layout="inline">
          <Form.Item label="Select Project" style={{ width: 300 }}>
            <Select
              placeholder="Choose a project"
              onChange={handleProjectChange}
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
      
      {selectedProjectId && (
        <Tabs defaultActiveKey="create" type="card">
          <TabPane tab="Create Admins" key="create">
            <div className="space-y-6">
              <Divider orientation="left" className="!mb-6 !text-text-muted">Client & EPC Admins</Divider>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Client Admin Card */}
                <Card
                  title={<Space><UserOutlined /><span className="font-semibold">Client Admin</span></Space>}
                  className="flex flex-col h-full bg-color-bg-base border-color-border"
                  styles={{ body: { flexGrow: 1, display: 'flex', flexDirection: 'column' } }}
                  extra={
                    <Space>
                      {clientAdmin.created && (
                        <Button 
                          type="text" 
                          icon={<KeyOutlined />} 
                          onClick={() => {
                            setResetAdminType('client');
                            setResetAdminIndex(null);
                            setIsResetModalVisible(true);
                          }}
                          title="Reset Password"
                        />
                      )}
                      {clientAdmin.created && (
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteAdmin('client')} />
                      )}
                    </Space>
                  }
                >
                  <div className="flex-grow">
                    <Form.Item label="Username" required>
                      <Input value={clientAdmin.username} onChange={(e) => handleInputChange('client', 'username', e.target.value)} placeholder="Enter client admin username" prefix={<UserOutlined />} size="large"/>
                    </Form.Item>
                    <Form.Item label="Company Name" required>
                      <Input value={clientAdmin.companyName} onChange={(e) => handleInputChange('client', 'companyName', e.target.value)} placeholder="Enter company name" prefix={<BankOutlined />} size="large" />
                    </Form.Item>
                    <Form.Item label="Registered Official Address" required>
                      <Input.TextArea value={clientAdmin.registeredAddress} onChange={(e) => handleInputChange('client', 'registeredAddress', e.target.value)} rows={3} placeholder="Enter registered official address" />
                    </Form.Item>
                  </div>
                  <Form.Item className="!mb-0 mt-auto">
                    <Button type="primary" onClick={() => createOrResetAdmin('client')} loading={loadingClient} icon={clientAdmin.created ? <KeyOutlined /> : <UserAddOutlined />} block size="large">
                      {clientAdmin.created ? 'Update Admin Details' : 'Create Admin & Download Credentials'}
                    </Button>
                  </Form.Item>
                </Card>

                {/* EPC Admin Card */}
                <Card
                  title={
                    <Space>
                      <UserOutlined />
                      <span className="font-semibold">EPC Admin</span>
                      {epcAdmin.created && <span className="text-green-500 text-sm">(Created)</span>}
                      {companyDetails && !epcAdmin.created && (
                        <span className="text-orange-500 text-sm">(Auto-fill available)</span>
                      )}
                    </Space>
                  }
                  className="flex flex-col h-full bg-color-bg-base border-color-border"
                  styles={{ body: { flexGrow: 1, display: 'flex', flexDirection: 'column' } }}
                  extra={
                    <Space>
                      {!epcAdmin.created && companyDetails && (
                        <Button
                          type="default"
                          size="small"
                          icon={<BuildOutlined />}
                          onClick={autoFillEPCFields}
                          loading={loadingCompanyDetails}
                          title="Auto-fill with company details"
                        >
                          Auto-fill
                        </Button>
                      )}
                      {!epcAdmin.created && (
                        <Button
                          type="text"
                          size="small"
                          icon={<SyncOutlined />}
                          onClick={fetchCompanyDetails}
                          loading={loadingCompanyDetails}
                          title="Refresh company details"
                        />
                      )}
                      {epcAdmin.created && (
                        <Button 
                          type="text" 
                          icon={<KeyOutlined />} 
                          onClick={() => {
                            setResetAdminType('epc');
                            setResetAdminIndex(null);
                            setIsResetModalVisible(true);
                          }}
                          title="Reset Password"
                        />
                      )}
                      {epcAdmin.created && (
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteAdmin('epc')} />
                      )}
                    </Space>
                  }
                >
                  <div className="flex-grow">
                    <Form.Item label="Username" required>
                      <Input value={epcAdmin.username} onChange={(e) => handleInputChange('epc', 'username', e.target.value)} placeholder="Enter EPC admin username" prefix={<UserOutlined />} size="large"/>
                    </Form.Item>
                    <Form.Item
                      label={
                        <span>
                          Company Name
                          {companyDetails && !epcAdmin.created && (
                            <span className="text-xs text-gray-500 ml-2">
                              (Available: {companyDetails.company_name})
                            </span>
                          )}
                        </span>
                      }
                      required
                    >
                      <Input
                        value={epcAdmin.companyName}
                        onChange={(e) => handleInputChange('epc', 'companyName', e.target.value)}
                        placeholder={companyDetails ? `Auto-fill available: ${companyDetails.company_name}` : "Enter company name"}
                        prefix={<BankOutlined />}
                        size="large"
                      />
                    </Form.Item>
                    <Form.Item
                      label={
                        <span>
                          Registered Official Address
                          {companyDetails && !epcAdmin.created && companyDetails.registered_office_address && (
                            <span className="text-xs text-gray-500 ml-2">
                              (Available: {companyDetails.registered_office_address.substring(0, 30)}...)
                            </span>
                          )}
                        </span>
                      }
                      required
                    >
                      <Input.TextArea
                        value={epcAdmin.registeredAddress}
                        onChange={(e) => handleInputChange('epc', 'registeredAddress', e.target.value)}
                        rows={3}
                        placeholder={companyDetails ? `Auto-fill available: ${companyDetails.registered_office_address}` : "Enter registered official address"}
                      />
                    </Form.Item>
                  </div>
                  <Form.Item className="!mb-0 mt-auto">
                    <Button type="primary" onClick={() => createOrResetAdmin('epc')} loading={loadingEpc} icon={epcAdmin.created ? <KeyOutlined /> : <UserAddOutlined />} block size="large">
                      {epcAdmin.created ? 'Update Admin Details' : 'Create Admin & Download Credentials'}
                    </Button>
                  </Form.Item>
                </Card>
              </div>
              
              <Divider orientation="left" className="!mb-6 !text-text-muted">Contractor Admins</Divider>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {contractorAdmins.map((contractor, index) => (
                  <Card
                    key={index}
                    title={<Space><UserOutlined /><span className="font-semibold">Contractor Admin {index + 1}</span></Space>}
                    className="flex flex-col h-full bg-color-bg-base border-color-border"
                    styles={{ body: { flexGrow: 1, display: 'flex', flexDirection: 'column' } }}
                    extra={
                      <Space>
                        {contractor.created && (
                          <Button 
                            type="text" 
                            icon={<KeyOutlined />} 
                            onClick={() => {
                              setResetAdminType('contractor');
                              setResetAdminIndex(index);
                              setIsResetModalVisible(true);
                            }}
                            title="Reset Password"
                          />
                        )}
                        {contractor.created && (
                          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteAdmin('contractor', index)} />
                        )}
                      </Space>
                    }
                  >
                    <div className="flex-grow">
                      <Form.Item label="Username" required>
                        <Input value={contractor.username} onChange={(e) => handleInputChange('contractor', 'username', e.target.value, index)} placeholder="Enter contractor admin username" prefix={<UserOutlined />} size="large" />
                      </Form.Item>
                      <Form.Item label="Company Name" required>
                        <Input value={contractor.companyName} onChange={(e) => handleInputChange('contractor', 'companyName', e.target.value, index)} placeholder="Enter company name" prefix={<BankOutlined />} size="large" />
                      </Form.Item>
                      <Form.Item label="Registered Official Address" required>
                        <Input.TextArea value={contractor.registeredAddress} onChange={(e) => handleInputChange('contractor', 'registeredAddress', e.target.value, index)} rows={3} placeholder="Enter registered official address" />
                      </Form.Item>
                    </div>
                    <Form.Item className="!mb-0 mt-auto">
                      <Button type="primary" onClick={() => createOrResetAdmin('contractor', index)} loading={loadingContractor[index]} icon={contractor.created ? <KeyOutlined /> : <UserAddOutlined />} block size="large">
                        {contractor.created ? 'Update Admin Details' : 'Create Admin & Download Credentials'}
                      </Button>
                    </Form.Item>
                  </Card>
                ))}
              </div>

              <Form.Item className="mt-6">
                <Button type="dashed" onClick={handleAddContractor} block size="large" icon={<PlusOutlined />}>
                  Add Another Contractor
                </Button>
              </Form.Item>
            </div>
          </TabPane>
          
          <TabPane tab="Manage Existing" key="manage">
            <Card>
              <Table
                columns={columns}
                dataSource={adminDetails}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
                locale={{ emptyText: 'No admin details found for this project' }}
              />
            </Card>
          </TabPane>
        </Tabs>
      )}
      
      {!selectedProjectId && (
        <Card>
          <div className="text-center py-8">
            <Text type="secondary">Please select a project to manage admin users</Text>
          </div>
        </Card>
      )}

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

      {/* Password Reset Modal */}
      <Modal
        title="Reset Admin Password"
        open={isResetModalVisible}
        onOk={handleResetAdmin}
        onCancel={() => { setIsResetModalVisible(false); setResetPassword(''); }}
        confirmLoading={resettingPasswordLoading}
      >
        <Form layout="vertical" className="!pt-4">
          <Form.Item label="New Password" required>
            <Input.Password value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="Enter new password (min. 8 characters)" prefix={<LockOutlined />} size="large"/>
          </Form.Item>
        </Form>
      </Modal>
    </PageLayout>
  );
};

export default AdminApproval;