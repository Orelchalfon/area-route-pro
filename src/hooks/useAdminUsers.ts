import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AdminUser = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  role: 'admin' | 'employee' | null;
  technician_id: string | null;
  full_name: string | null;
};

async function extractFunctionError(fnError: unknown): Promise<string> {
  const context = (fnError as { context?: Response }).context;
  if (context && typeof context.json === 'function') {
    try {
      const body = await context.clone().json();
      if (body?.error) return body.error as string;
    } catch {
      // fall through to the generic message
    }
  }
  return (fnError as { message?: string }).message ?? 'Request failed';
}

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fnError } = await supabase.functions.invoke('admin-create-user', {
      body: { action: 'list' },
    });
    if (fnError) {
      setError(fnError.message);
    } else {
      setUsers((data?.users ?? []) as AdminUser[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const createUser = useCallback(
    async (
      email: string,
      password: string,
      role: 'admin' | 'employee',
      technicianId: string | null,
    ): Promise<{ error: string | null }> => {
      const { error: fnError } = await supabase.functions.invoke('admin-create-user', {
        body: { action: 'create', email, password, role, technicianId },
      });
      // On a non-2xx response supabase-js returns a FunctionsHttpError whose
      // `.context` is the raw Response; the real message lives in its body.
      if (fnError) {
        return { error: await extractFunctionError(fnError) };
      }
      await loadUsers();
      return { error: null };
    },
    [loadUsers],
  );

  return { users, loading, error, createUser, reload: loadUsers };
}
