import { ActivityLog } from '@/types';
import { useCallback, useMemo, useState } from 'react';

// Referentially stable empty array so customers with no logs don't get a fresh
// array on every render (which would defeat React.memo on CustomerCard).
const EMPTY_LOGS: ActivityLog[] = Object.freeze([]) as ActivityLog[];

/**
 * Activity-log subsystem extracted from useJobs. Owns the log list and the
 * append/read helpers. `addLog` is referentially stable so callers can depend
 * on it; `getCustomerLogs` returns a stable empty array for customers with no
 * logs. Behavior matches the original inline implementation.
 */
export function useActivityLogs() {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  const addLog = useCallback(
    (customerId: string, action: string, details: string, jobId?: string) => {
      const log: ActivityLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        customerId,
        jobId,
        action,
        details,
        timestamp: new Date().toISOString(),
      };
      setActivityLogs(prev => [log, ...prev]);
    },
    [],
  );

  // Group logs by customer once per change instead of filtering the full list
  // per card on every render (was O(customers × logs)).
  const logsByCustomer = useMemo(() => {
    const map = new Map<string, ActivityLog[]>();
    for (const log of activityLogs) {
      const existing = map.get(log.customerId);
      if (existing) existing.push(log);
      else map.set(log.customerId, [log]);
    }
    return map;
  }, [activityLogs]);

  const getCustomerLogs = useCallback(
    (customerId: string) => logsByCustomer.get(customerId) ?? EMPTY_LOGS,
    [logsByCustomer],
  );

  return { activityLogs, addLog, getCustomerLogs };
}
