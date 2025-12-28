import React, { useEffect, useState } from 'react';
import {
  Card, Typography, Table, Space, Button, message, Tag, Alert, DatePicker, Statistic, Row, Col
} from 'antd';
import {
  ReloadOutlined, CalendarOutlined, UserOutlined, TeamOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '@common/utils/axiosetup';
import PageLayout from '@common/components/PageLayout';
import useAuthStore from '@common/store/authStore';

const { Text, Title } = Typography;

// Interfaces
interface AttendanceRecord {
  id: string;
  name: string;
  employee_id: string;
  type: 'worker' | 'employee';
  attendance_sources: string[];
  clock_in_time?: string;
  clock_out_time?: string;
  working_hours?: string;
  status: string;
  photo?: string;
  tbt_sessions?: Array<{
    title: string;
    time: string;
    match_score: number;
  }>;
  training_sessions?: Array<{
    title: string;
    time: string;
    match_score: number;
  }>;
}

interface ConsolidatedAttendanceResponse {
  date: string;
  project: string;
  summary: {
    total_attendees: number;
    workers_count: number;
    employees_count: number;
    attendance_sources: Record<string, number>;
  };
  attendance_records: AttendanceRecord[];
}

const ConsolidatedManpowerView: React.FC = () => {
  const { django_user_type, usertype } = useAuthStore();

  // State
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [attendanceData, setAttendanceData] = useState<ConsolidatedAttendanceResponse | null>(null);

  // Permission check
  const canViewReports = ['clientuser', 'epcuser', 'contractoruser', 'adminuser'].includes(django_user_type || '') ||
    ['client', 'epc', 'contractor'].includes(usertype || '');

  // Load data
  useEffect(() => {
    if (canViewReports) {
      loadConsolidatedAttendance();
    }
  }, [canViewReports, selectedDate]);

  const loadConsolidatedAttendance = async () => {
    setLoading(true);
    try {
      const response = await api.get('/man/consolidated-attendance/', {
        params: {
          date: selectedDate.format('YYYY-MM-DD')
        }
      });

      setAttendanceData(response.data);
      message.success(`Loaded attendance for ${response.data.attendance_records.length} people`);

    } catch (error: any) {
      console.error('Failed to load consolidated attendance:', error);
      
      if (error.response?.status === 401) {
        message.error('Authentication required. Please log in again.');
      } else if (error.response?.status === 403) {
        message.error('You do not have permission to view attendance data.');
      } else {
        message.error(`Failed to load attendance data: ${error.message}`);
      }
      setAttendanceData(null);
    } finally {
      setLoading(false);
    }
  };

  // Table columns
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: AttendanceRecord) => (
        <Space>
          <span>{name}</span>
          <Tag color={record.type === 'worker' ? 'blue' : 'green'}>
            {record.type === 'worker' ? 'Worker' : 'Employee'}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Employee ID',
      dataIndex: 'employee_id',
      key: 'employee_id',
      render: (id: string) => id || '-',
    },
    {
      title: 'Attendance Sources',
      dataIndex: 'attendance_sources',
      key: 'attendance_sources',
      render: (sources: string[]) => (
        <Space wrap>
          {sources.map(source => {
            const colors = {
              clock_in: 'green',
              tbt: 'blue',
              training: 'orange'
            };
            const labels = {
              clock_in: 'Clock In/Out',
              tbt: 'TBT Session',
              training: 'Training'
            };
            return (
              <Tag key={source} color={colors[source as keyof typeof colors]}>
                {labels[source as keyof typeof labels] || source}
              </Tag>
            );
          })}
        </Space>
      ),
    },
    {
      title: 'Clock In/Out',
      key: 'clock_times',
      render: (record: AttendanceRecord) => {
        if (!record.clock_in_time) return '-';
        return (
          <div>
            <div>In: {dayjs(record.clock_in_time).format('HH:mm')}</div>
            {record.clock_out_time && (
              <div>Out: {dayjs(record.clock_out_time).format('HH:mm')}</div>
            )}
            {record.working_hours && (
              <Text type="secondary">({record.working_hours})</Text>
            )}
          </div>
        );
      },
    },
    {
      title: 'TBT Sessions',
      key: 'tbt_sessions',
      render: (record: AttendanceRecord) => {
        if (!record.tbt_sessions || record.tbt_sessions.length === 0) return '-';
        return (
          <div>
            {record.tbt_sessions.map((session, index) => (
              <div key={index}>
                <Text strong>{session.title}</Text>
                <br />
                <Text type="secondary">
                  {dayjs(session.time).format('HH:mm')} 
                  {session.match_score > 0 && ` (${session.match_score}% match)`}
                </Text>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      title: 'Training Sessions',
      key: 'training_sessions',
      render: (record: AttendanceRecord) => {
        if (!record.training_sessions || record.training_sessions.length === 0) return '-';
        return (
          <div>
            {record.training_sessions.map((session, index) => (
              <div key={index}>
                <Text strong>{session.title}</Text>
                <br />
                <Text type="secondary">
                  {dayjs(session.time).format('MMM DD')}
                  {session.match_score > 0 && ` (${session.match_score}% match)`}
                </Text>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors = {
          present: 'green',
          checked_in: 'blue',
          checked_out: 'green',
          absent: 'red'
        };
        return (
          <Tag color={colors[status as keyof typeof colors] || 'default'}>
            {status.replace('_', ' ').toUpperCase()}
          </Tag>
        );
      },
    },
  ];

  if (!canViewReports) {
    return (
      <PageLayout title="Access Denied">
        <Alert
          message="Permission Denied"
          description="You don't have permission to view manpower reports."
          type="error"
          showIcon
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Manpower Records"
      subtitle="Consolidated attendance from all sources - no duplicates"
      actions={
        <Space>
          <DatePicker
            value={selectedDate}
            onChange={(date) => date && setSelectedDate(date)}
            format="YYYY-MM-DD"
            allowClear={false}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={loadConsolidatedAttendance}
            loading={loading}
          >
            Refresh
          </Button>
        </Space>
      }
    >
      {/* Summary Statistics */}
      {attendanceData && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Attendees"
                value={attendanceData.summary.total_attendees}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Workers"
                value={attendanceData.summary.workers_count}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Employees"
                value={attendanceData.summary.employees_count}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Clock-ins"
                value={attendanceData.summary.attendance_sources.clock_in || 0}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Attendance Sources Summary */}
      {attendanceData && (
        <Card style={{ marginBottom: 16 }}>
          <Title level={5}>Attendance Sources for {attendanceData.date}</Title>
          <Space wrap>
            {Object.entries(attendanceData.summary.attendance_sources).map(([source, count]) => {
              const colors = {
                clock_in: 'green',
                tbt: 'blue',
                training: 'orange'
              };
              const labels = {
                clock_in: 'Clock In/Out',
                tbt: 'TBT Sessions',
                training: 'Training Sessions'
              };
              return (
                <Tag key={source} color={colors[source as keyof typeof colors]} style={{ fontSize: '14px', padding: '4px 8px' }}>
                  {labels[source as keyof typeof labels] || source}: {count}
                </Tag>
              );
            })}
          </Space>
        </Card>
      )}

      {/* Attendance Records Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={attendanceData?.attendance_records || []}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} attendees`,
          }}
          scroll={{ x: 1400 }}
          locale={{
            emptyText: loading ? 'Loading...' : 'No attendance records found for this date'
          }}
        />
      </Card>
    </PageLayout>
  );
};

export default ConsolidatedManpowerView;