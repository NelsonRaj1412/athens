// Define the UserMinimal interface
export interface UserMinimal {
  id: number;
  username: string;
  full_name: string;
  email?: string;
}

// Define the PermitType interface
export interface PermitType {
  id: number;
  name: string;
  description?: string;
  color_code?: string;
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  validity_hours?: number;
  requires_approval_levels?: number;
  active?: boolean;
}

// Permit interface - authorization is handled by workflow system
export interface Permit {
  id: number;
  permit_number: string;
  title: string;
  permit_type: number;
  permit_type_details?: PermitType;
  location: string;
  description: string;
  planned_start_time: string;
  planned_end_time: string;
  actual_start_time?: string;
  actual_end_time?: string;
  created_by: number;
  created_by_details?: UserMinimal;
  status: PermitStatus;
  current_approval_level?: number;
  created_at: string;
  updated_at: string;
  hazards?: string;
  control_measures?: string;
  ppe_requirements?: string;
  special_instructions?: string;
  // Workflow-managed fields (read-only)
  verifier?: number;
  verifier_details?: UserMinimal;
  verified_at?: string;
  verification_comments?: string;
  approved_by?: number;
  approved_by_details?: UserMinimal;
  approved_at?: string;
  approval_comments?: string;
  // Additional fields from errors
  assigned_workers?: any[];
  gps_coordinates?: any;
  risk_assessment_completed?: boolean;
  probability?: number;
  severity?: number;
  safety_checklist?: any;
  requires_isolation?: boolean;
  mobile_created?: boolean;
  offline_id?: string;
  project?: any;
  emergency_procedures?: string;
  audit_trail?: any[];
  isolation_details?: string;
}

// Update the PermitStatus type to include verification statuses
export type PermitStatus = 
  | 'draft'
  | 'pending_verification'
  | 'verified'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'in_progress'
  | 'completed'
  | 'closed'
  | 'suspended'
  | 'cancelled';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  usertype: string;
  grade?: string;
}

export interface WorkflowStep {
  id: number;
  name: string;
  order: number;
  required_role?: string;
  is_active: boolean;
  step_type?: 'verification' | 'approval';
  assignee?: string;
  status?: 'pending' | 'approved' | 'rejected';
  completed_at?: string;
  comments?: string;
}









