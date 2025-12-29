import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Select, App, Modal, Row, Col, Divider, Card, Typography, Space } from 'antd';
import api from '@common/utils/axiosetup';
import useAuthStore from '@common/store/authStore';
import { ApiErrorHandler, handleApiCall } from '../../../utils/apiErrorHandler';
// Removed import of useNavigate from react-router-dom
import {
  UserOutlined,
  BankOutlined,
  KeyOutlined,
  UserAddOutlined,
  DeleteOutlined,
  PlusOutlined,
  LockOutlined,
  SyncOutlined,
  BuildOutlined
} from '@ant-design/icons';
import PageLayout from '@common/components/PageLayout';

const { Option } = Select;
const { Title, Text } = Typography; 

interface Project {
  id: number;
  name: string;
}

interface AdminData {
  username: string;
  companyName: string;
  registeredAddress: string;
  password?: string;
  created: boolean;
}

const AdminCreation: React.FC = () => {
  // =============================================================================
  // === ALL LOGIC FROM THE WORKING 'OLD' FILE IS RESTORED HERE ===
  // This ensures that fetching, state updates, creation, and resets all work correctly.
  // =============================================================================
  const { message } = App.useApp();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
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
    if (!isAuthenticated()) {
      window.location.href = '/signin';
      return;
    }
    if (userType !== 'master') {
      message.error('Only Master Admin can access this page');
      window.location.href = '/dashboard';
      return;
    }
    const fetchProjects = async () => {
      try {
        const response = await api.get('/authentication/project/list/');
        setProjects(Array.isArray(response.data) ? response.data : []);
      } catch (error: any) {
        if (error.response?.status === 401) window.location.href = '/signin';
        else message.error('Failed to fetch projects');
      }
    };
    fetchProjects();
  }, [isAuthenticated, userType]);

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
      // Don't show error message as company details might not exist yet
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

  // Fetch company details when component mounts
  useEffect(() => {
    fetchCompanyDetails();
  }, []);

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


  const handleProjectChange = (value: number) => {
    setSelectedProjectId(value);
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
        [`${adminType}_username`]: adminData.username?.trim(),
        [`${adminType}_company`]: adminData.companyName?.trim(),
        [`${adminType}_residentAddress`]: adminData.registeredAddress?.trim(),
      };

      // Validate required fields
      const requiredFields = ['project_id', `${adminType}_username`, `${adminType}_company`, `${adminType}_residentAddress`];
      const validation = ApiErrorHandler.validateRequiredFields(payload, requiredFields);
      if (!validation.isValid) {
        ApiErrorHandler.showValidationErrors(validation.missingFields);
        return;
      }

      const response = await handleApiCall(
        () => api.post('/authentication/master-admin/projects/create-admins/', payload),
        `${adminType.toUpperCase()} Admin Creation`
      );

      if (!response) {
        return; // Error already handled
      }

      // --- CORE LOGIC RESTORED: Extract password and trigger download ---
      let backendPassword: string | undefined;
      if (response.data?.password) {
        backendPassword = response.data.password;
      } else if (Array.isArray(response.data?.created_admins) && response.data.created_admins[0]?.password) {
        backendPassword = response.data.created_admins[0].password;
      }

      if (!backendPassword) {
        message.error('Admin created, but password was not returned. Please contact support.');
        await fetchAdminsForProject(selectedProjectId); // Refresh state anyway
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

    } catch (error: any) {
      // Fallback error handling
      console.error(`${adminType} admin creation error:`, error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.detail || 
                          `Failed to create ${adminType} admin`;
      message.error(errorMessage);
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




  // =============================================================================
  // === REFINED UI FROM THE 'NEW' FILE, ALIGNED WITH THE DESIGN SYSTEM ===
  // =============================================================================
  return (
    <PageLayout
      title="Admin User Management"
      subtitle="Create or reset passwords for administrators for a selected project"
      breadcrumbs={[
        { title: 'Admin Users' }
      ]}
    >
      
      <Form layout="vertical">
        <Row gutter={16} className="mb-8">
          <Col span={24} md={12} lg={8}>
            <Form.Item label={<span className="font-semibold text-text-base">Select Project</span>} required>
              <Select
                placeholder="Choose a project to manage..."
                onChange={handleProjectChange}
                value={selectedProjectId}
                showSearch
                size="large"
                optionFilterProp="children"
                filterOption={(input, option) => (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())}
                disabled={projects.length === 0}
              >
                {projects.map((project) => (
                  <Option key={project.id} value={project.id}>{project.name}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
        
        {selectedProjectId && (
          <>
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
                <Button type="primary" onClick={() => createOrResetAdmin('client')} loading={loadingClient} icon={clientAdmin.created ? <SyncOutlined /> : <UserAddOutlined />} block size="large">
                  {clientAdmin.created ? 'Sync Admin Details' : 'Create Admin & Download Credentials'}
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
                <Button type="primary" onClick={() => createOrResetAdmin('epc')} loading={loadingEpc} icon={epcAdmin.created ? <SyncOutlined /> : <UserAddOutlined />} block size="large">
                  {epcAdmin.created ? 'Sync Admin Details' : 'Create Admin & Download Credentials'}
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
                    <Button type="primary" onClick={() => createOrResetAdmin('contractor', index)} loading={loadingContractor[index]} icon={contractor.created ? <SyncOutlined /> : <UserAddOutlined />} block size="large">
                      {contractor.created ? 'Sync Admin Details' : 'Create Admin & Download Credentials'}
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
          </>
        )}
      </Form>

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

export default AdminCreation;