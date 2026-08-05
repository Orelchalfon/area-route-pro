import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LiveLocationState, liveLocationStateFor, minutesSince } from '@/lib/liveLocation';

export interface TechnicianLiveLocation {
  lat: number;
  lng: number;
  accuracy: number | null;
  updatedAt: string;
}

export interface TechnicianLocationResult {
  location: TechnicianLiveLocation | null;
  state: LiveLocationState;
  minutesAgo: number;
}

/** How often the "עודכן לפני X דק'" label re-renders without a new row arriving. */
const AGE_TICK_MS = 30_000;

/**
 * Manager side of the live-location feature: watches one technician's row in
 * `technician_locations` (see sql/technician_locations.sql).
 *
 * @param technicianId the technician currently selected on the page.
 * @param enabled      pass `isAdmin` — a technician's client must never open this channel.
 *                     RLS blocks the read anyway; this keeps the query from being issued at all.
 */
export function useTechnicianLocation(
  technicianId: string,
  enabled: boolean,
): TechnicianLocationResult {
  const [location, setLocation] = useState<TechnicianLiveLocation | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    if (!enabled || !technicianId) {
      setLocation(null);
      return;
    }

    const { data, error } = await supabase
      .from('technician_locations')
      .select('technician_id,lat,lng,accuracy,updated_at')
      .eq('technician_id', technicianId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching technician location:', error);
      return;
    }

    setLocation(
      data
        ? {
            lat: data.lat,
            lng: data.lng,
            accuracy: data.accuracy ?? null,
            updatedAt: data.updated_at,
          }
        : null,
    );
  }, [enabled, technicianId]);

  useEffect(() => {
    if (!enabled || !technicianId) {
      setLocation(null);
      return;
    }

    void refresh();
    const channel = supabase
      .channel(`technician-locations-${technicianId}`)
      .on(
        'postgres_changes',
        // Unfiltered, then refetch — the same shape as every other realtime hook here
        // (useArrivalConfirmations.ts). A server-side filter would be tempting with two
        // technicians, but filtered DELETE events only carry replica-identity columns, and a
        // DELETE is exactly the event that must land: it is how "stopped sharing" arrives.
        { event: '*', schema: 'public', table: 'technician_locations' },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, technicianId, refresh]);

  // The freshness label ages on its own: a technician who stops moving stops writing rows, and
  // a timestamp that never re-renders would keep claiming "עודכן לפני 0 דק'" indefinitely.
  useEffect(() => {
    if (!enabled || !location) return;
    const timer = window.setInterval(() => setNow(Date.now()), AGE_TICK_MS);
    return () => window.clearInterval(timer);
  }, [enabled, location]);

  return {
    location,
    state: liveLocationStateFor(location?.updatedAt, now),
    minutesAgo: minutesSince(location?.updatedAt, now),
  };
}
