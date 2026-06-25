import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Job, Customer, JOB_TYPE_CONFIG, JobStatus, CompletionStatus } from '@/types';

type MalfRow = {
  id: string;
  customer_name: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  region: string | null;
  description: string | null;
  malfunction_date: string | null;
  status: string | null;
  priority: string | null;
  notes: string | null;
  sheet_row_id: string | null;
  source: string | null;
  technician_id?: string | null;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  estimated_duration?: number | null;
  completion_status?: string | null;
  completion_notes?: string | null;
  created_at: string;
  updated_at: string;
};

type InstRow = {
  id: string;
  customer_name: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  region: string | null;
  product_type: string | null;
  installation_date: string | null;
  installation_time: string | null;
  status: string | null;
  priority: string | null;
  notes: string | null;
  sheet_row_id: string | null;
  source: string | null;
  technician_id?: string | null;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  estimated_duration?: number | null;
  completion_status?: string | null;
  completion_notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type RealtimeStatus = 'connecting' | 'live' | 'error' | 'closed';

function mapPriority(p: string | null): Job['priority'] {
  if (p === 'high' || p === 'medium' || p === 'low') return p;
  if (p === 'גבוהה') return 'high';
  if (p === 'בינונית') return 'medium';
  return 'low';
}

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

  if (status === 'pending') return 'draft';
  return 'draft';
}

function mapCompletionStatus(status: string | null | undefined): CompletionStatus | undefined {
  if (status === 'done' || status === 'not_done' || status === 'need_return') return status;
  return undefined;
}

function malfToJobAndCustomer(row: MalfRow): { job: Job; customer: Customer } {
  const customer: Customer = {
    id: `db-malf-cust-${row.id}`,
    name: row.customer_name || 'ללא שם',
    phone: row.phone || '',
    address: row.address || '',
    city: row.city || '',
    email: '',
    product: '',
    filterReplacementMonth: 1,
  };
  const job: Job = {
    id: `db-malf-${row.id}`,
    type: 'malfunction',
    status: mapStatus(row.status),
    priority: mapPriority(row.priority),
    customerId: customer.id,
    technicianId: row.technician_id || undefined,
    scheduledDate: row.scheduled_date || undefined,
    scheduledTime: row.scheduled_time || undefined,
    estimatedDuration: row.estimated_duration || JOB_TYPE_CONFIG.malfunction.duration,
    location: row.address || '',
    city: row.city || '',
    notes: [row.description, row.notes].filter(Boolean).join(' | '),
    completionStatus: mapCompletionStatus(row.completion_status),
    completionNotes: row.completion_notes || undefined,
    createdAt: (row.malfunction_date || row.created_at).slice(0, 10),
  };
  return { job, customer };
}

function instToJobAndCustomer(row: InstRow): { job: Job; customer: Customer } {
  const customer: Customer = {
    id: `db-inst-cust-${row.id}`,
    name: row.customer_name || 'ללא שם',
    phone: row.phone || '',
    address: row.address || '',
    city: row.city || '',
    email: '',
    product: row.product_type || '',
    filterReplacementMonth: 1,
  };
  const job: Job = {
    id: `db-inst-${row.id}`,
    type: 'installation',
    status: mapStatus(row.status),
    priority: mapPriority(row.priority),
    customerId: customer.id,
    technicianId: row.technician_id || undefined,
    estimatedDuration: row.estimated_duration || JOB_TYPE_CONFIG.installation.duration,
    location: row.address || '',
    city: row.city || '',
    notes: [row.product_type, row.notes].filter(Boolean).join(' | '),
    completionStatus: mapCompletionStatus(row.completion_status),
    completionNotes: row.completion_notes || undefined,
    createdAt: (row.installation_date || row.created_at).slice(0, 10),
    scheduledDate: row.scheduled_date || row.installation_date || undefined,
    scheduledTime: row.scheduled_time || row.installation_time || undefined,
  };
  return { job, customer };
}

export function useMalfunctionsInstallations() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting');
  const refreshInFlightRef = useRef(false);
  const refreshQueuedRef = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) {
      refreshQueuedRef.current = true;
      return;
    }

    refreshInFlightRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const [{ data: malf, error: malfError }, { data: inst, error: instError }] = await Promise.all([
        supabase.from('malfunctions').select('*').order('created_at', { ascending: false }),
        supabase.from('installations').select('*').order('created_at', { ascending: false }),
      ]);

      if (malfError) throw malfError;
      if (instError) throw instError;

      const allJobs: Job[] = [];
      const allCustomers: Customer[] = [];
      // Hide archived (closed/deleted) rows. Filtered client-side, not via
      // `.neq('status','archived')`, because that SQL form also drops rows with a NULL status.
      (malf as MalfRow[] | null)?.filter(r => r.status !== 'archived').forEach(r => {
        const { job, customer } = malfToJobAndCustomer(r);
        allJobs.push(job);
        allCustomers.push(customer);
      });
      (inst as InstRow[] | null)?.filter(r => r.status !== 'archived').forEach(r => {
        const { job, customer } = instToJobAndCustomer(r);
        allJobs.push(job);
        allCustomers.push(customer);
      });
      const latestInst = (inst as InstRow[] | null)?.slice().sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))[0];
      console.log('[refresh] inst rows:', inst?.length, '| latest updated_at:', latestInst?.updated_at, '| name:', latestInst?.customer_name, '| address:', latestInst?.address);
      setJobs(allJobs);
      setCustomers(allCustomers);
      setLastSyncedAt(new Date().toISOString());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to sync live data');
    } finally {
      setLoaded(true);
      setLoading(false);
      refreshInFlightRef.current = false;

      if (refreshQueuedRef.current) {
        refreshQueuedRef.current = false;
        void refresh();
      }
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      void refresh();
    }, 250);
  }, [refresh]);

  useEffect(() => {
    void refresh();
    const channel = supabase
      .channel('malf-inst-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'malfunctions' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'installations' }, scheduleRefresh)
      .subscribe(status => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('live');
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setRealtimeStatus('error');
        if (status === 'CLOSED') setRealtimeStatus('closed');
      });
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      supabase.removeChannel(channel);
      setRealtimeStatus('closed');
    };
  }, [refresh, scheduleRefresh]);

  return { jobs, customers, loaded, refresh, loading, error, lastSyncedAt, realtimeStatus };
}
