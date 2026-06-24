import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Job, Customer, JOB_TYPE_CONFIG, JobStatus, CompletionStatus } from '@/types';

export interface OngoingService {
  id: string;
  service_date: string;
  task_description: string;
  location: string;
  is_done: boolean | null;
  status_label: string | null;
}

// Full row shape including the scheduling/customer columns added in
// 20260623000000_extend_ongoing_services.sql. Rows created as app requests carry a
// customer_id; calendar-derived and follow-up rows do not.
type OngoingServiceRow = {
  id: string;
  service_date: string;
  task_description: string;
  location: string | null;
  is_done: boolean | null;
  status_label: string | null;
  customer_id: string | null;
  customer_name: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  status: string | null;
  priority: string | null;
  technician_id: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  estimated_duration: number | null;
  completion_status: string | null;
  completion_notes: string | null;
  notes: string | null;
  source: string | null;
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
  return 'draft';
}

function mapPriority(p: string | null): Job['priority'] {
  if (p === 'high' || p === 'medium' || p === 'low') return p;
  return 'low';
}

function mapCompletionStatus(status: string | null): CompletionStatus | undefined {
  if (status === 'done' || status === 'not_done' || status === 'need_return') return status;
  return undefined;
}

// Only rows created through the app's "פניה חדשה" flow (they carry a customer_id)
// become schedulable jobs. Calendar/follow-up rows stay out of the board.
function ongoingToJobAndCustomer(row: OngoingServiceRow): { job: Job; customer: Customer } {
  const customer: Customer = {
    id: row.customer_id || `db-ongoing-cust-${row.id}`,
    name: row.customer_name || 'ללא שם',
    phone: row.phone || '',
    address: row.address || '',
    city: row.city || '',
    email: '',
    product: '',
    filterReplacementMonth: 1,
  };
  const job: Job = {
    id: `db-ongoing-${row.id}`,
    type: 'filter_replacement',
    status: mapStatus(row.status),
    priority: mapPriority(row.priority),
    customerId: customer.id,
    technicianId: row.technician_id || undefined,
    scheduledDate: row.scheduled_date || undefined,
    scheduledTime: row.scheduled_time || undefined,
    estimatedDuration: row.estimated_duration || JOB_TYPE_CONFIG.filter_replacement.duration,
    location: row.address || row.location || '',
    city: row.city || '',
    notes: [row.task_description, row.notes].filter(Boolean).join(' | '),
    completionStatus: mapCompletionStatus(row.completion_status),
    completionNotes: row.completion_notes || undefined,
    createdAt: (row.scheduled_date || row.service_date).slice(0, 10),
  };
  return { job, customer };
}

export function useOngoingServices() {
  const [services, setServices] = useState<OngoingService[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAll = useCallback(async () => {
    const allRows: OngoingServiceRow[] = [];
    const PAGE_SIZE = 1000;
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('ongoing_services')
        .select('*')
        .order('service_date', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.error('Error fetching ongoing services:', error);
        break;
      }

      const rows = (data as OngoingServiceRow[] | null) ?? [];
      allRows.push(...rows);
      from += PAGE_SIZE;
      hasMore = rows.length === PAGE_SIZE;
    }

    setServices(
      allRows.map(r => ({
        id: r.id,
        service_date: r.service_date,
        task_description: r.task_description,
        location: r.location || '',
        is_done: r.is_done,
        status_label: r.status_label,
      })),
    );

    const reqJobs: Job[] = [];
    const reqCustomers: Customer[] = [];
    allRows
      .filter(r => r.customer_id)
      .forEach(r => {
        const { job, customer } = ongoingToJobAndCustomer(r);
        reqJobs.push(job);
        reqCustomers.push(customer);
      });
    setJobs(reqJobs);
    setCustomers(reqCustomers);

    setLoading(false);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void fetchAll();

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        void fetchAll();
      }, 300);
    };

    // Unique channel name — this hook can be mounted more than once (useJobs +
    // ServiceCyclePage), and two channels with the same name collide.
    const channel = supabase
      .channel(`ongoing-services-realtime-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ongoing_services' }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  return { services, jobs, customers, loading, loaded, refresh: fetchAll };
}
