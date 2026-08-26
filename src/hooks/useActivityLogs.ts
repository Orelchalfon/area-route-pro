import { useAuth } from '@/contexts/AuthContext';
import { technicians } from '@/data/technicians';
import { supabase } from '@/integrations/supabase/client';
import { parseDbCustomerId } from '@/lib/idConventions';
import { ActivityLog } from '@/types';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Activity-log subsystem. Backed by the `activity_logs` table.
 *
 * This used to be a plain `useState`, which meant every logged action — every
 * assignment, completion report, customer edit — was gone on the next refresh and the
 * "היסטוריה" dialog was permanently empty. The table is append-only (no UPDATE/DELETE
 * policy), so a visit stays recorded even after the job row it came from is
 * rescheduled, reset or archived.
 *
 * Two read paths, on purpose:
 *  - `activityLogs` is a bounded RECENT window, kept resident because the admin
 *    dashboard's daily summary filters it by date on every render.
 *  - `fetchCustomerLogs` pulls one customer's FULL history on demand, so opening the
 *    dialog never depends on that window reaching far enough back.
 */

// The resident window. Wide enough for the daily summary (which only ever looks at one
// day) with room to spare, small enough that it is never a large download.
const RECENT_WINDOW_DAYS = 120;
const RECENT_LIMIT = 2000;
// Per-customer history cap. A customer with more visits than this is not a real case;
// the cap exists so one pathological row set can't stall the dialog.
const CUSTOMER_LOG_LIMIT = 500;

type ActivityLogRow = {
  id: string;
  customer_key: string;
  customer_id: string | null;
  job_key: string | null;
  action: string;
  details: string;
  actor_name: string | null;
  created_at: string;
};

function rowToLog(row: ActivityLogRow): ActivityLog {
  return {
    id: row.id,
    // The board-side id is the one every caller passes and compares against, so it is
    // what we hand back — not the uuid.
    customerId: row.customer_key,
    jobId: row.job_key ?? undefined,
    action: row.action,
    details: row.details,
    timestamp: row.created_at,
    actorName: row.actor_name ?? undefined,
  };
}

const SELECT_COLUMNS =
  'id,customer_key,customer_id,job_key,action,details,actor_name,created_at';

export function useActivityLogs() {
  const { user, technicianId } = useAuth();
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Held in a ref so `addLog` can stay referentially stable — several callers depend on
  // that (it sits in useCallback dependency arrays across useJobs).
  const actorRef = useRef<{ id: string | null; name: string | null }>({ id: null, name: null });
  actorRef.current = {
    id: user?.id ?? null,
    // Prefer the technician's Hebrew name; the UI that renders this is Hebrew and an
    // email address reads as noise there.
    name:
      technicians.find((t) => t.id === technicianId)?.name ??
      user?.email ??
      null,
  };

  // Hydrate the recent window once the user is known. Keyed on the user id so a sign-in
  // (or an account switch) refills it rather than leaving the dashboard empty.
  useEffect(() => {
    if (!user?.id) {
      setActivityLogs([]);
      return;
    }
    let cancelled = false;
    const since = new Date(Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

    void (async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(SELECT_COLUMNS)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(RECENT_LIMIT);

      if (cancelled) return;
      if (error) {
        console.error('Error loading activity logs:', error);
        return;
      }
      setActivityLogs(((data as ActivityLogRow[] | null) ?? []).map(rowToLog));
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const addLog = useCallback(
    (customerId: string, action: string, details: string, jobId?: string) => {
      const actor = actorRef.current;
      // Optimistic id, replaced with the server's once the insert lands. Kept in the
      // original `log-` shape so anything keying on it behaves as before.
      const optimisticId = `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const log: ActivityLog = {
        id: optimisticId,
        customerId,
        jobId,
        action,
        details,
        timestamp: new Date().toISOString(),
        actorName: actor.name ?? undefined,
      };
      setActivityLogs((prev) => [log, ...prev]);

      void supabase
        .from('activity_logs')
        .insert({
          customer_key: customerId,
          // Only real `customers` rows get the uuid. Job-derived and calendar-derived
          // customers (db-malf-cust-*, db-ongoing-cust-*, ics-c*) have no row, which is
          // exactly why customer_key is the primary key for lookups.
          customer_id: parseDbCustomerId(customerId),
          job_key: jobId ?? null,
          action,
          details,
          actor_id: actor.id,
          actor_name: actor.name,
        })
        .select('id')
        .single()
        .then(({ data, error }) => {
          if (error) {
            // Leave the optimistic entry on screen — it is still true that the action
            // happened; only its durability is in doubt. RLS is the usual culprit here.
            console.error('Failed to persist activity log:', error);
            return;
          }
          if (!data?.id) return;
          setActivityLogs((prev) =>
            prev.map((l) => (l.id === optimisticId ? { ...l, id: data.id } : l)),
          );
        });
    },
    [],
  );

  /**
   * One customer's full logged history, newest first.
   *
   * Matches on the board id AND on the resolved uuid: entries written against a
   * job-derived key (`db-malf-cust-…`) carry no uuid, while older entries for the same
   * person may carry the uuid under a different key.
   */
  const fetchCustomerLogs = useCallback(async (customerId: string): Promise<ActivityLog[]> => {
    const uuid = parseDbCustomerId(customerId);
    const query = supabase
      .from('activity_logs')
      .select(SELECT_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(CUSTOMER_LOG_LIMIT);

    const { data, error } = await (uuid
      ? query.or(`customer_key.eq.${customerId},customer_id.eq.${uuid}`)
      : query.eq('customer_key', customerId));

    if (error) {
      console.error('Error loading customer activity logs:', error);
      return [];
    }

    // `.or` can return the same row twice when both sides match.
    const seen = new Set<string>();
    return ((data as ActivityLogRow[] | null) ?? [])
      .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
      .map(rowToLog);
  }, []);

  return { activityLogs, addLog, fetchCustomerLogs };
}
