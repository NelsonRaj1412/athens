/**
 * Authentication Status Checker
 * Helps diagnose and fix authentication issues
 */

import useAuthStore from '@common/store/authStore';
import api from '@common/utils/axiosetup';
import { message } from 'antd';

export class AuthStatusChecker {
  /**
   * Check if user is properly authenticated
   */
  static async checkAuthStatus(): Promise<boolean> {
    const authStore = useAuthStore.getState();
    
    // Check if token exists
    if (!authStore.token) {
      console.warn('No authentication token found');
      return false;
    }

    try {
      // Try to make a simple authenticated request
      const response = await api.get('/authentication/verify-token/');
      return response.status === 200;
    } catch (error: any) {
      console.error('Auth status check failed:', error);
      
      if (error.response?.status === 401) {
        console.warn('Token is invalid or expired');
        return false;
      }
      
      // For other errors, assume auth is still valid
      return true;
    }
  }

  /**
   * Force refresh authentication token
   */
  static async refreshAuth(): Promise<boolean> {
    try {
      const authStore = useAuthStore.getState();
      
      if (!authStore.refreshToken) {
        console.warn('No refresh token available');
        return false;
      }

      // Try to refresh the token
      const response = await api.post('/authentication/token/refresh/', {
        refresh: authStore.refreshToken
      });

      if (response.data.access) {
        authStore.setToken(response.data.access);
        console.log('Token refreshed successfully');
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  /**
   * Ensure user is authenticated before making API calls
   */
  static async ensureAuthenticated(): Promise<boolean> {
    const isAuthenticated = await this.checkAuthStatus();
    
    if (!isAuthenticated) {
      console.log('Authentication invalid, attempting refresh...');
      const refreshed = await this.refreshAuth();
      
      if (!refreshed) {
        console.warn('Authentication refresh failed, redirecting to login');
        message.error('Your session has expired. Please log in again.');
        
        const authStore = useAuthStore.getState();
        authStore.logout();
        
        setTimeout(() => {
          window.location.href = '/signin';
        }, 1500);
        
        return false;
      }
    }
    
    return true;
  }

  /**
   * Debug authentication state
   */
  static debugAuthState(): void {
    const authStore = useAuthStore.getState();
    
    console.log('Authentication Debug Info:', {
      hasToken: !!authStore.token,
      hasRefreshToken: !!authStore.refreshToken,
      isAuthenticated: authStore.isAuthenticated(),
      userId: authStore.userId,
      usertype: authStore.usertype,
      tokenLength: authStore.token?.length || 0,
      tokenPreview: authStore.token ? `${authStore.token.substring(0, 20)}...` : 'None'
    });
  }
}

/**
 * Hook to check authentication before component mounts
 */
export const useAuthCheck = () => {
  const checkAuth = async () => {
    const isValid = await AuthStatusChecker.ensureAuthenticated();
    return isValid;
  };

  return { checkAuth };
};