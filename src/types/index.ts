export type JobType = 'filter_replacement' | 'malfunction' | 'installation';
export type JobStatus = 'draft' | 'pending_customer' | 'confirmed' | 'in_progress' | 'completed' | 'rescheduled';
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
  estimatedDuration: number; // minutes
  location: string;
  city: string;
  notes: string;
  completionNotes?: string;
  createdAt: string;
}

export const JOB_TYPE_CONFIG: Record<JobType, { label: string; duration: number; priority: JobPriority; icon: string; color: string }> = {
  filter_replacement: { label: 'Filter Replacement', duration: 30, priority: 'low', icon: 'Filter', color: 'info' },
  malfunction: { label: 'Malfunction', duration: 60, priority: 'high', icon: 'AlertTriangle', color: 'destructive' },
  installation: { label: 'New Installation', duration: 180, priority: 'medium', icon: 'Wrench', color: 'secondary' },
};

export const STATUS_CONFIG: Record<JobStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'muted' },
  pending_customer: { label: 'Pending Customer', color: 'warning' },
  confirmed: { label: 'Confirmed', color: 'info' },
  in_progress: { label: 'In Progress', color: 'secondary' },
  completed: { label: 'Completed', color: 'success' },
  rescheduled: { label: 'Rescheduled', color: 'accent' },
};
