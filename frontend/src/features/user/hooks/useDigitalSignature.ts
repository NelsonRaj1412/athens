import { useState } from 'react';
import api from '@common/utils/axiosetup';
import { App } from 'antd';

interface SignatureOptions {
  customDateTime?: string; // ISO string
}

interface UseDigitalSignatureReturn {
  generateSignature: (options?: SignatureOptions) => Promise<string | null>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for generating digital signatures for document signing
 * 
 * Usage:
 * ```tsx
 * const { generateSignature, loading } = useDigitalSignature();
 * 
 * const handleSign = async () => {
 *   const signatureUrl = await generateSignature();
 *   if (signatureUrl) {
 *     // Use the signature URL in your document
 *   }
 * };
 * ```
 */
export const useDigitalSignature = (): UseDigitalSignatureReturn => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSignature = async (options: SignatureOptions = {}): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      const payload: any = {};
      
      if (options.customDateTime) {
        payload.sign_datetime = options.customDateTime;
      }

      const response = await api.post('/authentication/signature/generate/', payload, {
        responseType: 'blob' // Important: we're receiving an image
      });

      // Create a blob URL for the signature image
      const blob = new Blob([response.data], { type: 'image/png' });
      const signatureUrl = URL.createObjectURL(blob);

      return signatureUrl;

    } catch (error: any) {
      
      let errorMessage = 'Failed to generate digital signature';
      
      if (error.response?.status === 404) {
        errorMessage = 'No signature template found. Please create one in your profile.';
      } else if (error.response?.data) {
        try {
          // Try to parse error response (might be JSON)
          const errorText = await error.response.data.text();
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If parsing fails, use default message
        }
      }
      
      setError(errorMessage);
      message.error(errorMessage);
      return null;

    } finally {
      setLoading(false);
    }
  };

  return {
    generateSignature,
    loading,
    error
  };
};

/**
 * Utility function to download a signature as a file
 */
export const downloadSignature = (signatureUrl: string, filename: string = 'signature.png') => {
  const link = document.createElement('a');
  link.href = signatureUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Utility function to convert signature URL to File object for form uploads
 */
export const signatureUrlToFile = async (signatureUrl: string, filename: string = 'signature.png'): Promise<File> => {
  const response = await api.get(signatureUrl, { responseType: 'blob' });
  const blob = response.data;
  return new File([blob], filename, { type: 'image/png' });
};

export default useDigitalSignature;
