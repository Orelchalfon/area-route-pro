// v2 - force clean reload
import { createContext, useContext, ReactNode } from 'react';
import { useJobs } from '@/hooks/useJobs';

type JobsContextType = ReturnType<typeof useJobs>;

const JobsContext = createContext<JobsContextType | null>(null);

export function JobsProvider({ children }: { children: ReactNode }) {
  const jobsState = useJobs();
  return <JobsContext.Provider value={jobsState}>{children}</JobsContext.Provider>;
}

export function useJobsContext() {
  const ctx = useContext(JobsContext);
  if (!ctx) throw new Error('useJobsContext must be used within JobsProvider');
  return ctx;
}
