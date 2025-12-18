import api from '../../../common/utils/axiosetup';
import {
  EnvironmentAspect,
  GenerationData,
  GHGActivity,
  WasteManifest,
  BiodiversityEvent,
  ESGPolicy,
  Grievance,
  EmissionFactor,
  ESGDashboardData,
  EnvironmentalMonitoring,
  CarbonFootprint,
  SustainabilityTarget
} from '../types';

const API_BASE = '/api/v1/environment';

// Environment Aspects
export const getEnvironmentAspects = () => 
  api.get<EnvironmentAspect[]>(`${API_BASE}/aspects/`);

export const createEnvironmentAspect = (data: EnvironmentAspect) =>
  api.post<EnvironmentAspect>(`${API_BASE}/aspects/`, data);

export const updateEnvironmentAspect = (id: number, data: EnvironmentAspect) =>
  api.put<EnvironmentAspect>(`${API_BASE}/aspects/${id}/`, data);

export const deleteEnvironmentAspect = (id: number) =>
  api.delete(`${API_BASE}/aspects/${id}/`);

export const getEnvironmentAspectById = (id: number) =>
  api.get<EnvironmentAspect>(`${API_BASE}/aspects/${id}/`);

// Generation Data
export const getGenerationData = () =>
  api.get<GenerationData[]>(`${API_BASE}/generation/`);

export const createGenerationData = (data: GenerationData) =>
  api.post<GenerationData>(`${API_BASE}/generation/`, data);

export const deleteGenerationData = (id: number) =>
  api.delete(`${API_BASE}/generation/${id}/`);

export const getGenerationSummary = () =>
  api.get<ESGDashboardData>(`${API_BASE}/generation/summary/`);

// GHG Activities
export const getGHGActivities = () =>
  api.get<GHGActivity[]>(`${API_BASE}/ghg-activities/`);

export const createGHGActivity = (data: GHGActivity) =>
  api.post<GHGActivity>(`${API_BASE}/ghg-activities/`, data);

export const getEmissionsSummary = () =>
  api.get(`${API_BASE}/ghg-activities/emissions_summary/`);

// Waste Manifests
export const getWasteManifests = () =>
  api.get<{ results: WasteManifest[] } | WasteManifest[]>(`${API_BASE}/waste-manifests/`);

export const createWasteManifest = (data: WasteManifest) =>
  api.post<WasteManifest>(`${API_BASE}/waste-manifests/`, data);

export const updateWasteManifest = (id: number, data: Partial<WasteManifest>) =>
  api.patch<WasteManifest>(`${API_BASE}/waste-manifests/${id}/`, data);

export const deleteWasteManifest = (id: number) =>
  api.delete(`${API_BASE}/waste-manifests/${id}/`);

// Biodiversity Events
export const getBiodiversityEvents = () =>
  api.get<BiodiversityEvent[]>(`${API_BASE}/biodiversity-events/`);

export const createBiodiversityEvent = (data: BiodiversityEvent) =>
  api.post<BiodiversityEvent>(`${API_BASE}/biodiversity-events/`, data);

export const deleteBiodiversityEvent = (id: number) =>
  api.delete(`${API_BASE}/biodiversity-events/${id}/`);

// ESG Policies
export const getESGPolicies = () =>
  api.get<ESGPolicy[]>(`${API_BASE}/policies/`);

export const createESGPolicy = (data: FormData) =>
  api.post<ESGPolicy>(`${API_BASE}/policies/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

export const deleteESGPolicy = (id: number) =>
  api.delete(`${API_BASE}/policies/${id}/`);

// Grievances
export const getGrievances = () =>
  api.get<Grievance[]>(`${API_BASE}/grievances/`);

export const createGrievance = (data: Grievance) =>
  api.post<Grievance>(`${API_BASE}/grievances/`, data);

export const updateGrievance = (id: number, data: Partial<Grievance>) =>
  api.patch<Grievance>(`${API_BASE}/grievances/${id}/`, data);

export const deleteGrievance = (id: number) =>
  api.delete(`${API_BASE}/grievances/${id}/`);

// Emission Factors
export const getEmissionFactors = () =>
  api.get<EmissionFactor[]>(`${API_BASE}/emission-factors/`);

export const createEmissionFactor = (data: EmissionFactor) =>
  api.post<EmissionFactor>(`${API_BASE}/emission-factors/`, data);

// ESG Reports
export const generateESGReport = (reportType: string, startDate: string, endDate: string) =>
  api.post(`${API_BASE}/reports/generate/`, {
    report_type: reportType,
    start_date: startDate,
    end_date: endDate
  });

export const getESGReports = () =>
  api.get(`${API_BASE}/reports/`);

export const downloadESGReport = (reportId: number) =>
  api.get(`${API_BASE}/reports/${reportId}/download/`, {
    responseType: 'blob'
  });

// === ADVANCED ENVIRONMENTAL MANAGEMENT APIs ===

// Environmental Monitoring
export const getEnvironmentalMonitoring = () =>
  api.get<EnvironmentalMonitoring[]>(`${API_BASE}/monitoring/`);

export const createEnvironmentalMonitoring = (data: EnvironmentalMonitoring) =>
  api.post<EnvironmentalMonitoring>(`${API_BASE}/monitoring/`, data);

export const updateEnvironmentalMonitoring = (id: number, data: Partial<EnvironmentalMonitoring>) =>
  api.patch<EnvironmentalMonitoring>(`${API_BASE}/monitoring/${id}/`, data);

export const deleteEnvironmentalMonitoring = (id: number) =>
  api.delete(`${API_BASE}/monitoring/${id}/`);

// Carbon Footprint
export const getCarbonFootprint = () =>
  api.get<CarbonFootprint[]>(`${API_BASE}/carbon-footprint/`);

export const createCarbonFootprint = (data: CarbonFootprint) =>
  api.post<CarbonFootprint>(`${API_BASE}/carbon-footprint/`, data);

export const updateCarbonFootprint = (id: number, data: Partial<CarbonFootprint>) =>
  api.patch<CarbonFootprint>(`${API_BASE}/carbon-footprint/${id}/`, data);

export const deleteCarbonFootprint = (id: number) =>
  api.delete(`${API_BASE}/carbon-footprint/${id}/`);

// Sustainability Targets
export const getSustainabilityTargets = () =>
  api.get<SustainabilityTarget[]>(`${API_BASE}/sustainability-targets/`);

export const createSustainabilityTarget = (data: SustainabilityTarget) =>
  api.post<SustainabilityTarget>(`${API_BASE}/sustainability-targets/`, data);

export const updateSustainabilityTarget = (id: number, data: Partial<SustainabilityTarget>) =>
  api.patch<SustainabilityTarget>(`${API_BASE}/sustainability-targets/${id}/`, data);

export const deleteSustainabilityTarget = (id: number) =>
  api.delete(`${API_BASE}/sustainability-targets/${id}/`);

// Enhanced Analytics
export const getEnvironmentAspectAnalytics = () =>
  api.get(`${API_BASE}/aspects/analytics/`);

export const getComprehensiveESGDashboard = () =>
  api.get(`${API_BASE}/dashboard/overview/`);

// Environmental Compliance Dashboard
export const getComplianceDashboard = () =>
  api.get(`${API_BASE}/monitoring/compliance_dashboard/`);

// Carbon Emissions Summary
export const getCarbonEmissionsSummary = () =>
  api.get(`${API_BASE}/carbon-footprint/emissions_summary/`);

// Sustainability Progress Dashboard
export const getSustainabilityProgress = () =>
  api.get(`${API_BASE}/sustainability-targets/progress_dashboard/`);

// Water Management
export const getWaterManagement = () =>
  api.get(`${API_BASE}/water-management/`);

export const createWaterManagement = (data: any) =>
  api.post(`${API_BASE}/water-management/`, data);

export const updateWaterManagement = (id: number, data: any) =>
  api.patch(`${API_BASE}/water-management/${id}/`, data);

export const deleteWaterManagement = (id: number) =>
  api.delete(`${API_BASE}/water-management/${id}/`);

// Energy Management
export const getEnergyManagement = () =>
  api.get(`${API_BASE}/energy-management/`);

export const createEnergyManagement = (data: any) =>
  api.post(`${API_BASE}/energy-management/`, data);

export const updateEnergyManagement = (id: number, data: any) =>
  api.patch(`${API_BASE}/energy-management/${id}/`, data);

export const deleteEnergyManagement = (id: number) =>
  api.delete(`${API_BASE}/energy-management/${id}/`);

// Environmental Incidents
export const getEnvironmentalIncidents = () =>
  api.get(`${API_BASE}/environmental-incidents/`);

export const createEnvironmentalIncident = (data: any) =>
  api.post(`${API_BASE}/environmental-incidents/`, data);

export const updateEnvironmentalIncident = (id: number, data: any) =>
  api.patch(`${API_BASE}/environmental-incidents/${id}/`, data);

export const deleteEnvironmentalIncident = (id: number) =>
  api.delete(`${API_BASE}/environmental-incidents/${id}/`);