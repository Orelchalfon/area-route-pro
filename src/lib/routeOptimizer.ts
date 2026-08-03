// Route ordering for a technician's day.
//
// The route is a round trip: the technician leaves אבני חפץ, visits every stop, and
// drives back. That fixed origin/destination is what makes "the most efficient order"
// a well-defined question at all — without an anchor, any rotation of the tour scores
// the same.
//
// Two strategies, in order:
//   1. Google DirectionsService with `optimizeWaypoints: true` — real road distances.
//   2. A local nearest-neighbour + 2-opt pass over straight-line distance — used
//      whenever the Maps API is unavailable or returns anything but OK (quota,
//      MAX_WAYPOINTS_EXCEEDED, ...). Free, instant, deterministic, and good enough for
//      the ~20 clustered stops a day actually holds.
//
// Both return the same thing: `stops` indices in visiting order.

export interface LatLng {
  lat: number;
  lng: number;
}

// אבני חפץ — the technicians' base. Same coordinates as CITY_COORDS['אבני חפץ']
// in customerCoords.ts; kept here so the optimizer has no dependency on that table.
export const TECHNICIAN_BASE: LatLng = { lat: 32.274, lng: 35.143 };

// Above this, skip the Directions attempt outright — it would only fail with
// MAX_WAYPOINTS_EXCEEDED and cost a round trip. This is a shortcut, not a correctness
// gate: the status handling below is what actually keeps us safe.
const MAX_OPTIMIZABLE_WAYPOINTS = 23;

const MAX_TWO_OPT_PASSES = 200;
const EARTH_RADIUS_KM = 6371;

const toRadians = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Total length of origin → stops[order] → destination. */
export function tourLengthKm(
  stops: LatLng[],
  order: number[],
  origin: LatLng,
  destination: LatLng,
): number {
  if (order.length === 0) return haversineKm(origin, destination);
  let total = haversineKm(origin, stops[order[0]]);
  for (let i = 0; i < order.length - 1; i++) {
    total += haversineKm(stops[order[i]], stops[order[i + 1]]);
  }
  return total + haversineKm(stops[order[order.length - 1]], destination);
}

/** True when `order` is a permutation of 0..length-1 — the contract every caller relies on. */
function isPermutation(order: unknown, length: number): order is number[] {
  if (!Array.isArray(order) || order.length !== length) return false;
  const seen = new Set<number>();
  for (const value of order) {
    if (!Number.isInteger(value) || value < 0 || value >= length) return false;
    if (seen.has(value)) return false;
    seen.add(value);
  }
  return true;
}

/**
 * Nearest-neighbour from the origin, then 2-opt until no reversal improves the tour.
 * Synchronous and dependency-free — this is the fallback, and also the only path
 * exercised by tests (jsdom has no `google`).
 */
export function optimizeStopOrderLocal(
  stops: LatLng[],
  origin: LatLng = TECHNICIAN_BASE,
  destination: LatLng = origin,
): number[] {
  if (stops.length < 2) return stops.map((_, i) => i);

  // --- Nearest neighbour ---
  const remaining = stops.map((_, i) => i);
  const order: number[] = [];
  let current = origin;
  while (remaining.length > 0) {
    let bestAt = 0;
    let bestDistance = Infinity;
    remaining.forEach((stopIndex, at) => {
      const distance = haversineKm(current, stops[stopIndex]);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestAt = at;
      }
    });
    const [chosen] = remaining.splice(bestAt, 1);
    order.push(chosen);
    current = stops[chosen];
  }

  // --- 2-opt: reverse any segment that shortens the round trip ---
  let bestLength = tourLengthKm(stops, order, origin, destination);
  for (let pass = 0; pass < MAX_TWO_OPT_PASSES; pass++) {
    let improved = false;
    for (let i = 0; i < order.length - 1; i++) {
      for (let j = i + 1; j < order.length; j++) {
        const candidate = [
          ...order.slice(0, i),
          ...order.slice(i, j + 1).reverse(),
          ...order.slice(j + 1),
        ];
        const length = tourLengthKm(stops, candidate, origin, destination);
        // Guard against float noise re-triggering the same swap forever.
        if (length < bestLength - 1e-9) {
          order.splice(0, order.length, ...candidate);
          bestLength = length;
          improved = true;
        }
      }
    }
    if (!improved) break;
  }

  return order;
}

/** Ask Google for a road-distance-optimal order. Resolves null on any failure. */
function optimizeViaDirections(
  stops: LatLng[],
  origin: LatLng,
  destination: LatLng,
): Promise<number[] | null> {
  return new Promise((resolve) => {
    try {
      const service = new google.maps.DirectionsService();
      service.route(
        {
          origin: new google.maps.LatLng(origin.lat, origin.lng),
          destination: new google.maps.LatLng(destination.lat, destination.lng),
          waypoints: stops.map((stop) => ({
            location: new google.maps.LatLng(stop.lat, stop.lng),
            stopover: true,
          })),
          travelMode: google.maps.TravelMode.DRIVING,
          optimizeWaypoints: true,
        },
        (result, status) => {
          if (status !== google.maps.DirectionsStatus.OK || !result) {
            // OVER_QUERY_LIMIT / MAX_WAYPOINTS_EXCEEDED / INVALID_REQUEST / ZERO_RESULTS
            // all land here and all mean the same thing to us: use the local optimizer.
            console.warn(`Route optimization via Directions failed: ${status}`);
            resolve(null);
            return;
          }
          // `waypoint_order` is already the visiting sequence and its values are the
          // original waypoint indices — exactly this module's contract. Do not invert it.
          const order = result.routes[0]?.waypoint_order;
          resolve(isPermutation(order, stops.length) ? order : null);
        },
      );
    } catch (error) {
      console.warn('Route optimization via Directions threw:', error);
      resolve(null);
    }
  });
}

/**
 * Returns `stops` indices in the order they should be visited, travelling out from
 * `origin` and back to `destination`. Never throws and never returns anything but a
 * permutation of 0..stops.length-1, so callers can apply the result unconditionally.
 */
export async function optimizeStopOrder(
  stops: LatLng[],
  opts: { origin?: LatLng; destination?: LatLng } = {},
): Promise<number[]> {
  const origin = opts.origin ?? TECHNICIAN_BASE;
  const destination = opts.destination ?? origin;

  if (stops.length < 2) return stops.map((_, i) => i);

  const mapsReady =
    typeof google !== 'undefined' && !!google.maps?.DirectionsService;

  if (mapsReady && stops.length <= MAX_OPTIMIZABLE_WAYPOINTS) {
    const order = await optimizeViaDirections(stops, origin, destination);
    if (order) return order;
  }

  return optimizeStopOrderLocal(stops, origin, destination);
}
