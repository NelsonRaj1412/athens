import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input, Button, Upload, Avatar, Typography, App, Spin } from 'antd';
import { UploadOutlined, SendOutlined, SyncOutlined, UserOutlined, MessageOutlined } from '@ant-design/icons';
import useAuthStore from '@common/store/authStore';
import api from '@common/utils/axiosetup';
import moment from 'moment';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

// Import your custom hooks
import { useWebSocket } from '@common/hooks/useWebSocket';
import { useChatWebSocket } from '../hooks/useChatWebSocket';
import { useTheme } from '@common/contexts/ThemeContext'; // Import the theme context
import PageLayout from '@common/components/PageLayout';
 

const { TextArea } = Input;
const { Title, Text } = Typography;

// --- Constants (Unchanged) ---
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// --- Interfaces (Unchanged) ---
interface User {
  id: number;
  name: string;
  avatar?: string;
  django_user_type?: string;
  last_message_time?: string;
}

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  timestamp: Date;
  file?: File | string | null;
  file_url?: string | null;
  file_view_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  status?: 'sent' | 'delivered' | 'read';
  notification_status?: string;
}

// --- Styled Components (Theme-Aware) ---

const ChatLayout = styled.div`
  display: flex;
  height: calc(100vh - 128px); /* Adjust height to fit within dashboard content area */
  width: 100%;
  background-color: var(--color-ui-base);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-md);
`;

const UserPanel = styled.div`
  width: 320px;
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-base);
`;

const UserPanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
`;

const UserList = styled.div`
  overflow-y: auto;
  flex-grow: 1;
`;

const UserListItem = styled(motion.div)<{ $isSelected: boolean }>`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  background-color: ${({ $isSelected }) => ($isSelected ? 'var(--color-ui-active)' : 'transparent')};
  border-left: 3px solid ${({ $isSelected }) => ($isSelected ? 'var(--color-primary)' : 'transparent')};
  transition: background-color 0.2s ease-in-out;

  &:hover {
    background-color: var(--color-ui-hover);
  }
`;

const ChatPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--color-ui-base);
`;

const ChatHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 24px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
`;

const MessageArea = styled.div`
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  position: relative;
`;

const MessageContainer = styled(motion.div)<{ $isCurrentUser: boolean }>`
  display: flex;
  justify-content: ${({ $isCurrentUser }) => ($isCurrentUser ? 'flex-end' : 'flex-start')};
  margin-bottom: 4px;
  width: 100%;
`;

const MessageBubble = styled.div<{ $isCurrentUser: boolean }>`
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 18px;
  background-color: ${({ $isCurrentUser }) => ($isCurrentUser ? 'var(--color-primary)' : 'var(--color-ui-hover)')};
  color: ${({ $isCurrentUser }) => ($isCurrentUser ? 'var(--color-primary-text)' : 'var(--color-text-base)')};
  word-break: break-word;
  white-space: pre-wrap;
  position: relative;
`;

const Timestamp = styled.div<{ $isCurrentUser: boolean }>`
  font-size: 11px;
  color: ${({ $isCurrentUser }) => ($isCurrentUser ? 'rgba(255, 255, 255, 0.7)' : 'var(--color-text-muted)')};
  text-align: right;
  margin-top: 5px;
  user-select: none;
`;

const DateSeparator = styled.div`
  text-align: center;
  margin: 20px 0 12px;
  
  span {
    background-color: var(--color-ui-active);
    color: var(--color-text-muted);
    font-size: 12px;
    font-weight: 500;
    padding: 4px 12px;
    border-radius: 12px;
  }
`;

const InputArea = styled.div`
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
  background-color: var(--color-bg-base);
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CenteredSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: var(--color-text-muted);
`;

const EmptyState = styled.div`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: var(--color-text-muted);
  text-align: center;
  height: 100%;
`;

const TypingIndicator = styled(motion.div)`
  display: flex;
  align-items: center;
  padding: 8px 16px;
  margin-bottom: 8px;
  color: var(--color-text-muted);
  font-style: italic;
  font-size: 14px;
`;

const TypingDots = styled.div`
  display: flex;
  gap: 2px;
  margin-left: 8px;

  span {
    width: 4px;
    height: 4px;
    background-color: var(--color-text-muted);
    border-radius: 50%;
    animation: typing 1.4s infinite ease-in-out;

    &:nth-child(1) { animation-delay: -0.32s; }
    &:nth-child(2) { animation-delay: -0.16s; }
  }

  @keyframes typing {
    0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
    40% { transform: scale(1); opacity: 1; }
  }
`;

const UnreadBadge = styled.div`
  background-color: var(--color-error);
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 600;
  min-width: 18px;
  text-align: center;
  margin-left: auto;
`;

const MessageStatus = styled.div<{ $status: string }>`
  font-size: 12px;
  color: ${({ $status }) => {
    switch ($status) {
      case 'delivered': return '#9e9e9e';
      case 'read': return '#4fc3f7';
      default: return '#9e9e9e';
    }
  }};
  margin-top: 2px;
  text-align: right;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1px;
`;

const ChatBox: React.FC = () => {
  const { message } = App.useApp();
  // --- Hooks and State ---
  const { effectiveTheme } = useTheme();
  const usertype = useAuthStore((state) => state.usertype);
  const currentUserId = useAuthStore((state) => state.userId);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [fileList, setFileList] = useState<File[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Enhanced WebSocket for chat notifications
  const {
    isConnected: chatWsConnected,
    chatNotifications,
    messageStatusUpdates,
    typingUsers,
    unreadCounts,
    sendTypingIndicator,
    markMessagesAsRead,
    clearUnreadCount,
    requestNotificationPermission
  } = useChatWebSocket();

  // Debug WebSocket connection
  useEffect(() => {
  }, [chatWsConnected, chatNotifications, typingUsers, unreadCounts]);

  // Typing indicator state
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Message sending state and refs
  const messageQueue = useRef<Array<{content: string, file?: File}> | null>(null);
  const [isSending, setIsSending] = useState(false);
  const lastSentTime = useRef<number>(0);
  const MIN_SEND_INTERVAL = 500;

  // Debug: Log ref creation
  
  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, [requestNotificationPermission]);

  // Initialize messageQueue on mount
  useEffect(() => {

    // Force initialize the array
    messageQueue.current = [];

  }, []);

  // Handle chat notifications for real-time message updates and user reordering
  useEffect(() => {
    if (!chatNotifications || chatNotifications.length === 0) return;

    const latestNotification = chatNotifications[0];
    if (!latestNotification) return;

    // Handle new message notifications
    if (latestNotification.notification_type === 'chat_message' &&
        latestNotification.data.sender_id &&
        latestNotification.data.message_id) {

      // Update user list order - move sender to top
      if (latestNotification.data.sender_id !== currentUserId) {
        setUsers(prevUsers => {
          const updatedUsers = [...prevUsers];
          const senderIndex = updatedUsers.findIndex(u => u.id === latestNotification.data.sender_id);
          if (senderIndex > 0) {
            const [sender] = updatedUsers.splice(senderIndex, 1);
            sender.last_message_time = latestNotification.created_at;
            updatedUsers.unshift(sender);
          }
          return updatedUsers;
        });
      }

      // If this message is for the currently selected conversation, add it to messages
      if ((latestNotification.data.sender_id === selectedUserId &&
           latestNotification.data.receiver_id === currentUserId) ||
          (latestNotification.data.sender_id === currentUserId &&
           latestNotification.data.receiver_id === selectedUserId)) {

        // Check if message already exists to avoid duplicates
        const messageExists = messages && messages.some(msg => msg.id === latestNotification.data.message_id);
        if (!messageExists && latestNotification.data.message_id) {
          const newMessage: Message = {
            id: latestNotification.data.message_id,
            sender_id: latestNotification.data.sender_id,
            receiver_id: latestNotification.data.receiver_id || currentUserId,
            content: latestNotification.data.message_content || '',
            timestamp: new Date(latestNotification.created_at),
            file: latestNotification.data.has_file ? 'file' : null,
            file_url: latestNotification.data.file_url || null,
            file_name: latestNotification.data.file_name || null,
            file_size: latestNotification.data.file_size || null,
            status: 'delivered'
          };

          setMessages(prev => [...prev, newMessage]);

          // Auto-mark as read if sender is the selected user
          if (latestNotification.data.sender_id === selectedUserId) {
            setTimeout(() => {
              markMessagesAsRead([latestNotification.data.message_id!]);
            }, 1000);
          }
        }
      }
    }
  }, [chatNotifications, selectedUserId, currentUserId, messages, markMessagesAsRead]);

  // Handle message status updates from WebSocket
  useEffect(() => {
    if (!messageStatusUpdates || messageStatusUpdates.length === 0) return;

    const latestUpdate = messageStatusUpdates[0];
    if (!latestUpdate || !latestUpdate.message_id) return;

    // Update message status in current conversation
    if (latestUpdate.status === 'delivered' || latestUpdate.status === 'read') {
      setMessages(prev => prev.map(msg => 
        msg.id === latestUpdate.message_id 
          ? { ...msg, status: latestUpdate.status }
          : msg
      ));
    }
  }, [messageStatusUpdates]);
  // Fetch users with enhanced sorting
  useEffect(() => {
    const fetchUsers = async (retryCount = 0) => {
      try {
        setLoading(true);
        const response = await api.get('/chatbox/users/');
        
        // Handle both array and object responses
        let fetchedUsers: User[] = [];
        if (Array.isArray(response.data)) {
          fetchedUsers = response.data.map((user: any) => ({
            id: user.id,
            name: user.name || user.username || 'Unknown User',
            avatar: user.photo || user.avatar,
            django_user_type: user.admin_type,
            last_message_time: user.last_message_time
          }));
        } else if (response.data && response.data.results) {
          fetchedUsers = response.data.results.map((user: any) => ({
            id: user.id,
            name: user.name || user.username || 'Unknown User',
            avatar: user.photo || user.avatar,
            django_user_type: user.admin_type,
            last_message_time: user.last_message_time
          }));
        }
        
        const filteredUsers = fetchedUsers.filter(user => String(user.id) !== String(currentUserId));
        
        // Sort users: unread messages first, then by last message time
        const sortedUsers = filteredUsers.sort((a, b) => {
          const aUnread = unreadCounts[a.id] || 0;
          const bUnread = unreadCounts[b.id] || 0;
          
          // Users with unread messages come first
          if (aUnread > 0 && bUnread === 0) return -1;
          if (bUnread > 0 && aUnread === 0) return 1;
          
          // Then sort by last message time (most recent first)
          const aTime = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
          const bTime = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
          return bTime - aTime;
        });
        
        setUsers(sortedUsers);

        if (sortedUsers.length > 0 && !selectedUserId) {
          setSelectedUserId(sortedUsers[0].id);
        }
      } catch (error: any) {
        console.error('Failed to load users:', error);
        if (retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 1000;
          setTimeout(() => fetchUsers(retryCount + 1), delay);
        } else {
          message.error(`Failed to load users: ${error.response?.data?.message || error.message || 'Unknown error'}`);
          setUsers([]);
        }
      } finally {
        setLoading(false);
      }
    };

    if (['clientuser', 'contractoruser', 'epcuser', 'epc', 'client', 'contractor'].includes(usertype || '')) {
      fetchUsers();
    } else {
      console.log('User type not supported for chat:', usertype);
      setUsers([]);
    }
  }, [usertype, currentUserId, selectedUserId, unreadCounts]);
  // Handle user selection
  const handleUserClick = (userId: number) => {
    if (userId !== selectedUserId) {
      setSelectedUserId(userId);
      setPage(1);
      setHasMore(true);
      setMessages([]);
      clearUnreadCount(userId);
    }
  };

  // Fetch messages with enhanced read receipt handling
  const fetchMessages = useCallback(async (userId: number, pageNum = 1, append = false) => {
    if (userId === null) return;

    const loadingState = pageNum === 1 ? setLoading : setLoadingMore;
    loadingState(true);

    try {
      const response = await api.get(`/chatbox/messages/?userId=${userId}&page=${pageNum}&limit=20`);
      const fetchedMessages: Message[] = response.data.results.map((msg: any) => ({
        id: msg.id,
        sender_id: msg.sender_id,
        receiver_id: msg.receiver_id,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        file: msg.file,
        file_url: msg.file_url,
        file_view_url: msg.file_view_url,
        file_name: msg.file_name,
        file_size: msg.file_size,
        status: msg.status
      }));

      setHasMore(!!response.data.next);

      if (append) {
        setMessages(prev => [...fetchedMessages, ...prev]);
      } else {
        setMessages(fetchedMessages);
      }

      // Mark unread messages as read
      const unreadMessages = fetchedMessages
        .filter(msg => msg.sender_id === userId && msg.status !== 'read')
        .map(msg => msg.id);

      if (unreadMessages.length > 0) {
        markMessagesAsRead(unreadMessages);
      }
    } catch (error) {
      message.error('Failed to load messages');
    } finally {
      loadingState(false);
    }
  }, [currentUserId, markMessagesAsRead, clearUnreadCount]);
  // Handle scroll for pagination
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container && container.scrollTop < 50 && !loadingMore && hasMore) {
      setPage(prev => prev + 1);
      fetchMessages(selectedUserId as number, page + 1, true);
    }
  }, [fetchMessages, loadingMore, hasMore, selectedUserId, page]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Fetch messages when user is selected
  useEffect(() => {
    if (selectedUserId !== null) {
      setPage(1);
      fetchMessages(selectedUserId);
    } else {
      setMessages([]);
    }
  }, [selectedUserId, fetchMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (!loadingMore) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loadingMore]);

  // Handle typing indicators
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputMessage(value);

    if (selectedUserId && value.trim() && !isTyping) {
      setIsTyping(true);
      sendTypingIndicator(selectedUserId, true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (selectedUserId && isTyping) {
        setIsTyping(false);
        sendTypingIndicator(selectedUserId, false);
      }
    }, 2000);
  };

  const processMessageQueue = useCallback(async () => {
    if (!messageQueue.current || !Array.isArray(messageQueue.current) || messageQueue.current.length === 0 || isSending) return;

    setIsSending(true);
    const timeToWait = Math.max(0, MIN_SEND_INTERVAL - (Date.now() - lastSentTime.current));
    await new Promise(resolve => setTimeout(resolve, timeToWait));

    const { content, file } = messageQueue.current.shift()!;

    try {
      const formData = new FormData();
      formData.append('userId', String(selectedUserId));
      if (content) formData.append('content', content);
      if (file) formData.append('file', file);

      const response = await api.post('/chatbox/messages/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      lastSentTime.current = Date.now();

      const newMessage: Message = {
        ...response.data,
        timestamp: new Date(response.data.timestamp),
        notification_status: response.data.notification_status,
        status: 'sent'
      };

      setMessages(prev => [...prev, newMessage]);

      // Show success message if notification was sent successfully
      if (response.data.notification_status === 'success') {
      } else if (response.data.notification_error) {
      }

    } catch (error) {
      message.error('Failed to send message. Retrying.');
      if (messageQueue.current && Array.isArray(messageQueue.current)) {
        messageQueue.current.unshift({ content, file });
      }
      await new Promise(resolve => setTimeout(resolve, 3000));
    } finally {
      setIsSending(false);
      if (messageQueue.current && Array.isArray(messageQueue.current) && messageQueue.current.length > 0) {
        processMessageQueue();
      }
    }
  }, [selectedUserId]);

  useEffect(() => {
    if (messageQueue.current && Array.isArray(messageQueue.current) && messageQueue.current.length > 0 && !isSending) {
      processMessageQueue();
    }
  }, [isSending, processMessageQueue]);

  const handleSendMessage = () => {
    if ((!inputMessage.trim() && fileList.length === 0) || selectedUserId === null) return;

    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      sendTypingIndicator(selectedUserId, false);
    }

    if (messageQueue.current && Array.isArray(messageQueue.current)) {
      messageQueue.current.push({
        content: inputMessage.trim(),
        file: fileList[0]
      });
    }

    setInputMessage('');
    setFileList([]);

    if (!isSending) {
      processMessageQueue();
    }
  };
  // File validation
  const validateFile = (file: File) => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      message.error('File type not supported.');
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      message.error('File size exceeds 5MB.');
      return false;
    }
    return true;
  };

  const handleFileChange = (file: File) => {
    if (validateFile(file)) {
      setFileList([file]);
    }
    return false;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);
  
  // New rendering function for messages to integrate with styled-components
  const renderMessages = () => {
    const sortedMessages = [...messages].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const messagesByDate: { [key: string]: Message[] } = {};
    sortedMessages.forEach(msg => {
      const dateKey = moment(msg.timestamp).format('YYYY-MM-DD');
      if (!messagesByDate[dateKey]) messagesByDate[dateKey] = [];
      messagesByDate[dateKey].push(msg);
    });

    return Object.entries(messagesByDate).map(([dateKey, messagesForDate]) => (
      <React.Fragment key={dateKey}>
        <DateSeparator>
          <span>
            {moment(dateKey).calendar(null, { sameDay: '[Today]', lastDay: '[Yesterday]', lastWeek: 'dddd', sameElse: 'MMMM D, YYYY' })}
          </span>
        </DateSeparator>
        {messagesForDate.map(msg => {
          const isCurrentUser = Number(msg.sender_id) === Number(currentUserId);
          return (
            <MessageContainer
              key={msg.id}
              $isCurrentUser={isCurrentUser}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              layout
            >
              <MessageBubble $isCurrentUser={isCurrentUser}>
                {msg.content}
                {(msg.file || msg.file_url) && (
                  <div style={{ marginTop: 8 }}>
                    <a
                      href={msg.file_url || (typeof msg.file === 'string' ? msg.file : URL.createObjectURL(msg.file as Blob))}
                      download={msg.file_name || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: isCurrentUser ? '#fff' : 'var(--color-primary)',
                        textDecoration: 'underline',
                        cursor: 'pointer'
                      }}
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        console.log('File download attempt:', {
                          file_url: msg.file_url,
                          file_view_url: msg.file_view_url,
                          file_name: msg.file_name,
                          file: msg.file
                        });

                        try {
                          // Handle File objects (newly uploaded files)
                          if (msg.file instanceof File) {
                            const url = URL.createObjectURL(msg.file);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = msg.file.name;
                            link.target = '_blank';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            setTimeout(() => URL.revokeObjectURL(url), 1000);
                            return;
                          }

                          // For server files, use authenticated API download to preserve MIME types
                          let downloadUrl = msg.file_url;
                          if (!downloadUrl && typeof msg.file === 'string') {
                            downloadUrl = msg.file;
                          }

                          if (downloadUrl) {

                            // Use authenticated API request to preserve MIME types and filename
                            const response = await api.get(downloadUrl, {
                              responseType: 'blob',
                              timeout: 30000, // 30 second timeout
                              headers: {
                                'Accept': '*/*'
                              }
                            });

                            console.log('Download response:', {
                              status: response.status,
                              contentType: response.headers['content-type'],
                              size: response.data.size
                            });

                            // Get the content type from response headers
                            const contentType = response.headers['content-type'] || 'application/octet-stream';

                            // Create blob with proper MIME type
                            const blob = new Blob([response.data], { type: contentType });
                            const url = window.URL.createObjectURL(blob);

                            // Create download link
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = msg.file_name || 'download';

                            // Trigger download
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);

                            // Clean up
                            setTimeout(() => window.URL.revokeObjectURL(url), 1000);

                            console.log('Download successful:', {
                              filename: msg.file_name,
                              contentType: contentType,
                              size: blob.size
                            });
                          } else {
                            throw new Error('No file URL available');
                          }
                        } catch (error: any) {

                          // Handle specific error cases
                          if (error.response?.status === 401) {
                            message.error('Authentication failed. Please refresh the page and try again.');
                          } else if (error.response?.status === 403) {
                            message.error('You don\'t have permission to access this file.');
                          } else if (error.response?.status === 404) {
                            message.error('File not found.');
                          } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                            message.error('Download timeout. Please try again.');
                          } else {
                            message.error('Failed to download file. Please try again.');
                          }
                        }
                      }}
                    >
                      📎 {msg.file_name || (typeof msg.file === 'string' ? msg.file.split('/').pop() || 'Document' : msg.file?.name || 'Document')}
                      {msg.file_size && (
                        <span style={{ fontSize: '0.8em', opacity: 0.7, marginLeft: 4 }}>
                          ({(msg.file_size / 1024).toFixed(1)} KB)
                        </span>
                      )}
                    </a>
                  </div>
                )}
                <Timestamp $isCurrentUser={isCurrentUser}>
                  {moment(msg.timestamp).format('HH:mm')}
                </Timestamp>
                {isCurrentUser && msg.status && (
                  <MessageStatus $status={msg.status}>
                    {msg.status === 'sent' && (
                      <svg width="12" height="12" viewBox="0 0 16 15" fill="currentColor">
                        <path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                      </svg>
                    )}
                    {msg.status === 'delivered' && (
                      <>
                        <svg width="12" height="12" viewBox="0 0 16 15" fill="currentColor">
                          <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-1.91-2.143a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l2.258 2.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                        </svg>
                        <svg width="12" height="12" viewBox="0 0 16 15" fill="currentColor" style={{marginLeft: '-6px'}}>
                          <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-1.91-2.143a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l2.258 2.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                        </svg>
                      </>
                    )}
                    {msg.status === 'read' && (
                      <>
                        <svg width="12" height="12" viewBox="0 0 16 15" fill="currentColor">
                          <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-1.91-2.143a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l2.258 2.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                        </svg>
                        <svg width="12" height="12" viewBox="0 0 16 15" fill="currentColor" style={{marginLeft: '-6px'}}>
                          <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-1.91-2.143a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l2.258 2.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                        </svg>
                      </>
                    )}
                  </MessageStatus>
                )}
              </MessageBubble>
            </MessageContainer>
          );
        })}

        {/* Typing indicator */}
        {typingUsers && selectedUserId && typingUsers.has(selectedUserId) && (
          <TypingIndicator
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {selectedUser?.name || 'Someone'} is typing
            <TypingDots>
              <span></span>
              <span></span>
              <span></span>
            </TypingDots>
          </TypingIndicator>
        )}
      </React.Fragment>
    ));
  };
  
  const selectedUser = users.find(u => u.id === selectedUserId);
  
  return (
    <PageLayout
      title="Chat"
      subtitle="Communicate with team members"
      breadcrumbs={[
        { title: 'Chat' }
      ]}
    >
      <ChatLayout role="region" aria-label="Chat interface">
        <UserPanel>
          <UserPanelHeader>
            <Title level={5} style={{ margin: 0, color: 'var(--color-text-base)' }}>Contacts</Title>
            <Button icon={<SyncOutlined spin={refreshing} />} onClick={() => fetchMessages(selectedUserId!, 1)} disabled={selectedUserId === null || refreshing} type="text" aria-label="Refresh messages" />
        </UserPanelHeader>
        <UserList>
          {loading && users.length === 0 ? (
            <CenteredSpinner><Spin tip="Loading users..." /></CenteredSpinner>
          ) : users.length > 0 ? (
            <AnimatePresence>
              {users.map((user, index) => (
                <UserListItem
                  key={user.id}
                  $isSelected={user.id === selectedUserId}
                  onClick={() => handleUserClick(user.id)}
                  aria-selected={user.id === selectedUserId}
                  role="option"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Avatar src={user.avatar} icon={<UserOutlined />}>{user.name.charAt(0)}</Avatar>
                  <Text style={{ marginLeft: 12, color: 'var(--color-text-base)' }}>{user.name}</Text>
                  {unreadCounts && unreadCounts[user.id] > 0 && (
                    <UnreadBadge>{unreadCounts[user.id]}</UnreadBadge>
                  )}
                </UserListItem>
              ))}
            </AnimatePresence>
          ) : (
            <EmptyState>No users found.</EmptyState>
          )}
        </UserList>
      </UserPanel>

      <ChatPanel>
        <AnimatePresence mode="wait">
          {selectedUserId === null ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ height: '100%' }}>
              <EmptyState>
                <MessageOutlined style={{ fontSize: '48px', opacity: 0.5 }}/>
                <Title level={4} style={{ marginTop: '16px', color: 'var(--color-text-muted)' }}>Select a conversation</Title>
                <Text type="secondary">Choose a contact from the left panel to start chatting.</Text>
              </EmptyState>
            </motion.div>
          ) : (
            <motion.div key={selectedUserId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <ChatHeader>
                {selectedUser && (
                  <>
                    <Avatar src={selectedUser.avatar} icon={<UserOutlined />}>{selectedUser.name.charAt(0)}</Avatar>
                    <Title level={5} style={{ margin: '0 0 0 12px', color: 'var(--color-text-base)' }}>{selectedUser.name}</Title>
                  </>
                )}
              </ChatHeader>

              <MessageArea ref={messagesContainerRef}>
                {loading && messages.length === 0 ? (
                    <CenteredSpinner><Spin tip="Loading messages..." /></CenteredSpinner>
                ) : messages.length === 0 ? (
                  <EmptyState>
                    <Text type="secondary">No messages yet. Send one to start the conversation!</Text>
                  </EmptyState>
                ) : (
                  <>
                    {renderMessages()}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </MessageArea>

              <InputArea>
                <Upload beforeUpload={handleFileChange} fileList={fileList as any} onRemove={() => setFileList([])} maxCount={1} showUploadList={false}>
                  <Button icon={<UploadOutlined />} disabled={isSending} type="text" />
                </Upload>
                <TextArea
                  value={inputMessage}
                  onChange={handleInputChange}
                  placeholder="Type a message..."
                  autoSize={{ minRows: 1, maxRows: 5 }}
                  onKeyDown={handleKeyDown}
                  style={{ resize: 'none' }}
                />
                <Button type="primary" icon={<SendOutlined />} onClick={handleSendMessage} disabled={(!inputMessage.trim() && fileList.length === 0) || isSending} />
              </InputArea>
            </motion.div>
          )}
        </AnimatePresence>
      </ChatPanel>
    </ChatLayout>
    </PageLayout>
  );
};

export default ChatBox;