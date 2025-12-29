/**
 * Enhanced WebSocket hook specifically for chat functionality
 * Integrates with the notification system for real-time chat updates
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useWebSocket } from '@common/hooks/useWebSocket';
import useAuthStore from '@common/store/authStore';
import { message as antMessage } from 'antd';
import api from '@common/utils/axiosetup';

export interface ChatMessage {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  timestamp: Date;
  file?: File | string | null;
  status?: 'sent' | 'delivered' | 'read';
  notification_status?: string;
}

export interface ChatNotification {
  id: number;
  title: string;
  message: string;
  notification_type: string;
  data: {
    message_id?: number;
    sender_id?: number;
    sender_name?: string;
    message_content?: string;
    has_file?: boolean;
    receiver_id?: number;
    receiver_name?: string;
    status?: string;
    message_count?: number;
  };
  link?: string;
  read: boolean;
  created_at: string;
}

export interface ChatStatusUpdate {
  message_id?: number;
  status: 'delivered' | 'read' | 'typing' | 'stopped_typing';
  timestamp: string;
  other_user_id?: number;
}

export interface TypingIndicator {
  user_id: number;
  is_typing: boolean;
}

export const useChatWebSocket = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUserId = useAuthStore((state) => state.userId);
  
  // WebSocket connection to notifications endpoint
  const notificationWsUrl = accessToken 
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/notifications/?token=${accessToken}`
    : null;
  
  const { 
    lastMessage, 
    isConnected, 
    sendMessage: sendWebSocketMessage 
  } = useWebSocket(notificationWsUrl);

  // Chat-specific state
  const [chatNotifications, setChatNotifications] = useState<ChatNotification[]>([]);
  const [messageStatusUpdates, setMessageStatusUpdates] = useState<ChatStatusUpdate[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});
  
  // Refs for managing typing timeouts
  const typingTimeouts = useRef<Record<number, NodeJS.Timeout>>({});

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (!lastMessage || !lastMessage.type) return;

    switch (lastMessage.type) {
      case 'chat_message_notification':
        handleChatMessageNotification(lastMessage.notification);
        break;
      case 'chat_status_update':
        handleChatStatusUpdate(lastMessage.data);
        break;
      case 'connection_established':
        break;
      default:
        // Handle other notification types if needed
        break;
    }
  }, [lastMessage]);

  const handleChatMessageNotification = useCallback((notification: ChatNotification) => {
    if (!notification) return;
    setChatNotifications(prev => [notification, ...(prev || [])]);
    
    // Update unread count for sender
    if (notification.data.sender_id && notification.data.sender_id !== currentUserId) {
      setUnreadCounts(prev => ({
        ...prev,
        [notification.data.sender_id!]: (prev[notification.data.sender_id!] || 0) + 1
      }));
    }

    // Show browser notification if user is not on the chat page
    if (notification.notification_type === 'chat_message' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: `chat-${notification.data.sender_id}`
        });
      }
    }

    // Show antd message for delivery confirmations
    if (notification.notification_type === 'chat_message_delivered' && notification.data.sender_id === currentUserId) {
      antMessage.success(`Message delivered to ${notification.data.receiver_name}`, 2);
    }
  }, [currentUserId]);

  const handleChatStatusUpdate = useCallback((statusUpdate: ChatStatusUpdate) => {
    if (!statusUpdate) return;
    setMessageStatusUpdates(prev => [statusUpdate, ...(prev || []).slice(0, 99)]); // Keep last 100 updates

    // Handle typing indicators
    if (statusUpdate.status === 'typing' && statusUpdate.other_user_id) {
      setTypingUsers(prev => new Set([...prev, statusUpdate.other_user_id!]));
      
      // Clear existing timeout for this user
      if (typingTimeouts.current[statusUpdate.other_user_id]) {
        clearTimeout(typingTimeouts.current[statusUpdate.other_user_id]);
      }
      
      // Set new timeout to remove typing indicator
      typingTimeouts.current[statusUpdate.other_user_id] = setTimeout(() => {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(statusUpdate.other_user_id!);
          return newSet;
        });
        delete typingTimeouts.current[statusUpdate.other_user_id!];
      }, 3000);
    } else if (statusUpdate.status === 'stopped_typing' && statusUpdate.other_user_id) {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(statusUpdate.other_user_id!);
        return newSet;
      });
      
      // Clear timeout
      if (typingTimeouts.current[statusUpdate.other_user_id]) {
        clearTimeout(typingTimeouts.current[statusUpdate.other_user_id]);
        delete typingTimeouts.current[statusUpdate.other_user_id];
      }
    }
  }, []);

  // Send typing indicator
  const sendTypingIndicator = useCallback(async (otherUserId: number, isTyping: boolean) => {
    try {
      await api.post('/chatbox/typing-indicator/', {
        other_user_id: otherUserId,
        is_typing: isTyping
      });
    } catch (error) {
      console.error('Failed to send typing indicator:', error);
    }
  }, []);

  // Mark messages as read and send read receipts
  const markMessagesAsRead = useCallback(async (messageIds: number[]) => {
    try {
      const response = await api.post('/chatbox/read-receipts/', {
        message_ids: messageIds
      });
      
      // Clear unread counts for affected senders
      // This would need message data to determine senders
      return response.data;
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }, []);

  // Get chat notification summary
  const getChatNotificationSummary = useCallback(async () => {
    try {
      const response = await api.get('/chatbox/notification-summary/');
      const summary = response.data;
      
      // Update unread counts from summary
      if (summary.senders_summary) {
        const newUnreadCounts: Record<number, number> = {};
        Object.entries(summary.senders_summary).forEach(([senderId, data]: [string, any]) => {
          newUnreadCounts[parseInt(senderId)] = data.unread_count;
        });
        setUnreadCounts(newUnreadCounts);
      }
      
      return summary;
    } catch (error) {
      console.error('Failed to get chat notification summary:', error);
    }
  }, []);

  // Clear unread count for a specific user
  const clearUnreadCount = useCallback((userId: number) => {
    setUnreadCounts(prev => ({
      ...prev,
      [userId]: 0
    }));
  }, []);

  // Request browser notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(typingTimeouts.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, []);

  return {
    // Connection status
    isConnected,
    
    // Chat data
    chatNotifications,
    messageStatusUpdates,
    typingUsers,
    unreadCounts,
    
    // Actions
    sendTypingIndicator,
    markMessagesAsRead,
    getChatNotificationSummary,
    clearUnreadCount,
    requestNotificationPermission,
    
    // WebSocket methods
    sendWebSocketMessage
  };
};
