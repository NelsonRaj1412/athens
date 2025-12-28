import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Select, Typography, Card, Spin, App } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../common/utils/axiosetup';
import useAuthStore from '../../../common/store/authStore';
//import { sendNotification, type NotificationType } from '../../../common/utils/notificationService';
import { DatePicker } from 'antd';
import moment from 'moment';
import type { Moment } from 'moment';
import { useTheme } from '@common/contexts/ThemeContext';
import PageLayout from '@common/components/PageLayout';

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
}

const fixedDepartments = [
  { id: 1, name: 'Quality' },
  { id: 2, name: 'Safety' },
  { id: 3, name: 'Inventory' },
  { id: 4, name: 'Project/Execution' },
];

const MomEdit: React.FC = () => {
  const [form] = Form.useForm();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { username: schedulerUsername, userId: schedulerUserId, django_user_type } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [selectedDateTime, setSelectedDateTime] = useState<moment.Moment | null>(null);
  const { effectiveTheme } = useTheme();

  const { message } = App.useApp();

  useEffect(() => {
    if (django_user_type !== 'adminuser') {
    }
  }, [django_user_type]);

  useEffect(() => {
    const fetchMom = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const response = await api.get(`/api/v1/mom/${id}/`);
        const momData = response.data;

        // Check if user has permission to edit
        if (!momData.can_edit) {
          message.error('You do not have permission to edit this meeting.');
          navigate('/dashboard/mom');
          return;
        }

        console.log('MOM data loaded:', {
          id: momData.id,
          title: momData.title,
          participants: momData.participants,
          participants_ids: momData.participants_ids,
          department: momData.department,
          can_edit: momData.can_edit
        });

        // Set form values
        const meetingDateTime = momData.meeting_datetime ? moment(momData.meeting_datetime) : null;
        form.setFieldsValue({
          title: momData.title,
          agenda: momData.agenda,
          meeting_datetime: meetingDateTime,
          participants_ids: momData.participants_ids || [],
        });

        // Set the selected date time for help text
        setSelectedDateTime(meetingDateTime);

        // If there are participants, extract their departments
        if (momData.participants && momData.participants.length > 0) {
          try {
            // Extract unique departments from participants (participants should include department info)
            const participantDepartments = momData.participants
              .map((participant: any) => participant.department?.name || participant.department)
              .filter((dept: string, index: number, self: string[]) => dept && self.indexOf(dept) === index); // Remove duplicates and nulls

            console.log('Participant departments extracted:', {
              participants: momData.participants.map((p: any) => ({
                id: p.id,
                name: p.name,
                department: p.department
              })),
              extractedDepartments: participantDepartments
            });

            if (participantDepartments.length > 0) {
              setSelectedDepartments(participantDepartments);
              form.setFieldsValue({
                departments: participantDepartments
              });
            }

            // Also set the users list with current participants
            setUsers(momData.participants);

          } catch (participantError) {
            // Fallback: try to use the meeting's department if available
            if (momData.department) {
              const deptName = momData.department?.name || momData.department;
              setSelectedDepartments([deptName]);
              form.setFieldsValue({
                departments: [deptName]
              });
            }
          }
        } else if (momData.participants_ids && momData.participants_ids.length > 0) {
          // Fallback: if participants_ids exist but no participant details, fetch them
          try {
            const participantPromises = momData.participants_ids.map((participantId: number) =>
              api.get(`/api/v1/users/${participantId}/`)
            );

            const participantResponses = await Promise.all(participantPromises);
            const participants = participantResponses.map(res => res.data);

            // Extract unique departments from participants
            const participantDepartments = participants
              .map(participant => participant.department?.name || participant.department)
              .filter((dept, index, self) => dept && self.indexOf(dept) === index); // Remove duplicates and nulls

            if (participantDepartments.length > 0) {
              setSelectedDepartments(participantDepartments);
              form.setFieldsValue({
                departments: participantDepartments
              });
            }

            // Also set the users list with current participants
            setUsers(participants);

          } catch (participantError) {
          }
        }

      } catch (error) {
        message.error('Failed to load meeting data.');
      } finally {
        setLoading(false);
        setIsInitialLoad(false); // Mark initial load as complete
      }
    };
    fetchMom();
  }, [id, form, message]);

  useEffect(() => {
    // Only fetch users if this is not the initial load (to avoid overriding loaded participants)
    if (selectedDepartments.length > 0 && !isInitialLoad) {
      const fetchUsersByDepartments = async () => {
        setLoadingUsers(true);
        setUsers([]);
        // Only clear participants_ids if this is a manual department change, not on initial load
        // We can track this with a ref or a flag, but for simplicity, do not clear participants_ids here
        // form.setFieldsValue({ participants_ids: [] });
        try {
          // Fetch users from all selected departments
          const allUsers: User[] = [];

          for (const department of selectedDepartments) {
            try {
              const response = await api.get<User[] | { results?: User[] }>(`/api/v1/users/?department_name=${encodeURIComponent(department)}`);
              if (response.data) {
                // Handle different response formats
                let userData: User[];
                if (Array.isArray(response.data)) {
                  userData = response.data;
                } else if (response.data && typeof response.data === 'object' && 'results' in response.data && Array.isArray(response.data.results)) {
                  userData = response.data.results;
                } else {
                  userData = [];
                }
                allUsers.push(...userData);
              }
            } catch (error) {
              message.error(`Failed to load users for department ${department}.`);
            }
          }

          // Remove duplicates based on user ID
          const uniqueUsers = allUsers.filter((user, index, self) =>
            index === self.findIndex(u => u.id === user.id)
          );

          setUsers(uniqueUsers);
        } catch (error) {
          message.error('Failed to load users from selected departments.');
        } finally {
          setLoadingUsers(false);
        }
      };
      fetchUsersByDepartments();
    } else if (!isInitialLoad) {
      setUsers([]);
    }
  }, [selectedDepartments, form, message, isInitialLoad]);

  const handleDepartmentChange = (values: string[]) => {
    setSelectedDepartments(values);
    setIsInitialLoad(false); // Mark as manual change

    // Clear current participants when departments change manually
    form.setFieldsValue({ participants_ids: [] });
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

  // Handle date/time change
  const handleDateTimeChange = (value: moment.Moment | null) => {
    setSelectedDateTime(value);
    form.setFieldsValue({ meeting_datetime: value });
  };

  const onFinish = async (values: MomFormValues) => {
    if (django_user_type !== 'adminuser') {
      message.error("You do not have permission to edit meetings.");
      return;
    }
    if (!id) {
      message.error("Invalid meeting ID.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        meeting_datetime: values.meeting_datetime ? values.meeting_datetime.toISOString() : null,
        scheduled_by: schedulerUserId,
      };
      await api.put(`/api/v1/mom/${id}/`, payload);
      message.success('Meeting updated successfully!');

      // Optionally send notifications to participants here if needed

      navigate('/dashboard/mom');
    } catch (error: any) {
      if (error.response && error.response.data) {
        let errorMsg = 'Failed to update meeting.';
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
        message.error('Failed to update meeting. An unexpected error occurred.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageLayout
        title="Edit Meeting"
        subtitle="Modify meeting details"
        breadcrumbs={[
          { title: 'MOM', href: '/dashboard/mom' },
          { title: 'Edit Meeting' }
        ]}
      >
        <div className="flex justify-center items-center min-h-64">
          <Spin tip="Loading meeting data..." size="large" />
        </div>
      </PageLayout>
    );
  }

  if (django_user_type !== 'adminuser') {
    return (
      <PageLayout
        title="Edit Meeting"
        subtitle="Access denied"
        breadcrumbs={[
          { title: 'MOM', href: '/dashboard/mom' },
          { title: 'Edit Meeting' }
        ]}
      >
        <Card className={`theme-card ${effectiveTheme === 'dark' ? 'dark-theme' : 'light-theme'}`}>
          <Title level={4}>Access Denied</Title>
          <p>You do not have permission to edit Minutes of Meetings.</p>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Edit Meeting"
      subtitle="Modify meeting details and participants"
      breadcrumbs={[
        { title: 'MOM', href: '/dashboard/mom' },
        { title: 'Edit Meeting' }
      ]}
    >
      <Card
        className={`theme-card ${effectiveTheme === 'dark' ? 'dark-theme' : 'light-theme'}`}
        bordered={false}
      >
      <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
        Edit Meeting (MoM)
      </Title>
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ scheduled_by: schedulerUsername }}>
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

                const selectedTime = moment(value);
                const currentTime = moment();

                if (selectedTime.isBefore(currentTime)) {
                  return Promise.reject(new Error('Meeting time cannot be in the past. Please select a future date and time.'));
                }

                // Optional: Add minimum advance notice (e.g., at least 1 minute from now)
                const minimumAdvanceTime = moment().add(1, 'minute');
                if (selectedTime.isBefore(minimumAdvanceTime)) {
                  return Promise.reject(new Error('Meeting must be scheduled at least 1 minute in advance.'));
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
            onChange={handleDateTimeChange}
            disabledDate={(current) => {
              // Disable all dates before today
              return current && current < moment().startOf('day');
            }}
            disabledTime={(current) => {
              // If the selected date is today, disable past hours and minutes
              if (!current) {
                return {}; // No restrictions if no date selected
              }

              const now = moment();
              const today = now.format('YYYY-MM-DD');
              const selectedDay = current.format('YYYY-MM-DD');

              // Only apply time restrictions if the selected date is today
              if (selectedDay !== today) {
                return {}; // No time restrictions for future dates
              }

              const currentHour = now.hour();
              const currentMinute = now.minute();

              return {
                disabledHours: () => {
                  const hours = [];
                  for (let i = 0; i < currentHour; i++) {
                    hours.push(i);
                  }
                  return hours;
                },
                disabledMinutes: (selectedHour: number) => {
                  if (selectedHour === currentHour) {
                    const minutes = [];
                    for (let i = 0; i <= currentMinute; i++) { // Only disable current and past minutes
                      minutes.push(i);
                    }
                    return minutes;
                  }
                  return [];
                }
              };
            }}
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
          label="Select Departments for Participants"
          name="departments"
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

        {loadingUsers && <Spin tip="Loading users from selected departments..." />}

        <Form.Item style={{ marginTop: 24 }}>
          <Button type="primary" htmlType="submit" loading={submitting} style={{ width: '100%' }}>
            Update Meeting
          </Button>
        </Form.Item>
      </Form>
      </Card>
    </PageLayout>
  );
};

export default MomEdit;
