import { describe, expect, it } from 'vitest';
import {
  distanceMeters,
  liveLocationStateFor,
  minutesSince,
  shouldSendLocation,
} from './liveLocation';

const NOW = new Date('2026-08-05T10:00:00Z').getTime();
const agoIso = (ms: number) => new Date(NOW - ms).toISOString();

describe('liveLocationStateFor', () => {
  it('reports off when the technician is not sharing', () => {
    expect(liveLocationStateFor(null, NOW)).toBe('off');
    expect(liveLocationStateFor(undefined, NOW)).toBe('off');
  });

  it('treats an unparsable timestamp as off rather than as a live fix', () => {
    expect(liveLocationStateFor('not a date', NOW)).toBe('off');
  });

  it('reports live for a recent fix', () => {
    expect(liveLocationStateFor(agoIso(30_000), NOW)).toBe('live');
  });

  it('reports stale once the fix ages past the freshness window', () => {
    expect(liveLocationStateFor(agoIso(10 * 60_000), NOW)).toBe('stale');
  });

  it('counts a fix from the future as live — device clock skew must not read as stale', () => {
    expect(liveLocationStateFor(new Date(NOW + 5_000).toISOString(), NOW)).toBe('live');
  });
});

describe('minutesSince', () => {
  it('floors to whole minutes', () => {
    expect(minutesSince(agoIso(119_000), NOW)).toBe(1);
  });

  it('never returns a negative age', () => {
    expect(minutesSince(new Date(NOW + 90_000).toISOString(), NOW)).toBe(0);
  });
});

describe('shouldSendLocation', () => {
  const here = { lat: 32.1, lng: 35.11 };

  it('always sends the first fix', () => {
    expect(shouldSendLocation(null, here, NOW)).toBe(true);
  });

  it('skips a fix that is neither old enough nor far enough', () => {
    const last = { ...here, at: NOW - 5_000 };
    expect(shouldSendLocation(last, { lat: 32.1001, lng: 35.11 }, NOW)).toBe(false);
  });

  it('sends once the interval has elapsed even standing still', () => {
    const last = { ...here, at: NOW - 60_000 };
    expect(shouldSendLocation(last, here, NOW)).toBe(true);
  });

  it('sends immediately on a real move, before the interval', () => {
    const last = { ...here, at: NOW - 5_000 };
    // ~200m north
    expect(shouldSendLocation(last, { lat: 32.1018, lng: 35.11 }, NOW)).toBe(true);
  });
});

describe('distanceMeters', () => {
  it('measures a short hop with metre-level sanity', () => {
    const d = distanceMeters({ lat: 32.1, lng: 35.11 }, { lat: 32.1018, lng: 35.11 });
    expect(d).toBeGreaterThan(180);
    expect(d).toBeLessThan(220);
  });

  it('is zero for the same point', () => {
    expect(distanceMeters({ lat: 32.1, lng: 35.11 }, { lat: 32.1, lng: 35.11 })).toBe(0);
  });
});
