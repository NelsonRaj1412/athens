// src/common/utils/webSocketNotificationService.ts

import React, { useMemo, useEffect } from 'react';
import { 
  useWebSocket, 
  type Notification, 
  type NotificationPayload,
  type NotificationType 
} from '../hooks/useWebSocket'; 
import useAuthStore from '../store/authStore';
import api from '../utils/axiosetup';

// Re-export the core types so other components can import them from this central service file.
export type { Notification, NotificationPayload, NotificationType };

export const useWebSocketNotificationService = () => {
  // Clear old notification cache on service initialization
  useEffect(() => {
    const now = Date.now();
    const recentNotifications = JSON.parse(sessionStorage.getItem('recent_notifications') || '{}');
    const cleanedNotifications: Record<string, number> = {};
    
    // Only keep notifications from the last minute
    Object.keys(recentNotifications).forEach(key => {
      if (now - recentNotifications[key] < 60000) {
        cleanedNotifications[key] = recentNotifications[key];
      }
    });
    
    sessionStorage.setItem('recent_notifications', JSON.stringify(cleanedNotifications));
  }, []);

  const token = useAuthStore((state) => state.token);
  
  // Update the WebSocket URL to ensure it's correctly formatted
  const webSocketUrl = useMemo(() => {
    if (!token) {
      return null;
    }

    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      // Use the backend URL from environment variables or default to localhost:8001
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001';

      const wsHost = backendUrl.replace(/^https?:\/\//, '');

      // Check if the URL already has a port specified
      const hasPort = wsHost.includes(':');

      // Ensure the URL matches the backend's expected format - FIXED PATH
      const url = `${wsProtocol}://${wsHost}${hasPort ? '' : ':8001'}/ws/notifications/?token=${token}`;

      return url;
    } catch (error) {
      // Return null to prevent connection attempts with invalid URLs
      return null;
    }
  }, [token]);

  const { 
    lastMessage, 
    readyState, 
    isConnected,
    sendMessage,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    requestNotifications,
    reconnect 
  } = useWebSocket(webSocketUrl);

  const sendApprovalNotification = (
    userId: string | number,
    payload: Omit<NotificationPayload, 'type'> & { 
      formType: string; 
      itemId: number | string;
      approved?: boolean;
    }
  ): Promise<boolean> => {
    const { formType, itemId, approved, ...rest } = payload;
    
    // Log the notification being sent
    
    return sendNotification(userId, {
      ...rest,
      type: 'approval',
      data: {
        ...(rest.data || {}),
        formType: formType,
        itemId: itemId,
        approved: approved !== false // Default to true if not specified
      }
    });
  };

  // Enhanced notification sending with detailed logging and deduplication
  const sendNotification = (
    userId: string | number,
    payload: NotificationPayload
  ): Promise<boolean> => {
    // Create a unique key for deduplication
    const notificationKey = `${userId}-${payload.type}-${payload.title}-${JSON.stringify(payload.data)}`;
    const now = Date.now();
    
    // Check if we've sent this exact notification recently (within 5 seconds)
    const recentNotifications = JSON.parse(sessionStorage.getItem('recent_notifications') || '{}');
    if (recentNotifications[notificationKey] && (now - recentNotifications[notificationKey]) < 5000) {
      return Promise.resolve(false);
    }
    
    // Store this notification as sent
    recentNotifications[notificationKey] = now;
    
    // Clean up old entries (older than 1 minute)
    Object.keys(recentNotifications).forEach(key => {
      if (now - recentNotifications[key] > 60000) {
        delete recentNotifications[key];
      }
    });
    
    sessionStorage.setItem('recent_notifications', JSON.stringify(recentNotifications));
    
    // Log the notification being sent
    
    // Try WebSocket first
    if (isConnected) {
      try {
        
        // Destructure the `type` from the payload and rename it to avoid collision.
        const { type: notificationType, ...restOfPayload } = payload;
        
        const message = {
          type: 'send_notification', // This is the WebSocket command
          user_id: userId,
          notification_type: notificationType, // This is the notification's own type (e.g., 'general')
          ...restOfPayload, // This contains title, message, data, etc.
        };
        
        const result = sendMessage(message);
        return Promise.resolve(result);
      } catch (err) {
        const error = err as Error;
      }
    } else {
    }
    
    // Fall back to REST API if WebSocket fails or is not connected
    return sendNotificationViaREST(userId, payload);
  };

  // Enhance the REST API method with better error handling
  const sendNotificationViaREST = async (userId: string | number, payload: NotificationPayload): Promise<boolean> => {
    try {
      console.log('Sending notification via REST:', {
        user_id: userId,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        data: payload.data,
        link: payload.link
      });
      
      const response = await api.post('/authentication/notifications/create/', {
        user_id: userId,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        data: payload.data,
        link: payload.link
      });
      
      return response.data.success === true;
    } catch (err) {
      const error = err as any;
      // Log more details about the error
      if (error.response) {
      }
      return false;
    }
  };

  // Add a function to test the WebSocket connection
  const testWebSocketConnection = () => {
    if (!token) {
      return;
    }
    
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const wsHost = backendUrl.replace(/^https?:\/\//, '');
      const hasPort = wsHost.includes(':');
      
      // Try different possible WebSocket URLs - FIXED PATHS
      const urls = [
        `${wsProtocol}://${wsHost}${hasPort ? '' : ':8001'}/ws/notifications/?token=${token}`,
        `${wsProtocol}://${wsHost}/ws/notifications/?token=${token}`
      ];
      
      urls.forEach((url, index) => {
        
        const testSocket = new WebSocket(url);
        
        testSocket.onopen = () => {
          // Close the test socket after successful connection
          setTimeout(() => testSocket.close(), 1000);
        };
        
        testSocket.onerror = (error) => {
        };
      });
    } catch (error) {
    }
  };

  // Call the test function once when the hook is initialized
  useEffect(() => {
    if (token) {
      testWebSocketConnection();
    }
  }, [token]);

  return {
    lastMessage,
    readyState,
    isConnected,
    sendNotification,
    sendApprovalNotification,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead,
    deleteNotification,
    requestNotifications,
    reconnect,
  };
};
















