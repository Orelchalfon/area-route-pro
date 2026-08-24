import { describe, expect, it } from 'vitest';
import { describeServicePatch } from './serviceLog';

const svc = {
  task_description: 'החלפת פילטר',
  location: 'אבני חפץ',
  service_date: '2026-08-10',
  phone: '054-465-3216',
  completion_status: null,
};

describe('describeServicePatch', () => {
  it('records a status change with the value it replaced', () => {
    // The row only ever holds the CURRENT status, so the old one has to live in the log.
    const out = describeServicePatch(svc, { completion_status: 'not_done' });
    expect(out).toEqual({
      action: 'עדכון סטטוס שירות',
      details: 'ללא סטטוס ← לא בוצע',
    });
  });

  it('names a cleared status', () => {
    const out = describeServicePatch(
      { ...svc, completion_status: 'done' },
      { completion_status: null },
    );
    expect(out?.action).toBe('ניקוי סטטוס');
    expect(out?.details).toContain('בוצע');
  });

  it('lists every changed field on a multi-field edit', () => {
    const out = describeServicePatch(svc, {
      task_description: 'ביקור שירות',
      location: 'טולכרם',
    });
    expect(out?.action).toBe('עריכת שירות');
    expect(out?.details).toBe('תיאור: החלפת פילטר ← ביקור שירות | מיקום: אבני חפץ ← טולכרם');
  });

  it('returns null when nothing actually changed', () => {
    // Re-saving the dialog untouched must not write an empty log entry.
    expect(describeServicePatch(svc, { task_description: 'החלפת פילטר' })).toBeNull();
  });

  it('returns null for an empty patch', () => {
    expect(describeServicePatch(svc, {})).toBeNull();
  });

  it('ignores unchanged fields but keeps the changed one', () => {
    const out = describeServicePatch(svc, {
      task_description: 'החלפת פילטר',
      location: 'טולכרם',
    });
    expect(out?.details).toBe('מיקום: אבני חפץ ← טולכרם');
  });

  it('renders an empty previous value as "ריק" rather than a blank', () => {
    const out = describeServicePatch({ ...svc, location: '' }, { location: 'טולכרם' });
    expect(out?.details).toBe('מיקום: ריק ← טולכרם');
  });

  it('still describes the change when the previous row is unknown', () => {
    const out = describeServicePatch(undefined, { completion_status: 'done' });
    expect(out).toEqual({ action: 'עדכון סטטוס שירות', details: 'ללא סטטוס ← בוצע' });
  });
});
