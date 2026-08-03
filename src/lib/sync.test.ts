import { describe, expect, it, vi, afterEach } from 'vitest';
import { buildDbJobUpdatePatch, getDbJobRef } from './dbJobSync';
import { getDbSyncStatus } from './dbSyncStatus';
import { loadCustomersFromCSV } from './csvParser';

// A `Make payload normalization` suite used to live in this file, importing
// `buildReceiveFromMakeRow`/`SHEETS_SOURCE` from
// supabase/functions/_shared/makePayload. That directory was deleted from the
// repo, so the unresolved import crashed collection for the WHOLE file — taking
// the 11 assertions below (dbJobSync, dbSyncStatus, csvParser) down with it,
// none of which have anything to do with Make.
//
// Removed rather than resurrected: CLAUDE.md marks the Make pipeline vestigial
// and "do not extend". Recover the deleted block with:
//   git show b91cc4f~1:src/lib/sync.test.ts
// If `supabase functions download` turns out to still return receive-from-make,
// restore it into a colocated supabase/functions test instead of here.

describe('db job sync mapping', () => {
  it('maps db job ids to their Supabase tables', () => {
    expect(getDbJobRef('db-malf-123')).toEqual({ table: 'malfunctions', dbId: '123' });
    expect(getDbJobRef('db-inst-456')).toEqual({ table: 'installations', dbId: '456' });
    expect(getDbJobRef('filter-2026-1-c1')).toBeNull();
  });

  it('builds a scheduling patch without touching the vestigial source column', () => {
    const patch = buildDbJobUpdatePatch('malfunctions', {
      status: 'confirmed',
      technicianId: 'tech-1',
      scheduledDate: '2026-05-21',
      scheduledTime: '10:30',
      location: 'Main 1',
      city: 'Tel Aviv',
      notes: 'Bring filters',
      priority: 'high',
      estimatedDuration: 45,
    });
    expect(patch).toMatchObject({
      status: 'confirmed',
      technician_id: 'tech-1',
      scheduled_date: '2026-05-21',
      scheduled_time: '10:30',
      address: 'Main 1',
      city: 'Tel Aviv',
      notes: 'Bring filters',
      priority: 'high',
      estimated_duration: 45,
    });
    // `source` must NOT be set: the employee RLS trigger rejects any UPDATE that
    // changes it, which previously blocked technician completions on legacy rows.
    expect(patch).not.toHaveProperty('source');
  });

  it('clears assignment fields when returning a job', () => {
    expect(buildDbJobUpdatePatch('malfunctions', {
      status: 'draft',
      technicianId: null,
      scheduledDate: null,
      scheduledTime: null,
      completionStatus: null,
      completionNotes: null,
    })).toMatchObject({
      status: 'draft',
      technician_id: null,
      scheduled_date: null,
      scheduled_time: null,
      completion_status: null,
      completion_notes: null,
    });
  });

  it('clears scheduling fields without changing status when status is omitted', () => {
    expect(buildDbJobUpdatePatch('malfunctions', {
      technicianId: null,
      scheduledDate: null,
      scheduledTime: null,
    })).toEqual({
      technician_id: null,
      scheduled_date: null,
      scheduled_time: null,
    });
  });
});

describe('DB sync status', () => {
  it('shows loading before the first DB sync completes', () => {
    expect(getDbSyncStatus({
      loading: true,
      error: null,
      realtimeStatus: 'connecting',
      loaded: false,
    })).toBe('loading');
  });

  it('shows syncing for background refreshes after initial load', () => {
    expect(getDbSyncStatus({
      loading: true,
      error: null,
      realtimeStatus: 'live',
      loaded: true,
    })).toBe('syncing');
  });

  it('shows live when realtime is subscribed and no refresh is running', () => {
    expect(getDbSyncStatus({
      loading: false,
      error: null,
      realtimeStatus: 'live',
      loaded: true,
    })).toBe('live');
  });

  it('shows error for fetch or realtime failures', () => {
    expect(getDbSyncStatus({
      loading: false,
      error: 'Network error',
      realtimeStatus: 'live',
      loaded: true,
    })).toBe('error');
    expect(getDbSyncStatus({
      loading: false,
      error: null,
      realtimeStatus: 'closed',
      loaded: true,
    })).toBe('error');
  });
});

describe('CSV customer import', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('merges CSV contact fields into one customer with notes', async () => {
    const csv = [
      'First Name,Middle Name,Last Name,E-mail Address,Mobile Phone,Home Street,Home City,Notes',
      'Tal,,Hermon,tal@example.com,050-1234567,Main 1,Tel Aviv,VIP',
    ].join('\n');

    vi.stubGlobal('fetch', vi.fn(async () => ({
      text: async () => csv,
    })));

    await expect(loadCustomersFromCSV('/contacts.csv')).resolves.toEqual([
      expect.objectContaining({
        id: 'c1',
        name: 'Tal Hermon',
        phone: '050-1234567',
        address: 'Main 1',
        city: 'Tel Aviv',
        email: 'tal@example.com',
        notes: 'VIP',
      }),
    ]);
  });
});
