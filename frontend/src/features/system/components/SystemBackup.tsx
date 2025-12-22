import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Table, Progress, Tag, Space, message, Modal, Form, Select, Input, Upload } from 'antd';
import { DownloadOutlined, UploadOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadRequestOption } from 'rc-upload/lib/interface';
import { listBackups, createBackup, deleteBackup, restoreBackup, downloadBackup, uploadBackup } from '../api';
import PageLayout from '@common/components/PageLayout';

const { confirm } = Modal;

interface BackupEntry {
  id: string;
  name: string;
  type: 'full' | 'incremental' | 'differential';
  size: string;
  created_at: string;
  status: 'completed' | 'in_progress' | 'failed';
  progress?: number;
}

const SystemBackup: React.FC = () => {
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Loaded from API

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const { data } = await listBackups();
      const rows = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      setBackups(rows);
    } catch (error: any) {
      console.error('Failed to load backups:', error);
      setBackups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async (values: any) => {
    try {
      await createBackup(values);
      message.success('Backup started successfully');
      setCreateModalVisible(false);
      form.resetFields();
      loadBackups();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to start backup');
    }
  };

  const handleDownload = async (backup: BackupEntry) => {
    let url: string | null = null;
    try {
      const { data } = await downloadBackup(backup.id);
      url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${backup.name}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to download backup');
    } finally {
      if (url) {
        window.URL.revokeObjectURL(url);
      }
    }
  };

  const handleDelete = (backup: BackupEntry) => {
    confirm({
      title: 'Delete Backup',
      content: `Are you sure you want to delete backup "${backup.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      async onOk() {
        try {
          await deleteBackup(backup.id);
          message.success('Backup deleted successfully');
          loadBackups();
        } catch (error: any) {
          message.error(error.response?.data?.error || 'Failed to delete backup');
        }
      },
    });
  };

  const handleRestore = (backup: BackupEntry) => {
    confirm({
      title: 'Restore Backup',
      content: `Are you sure you want to restore from backup "${backup.name}"? This will overwrite current data.`,
      okText: 'Restore',
      okType: 'danger',
      async onOk() {
        try {
          await restoreBackup(backup.id);
          message.success('Restore started successfully');
        } catch (error: any) {
          message.error(error.response?.data?.error || 'Failed to start restore');
        }
      },
    });
  };

  const getStatusColor = useCallback((status: string) => {
    const colors = {
      completed: 'green',
      in_progress: 'blue',
      failed: 'red'
    };
    return colors[status as keyof typeof colors] || 'default';
  }, []);

  const getTypeColor = useCallback((type: string) => {
    const colors = {
      full: 'purple',
      incremental: 'blue',
      differential: 'orange'
    };
    return colors[type as keyof typeof colors] || 'default';
  }, []);

  const columns: ColumnsType<BackupEntry> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => (
        <Tag color={getTypeColor(type)}>{type.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Size',
      dataIndex: 'size',
      key: 'size',
      width: 100,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string, record: BackupEntry) => (
        <div>
          <Tag color={getStatusColor(status)}>
            {status.replace('_', ' ').toUpperCase()}
          </Tag>
          {status === 'in_progress' && record.progress && (
            <Progress 
              percent={record.progress} 
              size="small" 
              style={{ marginTop: 4 }}
            />
          )}
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: any, record: BackupEntry) => (
        <Space>
          {record.status === 'completed' && (
            <>
              <Button 
                size="small" 
                icon={<DownloadOutlined />}
                onClick={() => handleDownload(record)}
              >
                Download
              </Button>
              <Button 
                size="small" 
                type="primary"
                onClick={() => handleRestore(record)}
              >
                Restore
              </Button>
            </>
          )}
          <Button 
            size="small" 
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
            disabled={record.status === 'in_progress'}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageLayout
      title="System Backup"
      subtitle="Manage system backups and restore points"
    >
      <div className="mb-4">
        <Space>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            Create Backup
          </Button>
          <Upload
            beforeUpload={() => false}
            showUploadList={false}
            customRequest={async (options: UploadRequestOption) => {
              try {
                await uploadBackup(options.file as File);
                message.success('Backup uploaded successfully');
                loadBackups();
                options.onSuccess && options.onSuccess({}, options.file);
              } catch (e: any) {
                message.error(e.response?.data?.error || 'Failed to upload backup');
                options.onError && options.onError(e);
              }
            }}
          >
            <Button icon={<UploadOutlined />}>Upload Backup</Button>
          </Upload>
        </Space>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={backups}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} backups`,
          }}
        />
      </Card>

      <Modal
        title="Create New Backup"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateBackup}
        >
          <Form.Item
            label="Backup Name"
            name="name"
            rules={[{ required: true, message: 'Please enter backup name' }]}
          >
            <Input placeholder="Enter backup name" />
          </Form.Item>

          <Form.Item
            label="Backup Type"
            name="type"
            rules={[{ required: true, message: 'Please select backup type' }]}
          >
            <Select placeholder="Select backup type">
              <Select.Option value="full">Full Backup</Select.Option>
              <Select.Option value="incremental">Incremental Backup</Select.Option>
              <Select.Option value="differential">Differential Backup</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
          >
            <Input.TextArea
              rows={3}
              placeholder="Optional description"
            />
          </Form.Item>

          <div className="flex justify-end gap-2">
            <Button onClick={() => setCreateModalVisible(false)}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit">
              Create Backup
            </Button>
          </div>
        </Form>
      </Modal>
    </PageLayout>
  );
};

export default SystemBackup;
