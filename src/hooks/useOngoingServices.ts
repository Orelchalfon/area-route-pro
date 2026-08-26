import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Job, Customer, JOB_TYPE_CONFIG, CompletionStatus } from '@/types';
import { mapCompletionStatus, mapPriority, mapStatus } from '@/lib/jobMappers';
import { makeDbCustomerId, makeOngoingCustomerId, makeOngoingJobId } from '@/lib/idConventions';

export interface OngoingService {
  id: string;
  service_date: string;
  task_description: string;
  location: string;
  is_done: boolean | null;
  status_label: string | null;
  // Technician completion (בוצע / לא בוצע / צריך לחזור), written by the app on the
  // ongoing_services row. Drives the service-cycle status pill; falls back to the
  // calendar-synced is_done/status_label when absent.
  completion_status: CompletionStatus | null;
  // App-created (שירות שוטף) rows carry a customer_id; calendar-derived rows don't.
  customer_id: string | null;
  // Set once the manager schedules the service onto a day (via the monthly board).
  // Used to keep already-scheduled rows out of the picker's "to schedule" pool.
  scheduled_date: string | null;
  // Customer phone — mostly empty on calendar rows; backfilled/edited on the service page.
  phone: string | null;
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

const ONGOING_SERVICE_COLUMNS = [
  'id',
  'service_date',
  'task_description',
  'location',
  'is_done',
  'status_label',
  'customer_id',
  'customer_name',
  'phone',
  'city',
  'address',
  'status',
  'priority',
  'technician_id',
  'scheduled_date',
  'scheduled_time',
  'estimated_duration',
  'completion_status',
  'completion_notes',
  'notes',
  'source',
].join(',');

// Only rows created through the app's "פניה חדשה" flow (they carry a customer_id)
// become schedulable jobs. Calendar/follow-up rows stay out of the board.
function ongoingToJobAndCustomer(row: OngoingServiceRow): { job: Job; customer: Customer } {
  // Rows that reference a real customer resolve to the canonical `db-cust-{uuid}` id
  // used across `customersList` (so `customers.find(c => c.id === job.customerId)`
  // matches and the name renders); calendar/fallback rows keep a `db-ongoing-cust-`
  // id, which `useJobs` folds into `customersList` as a derived customer.
  const customerId = row.customer_id
    ? makeDbCustomerId(row.customer_id)
    : makeOngoingCustomerId(row.id);
  const customer: Customer = {
    id: customerId,
    // Calendar-derived rows have no customer_name — their task_description embeds the
    // client (e.g. "יאיר כהן -ביקור שירות"), so fall back to it to keep board cards readable.
    name: row.customer_name || row.task_description || 'ללא שם',
    phone: row.phone || '',
    address: row.address || '',
    city: row.city || row.location || '',
    email: '',
    product: '',
    filterReplacementMonth: 1,
  };
  const job: Job = {
    id: makeOngoingJobId(row.id),
    type: 'filter_replacement',
    status: mapStatus(row.status),
    priority: mapPriority(row.priority),
    customerId,
    technicianId: row.technician_id || undefined,
    scheduledDate: row.scheduled_date || undefined,
    scheduledTime: row.scheduled_time || undefined,
    estimatedDuration: row.estimated_duration || JOB_TYPE_CONFIG.filter_replacement.duration,
    phone: row.phone || undefined,
    location: row.address || row.location || '',
    city: row.city || row.location || '',
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
  // Bumped on every fetchAll. Background page appends check they're still the current
  // generation before setState, so a newer refresh's results are never clobbered by a
  // slower in-flight one that started earlier.
  const fetchGenerationRef = useRef(0);
  // Whether a full fetch has completed at least once. Gates progressive publishing —
  // see the comment in fetchAll.
  const hasLoadedOnceRef = useRef(false);

  const fetchAll = useCallback(async () => {
    const PAGE_SIZE = 1000;
    const generation = ++fetchGenerationRef.current;

    const page = (i: number) =>
      supabase
        .from('ongoing_services')
        .select(ONGOING_SERVICE_COLUMNS)
        .or('status.is.null,status.neq.archived')
        // Newest first: the picker window (last 6 months + 2 weeks) and current/future
        // scheduled jobs land on page 0, so the board's relevant rows paint immediately
        // instead of waiting behind years of old calendar rows.
        .order('service_date', { ascending: false })
        .range(i * PAGE_SIZE, i * PAGE_SIZE + PAGE_SIZE - 1);

    // Derive and publish state from the rows accumulated so far. Reused for the first
    // paint and for each background page append so the mapping stays identical.
    const applyRows = (rows: OngoingServiceRow[]) => {
      if (generation !== fetchGenerationRef.current) return;

      setServices(
        rows.map(r => ({
          id: r.id,
          service_date: r.service_date,
          task_description: r.task_description,
          location: r.location || '',
          is_done: r.is_done,
          status_label: r.status_label,
          completion_status: mapCompletionStatus(r.completion_status) ?? null,
          customer_id: r.customer_id,
          scheduled_date: r.scheduled_date,
          phone: r.phone,
        })),
      );

      // Rows become schedulable board jobs when they either originate from the app
      // (customer_id) OR have been scheduled onto a day (scheduled_date/technician_id).
      // Unscheduled calendar rows stay OUT of `jobs` — they surface in the monthly
      // picker's 'שירות' pool (built from `services`) and only become jobs once scheduled.
      const reqJobs: Job[] = [];
      const reqCustomers: Customer[] = [];
      rows
        .filter(r => r.customer_id || r.scheduled_date || r.technician_id)
        .forEach(r => {
          const { job, customer } = ongoingToJobAndCustomer(r);
          reqJobs.push(job);
          reqCustomers.push(customer);
        });
      setJobs(reqJobs);
      setCustomers(reqCustomers);
    };

    // Publishing a partial page is only safe when there is nothing on screen yet.
    // applyRows REPLACES jobs/customers/services outright, and useJobs folds the result
    // in by dropping every db-ongoing- job and re-appending this hook's array — so on a
    // refresh, publishing page 0 alone wipes every ongoing chip off the board until the
    // last page lands a second or two later. Board rows are mostly calendar rows whose
    // service_date is old, so they sort behind page 0 and all of them vanish at once.
    // First load streams progressively (fast first paint, board still behind
    // boardReady); every later refresh accumulates silently and publishes once.
    const progressive = !hasLoadedOnceRef.current;

    // Page 0 first: paint the most-relevant rows and flip loaded after one round-trip
    // (no serial exact-count query — it was expensive on this large table and blocked
    // first paint). Remaining pages, if any, stream in below.
    const { data: firstData, error: firstError } = await page(0);
    if (firstError) {
      console.error('Error fetching ongoing services:', firstError);
      if (generation === fetchGenerationRef.current) {
        setLoading(false);
        setLoaded(true);
      }
      return;
    }

    const allRows: OngoingServiceRow[] = [
      ...((firstData as OngoingServiceRow[] | null) ?? []),
    ];
    if (progressive) applyRows(allRows);
    if (generation === fetchGenerationRef.current) {
      setLoading(false);
      setLoaded(true);
    }

    // Background: fetch the rest sequentially. A page shorter than PAGE_SIZE means
    // we've reached the end.
    let i = 1;
    let hasMore = allRows.length === PAGE_SIZE;
    while (hasMore) {
      if (generation !== fetchGenerationRef.current) return;
      const { data, error } = await page(i);
      if (error) {
        console.error('Error fetching ongoing services:', error);
        break;
      }
      const rows = (data as OngoingServiceRow[] | null) ?? [];
      allRows.push(...rows);
      if (progressive) applyRows(allRows);
      i += 1;
      hasMore = rows.length === PAGE_SIZE;
    }

    // The complete set, in one commit. Reached on both exits — including the `break`
    // above — so a mid-way page failure still publishes what was gathered rather than
    // leaving the previous fetch's data in place. Skipped when progressive already
    // published these rows page by page (a `break` there discards nothing, since the
    // failing page contributed no rows).
    if (!progressive) applyRows(allRows);
    hasLoadedOnceRef.current = true;
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

  // Edit a service line (the manager's "current service" table). Optimistically updates
  // local state, then persists; a failed write is rolled back via a refresh.
  //
  // Returns whether the write actually landed. Callers MUST check it before showing a
  // success toast: this used to be fire-and-forget, so a rejected UPDATE (an RLS denial,
  // say) only reached console.error while the manager was told it had saved.
  const updateOngoingService = useCallback(
    async (
      id: string,
      patch: {
        task_description?: string;
        location?: string;
        service_date?: string;
        phone?: string;
        // Manager-editable completion status; drives the service-cycle pill.
        completion_status?: CompletionStatus | null;
      },
    ) => {
      setServices(prev =>
        prev.map(s => (s.id === id ? { ...s, ...patch } : s)),
      );
      const { error } = await supabase
        .from('ongoing_services')
        .update({ ...patch, source: 'app' })
        .eq('id', id);
      if (error) {
        console.error(`Failed to update ongoing service ${id}:`, error);
        void fetchAll();
        return false;
      }
      return true;
    },
    [fetchAll],
  );

  // Delete a service line: mark it 'archived' (kept in the DB, hidden on next load) and
  // drop it from local state immediately.
  const archiveOngoingService = useCallback(async (id: string) => {
    setServices(prev => prev.filter(s => s.id !== id));
    const { error } = await supabase
      .from('ongoing_services')
      .update({ status: 'archived' })
      .eq('id', id);
    if (error) {
      console.error(`Failed to archive ongoing service ${id}:`, error);
      void fetchAll();
      return false;
    }
    return true;
  }, [fetchAll]);

  return { services, jobs, customers, loading, loaded, refresh: fetchAll, updateOngoingService, archiveOngoingService };
}
