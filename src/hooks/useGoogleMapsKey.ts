import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

let cachedApiKey: string | null = null;
let pendingApiKeyRequest: Promise<string> | null = null;

export function useGoogleMapsKey() {
  const [apiKey, setApiKey] = useState<string | null>(cachedApiKey);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKey = useCallback(async () => {
    if (apiKey) return apiKey;
    if (cachedApiKey) {
      setApiKey(cachedApiKey);
      return cachedApiKey;
    }

    setLoading(true);
    setError(null);

    try {
      if (!pendingApiKeyRequest) {
        pendingApiKeyRequest = (async () => {
          const { data, error: fnError } = await supabase.functions.invoke('get-google-maps-key');
          if (fnError) throw fnError;
          if (!data?.key) throw new Error('No key returned');

          cachedApiKey = data.key;
          return data.key as string;
        })().finally(() => {
          pendingApiKeyRequest = null;
        });
      }

      const key = await pendingApiKeyRequest;
      setApiKey(key);
      return key;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load map key');
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  return { apiKey, loading, error, fetchKey };
}
