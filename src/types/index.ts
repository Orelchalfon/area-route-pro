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
  /** Who performed the action. Absent on entries written before actors were recorded. */
  actorName?: string;
}
export type JobStatus = 'draft' | 'pending_customer' | 'confirmed' | 'in_progress' | 'completed' | 'rescheduled' | 'archived';
export type CompletionStatus = 'done' | 'not_done' | 'need_return';

/**
 * How a visit's outcome is named and coloured — the single source of truth.
 *
 * These three labels and their colour families were previously spelled out in four
 * separate places (useJobs' local statusLabels, service-cycle/status.ts STATUS_OPTIONS
 * and statusClass, and ClientSearchResults' COMPLETION_LABELS), which meant a wording
 * change had to be made four times or the app contradicted itself.
 *
 * Key order is the order the manager picks from: the outcome he sets most often first.
 */
export const COMPLETION_STATUS_CONFIG: Record<CompletionStatus, { label: string; dot: string; pill: string }> = {
  done: { label: 'בוצע', dot: 'bg-green-500', pill: 'bg-green-100 border-green-300 text-green-800' },
  need_return: { label: 'צריך לחזור', dot: 'bg-amber-500', pill: 'bg-amber-100 border-amber-300 text-amber-800' },
  not_done: { label: 'לא בוצע', dot: 'bg-red-500', pill: 'bg-red-100 border-red-300 text-red-800' },
};

export const COMPLETION_STATUS_LABELS = Object.fromEntries(
  Object.entries(COMPLETION_STATUS_CONFIG).map(([k, v]) => [k, v.label]),
) as Record<CompletionStatus, string>;
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
  // Soft deletion. `isActive: false` hides the customer from every surface that starts
  // NEW work; existing jobs keep resolving their name from the same list, so history is
  // unaffected. `deletedAt` is the audit stamp, cleared on restore.
  isActive?: boolean;
  deletedAt?: string | null;
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
  // Same idea as `phone`, for the display name: a calendar row has no customer record at
  // all, so the name travels on the job itself (see ongoingCustomerName). Otherwise
  // resolved from the customer record — never a substitute for customerId.
  customerName?: string;
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
