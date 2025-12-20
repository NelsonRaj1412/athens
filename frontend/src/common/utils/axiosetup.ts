import axios from 'axios';
import useAuthStore from '../store/authStore';
import refreshToken from './tokenrefresh';
import { authFix } from './authenticationFix';

// Function to get CSRF token from cookies
function getCsrfToken() {
  const name = 'csrftoken=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(';');
  
  for (let i = 0; i < cookieArray.length; i++) {
    let cookie = cookieArray[i].trim();
    if (cookie.indexOf(name) === 0) {
      return cookie.substring(name.length, cookie.length);
    }
  }
  return '';
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  withCredentials: true,
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }
});

api.interceptors.request.use(
  (config) => {
    // Force override any backend:8000 URLs
    if (config.url && config.url.includes('backend:8000')) {
      config.url = config.url.replace('http://backend:8000', 'http://localhost:8000');
      config.url = config.url.replace('https://backend:8000', 'http://localhost:8000');
    }
    
    // Ensure baseURL is correct
    if (!config.baseURL || config.baseURL.includes('backend:')) {
      config.baseURL = 'http://localhost:8000';
    }

    // Add authorization token if available
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add CSRF token for non-GET requests
    if (config.method !== 'get' && config.headers) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: any[] = [];
let refreshRetryCount = 0;
const MAX_REFRESH_RETRIES = 1;

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If there's no response or config, just reject
    if (!error.config) {
      return Promise.reject(error);
    }
    
    const originalRequest = error.config;
    
    // Prevent infinite loops by checking if this request has already been retried
    if (originalRequest._isRetry) {
      return Promise.reject(error);
    }

    // Check if the request URL is the login URL or token-related
    const isAuthRequest =
      originalRequest.url === '/authentication/login/' ||
      originalRequest.url === (api.defaults.baseURL + 'authentication/login/') ||
      originalRequest.url?.includes('/authentication/refresh/') ||
      originalRequest.url?.includes('/authentication/verify-token/') ||
      originalRequest.url?.includes('/authentication/logout/');

    // Check if this is a participant response request (should not trigger auto-logout)
    const isParticipantResponseRequest =
      originalRequest.url?.includes('/api/v1/mom/') && (
        (originalRequest.url?.includes('/participants/') && originalRequest.url?.includes('/response/')) ||
        originalRequest.url?.includes('/info/') ||
        originalRequest.url?.includes('/respond')
      );

    console.log('Response interceptor error:', {
      url: originalRequest.url,
      status: error.response?.status,
      isAuthRequest,
      isParticipantResponseRequest,
      errorData: error.response?.data,
      errorDetail: error.response?.data?.detail
    });

    // Only try to refresh token for 401 errors on non-auth requests
    // But don't auto-logout for participant response requests - let the component handle it
    if (error.response?.status === 401 && !isAuthRequest && !isParticipantResponseRequest) {
      // Detect if token is invalidated due to login elsewhere or blacklisted
      const errorDetail = error.response.data?.detail || '';
      const errorMessage = errorDetail.toLowerCase();

      if (errorMessage.includes('token is blacklisted') ||
          errorMessage.includes('token invalid') ||
          errorMessage.includes('invalid token') ||
          errorMessage.includes('token has expired') ||
          errorMessage.includes('authentication credentials were not provided')) {
        console.log('Token blacklisted or invalid:', {
          url: originalRequest.url,
          errorMessage,
          isParticipantResponseRequest,
          shouldSkipLogout: isParticipantResponseRequest
        });

        // Don't logout for participant response requests
        if (isParticipantResponseRequest) {
          return Promise.reject(error);
        }

        // Check for specific token errors that require immediate logout
        const errorDetail = error.response?.data?.detail || '';
        const errorCode = error.response?.data?.code || '';

        // Use the authentication fix to handle auth errors
        if (authFix.handleAuthError(error)) {
          return Promise.reject(new Error('Authentication failed'));
        }

        // Fallback logout for other 401 errors
        authFix.forceLogout('Session expired');
        return Promise.reject(new Error('Session expired'));
      }

      // Check if we should attempt refresh based on retry count
      if (refreshRetryCount >= MAX_REFRESH_RETRIES) {
        console.log('Max refresh retries reached:', {
          url: originalRequest.url,
          isParticipantResponseRequest,
          shouldSkipLogout: isParticipantResponseRequest
        });

        // Don't logout for participant response requests
        if (isParticipantResponseRequest) {
          return Promise.reject(error);
        }

        // Use the authentication fix to handle logout
        authFix.forceLogout('Max refresh retries reached');
        return Promise.reject(new Error('Session expired'));
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (token) {
              originalRequest.headers.Authorization = 'Bearer ' + token;
              return axios(originalRequest);
            }
            return Promise.reject(error);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      // Mark this request as retried to prevent loops
      originalRequest._isRetry = true;
      isRefreshing = true;
      refreshRetryCount++;

      try {
        const newToken = await refreshToken();
        
        if (newToken) {
          refreshRetryCount = 0;
          api.defaults.headers.common.Authorization = 'Bearer ' + newToken;
          originalRequest.headers.Authorization = 'Bearer ' + newToken;
          processQueue(null, newToken);
          return api(originalRequest);
        } else {
          // Don't continue with failed refresh
          processQueue(new Error('Token refresh failed'), null);
          return Promise.reject(error);
        }
      } catch (err) {
        processQueue(err, null);
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    // For participant response requests with 401/403, don't auto-logout
    if (isParticipantResponseRequest && (error.response?.status === 401 || error.response?.status === 403)) {
      console.log('Participant response request error:', {
        url: originalRequest.url,
        status: error.response?.status,
        errorCode: error.response?.data?.code,
        errorMessage: error.response?.data?.detail || error.response?.data?.message,
        isParticipantResponseRequest: true
      });
      return Promise.reject(error);
    }

    // For all other errors, just reject
    return Promise.reject(error);
  }
);

// CSRF token function - simplified to avoid network errors
export const ensureCsrfToken = async () => {
  // CSRF token handling removed - not needed for current backend setup
  return true;
};

// Add a function to verify token validity
export const verifyToken = async () => {
  try {
    const response = await api.get('/authentication/verify-token/');
    return response.status === 200;
  } catch (error) {
    return false;
  }
};

// Add this interceptor to your API setup to log all requests and responses
api.interceptors.request.use(
  config => {
    if (config.url?.includes('notifications')) {
      console.log('Notifications request:', {
        url: config.url,
        method: config.method,
        data: config.data,
        headers: config.headers
      });
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  response => {
    if (response.config.url?.includes('notifications')) {
      console.log('Notifications response:', {
        status: response.status,
        data: response.data,
        headers: response.headers
      });
    }
    return response;
  },
  error => {
    if (error.config?.url?.includes('notifications')) {
      console.log('Notifications error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    }
    return Promise.reject(error);
  }
);

export default api;

