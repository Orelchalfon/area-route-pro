import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OngoingService {
  id: string;
  service_date: string;
  task_description: string;
  location: string;
}

export function useOngoingServices() {
  const [services, setServices] = useState<OngoingService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      const today = new Date().toISOString().slice(0, 10);
      const allServices: OngoingService[] = [];
      const PAGE_SIZE = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('ongoing_services')
          .select('*')
          .gte('service_date', today)
          .order('service_date', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);

        if (error) {
          console.error('Error fetching ongoing services:', error);
          break;
        }

        if (data && data.length > 0) {
          allServices.push(...(data as OngoingService[]));
          from += PAGE_SIZE;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }

      setServices(allServices);
      setLoading(false);
    }

    fetchAll();
  }, []);

  return { services, loading };
}
