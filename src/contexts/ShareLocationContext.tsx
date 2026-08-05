import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ShareLocationApi, useShareLocation } from '@/hooks/useShareLocation';

/**
 * Holds the technician's live-location publisher ABOVE the router.
 *
 * The toggle lives on /daily-route, but the technician's working day moves between /daily-route
 * and /technician (reporting completions). If the watch were owned by DailyRoutePage it would be
 * torn down — and the row deleted — the moment they tapped over to report a job, so the manager
 * would see "לא משתף מיקום" exactly while the technician was busy working.
 */
const ShareLocationContext = createContext<ShareLocationApi | null>(null);

export function ShareLocationProvider({ children }: { children: ReactNode }) {
  const { isAdmin, technicianId } = useAuth();
  // Managers consume locations, they never publish one.
  const shareLocation = useShareLocation(technicianId, !isAdmin);
  return (
    <ShareLocationContext.Provider value={shareLocation}>{children}</ShareLocationContext.Provider>
  );
}

export function useShareLocationContext() {
  const ctx = useContext(ShareLocationContext);
  if (!ctx) throw new Error('useShareLocationContext must be used within ShareLocationProvider');
  return ctx;
}
