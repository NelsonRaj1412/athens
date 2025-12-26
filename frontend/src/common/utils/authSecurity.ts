/**
 * Enhanced Authentication Security Utilities
 * Provides robust authentication, logout, and security functions
 */

import useAuthStore from '../store/authStore';
import api from './axiosetup';

export interface LogoutOptions {
  silent?: boolean;
  redirectTo?: string;
  showMessage?: boolean;
}

export interface AuthValidationResult {
  isValid: boolean;
  reason?: string;
  shouldRedirect?: boolean;
}

/**
 * Validates current authentication state
 */
export const validateAuthState = (): AuthValidationResult => {
  const { token, refreshToken, tokenExpiry } = useAuthStore.getState();

  // Check if tokens exist
  if (!token || !refreshToken) {
    return {
      isValid: false,
      reason: 'No authentication tokens found',
      shouldRedirect: true
    };
  }

  // Check token expiry if available
  if (tokenExpiry) {
    const expiryTime = new Date(tokenExpiry).getTime();
    const currentTime = Date.now();
    const timeUntilExpiry = expiryTime - currentTime;

    // Token expired
    if (timeUntilExpiry <= 0) {
      return {
        isValid: false,
        reason: 'Access token has expired',
        shouldRedirect: true
      };
    }

    // Token expires soon (within 1 minute)
    if (timeUntilExpiry < 60000) {
      return {
        isValid: false,
        reason: 'Access token expires soon',
        shouldRedirect: false // Don't redirect, try refresh
      };
    }
  }

  return { isValid: true };
};

/**
 * Enhanced logout function with comprehensive error handling
 */
export const performSecureLogout = async (options: LogoutOptions = {}): Promise<{ success: boolean; showMessage?: boolean }> => {
  const {
    silent = false,
    redirectTo = '/login',
    showMessage = true
  } = options;

  const { token, refreshToken, clearToken } = useAuthStore.getState();

  if (!silent) {
  }

  // Step 1: Validate we have tokens
  if (!token && !refreshToken) {
    if (!silent) {
    }
    clearToken();
    if (redirectTo && typeof window !== 'undefined') {
      window.location.replace(redirectTo);
    }
    return { success: true, showMessage };
  }

  try {
    // Step 2: Attempt logout API call if we have tokens
    if (token && refreshToken) {
      if (!silent) {
      }

      const response = await api.post('/authentication/logout/', 
        { refresh: refreshToken },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000,
          validateStatus: (status) => status < 500 // Don't throw on 4xx errors
        }
      );

      if (!silent) {
        if (response.status >= 200 && response.status < 300) {
        } else {
        }
      }
    }

  } catch (error: any) {
    if (!silent) {
      if (error.code === 'ECONNABORTED') {
      } else if (error.response) {
      } else {
      }
    }
    // Don't throw - always proceed with local logout
  } finally {
    // Step 3: Always clear local state
    clearToken();
    
    if (!silent) {
    }

    // Step 4: Handle redirect
    if (redirectTo && typeof window !== 'undefined') {
      window.location.replace(redirectTo);
    }

    // Step 5: Return success status for message handling by caller
    return { success: true, showMessage };
  }
};

/**
 * Check if user should be automatically logged out
 */
export const shouldAutoLogout = (): boolean => {
  const validation = validateAuthState();
  return !validation.isValid && validation.shouldRedirect === true;
};

/**
 * Secure token refresh with comprehensive error handling
 */
export const performSecureTokenRefresh = async (): Promise<string | null> => {
  const { refreshToken, token } = useAuthStore.getState();

  if (!refreshToken) {
    return null;
  }

  try {

    const response = await api.post('/authentication/token/refresh/', {
      refresh: refreshToken
    }, {
      timeout: 10000
    });

    if (response.data?.access) {
      const newToken = response.data.access;
      
      // Update token in store
      const authState = useAuthStore.getState();
      useAuthStore.getState().setToken(
        newToken,
        authState.refreshToken,
        authState.projectId,
        authState.username,
        authState.usertype,
        authState.django_user_type,
        authState.userId,
        authState.isPasswordResetRequired,
        authState.grade,
        authState.department
      );

      return newToken;
    }

    return null;

  } catch (error: any) {
    
    // If refresh fails due to invalid/expired refresh token, logout
    if (error.response?.status === 401) {
      await performSecureLogout({ silent: true });
    }
    
    return null;
  }
};

/**
 * Initialize authentication security checks
 */
export const initializeAuthSecurity = (): void => {
  // Check authentication state on initialization
  const validation = validateAuthState();
  
  if (!validation.isValid && validation.shouldRedirect) {
    performSecureLogout({ silent: true, showMessage: false });
  }
};

export default {
  validateAuthState,
  performSecureLogout,
  shouldAutoLogout,
  performSecureTokenRefresh,
  initializeAuthSecurity
};
