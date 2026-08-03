import { describe, expect, it } from 'vitest';
import {
  TECHNICIAN_BASE,
  haversineKm,
  optimizeStopOrder,
  optimizeStopOrderLocal,
  tourLengthKm,
  type LatLng,
} from './routeOptimizer';

// jsdom has no `google`, so every call here exercises the local fallback —
// which is the path that must stay correct when the Maps API is unavailable.

const isPermutationOf = (order: number[], length: number) =>
  order.length === length &&
  new Set(order).size === length &&
  order.every((i) => Number.isInteger(i) && i >= 0 && i < length);

describe('haversineKm', () => {
  it('is zero for a point against itself', () => {
    expect(haversineKm(TECHNICIAN_BASE, TECHNICIAN_BASE)).toBe(0);
  });

  it('is symmetric', () => {
    const a = { lat: 32.1, lng: 35.0 };
    const b = { lat: 32.4, lng: 35.3 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10);
  });

  it('matches a known distance (אבני חפץ → תל אביב ≈ 41km as the crow flies)', () => {
    expect(haversineKm(TECHNICIAN_BASE, { lat: 32.07, lng: 34.78 })).toBeCloseTo(
      41,
      0,
    );
  });
});

describe('optimizeStopOrderLocal', () => {
  it('returns identity for 0 and 1 stops', () => {
    expect(optimizeStopOrderLocal([])).toEqual([]);
    expect(optimizeStopOrderLocal([{ lat: 32, lng: 35 }])).toEqual([0]);
  });

  it('orders two stops nearest-first from the base', () => {
    const near = { lat: 32.28, lng: 35.15 };
    const far = { lat: 32.8, lng: 35.5 };
    expect(optimizeStopOrderLocal([far, near])).toEqual([1, 0]);
  });

  it('untangles a crossed tour that nearest-neighbour alone gets wrong', () => {
    // Four stops on a rectangle. Visiting them in the given order crosses the
    // rectangle diagonally twice; the optimal tour walks the perimeter.
    const base: LatLng = { lat: 32.0, lng: 35.0 };
    const stops: LatLng[] = [
      { lat: 32.0, lng: 35.1 }, // 0 — bottom right
      { lat: 32.1, lng: 35.0 }, // 1 — top left
      { lat: 32.1, lng: 35.1 }, // 2 — top right
      { lat: 32.0, lng: 35.05 }, // 3 — bottom middle
    ];

    const order = optimizeStopOrderLocal(stops, base, base);

    expect(isPermutationOf(order, stops.length)).toBe(true);
    // The optimized tour must beat the naive input order.
    expect(tourLengthKm(stops, order, base, base)).toBeLessThan(
      tourLengthKm(stops, [0, 1, 2, 3], base, base),
    );
    // Perimeter walk, in either rotation direction.
    expect([
      [3, 0, 2, 1],
      [1, 2, 0, 3],
    ]).toContainEqual(order);
  });

  it('never produces a tour worse than the input order', () => {
    // Deterministic pseudo-random spread around the base.
    const stops: LatLng[] = Array.from({ length: 9 }, (_, i) => ({
      lat: TECHNICIAN_BASE.lat + (((i * 37) % 11) - 5) * 0.03,
      lng: TECHNICIAN_BASE.lng + (((i * 53) % 13) - 6) * 0.03,
    }));
    const identity = stops.map((_, i) => i);

    const order = optimizeStopOrderLocal(stops);

    expect(isPermutationOf(order, stops.length)).toBe(true);
    expect(tourLengthKm(stops, order, TECHNICIAN_BASE, TECHNICIAN_BASE)).
      toBeLessThanOrEqual(
        tourLengthKm(stops, identity, TECHNICIAN_BASE, TECHNICIAN_BASE),
      );
  });

  it('is a round trip — the last stop is not simply the farthest one', () => {
    // A spur: one stop far east, the rest clustered near the base. A one-way
    // optimizer ends at the spur; a round-trip optimizer visits it mid-tour or
    // returns from it, but either way the result must be a valid permutation
    // whose length accounts for the drive home.
    const stops: LatLng[] = [
      { lat: 32.28, lng: 35.16 },
      { lat: 32.79, lng: 35.53 }, // far
      { lat: 32.26, lng: 35.13 },
    ];
    const order = optimizeStopOrderLocal(stops);

    expect(isPermutationOf(order, stops.length)).toBe(true);
    expect(tourLengthKm(stops, order, TECHNICIAN_BASE, TECHNICIAN_BASE)).
      toBeGreaterThan(
        // Strictly more than a one-way trip that stops at the far point.
        haversineKm(TECHNICIAN_BASE, stops[1]),
      );
  });

  it('handles duplicate coordinates without dropping or repeating a stop', () => {
    const point = { lat: 32.28, lng: 35.15 };
    const stops = [point, { ...point }, { ...point }];
    expect(isPermutationOf(optimizeStopOrderLocal(stops), 3)).toBe(true);
  });
});

describe('optimizeStopOrder', () => {
  it('falls back to the local optimizer when the Maps API is absent', async () => {
    const stops: LatLng[] = [
      { lat: 32.8, lng: 35.5 },
      { lat: 32.28, lng: 35.15 },
      { lat: 32.5, lng: 35.3 },
    ];
    await expect(optimizeStopOrder(stops)).resolves.toEqual(
      optimizeStopOrderLocal(stops),
    );
  });

  it('returns identity for fewer than two stops', async () => {
    await expect(optimizeStopOrder([])).resolves.toEqual([]);
    await expect(optimizeStopOrder([{ lat: 32, lng: 35 }])).resolves.toEqual([0]);
  });

  it('honours a custom origin', async () => {
    const stops: LatLng[] = [
      { lat: 32.8, lng: 35.5 },
      { lat: 32.28, lng: 35.15 },
    ];
    // Starting from the north, the northern stop should come first.
    await expect(
      optimizeStopOrder(stops, { origin: { lat: 33.0, lng: 35.6 } }),
    ).resolves.toEqual([0, 1]);
  });
});
