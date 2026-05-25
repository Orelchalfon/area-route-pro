import type { Job } from '@/types';
import type { TablesUpdate } from '@/integrations/supabase/types';

export type DbJobTable = 'malfunctions' | 'installations';

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
export type DbJobUpdate = MalfunctionJobUpdate | InstallationJobUpdate;

export type JobSyncPatch = Partial<
  Pick<Job, 'status' | 'location' | 'city' | 'notes' | 'priority' | 'estimatedDuration'>
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

  return null;
}

export function buildDbJobUpdatePatch(data: JobSyncPatch): DbJobUpdate {
  const patch: DbJobUpdate = { source: 'app' };

  if (data.status !== undefined) patch.status = data.status;
  if (data.technicianId !== undefined) patch.technician_id = data.technicianId ?? null;
  if (data.scheduledDate !== undefined) patch.scheduled_date = data.scheduledDate ?? null;
  if (data.scheduledTime !== undefined) patch.scheduled_time = data.scheduledTime ?? null;
  if (data.location !== undefined) patch.address = data.location;
  if (data.city !== undefined) patch.city = data.city;
  if (data.notes !== undefined) patch.notes = data.notes;
  if (data.priority !== undefined) patch.priority = data.priority;
  if (data.estimatedDuration !== undefined) patch.estimated_duration = data.estimatedDuration;
  if (data.completionStatus !== undefined) patch.completion_status = data.completionStatus ?? null;
  if (data.completionNotes !== undefined) patch.completion_notes = data.completionNotes ?? null;

  if (data.status === 'completed') {
    patch.completed_at = new Date().toISOString();
  }

  return patch;
}
