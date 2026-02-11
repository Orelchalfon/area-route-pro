export type JobType = 'filter_replacement' | 'malfunction' | 'installation';
export type JobStatus = 'draft' | 'pending_customer' | 'confirmed' | 'in_progress' | 'completed' | 'rescheduled';
export type CompletionStatus = 'done' | 'not_done' | 'need_return';
export type JobPriority = 'low' | 'medium' | 'high';

export interface Technician {
  id: string;
  name: string;
  region: string;
  skills: string[];
  avatar?: string;
  phone: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  email: string;
  product: string;
  filterReplacementMonth: number; // 1-12, the fixed month for annual filter replacement
  lat?: number;
  lng?: number;
}

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  priority: JobPriority;
  customerId: string;
  technicianId?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  estimatedDuration: number;
  location: string;
  city: string;
  notes: string;
  completionNotes?: string;
  completionStatus?: CompletionStatus;
  createdAt: string;
}

export const JOB_TYPE_CONFIG: Record<JobType, { label: string; duration: number; priority: JobPriority; icon: string; color: string }> = {
  filter_replacement: { label: 'החלפת פילטר', duration: 25, priority: 'low', icon: 'Filter', color: 'info' },
  malfunction: { label: 'תקלה', duration: 60, priority: 'high', icon: 'AlertTriangle', color: 'destructive' },
  installation: { label: 'התקנה חדשה', duration: 120, priority: 'medium', icon: 'Wrench', color: 'secondary' },
};

export const STATUS_CONFIG: Record<JobStatus, { label: string; color: string }> = {
  draft: { label: 'טיוטה', color: 'muted' },
  pending_customer: { label: 'ממתין ללקוח', color: 'warning' },
  confirmed: { label: 'מאושר', color: 'info' },
  in_progress: { label: 'בביצוע', color: 'secondary' },
  completed: { label: 'הושלם', color: 'success' },
  rescheduled: { label: 'נדחה', color: 'accent' },
};
