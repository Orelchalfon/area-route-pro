import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Job } from '@/types';

type ArrivalConfirmationRow = {
  id: string;
  job_key: string;
  service_date: string;
  scheduled_time: string;
  technician_id: string | null;
  confirmed_at: string;
  confirmed_by: string;
};

export type ArrivalConfirmation = {
  serviceDate: string;
  scheduledTime: string;
  confirmedAt: string;
  confirmedBy: string;
};

/**
 * - `none`      — nobody has recorded a confirmation for this job.
 * - `confirmed` — the customer agreed to exactly the date and time the job currently holds.
 * - `stale`     — a confirmation exists, but the appointment has since moved. The customer
 *                 agreed to a slot that is no longer the plan, so it must not count.
 */
export type ArrivalState = 'none' | 'confirmed' | 'stale';

/**
 * The reset-on-reschedule rule, kept pure so it can be unit-tested: a confirmation counts
 * only for the exact slot the customer was told. Move the day or the hour and it reverts to
 * needing a fresh confirmation.
 */
export function arrivalStateFor(
  job: Pick<Job, 'scheduledDate' | 'scheduledTime'>,
  confirmation: ArrivalConfirmation | undefined,
): ArrivalState {
  if (!confirmation) return 'none';
  const sameDate = (job.scheduledDate || '') === confirmation.serviceDate;
  const sameTime = (job.scheduledTime || '') === confirmation.scheduledTime;
  return sameDate && sameTime ? 'confirmed' : 'stale';
}

// Per-job record that the customer agreed to the technician's visit, persisted in
// customer_arrival_confirmations (see sql/customer_arrival_confirmations.sql). Keyed by the
// app-level job id, because synthetic filter jobs have no DB row of their own.
export function useArrivalConfirmations() {
  const [arrivalConfirmations, setArrivalConfirmations] = useState<
    Map<string, ArrivalConfirmation>
  >(() => new Map());
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('customer_arrival_confirmations')
      .select('id,job_key,service_date,scheduled_time,technician_id,confirmed_at,confirmed_by');

    if (error) {
      console.error('Error fetching arrival confirmations:', error);
      setLoaded(true);
      return;
    }

    const rows = (data as ArrivalConfirmationRow[] | null) ?? [];
    setArrivalConfirmations(
      new Map(
        rows.map((r) => [
          r.job_key,
          {
            serviceDate: r.service_date,
            scheduledTime: r.scheduled_time,
            confirmedAt: r.confirmed_at,
            confirmedBy: r.confirmed_by,
          },
        ]),
      ),
    );
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refresh();
    const channel = supabase
      .channel('customer-arrival-confirmations-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customer_arrival_confirmations' },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  /**
   * Record that the customer agreed to this visit. Optimistic, then upsert (idempotent on the
   * job_key unique constraint, so re-confirming a moved appointment just overwrites the slot).
   *
   * The slot is passed IN rather than read off the job on purpose: in the approval dialog the
   * job object carries the *persisted* time while the list shows position-derived times, and the
   * two diverge whenever the route has been reordered but not yet saved. Callers must pass what
   * the manager is actually looking at, or a confirmation would go stale the moment the order is
   * saved even though nothing changed for the customer.
   */
  const confirmArrival = useCallback(
    (
      jobId: string,
      serviceDate: string,
      scheduledTime: string,
      technicianId?: string,
    ) => {
      const confirmedAt = new Date().toISOString();
      setArrivalConfirmations((prev) =>
        new Map(prev).set(jobId, {
          serviceDate,
          scheduledTime,
          confirmedAt,
          confirmedBy: 'manager',
        }),
      );
      supabase
        .from('customer_arrival_confirmations')
        .upsert(
          {
            job_key: jobId,
            service_date: serviceDate,
            scheduled_time: scheduledTime,
            technician_id: technicianId ?? null,
            confirmed_at: confirmedAt,
            confirmed_by: 'manager',
          },
          { onConflict: 'job_key' },
        )
        .then(({ error }) => {
          if (error) console.error('Failed to persist arrival confirmation:', error);
        });
    },
    [],
  );

  /** Undo a confirmation — the reversible half of the toggle. */
  const unconfirmArrival = useCallback((jobId: string) => {
    setArrivalConfirmations((prev) => {
      const next = new Map(prev);
      next.delete(jobId);
      return next;
    });
    supabase
      .from('customer_arrival_confirmations')
      .delete()
      .eq('job_key', jobId)
      .then(({ error }) => {
        if (error) console.error('Failed to remove arrival confirmation:', error);
      });
  }, []);

  return {
    arrivalConfirmations,
    arrivalConfirmationsLoaded: loaded,
    confirmArrival,
    unconfirmArrival,
  };
}
