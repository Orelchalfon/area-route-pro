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
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from('ongoing_services')
      .select('*')
      .gte('service_date', today)
      .order('service_date', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching ongoing services:', error);
        } else {
          setServices((data as OngoingService[]) || []);
        }
        setLoading(false);
      });
  }, []);

  return { services, loading };
}
