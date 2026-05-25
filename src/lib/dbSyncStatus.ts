import type { RealtimeStatus } from '@/hooks/useMalfunctionsInstallations';

export type DbSyncStatus = 'loading' | 'live' | 'syncing' | 'error';

export function getDbSyncStatus({
  loading,
  error,
  realtimeStatus,
  loaded,
}: {
  loading: boolean;
  error: string | null;
  realtimeStatus: RealtimeStatus;
  loaded: boolean;
}): DbSyncStatus {
  if (error || realtimeStatus === 'error' || realtimeStatus === 'closed') return 'error';
  if (!loaded) return 'loading';
  if (loading) return 'syncing';
  return 'live';
}
