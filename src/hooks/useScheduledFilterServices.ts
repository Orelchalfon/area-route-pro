import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Job, JOB_TYPE_CONFIG, JobStatus, CompletionStatus } from '@/types';

type ScheduledFilterServiceRow = {
  id: string;
  job_key: string;
  customer_id: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  technician_id: string | null;
  status: string | null;
  completion_status: string | null;
  completion_notes: string | null;
  estimated_duration: number | null;
  location: string | null;
  city: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function mapStatus(status: string | null): JobStatus {
  if (
    status === 'draft' ||
    status === 'pending_customer' ||
    status === 'confirmed' ||
    status === 'in_progress' ||
    status === 'completed' ||
    status === 'rescheduled'
  ) {
    return status;
  }
  return 'confirmed';
}

function mapCompletionStatus(status: string | null): CompletionStatus | undefined {
  if (status === 'done' || status === 'not_done' || status === 'need_return') return status;
  return undefined;
}

// A scheduled filter service reconciles back to its synthetic board id via job_key,
// so the loaded Job keeps id === job_key (filter-{year}-{month}-{customerId}).
function rowToJob(row: ScheduledFilterServiceRow): Job {
  return {
    id: row.job_key,
    type: 'filter_replacement',
    status: mapStatus(row.status),
    priority: 'low',
    customerId: row.customer_id,
    technicianId: row.technician_id || undefined,
    scheduledDate: row.scheduled_date || undefined,
    scheduledTime: row.scheduled_time || undefined,
    estimatedDuration: row.estimated_duration || JOB_TYPE_CONFIG.filter_replacement.duration,
    location: row.location || '',
    city: row.city || '',
    notes: row.notes || 'החלפת פילטר שנתית',
    completionStatus: mapCompletionStatus(row.completion_status),
    completionNotes: row.completion_notes || undefined,
    createdAt: (row.scheduled_date || row.created_at).slice(0, 10),
  };
}

export function useScheduledFilterServices() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('scheduled_filter_services')
      .select('*')
      .order('scheduled_date', { ascending: true });

    if (error) {
      console.error('Error fetching scheduled filter services:', error);
      setLoaded(true);
      return;
    }

    // Hide archived (closed/deleted) rows. Filtered client-side, not via
    // `.neq('status','archived')`, because that SQL form also drops NULL-status rows.
    setJobs(
      ((data as ScheduledFilterServiceRow[] | null) ?? [])
        .filter(row => row.status !== 'archived')
        .map(rowToJob),
    );
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refresh();
    const channel = supabase
      .channel('scheduled-filter-services-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scheduled_filter_services' },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { jobs, loaded, refresh };
}
