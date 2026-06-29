import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Customer, ServiceTrack } from '@/types';
import type { TablesInsert } from '@/integrations/supabase/types';

export type CustomerRow = {
  id: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  email: string | null;
  product: string | null;
  filter_replacement_month: number | null;
  service_track: string | null;
  next_service_date: string | null;
  notes: string | null;
  lat: number | null;
  lng: number | null;
  place_id: string | null;
};

const SERVICE_TRACKS: ServiceTrack[] = ['annual_filter', 'external_filter', 'bypass_siliphos', 'service_visit'];

function mapServiceTrack(value: string | null): ServiceTrack | undefined {
  return value && (SERVICE_TRACKS as string[]).includes(value) ? (value as ServiceTrack) : undefined;
}

export function rowToCustomer(row: CustomerRow): Customer {
  return {
    id: `db-cust-${row.id}`,
    name: row.name || 'ללא שם',
    phone: row.phone || '',
    address: row.address || '',
    city: row.city || '',
    email: row.email || '',
    product: row.product || '',
    filterReplacementMonth: row.filter_replacement_month ?? 0,
    serviceTrack: mapServiceTrack(row.service_track),
    nextServiceDate: row.next_service_date || undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    placeId: row.place_id || undefined,
    notes: row.notes || undefined,
  };
}

// A stable natural key derived from the customer name, used so one-time imports and
// app-side upserts of CSV/ICS customers stay idempotent (the customers table has a
// UNIQUE import_key).
export function customerImportKey(name: string): string {
  return `name:${name.trim().toLowerCase().replace(/\s+/g, ' ')}`;
}

// Map the app Customer shape onto the DB column names. Only defined fields are
// included so partial updates don't clobber existing columns with nulls.
function customerToRow(data: Partial<Customer>): Partial<TablesInsert<'customers'>> {
  const row: Partial<TablesInsert<'customers'>> = {};
  if (data.name !== undefined) row.name = data.name;
  if (data.phone !== undefined) row.phone = data.phone;
  if (data.address !== undefined) row.address = data.address;
  if (data.city !== undefined) row.city = data.city;
  if (data.email !== undefined) row.email = data.email;
  if (data.product !== undefined) row.product = data.product;
  if (data.filterReplacementMonth !== undefined) row.filter_replacement_month = data.filterReplacementMonth;
  if (data.serviceTrack !== undefined) row.service_track = data.serviceTrack ?? null;
  if (data.nextServiceDate !== undefined) row.next_service_date = data.nextServiceDate ?? null;
  if (data.notes !== undefined) row.notes = data.notes ?? null;
  if (data.lat !== undefined) row.lat = data.lat ?? null;
  if (data.lng !== undefined) row.lng = data.lng ?? null;
  if (data.placeId !== undefined) row.place_id = data.placeId ?? null;
  return row;
}

// Strip the db-cust- prefix back to the raw UUID used as the customers PK.
export function customerDbId(customerId: string): string | null {
  return customerId.startsWith('db-cust-') ? customerId.replace('db-cust-', '') : null;
}

// Insert a brand-new customer (source 'app'); returns the saved Customer with its db-cust- id.
export async function insertCustomer(data: Partial<Customer> & { name: string }): Promise<Customer> {
  const { data: row, error } = await supabase
    .from('customers')
    .insert({ ...customerToRow(data), name: data.name, source: 'app' })
    .select('*')
    .single();
  if (error) throw error;
  return rowToCustomer(row as CustomerRow);
}

// Update an existing customer row by its UUID.
export async function updateCustomerRow(uuid: string, patch: Partial<Customer>): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .update({ ...customerToRow(patch), source: 'app' })
    .eq('id', uuid);
  if (error) throw error;
}

// Upsert a customer keyed on import_key (used for in-memory CSV/ICS customers that
// don't yet have a DB row). Returns the saved Customer with its db-cust- id.
export async function upsertCustomerByImportKey(
  data: Partial<Customer> & { name: string },
): Promise<Customer> {
  const importKey = customerImportKey(data.name);
  const { data: row, error } = await supabase
    .from('customers')
    .upsert(
      { ...customerToRow(data), name: data.name, import_key: importKey, source: 'app' },
      { onConflict: 'import_key' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return rowToCustomer(row as CustomerRow);
}

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAll = useCallback(async () => {
    const PAGE_SIZE = 1000;
    const page = (i: number) =>
      supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true })
        .range(i * PAGE_SIZE, i * PAGE_SIZE + PAGE_SIZE - 1);

    // One cheap count, then fetch every page in parallel instead of awaiting each
    // 1,000-row page before requesting the next (~6 serial round-trips → ~2 deep).
    const { count, error: countError } = await supabase
      .from('customers')
      .select('id', { count: 'exact', head: true });

    const all: Customer[] = [];

    if (countError || count == null) {
      // Fallback: paginate sequentially if the count is unavailable.
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error: queryError } = await page(from / PAGE_SIZE);
        if (queryError) {
          setError(queryError.message);
          break;
        }
        const rows = (data as CustomerRow[] | null) ?? [];
        all.push(...rows.map(rowToCustomer));
        from += PAGE_SIZE;
        hasMore = rows.length === PAGE_SIZE;
      }
    } else {
      const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
      const results = await Promise.all(
        Array.from({ length: pageCount }, (_, i) => page(i)),
      );
      for (const { data, error: queryError } of results) {
        if (queryError) {
          setError(queryError.message);
          continue;
        }
        all.push(...((data as CustomerRow[] | null) ?? []).map(rowToCustomer));
      }
    }

    setCustomers(all);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void fetchAll();

    // Debounced refresh so a burst of changes triggers a single re-fetch.
    const scheduleRefresh = () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        void fetchAll();
      }, 300);
    };

    const channel = supabase
      .channel('customers-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  return { customers, loaded, error, refresh: fetchAll };
}
