import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useGoogleMapsKey() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKey = async () => {
    if (apiKey) return; // already loaded
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-google-maps-key');
      if (fnError) throw fnError;
      if (data?.key) {
        setApiKey(data.key);
      } else {
        throw new Error('No key returned');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load map key');
    } finally {
      setLoading(false);
    }
  };

  return { apiKey, loading, error, fetchKey };
}
