import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Select, Typography, Card, Spin, DatePicker, App } from 'antd';
import moment from 'moment';
import type { Moment } from 'moment';
import api from '../../../common/utils/axiosetup';
import useAuthStore from '../../../common/store/authStore';
import { useTheme } from '@common/contexts/ThemeContext';
import { safeLog } from '../../../common/utils/logSanitizer';
// import { handleApiError } from '../../../common/utils/errorHandler'; // Unused import
import { useNotificationsContext } from '../../../common/contexts/NotificationsContext';
import { authGuard } from '../../../common/utils/authGuard';

const { Title } = Typography;
const { Option } = Select;

interface User {
  id: number;
  username: string;
  name?: string; // Full name
  email: string;
  department?: { id: number; name: string; } | string | number; // Can be object, string, or ID
}

interface MomFormValues {
  title: string;
  agenda: string;
  participants_ids: number[]; // Array of user IDs
  department?: string; // Changed to string to match fixed options
  meeting_datetime: Moment | null; // Moment object for meeting start time
  location?: string; // Added location field
}

interface MomCreationFormProps {
  onFinishSuccess?: () => void;
  onCancel?: () => void;
}

const fixedDepartments = [
  { id: 1, name: 'Quality' },
  { id: 2, name: 'Safety' },
  { id: 3, name: 'Inventory' },
  { id: 4, name: 'Project/Execution' },
];

const MomCreationForm: React.FC<MomCreationFormProps> = ({ onFinishSuccess }) => {
  const [form] = Form.useForm();
  const { username: schedulerUsername, userId: schedulerUserId, django_user_type } = useAuthStore();
  const { sendNotification } = useNotificationsContext();
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedDateTime, setSelectedDateTime] = useState<moment.Moment | null>(null);
  const [notificationsSent, setNotificationsSent] = useState<Set<string>>(new Set());


  const { effectiveTheme } = useTheme();

  const { message } = App.useApp();

  useEffect(() => {
    // Only admin users (epc, client) can schedule
    if (django_user_type !== 'adminuser') {
        // Or redirect, show error message etc.
        // For now, just log and disable form implicitly if needed
        safeLog.warn("User is not an adminuser, cannot schedule MoM");
    }
  }, [django_user_type]);

  useEffect(() => {
    if (selectedDepartments.length > 0) {
      const fetchUsersByDepartments = async () => {
        // Check authentication before making API call
        if (!authGuard.canMakeApiCall()) {
          console.log('User not authenticated, skipping users fetch');
          return;
        }

        setLoadingUsers(true);
        setUsers([]); // Clear previous users
        form.setFieldsValue({ participants_ids: [] }); // Clear selected participants
        try {
          // Fetch users from all selected departments
          const allUsers: User[] = [];

          for (const department of selectedDepartments) {
            try {
              const response = await api.get(`/api/v1/users/?department_name=${encodeURIComponent(department)}`);
              if (response.data) {
                // Handle different response formats
                const userData = Array.isArray(response.data) ? response.data :
                                (response.data.results && Array.isArray(response.data.results)) ? response.data.results : [];
                allUsers.push(...userData);
              }
            } catch (error) {
              safeLog.error(`Failed to load users for department`, { department, error });
              // Only show error message if user is authenticated
              if (authGuard.canMakeApiCall()) {
                message.error(`Failed to load users for department ${department}.`);
              }
            }
          }

          // Remove duplicates based on user ID
          const uniqueUsers = allUsers.filter((user, index, self) =>
            index === self.findIndex(u => u.id === user.id)
          );

          setUsers(uniqueUsers);
        } catch (error) {
          // Only show error message if user is authenticated
          if (authGuard.canMakeApiCall()) {
            message.error('Failed to load users from selected departments.');
          }
          safeLog.error("Users fetch error", error);
        } finally {
          setLoadingUsers(false);
        }
      };
      fetchUsersByDepartments();
    } else {
      setUsers([]); // Clear users if no departments are selected
    }
  }, [selectedDepartments, form, message]);

  const handleDepartmentChange = (values: string[]) => {
    setSelectedDepartments(values);
  };

  // Function to get help text for date/time field
  const getDateTimeHelpText = () => {
    if (!selectedDateTime) {
      return "Select a future date and time (at least 1 minute ahead). Live button will appear when it's meeting time.";
    }

    const now = moment();
    const timeDiff = selectedDateTime.diff(now, 'minutes');

    // Only show positive help text for valid times
    if (timeDiff >= 1) {
      if (timeDiff < 60) {
        return `✅ Meeting scheduled for ${timeDiff} minutes from now. Live button will appear at meeting time.`;
      } else if (timeDiff < 1440) { // Less than 24 hours
        const hours = Math.floor(timeDiff / 60);
        const minutes = timeDiff % 60;
        return `✅ Meeting scheduled for ${hours}h ${minutes}m from now. Live button will appear at meeting time.`;
      } else {
        const days = Math.floor(timeDiff / 1440);
        return `✅ Meeting scheduled for ${days} day(s) from now. Live button will appear at meeting time.`;
      }
    }

    // Don't show help text for invalid times - let validation handle it
    return undefined;
  };



  const onFinish = async (values: MomFormValues) => {
    // Generate unique submission ID
    const currentSubmissionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    safeLog.debug('MomCreationForm - Form submission started', {
      title: values.title,
      participantCount: values.participants_ids?.length || 0,
      meetingDateTime: values.meeting_datetime?.format('YYYY-MM-DD HH:mm:ss'),
      submissionId: currentSubmissionId
    });

    if (django_user_type !== 'adminuser') {
        message.error("You do not have permission to schedule meetings.");
        return;
    }
    
    // Prevent multiple submissions
    if (submitting) {
      safeLog.warn('Form already submitting, ignoring duplicate submission', {
        submissionId: currentSubmissionId
      });
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        meeting_datetime: values.meeting_datetime ? values.meeting_datetime.toISOString() : null,
        scheduled_by: schedulerUserId, // Assuming backend expects scheduler's ID
      };
      // Replace with your actual endpoint for creating MoM
      const response = await api.post('/api/v1/mom/schedule/', payload); // Example endpoint
      safeLog.info('MOM created successfully', {
        momId: response.data.id,
        title: response.data.title,
        participantCount: response.data.participants?.length || 0,
        meetingDateTime: response.data.meeting_datetime
      });
      safeLog.debug('MOM participants comparison', {
        responseParticipants: response.data.participants?.length || 0,
        formParticipants: values.participants_ids.length,
        participantIds: values.participants_ids
      });
      message.success('Meeting scheduled successfully!');

      // Send single batch notification to all participants with deduplication
      try {
        const meetingKey = `${response.data.id}-${values.title}`;
        
        safeLog.info('MoM Creation - Notification process started', {
          meetingId: response.data.id,
          meetingTitle: values.title,
          participantCount: values.participants_ids.length,
          meetingKey,
          alreadySent: notificationsSent.has(meetingKey)
        });
        
        // Check if notifications already sent for this meeting
        if (notificationsSent.has(meetingKey)) {
          safeLog.warn('Notifications already sent for this meeting, skipping duplicate send', {
            meetingKey,
            sentNotifications: Array.from(notificationsSent)
          });
        } else {
          safeLog.info('Sending notifications to participants', {
            participantIds: values.participants_ids,
            meetingTitle: values.title
          });
          
          const notificationPromises = values.participants_ids.map((participantId, index) => {
            safeLog.debug(`Creating notification promise ${index + 1}/${values.participants_ids.length}`, {
              participantId,
              meetingTitle: values.title
            });
            
            return sendNotification(participantId, {
              title: 'New Meeting Invitation',
              message: `You have been invited to: ${values.title}`,
              type: 'meeting_invitation',
              data: { 
                momId: response.data.id,
                userId: participantId,
                title: values.title,
                meetingDateTime: values.meeting_datetime?.toISOString(),
                requiresResponse: true,
                actions: ['accept', 'reject']
              }
            });
          });
          
          // Wait for all notifications to be sent
          const results = await Promise.allSettled(notificationPromises);
          const successCount = results.filter(r => r.status === 'fulfilled').length;
          const failureCount = results.filter(r => r.status === 'rejected').length;
          
          // Mark notifications as sent
          setNotificationsSent(prev => new Set([...prev, meetingKey]));
          
          safeLog.info(`MoM notifications completed`, {
            total: values.participants_ids.length,
            successful: successCount,
            failed: failureCount,
            meetingKey
          });
          
          if (failureCount > 0) {
            safeLog.warn('Some notifications failed to send', {
              failures: results.filter(r => r.status === 'rejected').map((r, index) => ({
                index,
                participantId: values.participants_ids[index],
                reason: r.reason
              }))
            });
          }
        }
      } catch (error) {
        safeLog.error('Failed to send notifications to participants', {
          error,
          meetingId: response.data.id,
          participantCount: values.participants_ids.length
        });
      }

      form.resetFields();
      setSelectedDepartments([]);
      setUsers([]);
      setSelectedDateTime(null);
      setNotificationsSent(new Set()); // Reset notification tracking
      if (onFinishSuccess) {
        onFinishSuccess();
      }
    } catch (error: any) {
      safeLog.error("MoM Creation error", {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
        submissionId: currentSubmissionId
      });
      if (error.response && error.response.data) {
        // Handle specific backend validation errors if available
        let errorMsg = 'Failed to schedule meeting.';
        const errors = error.response.data;
        if (typeof errors === 'object' && errors !== null) {
            Object.keys(errors).forEach(key => {
                errorMsg += ` ${key}: ${Array.isArray(errors[key]) ? errors[key].join(', ') : errors[key]}`;
            });
        } else if (typeof errors === 'string') {
            errorMsg = errors;
        }
        message.error(errorMsg);
      } else {
        message.error('Failed to schedule meeting. An unexpected error occurred.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle form validation failures
  const onFinishFailed = (errorInfo: any) => {
    safeLog.error('MomCreationForm - Form validation failed', errorInfo);
    message.error('Please fix the form errors before submitting.');
    setSubmitting(false);
  };

  if (django_user_type !== 'adminuser') {
    return (
        <Card className={`theme-card ${effectiveTheme === 'dark' ? 'dark-theme' : 'light-theme'}`}>
            <Title level={4}>Access Denied</Title>
            <p>You do not have permission to schedule Minutes of Meetings.</p>
        </Card>
    );
  }

  return (
    <Card className={`theme-card ${effectiveTheme === 'dark' ? 'dark-theme' : 'light-theme'}`}>
      <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
        Schedule New Meeting (MoM)
      </Title>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        initialValues={{ scheduled_by: schedulerUsername }}
        onValuesChange={(changedValues, allValues) => {
          if (changedValues.meeting_datetime) {
            safeLog.debug('Form field changed', {
              changed: changedValues.meeting_datetime,
              all: allValues.meeting_datetime,
              type: typeof changedValues.meeting_datetime
            });
          }
        }}
      >
      <Form.Item label="Scheduled By">
        <Input value={schedulerUsername || 'N/A'} readOnly />
      </Form.Item>

      <Form.Item
        label="Meeting Start Time"
        name="meeting_datetime"
        rules={[
          { required: true, message: 'Please select the meeting start time' },
          {
            validator: (_, value) => {
              if (!value) {
                return Promise.resolve(); // Let required rule handle empty value
              }

              console.log('Date picker value debug:', {
                value: value,
                type: typeof value,
                isDayjs: value && typeof value.format === 'function',
                isMoment: value && value._isAMomentObject
              });

              // Handle both dayjs and moment objects
              let selectedTime;
              if (value && typeof value.format === 'function') {
                if (value._isAMomentObject) {
                  selectedTime = value; // Already moment
                } else {
                  selectedTime = moment(value.toDate()); // Convert dayjs to moment
                }
              } else {
                selectedTime = moment(value); // Try to parse as moment
              }

              const currentTime = moment();

              console.log('Time validation debug:', {
                selected: selectedTime.format('YYYY-MM-DD HH:mm:ss'),
                current: currentTime.format('YYYY-MM-DD HH:mm:ss'),
                diffMinutes: selectedTime.diff(currentTime, 'minutes', true)
              });

              if (selectedTime.isBefore(currentTime)) {
                return Promise.reject(new Error('Meeting time cannot be in the past. Please select a future date and time.'));
              }

              // Check if at least 1 minute in advance (with some tolerance for seconds)
              const minimumAdvanceTime = moment().add(30, 'seconds'); // More lenient - 30 seconds
              if (selectedTime.isBefore(minimumAdvanceTime)) {
                return Promise.reject(new Error('Meeting must be scheduled at least 30 seconds in advance.'));
              }

              return Promise.resolve();
            }
          }
        ]}
        help={getDateTimeHelpText()}
      >
        <DatePicker
          showTime
          format="YYYY-MM-DD HH:mm"
          placeholder="Select future meeting date and time"
          style={{ width: '100%' }}
          onChange={(value) => {
            // Convert dayjs to moment for consistency
            const momentValue = value ? moment(value.toDate()) : null;
            setSelectedDateTime(momentValue);
          }}
          disabledDate={(current) => {
            // Disable all dates before today
            return current && current < moment().startOf('day');
          }}
          disabledTime={React.useMemo(() => (current) => {
            if (!current) return {};

            const now = moment();
            const today = now.format('YYYY-MM-DD');
            const selectedDay = current.format('YYYY-MM-DD');

            if (selectedDay !== today) return {};

            const currentHour = now.hour();
            const currentMinute = now.minute();
            const disabledHours = Array.from({ length: currentHour }, (_, i) => i);

            return {
              disabledHours: () => disabledHours,
              disabledMinutes: (selectedHour: number) => {
                if (selectedHour === currentHour) {
                  return Array.from({ length: currentMinute + 1 }, (_, i) => i);
                }
                return [];
              }
            };
          }, [])}
          showNow={false}
        />
      </Form.Item>

      <Form.Item
        label="Meeting Title"
        name="title"
        rules={[{ required: true, message: 'Please enter the meeting title' }]}
      >
        <Input placeholder="Enter meeting title" />
      </Form.Item>

        <Form.Item
          label="Agenda"
          name="agenda"
          rules={[{ required: true, message: 'Please enter the meeting agenda' }]}
        >
          <Input.TextArea rows={4} placeholder="Enter meeting agenda" />
        </Form.Item>

        <Form.Item
          label="Location"
          name="location"
          rules={[{ required: true, message: 'Please enter the meeting location' }]}
        >
          <Input placeholder="Enter meeting location" />
        </Form.Item>

        <Form.Item
          label="Select Departments for Participants"
          name="departments" // This field is just for triggering user load
          help="Select one or more departments to load participants from"
        >
          <Select
            mode="multiple"
            placeholder="Select departments (you can select multiple)"
            onChange={handleDepartmentChange}
            allowClear
            maxTagCount="responsive"
          >
            {fixedDepartments.map((dept) => (
              <Option key={dept.id} value={dept.name}>
                {dept.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
        label="Participants"
        name="participants_ids"
        rules={[{ required: true, message: 'Please select at least one participant' }]}
      >
        <Select
          mode="multiple"
          placeholder="Select participants"
          loading={loadingUsers}
          disabled={selectedDepartments.length === 0 || loadingUsers}
          filterOption={(input, option) =>
            (option?.children?.toString() ?? '').toLowerCase().includes(input.toLowerCase()) ||
            (option?.title?.toString() ?? '').toLowerCase().includes(input.toLowerCase())
          }
        >
          {users.map((user) => (
            <Option key={user.id} value={user.id} title={user.email}>
              {user.name || user.username} ({user.email})
            </Option>
          ))}
        </Select>
      </Form.Item>

        {/* Show department selection status */}
        {selectedDepartments.length > 0 && (
          <div style={{ marginBottom: 16, padding: 12, backgroundColor: 'var(--color-ui-hover)', borderRadius: 6 }}>
            <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
              <strong>Selected Departments:</strong> {selectedDepartments.join(', ')}
              <br />
              <strong>Available Participants:</strong> {users.length} users loaded
              {loadingUsers && ' (Loading...)'}
            </Typography.Text>
          </div>
        )}

        {loadingUsers && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin size="large" />
            <div style={{ marginTop: '8px' }}>Loading users from selected departments...</div>
          </div>
        )}

        <Form.Item style={{ marginTop: 24 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            style={{ width: '100%' }}
            onClick={() => {
            }}
          >
            Schedule Meeting
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default MomCreationForm;