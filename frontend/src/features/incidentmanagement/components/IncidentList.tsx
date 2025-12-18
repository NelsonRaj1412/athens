import React, { useState, useCallback, useEffect } from 'react';
import './IncidentList.css'; // We'll create this file for custom styles
import {
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Tooltip,
  Modal,
  message,
  Dropdown,
  Menu,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  ReloadOutlined,
  MoreOutlined,
  UserAddOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useIncidents } from '../hooks/useIncidents';
import {
  IncidentListItem,
  IncidentFilters,
  INCIDENT_TYPES,
  SEVERITY_LEVELS,
  INCIDENT_STATUSES,
  RISK_LEVELS,
  BUSINESS_IMPACT_LEVELS,
  UserPermissions,
} from '../types';
import useAuthStore from '../../../common/store/authStore';
import { usePermissionControl } from '../../../hooks/usePermissionControl';
import PermissionRequestModal from '../../../components/permissions/PermissionRequestModal';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface IncidentListProps {
  onCreateIncident?: () => void;
  onViewIncident?: (incident: IncidentListItem) => void;
  onEditIncident?: (incident: IncidentListItem) => void;

  refreshTrigger?: number; // Add refresh trigger prop
  showMyAssignments?: boolean; // Filter for current user's assignments
  currentUserId?: string | number | null; // Current logged-in user ID
  currentUsername?: string | null; // Current logged-in username
  onAssignmentCountChange?: (count: number) => void; // Callback for assignment count
}

const IncidentList: React.FC<IncidentListProps> = ({
  onCreateIncident,
  onViewIncident,
  onEditIncident,

  refreshTrigger,
  showMyAssignments = false,
  currentUserId,
  currentUsername,
  onAssignmentCountChange,
}) => {
  const [filters, setFilters] = useState<IncidentFilters>({});
  const [searchText, setSearchText] = useState('');
  const { usertype, django_user_type } = useAuthStore();
  const {
    requestPermission,
    hasPermission,
    isModalVisible,
    setIsModalVisible,
    currentRequest,
    isLoading: permissionLoading
  } = usePermissionControl();
  
  const {
    incidents,
    loading,
    pagination,
    setPage,
    setFilters: updateFilters,
    refetch,
    deleteIncident,

    closeIncident,
  } = useIncidents({ filters });

  // Refresh incidents when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  // Debug current user and filter information
  useEffect(() => {
    console.log('User filter debug:', {
      currentUserId,
      currentUsername,
      showMyAssignments
    });
    if (incidents && incidents.length > 0) {
      
      // Debug commercial grade fields
      console.log('Commercial grade fields:', {
        risk_level: incidents[0].risk_level,
        risk_matrix_score: incidents[0].risk_matrix_score,
        priority_score: incidents[0].priority_score,
        estimated_cost: incidents[0].estimated_cost,
        business_impact: incidents[0].business_impact,
        regulatory_reportable: incidents[0].regulatory_reportable,
        escalation_level: incidents[0].escalation_level
      });
      
      // Check if fields exist in object
      const hasCommercialFields = [
        'risk_level', 'risk_matrix_score', 'priority_score', 'estimated_cost',
        'business_impact', 'regulatory_reportable', 'escalation_level'
      ].every(field => field in incidents[0]);
      
      console.log('Has commercial fields:', hasCommercialFields);

      // Debug all investigator fields in all incidents
      incidents.forEach((incident, index) => {
        console.log(`Incident ${index} investigator:`, {
          assigned_investigator: incident.assigned_investigator,
        });
      });
    }
  }, [currentUserId, currentUsername, showMyAssignments, incidents]);

  // Calculate assignment count and filter incidents
 const { filteredIncidents, myAssignmentCount } = React.useMemo(() => {
    if (!incidents) return { filteredIncidents: [], myAssignmentCount: 0 };

    // This correctly calculates the assignment count using the user ID
    const myIncidents = incidents.filter(incident => 
        currentUserId != null && String(incident.assigned_investigator) === String(currentUserId)
    );
    const assignmentCount = myIncidents.length;

    // This correctly filters the displayed data based on the prop
    const finalIncidents = showMyAssignments ? myIncidents : incidents;
    
    // Your data cleanup can remain if you need it
    finalIncidents.forEach(incident => {
        if (typeof incident.days_since_reported === 'string') {
            incident.days_since_reported = Number(incident.days_since_reported);
        }
        if (incident.date_time_incident == null) {
            incident.date_time_incident = '';
        }
    });

    return { filteredIncidents: finalIncidents, myAssignmentCount: assignmentCount };
}, [incidents, showMyAssignments, currentUserId]);


  // Report assignment count to parent component
  React.useEffect(() => {
    if (onAssignmentCountChange) {
      onAssignmentCountChange(myAssignmentCount);
    }
  }, [myAssignmentCount, onAssignmentCountChange]);

  const handleSearch = useCallback((value: string) => {
    setSearchText(value);
    updateFilters({ ...filters, search: value });
  }, [filters, updateFilters]);

  const handleFilterChange = useCallback((key: keyof IncidentFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    updateFilters(newFilters);
  }, [filters, updateFilters]);

  const handleDateRangeChange = useCallback((dates: any) => {
    const newFilters = {
      ...filters,
      date_from: dates?.[0]?.format('YYYY-MM-DD'),
      date_to: dates?.[1]?.format('YYYY-MM-DD'),
    };
    setFilters(newFilters);
    updateFilters(newFilters);
  }, [filters, updateFilters]);

    const handleEdit = useCallback(async (incident: IncidentListItem) => {
    const hasEditPermission = await hasPermission(incident.id, 'edit', 'incident');
    if (hasEditPermission) {
      onEditIncident?.(incident);
    } else {
      await requestPermission(incident.id, 'edit', 'incident', `Edit incident: ${incident.title}`);
    }
  }, [hasPermission, requestPermission, onEditIncident]);

  const handleDelete = useCallback(async (incident: IncidentListItem) => {
    const hasDeletePermission = await hasPermission(incident.id, 'delete', 'incident');
    if (!hasDeletePermission) {
      await requestPermission(incident.id, 'delete', 'incident', `Delete incident: ${incident.title}`);
      return;
    }

    try {
      await Modal.confirm({
        title: 'Delete Incident',
        content: `Are you sure you want to delete incident ${incident.incident_id}?`,
        okText: 'Delete',
        okType: 'danger',
        cancelText: 'Cancel',
      });

      const success = await deleteIncident(incident.id);
      
      if (success) {
        message.success('Incident deleted successfully');
        refetch();
      } else {
        message.error('Failed to delete incident. Please try again.');
      }

    } catch (error) {
      if (error === 'cancel') {
      } else {
        message.error('An error occurred while deleting the incident.');
      }
    }
  }, [hasPermission, requestPermission, deleteIncident, refetch]);

  const handleCloseIncident = useCallback(async (incident: IncidentListItem) => {
    Modal.confirm({
      title: 'Close Incident',
      content: `Are you sure you want to close incident ${incident.incident_id}?`,
      okText: 'Close',
      cancelText: 'Cancel',
      onOk: async () => {
        const success = await closeIncident(incident.id);
        if (success) {
          message.success('Incident closed successfully');
        }
      },
    });
  }, [closeIncident]);

  const getSeverityColor = (severity: string) => {
    const severityConfig = SEVERITY_LEVELS.find(s => s.value === severity);
    return severityConfig?.color || 'default';
  };

  const getStatusColor = (status: string) => {
    const statusConfig = INCIDENT_STATUSES.find(s => s.value === status);
    return statusConfig?.color || 'default';
  };

  // Check if current user can delete this incident
  const canDeleteIncident = (incident: IncidentListItem) => {
    // Master admin can delete any incident
    if (django_user_type === 'projectadmin') return true;
    
    // For now, allow deletion based on current user type
    // This will be enforced by backend permissions
    return usertype === 'contractor' || usertype === 'client' || usertype === 'epc';
  };

  const getActionMenu = (incident: IncidentListItem) => {
    const items: any[] = [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'View Details',
        onClick: () => onViewIncident?.(incident)
      },
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: 'Edit',
        disabled: incident.status === 'closed',
        onClick: () => handleEdit(incident)
      }
    ];

    if (incident.status !== 'closed') {
      items.push({
        key: 'close',
        icon: <CloseOutlined />,
        label: 'Close Incident',
        onClick: () => handleCloseIncident(incident)
      });
    }

    items.push({ type: 'divider' });

    if (canDeleteIncident(incident)) {
      items.push({
        key: 'delete',
        icon: <DeleteOutlined />,
        label: 'Delete',
        danger: true,
        onClick: () => handleDelete(incident)
      });
    }

    return <Menu items={items} />;
  };

  const columns: ColumnsType<IncidentListItem> = [
    {
      title: 'Incident ID',
      dataIndex: 'incident_id',
      key: 'incident_id',
      width: 120,
      fixed: 'left',
      render: (text: string) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{text}</span>
      ),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: {
        showTitle: false,
      },
      render: (text: string) => (
        <Tooltip placement="topLeft" title={text}>
          {text}
        </Tooltip>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'incident_type',
      key: 'incident_type',
      width: 120,
      render: (type: string) => {
        const typeConfig = INCIDENT_TYPES.find(t => t.value === type);
        return (
          <Tag>
            {typeConfig?.icon} {typeConfig?.label || type}
          </Tag>
        );
      },
    },
    {
      title: 'Severity',
      dataIndex: 'severity_level',
      key: 'severity_level',
      width: 100,
      render: (severity: string) => (
        <Tag color={getSeverityColor(severity)}>
          {SEVERITY_LEVELS.find(s => s.value === severity)?.label || severity}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {INCIDENT_STATUSES.find(s => s.value === status)?.label || status}
        </Tag>
      ),
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      width: 120,
    },
    {
      title: 'Reporter',
      dataIndex: 'reporter_name',
      key: 'reporter_name',
      width: 120,
      ellipsis: true,
    },
    {
      title: 'Investigator',
      dataIndex: 'assigned_investigator_details',
      key: 'investigator',
      width: 120,
      render: (investigator: any) => (
        investigator ? (
          <Tag color="blue">{investigator.full_name}</Tag>
        ) : (
          <Tag color="orange">Unassigned</Tag>
        )
      ),
    },
      {
        title: 'Date',
        dataIndex: 'date_time_incident',
        key: 'date_time_incident',
        width: 120,
        render: (date: string | undefined | null) => dayjs(date ?? '').format('MMM DD, YYYY'),
        sorter: true,
      },
      {
        title: 'Days Since',
        dataIndex: 'days_since_reported',
        key: 'days_since_reported',
        width: 100,
        render: (days: number | undefined | null) => (
          <Badge
            count={days ?? 0}
            style={{
              backgroundColor: (days ?? 0) > 7 ? '#ff4d4f' : (days ?? 0) > 3 ? '#faad14' : '#52c41a'
            }}
          />
        ),
      },
    // === COMMERCIAL GRADE COLUMNS ===
    {
      title: 'Risk Level',
      dataIndex: 'risk_level',
      key: 'risk_level',
      width: 100,
      render: (riskLevel: string) => {
        if (!riskLevel) return <Tag color="default">Not Assessed</Tag>;
        const riskConfig = RISK_LEVELS.find(r => r.value === riskLevel);
        return (
          <Tag color={riskConfig?.color}>
            {riskConfig?.label || riskLevel}
          </Tag>
        );
      },
    },
    {
      title: 'Risk Score',
      dataIndex: 'risk_matrix_score',
      key: 'risk_matrix_score',
      width: 90,
      render: (score: number) => (
        score ? (
          <Badge
            count={score}
            style={{
              backgroundColor: score >= 16 ? '#ff4d4f' : score >= 9 ? '#faad14' : '#52c41a'
            }}
          />
        ) : (
          <span style={{ color: '#8c8c8c' }}>-</span>
        )
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority_score',
      key: 'priority_score',
      width: 80,
      render: (priority: number) => (
        priority ? (
          <Badge
            count={priority}
            style={{
              backgroundColor: priority >= 15 ? '#ff4d4f' : priority >= 10 ? '#faad14' : '#1890ff'
            }}
          />
        ) : (
          <span style={{ color: '#8c8c8c' }}>-</span>
        )
      ),
    },
    {
      title: 'Est. Cost',
      dataIndex: 'estimated_cost',
      key: 'estimated_cost',
      width: 100,
      render: (cost: number) => (
        cost ? (
          <span style={{
            color: cost >= 50000 ? '#ff4d4f' : cost >= 10000 ? '#faad14' : '#52c41a',
            fontWeight: 'bold'
          }}>
            ${cost.toLocaleString()}
          </span>
        ) : (
          <span style={{ color: '#8c8c8c' }}>-</span>
        )
      ),
    },
    {
      title: 'Business Impact',
      dataIndex: 'business_impact',
      key: 'business_impact',
      width: 120,
      render: (impact: string) => {
        if (!impact) return <span style={{ color: '#8c8c8c' }}>-</span>;
        const impactConfig = BUSINESS_IMPACT_LEVELS.find(b => b.value === impact);
        return (
          <Tag color={impactConfig?.color}>
            {impactConfig?.label || impact}
          </Tag>
        );
      },
    },
    {
      title: 'Regulatory',
      dataIndex: 'regulatory_reportable',
      key: 'regulatory_reportable',
      width: 90,
      render: (reportable: boolean) => (
        reportable ? (
          <Tag color="red">Required</Tag>
        ) : (
          <Tag color="green">Internal</Tag>
        )
      ),
    },
    {
      title: 'Escalation',
      dataIndex: 'escalation_level',
      key: 'escalation_level',
      width: 90,
      render: (level: number) => (
        level ? (
          <Badge
            count={level}
            style={{
              backgroundColor: level >= 4 ? '#ff4d4f' : level >= 3 ? '#faad14' : '#52c41a'
            }}
          />
        ) : (
          <Badge count={1} style={{ backgroundColor: '#52c41a' }} />
        )
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_: any, record) => (
        <Dropdown overlay={getActionMenu(record)} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header Actions */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Incident Management</h3>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onCreateIncident}
          >
            Create Incident
          </Button>
          <Button icon={<ReloadOutlined />} onClick={refetch}>
            Refresh
          </Button>
          <Button icon={<ExportOutlined />}>
            Export
          </Button>
        </Space>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: 16, padding: '16px', backgroundColor: '#fff', borderRadius: '8px' }}>
        <Row gutter={16}>
          <Col xs={24} sm={8} md={6}>
            <Search
              placeholder="Search incidents..."
              allowClear
              onSearch={handleSearch}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Select
              placeholder="Type"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => handleFilterChange('incident_type', value)}
            >
              {INCIDENT_TYPES.map(type => (
                <Option key={type.value} value={type.value}>
                  {type.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Select
              placeholder="Severity"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => handleFilterChange('severity_level', value)}
            >
              {SEVERITY_LEVELS.map(level => (
                <Option key={level.value} value={level.value}>
                  {level.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Select
              placeholder="Status"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => handleFilterChange('status', value)}
            >
              {INCIDENT_STATUSES.map(status => (
                <Option key={status.value} value={status.value}>
                  {status.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={16} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              onChange={handleDateRangeChange}
              placeholder={['Start Date', 'End Date']}
            />
          </Col>
        </Row>
      </div>

      {/* Table Container */}
      <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
        <Table
          columns={columns}
          dataSource={filteredIncidents}
          rowKey="id"
          loading={loading}
          rowClassName={(record) => {
            const isAssignedToMe = currentUserId != null && 
                                   record.assigned_investigator != null && 
                                   String(record.assigned_investigator) === String(currentUserId);
            
            return isAssignedToMe ? 'incident-assigned-to-me' : '';
          }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} incidents`,
            onChange: setPage,
          }}
          scroll={{ x: 2200, y: 'calc(100vh - 350px)' }}
          size="middle"
        />
      </div>
      
      <PermissionRequestModal
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        request={currentRequest}
        loading={permissionLoading}
      />
    </div>
  );
};

export default IncidentList;