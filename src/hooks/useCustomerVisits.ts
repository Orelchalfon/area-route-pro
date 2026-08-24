import { supabase } from '@/integrations/supabase/client';
import { jobRowMatchesCustomer, phoneVariants } from '@/lib/customerCardMatch';
import {
  ID_PREFIX,
  isInstallationCustomer,
  isMalfunctionCustomer,
  isOngoingCustomer,
  makeInstallationJobId,
  makeMalfunctionJobId,
  makeOngoingJobId,
  parseDbCustomerId,
} from '@/lib/idConventions';
import { mapCompletionStatus } from '@/lib/jobMappers';
import { CompletionStatus, Customer, JobType } from '@/types';
import { useCallback, useEffect, useState } from 'react';

/**
 * Everything that ever happened at one customer, across all four job tables.
 *
 * Deliberately modelled on `useCompletedDayRecords` — same reasoning, different axis
 * (one customer instead of one day) — and it inherits that hook's two load-bearing
 * properties:
 *
 *  1. It reads ARCHIVED rows too. Closing a call ("סגור קריאה") flips the source row to
 *     status='archived' and every normal loader filters those out, so building this from
 *     `jobs`/`useJobsContext` would hide exactly the finished visits we want to show.
 *  2. Records are SELF-CONTAINED. A closed job's derived customer is gone from
 *     `customersList`, so each visit carries its own display fields.
 *
 * This is also what makes the history retroactive: it reports years of visits that
 * happened long before the activity_logs table existed.
 */
export interface CustomerVisit {
  /** Board job id — stable, and dedupes a row reached through two different filters. */
  jobKey: string;
  type: JobType;
  /** YYYY-MM-DD. Scheduled date where there is one, else the row's own natural date. */
  date: string;
  technicianId: string | null;
  /** null = the visit is on the books but no outcome was reported. */
  completionStatus: CompletionStatus | null;
  completionNotes: string;
  /** What the visit was for. */
  description: string;
  location: string;
  city: string;
  /** The call was closed. The visit still counts — that is the whole point. */
  archived: boolean;
}

export type JobRowShape = {
  id: string;
  customer_id?: string | null;
  customer_name?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  location?: string | null;
  notes?: string | null;
  status?: string | null;
  technician_id?: string | null;
  scheduled_date?: string | null;
  completion_status?: string | null;
  completion_notes?: string | null;
  created_at?: string | null;
  // Per-table extras.
  description?: string | null;
  malfunction_date?: string | null;
  product_type?: string | null;
  installation_date?: string | null;
  task_description?: string | null;
  service_date?: string | null;
  job_key?: string | null;
};

/** The four row sets, already fetched. Kept separate because each maps differently. */
export type CustomerVisitRows = {
  malfunctions: JobRowShape[];
  installations: JobRowShape[];
  ongoing: JobRowShape[];
  filters: JobRowShape[];
};

const MALF_COLUMNS =
  'id,customer_id,customer_name,phone,address,city,description,notes,status,technician_id,scheduled_date,malfunction_date,completion_status,completion_notes,created_at';
const INST_COLUMNS =
  'id,customer_id,customer_name,phone,address,city,product_type,notes,status,technician_id,scheduled_date,installation_date,completion_status,completion_notes,created_at';
const ONGOING_COLUMNS =
  'id,customer_id,customer_name,phone,task_description,notes,location,address,city,status,technician_id,scheduled_date,service_date,completion_status,completion_notes,created_at';
const FILTER_COLUMNS =
  'id,job_key,customer_id,location,city,notes,status,technician_id,scheduled_date,completion_status,completion_notes,created_at';

const day = (...candidates: (string | null | undefined)[]) => {
  for (const c of candidates) if (c) return c.slice(0, 10);
  return '';
};

function toVisit(
  row: JobRowShape,
  jobKey: string,
  type: JobType,
  date: string,
  description: string,
): CustomerVisit {
  return {
    jobKey,
    type,
    date,
    technicianId: row.technician_id ?? null,
    completionStatus: mapCompletionStatus(row.completion_status) ?? null,
    completionNotes: row.completion_notes || '',
    description: description.trim(),
    location: row.address || row.location || '',
    city: row.city || '',
    archived: row.status === 'archived',
  };
}

/** Rows the customer_id filter found are trusted; the rest must survive phone/name matching. */
function keepMatching(
  rows: JobRowShape[],
  customer: Pick<Customer, 'name' | 'phone'>,
  uuid: string | null,
): JobRowShape[] {
  return rows.filter(
    (r) => (uuid && r.customer_id === uuid) || jobRowMatchesCustomer(r, customer),
  );
}

/**
 * Map the four fetched row sets into one newest-first visit list.
 *
 * Pure, and exported for testing — the hook around it only does I/O.
 */
export function buildCustomerVisits(
  rows: CustomerVisitRows,
  customer: Pick<Customer, 'name' | 'phone'>,
  uuid: string | null,
): CustomerVisit[] {
  const out: CustomerVisit[] = [];

  keepMatching(rows.malfunctions, customer, uuid).forEach((r) =>
    out.push(
      toVisit(
        r,
        makeMalfunctionJobId(r.id),
        'malfunction',
        day(r.scheduled_date, r.malfunction_date, r.created_at),
        r.description || r.notes || 'תקלה',
      ),
    ),
  );

  keepMatching(rows.installations, customer, uuid).forEach((r) =>
    out.push(
      toVisit(
        r,
        makeInstallationJobId(r.id),
        'installation',
        day(r.scheduled_date, r.installation_date, r.created_at),
        r.product_type || r.notes || 'התקנה',
      ),
    ),
  );

  // Reached only via customer_id / the row's own id, so no phone re-filter: a calendar
  // row's phone column is usually empty and would drop a genuine match.
  rows.ongoing.forEach((r) =>
    out.push(
      toVisit(
        r,
        makeOngoingJobId(r.id),
        'filter_replacement',
        day(r.scheduled_date, r.service_date, r.created_at),
        r.task_description || r.notes || 'שירות שוטף',
      ),
    ),
  );

  rows.filters.forEach((r) =>
    out.push(
      toVisit(
        // The board id lives in job_key on this table, not in id.
        { ...r, address: r.location },
        r.job_key || r.id,
        'filter_replacement',
        day(r.scheduled_date, r.created_at),
        r.notes || 'החלפת פילטר',
      ),
    ),
  );

  const deduped = new Map<string, CustomerVisit>();
  out.forEach((v) => deduped.set(v.jobKey, v));

  return [...deduped.values()].sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * A customer's full visit history, newest first.
 *
 * Loads when `customer` is non-null, so callers can pass null while a dialog is closed
 * and pay nothing.
 */
export function useCustomerVisits(customer: Customer | null) {
  const [visits, setVisits] = useState<CustomerVisit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customerId = customer?.id ?? null;
  const customerName = customer?.name ?? '';
  const customerPhone = customer?.phone ?? '';

  const load = useCallback(async (): Promise<CustomerVisit[]> => {
    if (!customerId) return [];

    const uuid = parseDbCustomerId(customerId);
    const match = { name: customerName, phone: customerPhone };
    const variants = phoneVariants(customerPhone);

    // Malfunction/installation rows have no customer_id until the backfill runs
    // (scripts/backfill_job_customer_ids.mjs), so each table is probed three ways and
    // the union is re-filtered by `buildCustomerVisits`. Separate queries rather than one
    // PostgREST `or=(…)` because names and phones are free text — quoting them into a
    // filter string is where that syntax goes wrong.
    const probes = (table: 'malfunctions' | 'installations', columns: string) => {
      const base = () => supabase.from(table).select(columns);
      const out = [];
      if (uuid) out.push(base().eq('customer_id', uuid));
      if (variants.length) out.push(base().in('phone', variants));
      if (customerName.trim()) out.push(base().eq('customer_name', customerName.trim()));
      // A job-derived customer id points straight at the row it was synthesised from.
      if (table === 'malfunctions' && isMalfunctionCustomer(customerId)) {
        out.push(base().eq('id', customerId.slice(ID_PREFIX.malfunctionCustomer.length)));
      }
      if (table === 'installations' && isInstallationCustomer(customerId)) {
        out.push(base().eq('id', customerId.slice(ID_PREFIX.installationCustomer.length)));
      }
      return out;
    };

    const ongoingProbes = () => {
      const base = () => supabase.from('ongoing_services').select(ONGOING_COLUMNS);
      const out = [];
      // NOTE: ongoing_services.customer_id is TEXT holding a raw uuid string, not a uuid
      // column (see the RLS note in src/lib/dbJobSync.ts) — the equality still works.
      if (uuid) out.push(base().eq('customer_id', uuid));
      if (isOngoingCustomer(customerId)) {
        out.push(base().eq('id', customerId.slice(ID_PREFIX.ongoingCustomer.length)));
      }
      return out;
    };

    const groups = [
      probes('malfunctions', MALF_COLUMNS),
      probes('installations', INST_COLUMNS),
      ongoingProbes(),
      uuid
        ? [supabase.from('scheduled_filter_services').select(FILTER_COLUMNS).eq('customer_id', uuid)]
        : [],
    ];

    const results = await Promise.all(groups.flat());

    // Degrade probe-by-probe instead of all-or-nothing. Each table is queried several
    // ways and only some can fail — most importantly, the customer_id probes error until
    // the 20260824120100 migration adds that column to malfunctions/installations. One
    // failing probe must not blank out a customer's whole history when the phone/name
    // probes beside it succeeded.
    const failures = results.filter((r) => r.error);
    if (failures.length) {
      console.error(
        'Some customer-visit queries failed; showing what loaded:',
        failures.map((f) => f.error),
      );
    }
    // Only a total failure is worth telling the manager about.
    if (failures.length === results.length && results.length > 0) {
      throw failures[0].error;
    }

    // Re-split the flat result list back into its four groups, deduping by row id
    // (a row can be found by more than one probe).
    const rowsFor = (index: number): JobRowShape[] => {
      let start = 0;
      for (let i = 0; i < index; i += 1) start += groups[i].length;
      const merged = new Map<string, JobRowShape>();
      results.slice(start, start + groups[index].length).forEach((r) => {
        if (r.error) return;
        ((r.data as unknown as JobRowShape[] | null) ?? []).forEach((row) =>
          merged.set(row.id, row),
        );
      });
      return [...merged.values()];
    };

    return buildCustomerVisits(
      {
        malfunctions: rowsFor(0),
        installations: rowsFor(1),
        ongoing: rowsFor(2),
        filters: rowsFor(3),
      },
      match,
      uuid,
    );
  }, [customerId, customerName, customerPhone]);

  useEffect(() => {
    if (!customerId) {
      setVisits([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    void load()
      .then((rows) => {
        if (!cancelled) setVisits(rows);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error('Error loading customer visits:', e);
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [customerId, load]);

  return { visits, loading, error };
}
