import { create } from 'zustand';
import axios from '../utils/axiosetup';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  username: string | null;
  projectId: number | null; // Add projectId here
  usertype: string | null; // contractor, client, etc.
  django_user_type: string | null; // 'projectadmin' or 'adminuser'
  userId: string | number | null;
  user: any | null; // Add user object
  selectedProject: any | null; // Add selected project
  isPasswordResetRequired: boolean;
  lastRefreshTime: number | null; // Track when token was last refreshed
  tokenExpiry: string | null; // Track when token expires
  grade: string | null; // Add grade property (A, B, C)
  department: string | null; // Add department property
  isApproved: boolean; // Track if user is approved for full access
  hasSubmittedDetails: boolean; // Track if user has submitted their details
  setToken: (
    token: string | null,
    refreshToken: string | null,
    projectId: number | null,
    username: string | null,
    usertype: string | null,
    django_user_type: string | null,
    userId: string | number | null,
    isPasswordResetRequired: boolean,
    grade: string | null, // Add grade parameter
    department: string | null, // Add department parameter
    isApproved?: boolean,
    hasSubmittedDetails?: boolean
  ) => void;
  setRefreshToken: (refreshToken: string | null) => void;
  setUsername: (username: string | null) => void;
  setUsertype: (usertype: string | null) => void;
  setDjangoUserType: (django_user_type: string | null) => void;
  setUserId: (userId: string | number | null) => void;
  setUser: (user: any | null) => void; // Add setter for user object
  setSelectedProject: (project: any | null) => void; // Add setter for selected project
  setIsPasswordResetRequired: (value: boolean) => void;
  setLastRefreshTime: (time: number) => void; // Set last refresh time
  setGrade: (grade: string | null) => void; // Add setter for grade
  setDepartment: (department: string | null) => void; // Add setter for department
  setApprovalStatus: (isApproved: boolean, hasSubmittedDetails: boolean) => void;
  clearToken: () => void;
  isAuthenticated: () => boolean;
  logout: (showMessage?: boolean) => Promise<{ success: boolean; showMessage?: boolean }>;
  secureLogout: () => Promise<void>; // Enhanced logout with better error handling
}

const getStoredItem = (key: string): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
};

const useAuthStore = create<AuthState>((set, get) => ({
  token: getStoredItem('token'),
  refreshToken: getStoredItem('refreshToken'),
  username: getStoredItem('username'),
  projectId: getStoredItem('projectId') ? parseInt(getStoredItem('projectId')!, 10) : null,
  usertype: getStoredItem('usertype'),
  django_user_type: getStoredItem('django_user_type'),
  userId: getStoredItem('userId'),
  user: null, // Initialize user object
  selectedProject: null, // Initialize selected project
  isPasswordResetRequired: false,
  lastRefreshTime: getStoredItem('lastRefreshTime') ? parseInt(getStoredItem('lastRefreshTime')!, 10) : null,
  tokenExpiry: getStoredItem('tokenExpiry'),
  grade: getStoredItem('grade'), // Initialize grade from localStorage
  department: getStoredItem('department'), // Initialize department from localStorage
  isApproved: getStoredItem('isApproved') === 'true',
  hasSubmittedDetails: getStoredItem('hasSubmittedDetails') === 'true',
  setToken: (
    token: string | null,
    refreshToken: string | null,
    projectId: number | null,
    username: string | null,
    usertype: string | null,
    django_user_type: string | null,
    userId: string | number | null,
    isPasswordResetRequired: boolean,
    grade: string | null, // Add grade parameter
    department: string | null, // Add department parameter
    isApproved?: boolean,
    hasSubmittedDetails?: boolean
  ) => {
    // Calculate token expiry (1 hour from now)
    const expiryDate = token ? new Date(Date.now() + 55 * 60 * 1000).toISOString() : null; // 55 minutes to be safe
    
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('token', token);
        localStorage.setItem('tokenExpiry', expiryDate!);
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('tokenExpiry');
      }
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      } else {
        localStorage.removeItem('refreshToken');
      }
      if (username) {
        localStorage.setItem('username', username);
      } else {
        localStorage.removeItem('username');
      }
      if (projectId !== null) {
        localStorage.setItem('projectId', projectId.toString());
      } else {
        localStorage.removeItem('projectId');
      }
      if (usertype) {
        localStorage.setItem('usertype', usertype);
      } else {
        localStorage.removeItem('usertype');
      }
      if (django_user_type) {
        localStorage.setItem('django_user_type', django_user_type);
      } else {
        localStorage.removeItem('django_user_type');
      }
      if (userId !== null && userId !== undefined) {
        localStorage.setItem('userId', String(userId));
      } else {
        localStorage.removeItem('userId');
      }
      localStorage.setItem('isPasswordResetRequired', isPasswordResetRequired.toString());
      if (grade) {
        localStorage.setItem('grade', grade);
      } else {
        localStorage.removeItem('grade');
      }
      if (department) {
        localStorage.setItem('department', department);
      } else {
        localStorage.removeItem('department');
      }
      if (isApproved !== undefined) {
        localStorage.setItem('isApproved', isApproved.toString());
      }
      if (hasSubmittedDetails !== undefined) {
        localStorage.setItem('hasSubmittedDetails', hasSubmittedDetails.toString());
      }
    }
    set({
      token,
      refreshToken,
      projectId,
      username,
      usertype,
      django_user_type,
      userId,
      isPasswordResetRequired,
      tokenExpiry: expiryDate,
      grade,
      department,
      isApproved: isApproved ?? get().isApproved,
      hasSubmittedDetails: hasSubmittedDetails ?? get().hasSubmittedDetails,
    });
  },
  setRefreshToken: (refreshToken: string | null) => {
    if (typeof window !== 'undefined') {
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      } else {
        localStorage.removeItem('refreshToken');
      }
    }
    set({ refreshToken });
  },
  setUsername: (username: string | null) => {
    if (typeof window !== 'undefined') {
      if (username) {
        localStorage.setItem('username', username);
      } else {
        localStorage.removeItem('username');
      }
    }
    set({ username });
  },
  setUsertype: (usertype: string | null) => {
    if (typeof window !== 'undefined') {
      if (usertype) {
        localStorage.setItem('usertype', usertype);
      } else {
        localStorage.removeItem('usertype');
      }
    }
    set({ usertype });
  },
  setDjangoUserType: (django_user_type: string | null) => {
    if (typeof window !== 'undefined') {
      if (django_user_type) {
        localStorage.setItem('django_user_type', django_user_type);
      } else {
        localStorage.removeItem('django_user_type');
      }
    }
    set({ django_user_type });
  },
  setUserId: (userId: string | number | null) => {
    if (typeof window !== 'undefined') {
      if (userId !== null && userId !== undefined) {
        localStorage.setItem('userId', String(userId));
      } else {
        localStorage.removeItem('userId');
      }
    }
    set({ userId });
  },
  setUser: (user: any | null) => {
    set({ user });
  },
  setSelectedProject: (project: any | null) => {
    set({ selectedProject: project });
  },
  setIsPasswordResetRequired: (value: boolean) => {
    set({ isPasswordResetRequired: value });
  },
  setLastRefreshTime: (time: number) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastRefreshTime', time.toString());
    }
    set({ lastRefreshTime: time });
  },
  setGrade: (grade: string | null) => {
    if (typeof window !== 'undefined') {
      if (grade) {
        localStorage.setItem('grade', grade);
      } else {
        localStorage.removeItem('grade');
      }
    }
    set({ grade });
  },
  setDepartment: (department: string | null) => {
    if (typeof window !== 'undefined') {
      if (department) {
        localStorage.setItem('department', department);
      } else {
        localStorage.removeItem('department');
      }
    }
    set({ department });
  },
  setApprovalStatus: (isApproved: boolean, hasSubmittedDetails: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('isApproved', isApproved.toString());
      localStorage.setItem('hasSubmittedDetails', hasSubmittedDetails.toString());
    }
    set({ isApproved, hasSubmittedDetails });
  },
  clearToken: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('username');
      localStorage.removeItem('projectId');
      localStorage.removeItem('usertype');
      localStorage.removeItem('django_user_type');
      localStorage.removeItem('userId');
      localStorage.removeItem('isPasswordResetRequired');
      localStorage.removeItem('lastRefreshTime');
      localStorage.removeItem('tokenExpiry');
      localStorage.removeItem('grade'); // Clear grade from localStorage
      localStorage.removeItem('department'); // Clear department from localStorage
      localStorage.removeItem('isApproved');
      localStorage.removeItem('hasSubmittedDetails');
    }
    set({
      token: null,
      refreshToken: null,
      username: null,
      projectId: null,
      usertype: null,
      django_user_type: null,
      userId: null,
      isPasswordResetRequired: false,
      lastRefreshTime: null,
      tokenExpiry: null,
      grade: null, // Clear grade from state
      department: null, // Clear department from state
      isApproved: false,
      hasSubmittedDetails: false,
    });
  },
  isAuthenticated: () => {
    const token = get().token;
    const tokenExpiry = get().tokenExpiry;

    if (!token) {
      return false;
    }

    // If we have an expiry time, check if token is still valid
    if (tokenExpiry) {
      const expiryTime = new Date(tokenExpiry).getTime();
      const currentTime = Date.now();
      // Give 2 minute buffer before considering token expired (increased from 1 minute)
      const isValid = expiryTime > currentTime + 120000;

      if (!isValid) {
        console.log('Token expired:', {
          expiryTime: new Date(expiryTime).toISOString(),
          currentTime: new Date(currentTime).toISOString(),
          bufferTime: new Date(currentTime + 120000).toISOString()
        });
      }

      return isValid;
    }

    // If no expiry time, assume token is valid
    return true;
  },
  logout: async (showMessage: boolean = false) => {
    const { refreshToken, token } = get();

    try {
      if (!refreshToken) {
        get().clearToken();
        return { success: true, showMessage };
      }


      // Make logout API call with proper authentication headers
      await axios.post('/authentication/logout/',
        { refresh: refreshToken },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return { success: true, showMessage };

    } catch (error: any) {
      // Don't throw error - always clear tokens locally
      return { success: true, showMessage }; // Still consider it successful for UI purposes
    } finally {
      // Always clear tokens regardless of API success/failure
      get().clearToken();
    }
  },

  silentLogout: () => {
    // Silent logout without API call - used for token expiration/blacklisting
    get().clearToken();
  },

  secureLogout: async () => {
    const { refreshToken, token } = get();


    // Step 1: Validate we have necessary tokens
    if (!token) {
      get().clearToken();
      return;
    }

    if (!refreshToken) {
      get().clearToken();
      return;
    }

    try {
      // Step 2: Make logout API call with comprehensive error handling

      const baseURL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000/';
      const response = await axios.post(`${baseURL}authentication/logout/`,
        { refresh: refreshToken },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 15000, // 15 second timeout
          validateStatus: (status) => status < 500 // Don't throw on 4xx errors
        }
      );

      if (response.status >= 200 && response.status < 300) {
      } else if (response.status === 401) {
      } else if (response.status === 400) {
      } else {
      }

    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
      } else if (error.response) {
        console.log('Logout error response:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
      } else if (error.request) {
      } else {
      }
      // Don't throw - always proceed with local logout
    } finally {
      // Step 3: Always clear tokens locally regardless of API success/failure
      get().clearToken();
    }
  },
}));

export default useAuthStore;

