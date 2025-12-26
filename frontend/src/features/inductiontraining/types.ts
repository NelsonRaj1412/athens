export interface InductionTrainingData {
  id: number;
  key: string;
  title: string;
  description?: string;
  date: string;
  duration?: number;
  duration_unit?: string;
  location: string;
  conducted_by: string;
  status: 'planned' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  attendances?: InductionTrainingAttendanceData[];
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
  match_score?: number; // For photo matching confidence
}

export interface UserData {
  id: number;
  username: string;
  name?: string;
  email?: string;
}
