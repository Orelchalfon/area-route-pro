/**
 * Rules for the opt-in live technician location (see sql/technician_locations.sql).
 * Kept pure so they can be unit-tested without a map, a browser or Supabase — same reasoning
 * as `arrivalStateFor` in useArrivalConfirmations.ts.
 */

/** A position is "fresh" for this long before the manager should stop trusting it. */
export const LIVE_LOCATION_FRESH_MS = 2 * 60 * 1000;

/** Minimum gap between writes when the technician is standing still. */
export const LOCATION_SEND_INTERVAL_MS = 30 * 1000;

/** Move at least this far and the position is sent immediately, ignoring the interval. */
export const LOCATION_SEND_DISTANCE_M = 50;

/**
 * - `off`   — the technician is not sharing (no row at all).
 * - `live`  — the last fix is recent enough to act on.
 * - `stale` — sharing is on but the fix has aged. The pin is still shown, dimmed: a ten-minute-old
 *             position is genuinely useful, and hiding it would be indistinguishable from `off`.
 */
export type LiveLocationState = 'off' | 'live' | 'stale';

export function liveLocationStateFor(
  updatedAt: string | null | undefined,
  now: number,
): LiveLocationState {
  if (!updatedAt) return 'off';
  const at = new Date(updatedAt).getTime();
  if (Number.isNaN(at)) return 'off';
  return now - at <= LIVE_LOCATION_FRESH_MS ? 'live' : 'stale';
}

/** Whole minutes since the fix, floored, never negative (clock skew between devices is normal). */
export function minutesSince(updatedAt: string | null | undefined, now: number): number {
  if (!updatedAt) return 0;
  const at = new Date(updatedAt).getTime();
  if (Number.isNaN(at)) return 0;
  return Math.max(0, Math.floor((now - at) / 60000));
}

export interface SentFix {
  lat: number;
  lng: number;
  at: number;
}

/**
 * Throttle: watchPosition fires far more often than the manager needs. Write on the first fix,
 * once every 30s while parked, or immediately on a real move — so a driving technician stays
 * responsive on the map without the parked one writing a row every second.
 */
export function shouldSendLocation(
  last: SentFix | null,
  next: { lat: number; lng: number },
  now: number,
): boolean {
  if (!last) return true;
  if (now - last.at >= LOCATION_SEND_INTERVAL_MS) return true;
  return distanceMeters(last, next) >= LOCATION_SEND_DISTANCE_M;
}

/** Haversine distance in metres. */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
