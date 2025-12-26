import axios from 'axios';
import useAuthStore from '../store/authStore';

// Keep track of refresh attempts
let refreshAttempts = 0;
const MAX_REFRESH_ATTEMPTS = 3;
let refreshPromise: Promise<string | null> | null = null;
let lastRefreshTimestamp = 0;

// Minimum time between refresh attempts (30 seconds)
const MIN_REFRESH_INTERVAL = 30 * 1000;

// Function to check if we should attempt a token refresh
const shouldAttemptRefresh = (): boolean => {
  const refreshToken = useAuthStore.getState().refreshToken;
  const token = useAuthStore.getState().token;
  const tokenExpiry = useAuthStore.getState().tokenExpiry;
  
  // If no refresh token or no token, don't attempt refresh
  if (!refreshToken || !token) {
    return false;
  }
  
  // Check if token is expired or about to expire (within 2 minutes)
  if (tokenExpiry) {
    const expiryTime = new Date(tokenExpiry).getTime();
    const currentTime = Date.now();
    const timeUntilExpiry = expiryTime - currentTime;
    
    // Only refresh if token expires in less than 2 minutes or is already expired
    if (timeUntilExpiry < 2 * 60 * 1000) {
      return true;
    }
    
    // If token is still valid for more than 2 minutes, don't refresh
    return false;
  }
  
  // If no expiry time, don't refresh unless explicitly needed
  return false;
}

const refreshToken = async (): Promise<string | null> => {
  const currentToken = useAuthStore.getState().token;

  console.log('Token refresh attempt:', {
    hasCurrentToken: !!currentToken,
    hasRefreshToken: !!useAuthStore.getState().refreshToken,
    isAuthenticated: useAuthStore.getState().isAuthenticated()
  });

  // If we already have a valid token and refreshed recently, return it
  const now = Date.now();
  if (currentToken && (now - lastRefreshTimestamp < MIN_REFRESH_INTERVAL)) {
    // Check token expiry
    const tokenExpiry = useAuthStore.getState().tokenExpiry;
    if (tokenExpiry) {
      const expiryTime = new Date(tokenExpiry).getTime();
      // If token is still valid for at least 5 minutes, use it
      if (expiryTime > now + 5 * 60 * 1000) {
        return currentToken;
      }
    } else {
      return currentToken;
    }
  }
  
  // If there's already a refresh in progress, return that promise
  if (refreshPromise) {
    return refreshPromise;
  }

  // Reset refresh attempts after 5 minutes of no attempts
  const lastRefreshTime = useAuthStore.getState().lastRefreshTime || 0;
  if (now - lastRefreshTime > 5 * 60 * 1000) {
    refreshAttempts = 0;
  }

  // Check if we've exceeded max attempts
  if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
    return currentToken; // Return current token even if it might be expired
  }

  // Check if we should attempt a refresh
  if (!shouldAttemptRefresh()) {
    return currentToken;
  }

  const refresh = useAuthStore.getState().refreshToken;
  if (!refresh) {
    return currentToken; // Return current token as fallback
  }

  const baseURL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000/';

  // Create a new refresh promise
  refreshPromise = (async () => {
    try {
      refreshAttempts++;
      
      // Store the refresh time
      useAuthStore.getState().setLastRefreshTime(now);
      lastRefreshTimestamp = now;
      
      
      // Proceed with token refresh using the standard TokenRefreshView endpoint
      const response = await axios.post(`${baseURL}authentication/token/refresh/`, {
        refresh,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });
      

      if (!response.data || !response.data.access) {
        return currentToken; // Return current token as fallback
      }

      const newAccessToken = response.data.access;

      // Get current auth state to preserve other fields
      const authState = useAuthStore.getState();
      useAuthStore.getState().setToken(
        newAccessToken,
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

      
      // Reset refresh attempts on success
      refreshAttempts = 0;
      
      return newAccessToken;
    } catch (error: any) {
      
      // Log more detailed error information
      if (error.response) {
        
        // Check if token is blacklisted, invalid, or expired
        if (error.response.status === 401) {
          const errorDetail = error.response.data?.detail || '';
          const errorCode = error.response.data?.code || '';

          if (errorDetail.includes('Token is blacklisted') ||
              errorDetail.includes('token invalid') ||
              errorDetail.includes('Invalid token') ||
              errorDetail.includes('Token has expired') ||
              errorDetail.includes('Given token not valid') ||
              errorCode === 'token_not_valid') {
            // Use silent logout to prevent flash messages
            useAuthStore.getState().clearToken();
            // Redirect immediately without delay
            window.location.replace('/login');
            return null;
          }
        }
      } else if (error.request) {
      } else {
      }
      
      // Return the current token even if refresh failed
      return currentToken;
    } finally {
      // Clear the promise reference
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// Function to test the token refresh endpoint directly
export const testTokenRefresh = async (): Promise<void> => {
  const refresh = useAuthStore.getState().refreshToken;
  if (!refresh) {
    return;
  }
  
  const baseURL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000/';
  
  try {
    
    const response = await axios.post(`${baseURL}authentication/token/refresh/`, {
      refresh,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    
    // Update the token in the store
    if (response.data && response.data.access) {
      const authState = useAuthStore.getState();
      useAuthStore.getState().setToken(
        response.data.access,
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
    }
    
    return response.data;
  } catch (error: any) {
    if (error.response) {
      
      // Handle blacklisted or invalid token
      if (error.response.status === 401) {
        const errorDetail = error.response.data?.detail || '';
        const errorCode = error.response.data?.code || '';
        
        if (errorDetail.includes('Token is blacklisted') ||
            errorDetail.includes('Given token not valid') ||
            errorCode === 'token_not_valid') {
          // Clear tokens from store
          useAuthStore.getState().clearToken();
          // Redirect to login page
          setTimeout(() => {
            window.location.href = '/login';
          }, 100);
        }
      }
    }
    throw error;
  }
};

export default refreshToken;
