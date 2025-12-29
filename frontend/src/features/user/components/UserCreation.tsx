import React, { useState, useEffect, useCallback } from 'react';
import { Form, Input, Button, Typography, Select, Modal, App } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import api from '../../../common/utils/axiosetup';
import useAuthStore from '../../../common/store/authStore';
import type { UserData } from '../types';
import { ApiErrorHandler, ValidationRules, handleApiCall } from '../../../utils/apiErrorHandler';

const { Title } = Typography;
const { Option } = Select;

// --- Type Definitions (Unchanged, already good practice) ---
type UserCreationData = Omit<UserData, 'key' | 'id' | 'grade' | 'password'> & {
  company_name: string;
  grade: string;
  password?: string;
};

interface UserCreationProps {
  onFinish: (values: UserData) => void;
  projectId?: number;
  companyName?: string;
}

// --- Styled Components for Themed UI ---

const FormContainer = styled.div`
  // This component is often in a modal, so we don't set a background.
  // The modal's background (from antdTheme) will be used.
  // We just control the padding.
  padding: 8px;
`;

const FormHeader = styled(Title)`
  text-align: center;
  margin-bottom: 24px !important;
  color: var(--color-text-base) !important;
`;

const DropdownFooter = styled.div`
  padding: 8px;
  border-top: 1px solid var(--color-border);
`;

const FullWidthButton = styled(Button)`
  width: 100%;
`;

// --- Component Definition ---

const UserCreation: React.FC<UserCreationProps> = ({ onFinish, projectId, companyName }) => {
  // --- State and Hooks ---
  const [form] = Form.useForm<UserCreationData>();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [customDesignationModalVisible, setCustomDesignationModalVisible] = useState(false);
  const [customDesignation, setCustomDesignation] = useState('');
  const [designations, setDesignations] = useState([
    'SiteIncharge', 'TeamLeader', 'Manager', 'Engineer', 'Supervisor', 'Technician', 'Assistant'
  ]);

  // --- Effects ---
  useEffect(() => {
    if (companyName) {
      form.setFieldsValue({ company_name: companyName });
    }
  }, [companyName, form]);

  // --- Handlers (Memoized with useCallback) ---

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Automatically set the username based on the email for convenience
    form.setFieldsValue({ username: e.target.value });
  }, [form]);

  const handleDesignationChange = useCallback((value: string) => {
    let suggestedGrade = 'C';
    if (value.toLowerCase() === 'siteincharge') {
      suggestedGrade = 'A';
    } else if (['teamleader', 'manager'].includes(value.toLowerCase())) {
      suggestedGrade = 'B';
    }
    form.setFieldsValue({ grade: suggestedGrade });
  }, [form]);

  const showAddDesignationModal = useCallback(() => {
    setCustomDesignationModalVisible(true);
  }, []);
  
  const closeAddDesignationModal = useCallback(() => {
    setCustomDesignationModalVisible(false);
  }, []);

  const handleCustomDesignationInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomDesignation(e.target.value);
  }, []);

  const handleAddDesignation = useCallback(() => {
    if (customDesignation && !designations.includes(customDesignation)) {
      const newDesignations = [...designations, customDesignation];
      setDesignations(newDesignations);
      form.setFieldsValue({ designation: customDesignation });
      handleDesignationChange(customDesignation); // Also trigger grade suggestion
      setCustomDesignation(''); // Clear input for next time
    }
    closeAddDesignationModal();
  }, [customDesignation, designations, form, handleDesignationChange, closeAddDesignationModal]);

  const handleFormSubmit = useCallback(async (values: UserCreationData) => {
    setLoading(true);
    
    try {
      // Prepare payload with proper data types and required fields
      const payload = {
        username: values.username?.trim(),
        email: values.email?.trim(),
        name: values.name?.trim(),
        surname: values.surname?.trim(),
        department: values.department,
        designation: values.designation,
        grade: values.grade,
        phone_number: values.phone_number?.trim(),
        user_type: 'adminuser',
        company_name: values.company_name || companyName,
        ...(projectId && { project: projectId })
      };

      // Validate required fields
      const validation = ApiErrorHandler.validateRequiredFields(payload, ValidationRules.userCreation);
      if (!validation.isValid) {
        ApiErrorHandler.showValidationErrors(validation.missingFields);
        return;
      }

      const response = await handleApiCall(
        () => api.post('/authentication/projectadminuser/create/', payload),
        'User Creation',
      );

      if (!response) {
        return; // Error already handled by ApiErrorHandler
      }

      const createdUser: UserData = response.data;

      // Handle password download
      const backendPassword = response.data?.password;
      if (backendPassword) {
        const textContent = `Username: ${createdUser.username}\nPassword: ${backendPassword}\nEmail: ${createdUser.email}\nName: ${createdUser.name} ${createdUser.surname}\nDepartment: ${createdUser.department}\nDesignation: ${createdUser.designation}\nGrade: ${createdUser.grade}\nPhone Number: ${createdUser.phone_number}`;
        const blob = new Blob([textContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${createdUser.username}_credentials.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        message.success('User created successfully and credentials downloaded.');
      } else {
        message.warning('User created, but backend did not provide a password for download.');
      }
      
      // Call the parent's onFinish callback
      onFinish(createdUser);

    } catch (error: any) {
      // Fallback error handling if ApiErrorHandler doesn't catch it
      console.error('User creation error:', error);
      const errorMessage = error.response?.data?.email?.[0] || 
                          error.response?.data?.detail || 
                          'Failed to create user. Please check the details.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [projectId, onFinish, companyName, message]);

  // --- Render ---
  return (
    <FormContainer>
      {/* The component is typically rendered inside a modal, so the title is handled by the parent. 
          If used standalone, you can uncomment this. */}
      {/* <FormHeader level={3}>Add New User</FormHeader> */}
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFormSubmit}
        initialValues={{ company_name: companyName }}
      >
        <Form.Item name="company_name" hidden>
          <Input />
        </Form.Item>

        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: 'Please enter an email' },
            { type: 'email', message: 'Please enter a valid email' },
          ]}
        >
          <Input placeholder="user@example.com" onChange={handleEmailChange} />
        </Form.Item>

        <Form.Item label="Username" name="username" rules={[{ required: true, message: 'Username is required' }]}>
          <Input placeholder="Username will be auto-filled from email" />
        </Form.Item>

        <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Name is required' }, { pattern: /^[A-Za-z\s]+$/, message: 'Name can only contain letters and spaces' }]}>
          <Input placeholder="Enter first name" />
        </Form.Item>

        <Form.Item label="Surname" name="surname" rules={[{ required: true, message: 'Surname is required' }, { pattern: /^[A-Za-z\s]+$/, message: 'Surname can only contain letters and spaces' }]}>
          <Input placeholder="Enter last name" />
        </Form.Item>

        <Form.Item label="Department" name="department" rules={[{ required: true, message: 'Please select a department' }]}>
          <Select placeholder="Select a department">
            <Option value="Quality">Quality</Option>
            <Option value="Safety">Safety</Option>
            <Option value="Inventory">Inventory</Option>
            <Option value="Project/Execution">Project/Execution</Option>
          </Select>
        </Form.Item>

        <Form.Item label="Designation" name="designation" rules={[{ required: true, message: 'Please select a designation' }]}>
          <Select
            placeholder="Select or add a designation"
            onChange={handleDesignationChange}
            dropdownRender={(menu) => (
              <>
                {menu}
                <DropdownFooter>
                  <Button type="text" icon={<PlusOutlined />} onClick={showAddDesignationModal} style={{ width: '100%', textAlign: 'left' }}>
                    Add Custom Designation
                  </Button>
                </DropdownFooter>
              </>
            )}
          >
            {designations.map(d => <Option key={d} value={d}>{d}</Option>)}
          </Select>
        </Form.Item>

        <Form.Item label="Grade" name="grade" rules={[{ required: true, message: 'Grade is required' }]} tooltip="Grade A: Site Incharge, Grade B: Team Leader/Manager, Grade C: Others">
          <Select placeholder="Grade will be suggested by designation">
            <Option value="A">Grade A</Option>
            <Option value="B">Grade B</Option>
            <Option value="C">Grade C</Option>
          </Select>
        </Form.Item>

        <Form.Item label="Phone Number" name="phone_number" rules={[{ required: true, message: 'Phone number is required' }, { pattern: /^\d{10}$/, message: 'Phone number must be 10 digits' }]}>
          <Input placeholder="Enter 10-digit phone number" maxLength={10} />
        </Form.Item>

        <Form.Item style={{ marginTop: '24px' }}>
          <FullWidthButton type="primary" htmlType="submit" loading={loading}>
            Create User
          </FullWidthButton>
        </Form.Item>
      </Form>

      <Modal
        title="Add Custom Designation"
        open={customDesignationModalVisible}
        onOk={handleAddDesignation}
        onCancel={closeAddDesignationModal}
        okText="Add"
        destroyOnClose
      >
        <Input 
          placeholder="Enter new designation name" 
          value={customDesignation} 
          onChange={handleCustomDesignationInputChange} 
          onPressEnter={handleAddDesignation}
        />
      </Modal>
    </FormContainer>
  );
};

export default UserCreation;