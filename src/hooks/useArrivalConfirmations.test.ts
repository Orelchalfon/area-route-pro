import { describe, expect, it } from 'vitest';
import {
  arrivalStateFor,
  type ArrivalConfirmation,
} from './useArrivalConfirmations';

// arrivalStateFor carries the whole business rule: a customer's confirmation counts only for
// the exact slot they were told about. These tests pin the reset-on-reschedule behaviour — if
// they loosen, the app can start showing "אושרה הגעת טכנאי" for an appointment the customer
// never agreed to.

const confirmation = (
  serviceDate: string,
  scheduledTime: string,
): ArrivalConfirmation => ({
  serviceDate,
  scheduledTime,
  confirmedAt: '2026-08-01T09:00:00.000Z',
  confirmedBy: 'manager',
});

describe('arrivalStateFor', () => {
  it('is "none" when nothing was ever recorded', () => {
    expect(
      arrivalStateFor({ scheduledDate: '2026-08-12', scheduledTime: '10:00' }, undefined),
    ).toBe('none');
  });

  it('is "confirmed" when the date and time both still match', () => {
    expect(
      arrivalStateFor(
        { scheduledDate: '2026-08-12', scheduledTime: '10:00' },
        confirmation('2026-08-12', '10:00'),
      ),
    ).toBe('confirmed');
  });

  it('is "stale" when the appointment moved to another date', () => {
    expect(
      arrivalStateFor(
        { scheduledDate: '2026-08-14', scheduledTime: '10:00' },
        confirmation('2026-08-12', '10:00'),
      ),
    ).toBe('stale');
  });

  it('is "stale" when only the time moved — a route reorder still needs re-confirming', () => {
    expect(
      arrivalStateFor(
        { scheduledDate: '2026-08-12', scheduledTime: '11:20' },
        confirmation('2026-08-12', '10:00'),
      ),
    ).toBe('stale');
  });

  it('is "stale" when both moved', () => {
    expect(
      arrivalStateFor(
        { scheduledDate: '2026-08-14', scheduledTime: '15:00' },
        confirmation('2026-08-12', '10:00'),
      ),
    ).toBe('stale');
  });

  it('is "stale" when the job has been unscheduled entirely', () => {
    // Falling back to '' must not accidentally equal a stored slot.
    expect(
      arrivalStateFor(
        { scheduledDate: undefined, scheduledTime: undefined },
        confirmation('2026-08-12', '10:00'),
      ),
    ).toBe('stale');
  });

  it('never reports "confirmed" from a partial match', () => {
    const stored = confirmation('2026-08-12', '10:00');
    expect(
      arrivalStateFor({ scheduledDate: '2026-08-12', scheduledTime: '10:01' }, stored),
    ).toBe('stale');
    expect(
      arrivalStateFor({ scheduledDate: '2026-08-13', scheduledTime: '10:00' }, stored),
    ).toBe('stale');
  });
});
