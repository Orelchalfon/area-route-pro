export type JobType = 'filter_replacement' | 'malfunction' | 'installation';

export type ServiceTrack = 'annual_filter' | 'external_filter' | 'bypass_siliphos' | 'service_visit';

export const SERVICE_TRACK_CONFIG: Record<ServiceTrack, { label: string; intervalMonths: number; color: string; bgClass: string; textClass: string }> = {
  annual_filter: { label: 'פילטר שנתי', intervalMonths: 12, color: 'info', bgClass: 'bg-info/15 border-info/30', textClass: 'text-info' },
  external_filter: { label: 'פילטר חוץ', intervalMonths: 6, color: 'secondary', bgClass: 'bg-secondary/15 border-secondary/30', textClass: 'text-secondary' },
  bypass_siliphos: { label: 'בייפס/סיליפוס', intervalMonths: 6, color: 'accent', bgClass: 'bg-accent/15 border-accent/30', textClass: 'text-accent' },
  service_visit: { label: 'ביקור שירות', intervalMonths: 2, color: 'primary', bgClass: 'bg-primary/15 border-primary/30', textClass: 'text-primary' },
};

export interface ActivityLog {
  id: string;
  customerId: string;
  jobId?: string;
  action: string;
  details: string;
  timestamp: string;
}
export type JobStatus = 'draft' | 'pending_customer' | 'confirmed' | 'in_progress' | 'completed' | 'rescheduled' | 'archived';
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
  filterReplacementMonth: number;
  serviceTrack?: ServiceTrack;
  nextServiceDate?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  notes?: string;
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
  // Optional contact phone carried on ongoing-service picker items whose customer is
  // not in customersList (calendar rows). Otherwise resolved from the customer record.
  phone?: string;
  notes: string;
  completionNotes?: string;
  completionStatus?: CompletionStatus;
  createdAt: string;
  // Hebrew display stamp for when the request was opened (date only). Kept
  // separate from createdAt, which stays ISO (YYYY-MM-DD) for filter-cycle logic.
  openedDate?: string;
}

export const JOB_TYPE_CONFIG: Record<JobType, { label: string; duration: number; priority: JobPriority; icon: string; color: string }> = {
  filter_replacement: { label: 'החלפת פילטר', duration: 20, priority: 'low', icon: 'Filter', color: 'info' },
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
  archived: { label: 'נסגר', color: 'muted' },
};
