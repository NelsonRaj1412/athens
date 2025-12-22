import useAuthStore from '../store/authStore';

/**
 * Authentication guard utility to prevent API calls when user is not authenticated
 */
export const authGuard = {
  /**
   * Check if user is authenticated and authorized to make API calls
   */
  canMakeApiCall(): boolean {
    const { token, isAuthenticated } = useAuthStore.getState();
    return !!(token && isAuthenticated());
  },

  /**
   * Check if user is authenticated and approved for full access
   */
  canAccessProtectedFeatures(): boolean {
    const { token, isAuthenticated, isApproved, hasSubmittedDetails } = useAuthStore.getState();
    return !!(token && isAuthenticated() && isApproved && hasSubmittedDetails);
  },

  /**
   * Wrapper for API calls that should only execute if user is authenticated
   */
  async executeIfAuthenticated<T>(apiCall: () => Promise<T>): Promise<T | null> {
    if (!this.canMakeApiCall()) {
      console.log('Skipping API call - user not authenticated');
      return null;
    }
    return apiCall();
  },

  /**
   * Wrapper for API calls that should only execute if user has full access
   */
  async executeIfAuthorized<T>(apiCall: () => Promise<T>): Promise<T | null> {
    if (!this.canAccessProtectedFeatures()) {
      console.log('Skipping API call - user not authorized');
      return null;
    }
    return apiCall();
  }
};