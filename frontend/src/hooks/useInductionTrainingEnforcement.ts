import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { message } from 'antd';
import useAuthStore from '@common/store/authStore';
import api from '@common/utils/axiosetup';

interface InductionStatus {
  hasCompleted: boolean;
  isEPCSafety: boolean;
  isMasterAdmin: boolean;
}

/**
 * Hook to enforce mandatory induction training business rules
 */
export const useInductionTrainingEnforcement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { usertype, django_user_type, department } = useAuthStore();

  // URLs that are exempt from induction training check
  const exemptPaths = [
    '/dashboard',
    '/dashboard/userdetail',
    '/dashboard/admindetail',
    '/dashboard/voice-translator',
    '/dashboard/inductiontraining',
    '/login',
    '/logout'
  ];

  // Paths that require induction training completion
  const restrictedPaths = [
    '/dashboard/workers',
    '/dashboard/manpower',
    '/dashboard/safetyobservation',
    '/dashboard/incidentmanagement',
    '/dashboard/ptw',
    '/dashboard/inspection',
    '/dashboard/esg',
    '/dashboard/quality',
    '/dashboard/jobtraining',
    '/dashboard/toolboxtalk',
    '/dashboard/mom'
  ];

  const checkInductionStatus = async (): Promise<InductionStatus> => {
    try {
      const response = await api.get('/authentication/induction-status/');
      return response.data;
    } catch (error) {
      console.error('Failed to check induction status:', error);
      return {
        hasCompleted: false,
        isEPCSafety: false,
        isMasterAdmin: false
      };
    }
  };

  const isEPCSafetyUser = (): boolean => {
    return usertype === 'epcuser' && department && department.toLowerCase().includes('safety');
  };

  const isMasterAdmin = (): boolean => {
    return usertype === 'master';
  };

  const isRestrictedPath = (path: string): boolean => {
    return restrictedPaths.some(restrictedPath => path.startsWith(restrictedPath));
  };

  const isExemptPath = (path: string): boolean => {
    return exemptPaths.some(exemptPath => path === exemptPath || path.startsWith(exemptPath));
  };

  useEffect(() => {
    const enforceInductionTraining = async () => {
      // Skip enforcement for exempt paths
      if (isExemptPath(location.pathname)) {
        return;
      }

      // Skip for master admin and EPC Safety users
      if (isMasterAdmin() || isEPCSafetyUser()) {
        return;
      }

      // Check if current path requires induction training
      if (isRestrictedPath(location.pathname)) {
        const status = await checkInductionStatus();
        
        if (!status.hasCompleted && !status.isEPCSafety && !status.isMasterAdmin) {
          message.error({
            content: 'You must complete induction training before accessing this module.',
            duration: 5,
            key: 'induction-required'
          });
          
          // Redirect to dashboard
          navigate('/dashboard', { replace: true });
        }
      }
    };

    enforceInductionTraining();
  }, [location.pathname, usertype, django_user_type, department]);

  return {
    isEPCSafetyUser: isEPCSafetyUser(),
    isMasterAdmin: isMasterAdmin(),
    checkInductionStatus
  };
};

/**
 * Component wrapper to enforce induction training
 */
export const InductionTrainingGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useInductionTrainingEnforcement();
  return children;
};