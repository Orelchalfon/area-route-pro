import { supabase } from '@/integrations/supabase/client';
import { mapCompletionStatus } from '@/lib/jobMappers';
import {
  makeInstallationJobId,
  makeMalfunctionJobId,
  makeOngoingJobId,
} from '@/lib/idConventions';
import { CompletionStatus, JobType } from '@/types';
import { useCallback, useEffect, useState } from 'react';

/**
 * A finished visit, kept purely as documentation for the monthly board.
 *
 * Self-contained on purpose: once a job is closed ("סגור קריאה") its source row is
 * flipped to `status='archived'`, and every normal loader filters archived rows out —
 * so neither the job nor its derived customer is in `jobs`/`customersList` any more.
 * The record therefore carries its own display fields instead of resolving them.
 */
export interface DayDocumentationRecord {
  /** Board job id, so a record can be deduped against a job still on the board. */
  id: string;
  type: JobType;
  dateStr: string;
  technicianId: string | null;
  /**
   * Board customer id, when the row carries one. Synthetic filter services store only
   * this — their own columns hold no name — so the board resolves it against
   * `customersList` (the customers table is never archived) before rendering.
   */
  customerId: string | null;
  customerName: string;
  location: string;
  city: string;
  completionStatus: CompletionStatus;
  completionNotes: string;
  scheduledTime: string | null;
}

/**
 * The documentation to draw on one day cell: this technician's finished visits there,
 * minus anything still rendered as a live job.
 *
 * The dedupe is against what the board actually DRAWS, not against `jobs`: a completed
 * job that hasn't been closed yet appears in both, and synthetic `filter-*` ids are
 * regenerated per render, so an archived filter record can collide with a freshly
 * generated open job for the same customer and month.
 */
export function documentationForDay(
  records: DayDocumentationRecord[],
  dateStr: string,
  technicianId: string,
  liveJobIds: Iterable<string>,
): DayDocumentationRecord[] {
  const live = liveJobIds instanceof Set ? liveJobIds : new Set(liveJobIds);
  return records.filter(
    (r) =>
      r.dateStr === dateStr &&
      r.technicianId === technicianId &&
      !live.has(r.id),
  );
}

type CompletedRow = {
  id: string;
  customer_name?: string | null;
  address?: string | null;
  city?: string | null;
  location?: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  technician_id: string | null;
  completion_status: string | null;
  completion_notes: string | null;
};

function toRecord(
  row: CompletedRow,
  id: string,
  type: JobType,
  customerName: string,
  customerId: string | null = null,
): DayDocumentationRecord | null {
  const completionStatus = mapCompletionStatus(row.completion_status);
  if (!completionStatus || !row.scheduled_date) return null;
  return {
    id,
    type,
    dateStr: row.scheduled_date.slice(0, 10),
    technicianId: row.technician_id,
    customerId,
    customerName: customerName || 'ללא שם',
    location: row.address || row.location || '',
    city: row.city || '',
    completionStatus,
    completionNotes: row.completion_notes || '',
    scheduledTime: row.scheduled_time,
  };
}

/**
 * Completed visits in a date range, INCLUDING archived ones.
 *
 * Deliberately separate from `useJobs`: feeding archived rows back into the shared
 * `jobs` array would resurrect closed work in the unassigned pools, the picker and the
 * board counters. This is a read-only side channel that only the board renders.
 */
export function useCompletedDayRecords(rangeStart: string, rangeEnd: string) {
  const [records, setRecords] = useState<DayDocumentationRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!rangeStart || !rangeEnd) return;

    const completedIn = (table: 'malfunctions' | 'installations' | 'ongoing_services' | 'scheduled_filter_services', columns: string) =>
      supabase
        .from(table)
        .select(columns)
        .not('completion_status', 'is', null)
        .gte('scheduled_date', rangeStart)
        .lte('scheduled_date', rangeEnd);

    const SHARED = 'scheduled_date,scheduled_time,technician_id,completion_status,completion_notes';

    const [malf, inst, ongoing, filters] = await Promise.all([
      completedIn('malfunctions', `id,customer_name,address,city,${SHARED}`),
      completedIn('installations', `id,customer_name,address,city,${SHARED}`),
      completedIn(
        'ongoing_services',
        `id,customer_name,task_description,address,location,city,${SHARED}`,
      ),
      completedIn(
        'scheduled_filter_services',
        `id,job_key,customer_id,location,city,${SHARED}`,
      ),
    ]);

    const error = malf.error || inst.error || ongoing.error || filters.error;
    if (error) {
      console.error('Error fetching completed day records:', error);
      setLoaded(true);
      return;
    }

    const next: DayDocumentationRecord[] = [];
    const push = (record: DayDocumentationRecord | null) => {
      if (record) next.push(record);
    };

    ((malf.data as CompletedRow[] | null) ?? []).forEach((row) =>
      push(toRecord(row, makeMalfunctionJobId(row.id), 'malfunction', row.customer_name || '')),
    );
    ((inst.data as CompletedRow[] | null) ?? []).forEach((row) =>
      push(toRecord(row, makeInstallationJobId(row.id), 'installation', row.customer_name || '')),
    );
    (
      (ongoing.data as (CompletedRow & { task_description?: string | null })[] | null) ?? []
    ).forEach((row) =>
      push(
        toRecord(
          row,
          makeOngoingJobId(row.id),
          'filter_replacement',
          // Calendar-derived rows have no customer_name — their task description
          // embeds the client, which is what the rest of the app falls back to.
          row.customer_name || row.task_description || '',
        ),
      ),
    );
    (
      (filters.data as
        | (CompletedRow & { job_key: string; customer_id: string | null })[]
        | null) ?? []
    ).forEach((row) =>
      push(
        toRecord(
          // The synthetic board id lives in job_key, not id.
          { ...row, address: row.location },
          row.job_key,
          'filter_replacement',
          // No name on this table — resolved from customer_id by the caller.
          '',
          row.customer_id,
        ),
      ),
    );

    setRecords(next);
    setLoaded(true);
  }, [rangeEnd, rangeStart]);

  useEffect(() => {
    void refresh();
    const channel = supabase
      .channel(`completed-day-records-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'malfunctions' }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'installations' }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ongoing_services' }, () => void refresh())
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

  return { records, loaded, refresh };
}
