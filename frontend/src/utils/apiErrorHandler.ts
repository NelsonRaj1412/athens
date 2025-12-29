/**
 * Comprehensive API Error Handler
 * Handles common 400 Bad Request and authentication errors across the application
 */

import { message } from 'antd';
import useAuthStore from '@common/store/authStore';

export interface ApiError {
  response?: {
    status: number;
    data: any;
  };
  message: string;
}

export class ApiErrorHandler {
  /**
   * Handle API errors with appropriate user feedback and actions
   */
  static handleError(error: ApiError, context?: string): void {
    const status = error.response?.status;
    const errorData = error.response?.data;

    console.error(`API Error ${context ? `in ${context}` : ''}:`, {
      status,
      data: errorData,
      message: error.message
    });

    switch (status) {
      case 400:
        this.handle400Error(errorData, context);
        break;
      case 401:
        this.handle401Error(errorData, context);
        break;
      case 403:
        this.handle403Error(errorData, context);
        break;
      case 404:
        this.handle404Error(errorData, context);
        break;
      case 500:
        this.handle500Error(errorData, context);
        break;
      default:
        this.handleGenericError(error, context);
    }
  }

  /**
   * Handle 400 Bad Request errors
   */
  private static handle400Error(errorData: any, context?: string): void {
    if (errorData) {
      // Handle validation errors
      if (typeof errorData === 'object' && !Array.isArray(errorData)) {
        const fieldErrors = this.extractFieldErrors(errorData);
        if (fieldErrors.length > 0) {
          message.error(`Validation Error: ${fieldErrors.join(', ')}`);
          return;
        }
      }

      // Handle specific error messages
      if (errorData.detail) {
        message.error(`Error: ${errorData.detail}`);
        return;
      }

      if (errorData.error) {
        message.error(`Error: ${errorData.error}`);
        return;
      }

      if (errorData.message) {
        message.error(`Error: ${errorData.message}`);
        return;
      }
    }

    // Generic 400 error
    message.error(`Bad Request${context ? ` in ${context}` : ''}. Please check your input and try again.`);
  }

  /**
   * Handle 401 Unauthorized errors
   */
  private static handle401Error(errorData: any, context?: string): void {
    const authStore = useAuthStore.getState();
    
    // Check if this is a token expiration
    if (errorData?.detail?.toLowerCase().includes('token') || 
        errorData?.detail?.toLowerCase().includes('authentication')) {
      message.error('Your session has expired. Please log in again.');
      
      // Force logout after a short delay
      setTimeout(() => {
        authStore.logout();
        window.location.href = '/signin';
      }, 1500);
    } else {
      message.error(`Authentication required${context ? ` for ${context}` : ''}. Please log in.`);
    }
  }

  /**
   * Handle 403 Forbidden errors
   */
  private static handle403Error(errorData: any, context?: string): void {
    if (errorData?.detail) {
      message.error(`Access Denied: ${errorData.detail}`);
    } else {
      message.error(`You don't have permission to perform this action${context ? ` in ${context}` : ''}.`);
    }
  }

  /**
   * Handle 404 Not Found errors
   */
  private static handle404Error(errorData: any, context?: string): void {
    if (errorData?.detail) {
      message.error(`Not Found: ${errorData.detail}`);
    } else {
      message.error(`Resource not found${context ? ` in ${context}` : ''}.`);
    }
  }

  /**
   * Handle 500 Internal Server errors
   */
  private static handle500Error(errorData: any, context?: string): void {
    message.error(`Server error${context ? ` in ${context}` : ''}. Please try again later or contact support.`);
  }

  /**
   * Handle generic errors
   */
  private static handleGenericError(error: ApiError, context?: string): void {
    if (error.message?.toLowerCase().includes('network')) {
      message.error('Network error. Please check your connection and try again.');
    } else {
      message.error(`An unexpected error occurred${context ? ` in ${context}` : ''}. Please try again.`);
    }
  }

  /**
   * Extract field-specific validation errors
   */
  private static extractFieldErrors(errorData: any): string[] {
    const errors: string[] = [];

    Object.keys(errorData).forEach(field => {
      const fieldError = errorData[field];
      if (Array.isArray(fieldError)) {
        fieldError.forEach(err => {
          errors.push(`${field}: ${err}`);
        });
      } else if (typeof fieldError === 'string') {
        errors.push(`${field}: ${fieldError}`);
      }
    });

    return errors;
  }

  /**
   * Validate required fields before API calls
   */
  static validateRequiredFields(data: any, requiredFields: string[]): { isValid: boolean; missingFields: string[] } {
    const missingFields: string[] = [];

    requiredFields.forEach(field => {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        missingFields.push(field);
      }
    });

    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  }

  /**
   * Show validation errors for missing fields
   */
  static showValidationErrors(missingFields: string[]): void {
    if (missingFields.length > 0) {
      message.error(`Please fill in the following required fields: ${missingFields.join(', ')}`);
    }
  }
}

/**
 * Common validation rules for different forms
 */
export const ValidationRules = {
  userCreation: ['username', 'email', 'name', 'surname', 'department', 'designation', 'grade', 'phone_number'],
  adminCreation: ['username', 'company_name', 'registered_address'],
  projectCreation: ['name', 'category', 'location', 'commencementDate', 'deadlineDate'],
};

/**
 * Helper function to handle API calls with error handling
 */
export const handleApiCall = async <T>(
  apiCall: () => Promise<T>,
  context?: string,
  requiredFields?: { data: any; fields: string[] }
): Promise<T | null> => {
  try {
    // Validate required fields if provided
    if (requiredFields) {
      const validation = ApiErrorHandler.validateRequiredFields(
        requiredFields.data,
        requiredFields.fields
      );
      
      if (!validation.isValid) {
        ApiErrorHandler.showValidationErrors(validation.missingFields);
        return null;
      }
    }

    const result = await apiCall();
    return result;
  } catch (error: any) {
    ApiErrorHandler.handleError(error, context);
    return null;
  }
};