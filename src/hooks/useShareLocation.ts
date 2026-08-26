import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SentFix, shouldSendLocation } from '@/lib/liveLocation';

const STORAGE_KEY = 'tal-hermon:share-location';

export interface ShareLocationApi {
  sharing: boolean;
  error: string | null;
  lastSentAt: number | null;
  toggle: (next: boolean) => void;
}

/**
 * Technician side of the live-location feature: publishes this technician's own position to
 * `technician_locations` while they have it switched on (see supabase/migrations/20260826120000_add_technician_locations.sql).
 *
 * Sharing is strictly opt-in and never starts on its own. Turning it off deletes the row, so the
 * manager sees "not sharing" rather than a position frozen wherever the technician happened to be.
 *
 * @param technicianId 't1' / 't2' from the signed-in profile, or null if none is mapped.
 * @param enabled      false for managers — they consume locations, they do not publish one.
 */
export function useShareLocation(technicianId: string | null, enabled: boolean): ShareLocationApi {
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastFixRef = useRef<SentFix | null>(null);
  // watchPosition's callback closes over whatever it captured at registration time, so the
  // technician id has to be readable through a ref rather than the closure.
  const technicianIdRef = useRef(technicianId);
  technicianIdRef.current = technicianId;
  const sharingRef = useRef(false);
  sharingRef.current = sharing;

  const clearWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    lastFixRef.current = null;
  }, []);

  const removeRow = useCallback((techId: string) => {
    supabase
      .from('technician_locations')
      .delete()
      .eq('technician_id', techId)
      .then(({ error: deleteError }) => {
        if (deleteError) console.error('Failed to clear shared location:', deleteError);
      });
  }, []);

  const startWatch = useCallback(() => {
    if (watchIdRef.current !== null) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('הדפדפן אינו תומך בשיתוף מיקום');
      setSharing(false);
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const techId = technicianIdRef.current;
        if (!techId) return;

        const now = Date.now();
        const next = { lat: position.coords.latitude, lng: position.coords.longitude };
        if (!shouldSendLocation(lastFixRef.current, next, now)) return;
        lastFixRef.current = { ...next, at: now };

        setError(null);
        supabase
          .from('technician_locations')
          .upsert(
            {
              technician_id: techId,
              lat: next.lat,
              lng: next.lng,
              accuracy: position.coords.accuracy ?? null,
              updated_at: new Date(now).toISOString(),
            },
            { onConflict: 'technician_id' },
          )
          .then(({ error: upsertError }) => {
            if (upsertError) {
              console.error('Failed to publish location:', upsertError);
              setError('שגיאה בשליחת המיקום');
              return;
            }
            setLastSentAt(now);
          });
      },
      (geoError) => {
        // A silent failure here is indistinguishable from "the manager just can't see me",
        // so every branch says what actually went wrong and what to do about it.
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setError('הגישה למיקום נחסמה. אפשר מיקום עבור האתר בהגדרות הדפדפן');
          window.localStorage.removeItem(STORAGE_KEY);
          setSharing(false);
          clearWatch();
          return;
        }
        setError(
          geoError.code === geoError.TIMEOUT
            ? 'לא הצלחנו לאתר את המיקום. בדוק שה-GPS פעיל'
            : 'המיקום אינו זמין כרגע',
        );
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
    );
  }, [clearWatch]);

  const toggle = useCallback(
    (next: boolean) => {
      if (!enabled || !technicianId) return;
      setError(null);

      if (next) {
        window.localStorage.setItem(STORAGE_KEY, '1');
        setSharing(true);
        startWatch();
        return;
      }

      window.localStorage.removeItem(STORAGE_KEY);
      setSharing(false);
      setLastSentAt(null);
      clearWatch();
      removeRow(technicianId);
    },
    [enabled, technicianId, startWatch, clearWatch, removeRow],
  );

  // Resume after a refresh so a mid-day reload doesn't silently stop sharing — but only when the
  // permission is already granted, so reopening the app never fires a surprise location prompt.
  useEffect(() => {
    if (!enabled || !technicianId) return;
    if (window.localStorage.getItem(STORAGE_KEY) !== '1') return;

    let cancelled = false;
    const resume = async () => {
      try {
        const status = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
        if (cancelled || status?.state !== 'granted') return;
      } catch {
        // Permissions API unavailable (older Safari): don't guess, wait for a deliberate tap.
        return;
      }
      setSharing(true);
      startWatch();
    };
    void resume();

    return () => {
      cancelled = true;
    };
  }, [enabled, technicianId, startWatch]);

  // Leaving the page stops the watch and clears the row. A hard tab-close cannot flush that
  // delete — the `stale` state on the manager's side is what covers that case.
  useEffect(() => {
    return () => {
      clearWatch();
      const techId = technicianIdRef.current;
      if (sharingRef.current && techId) removeRow(techId);
    };
  }, [clearWatch, removeRow]);

  return { sharing, error, lastSentAt, toggle };
}
