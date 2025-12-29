import React, { useEffect, useState, useCallback } from 'react';
import { Table, App, Tag, Avatar, Typography, Image, Space } from 'antd';
import { UserOutlined, CalendarOutlined, EnvironmentOutlined, TeamOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import api from '@common/utils/axiosetup';
import PageLayout from '@common/components/PageLayout';

const { Title, Text } = Typography;

const PageContainer = styled.div`
  width: 100%;
`;

const ListCard = styled.div`
  background-color: var(--color-ui-base);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-md);
`;

const StatsContainer = styled.div`
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

const StatCard = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 12px;
  min-width: 200px;
  text-align: center;
`;

interface TrainedPersonnel {
  id: number;
  name: string;
  personnel_type: 'worker' | 'user';
  training_date: string;
  training_location: string;
  conductor_name: string;
  match_score?: number;
  worker_photo?: string;
  attendance_photo?: string;
}

const InductionTrainedPersonnelList: React.FC = () => {
  const { message } = App.useApp();
  const [personnel, setPersonnel] = useState<TrainedPersonnel[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [stats, setStats] = useState({
    total: 0,
    workers: 0,
    employees: 0,
    thisMonth: 0
  });

  const fetchTrainedPersonnel = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/induction/api/trained-personnel/');
      console.log('Trained Personnel Response:', response.data);
      
      // Handle the response structure from the backend
      const responseData = response.data;
      const trainedPersonnelList = responseData.trained_personnel || [];
      
      const data = trainedPersonnelList.map((person: any, index: number) => ({
        ...person,
        key: `${person.participant_type || 'unknown'}-${person.id || index}`,
        personnel_type: person.participant_type || 'worker',
        conductor_name: person.conducted_by || 'N/A',
        training_location: person.training_location || 'N/A'
      }));
      
      setPersonnel(data);
      
      // Use statistics from backend response
      const stats = {
        total: responseData.total_trained || 0,
        workers: responseData.workers_trained || 0,
        employees: responseData.employees_trained || 0,
        thisMonth: data.filter((p: any) => {
          if (!p.training_date) return false;
          const trainingDate = new Date(p.training_date);
          const now = new Date();
          return trainingDate.getMonth() === now.getMonth() && 
                 trainingDate.getFullYear() === now.getFullYear();
        }).length
      };
      
      setStats(stats);
    } catch (error) {
      message.error('Failed to fetch trained personnel data');
      console.error('Error fetching trained personnel:', error);
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchTrainedPersonnel();
  }, [fetchTrainedPersonnel]);

  const getPersonnelTypeTag = (type: string) => {
    if (type === 'worker') {
      return <Tag color="blue" icon={<TeamOutlined />}>Worker</Tag>;
    } else {
      return <Tag color="purple" icon={<UserOutlined />}>Employee</Tag>;
    }
  };

  const getMatchScoreTag = (score?: number) => {
    if (!score) return null;
    
    let color = 'default';
    if (score >= 0.8) color = 'success';
    else if (score >= 0.6) color = 'warning';
    else color = 'error';
    
    return <Tag color={color}>{(score * 100).toFixed(1)}% Match</Tag>;
  };

  const columns = [
    {
      title: 'Personnel',
      key: 'personnel',
      render: (record: TrainedPersonnel) => (
        <Space>
          {record.worker_photo ? (
            <Avatar src={record.worker_photo} size={40} />
          ) : (
            <Avatar icon={<UserOutlined />} size={40} />
          )}
          <div>
            <div style={{ fontWeight: 500 }}>{record.name}</div>
            {getPersonnelTypeTag(record.personnel_type)}
          </div>
        </Space>
      ),
    },
    {
      title: 'Training Date',
      dataIndex: 'training_date',
      key: 'training_date',
      render: (date: string) => (
        <Space>
          <CalendarOutlined />
          {new Date(date).toLocaleDateString()}
        </Space>
      ),
      sorter: (a: TrainedPersonnel, b: TrainedPersonnel) => 
        new Date(a.training_date).getTime() - new Date(b.training_date).getTime(),
    },
    {
      title: 'Location',
      dataIndex: 'training_location',
      key: 'training_location',
      render: (location: string) => (
        <Space>
          <EnvironmentOutlined />
          {location}
        </Space>
      ),
    },
    {
      title: 'Conducted By',
      dataIndex: 'conductor_name',
      key: 'conductor_name',
    },
    {
      title: 'Match Score',
      key: 'match_score',
      render: (record: TrainedPersonnel) => getMatchScoreTag(record.match_score),
    },
    {
      title: 'Photos',
      key: 'photos',
      render: (record: TrainedPersonnel) => (
        <Space>
          {record.worker_photo && (
            <Image
              width={30}
              height={30}
              src={record.worker_photo}
              style={{ borderRadius: '4px' }}
              preview={{
                mask: 'Worker Photo'
              }}
            />
          )}
          {record.attendance_photo && (
            <Image
              width={30}
              height={30}
              src={record.attendance_photo}
              style={{ borderRadius: '4px' }}
              preview={{
                mask: 'Attendance Photo'
              }}
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageLayout
      title="Induction Trained Personnel"
      subtitle="Complete list of all personnel who have completed induction training"
      breadcrumbs={[
        { title: 'Training' },
        { title: 'Induction Training' },
        { title: 'Trained Personnel' }
      ]}
    >
      <PageContainer>
        <StatsContainer>
          <StatCard>
            <Title level={2} style={{ color: 'white', margin: 0 }}>{stats.total}</Title>
            <Text style={{ color: 'white' }}>Total Trained</Text>
          </StatCard>
          <StatCard>
            <Title level={2} style={{ color: 'white', margin: 0 }}>{stats.workers}</Title>
            <Text style={{ color: 'white' }}>Workers</Text>
          </StatCard>
          <StatCard>
            <Title level={2} style={{ color: 'white', margin: 0 }}>{stats.employees}</Title>
            <Text style={{ color: 'white' }}>Employees</Text>
          </StatCard>
          <StatCard>
            <Title level={2} style={{ color: 'white', margin: 0 }}>{stats.thisMonth}</Title>
            <Text style={{ color: 'white' }}>This Month</Text>
          </StatCard>
        </StatsContainer>

        <ListCard>
          <Table
            columns={columns}
            dataSource={personnel}
            loading={loading}
            rowKey="key"
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} trained personnel`,
              pageSizeOptions: ['10', '20', '50', '100'],
            }}
            scroll={{ x: 'max-content' }}
          />
        </ListCard>
      </PageContainer>
    </PageLayout>
  );
};

export default InductionTrainedPersonnelList;