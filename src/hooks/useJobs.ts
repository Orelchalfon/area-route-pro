import { useState, useCallback, useEffect } from 'react';
import { Job, JobStatus, JobType, JOB_TYPE_CONFIG, Customer, CompletionStatus, ServiceTrack, SERVICE_TRACK_CONFIG } from '@/types';
import { technicians, initialJobs } from '@/data/mockData';
import { loadCustomersFromCSV } from '@/lib/csvParser';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { useICSImport } from '@/hooks/useICSImport';
import { useCustomers } from '@/hooks/useCustomers';
import { useMalfunctionsInstallations } from '@/hooks/useMalfunctionsInstallations';
import { useScheduledFilterServices } from '@/hooks/useScheduledFilterServices';
import { supabase } from '@/integrations/supabase/client';
import { buildDbJobUpdatePatch, getDbJobRef, JobSyncPatch } from '@/lib/dbJobSync';
import { getDbSyncStatus } from '@/lib/dbSyncStatus';

function shouldResetStoredCoords(data: Partial<Customer>) {
  const updatesAddress = Object.prototype.hasOwnProperty.call(data, 'address') || Object.prototype.hasOwnProperty.call(data, 'city');
  const updatesCoords = Object.prototype.hasOwnProperty.call(data, 'lat') || Object.prototype.hasOwnProperty.call(data, 'lng') || Object.prototype.hasOwnProperty.call(data, 'placeId');

  return updatesAddress && !updatesCoords;
}

// Hook ordering stable v2 - malfunctions added
export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [closedJobs, setClosedJobs] = useState<Job[]>([]);
  const { activityLogs, addLog, getCustomerLogs } = useActivityLogs();
  const [dataLoaded, setDataLoaded] = useState(false);
  const { icsCustomers, icsJobs, icsLoaded } = useICSImport();
  const { customers: dbBaseCustomers, loaded: baseCustomersLoaded } = useCustomers();
  const {
    jobs: dbJobs,
    customers: dbCustomers,
    loaded: dbLoaded,
    loading: dbLoading,
    error: dbSyncError,
    lastSyncedAt: dbLastSyncedAt,
    realtimeStatus,
    refresh: refreshDbJobs,
  } = useMalfunctionsInstallations();
  const {
    jobs: scheduledFilterJobs,
    loaded: scheduledFilterLoaded,
  } = useScheduledFilterServices();
  const dbSyncStatus = getDbSyncStatus({
    loading: dbLoading,
    error: dbSyncError,
    realtimeStatus,
    loaded: dbLoaded,
  });

  // Single "everything the board needs is in" flag so the UI can reveal all job
  // types at once instead of painting synthetic filter jobs first and letting
  // the fetched malfunctions/installations pop in a beat later. It is flipped in
  // an effect (below) — after the merge effects have folded the fetched data into
  // `jobs` — not computed during render, which would go true a frame too early.
  const [boardReady, setBoardReady] = useState(false);

  const persistDbJob = useCallback((jobId: string, data: JobSyncPatch) => {
    const ref = getDbJobRef(jobId);
    if (!ref) return;

    const patch = buildDbJobUpdatePatch(data);
    supabase.from(ref.table).update(patch).eq('id', ref.dbId).then(({ error }) => {
      if (error) console.error(`Failed to persist ${ref.table} job ${jobId}:`, error);
    });
  }, []);

  // Filter (ongoing-service) jobs are synthetic and have no malfunctions/installations
  // row, so persistDbJob no-ops for them. Their scheduling lives in scheduled_filter_services
  // keyed by job_key (= the synthetic job id), upserted here.
  const persistFilterServiceRow = useCallback((job: Job, technicianId: string, scheduledDate: string, scheduledTime: string) => {
    supabase
      .from('scheduled_filter_services')
      .upsert({
        job_key: job.id,
        customer_id: job.customerId,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime || null,
        technician_id: technicianId || null,
        status: 'confirmed',
        estimated_duration: job.estimatedDuration,
        location: job.location || '',
        city: job.city || '',
        notes: job.notes || '',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'job_key' })
      .then(({ error }) => {
        if (error) console.error(`Failed to persist scheduled filter service ${job.id}:`, error);
      });
  }, []);

  // Schedule a filter job to a day: persist to DB and reflect it in global jobs so it
  // renders immediately and survives refresh.
  const assignFilterService = useCallback((job: Job, technicianId: string, scheduledDate: string, scheduledTime: string) => {
    persistFilterServiceRow(job, technicianId, scheduledDate, scheduledTime);
    const scheduledJob: Job = {
      ...job,
      status: 'confirmed',
      technicianId,
      scheduledDate,
      scheduledTime,
    };
    setJobs(prev => {
      const withoutSelf = prev.filter(j => j.id !== job.id);
      return [...withoutSelf, scheduledJob];
    });
  }, [persistFilterServiceRow]);

  // Remove a scheduled filter job: delete the DB row and drop it from global jobs.
  const unassignFilterService = useCallback((jobId: string) => {
    supabase
      .from('scheduled_filter_services')
      .delete()
      .eq('job_key', jobId)
      .then(({ error }) => {
        if (error) console.error(`Failed to remove scheduled filter service ${jobId}:`, error);
      });
    setJobs(prev => prev.filter(j => j.id !== jobId));
  }, []);

  // Load base customers: prefer the Supabase `customers` table (source of truth).
  // During the spreadsheet-retirement transition, fall back to the bundled
  // contacts.csv only while the customers table is still empty/unavailable.
  useEffect(() => {
    if (!baseCustomersLoaded) return;

    const setBaseCustomers = (base: Customer[]) => {
      setCustomersList(prev => {
        const derived = prev.filter(c => c.id.startsWith('db-malf-cust-') || c.id.startsWith('db-inst-cust-'));
        return [...base, ...derived];
      });
      setDataLoaded(true);
    };

    if (dbBaseCustomers.length > 0) {
      setBaseCustomers(dbBaseCustomers);
      return;
    }

    loadCustomersFromCSV('/contacts.csv')
      .then(setBaseCustomers)
      .catch(err => {
        console.error('Failed to load customers CSV fallback:', err);
        setDataLoaded(true);
      });
  }, [baseCustomersLoaded, dbBaseCustomers]);

  // Sync malfunctions + installations from DB (replaces previous CSV loaders)
  useEffect(() => {
    console.log('[merge] dataLoaded:', dataLoaded, 'dbLoaded:', dbLoaded, 'dbJobs:', dbJobs.length, 'dbCustomers:', dbCustomers.length, 'lastSyncedAt:', dbLastSyncedAt);
    if (!dataLoaded || !dbLoaded) return;

    setCustomersList(prev => {
      const withoutDb = prev.filter(c => !c.id.startsWith('db-malf-cust-') && !c.id.startsWith('db-inst-cust-'));
      return [...withoutDb, ...dbCustomers];
    });

    setJobs(prev => {
      const withoutDb = prev.filter(j => !j.id.startsWith('db-malf-') && !j.id.startsWith('db-inst-'));
      return [...withoutDb, ...dbJobs];
    });
  }, [dataLoaded, dbLoaded, dbJobs, dbCustomers, dbLastSyncedAt]);

  // Merge persisted scheduled filter (ongoing-service) jobs from the DB. These reconcile
  // with the board's synthetic filter ids via job_key (id === job_key), so a job that was
  // scheduled to a day survives a refresh instead of disappearing.
  useEffect(() => {
    if (!scheduledFilterLoaded) return;
    setJobs(prev => {
      const loadedIds = new Set(scheduledFilterJobs.map(j => j.id));
      const withoutLoaded = prev.filter(j => !loadedIds.has(j.id));
      return [...withoutLoaded, ...scheduledFilterJobs];
    });
  }, [scheduledFilterLoaded, scheduledFilterJobs]);

  // Reveal the board only once all three sources are loaded. Declared after the
  // merge effects above so, on the commit where the last source resolves, their
  // setJobs and this setBoardReady batch into one render — the skeleton hides on
  // the same frame the merged data becomes visible, never a frame early.
  useEffect(() => {
    if (dataLoaded && dbLoaded && scheduledFilterLoaded) setBoardReady(true);
  }, [dataLoaded, dbLoaded, scheduledFilterLoaded]);


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

  const updateJobStatus = (jobId: string, status: JobStatus) => {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status } : j));
    persistDbJob(jobId, { status });
  };

  const approveSchedule = (jobIds: string[]) => {
    setJobs(prev => prev.map(j => 
      jobIds.includes(j.id) && j.status === 'draft' 
        ? { ...j, status: 'pending_customer' as JobStatus } 
        : j
    ));
  };

  const approveDaySchedule = (assignments: { jobId: string; technicianId: string; scheduledDate: string; scheduledTime: string }[], jobObjects?: Job[]) => {
    setJobs(prev => {
      const assignmentMap = new Map(assignments.map(a => [a.jobId, a]));
      const existingIds = new Set(prev.map(j => j.id));
      
      // Update existing jobs
      const updated = prev.map(j => {
        const assignment = assignmentMap.get(j.id);
        if (assignment) {
          addLog(j.customerId, 'שיבוץ', `שובץ לתאריך ${assignment.scheduledDate} בשעה ${assignment.scheduledTime}`, j.id);
          if (j.type === 'filter_replacement') {
            persistFilterServiceRow(j, assignment.technicianId, assignment.scheduledDate, assignment.scheduledTime);
          } else {
            persistDbJob(j.id, {
              status: 'confirmed',
              technicianId: assignment.technicianId,
              scheduledDate: assignment.scheduledDate,
              scheduledTime: assignment.scheduledTime,
            });
          }
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
      
      // Add jobs that don't exist in global state yet (e.g. locally-generated filter jobs)
      if (jobObjects) {
        for (const job of jobObjects) {
          if (!existingIds.has(job.id)) {
            const assignment = assignmentMap.get(job.id);
            if (assignment) {
              addLog(job.customerId, 'שיבוץ', `שובץ לתאריך ${assignment.scheduledDate} בשעה ${assignment.scheduledTime}`, job.id);
              if (job.type === 'filter_replacement') {
                persistFilterServiceRow(job, assignment.technicianId, assignment.scheduledDate, assignment.scheduledTime);
              } else {
                persistDbJob(job.id, {
                  status: 'confirmed',
                  technicianId: assignment.technicianId,
                  scheduledDate: assignment.scheduledDate,
                  scheduledTime: assignment.scheduledTime,
                });
              }
              updated.push({
                ...job,
                status: 'confirmed' as JobStatus,
                technicianId: assignment.technicianId,
                scheduledDate: assignment.scheduledDate,
                scheduledTime: assignment.scheduledTime,
              });
            }
          }
        }
      }
      
      return updated;
    });
  };

  const completeJob = (jobId: string, notes: string) => {
    setJobs(prev => prev.map(j => 
      j.id === jobId ? { ...j, status: 'completed' as JobStatus, completionNotes: notes, completionStatus: 'done' as CompletionStatus } : j
    ));
    persistDbJob(jobId, { status: 'completed', completionNotes: notes, completionStatus: 'done' });
  };

  const markJobCompletion = (jobId: string, completionStatus: CompletionStatus, notes: string) => {
    const statusLabels: Record<CompletionStatus, string> = { done: 'בוצע', not_done: 'לא בוצע', need_return: 'צריך לחזור' };
    setJobs(prev => {
      const job = prev.find(j => j.id === jobId);
      if (job) addLog(job.customerId, `דיווח טכנאי: ${statusLabels[completionStatus]}`, notes || 'ללא הערות', jobId);
      if (job) persistDbJob(jobId, { status: 'completed', completionStatus, completionNotes: notes });
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
      persistDbJob(jobId, { status: 'completed' });
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
      persistDbJob(jobId, {
        status: 'draft',
        technicianId: null,
        scheduledDate: null,
        scheduledTime: null,
        completionStatus: null,
        completionNotes: null,
      });
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
        persistDbJob(jobId, { status: 'completed' });
        return prev.map(j => j.id === jobId ? { ...j, status: 'completed' as JobStatus } : j);
      }
      persistDbJob(jobId, { status: 'completed' });
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
    persistDbJob(jobId, { technicianId, scheduledDate, scheduledTime });
  };

  const updateJob = (jobId: string, data: Partial<Pick<Job, 'location' | 'city' | 'notes' | 'estimatedDuration' | 'priority' | 'type'>> & { lat?: number; lng?: number }) => {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...data } : j));

    persistDbJob(jobId, data);
  };

  const unassignJob = (jobId: string) => {
    setJobs(prev => prev.map(j => 
      j.id === jobId ? { ...j, status: 'draft' as JobStatus, technicianId: undefined, scheduledDate: undefined, scheduledTime: undefined } : j
    ));
    persistDbJob(jobId, {
      status: 'draft',
      technicianId: null,
      scheduledDate: null,
      scheduledTime: null,
    });
  };

  const addJob = (data: { type: JobType; customerId: string; technicianId: string; scheduledDate: string; scheduledTime: string; notes: string; status?: JobStatus; id?: string; estimatedDuration?: number; location?: string; city?: string }) => {
    const customer = customersList.find(c => c.id === data.customerId);
    const config = JOB_TYPE_CONFIG[data.type];
    const newJob: Job = {
      id: data.id || `j${Date.now()}`,
      type: data.type,
      status: data.status || 'draft',
      priority: config.priority,
      customerId: data.customerId,
      technicianId: data.technicianId,
      scheduledDate: data.scheduledDate,
      scheduledTime: data.scheduledTime,
      estimatedDuration: data.estimatedDuration || config.duration,
      location: data.location || customer?.address || '',
      city: data.city || customer?.city || '',
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
    return newCustomer;
  };

  const updateCustomer = useCallback((customerId: string, data: Partial<Customer>) => {
    const nextData = shouldResetStoredCoords(data)
      ? { ...data, lat: undefined, lng: undefined, placeId: undefined }
      : data;

    setCustomersList(prev => prev.map(c => c.id === customerId ? { ...c, ...nextData } : c));
    addLog(customerId, 'עדכון פרטים', 'פרטי הלקוח עודכנו');
  }, [addLog]);

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

  return { jobs, customersList, closedJobs, activityLogs, dataLoaded, boardReady, dbSyncStatus, dbSyncError: dbSyncError || undefined, dbLastSyncedAt: dbLastSyncedAt || undefined, refreshDbJobs, updateJobStatus, approveSchedule, approveDaySchedule, completeJob, markJobCompletion, closeJob, returnJob, completeFilterJob, addJob, addCustomer, updateCustomer, updateJob, assignJob, unassignJob, assignFilterService, unassignFilterService, getUnassignedJobs, getJobsByArea, getJobsByTechnician, getCustomerLogs, distributeServiceTracks, recalcNextServiceDate, resetServiceCycle };
}
