export interface InductionTrainingData {
  id: number;
  key: string;
  title: string;
  description?: string;
  date: string;
  start_time?: string;
  end_time?: string;
  duration?: number;
  duration_unit?: string;
  location: string;
  conducted_by: string;
  status: 'planned' | 'completed' | 'cancelled';
  evidence_photo?: string;
  
  // ISO Compliance Fields
  document_id?: string;
  revision_number?: string;
  
  // Digital Signatures
  trainer_signature?: string;
  hr_signature?: string;
  hr_name?: string;
  hr_date?: string;
  safety_signature?: string;
  safety_name?: string;
  safety_date?: string;
  dept_head_signature?: string;
  dept_head_name?: string;
  dept_head_date?: string;
  
  created_at: string;
  updated_at: string;
  attendances?: InductionTrainingAttendanceData[];
  
  // Computed Properties
  is_signatures_complete?: boolean;
  signature_summary?: {
    trainer: boolean;
    hr: boolean;
    safety: boolean;
    dept_head: boolean;
    complete: boolean;
  };
}

export interface InductionTrainingAttendanceData {
  id: number;
  key: string;
  induction_training_id: number;
  worker_id: number;
  participant_type?: 'worker' | 'user';
  participant_id?: number;
  worker_name: string;
  worker_photo: string;
  attendance_photo: string;
  status: 'present' | 'absent';
  timestamp: string;
  created_at?: string;
  match_score?: number; // For photo matching confidence
}

export interface UserData {
  id: number;
  username: string;
  name?: string;
  email?: string;
}

export interface TrainingComplianceReport {
  training_id: number;
  document_id: string;
  compliance_status: 'compliant' | 'non_compliant' | 'pending';
  missing_signatures: string[];
  audit_ready: boolean;
  generated_at: string;
}
