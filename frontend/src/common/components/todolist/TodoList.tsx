import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, DatePicker, Select, Space, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import moment from 'moment';
// Removed unused import of Moment type to fix TS warning

const { Option } = Select;

interface TodoItem {
  key: string;
  date: string; // creation date ISO string
  dueDate: string; // due date ISO string
  assignedTo: string;
  description: string;
  status: 'Pending' | 'In Progress' | 'Completed';
}

const mockUsers = ['Alice', 'Bob', 'Charlie', 'David'];

const statusColors: Record<TodoItem['status'], string> = {
  Pending: 'orange',
  'In Progress': 'blue',
  Completed: 'green',
};

const TodoList: React.FC = () => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);

  const [form] = Form.useForm();

  const showAddModal = () => {
    setEditingTodo(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const showEditModal = (record: TodoItem) => {
    setEditingTodo(record);
    form.setFieldsValue({
      ...record,
      date: moment(record.date),
      dueDate: moment(record.dueDate),
    });
    setIsModalVisible(true);
  };

  const handleDelete = (key: string) => {
    setTodos(todos.filter((item) => item.key !== key));
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        const newTodo: TodoItem = {
          key: editingTodo ? editingTodo.key : Date.now().toString(),
          date: values.date.toISOString(),
          dueDate: values.dueDate.toISOString(),
          assignedTo: values.assignedTo,
          description: values.description,
          status: values.status,
        };

        if (editingTodo) {
          setTodos(todos.map((item) => (item.key === editingTodo.key ? newTodo : item)));
        } else {
          setTodos([...todos, newTodo]);
        }

        setIsModalVisible(false);
        form.resetFields();
      })
      .catch((info) => {
      });
  };

  const columns: ColumnsType<TodoItem> = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (text: string) => moment(text).format('YYYY-MM-DD'),
      sorter: (a, b) => moment(a.date).unix() - moment(b.date).unix(),
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (text: string) => moment(text).format('YYYY-MM-DD'),
      sorter: (a, b) => moment(a.dueDate).unix() - moment(b.dueDate).unix(),
    },
    {
      title: 'Assigned To',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
      filters: mockUsers.map((user) => ({ text: user, value: user })),
      onFilter: (value, record) => record.assignedTo === value,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      filters: Object.keys(statusColors).map((status) => ({ text: status, value: status })),
      onFilter: (value, record) => record.status === value,
      render: (status: TodoItem['status']) => (
        <Tag color={statusColors[status]} key={status}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record) => (
        <Space size="middle">
          <Button type="link" onClick={() => showEditModal(record)}>
            Edit
          </Button>
          <Button type="link" danger onClick={() => handleDelete(record.key)}>
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Button type="primary" onClick={showAddModal} style={{ marginBottom: 16 }}>
        Add Todo
      </Button>
      <Table columns={columns} dataSource={todos} rowKey="key" />

      <Modal
        title={editingTodo ? 'Edit Todo' : 'Add Todo'}
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        okText={editingTodo ? 'Update' : 'Add'}
      >
        <Form form={form} layout="vertical" name="todoForm" initialValues={{ status: 'Pending' }}>
          <Form.Item
            name="date"
            label="Date"
            rules={[{ required: true, message: 'Please select the date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="dueDate"
            label="Due Date"
            rules={[{ required: true, message: 'Please select the due date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="assignedTo"
            label="Assigned To"
            rules={[{ required: true, message: 'Please select a user' }]}
          >
            <Select placeholder="Select a user">
              {mockUsers.map((user) => (
                <Option key={user} value={user}>
                  {user}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter a description' }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true, message: 'Please select a status' }]}
          >
            <Select>
              {Object.keys(statusColors).map((status) => (
                <Option key={status} value={status}>
                  {status}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default TodoList;
