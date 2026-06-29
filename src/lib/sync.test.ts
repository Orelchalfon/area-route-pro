import { describe, expect, it, vi, afterEach } from 'vitest';
import { buildDbJobUpdatePatch, getDbJobRef } from './dbJobSync';
import { getDbSyncStatus } from './dbSyncStatus';
import { loadCustomersFromCSV } from './csvParser';
import { buildReceiveFromMakeRow, SHEETS_SOURCE } from '../../supabase/functions/_shared/makePayload';

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
});

describe('Make payload normalization', () => {
  it('normalizes installation rows and marks them as sheets-sourced', () => {
    const result = buildReceiveFromMakeRow({
      type: 'installation',
      action: 'upsert',
      sheet_row_id: ' installations:12:center ',
      sheet: { region: 'מרכז' },
      data: {
        customer_name: '  ישראל ישראלי ',
        phone: ' 050-123 4567 ',
        product_type: 'מערכת מים',
        status: 'pending',
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.table).toBe('installations');
      expect(result.row).toMatchObject({
        sheet_row_id: 'installations:12:center',
        customer_name: 'ישראל ישראלי',
        phone: '0501234567',
        product_type: 'מערכת מים',
        region: 'מרכז',
        source: SHEETS_SOURCE,
      });
    }
  });

  it('skips header or empty customer rows', () => {
    const result = buildReceiveFromMakeRow({
      type: 'malfunction',
      action: 'upsert',
      sheet_row_id: 'malfunctions:1:center',
      data: { customer_name: 'שם' },
    });

    expect(result).toMatchObject({
      ok: false,
      status: 200,
      skipped: true,
      error: 'empty/header customer_name',
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
