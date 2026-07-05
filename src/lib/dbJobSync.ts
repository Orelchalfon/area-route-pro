import type { Job } from '@/types';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type DbJobTable = 'malfunctions' | 'installations' | 'ongoing_services';

export type DbJobRef = {
  table: DbJobTable;
  dbId: string;
};

type SchedulingColumns = {
  technician_id?: string | null;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  estimated_duration?: number | null;
  completion_status?: string | null;
  completion_notes?: string | null;
  completed_at?: string | null;
};

export type MalfunctionJobUpdate = TablesUpdate<'malfunctions'> & SchedulingColumns;
export type InstallationJobUpdate = TablesUpdate<'installations'> & SchedulingColumns;
export type OngoingServiceJobUpdate = TablesUpdate<'ongoing_services'> & SchedulingColumns;

export type DbJobUpdateByTable = {
  malfunctions: MalfunctionJobUpdate;
  installations: InstallationJobUpdate;
  ongoing_services: OngoingServiceJobUpdate;
};

export type DbJobUpdate = DbJobUpdateByTable[DbJobTable];

export type JobSyncPatch = Partial<
  Pick<Job, 'status' | 'location' | 'city' | 'notes' | 'priority' | 'estimatedDuration' | 'phone'>
> & {
  technicianId?: string | null;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  completionStatus?: Job['completionStatus'] | null;
  completionNotes?: string | null;
};

export function getDbJobRef(jobId: string): DbJobRef | null {
  if (jobId.startsWith('db-malf-')) {
    return { table: 'malfunctions', dbId: jobId.replace('db-malf-', '') };
  }

  if (jobId.startsWith('db-inst-')) {
    return { table: 'installations', dbId: jobId.replace('db-inst-', '') };
  }

  if (jobId.startsWith('db-ongoing-')) {
    return { table: 'ongoing_services', dbId: jobId.replace('db-ongoing-', '') };
  }

  return null;
}

// Shared shape for creating a new request ("פניה חדשה") in any of the source tables.
// Scheduling fields are optional: a request created without a technician/date stays in
// the "ממתינים לשיבוץ" pool and off the monthly board until the manager schedules it.
export type NewJobInsertInput = {
  customerId?: string;
  customerName: string;
  phone?: string;
  city?: string;
  address?: string;
  notes?: string;
  productType?: string;
  priority?: string;
  technicianId?: string | null;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  estimatedDuration?: number;
};

export function buildMalfunctionInsert(input: NewJobInsertInput): TablesInsert<'malfunctions'> {
  return {
    customer_name: input.customerName,
    phone: input.phone ?? null,
    city: input.city ?? null,
    address: input.address ?? null,
    description: input.notes ?? null,
    status: 'draft',
    priority: input.priority ?? 'medium',
    source: 'app',
    technician_id: input.technicianId ?? null,
    scheduled_date: input.scheduledDate ?? null,
    scheduled_time: input.scheduledTime ?? null,
    estimated_duration: input.estimatedDuration ?? null,
  };
}

export function buildInstallationInsert(input: NewJobInsertInput): TablesInsert<'installations'> {
  return {
    customer_name: input.customerName,
    phone: input.phone ?? null,
    city: input.city ?? null,
    address: input.address ?? null,
    product_type: input.productType ?? null,
    notes: input.notes ?? null,
    status: 'draft',
    priority: input.priority ?? 'medium',
    source: 'app',
    technician_id: input.technicianId ?? null,
    scheduled_date: input.scheduledDate ?? null,
    scheduled_time: input.scheduledTime ?? null,
    estimated_duration: input.estimatedDuration ?? null,
  };
}

export function buildOngoingServiceInsert(
  input: NewJobInsertInput,
  serviceDate: string,
): TablesInsert<'ongoing_services'> {
  return {
    service_date: serviceDate,
    task_description: input.notes || input.productType || 'שירות שוטף',
    customer_id: input.customerId ?? null,
    customer_name: input.customerName,
    phone: input.phone ?? null,
    city: input.city ?? null,
    address: input.address ?? null,
    location: input.address ?? '',
    notes: input.notes ?? null,
    status: 'draft',
    priority: input.priority ?? 'low',
    source: 'app',
    technician_id: input.technicianId ?? null,
    scheduled_date: input.scheduledDate ?? null,
    scheduled_time: input.scheduledTime ?? null,
    estimated_duration: input.estimatedDuration ?? null,
  };
}

export function buildDbJobUpdatePatch<TTable extends DbJobTable>(
  table: TTable,
  data: JobSyncPatch,
): DbJobUpdateByTable[TTable] {
  // Note: do NOT set `source` here. The employee RLS trigger
  // (enforce_employee_job_update) rejects any UPDATE that changes `source`, which
  // silently blocked technician completions on legacy (non-'app') rows. `source`
  // is vestigial (Make sync is being retired), so updates leave it untouched.
  const patch: DbJobUpdate = {};

  if (data.status !== undefined) patch.status = data.status;
  if (data.technicianId !== undefined) patch.technician_id = data.technicianId ?? null;
  if (data.scheduledDate !== undefined) patch.scheduled_date = data.scheduledDate ?? null;
  if (data.scheduledTime !== undefined) patch.scheduled_time = data.scheduledTime ?? null;
  if (data.location !== undefined) patch.address = data.location;
  if (data.city !== undefined) patch.city = data.city;
  if (data.notes !== undefined) patch.notes = data.notes;
  if (data.phone !== undefined) patch.phone = data.phone;
  if (data.priority !== undefined) patch.priority = data.priority;
  if (data.estimatedDuration !== undefined) patch.estimated_duration = data.estimatedDuration;
  if (data.completionStatus !== undefined) patch.completion_status = data.completionStatus ?? null;
  if (data.completionNotes !== undefined) patch.completion_notes = data.completionNotes ?? null;

  if (data.status === 'completed') {
    patch.completed_at = new Date().toISOString();
  }

  return patch as DbJobUpdateByTable[TTable];
}
