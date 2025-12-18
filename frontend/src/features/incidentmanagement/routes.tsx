import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RoleBasedRoute from '../../app/RoleBasedRoute';
import IncidentManagementPage from './pages/IncidentManagementPage';
import IncidentsPage from './pages/IncidentsPage';
// CAPA and Investigation pages removed - using 8D methodology only
import EightDPage from './pages/EightDPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ReportsPage from './pages/ReportsPage';
import MobileReportPage from './pages/MobileReportPage';
// Import components
import EightDProcess from './components/EightDProcess';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import RiskAssessmentMatrix from './components/RiskAssessmentMatrix';
import CostTrackingPanel from './components/CostTrackingPanel';
import LessonsLearnedPanel from './components/LessonsLearnedPanel';
import IncidentDetail from './components/IncidentDetail';
import IncidentForm from './components/IncidentForm';
// Investigation form demo removed

// Define allowed roles for incident management
const INCIDENT_MANAGEMENT_ROLES = [
  'adminuser', 
  'clientuser', 
  'epcuser', 
  'contractoruser',
  'client', 
  'epc', 
  'contractor',
  'master'
];

// Investigation and CAPA roles removed - using 8D methodology only

const IncidentManagementRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Main incident management dashboard */}
      <Route
        path="/"
        element={
          <RoleBasedRoute allowedRoles={INCIDENT_MANAGEMENT_ROLES}>
            <IncidentManagementPage />
          </RoleBasedRoute>
        }
      />

      {/* Individual section pages */}
      <Route
        path="/incidents"
        element={
          <RoleBasedRoute allowedRoles={INCIDENT_MANAGEMENT_ROLES}>
            <IncidentsPage />
          </RoleBasedRoute>
        }
      />

      {/* CAPA and Investigation routes removed - using 8D methodology only */}

      <Route
        path="/8d"
        element={
          <RoleBasedRoute allowedRoles={INCIDENT_MANAGEMENT_ROLES}>
            <EightDPage />
          </RoleBasedRoute>
        }
      />

      {/* Direct routes for specific incident operations */}
      <Route 
        path="/incident/:id" 
        element={
          <RoleBasedRoute allowedRoles={INCIDENT_MANAGEMENT_ROLES}>
            <IncidentDetailWrapper />
          </RoleBasedRoute>
        } 
      />
      
      <Route 
        path="/incident/:id/edit" 
        element={
          <RoleBasedRoute allowedRoles={INCIDENT_MANAGEMENT_ROLES}>
            <IncidentEditWrapper />
          </RoleBasedRoute>
        } 
      />
      
      <Route 
        path="/create" 
        element={
          <RoleBasedRoute allowedRoles={INCIDENT_MANAGEMENT_ROLES}>
            <IncidentCreateWrapper />
          </RoleBasedRoute>
        } 
      />
      
      {/* Investigation and CAPA routes removed - using 8D methodology only */}

      {/* 8D Methodology detail routes */}
      <Route
        path="/8d/:id"
        element={
          <RoleBasedRoute allowedRoles={INCIDENT_MANAGEMENT_ROLES}>
            <EightDProcessDetailWrapper />
          </RoleBasedRoute>
        }
      />

      {/* Analytics routes */}
      <Route
        path="/analytics"
        element={
          <RoleBasedRoute allowedRoles={INCIDENT_MANAGEMENT_ROLES}>
            <AnalyticsPage />
          </RoleBasedRoute>
        }
      />

      {/* Risk Assessment routes */}
      <Route
        path="/risk-assessment"
        element={
          <RoleBasedRoute allowedRoles={INCIDENT_MANAGEMENT_ROLES}>
            <RiskAssessmentMatrixWrapper />
          </RoleBasedRoute>
        }
      />

      {/* Cost Tracking routes */}
      <Route
        path="/cost-tracking"
        element={
          <RoleBasedRoute allowedRoles={INCIDENT_MANAGEMENT_ROLES}>
            <CostTrackingDashboardWrapper />
          </RoleBasedRoute>
        }
      />

      {/* Lessons Learned routes */}
      <Route
        path="/lessons-learned"
        element={
          <RoleBasedRoute allowedRoles={INCIDENT_MANAGEMENT_ROLES}>
            <LessonsLearnedListWrapper />
          </RoleBasedRoute>
        }
      />

      {/* Mobile Report routes */}
      <Route
        path="/mobile-report"
        element={
          <RoleBasedRoute allowedRoles={INCIDENT_MANAGEMENT_ROLES}>
            <MobileQuickReportWrapper />
          </RoleBasedRoute>
        }
      />

      {/* Reports routes */}
      <Route
        path="/reports"
        element={
          <RoleBasedRoute allowedRoles={INCIDENT_MANAGEMENT_ROLES}>
            <ReportsPage />
          </RoleBasedRoute>
        }
      />

      {/* Mobile Report routes */}
      <Route
        path="/mobile-report"
        element={
          <RoleBasedRoute allowedRoles={INCIDENT_MANAGEMENT_ROLES}>
            <MobileReportPage />
          </RoleBasedRoute>
        }
      />



      {/* Redirect any unmatched routes to main page */}
      <Route path="*" element={<Navigate to="/dashboard/incidentmanagement" replace />} />
    </Routes>
  );
};

// Wrapper components for individual pages
const IncidentDetailWrapper: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  if (!id) {
    return <Navigate to="/dashboard/incidentmanagement" replace />;
  }
  
  return (
    <div style={{ padding: '24px' }}>
      <IncidentDetail
        incidentId={id}
        onEdit={() => navigate(`/dashboard/incidentmanagement/incident/${id}/edit`)}

        onClose={() => navigate('/dashboard/incidentmanagement')}
      />
    </div>
  );
};

const IncidentEditWrapper: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { incident, loading } = useIncident(id || '');
  
  if (!id) {
    return <Navigate to="/dashboard/incidentmanagement" replace />;
  }
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!incident) {
    return <Navigate to="/dashboard/incidentmanagement" replace />;
  }
  
  return (
    <div style={{ padding: '24px' }}>
      <IncidentForm
        mode="edit"
        initialData={incident}
        onSubmit={async (data) => {
          // Handle form submission
          navigate('/dashboard/incidentmanagement');
        }}
        onCancel={() => navigate('/dashboard/incidentmanagement')}
      />
    </div>
  );
};

const IncidentCreateWrapper: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div style={{ padding: '24px' }}>
      <IncidentForm
        mode="create"
        onSubmit={async (data) => {
          // Handle form submission
          navigate('/dashboard/incidentmanagement');
        }}
        onCancel={() => navigate('/dashboard/incidentmanagement')}
      />
    </div>
  );
};

// Investigation and CAPA wrapper components removed - using 8D methodology only

// 8D Process Wrappers
const EightDProcessListWrapper: React.FC = () => {
  return (
    <div className="dashboard-content-wrapper">
      <EightDProcess incidentId="" />
    </div>
  );
};

const EightDProcessDetailWrapper: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <Navigate to="/dashboard/incidentmanagement" replace />;
  }

  return (
    <div className="dashboard-content-wrapper">
      <EightDProcess incidentId={id} />
    </div>
  );
};

// Analytics Wrapper
const AnalyticsDashboardWrapper: React.FC = () => {
  return (
    <div className="dashboard-content-wrapper">
      <AnalyticsDashboard />
    </div>
  );
};

// Risk Assessment Wrapper
const RiskAssessmentMatrixWrapper: React.FC = () => {
  // Mock data for risk matrix - in real app this would come from API
  const mockRiskData = {
    matrix_data: [
      [1, 2, 3, 4, 5],
      [2, 4, 6, 8, 10],
      [3, 6, 9, 12, 15],
      [4, 8, 12, 16, 20],
      [5, 10, 15, 20, 25]
    ],
    incident_distribution: { 1: 5, 2: 8, 3: 12, 4: 6, 5: 3, 6: 4, 8: 2, 9: 1, 10: 1, 12: 2, 15: 1, 16: 1, 20: 1, 25: 1 },
    risk_zones: {
      low: { range: [1, 3], color: '#52c41a', label: 'Low Risk', count: 15 },
      medium: { range: [4, 9], color: '#faad14', label: 'Medium Risk', count: 25 },
      high: { range: [10, 25], color: '#ff4d4f', label: 'High Risk', count: 8 }
    }
  };

  return (
    <div className="dashboard-content-wrapper">
      <RiskAssessmentMatrix data={mockRiskData} />
    </div>
  );
};

// Cost Tracking Wrapper
const CostTrackingDashboardWrapper: React.FC = () => {
  return (
    <div className="dashboard-content-wrapper">
      <CostTrackingPanel incidentId="general" />
    </div>
  );
};

// Lessons Learned Wrapper
const LessonsLearnedListWrapper: React.FC = () => {
  return (
    <div className="dashboard-content-wrapper">
      <LessonsLearnedPanel incidentId="general" />
    </div>
  );
};

// Mobile Report Wrapper
const MobileQuickReportWrapper: React.FC = () => {
  return (
    <div className="dashboard-content-wrapper">
      <MobileReportPage />
    </div>
  );
};

// Reports Wrapper
const ReportsWrapper: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '24px' }}>
      <div>
        <h2>Reports & Analytics</h2>
        <p>Advanced reporting features coming soon...</p>
        <button onClick={() => navigate('/dashboard/incidentmanagement')}>
          Back to Incident Management
        </button>
      </div>
    </div>
  );
};

// Import necessary hooks and components
import { useParams, useNavigate } from 'react-router-dom';
import { useIncident } from './hooks/useIncidents';

export default IncidentManagementRoutes;
