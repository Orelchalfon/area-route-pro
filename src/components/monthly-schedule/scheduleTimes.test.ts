import { describe, expect, it } from 'vitest';
import { Job } from '@/types';
import {
  DAY_START_MINUTES,
  calculateTimeRanges,
  minutesToTime,
  nextFreeMinutes,
} from './utils';

// Route order is stored implicitly as scheduledTime: saving the order writes
// 10:00 + cumulative durations, and every consumer sorts by the result. These tests pin
// the one invariant that makes "append a job to an approved day with a single write"
// safe — that nextFreeMinutes lands on exactly the slot calculateTimeRanges would give
// a stop placed last. If they ever disagree, the approval dialog starts reporting a
// freshly saved day as unsaved and flags every later stop as a moved appointment.

const job = (id: string, estimatedDuration: number, scheduledTime?: string): Job => ({
  id,
  type: 'filter_replacement',
  status: 'confirmed',
  priority: 'low',
  customerId: `c-${id}`,
  estimatedDuration,
  location: '',
  city: '',
  notes: '',
  createdAt: '2026-08-01',
  scheduledTime,
});

/** What saving the route order persists. Mirrors handleSaveRouteOrder. */
const persistOrder = (jobs: Job[]): Job[] => {
  let minutes = DAY_START_MINUTES;
  return jobs.map((j) => {
    const scheduledTime = minutesToTime(minutes);
    minutes += j.estimatedDuration;
    return { ...j, scheduledTime };
  });
};

describe('minutesToTime', () => {
  it('zero-pads both fields', () => {
    expect(minutesToTime(DAY_START_MINUTES)).toBe('10:00');
    expect(minutesToTime(9 * 60 + 5)).toBe('09:05');
    expect(minutesToTime(13 * 60 + 40)).toBe('13:40');
  });
});

describe('nextFreeMinutes', () => {
  it('starts the day at 10:00 when there are no stops', () => {
    expect(nextFreeMinutes([])).toBe(DAY_START_MINUTES);
  });

  it('never returns earlier than 10:00, even for stops timed before it', () => {
    // '08:00' is the placeholder an unscheduled job carries before approval.
    expect(nextFreeMinutes([job('a', 60, '08:00')])).toBe(DAY_START_MINUTES);
  });

  it('ignores stops with no time at all', () => {
    expect(nextFreeMinutes([job('a', 60), job('b', 30, '10:00')])).toBe(
      DAY_START_MINUTES + 30,
    );
  });

  it('takes the latest end, not the last array entry', () => {
    const jobs = [job('late', 60, '13:00'), job('early', 30, '10:00')];
    expect(nextFreeMinutes(jobs)).toBe(14 * 60);
  });
});

describe('append-to-approved-day invariant', () => {
  it('appends at exactly the slot calculateTimeRanges derives for a last stop', () => {
    const saved = persistOrder([job('a', 60), job('b', 20), job('c', 45)]);
    const appended = { ...job('d', 120), scheduledTime: minutesToTime(nextFreeMinutes(saved)) };

    // Reopening the day sorts by scheduledTime and recomputes positions from 10:00.
    const reopened = [...saved, appended].sort((x, y) =>
      (x.scheduledTime || '').localeCompare(y.scheduledTime || ''),
    );
    const ranges = calculateTimeRanges(reopened);

    // Every stop — including the appended one — already sits at its computed time,
    // so the dialog shows no unsaved order and no moved appointments.
    ranges.forEach(({ job: j, startTime }) => {
      expect(j.scheduledTime).toBe(startTime);
    });
    expect(appended.scheduledTime).toBe('12:05');
  });

  it('holds when several jobs are appended in one go', () => {
    const saved = persistOrder([job('a', 60), job('b', 30)]);
    let minutes = nextFreeMinutes(saved);
    const added = [job('c', 20), job('d', 90)].map((j) => {
      const scheduledTime = minutesToTime(minutes);
      minutes += j.estimatedDuration;
      return { ...j, scheduledTime };
    });

    const reopened = [...saved, ...added].sort((x, y) =>
      (x.scheduledTime || '').localeCompare(y.scheduledTime || ''),
    );
    calculateTimeRanges(reopened).forEach(({ job: j, startTime }) => {
      expect(j.scheduledTime).toBe(startTime);
    });
  });

  it('leaves every existing stop untouched — only the new job gets a time', () => {
    const saved = persistOrder([job('a', 60), job('b', 20)]);
    const before = saved.map((j) => j.scheduledTime);

    nextFreeMinutes(saved);

    expect(saved.map((j) => j.scheduledTime)).toEqual(before);
    expect(before).toEqual(['10:00', '11:00']);
  });
});
