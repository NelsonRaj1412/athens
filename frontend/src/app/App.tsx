// src/app/App.tsx

import React, { useEffect, Suspense } from 'react';
import { useNavigate, Routes, Route, useLocation, useOutletContext, Navigate, useParams } from 'react-router-dom';
import { Spin } from 'antd';

import useAuthStore from '@common/store/authStore';
import { ensureCsrfToken } from '@common/utils/axiosetup';

import ErrorBoundary from './ErrorBoundary';
import { NotificationsProvider } from '@common/contexts/NotificationsContext';

// --- Page and component imports ---
import SigninApp from '@features/signin/pages/App';
import Dashboard from '@features/dashboard/components/Dashboard';
import ResetPassword from '@features/signin/components/resetpassword';
import ProjectsList from '@features/project/components/ProjectsList';
import AdminCreation from '@features/admin/components/AdminCreation';
import AdminDetail from '@features/admin/components/AdminDetail';
import AdminApprovalNew from '@features/admin/components/AdminApprovalNew';
import PendingApprovals from '@features/admin/components/PendingApprovals';

import UserList from '@features/user/components/UserList';
import { default as UserDetail } from '@features/user/components/userdetail';
import CompanyDetailsForm from '@features/companydetails/companydetails';
import ChatBox from '@features/chatbox/components/chatbox';
import RoleBasedRoute from './RoleBasedRoute';
// Removed unused manpower imports - files were cleaned up
import DailyAttendanceForm from '@features/manpower/components/DailyAttendanceForm';
import ManpowerVisualization from '@features/manpower/components/ManpowerVisualization';
import WorkerPage from '@features/worker/pages/WorkerPage';
import ToolboxTalkList from '@features/toolboxtalk/components/ToolboxTalkList';
import InductionTrainingList from '@features/inductiontraining/components/InductionTrainingList';
import { JobTrainingList } from '@features/jobtraining';
import IncidentManagementRoutes from '@features/incidentmanagement/routes';
import SafetyObservationFormPage from '@features/safetyobservation/components/SafetyObservationFormPage';
import SafetyObservationList from '@features/safetyobservation/components/SafetyObservationList';
import SafetyObservationEdit from '@features/safetyobservation/components/SafetyObservationEdit';
import SafetyObservationReview from '@features/safetyobservation/components/SafetyObservationReview';
import MomCreationForm from '@features/mom/components/MomCreationForm';
import MomList from '@features/mom/components/MomList';
import MomEdit from '@features/mom/components/MomEdit';
import MomView from '@features/mom/components/MomView';
import MomLive from '@features/mom/components/MomLive';
import MomWrapper from '@features/mom/components/MomWrapper';
import ParticipantResponse from '@features/mom/components/ParticipantResponse';
import TodoList from '@common/components/todolist/TodoList';
import PTWRoutes from '../features/ptw/routes';
import DashboardOverview from '@features/dashboard/components/DashboardOverview';
import DocumentSignatureExample from '@features/user/components/DocumentSignatureExample';
import MobilePermitView from '@features/ptw/components/MobilePermitView';
import PermissionRequestsList from '../components/permissions/PermissionRequestsList';
import { SystemSettings, SystemLogs, SystemBackup } from '@features/system';
import InspectionList from '@features/inspection/components/InspectionList';
import InspectionCreate from '@features/inspection/components/InspectionCreate';
import InspectionReports from '@features/inspection/components/InspectionReports';
import ACCableInspectionForm from '@features/inspection/components/forms/ACCableInspectionForm';
import ACCableFormList from '@features/inspection/components/forms/ACCableFormList';
import ACDBChecklistForm from '@features/inspection/components/forms/ACDBChecklistForm';
import ACDBChecklistFormList from '@features/inspection/components/forms/ACDBChecklistFormList';
import HTCableChecklistForm from '@features/inspection/components/forms/HTCableChecklistForm';
import HTCableFormList from '@features/inspection/components/forms/HTCableFormList';
import HTPreCommissionForm from '@features/inspection/components/forms/HTPreCommissionForm';
import HTPreCommissionFormList from '@features/inspection/components/forms/HTPreCommissionFormList';
import HTPreCommissionTemplateForm from '@features/inspection/components/forms/HTPreCommissionTemplateForm';
import HTPreCommissionTemplateFormList from '@features/inspection/components/forms/HTPreCommissionTemplateFormList';
import CivilWorkChecklistForm from '@features/inspection/components/forms/CivilWorkChecklistForm';
import CivilWorkChecklistFormList from '@features/inspection/components/forms/CivilWorkChecklistFormList';
import CementRegisterForm from '@features/inspection/components/forms/CementRegisterForm';
import CementRegisterFormList from '@features/inspection/components/forms/CementRegisterFormList';
import ConcretePourCardForm from '@features/inspection/components/forms/ConcretePourCardForm';
import ConcretePourCardFormList from '@features/inspection/components/forms/ConcretePourCardFormList';
import PCCChecklistForm from '@features/inspection/components/forms/PCCChecklistForm';
import PCCChecklistFormList from '@features/inspection/components/forms/PCCChecklistFormList';
import BarBendingScheduleForm from '@features/inspection/components/forms/BarBendingScheduleForm';
import BarBendingScheduleFormList from '@features/inspection/components/forms/BarBendingScheduleFormList';
import BatteryChargerChecklistForm from '@features/inspection/components/forms/BatteryChargerChecklistForm';
import BatteryChargerChecklistFormList from '@features/inspection/components/forms/BatteryChargerChecklistFormList';
import BatteryUPSChecklistForm from '@features/inspection/components/forms/BatteryUPSChecklistForm';
import BatteryUPSChecklistFormList from '@features/inspection/components/forms/BatteryUPSChecklistFormList';
import BusDuctChecklistForm from '@features/inspection/components/forms/BusDuctChecklistForm';
import BusDuctChecklistFormList from '@features/inspection/components/forms/BusDuctChecklistFormList';
import ControlCableChecklistForm from '@features/inspection/components/forms/ControlCableChecklistForm';
import ControlCableChecklistFormList from '@features/inspection/components/forms/ControlCableChecklistFormList';
import ControlRoomAuditChecklistForm from '@features/inspection/components/forms/ControlRoomAuditChecklistForm';
import ControlRoomAuditChecklistFormList from '@features/inspection/components/forms/ControlRoomAuditChecklistFormList';
import EarthingChecklistForm from '@features/inspection/components/forms/EarthingChecklistForm';
import EarthingChecklistFormList from '@features/inspection/components/forms/EarthingChecklistFormList';

// ESG imports
import { 
  ESGOverview, 
  EnvironmentPage, 
  GovernancePage, 
  ESGReportsPage,
  CarbonFootprintDashboard,
  WaterManagementDashboard,
  EnergyManagementDashboard,
  EnvironmentalIncidentDashboard
} from '@features/esg';
import EnvironmentalMonitoringDashboard from '@features/esg/components/EnvironmentalMonitoringDashboard';
import SustainabilityTargetsDashboard from '@features/esg/components/SustainabilityTargetsDashboard';

// Quality Management imports
import { QualityDashboard, QualityInspectionList, InspectionForm, SupplierQuality, DefectManagement, QualityTemplates, QualityStandards, QualityAlerts } from '@features/quality';
import QualityDashboardEnhanced from '@features/quality/components/QualityDashboardEnhanced';

// PTW Redirect component for old test links
const PTWRedirect: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/dashboard/ptw/view/${id}`} replace />;
};

// ==================== FIX IS HERE (Step 1) ====================
// Import the new component to be used in the router.
import ProjectAttendance from '@features/project/components/ProjectAttendance';
// ===============================================================

// AI Bot Integration
import AIBotWidget from '@features/ai_bot/components/AIBotWidget';

// Voice Translator
import VoiceTranslator from '../components/VoiceTranslator';

// --- Helper components and event listeners ---
const ProfileWrapper: React.FC = () => {
  const { userToApprove, onApprovalSuccess } = useOutletContext<{
    userToApprove?: any | null;
    onApprovalSuccess?: (approvedUserId: number) => void;
  }>();
  return <UserDetail />;
};

window.addEventListener('error', (event) => {
  // Error logged to browser console automatically
  event.preventDefault();
  return true;
});

window.addEventListener('unhandledrejection', (event) => {
  // Error logged to browser console automatically
  event.preventDefault();
  return true;
});


// The main App component
// Protected Dashboard Component
const ProtectedDashboard: React.FC = () => {
  const { token, isAuthenticated } = useAuthStore();

  // Check authentication before rendering Dashboard
  if (!token || !isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return <Dashboard />;
};

const App: React.FC = () => {
  const token = useAuthStore((state) => state.token);
  const isPasswordResetRequired = useAuthStore((state) => state.isPasswordResetRequired);
  const navigate = useNavigate();
  const location = useLocation();

  // CSRF token setup removed - not needed for current backend configuration

  useEffect(() => {
    // Prevent navigation loops during logout
    if (location.pathname === '/login') {
      return;
    }

    if (!token && location.pathname !== '/login') {
      navigate('/login', { replace: true });
    } else if (isPasswordResetRequired && location.pathname !== '/reset-password') {
      navigate('/reset-password', { replace: true });
    } else if (token && !isPasswordResetRequired && !location.pathname.startsWith('/dashboard')) {
      navigate('/dashboard', { replace: true });
    }
  }, [token, isPasswordResetRequired, navigate, location.pathname]);
  
  const loadingSpinner = (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Spin size="large" />
    </div>
  );

  return (
    <ErrorBoundary>
      <NotificationsProvider>
        <Suspense fallback={loadingSpinner}>
          <Routes>
            <Route path="/login" element={<SigninApp />} />
            <Route path="/dashboard" element={<ProtectedDashboard />}>
              <Route index element={<DashboardOverview />} />
              
              {/* ==================== FIX IS HERE (Step 2) ==================== */}
              {/* Add a dedicated route for the attendance page so the URL works. */}
              <Route 
                path="attendance" 
                element={
                  <RoleBasedRoute allowedRoles={['adminuser', 'clientuser', 'epcuser', 'contractoruser', 'client', 'epc', 'contractor']}>
                    <ProjectAttendance />
                  </RoleBasedRoute>
                } 
              />
              {/* =============================================================== */}

              {/* --- All your other routes are unchanged --- */}
              <Route path="projects" element={<RoleBasedRoute allowedRoles={['master']}><ProjectsList /></RoleBasedRoute>} />
              <Route path="adminusers" element={<RoleBasedRoute allowedRoles={['master']}><AdminApprovalNew /></RoleBasedRoute>} />
              <Route path="admin-creation" element={<RoleBasedRoute allowedRoles={['master']}><AdminCreation /></RoleBasedRoute>} />

              {/* System Management Routes */}
              <Route path="system/settings" element={<RoleBasedRoute allowedRoles={['master']}><SystemSettings /></RoleBasedRoute>} />
              <Route path="system/logs" element={<RoleBasedRoute allowedRoles={['master']}><SystemLogs /></RoleBasedRoute>} />
              <Route path="system/backup" element={<RoleBasedRoute allowedRoles={['master']}><SystemBackup /></RoleBasedRoute>} />

              <Route path="admindetail" element={<RoleBasedRoute allowedRoles={['master', 'client', 'epc', 'contractor', 'contractor1', 'contractor2', 'contractor3', 'contractor4', 'contractor5', 'projectadmin']}><AdminDetail /></RoleBasedRoute>} />
              <Route path="pending-approvals" element={<RoleBasedRoute allowedRoles={['master']}><PendingApprovals /></RoleBasedRoute>} />
              <Route path="users" element={<RoleBasedRoute allowedRoles={['client', 'epc', 'contractor', 'contractor1', 'contractor2', 'contractor3', 'contractor4', 'contractor5']}><UserList /></RoleBasedRoute>} />
              <Route path="userdetail" element={<RoleBasedRoute allowedRoles={['adminuser']}><UserDetail /></RoleBasedRoute>} />
              <Route path="profile" element={<ProfileWrapper />} />
              <Route path="settings" element={<CompanyDetailsForm />} />
              <Route path="chatbox" element={<RoleBasedRoute allowedRoles={['clientuser', 'contractoruser', 'epcuser']}><ChatBox /></RoleBasedRoute>} />
              <Route path="ai-bot" element={<RoleBasedRoute allowedRoles={['adminuser', 'clientuser', 'epcuser', 'contractoruser']}><AIBotWidget /></RoleBasedRoute>} />
              <Route path="voice-translator" element={<RoleBasedRoute allowedRoles={['adminuser', 'clientuser', 'epcuser', 'contractoruser']}><VoiceTranslator /></RoleBasedRoute>} />
              {/* Main manpower page shows list with CRUD operations */}
              <Route path="manpower" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><ManpowerVisualization /></RoleBasedRoute>} />
              <Route path="manpower/add" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><DailyAttendanceForm /></RoleBasedRoute>} />
              <Route path="manpower/reports" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><ManpowerVisualization /></RoleBasedRoute>} />
              {/* Removed legacy manpower routes - components were cleaned up */}
              <Route path="workers" element={<RoleBasedRoute allowedRoles={['client', 'epc', 'contractor', 'contractor1', 'contractor2', 'contractor3', 'contractor4', 'contractor5', 'clientuser', 'epcuser', 'contractoruser']}><WorkerPage /></RoleBasedRoute>} />
              <Route path="toolboxtalk" element={<RoleBasedRoute allowedRoles={['adminuser', 'clientuser', 'epcuser', 'contractoruser']}><ToolboxTalkList /></RoleBasedRoute>} />
              <Route path="inductiontraining" element={<RoleBasedRoute allowedRoles={['client', 'epc', 'contractor', 'contractor1', 'contractor2', 'contractor3', 'contractor4', 'contractor5', 'clientuser', 'epcuser', 'contractoruser', 'adminuser']}><InductionTrainingList /></RoleBasedRoute>} />
              <Route path="jobtraining" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><JobTrainingList /></RoleBasedRoute>} />
              <Route path="mom" element={<RoleBasedRoute allowedRoles={['adminuser', 'clientuser', 'epcuser']}><MomWrapper /></RoleBasedRoute>}>
                <Route index element={<RoleBasedRoute allowedRoles={['adminuser', 'clientuser', 'epcuser']}><MomList /></RoleBasedRoute>} />
                <Route path="schedule" element={<RoleBasedRoute allowedRoles={['adminuser', 'clientuser', 'epcuser']}><MomCreationForm /></RoleBasedRoute>} />
                <Route path="edit/:id" element={<RoleBasedRoute allowedRoles={['adminuser', 'clientuser', 'epcuser']}><MomEdit /></RoleBasedRoute>} />
                <Route path="view/:id" element={<RoleBasedRoute allowedRoles={['adminuser', 'clientuser', 'epcuser']}><MomView /></RoleBasedRoute>} />
<Route path="live/:id" element={<RoleBasedRoute allowedRoles={['adminuser', 'clientuser', 'epcuser']}><MomLive /></RoleBasedRoute>} />
              </Route>
              <Route path="incidentmanagement/*" element={<IncidentManagementRoutes />} />
              {/* Safety Observation Routes - Review route MUST come before edit route to avoid conflicts */}
              <Route path="safetyobservation/review/:observationID" element={<RoleBasedRoute allowedRoles={['adminuser', 'clientuser', 'epcuser', 'contractoruser', 'client', 'epc', 'contractor']}><SafetyObservationReview /></RoleBasedRoute>} />
              <Route path="safetyobservation/form" element={<RoleBasedRoute allowedRoles={['adminuser', 'clientuser', 'epcuser', 'contractoruser', 'client', 'epc', 'contractor']}><SafetyObservationFormPage /></RoleBasedRoute>} />
              <Route path="safetyobservation/list" element={<RoleBasedRoute allowedRoles={['adminuser', 'clientuser', 'epcuser', 'contractoruser', 'client', 'epc', 'contractor']}><SafetyObservationList /></RoleBasedRoute>} />
              <Route path="safetyobservation/edit/:observationID" element={<RoleBasedRoute allowedRoles={['adminuser', 'clientuser', 'epcuser', 'contractoruser', 'client', 'epc', 'contractor']}><SafetyObservationEdit /></RoleBasedRoute>} />


              <Route path="todolist" element={<RoleBasedRoute allowedRoles={['adminuser', 'clientuser', 'epcuser']}><TodoList /></RoleBasedRoute>} />
              <Route path="permissions/requests" element={<RoleBasedRoute allowedRoles={['master', 'client', 'epc', 'contractor']}><PermissionRequestsList /></RoleBasedRoute>} />
              <Route path="signature-demo" element={<RoleBasedRoute allowedRoles={['adminuser', 'clientuser', 'epcuser', 'contractoruser']}><DocumentSignatureExample /></RoleBasedRoute>} />

              {/* Redirect old PTW test links to correct routes */}
              <Route path="ptw-test/:id" element={<PTWRedirect />} />

              <Route path="ptw/*" element={<RoleBasedRoute allowedRoles={['client', 'epc', 'contractor', 'clientuser', 'epcuser', 'contractoruser', 'master', 'adminuser']}><PTWRoutes /></RoleBasedRoute>} />
              
              {/* Inspection Routes */}
              <Route path="inspection/reports" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><InspectionReports /></RoleBasedRoute>} />
              <Route path="inspection/create" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><InspectionCreate /></RoleBasedRoute>} />
              <Route path="inspection" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><InspectionList /></RoleBasedRoute>} />
              <Route path="inspection/forms/ac-cable-testing" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><ACCableFormList /></RoleBasedRoute>} />
              <Route path="inspection/forms/ac-cable-testing/list" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><ACCableFormList /></RoleBasedRoute>} />
              <Route path="inspection/forms/ac-cable-testing/create" element={<RoleBasedRoute allowedRoles={['epcuser']}><ACCableInspectionForm /></RoleBasedRoute>} />
              <Route path="inspection/forms/acdb-checklist" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><ACDBChecklistFormList /></RoleBasedRoute>} />
              <Route path="inspection/forms/acdb-checklist/list" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><ACDBChecklistFormList /></RoleBasedRoute>} />
              <Route path="inspection/forms/acdb-checklist/create" element={<RoleBasedRoute allowedRoles={['epcuser']}><ACDBChecklistForm /></RoleBasedRoute>} />
              <Route path="inspection/forms/ht-cable" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><HTCableFormList /></RoleBasedRoute>} />
              <Route path="inspection/forms/ht-cable/list" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><HTCableFormList /></RoleBasedRoute>} />
              <Route path="inspection/forms/ht-cable/create" element={<RoleBasedRoute allowedRoles={['epcuser']}><HTCableChecklistForm /></RoleBasedRoute>} />
              <Route path="inspection/forms/ht-precommission" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><HTPreCommissionFormList /></RoleBasedRoute>} />
              <Route path="inspection/forms/ht-precommission/list" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><HTPreCommissionFormList /></RoleBasedRoute>} />
              <Route path="inspection/forms/ht-precommission/create" element={<RoleBasedRoute allowedRoles={['epcuser']}><HTPreCommissionForm /></RoleBasedRoute>} />
              <Route path="inspection/forms/ht-precommission-template" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><HTPreCommissionTemplateFormList /></RoleBasedRoute>} />
              <Route path="inspection/forms/ht-precommission-template/list" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><HTPreCommissionTemplateFormList /></RoleBasedRoute>} />
              <Route path="inspection/forms/ht-precommission-template/create" element={<RoleBasedRoute allowedRoles={['epcuser']}><HTPreCommissionTemplateForm /></RoleBasedRoute>} />
              <Route path="inspection/forms/civil-work-checklist" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><CivilWorkChecklistFormList /></RoleBasedRoute>} />
              <Route path="inspection/forms/civil-work-checklist/list" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><CivilWorkChecklistFormList /></RoleBasedRoute>} />
              <Route path="inspection/forms/civil-work-checklist/create" element={<RoleBasedRoute allowedRoles={['epcuser']}><CivilWorkChecklistForm /></RoleBasedRoute>} />
              <Route path="inspection/cement-register-forms" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><CementRegisterFormList /></RoleBasedRoute>} />
              <Route path="inspection/cement-register-forms/new" element={<RoleBasedRoute allowedRoles={['epcuser']}><CementRegisterForm /></RoleBasedRoute>} />
              <Route path="inspection/cement-register-forms/:id" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><CementRegisterForm /></RoleBasedRoute>} />
              <Route path="inspection/cement-register-forms/:id/edit" element={<RoleBasedRoute allowedRoles={['client', 'epc', 'contractor']}><CementRegisterForm /></RoleBasedRoute>} />
              <Route path="inspection/concrete-pour-card-forms" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><ConcretePourCardFormList /></RoleBasedRoute>} />
              <Route path="inspection/concrete-pour-card-forms/new" element={<RoleBasedRoute allowedRoles={['epcuser']}><ConcretePourCardForm /></RoleBasedRoute>} />
              <Route path="inspection/concrete-pour-card-forms/:id" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><ConcretePourCardForm /></RoleBasedRoute>} />
              <Route path="inspection/concrete-pour-card-forms/:id/edit" element={<RoleBasedRoute allowedRoles={['client', 'epc', 'contractor']}><ConcretePourCardForm /></RoleBasedRoute>} />
              <Route path="inspection/pcc-checklist-forms" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><PCCChecklistFormList /></RoleBasedRoute>} />
              <Route path="inspection/pcc-checklist-forms/new" element={<RoleBasedRoute allowedRoles={['epcuser']}><PCCChecklistForm /></RoleBasedRoute>} />
              <Route path="inspection/pcc-checklist-forms/:id" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><PCCChecklistForm /></RoleBasedRoute>} />
              <Route path="inspection/pcc-checklist-forms/:id/edit" element={<RoleBasedRoute allowedRoles={['client', 'epc', 'contractor']}><PCCChecklistForm /></RoleBasedRoute>} />
              <Route path="inspection/bar-bending-schedule-forms" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><BarBendingScheduleFormList /></RoleBasedRoute>} />
              <Route path="inspection/bar-bending-schedule-forms/new" element={<RoleBasedRoute allowedRoles={['epcuser']}><BarBendingScheduleForm /></RoleBasedRoute>} />
              <Route path="inspection/bar-bending-schedule-forms/:id" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><BarBendingScheduleForm /></RoleBasedRoute>} />
              <Route path="inspection/bar-bending-schedule-forms/:id/edit" element={<RoleBasedRoute allowedRoles={['client', 'epc', 'contractor']}><BarBendingScheduleForm /></RoleBasedRoute>} />
              <Route path="inspection/battery-charger-checklist-forms" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><BatteryChargerChecklistFormList /></RoleBasedRoute>} />
              <Route path="inspection/battery-charger-checklist-forms/new" element={<RoleBasedRoute allowedRoles={['epcuser']}><BatteryChargerChecklistForm /></RoleBasedRoute>} />
              <Route path="inspection/battery-charger-checklist-forms/:id" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><BatteryChargerChecklistForm /></RoleBasedRoute>} />
              <Route path="inspection/battery-charger-checklist-forms/:id/edit" element={<RoleBasedRoute allowedRoles={['client', 'epc', 'contractor']}><BatteryChargerChecklistForm /></RoleBasedRoute>} />
              <Route path="inspection/battery-ups-checklist-forms" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><BatteryUPSChecklistFormList /></RoleBasedRoute>} />
              <Route path="inspection/battery-ups-checklist-forms/new" element={<RoleBasedRoute allowedRoles={['epcuser']}><BatteryUPSChecklistForm /></RoleBasedRoute>} />
              <Route path="inspection/battery-ups-checklist-forms/:id" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><BatteryUPSChecklistForm /></RoleBasedRoute>} />
              <Route path="inspection/battery-ups-checklist-forms/:id/edit" element={<RoleBasedRoute allowedRoles={['client', 'epc', 'contractor']}><BatteryUPSChecklistForm /></RoleBasedRoute>} />
              <Route path="inspection/bus-duct-checklist-forms" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><BusDuctChecklistFormList /></RoleBasedRoute>} />
              <Route path="inspection/bus-duct-checklist-forms/new" element={<RoleBasedRoute allowedRoles={['epcuser']}><BusDuctChecklistForm /></RoleBasedRoute>} />
              <Route path="inspection/bus-duct-checklist-forms/:id" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><BusDuctChecklistForm /></RoleBasedRoute>} />
              <Route path="inspection/bus-duct-checklist-forms/:id/edit" element={<RoleBasedRoute allowedRoles={['client', 'epc', 'contractor']}><BusDuctChecklistForm /></RoleBasedRoute>} />
              <Route path="inspection/control-cable-checklist-forms" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><ControlCableChecklistFormList /></RoleBasedRoute>} />
              <Route path="inspection/control-cable-checklist-forms/new" element={<RoleBasedRoute allowedRoles={['epcuser']}><ControlCableChecklistForm /></RoleBasedRoute>} />
              <Route path="inspection/control-cable-checklist-forms/:id" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><ControlCableChecklistForm /></RoleBasedRoute>} />
              <Route path="inspection/control-cable-checklist-forms/:id/edit" element={<RoleBasedRoute allowedRoles={['client', 'epc', 'contractor']}><ControlCableChecklistForm /></RoleBasedRoute>} />
              <Route path="inspection/control-room-audit-checklist" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><ControlRoomAuditChecklistFormList /></RoleBasedRoute>} />
              <Route path="inspection/control-room-audit-checklist/new" element={<RoleBasedRoute allowedRoles={['epcuser']}><ControlRoomAuditChecklistForm /></RoleBasedRoute>} />
              <Route path="inspection/control-room-audit-checklist/view/:id" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><ControlRoomAuditChecklistForm /></RoleBasedRoute>} />
              <Route path="inspection/control-room-audit-checklist/edit/:id" element={<RoleBasedRoute allowedRoles={['client', 'epc', 'contractor']}><ControlRoomAuditChecklistForm /></RoleBasedRoute>} />
              <Route path="inspection/forms/earthing-checklist" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><EarthingChecklistFormList /></RoleBasedRoute>} />
              <Route path="inspection/forms/earthing-checklist/list" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><EarthingChecklistFormList /></RoleBasedRoute>} />
              <Route path="inspection/forms/earthing-checklist/create" element={<RoleBasedRoute allowedRoles={['epcuser']}><EarthingChecklistForm /></RoleBasedRoute>} />
              <Route path="inspection/forms/earthing-checklist/:id" element={<RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'adminuser']}><EarthingChecklistForm /></RoleBasedRoute>} />
              <Route path="inspection/forms/earthing-checklist/:id/edit" element={<RoleBasedRoute allowedRoles={['client', 'epc', 'contractor']}><EarthingChecklistForm /></RoleBasedRoute>} />
              
              {/* ESG Routes */}
              <Route path="esg" element={<RoleBasedRoute allowedRoles={['adminuser', 'client', 'epc', 'contractor', 'clientuser', 'epcuser', 'contractoruser']}><ESGOverview /></RoleBasedRoute>} />
              <Route path="esg/environment" element={<RoleBasedRoute allowedRoles={['adminuser', 'client', 'epc', 'contractor', 'clientuser', 'epcuser', 'contractoruser']}><EnvironmentPage /></RoleBasedRoute>} />
              <Route path="esg/monitoring" element={<RoleBasedRoute allowedRoles={['adminuser', 'client', 'epc', 'contractor', 'clientuser', 'epcuser', 'contractoruser']}><EnvironmentalMonitoringDashboard /></RoleBasedRoute>} />
              <Route path="esg/carbon-footprint" element={<RoleBasedRoute allowedRoles={['adminuser', 'client', 'epc', 'contractor', 'clientuser', 'epcuser', 'contractoruser']}><CarbonFootprintDashboard /></RoleBasedRoute>} />
              <Route path="esg/water-management" element={<RoleBasedRoute allowedRoles={['adminuser', 'client', 'epc', 'contractor', 'clientuser', 'epcuser', 'contractoruser']}><WaterManagementDashboard /></RoleBasedRoute>} />
              <Route path="esg/energy-management" element={<RoleBasedRoute allowedRoles={['adminuser', 'client', 'epc', 'contractor', 'clientuser', 'epcuser', 'contractoruser']}><EnergyManagementDashboard /></RoleBasedRoute>} />
              <Route path="esg/environmental-incidents" element={<RoleBasedRoute allowedRoles={['adminuser', 'client', 'epc', 'contractor', 'clientuser', 'epcuser', 'contractoruser']}><EnvironmentalIncidentDashboard /></RoleBasedRoute>} />
              <Route path="esg/sustainability-targets" element={<RoleBasedRoute allowedRoles={['adminuser', 'client', 'epc', 'contractor', 'clientuser', 'epcuser', 'contractoruser']}><SustainabilityTargetsDashboard /></RoleBasedRoute>} />
              <Route path="esg/governance" element={<RoleBasedRoute allowedRoles={['adminuser', 'client', 'epc', 'contractor', 'clientuser', 'epcuser', 'contractoruser']}><GovernancePage /></RoleBasedRoute>} />
              <Route path="esg/reports" element={<RoleBasedRoute allowedRoles={['adminuser', 'client', 'epc', 'contractor', 'clientuser', 'epcuser', 'contractoruser']}><ESGReportsPage /></RoleBasedRoute>} />
              
              {/* Quality Management Routes */}
              <Route path="quality" element={<RoleBasedRoute allowedRoles={['adminuser', 'client', 'epc', 'contractor', 'clientuser', 'epcuser', 'contractoruser']}><QualityDashboard /></RoleBasedRoute>} />
              <Route path="quality/enhanced" element={<RoleBasedRoute allowedRoles={['adminuser', 'client', 'epc', 'contractor', 'clientuser', 'epcuser', 'contractoruser']}><QualityDashboardEnhanced /></RoleBasedRoute>} />
              <Route path="quality/inspections" element={<RoleBasedRoute allowedRoles={['adminuser', 'client', 'epc', 'contractor', 'clientuser', 'epcuser', 'contractoruser']}><QualityInspectionList /></RoleBasedRoute>} />
              <Route path="quality/inspections/create" element={<RoleBasedRoute allowedRoles={['adminuser', 'client', 'epc', 'contractor', 'clientuser', 'epcuser', 'contractoruser']}><InspectionForm mode="create" /></RoleBasedRoute>} />
              <Route path="quality/suppliers" element={<RoleBasedRoute allowedRoles={['adminuser', 'client', 'epc', 'contractor', 'clientuser', 'epcuser', 'contractoruser']}><SupplierQuality /></RoleBasedRoute>} />
              <Route path="quality/defects" element={<RoleBasedRoute allowedRoles={['adminuser', 'client', 'epc', 'contractor', 'clientuser', 'epcuser', 'contractoruser']}><DefectManagement /></RoleBasedRoute>} />
              <Route path="quality/templates" element={<RoleBasedRoute allowedRoles={['adminuser', 'client', 'epc', 'contractor', 'clientuser', 'epcuser', 'contractoruser']}><QualityTemplates /></RoleBasedRoute>} />
              <Route path="quality/standards" element={<RoleBasedRoute allowedRoles={['adminuser', 'client', 'epc', 'contractor', 'clientuser', 'epcuser', 'contractoruser']}><QualityStandards /></RoleBasedRoute>} />
              <Route path="quality/alerts" element={<RoleBasedRoute allowedRoles={['adminuser', 'client', 'epc', 'contractor', 'clientuser', 'epcuser', 'contractoruser']}><QualityAlerts /></RoleBasedRoute>} />
            </Route>
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="participant-response/:momId/:userId" element={<ParticipantResponse />} />
            <Route path="mobile/permit/:permitId" element={<MobilePermitView />} />
            <Route path="*" element={<SigninApp />} />
          </Routes>
        </Suspense>
      </NotificationsProvider>
    </ErrorBoundary>
  );
};

export default App;