import { useState, useCallback, useEffect } from 'react';
import { Job, JobStatus, JobType, JOB_TYPE_CONFIG, Customer, CompletionStatus, ActivityLog, ServiceTrack, SERVICE_TRACK_CONFIG } from '@/types';
import { technicians, initialJobs } from '@/data/mockData';
import { loadCustomersFromCSV } from '@/lib/csvParser';
import { loadInstallationsFromCSV } from '@/lib/installationCsvParser';
import { loadMalfunctionsFromCSV } from '@/lib/malfunctionCsvParser';
import { useICSImport } from '@/hooks/useICSImport';

// Hook ordering stable v2 - malfunctions added
export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [closedJobs, setClosedJobs] = useState<Job[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const { icsCustomers, icsJobs, icsLoaded } = useICSImport();

  // Load real customers from CSV
  useEffect(() => {
    loadCustomersFromCSV('/contacts.csv')
      .then(customers => {
        setCustomersList(customers);
        setDataLoaded(true);
      })
      .catch(err => {
        console.error('Failed to load customers CSV:', err);
        setDataLoaded(true);
      });
  }, []);

  // Load installations from CSV
  useEffect(() => {
    if (!dataLoaded) return;
    loadInstallationsFromCSV('/installations.csv')
      .then(({ customers, jobs: instJobs }) => {
        // Merge installation customers — match by name or add new
        setCustomersList(prev => {
          const updated = [...prev];
          const existingNames = new Set(prev.map(c => c.name.trim().toLowerCase()));
          for (const ic of customers) {
            const icName = ic.name.trim().toLowerCase();
            const existing = prev.find(c => 
              c.name.trim().toLowerCase() === icName ||
              c.name.trim().toLowerCase().includes(icName) ||
              icName.includes(c.name.trim().toLowerCase())
            );
            if (existing) {
              // Update city if missing
              if (!existing.city && ic.city) {
                const idx = updated.findIndex(c => c.id === existing.id);
                if (idx >= 0) updated[idx] = { ...updated[idx], city: ic.city };
              }
            } else {
              updated.push(ic);
            }
          }
          return updated;
        });

        // Remap job customerIds to existing customers where possible, then add
        setJobs(prev => {
          const remapped = instJobs.map(job => {
            const instCust = customers.find(c => c.id === job.customerId);
            if (!instCust) return job;
            const match = customersList.find(c =>
              c.name.trim().toLowerCase() === instCust.name.trim().toLowerCase() ||
              c.name.trim().toLowerCase().includes(instCust.name.trim().toLowerCase()) ||
              instCust.name.trim().toLowerCase().includes(c.name.trim().toLowerCase())
            );
            return match ? { ...job, customerId: match.id } : job;
          });
          return [...prev, ...remapped];
        });
      })
      .catch(err => console.error('Failed to load installations CSV:', err));
  }, [dataLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load malfunctions from CSV
  useEffect(() => {
    if (!dataLoaded) return;
    loadMalfunctionsFromCSV('/malfunctions.csv')
      .then(({ customers: malfCustomers, jobs: malfJobs }) => {
        setCustomersList(prev => {
          const updated = [...prev];
          for (const mc of malfCustomers) {
            const mcName = mc.name.trim().toLowerCase();
            const existing = prev.find(c =>
              c.name.trim().toLowerCase() === mcName ||
              c.name.trim().toLowerCase().includes(mcName) ||
              mcName.includes(c.name.trim().toLowerCase())
            );
            if (existing) {
              if (!existing.city && mc.city) {
                const idx = updated.findIndex(c => c.id === existing.id);
                if (idx >= 0) updated[idx] = { ...updated[idx], city: mc.city };
              }
            } else {
              updated.push(mc);
            }
          }
          return updated;
        });

        setJobs(prev => {
          const remapped = malfJobs.map(job => {
            const malfCust = malfCustomers.find(c => c.id === job.customerId);
            if (!malfCust) return job;
            const match = customersList.find(c =>
              c.name.trim().toLowerCase() === malfCust.name.trim().toLowerCase() ||
              c.name.trim().toLowerCase().includes(malfCust.name.trim().toLowerCase()) ||
              malfCust.name.trim().toLowerCase().includes(c.name.trim().toLowerCase())
            );
            return match ? { ...job, customerId: match.id } : job;
          });
          return [...prev, ...remapped];
        });
      })
      .catch(err => console.error('Failed to load malfunctions CSV:', err));
  }, [dataLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Merge ICS calendar data: update existing customers' filterReplacementMonth & serviceTrack, add ICS-only customers, and add service jobs
  useEffect(() => {
    if (!icsLoaded || !dataLoaded || icsCustomers.length === 0) return;

    // Update existing customers with ICS data (match by name)
    setCustomersList(prev => {
      const updated = prev.map(c => {
        const icsMatch = icsCustomers.find(ic => 
          ic.name.trim().toLowerCase() === c.name.trim().toLowerCase() ||
          c.name.trim().includes(ic.name.trim()) ||
          ic.name.trim().includes(c.name.trim())
        );
        if (icsMatch) {
          return {
            ...c,
            filterReplacementMonth: icsMatch.filterReplacementMonth,
            serviceTrack: c.serviceTrack || icsMatch.serviceTrack,
            city: c.city || icsMatch.city,
          };
        }
        return c;
      });

      // Add ICS customers that don't exist in CSV
      const existingNames = new Set(updated.map(c => c.name.trim().toLowerCase()));
      const newCustomers = icsCustomers.filter(ic => {
        const icName = ic.name.trim().toLowerCase();
        return !Array.from(existingNames).some(en => en.includes(icName) || icName.includes(en));
      });

      return [...updated, ...newCustomers];
    });

    // Add ICS service jobs, remapping customerIds to match existing customers
    setJobs(prev => {
      const newJobs = icsJobs.map(job => {
        const icsCustomer = icsCustomers.find(c => c.id === job.customerId);
        if (!icsCustomer) return job;

        // Try to find matching CSV customer
        const csvMatch = customersList.find(c =>
          c.name.trim().toLowerCase() === icsCustomer.name.trim().toLowerCase() ||
          c.name.trim().includes(icsCustomer.name.trim()) ||
          icsCustomer.name.trim().includes(c.name.trim())
        );
        
        return csvMatch ? { ...job, customerId: csvMatch.id } : job;
      });

      return [...prev, ...newJobs];
    });
  }, [icsLoaded, dataLoaded, icsCustomers.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const addLog = useCallback((customerId: string, action: string, details: string, jobId?: string) => {
    const log: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      customerId,
      jobId,
      action,
      details,
      timestamp: new Date().toISOString(),
    };
    setActivityLogs(prev => [log, ...prev]);
  }, []);

  const updateJobStatus = (jobId: string, status: JobStatus) => {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status } : j));
  };

  const approveSchedule = (jobIds: string[]) => {
    setJobs(prev => prev.map(j => 
      jobIds.includes(j.id) && j.status === 'draft' 
        ? { ...j, status: 'pending_customer' as JobStatus } 
        : j
    ));
  };

  const approveDaySchedule = (assignments: { jobId: string; technicianId: string; scheduledDate: string; scheduledTime: string }[]) => {
    setJobs(prev => {
      const assignmentMap = new Map(assignments.map(a => [a.jobId, a]));
      return prev.map(j => {
        const assignment = assignmentMap.get(j.id);
        if (assignment) {
          addLog(j.customerId, 'שיבוץ', `שובץ לתאריך ${assignment.scheduledDate} בשעה ${assignment.scheduledTime}`, j.id);
          return {
            ...j,
            status: 'confirmed' as JobStatus,
            technicianId: assignment.technicianId,
            scheduledDate: assignment.scheduledDate,
            scheduledTime: assignment.scheduledTime,
          };
        }
        return j;
      });
    });
  };

  const completeJob = (jobId: string, notes: string) => {
    setJobs(prev => prev.map(j => 
      j.id === jobId ? { ...j, status: 'completed' as JobStatus, completionNotes: notes, completionStatus: 'done' as CompletionStatus } : j
    ));
  };

  const markJobCompletion = (jobId: string, completionStatus: CompletionStatus, notes: string) => {
    const statusLabels: Record<CompletionStatus, string> = { done: 'בוצע', not_done: 'לא בוצע', need_return: 'צריך לחזור' };
    setJobs(prev => {
      const job = prev.find(j => j.id === jobId);
      if (job) addLog(job.customerId, `דיווח טכנאי: ${statusLabels[completionStatus]}`, notes || 'ללא הערות', jobId);
      return prev.map(j =>
        j.id === jobId ? { ...j, status: 'completed' as JobStatus, completionStatus, completionNotes: notes } : j
      );
    });
  };

  const closeJob = (jobId: string) => {
    setJobs(prev => {
      const job = prev.find(j => j.id === jobId);
      if (!job) return prev;

      addLog(job.customerId, 'סגירת קריאה', `קריאה ${JOB_TYPE_CONFIG[job.type].label} נסגרה`, jobId);
      setClosedJobs(old => [...old, job]);

      if (job.type === 'filter_replacement') {
        const customer = customersList.find(c => c.id === job.customerId);
        const currentYear = parseInt(job.createdAt.split('-')[0]);
        const nextYear = currentYear + 1;
        const month = customer?.filterReplacementMonth || parseInt(job.createdAt.split('-')[1]);
        const nextJobId = `filter-${nextYear}-${month}-${job.customerId}`;
        const existing = prev.find(j => j.id === nextJobId);
        if (!existing) {
          addLog(job.customerId, 'תזמון שירות', `שירות שוטף תוזמן לשנה הבאה (${nextYear})`, nextJobId);
          const newJob: Job = {
            id: nextJobId,
            type: 'filter_replacement',
            status: 'draft',
            priority: 'low',
            customerId: job.customerId,
            estimatedDuration: 25,
            location: customer?.address || job.location,
            city: customer?.city || job.city,
            notes: 'החלפת פילטר שנתית',
            createdAt: `${nextYear}-${String(month).padStart(2, '0')}-01`,
          };
          return [...prev.filter(j => j.id !== jobId), newJob];
        }
      }
      return prev.filter(j => j.id !== jobId);
    });
  };

  const returnJob = (jobId: string) => {
    setJobs(prev => {
      const job = prev.find(j => j.id === jobId);
      if (!job) return prev;
      addLog(job.customerId, 'החזרת קריאה', `קריאה ${JOB_TYPE_CONFIG[job.type].label} הוחזרה למאגר`, jobId);
      return prev.map(j => j.id === jobId ? {
        ...j,
        status: 'draft' as JobStatus,
        technicianId: undefined,
        scheduledDate: undefined,
        scheduledTime: undefined,
      } : j);
    });
  };

  const completeFilterJob = (jobId: string) => {
    setJobs(prev => {
      const job = prev.find(j => j.id === jobId);
      if (!job || job.type !== 'filter_replacement') {
        return prev.map(j => j.id === jobId ? { ...j, status: 'completed' as JobStatus } : j);
      }
      const updated = prev.map(j => j.id === jobId ? { ...j, status: 'completed' as JobStatus } : j);
      const customer = customersList.find(c => c.id === job.customerId);
      const currentYear = parseInt(job.createdAt.split('-')[0]);
      const nextYear = currentYear + 1;
      const month = customer?.filterReplacementMonth || (parseInt(job.createdAt.split('-')[1]));
      const nextJobId = `filter-${nextYear}-${month}-${job.customerId}`;
      if (!updated.find(j => j.id === nextJobId)) {
        const newJob: Job = {
          id: nextJobId,
          type: 'filter_replacement',
          status: 'draft',
          priority: 'low',
          customerId: job.customerId,
          estimatedDuration: 25,
          location: customer?.address || job.location,
          city: customer?.city || job.city,
          notes: 'החלפת פילטר שנתית',
          createdAt: `${nextYear}-${String(month).padStart(2, '0')}-01`,
        };
        updated.push(newJob);
      }
      return updated;
    });
  };

  const assignJob = (jobId: string, technicianId: string, scheduledDate: string, scheduledTime: string) => {
    setJobs(prev => prev.map(j => 
      j.id === jobId ? { ...j, technicianId, scheduledDate, scheduledTime } : j
    ));
  };

  const unassignJob = (jobId: string) => {
    setJobs(prev => prev.map(j => 
      j.id === jobId ? { ...j, status: 'draft' as JobStatus, technicianId: undefined, scheduledDate: undefined, scheduledTime: undefined } : j
    ));
  };

  const addJob = (data: { type: JobType; customerId: string; technicianId: string; scheduledDate: string; scheduledTime: string; notes: string }) => {
    const customer = customersList.find(c => c.id === data.customerId);
    const config = JOB_TYPE_CONFIG[data.type];
    const newJob: Job = {
      id: `j${Date.now()}`,
      type: data.type,
      status: 'draft',
      priority: config.priority,
      customerId: data.customerId,
      technicianId: data.technicianId,
      scheduledDate: data.scheduledDate,
      scheduledTime: data.scheduledTime,
      estimatedDuration: config.duration,
      location: customer?.address || '',
      city: customer?.city || '',
      notes: data.notes,
      createdAt: new Date().toISOString().split('T')[0],
    };
    addLog(data.customerId, 'פתיחת קריאה', `${config.label} — ${data.notes}`, newJob.id);
    setJobs(prev => [...prev, newJob]);
  };

  const addCustomer = (data: { name: string; phone: string; address: string; city: string; email: string; product: string; lat?: number; lng?: number; placeId?: string; filterReplacementMonth?: number }) => {
    const newCustomer: Customer = {
      ...data,
      id: `c${Date.now()}`,
      filterReplacementMonth: data.filterReplacementMonth || (new Date().getMonth() + 1),
    };
    setCustomersList(prev => [...prev, newCustomer]);
  };

  const updateCustomer = (customerId: string, data: Partial<Customer>) => {
    setCustomersList(prev => prev.map(c => c.id === customerId ? { ...c, ...data } : c));
    addLog(customerId, 'עדכון פרטים', 'פרטי הלקוח עודכנו');
  };

  const distributeServiceTracks = (assignments: { customerId: string; track: ServiceTrack; nextServiceDate: string }[]) => {
    setCustomersList(prev => {
      const map = new Map(assignments.map(a => [a.customerId, a]));
      return prev.map(c => {
        const a = map.get(c.id);
        if (a) {
          addLog(c.id, 'שיוך מסלול', `שויך למסלול ${SERVICE_TRACK_CONFIG[a.track].label} — שירות הבא: ${a.nextServiceDate}`);
          return { ...c, serviceTrack: a.track, nextServiceDate: a.nextServiceDate };
        }
        return c;
      });
    });
  };

  const recalcNextServiceDate = (customerId: string) => {
    setCustomersList(prev => prev.map(c => {
      if (c.id !== customerId || !c.serviceTrack) return c;
      const interval = SERVICE_TRACK_CONFIG[c.serviceTrack].intervalMonths;
      const next = new Date();
      next.setMonth(next.getMonth() + interval);
      const nextDate = next.toISOString().split('T')[0];
      addLog(c.id, 'עדכון מועד', `שירות הבא עודכן ל-${nextDate} (${SERVICE_TRACK_CONFIG[c.serviceTrack].label})`);
      return { ...c, nextServiceDate: nextDate };
    }));
  };

  const resetServiceCycle = useCallback(() => {
    setJobs(prev => prev.filter(j => j.type !== 'filter_replacement'));
    setCustomersList(prev => prev.map(c => ({ ...c, filterReplacementMonth: 0 })));
  }, []);

  const getUnassignedJobs = () => jobs.filter(j => !j.technicianId && !j.scheduledDate);

  const getJobsByArea = () => {
    const grouped: Record<string, Job[]> = {};
    jobs.forEach(job => {
      if (!grouped[job.city]) grouped[job.city] = [];
      grouped[job.city].push(job);
    });
    return grouped;
  };

  const getJobsByTechnician = (techId: string) => {
    return jobs.filter(j => j.technicianId === techId);
  };

  const getCustomerLogs = (customerId: string) => activityLogs.filter(l => l.customerId === customerId);

  return { jobs, customersList, closedJobs, activityLogs, dataLoaded, updateJobStatus, approveSchedule, approveDaySchedule, completeJob, markJobCompletion, closeJob, returnJob, completeFilterJob, addJob, addCustomer, updateCustomer, assignJob, unassignJob, getUnassignedJobs, getJobsByArea, getJobsByTechnician, getCustomerLogs, distributeServiceTracks, recalcNextServiceDate, resetServiceCycle };
}
