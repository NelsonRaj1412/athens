// User interface for references
export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  surname: string;
  full_name: string;
  admin_type?: string;
  grade?: string;
}

// Core incident interface with commercial enhancements
export interface Incident {
  id: string;
  incident_id: string;
  title: string;
  description: string;
  incident_type: 'injury' | 'near_miss' | 'spill' | 'fire' | 'explosion' | 'property_damage' | 'environmental' | 'security' | 'vehicle_accident' | 'equipment_failure' | 'chemical_exposure' | 'ergonomic' | 'electrical' | 'fall_from_height' | 'struck_by_object' | 'caught_in_between' | 'other';
  severity_level: 'low' | 'medium' | 'high' | 'critical';
  status: 'reported' | '8d_initiated' | '8d_in_progress' | '8d_completed' | 'closed' | 'cancelled';
  location: string;
  department: string;
  date_time_incident: string;
  reporter_name: string;
  reported_by: string;
  reported_by_details?: User;
  assigned_investigator?: string;
  assigned_investigator_details?: User;
  project?: string;
  immediate_action_taken?: string;
  potential_causes?: string;

  // === COMMERCIAL GRADE ENHANCEMENTS ===

  // Risk Assessment Fields
  risk_level?: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  probability_score?: number; // 1-5 scale
  impact_score?: number; // 1-5 scale
  risk_matrix_score?: number; // calculated

  // Cost Impact Analysis
  estimated_cost?: number;
  actual_cost?: number;
  cost_category?: 'medical' | 'property_damage' | 'property_repair' | 'equipment_replacement' | 'production_loss' | 'overtime' | 'contractor_fees' | 'legal_fees' | 'regulatory_fine' | 'environmental_cleanup' | 'investigation_costs' | 'training_costs' | 'other';

  // Regulatory Compliance
  regulatory_framework?: 'osha' | 'iso_45001' | 'iso_14001' | 'local_regulation' | 'company_policy' | 'other';
  regulatory_reportable?: boolean;
  regulatory_report_date?: string;
  regulatory_reference?: string;

  // Business Impact Assessment
  business_impact?: 'none' | 'minimal' | 'moderate' | 'significant' | 'severe';
  production_impact_hours?: number;
  personnel_affected_count?: number;

  // Enhanced Tracking
  escalation_level?: number; // 1-5
  priority_score?: number; // calculated
  external_agencies_notified?: string[];

  // Weather and Environmental Conditions
  weather_conditions?: string;
  environmental_factors?: string;

  // Equipment and Tools Involved
  equipment_involved?: string;
  equipment_serial_numbers?: string;

  // Work Process Information
  work_process?: string;
  work_permit_number?: string;
  safety_procedures_followed?: boolean;

  // Communication and Notification
  management_notified_at?: string;
  family_notified?: boolean;
  media_attention?: boolean;

  // Computed Commercial Fields
  financial_impact?: number;
  estimated_completion_date?: string;
  risk_score_display?: string;

  // Original fields
  attachments?: IncidentAttachment[];
  audit_logs?: IncidentAuditLog[];
  days_since_reported?: number;
  is_overdue?: boolean;
  completion_percentage?: number;
  created_at: string;
  updated_at: string;
}

// Simplified incident interface for lists
export interface IncidentListItem {
  id: string;
  incident_id: string;
  title: string;
  incident_type: string;
  severity_level: string;
  status: string;
  location: string;
  department: string;
  date_time_incident: string;
  reporter_name: string;
  reported_by: string;
  reported_by_details?: User;
  assigned_investigator?: string;
  assigned_investigator_details?: User;
  attachments_count: number;

  days_since_reported: number;
  created_at: string;
  updated_at: string;
  
  // Commercial grade fields for list display
  risk_level?: string;
  risk_matrix_score?: number;
  priority_score?: number;
  estimated_cost?: number;
  business_impact?: string;
  regulatory_reportable?: boolean;
  escalation_level?: number;
}

// Incident attachment interface
export interface IncidentAttachment {
  id: string;
  file: string;
  file_url?: string;
  filename: string;
  file_size: number;
  file_type: string;
  description?: string;
  uploaded_by: string;
  uploaded_by_details?: User;
  uploaded_at: string;
}

// Investigation and CAPA interfaces removed - using 8D methodology only

// Incident audit log interface
export interface IncidentAuditLog {
  id: string;
  action: 'created' | 'updated' | 'status_changed' | 'assigned' | 'investigation_started' | 'investigation_completed' | 'capa_created' | 'capa_completed' | 'closed' | 'reopened';
  description: string;
  performed_by?: string;
  performed_by_details?: User;
  timestamp: string;
  previous_value?: string;
  new_value?: string;
  ip_address?: string;
  user_agent?: string;
}

// Incident notification interface
export interface IncidentNotification {
  id: string;
  notification_type: 'incident_created' | 'incident_assigned' | 'investigation_due' | 'capa_due' | 'capa_overdue' | 'status_changed';
  recipient: string;
  recipient_details?: User;
  message: string;
  sent_at: string;
  read_at?: string;
  is_read: boolean;
}

// Filter interfaces
export interface IncidentFilters {
  incident_type?: string;
  severity_level?: string;
  status?: string;
  department?: string;
  assigned_investigator?: string;
  reported_by?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

// CAPA and Investigation filters removed - using 8D methodology only

// Form interfaces with commercial enhancements
export interface IncidentFormData {
  title: string;
  description: string;
  incident_type: string;
  severity_level: string;
  location: string;
  department: string;
  date_time_incident: string;
  reporter_name: string;
  immediate_action_taken?: string;
  potential_causes?: string;
  attachments?: File[];

  // Commercial grade fields
  probability_score?: number;
  impact_score?: number;
  estimated_cost?: number;
  cost_category?: string;
  regulatory_framework?: string;
  regulatory_reportable?: boolean;
  business_impact?: string;
  production_impact_hours?: number;
  personnel_affected_count?: number;
  weather_conditions?: string;
  environmental_factors?: string;
  equipment_involved?: string;
  equipment_serial_numbers?: string;
  work_process?: string;
  work_permit_number?: string;
  safety_procedures_followed?: boolean;
  family_notified?: boolean;
  media_attention?: boolean;
}

// Investigation and CAPA form data removed - using 8D methodology only

// Dashboard statistics interface
export interface IncidentDashboardStats {
  total_incidents: number;
  open_incidents: number;
  closed_incidents: number;
  overdue_incidents: number;
  severity_distribution: Array<{ severity_level: string; count: number }>;
  status_distribution: Array<{ status: string; count: number }>;
  monthly_trends: Array<{ month: string; count: number }>;
}

// API response interfaces
export interface PaginatedResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

export interface ApiError {
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
}

// Enhanced Constants with Commercial Types
export const INCIDENT_TYPES = [
  { value: 'injury', label: 'Injury', icon: '🩹', color: '#ff4d4f' },
  { value: 'near_miss', label: 'Near Miss', icon: '⚠️', color: '#faad14' },
  { value: 'spill', label: 'Spill', icon: '💧', color: '#1890ff' },
  { value: 'fire', label: 'Fire', icon: '🔥', color: '#ff7875' },
  { value: 'explosion', label: 'Explosion', icon: '💥', color: '#ff4d4f' },
  { value: 'property_damage', label: 'Property Damage', icon: '🏗️', color: '#fa8c16' },
  { value: 'environmental', label: 'Environmental', icon: '🌱', color: '#52c41a' },
  { value: 'security', label: 'Security', icon: '🔒', color: '#722ed1' },
  { value: 'vehicle_accident', label: 'Vehicle Accident', icon: '🚗', color: '#eb2f96' },
  { value: 'equipment_failure', label: 'Equipment Failure', icon: '⚙️', color: '#fa541c' },
  { value: 'chemical_exposure', label: 'Chemical Exposure', icon: '🧪', color: '#f759ab' },
  { value: 'ergonomic', label: 'Ergonomic', icon: '🦴', color: '#13c2c2' },
  { value: 'electrical', label: 'Electrical', icon: '⚡', color: '#fadb14' },
  { value: 'fall_from_height', label: 'Fall from Height', icon: '📉', color: '#ff4d4f' },
  { value: 'struck_by_object', label: 'Struck by Object', icon: '🎯', color: '#fa8c16' },
  { value: 'caught_in_between', label: 'Caught In/Between', icon: '🤏', color: '#ff7875' },
  { value: 'other', label: 'Other', icon: '❓', color: '#8c8c8c' },
] as const;

export const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'green' },
  { value: 'medium', label: 'Medium', color: 'blue' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'critical', label: 'Critical', color: 'red' },
] as const;

export const INCIDENT_STATUSES = [
  { value: 'reported', label: 'Reported', color: 'blue', icon: '📝' },
  { value: '8d_initiated', label: '8D Process Initiated', color: 'orange', icon: '🚀' },
  { value: '8d_in_progress', label: '8D Process In Progress', color: 'purple', icon: '⏳' },
  { value: '8d_completed', label: '8D Process Completed', color: 'cyan', icon: '✅' },
  { value: 'closed', label: 'Closed', color: 'green', icon: '🔒' },
  { value: 'cancelled', label: 'Cancelled', color: 'red', icon: '❌' },
] as const;

// CAPA statuses removed - using 8D methodology only

// === COMMERCIAL GRADE INTERFACES ===

// Risk Assessment Template Interface
export interface RiskAssessmentTemplate {
  id: string;
  name: string;
  incident_types: string[];
  risk_factors: Record<string, any>;
  probability_criteria: Record<string, string>;
  impact_criteria: Record<string, string>;
  is_default: boolean;
  created_by?: string;
  created_by_details?: User;
  created_at: string;
  updated_at: string;
}

// Incident Category Interface
export interface IncidentCategory {
  id: string;
  name: string;
  description?: string;
  color_code: string;
  is_active: boolean;
  sort_order: number;
  industry_type: 'construction' | 'manufacturing' | 'oil_gas' | 'chemical' | 'mining' | 'general';
  created_at: string;
  updated_at: string;
}

// Incident Metrics Interface
export interface IncidentMetrics {
  id: string;
  incident: string;
  incident_details?: {
    incident_id: string;
    title: string;
    severity_level: string;
    status: string;
  };
  time_to_report?: string; // Duration
  time_to_investigate?: string; // Duration
  time_to_close?: string; // Duration
  investigation_quality_score?: number; // 1-10
  capa_effectiveness_score?: number; // 1-10
  is_recurrence: boolean;
  related_incidents?: string[];
  regulatory_compliance_score?: number; // 1-10
  calculated_at: string;
}

// Incident Workflow Interface
export interface IncidentWorkflow {
  id: string;
  name: string;
  description?: string;
  incident_types: string[];
  workflow_steps: Array<{
    step: number;
    name: string;
    duration_hours: number;
    required_roles: string[];
    actions: string[];
  }>;
  escalation_rules: Record<string, any>;
  notification_rules: Record<string, any>;
  is_active: boolean;
  is_default: boolean;
  created_by?: string;
  created_by_details?: User;
  created_at: string;
  updated_at: string;
}

// Incident Cost Center Interface
export interface IncidentCostCenter {
  id: string;
  incident: string;
  incident_details?: {
    incident_id: string;
    title: string;
  };
  cost_type: 'medical' | 'property_repair' | 'equipment_replacement' | 'production_loss' | 'overtime' | 'contractor_fees' | 'legal_fees' | 'regulatory_fine' | 'environmental_cleanup' | 'investigation_costs' | 'training_costs' | 'other';
  description: string;
  estimated_amount?: number;
  actual_amount?: number;
  total_amount?: number;
  budget_code?: string;
  department_charged?: string;
  requires_approval: boolean;
  approved_by?: string;
  approved_by_details?: User;
  approved_at?: string;
  created_by: string;
  created_by_details?: User;
  created_at: string;
  updated_at: string;
}

// Incident Learning Interface
export interface IncidentLearning {
  id: string;
  incident: string;
  incident_details?: {
    incident_id: string;
    title: string;
    incident_type: string;
    severity_level: string;
  };
  key_findings: string;
  lessons_learned: string;
  best_practices?: string;
  applicable_to: string[];
  training_required: boolean;
  training_topics?: string;
  policy_updates_required: boolean;
  policy_recommendations?: string;
  shared_with_teams: string[];
  communication_method?: 'toolbox_talk' | 'safety_meeting' | 'newsletter' | 'training_session' | 'bulletin_board' | 'email' | 'other';
  created_by: string;
  created_by_details?: User;
  created_at: string;
  updated_at: string;
}

// Analytics Interfaces
export interface IncidentAnalytics {
  total_incidents: number;
  open_incidents: number;
  closed_incidents: number;
  overdue_incidents: number;
  severity_distribution: Array<{ severity_level: string; count: number; percentage: number }>;
  status_distribution: Array<{ status: string; count: number; percentage: number }>;
  monthly_trends: Array<{ month: string; incidents: number; cost: number }>;
  risk_distribution: Array<{ risk_level: string; count: number; percentage: number }>;
  total_cost: number;
  average_cost_per_incident: number;
  average_time_to_close: string; // Duration
  investigation_completion_rate: number;
  capa_completion_rate: number;
  top_incident_types: Array<{ incident_type: string; count: number; percentage: number }>;
  incidents_by_department: Array<{ department: string; count: number; percentage: number }>;
}

// Risk Matrix Data Interface
export interface RiskMatrixData {
  matrix_data: number[][];
  incident_distribution: Record<string, number>;
  risk_zones: {
    low: { range: [number, number]; color: string; count: number };
    medium: { range: [number, number]; color: string; count: number };
    high: { range: [number, number]; color: string; count: number };
  };
}

// Permission Interface
export interface UserPermissions {
  can_manage_incidents: boolean;
  can_investigate_incidents: boolean;
  can_manage_capas: boolean;
  can_view_financial_data: boolean;
  can_manage_risk_assessment: boolean;
  can_access_analytics: boolean;
  can_manage_workflows: boolean;
  can_approve_incidents: boolean;
  can_export_data: boolean;
}

// Enhanced Dashboard Statistics
export interface EnhancedIncidentDashboardStats extends IncidentDashboardStats {
  // Risk metrics
  high_risk_incidents: number;
  risk_distribution: Array<{ risk_level: string; count: number }>;

  // Financial metrics
  total_estimated_cost: number;
  total_actual_cost: number;
  cost_by_category: Array<{ category: string; amount: number }>;

  // Compliance metrics
  regulatory_reportable_incidents: number;
  compliance_rate: number;

  // Performance metrics
  average_resolution_time: number;
  escalated_incidents: number;
  recurrence_rate: number;
}

// Commercial Constants
export const RISK_LEVELS = [
  { value: 'very_low', label: 'Very Low', color: '#52c41a', score: '1-4' },
  { value: 'low', label: 'Low', color: '#1890ff', score: '5-8' },
  { value: 'medium', label: 'Medium', color: '#faad14', score: '9-12' },
  { value: 'high', label: 'High', color: '#fa8c16', score: '13-20' },
  { value: 'very_high', label: 'Very High', color: '#ff4d4f', score: '21-25' },
] as const;

export const BUSINESS_IMPACT_LEVELS = [
  { value: 'none', label: 'None', color: '#52c41a' },
  { value: 'minimal', label: 'Minimal', color: '#1890ff' },
  { value: 'moderate', label: 'Moderate', color: '#faad14' },
  { value: 'significant', label: 'Significant', color: '#fa8c16' },
  { value: 'severe', label: 'Severe', color: '#ff4d4f' },
] as const;

export const REGULATORY_FRAMEWORKS = [
  { value: 'osha', label: 'OSHA' },
  { value: 'iso_45001', label: 'ISO 45001' },
  { value: 'iso_14001', label: 'ISO 14001' },
  { value: 'local_regulation', label: 'Local Regulation' },
  { value: 'company_policy', label: 'Company Policy' },
  { value: 'other', label: 'Other' },
] as const;

export const COST_CATEGORIES = [
  { value: 'medical', label: 'Medical Treatment', icon: '🏥' },
  { value: 'property_damage', label: 'Property Damage', icon: '🏠' },
  { value: 'property_repair', label: 'Property Repair', icon: '🏗️' },
  { value: 'equipment_replacement', label: 'Equipment Replacement', icon: '⚙️' },
  { value: 'production_loss', label: 'Production Loss', icon: '📉' },
  { value: 'overtime', label: 'Overtime Costs', icon: '⏰' },
  { value: 'contractor_fees', label: 'Contractor Fees', icon: '👷' },
  { value: 'legal_fees', label: 'Legal Fees', icon: '⚖️' },
  { value: 'regulatory_fine', label: 'Regulatory Fine', icon: '💰' },
  { value: 'environmental_cleanup', label: 'Environmental Cleanup', icon: '🌱' },
  { value: 'investigation_costs', label: 'Investigation Costs', icon: '🔍' },
  { value: 'training_costs', label: 'Training Costs', icon: '📚' },
  { value: 'other', label: 'Other', icon: '❓' },
] as const;

// === 8D METHODOLOGY INTERFACES ===

// 8D Process Interface
export interface EightDProcess {
  id: string;
  eight_d_id: string;
  incident: string;
  incident_details?: {
    incident_id: string;
    title: string;
    severity_level: string;
    status: string;
  };
  problem_statement: string;
  champion: string;
  champion_details?: User;
  initiated_date: string;
  target_completion_date?: string;
  actual_completion_date?: string;
  status: 'initiated' | 'in_progress' | 'completed' | 'closed' | 'cancelled';
  current_discipline: number; // 1-8
  overall_progress: number; // 0-100
  days_since_initiated?: number;
  is_overdue?: boolean;
  completion_summary?: {
    total_disciplines: number;
    completed_disciplines: number;
    completion_rate: number;
    current_discipline: number;
    overall_progress: number;
  };
  disciplines?: EightDDiscipline[];
  team_members?: EightDTeam[];
  containment_actions?: EightDContainmentAction[];
  root_causes?: EightDRootCause[];
  corrective_actions?: EightDCorrectiveAction[];
  prevention_actions?: EightDPreventionAction[];
  created_at: string;
  updated_at: string;
}

// 8D Discipline Interface
export interface EightDDiscipline {
  id: string;
  discipline_number: number;
  discipline_name: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'verified' | 'approved';
  progress_percentage: number;
  description: string;
  deliverables?: string;
  assigned_to?: string;
  assigned_to_details?: User;
  start_date?: string;
  target_date?: string;
  completion_date?: string;
  verified_by?: string;
  verified_by_details?: User;
  verified_date?: string;
  verification_notes?: string;
  created_at: string;
  updated_at: string;
}

// 8D Team Interface (matches backend EightDTeam model)
export interface EightDTeam {
  id: string;
  eight_d_process: string;  // Foreign key to EightDProcess
  user: string;             // Foreign key to User
  user_details?: User;      // Nested user data from serializer
  role: 'champion' | 'team_leader' | 'subject_expert' | 'process_owner' | 'quality_rep' | 'technical_expert' | 'member';
  expertise_area?: string;
  responsibilities?: string;
  is_active: boolean;
  joined_date: string;      // Auto-generated on creation
  left_date?: string;
  recognition_notes?: string;
  recognized_by?: string;   // Foreign key to User
  recognized_by_details?: User;  // Nested user data
  recognized_date?: string;
  is_recognized?: boolean;  // Add is_recognized property
}

// 8D Team Form Data (for creating/updating team members)
export interface EightDTeamFormData {
  user_id: string;  // User ID for form submission
  role: string;
  expertise_area?: string;
  responsibilities?: string;
}

// 8D Containment Action Interface
export interface EightDContainmentAction {
  id: string;
  action_description: string;
  rationale: string;
  responsible_person: string;
  responsible_person_details?: User;
  implementation_date?: string;
  verification_date?: string;
  status: 'planned' | 'implemented' | 'verified' | 'ineffective';
  effectiveness_rating?: number; // 1-5
  verification_notes?: string;
  created_at: string;
  updated_at: string;
}

// 8D Root Cause Interface
export interface EightDRootCause {
  id: string;
  cause_description: string;
  cause_type: 'immediate' | 'contributing' | 'root' | 'systemic';
  analysis_method: '5_whys' | 'fishbone' | 'fault_tree' | 'barrier_analysis' | 'change_analysis' | 'timeline' | 'other';
  supporting_evidence: string;
  verification_method: string;
  is_verified: boolean;
  impact_assessment?: string;
  likelihood_score?: number; // 1-5
  identified_by: string;
  identified_by_details?: User;
  verified_by?: string;
  verified_by_details?: User;
  created_at: string;
  updated_at: string;
}

// 8D Corrective Action Interface
export interface EightDCorrectiveAction {
  id: string;
  root_cause: string;
  root_cause_details?: {
    cause_description: string;
    cause_type: string;
    analysis_method: string;
  };
  action_description: string;
  action_type: 'eliminate' | 'control' | 'detect' | 'prevent';
  rationale: string;
  responsible_person: string;
  responsible_person_details?: User;
  target_date: string;
  actual_implementation_date?: string;
  status: 'planned' | 'approved' | 'in_progress' | 'implemented' | 'verified' | 'effective' | 'ineffective' | 'validated' | 'completed';
  implementation_notes?: string;

  // Implementation tracking (D6)
  implementation_plan?: string;
  implementation_start_date?: string;
  implementation_progress?: number; // 0-100
  progress_notes?: string;
  completion_evidence?: string;
  resources_required?: string;

  // Verification and validation
  verification_method?: string;
  verification_date?: string;
  validation_results?: string;
  effectiveness_rating?: number; // 1-5
  verification_notes?: string;
  estimated_cost?: number;
  actual_cost?: number;
  created_at: string;
  updated_at: string;
}

// 8D Prevention Action Interface
export interface EightDPreventionAction {
  id: string;
  prevention_description: string;
  prevention_type: 'process_change' | 'system_update' | 'training' | 'procedure_update' | 'design_change' | 'control_enhancement' | 'monitoring' | 'other';
  scope_of_application: string;
  responsible_person: string;
  responsible_person_details?: User;
  target_date: string;
  implementation_date?: string;
  status: 'planned' | 'in_progress' | 'implemented' | 'verified' | 'effective';
  verification_method: string;
  verification_date?: string;
  effectiveness_notes?: string;
  similar_processes?: string;
  rollout_plan?: string;
  created_at: string;
  updated_at: string;
}

// 8D Constants
export const EIGHT_D_DISCIPLINES = [
  { number: 1, name: 'D1: Establish the Team', description: 'Form a cross-functional team with the knowledge and authority to solve the problem', icon: '👥' },
  { number: 2, name: 'D2: Describe the Problem', description: 'Define the problem in measurable terms', icon: '📝' },
  { number: 3, name: 'D3: Develop Interim Containment Actions', description: 'Implement immediate actions to protect customers', icon: '🛡️' },
  { number: 4, name: 'D4: Determine Root Causes', description: 'Identify and verify the root causes of the problem', icon: '🔍' },
  { number: 5, name: 'D5: Develop Permanent Corrective Actions', description: 'Choose and verify permanent corrective actions', icon: '🔧' },
  { number: 6, name: 'D6: Implement Corrective Actions', description: 'Implement the permanent corrective actions', icon: '⚙️' },
  { number: 7, name: 'D7: Prevent Recurrence', description: 'Modify systems to prevent recurrence of this and similar problems', icon: '🚫' },
  { number: 8, name: 'D8: Recognize the Team', description: 'Recognize the collective efforts of the team', icon: '🏆' },
] as const;

export const EIGHT_D_STATUSES = [
  { value: 'initiated', label: 'Initiated', color: 'blue', icon: '🚀' },
  { value: 'in_progress', label: 'In Progress', color: 'orange', icon: '⏳' },
  { value: 'completed', label: 'Completed', color: 'green', icon: '✅' },
  { value: 'closed', label: 'Closed', color: 'gray', icon: '🔒' },
  { value: 'cancelled', label: 'Cancelled', color: 'red', icon: '❌' },
] as const;

export const TEAM_ROLES = [
  { value: 'champion', label: '8D Champion', icon: '👑' },
  { value: 'team_leader', label: 'Team Leader', icon: '👨‍💼' },
  { value: 'subject_expert', label: 'Subject Matter Expert', icon: '🎓' },
  { value: 'process_owner', label: 'Process Owner', icon: '🏭' },
  { value: 'quality_rep', label: 'Quality Representative', icon: '✅' },
  { value: 'technical_expert', label: 'Technical Expert', icon: '🔧' },
  { value: 'member', label: 'Team Member', icon: '👤' },
] as const;

export const ROOT_CAUSE_ANALYSIS_METHODS = [
  { value: '5_whys', label: '5 Whys', icon: '❓' },
  { value: 'fishbone', label: 'Fishbone Diagram', icon: '🐟' },
  { value: 'fault_tree', label: 'Fault Tree Analysis', icon: '🌳' },
  { value: 'barrier_analysis', label: 'Barrier Analysis', icon: '🚧' },
  { value: 'change_analysis', label: 'Change Analysis', icon: '🔄' },
  { value: 'timeline', label: 'Timeline Analysis', icon: '📅' },
  { value: 'other', label: 'Other Method', icon: '❓' },
] as const;

export const CAUSE_TYPES = [
  { value: 'immediate', label: 'Immediate Cause', color: 'red' },
  { value: 'contributing', label: 'Contributing Cause', color: 'orange' },
  { value: 'root', label: 'Root Cause', color: 'purple' },
  { value: 'systemic', label: 'Systemic Cause', color: 'blue' },
] as const;


