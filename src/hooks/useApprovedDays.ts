import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type ApprovedDayRow = {
  id: string;
  technician_id: string;
  service_date: string;
  approved_at: string;
  locked: boolean;
};

// Per-day schedule approval, persisted in approved_schedule_days (see
// 20260624120000_add_approved_schedule_days). Approvals are keyed by
// `${technician_id}|${service_date}` so the board can look one up cheaply.
export const approvedDayKey = (technicianId: string, dateStr: string) =>
  `${technicianId}|${dateStr}`;

export function useApprovedDays() {
  const [approvedDayKeys, setApprovedDayKeys] = useState<Set<string>>(new Set());
  const [lockedDayKeys, setLockedDayKeys] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('approved_schedule_days')
      .select('id,technician_id,service_date,approved_at,locked');

    if (error) {
      console.error('Error fetching approved schedule days:', error);
      setLoaded(true);
      return;
    }

    const rows = (data as ApprovedDayRow[] | null) ?? [];
    setApprovedDayKeys(
      new Set(rows.map((r) => approvedDayKey(r.technician_id, r.service_date))),
    );
    setLockedDayKeys(
      new Set(
        rows
          .filter((r) => r.locked)
          .map((r) => approvedDayKey(r.technician_id, r.service_date)),
      ),
    );
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refresh();
    const channel = supabase
      .channel('approved-schedule-days-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'approved_schedule_days' },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  // Mark a day approved for a technician. Optimistic, then upsert (idempotent on the
  // technician_id+service_date unique constraint).
  const approveDay = useCallback((technicianId: string, dateStr: string) => {
    setApprovedDayKeys((prev) =>
      new Set(prev).add(approvedDayKey(technicianId, dateStr)),
    );
    supabase
      .from('approved_schedule_days')
      .upsert(
        { technician_id: technicianId, service_date: dateStr },
        { onConflict: 'technician_id,service_date' },
      )
      .then(({ error }) => {
        if (error) console.error('Failed to persist approved day:', error);
      });
  }, []);

  // Revoke a day's approval. Deleting the row also clears any lock on it.
  const unapproveDay = useCallback((technicianId: string, dateStr: string) => {
    const key = approvedDayKey(technicianId, dateStr);
    setApprovedDayKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setLockedDayKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    supabase
      .from('approved_schedule_days')
      .delete()
      .eq('technician_id', technicianId)
      .eq('service_date', dateStr)
      .then(({ error }) => {
        if (error) console.error('Failed to remove approved day:', error);
      });
  }, []);

  // Lock/unlock an already-approved day so the technician can no longer edit
  // their completion report for it. The row always exists by the time this is
  // called, since a day must be approved (and thus have a row) before it can
  // be locked. Real enforcement lives in Supabase RLS triggers, not here.
  const setDayLocked = useCallback(
    (technicianId: string, dateStr: string, locked: boolean) => {
      const key = approvedDayKey(technicianId, dateStr);
      setLockedDayKeys((prev) => {
        const next = new Set(prev);
        if (locked) next.add(key);
        else next.delete(key);
        return next;
      });
      supabase
        .from('approved_schedule_days')
        .update({ locked })
        .eq('technician_id', technicianId)
        .eq('service_date', dateStr)
        .then(({ error }) => {
          if (error) console.error('Failed to persist day lock:', error);
        });
    },
    [],
  );

  const lockDay = useCallback(
    (technicianId: string, dateStr: string) =>
      setDayLocked(technicianId, dateStr, true),
    [setDayLocked],
  );
  const unlockDay = useCallback(
    (technicianId: string, dateStr: string) =>
      setDayLocked(technicianId, dateStr, false),
    [setDayLocked],
  );

  return {
    approvedDayKeys,
    lockedDayKeys,
    approvedDaysLoaded: loaded,
    approveDay,
    unapproveDay,
    lockDay,
    unlockDay,
  };
}
