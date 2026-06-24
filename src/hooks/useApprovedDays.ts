import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type ApprovedDayRow = {
  id: string;
  technician_id: string;
  service_date: string;
  approved_at: string;
};

// Per-day schedule approval, persisted in approved_schedule_days (see
// 20260624120000_add_approved_schedule_days). Approvals are keyed by
// `${technician_id}|${service_date}` so the board can look one up cheaply.
export const approvedDayKey = (technicianId: string, dateStr: string) =>
  `${technicianId}|${dateStr}`;

export function useApprovedDays() {
  const [approvedDayKeys, setApprovedDayKeys] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('approved_schedule_days')
      .select('*');

    if (error) {
      console.error('Error fetching approved schedule days:', error);
      setLoaded(true);
      return;
    }

    const rows = (data as ApprovedDayRow[] | null) ?? [];
    setApprovedDayKeys(
      new Set(rows.map((r) => approvedDayKey(r.technician_id, r.service_date))),
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

  // Revoke a day's approval.
  const unapproveDay = useCallback((technicianId: string, dateStr: string) => {
    setApprovedDayKeys((prev) => {
      const next = new Set(prev);
      next.delete(approvedDayKey(technicianId, dateStr));
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

  return { approvedDayKeys, approvedDaysLoaded: loaded, approveDay, unapproveDay };
}
