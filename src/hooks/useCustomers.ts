import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Customer, ServiceTrack } from '@/types';

type CustomerRow = {
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

function rowToCustomer(row: CustomerRow): Customer {
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

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      const all: Customer[] = [];
      const PAGE_SIZE = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error: queryError } = await supabase
          .from('customers')
          .select('*')
          .order('name', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);

        if (queryError) {
          if (!cancelled) setError(queryError.message);
          break;
        }

        const rows = (data as CustomerRow[] | null) ?? [];
        all.push(...rows.map(rowToCustomer));
        from += PAGE_SIZE;
        hasMore = rows.length === PAGE_SIZE;
      }

      if (!cancelled) {
        setCustomers(all);
        setLoaded(true);
      }
    }

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, []);

  return { customers, loaded, error };
}
