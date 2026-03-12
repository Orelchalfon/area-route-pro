import { useState, useEffect } from 'react';
import { Customer, Job } from '@/types';
import { parseICS } from '@/lib/icsParser';

export function useICSImport() {
  const [icsCustomers, setIcsCustomers] = useState<Customer[]>([]);
  const [icsJobs, setIcsJobs] = useState<Job[]>([]);
  const [icsLoaded, setIcsLoaded] = useState(false);

  useEffect(() => {
    fetch('/calendar_1.ics')
      .then(res => res.text())
      .then(text => {
        const { customers, jobs } = parseICS(text, true); // serviceOnly = true
        setIcsCustomers(customers);
        setIcsJobs(jobs);
        setIcsLoaded(true);
      })
      .catch(err => {
        console.error('Failed to load ICS calendar:', err);
        setIcsLoaded(true);
      });
  }, []);

  return { icsCustomers, icsJobs, icsLoaded };
}
