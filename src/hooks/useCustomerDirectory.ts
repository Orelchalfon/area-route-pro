import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Customer, ServiceTrack } from '@/types';
import {
  rowToCustomer,
  customerDbId,
  insertCustomer,
  updateCustomerRow,
  type CustomerRow,
} from '@/hooks/useCustomers';

const PAGE_SIZE = 100;

// The customers table is the page's single source of truth. Search runs against
// the DB (not an in-memory slice), so a query covers all 5k+ rows, not just the
// pages already loaded.
const SEARCH_COLUMNS = ['name', 'phone', 'city', 'address'] as const;

// A comma, parenthesis or percent inside the term would break PostgREST's `.or()`
// filter grammar, so strip them before interpolating.
function sanitizeTerm(search: string): string {
  return search.replace(/[,()%]/g, ' ').replace(/\s+/g, ' ').trim();
}

function orFilter(term: string): string {
  return SEARCH_COLUMNS.map(col => `${col}.ilike.%${term}%`).join(',');
}

// Editing the address/city without supplying fresh coords means the stored
// lat/lng/placeId are now stale — drop them so they get re-geocoded. (Mirrors the
// rule in useJobs.ts.)
function shouldResetStoredCoords(data: Partial<Customer>): boolean {
  const updatesAddress =
    Object.prototype.hasOwnProperty.call(data, 'address') ||
    Object.prototype.hasOwnProperty.call(data, 'city');
  const updatesCoords =
    Object.prototype.hasOwnProperty.call(data, 'lat') ||
    Object.prototype.hasOwnProperty.call(data, 'lng') ||
    Object.prototype.hasOwnProperty.call(data, 'placeId');
  return updatesAddress && !updatesCoords;
}

// Keep the loaded list sorted by name so an optimistic insert lands where the DB
// would put it (the query orders by name ascending).
function insertSortedByName(list: Customer[], customer: Customer): Customer[] {
  const idx = list.findIndex(c => c.name.localeCompare(customer.name, 'he') > 0);
  if (idx === -1) return [...list, customer];
  return [...list.slice(0, idx), customer, ...list.slice(idx)];
}

type AddCustomerInput = {
  name: string;
  phone: string;
  address: string;
  city: string;
  email: string;
  product: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  filterReplacementMonth?: number;
};

type AddLog = (customerId: string, action: string, details: string, jobId?: string) => void;

interface UseCustomerDirectoryArgs {
  /** Already-debounced search term from the page. */
  search: string;
  /** Activity-log appender from the app-wide store, so edits show in the history dialog. */
  addLog?: AddLog;
}

export function useCustomerDirectory({ search, addLog }: UseCustomerDirectoryArgs) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const term = sanitizeTerm(search);

  // Monotonic request token: any response whose token is stale (search changed or
  // a refetch superseded it) is discarded so out-of-order responses can't clobber
  // newer state.
  const reqIdRef = useRef(0);
  const loadingMoreRef = useRef(false);
  // Latest values for callbacks that must not capture stale closures (realtime).
  const stateRef = useRef({ term, len: 0 });
  stateRef.current = { term, len: customers.length };

  const hasMore = customers.length < totalCount;

  const fetchUnassignedCount = useCallback(async () => {
    const { count, error: countError } = await supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .is('service_track', null);
    if (!countError && typeof count === 'number') setUnassignedCount(count);
  }, []);

  // Initial load + reset whenever the (debounced) search term changes.
  useEffect(() => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError(null);

    (async () => {
      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .order('name', { ascending: true })
        .range(0, PAGE_SIZE - 1);
      if (term) query = query.or(orFilter(term));

      const { data, error: queryError, count } = await query;
      if (reqId !== reqIdRef.current) return; // superseded

      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        return;
      }
      const rows = (data as CustomerRow[] | null) ?? [];
      setCustomers(rows.map(rowToCustomer));
      setTotalCount(count ?? rows.length);
      setLoading(false);
    })();
  }, [term]);

  useEffect(() => {
    void fetchUnassignedCount();
  }, [fetchUnassignedCount]);

  // Append the next page. Recreated each render (cheap) and stored in a ref by the
  // infinite-scroll observer, so it always reads current state without stale closures.
  const loadMore = () => {
    if (loading || loadingMoreRef.current) return;
    if (customers.length >= totalCount) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    const reqId = reqIdRef.current;
    const from = customers.length;

    (async () => {
      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .order('name', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (term) query = query.or(orFilter(term));

      const { data, error: queryError, count } = await query;
      loadingMoreRef.current = false;

      if (reqId !== reqIdRef.current) {
        setLoadingMore(false);
        return; // search/refetch happened mid-flight — drop this page
      }
      if (queryError) {
        setError(queryError.message);
        setLoadingMore(false);
        return;
      }
      const rows = (data as CustomerRow[] | null) ?? [];
      setCustomers(prev => [...prev, ...rows.map(rowToCustomer)]);
      if (typeof count === 'number') setTotalCount(count);
      setLoadingMore(false);
    })();
  };

  // Re-fetch exactly the pages currently loaded (0..len) so a realtime change or a
  // mutation reconciles without losing the user's scroll depth.
  const refetchLoaded = useCallback(async () => {
    const { term: curTerm, len } = stateRef.current;
    const reqId = ++reqIdRef.current;
    const upTo = Math.max(len, PAGE_SIZE) - 1;

    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .order('name', { ascending: true })
      .range(0, upTo);
    if (curTerm) query = query.or(orFilter(curTerm));

    const { data, error: queryError, count } = await query;
    if (reqId !== reqIdRef.current) return;
    if (queryError) return;

    const rows = (data as CustomerRow[] | null) ?? [];
    setCustomers(rows.map(rowToCustomer));
    if (typeof count === 'number') setTotalCount(count);
    void fetchUnassignedCount();
  }, [fetchUnassignedCount]);

  // Keep the page consistent with the DB: debounced refetch on any customers change.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel('customers-directory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => void refetchLoaded(), 400);
      })
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [refetchLoaded]);

  const addCustomer = useCallback(
    async (data: AddCustomerInput): Promise<Customer | undefined> => {
      try {
        const created = await insertCustomer({
          ...data,
          filterReplacementMonth: data.filterReplacementMonth ?? new Date().getMonth() + 1,
        });
        setCustomers(prev => insertSortedByName(prev, created));
        setTotalCount(c => c + 1);
        if (!created.serviceTrack) setUnassignedCount(c => c + 1);
        addLog?.(created.id, 'יצירת לקוח', 'נוצר כרטיס לקוח חדש');
        return created;
      } catch (e) {
        console.error('Failed to add customer:', e);
        return undefined;
      }
    },
    [addLog],
  );

  const updateCustomer = useCallback(
    async (customerId: string, data: Partial<Customer>) => {
      const next = shouldResetStoredCoords(data)
        ? { ...data, lat: undefined, lng: undefined, placeId: undefined }
        : data;

      // Optimistic: track changes affect the unassigned count.
      setCustomers(prev => {
        const before = prev.find(c => c.id === customerId);
        if (before && 'serviceTrack' in next) {
          const wasUnassigned = !before.serviceTrack;
          const willBeUnassigned = !next.serviceTrack;
          if (wasUnassigned && !willBeUnassigned) setUnassignedCount(c => Math.max(0, c - 1));
          else if (!wasUnassigned && willBeUnassigned) setUnassignedCount(c => c + 1);
        }
        return prev.map(c => (c.id === customerId ? { ...c, ...next } : c));
      });
      addLog?.(customerId, 'עדכון פרטים', 'פרטי הלקוח עודכנו');

      const uuid = customerDbId(customerId);
      if (uuid) {
        try {
          await updateCustomerRow(uuid, next);
        } catch (e) {
          console.error('Failed to update customer:', e);
        }
      }
    },
    [addLog],
  );

  // Fetch every unassigned customer (full rows) for Smart Distribution, which needs
  // the whole eligible set, not just the loaded page.
  const fetchAllUnassigned = useCallback(async (): Promise<Customer[]> => {
    const all: Customer[] = [];
    const SIZE = 1000;
    let from = 0;
    let more = true;
    while (more) {
      const { data, error: queryError } = await supabase
        .from('customers')
        .select('*')
        .is('service_track', null)
        .order('name', { ascending: true })
        .range(from, from + SIZE - 1);
      if (queryError) break;
      const rows = (data as CustomerRow[] | null) ?? [];
      all.push(...rows.map(rowToCustomer));
      from += SIZE;
      more = rows.length === SIZE;
    }
    return all;
  }, []);

  // Persist track assignments to the DB. nextServiceDate is constant per track, so
  // group by track and update with `.in(ids)` (chunked to keep request URLs sane).
  const distributeServiceTracks = useCallback(
    async (
      assignments: { customerId: string; track: ServiceTrack; nextServiceDate: string }[],
    ) => {
      const byTrack = new Map<ServiceTrack, { date: string; ids: string[] }>();
      for (const a of assignments) {
        const uuid = customerDbId(a.customerId);
        if (!uuid) continue;
        const entry = byTrack.get(a.track) ?? { date: a.nextServiceDate, ids: [] };
        entry.ids.push(uuid);
        byTrack.set(a.track, entry);
      }

      const CHUNK = 200;
      for (const [track, { date, ids }] of byTrack) {
        for (let i = 0; i < ids.length; i += CHUNK) {
          const slice = ids.slice(i, i + CHUNK);
          const { error: updateError } = await supabase
            .from('customers')
            .update({ service_track: track, next_service_date: date, source: 'app' })
            .in('id', slice);
          if (updateError) {
            console.error('Failed to persist distribution chunk:', updateError);
            throw updateError;
          }
        }
      }

      await refetchLoaded();
    },
    [refetchLoaded],
  );

  return {
    customers,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    totalCount,
    unassignedCount,
    error,
    addCustomer,
    updateCustomer,
    distributeServiceTracks,
    fetchAllUnassigned,
  };
}
