export type MakeEntityType = 'installation' | 'malfunction';

export type MakePayload = {
  type?: unknown;
  action?: unknown;
  sheet_row_id?: unknown;
  sheet?: { region?: unknown } | null;
  data?: Record<string, unknown> | null;
};

export type ReceiveRowResult =
  | { ok: true; table: 'installations' | 'malfunctions'; sheetRowId: string; row: Record<string, unknown> }
  | { ok: false; status: number; error: string; skipped?: false }
  | { ok: false; status: 200; error: string; skipped: true; sheetRowId: string };

export const SHEETS_SOURCE = 'sheets';

export const normalizeText = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

export const normalizePhone = (value: unknown) =>
  normalizeText(value).replace(/[\s*-]/g, '') || null;

export function shouldSkipCustomerName(name: string) {
  const normalized = name.trim();
  const normalizedLower = normalized.toLowerCase();
  return !normalized || normalized === 'שם' || ['null', 'undefined'].includes(normalizedLower);
}

function isEntityType(value: unknown): value is MakeEntityType {
  return value === 'installation' || value === 'malfunction';
}

export function buildReceiveFromMakeRow(body: MakePayload): ReceiveRowResult {
  if (!isEntityType(body.type)) {
    return { ok: false, status: 400, error: 'Invalid type/action' };
  }

  const action = normalizeText(body.action || 'upsert');
  if (action !== 'upsert') {
    return { ok: false, status: 400, error: 'Invalid type/action' };
  }

  const sheetRowId = normalizeText(body.sheet_row_id);
  if (!sheetRowId) {
    return { ok: false, status: 400, error: 'sheet_row_id is required' };
  }

  const raw = body.data ?? {};
  const customerName = normalizeText(raw.customer_name);
  if (shouldSkipCustomerName(customerName)) {
    return {
      ok: false,
      status: 200,
      error: 'empty/header customer_name',
      skipped: true,
      sheetRowId,
    };
  }

  const table = body.type === 'installation' ? 'installations' : 'malfunctions';
  const baseRow = {
    sheet_row_id: sheetRowId,
    customer_name: customerName,
    phone: normalizePhone(raw.phone),
    address: normalizeText(raw.address) || null,
    city: normalizeText(raw.city) || null,
    notes: normalizeText(raw.notes) || null,
    status: normalizeText(raw.status) || (body.type === 'installation' ? 'pending' : 'draft'),
    source: SHEETS_SOURCE,
    updated_at: new Date().toISOString(),
  };

  const region = normalizeText(raw.region) || normalizeText(body.sheet?.region) || null;

  const row = body.type === 'installation'
    ? {
        ...baseRow,
        product_type: normalizeText(raw.product_type || raw.product) || null,
        region,
      }
    : {
        ...baseRow,
        priority: normalizeText(raw.priority) || 'high',
        description: normalizeText(raw.description) || null,
        region,
      };

  return { ok: true, table, sheetRowId, row };
}
