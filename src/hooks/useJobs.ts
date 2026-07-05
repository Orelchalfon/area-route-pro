import { useState, useCallback, useEffect, useMemo } from 'react';
import { Job, JobStatus, JobType, JOB_TYPE_CONFIG, Customer, CompletionStatus, ServiceTrack, SERVICE_TRACK_CONFIG } from '@/types';
import { technicians, initialJobs } from '@/data/mockData';
import { loadCustomersFromCSV } from '@/lib/csvParser';
import { formatHebrewDateTime } from '@/lib/dates';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { buildCalendarServiceData } from '@/lib/ongoingServiceCalendar';
import {
  useCustomers,
  upsertCustomerByImportKey,
  updateCustomerRow,
  customerDbId,
} from '@/hooks/useCustomers';
import { useMalfunctionsInstallations } from '@/hooks/useMalfunctionsInstallations';
import { useScheduledFilterServices } from '@/hooks/useScheduledFilterServices';
import { useApprovedDays } from '@/hooks/useApprovedDays';
import { useOngoingServices } from '@/hooks/useOngoingServices';
import { supabase } from '@/integrations/supabase/client';
import {
  buildDbJobUpdatePatch,
  getDbJobRef,
  JobSyncPatch,
  NewJobInsertInput,
  buildMalfunctionInsert,
  buildInstallationInsert,
  buildOngoingServiceInsert,
} from '@/lib/dbJobSync';
import { getDbSyncStatus } from '@/lib/dbSyncStatus';
import { toast } from 'sonner';

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
  const { approvedDayKeys, approveDay, unapproveDay } = useApprovedDays();
  const {
    jobs: ongoingJobs,
    customers: ongoingCustomers,
    services: ongoingServices,
    loaded: ongoingLoaded,
  } = useOngoingServices();

  // Calendar-derived service enrichment (filterReplacementMonth / serviceTrack / service
  // jobs) is rebuilt from the ongoing_services rows already fetched above, instead of
  // re-fetching and parsing the 3 MB /calendar_1.ics on every load. Same data, no extra
  // network. Kept under the `ics*` names so the existing merge effect is unchanged.
  const { customers: icsCustomers, jobs: icsJobs } = useMemo(
    () => buildCalendarServiceData(ongoingServices),
    [ongoingServices],
  );
  const icsLoaded = ongoingLoaded;
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

    switch (ref.table) {
      case 'malfunctions':
        supabase
          .from('malfunctions')
          .update(buildDbJobUpdatePatch(ref.table, data))
          .eq('id', ref.dbId)
          .then(({ error }) => {
            if (error) console.error(`Failed to persist ${ref.table} job ${jobId}:`, error);
          });
        break;
      case 'installations':
        supabase
          .from('installations')
          .update(buildDbJobUpdatePatch(ref.table, data))
          .eq('id', ref.dbId)
          .then(({ error }) => {
            if (error) console.error(`Failed to persist ${ref.table} job ${jobId}:`, error);
          });
        break;
      case 'ongoing_services':
        supabase
          .from('ongoing_services')
          .update(buildDbJobUpdatePatch(ref.table, data))
          .eq('id', ref.dbId)
          .then(({ error }) => {
            if (error) console.error(`Failed to persist ${ref.table} job ${jobId}:`, error);
          });
        break;
    }
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

  // Persist a technician's completion report for a synthetic filter job (filter-…),
  // which has no malfunctions/installations row (persistDbJob no-ops for it). Its row
  // lives in scheduled_filter_services keyed by job_key (= the synthetic id); updating
  // it there lets the change reach the manager board via that table's realtime channel.
  const persistFilterServiceCompletion = useCallback(
    (jobId: string, completionStatus: CompletionStatus, notes: string) => {
      supabase
        .from('scheduled_filter_services')
        .update({
          status: 'completed',
          completion_status: completionStatus,
          completion_notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq('job_key', jobId)
        .then(({ error }) => {
          if (error) console.error(`Failed to persist filter completion ${jobId}:`, error);
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

  // Merge ongoing-service request jobs from the DB (rows created via "פניה חדשה" →
  // שירות שוטף, identified by id prefix db-ongoing-). Only fallback derived customers
  // (db-ongoing-cust-) are folded in here; request rows that reference a real customer_id
  // already have their customer from useCustomers.
  useEffect(() => {
    if (!ongoingLoaded) return;
    setCustomersList(prev => {
      const withoutOngoing = prev.filter(c => !c.id.startsWith('db-ongoing-cust-'));
      const derived = ongoingCustomers.filter(c => c.id.startsWith('db-ongoing-cust-'));
      return [...withoutOngoing, ...derived];
    });
    setJobs(prev => {
      const withoutOngoing = prev.filter(j => !j.id.startsWith('db-ongoing-'));
      return [...withoutOngoing, ...ongoingJobs];
    });
  }, [ongoingLoaded, ongoingJobs, ongoingCustomers]);

  // Reveal the board only once all sources are loaded. Declared after the
  // merge effects above so, on the commit where the last source resolves, their
  // setJobs and this setBoardReady batch into one render — the skeleton hides on
  // the same frame the merged data becomes visible, never a frame early.
  useEffect(() => {
    if (dataLoaded && dbLoaded && scheduledFilterLoaded && ongoingLoaded) setBoardReady(true);
  }, [dataLoaded, dbLoaded, scheduledFilterLoaded, ongoingLoaded]);


  // Merge calendar service data (derived from ongoing_services): update existing customers'
  // filterReplacementMonth & serviceTrack, add calendar-only customers, and add service jobs.
  useEffect(() => {
    if (!icsLoaded || !dataLoaded || icsCustomers.length === 0) return;

    // Precompute each calendar customer's normalized name forms once so the nested
    // name-matching below doesn't re-run .trim()/.toLowerCase() on every comparison.
    // `trimmed` is case-sensitive and `lower` is case-insensitive, matching the exact
    // semantics of the original conditions (exact = lowercased; substring = trim-only).
    const icsNorm = icsCustomers.map(ic => {
      const trimmed = ic.name.trim();
      return { ic, trimmed, lower: trimmed.toLowerCase() };
    });

    // Update existing customers with calendar data (match by name). Drop any
    // previously-added calendar-only customers first so a realtime refresh re-syncs
    // instead of accumulating stale ics-c entries.
    setCustomersList(prev => {
      const updated = prev.filter(c => !c.id.startsWith('ics-c')).map(c => {
        const ct = c.name.trim();
        const cl = ct.toLowerCase();
        const match = icsNorm.find(n =>
          n.lower === cl || ct.includes(n.trimmed) || n.trimmed.includes(ct)
        );
        if (match) {
          return {
            ...c,
            filterReplacementMonth: match.ic.filterReplacementMonth,
            serviceTrack: c.serviceTrack || match.ic.serviceTrack,
            city: c.city || match.ic.city,
          };
        }
        return c;
      });

      // Add calendar customers that don't already exist (by name). Build the existing
      // lowercased names once instead of per-candidate.
      const existingLower = updated.map(c => c.name.trim().toLowerCase());
      const newCustomers = icsNorm
        .filter(n => !existingLower.some(en => en.includes(n.lower) || n.lower.includes(en)))
        .map(n => n.ic);

      return [...updated, ...newCustomers];
    });

    // Add calendar service jobs, remapping customerIds to match existing customers.
    // Drop any previously-merged ics- jobs first so a realtime refresh of the
    // underlying ongoing_services rows re-syncs instead of appending duplicates.
    setJobs(prev => {
      const withoutIcs = prev.filter(j => !j.id.startsWith('ics-'));
      // Precompute lookups once: calendar customer by id, and existing customers'
      // normalized names (same case-sensitivity split as above).
      const icsById = new Map(icsCustomers.map(ic => [ic.id, ic]));
      const custNorm = customersList.map(c => {
        const trimmed = c.name.trim();
        return { c, trimmed, lower: trimmed.toLowerCase() };
      });
      const newJobs = icsJobs.map(job => {
        const icsCustomer = icsById.get(job.customerId);
        if (!icsCustomer) return job;

        const it = icsCustomer.name.trim();
        const il = it.toLowerCase();
        const match = custNorm.find(n =>
          n.lower === il || n.trimmed.includes(it) || it.includes(n.trimmed)
        );

        return match ? { ...job, customerId: match.c.id } : job;
      });

      return [...withoutIcs, ...newJobs];
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
      if (job) {
        // Route by id: db-malf/inst/ongoing rows persist via persistDbJob; synthetic
        // filter-… jobs have no such row, so their completion goes to scheduled_filter_services.
        if (getDbJobRef(jobId)) {
          persistDbJob(jobId, { status: 'completed', completionStatus, completionNotes: notes });
        } else if (jobId.startsWith('filter-')) {
          persistFilterServiceCompletion(jobId, completionStatus, notes);
        }
      }
      return prev.map(j =>
        j.id === jobId ? { ...j, status: 'completed' as JobStatus, completionStatus, completionNotes: notes } : j
      );
    });
  };

  // Archive a synthetic filter job's scheduled_filter_services row (persistDbJob no-ops for
  // filter-… ids). Used by closeJob/archiveJob so closed/deleted filter jobs don't reload
  // onto the board or the service list.
  const archiveFilterServiceRow = useCallback((jobId: string) => {
    supabase
      .from('scheduled_filter_services')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('job_key', jobId)
      .then(({ error }) => {
        if (error) console.error(`Failed to archive scheduled filter service ${jobId}:`, error);
      });
  }, []);

  const closeJob = (jobId: string) => {
    setJobs(prev => {
      const job = prev.find(j => j.id === jobId);
      if (!job) return prev;

      addLog(job.customerId, 'סגירת קריאה', `קריאה ${JOB_TYPE_CONFIG[job.type].label} נסגרה`, jobId);
      // Mark closed (archived) so the row is hidden everywhere on next load but kept in the DB.
      if (jobId.startsWith('filter-')) {
        archiveFilterServiceRow(jobId);
      } else {
        persistDbJob(jobId, { status: 'archived' });
      }
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

      // Synthetic filter (שירות שוטף) jobs have no malfunctions/installations row, so
      // persistDbJob no-ops for them and they'd stay on the board. Delete their
      // scheduled_filter_services row instead: the job drops back into the auto-generated
      // unassigned pool and no longer renders on any day.
      if (jobId.startsWith('filter-')) {
        supabase
          .from('scheduled_filter_services')
          .delete()
          .eq('job_key', jobId)
          .then(({ error }) => {
            if (error) console.error(`Failed to return filter service ${jobId}:`, error);
          });
        return prev.filter(j => j.id !== jobId);
      }

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
        completionStatus: undefined,
        completionNotes: undefined,
      } : j);
    });
  };

  // Hide a job from the active pages/board without deleting it: mark its row 'archived'
  // (kept in the DB) and drop it from local state. Synthetic filter jobs archive their
  // scheduled_filter_services row; db-malf/inst/ongoing go through persistDbJob.
  const archiveJob = useCallback((jobId: string) => {
    if (jobId.startsWith('filter-')) {
      archiveFilterServiceRow(jobId);
    } else {
      persistDbJob(jobId, { status: 'archived' });
    }
    setJobs(prev => prev.filter(j => j.id !== jobId));
  }, [archiveFilterServiceRow, persistDbJob]);

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

  const updateJob = (jobId: string, data: Partial<Pick<Job, 'location' | 'city' | 'notes' | 'estimatedDuration' | 'priority' | 'type' | 'phone'>> & { lat?: number; lng?: number }) => {
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

  // Back up a customer to the customers table so every request links to a persisted
  // customer. No-op (returns as-is) for customers already in the table. Keyed on
  // import_key so it is idempotent across CSV/ICS imports and repeat saves.
  const ensureCustomerInDb = useCallback(async (customer?: Customer): Promise<Customer | undefined> => {
    if (!customer) return undefined;
    if (customer.id.startsWith('db-cust-')) return customer;
    try {
      return await upsertCustomerByImportKey(customer);
    } catch (e) {
      console.error('Failed to back up customer to DB:', e);
      return customer;
    }
  }, []);

  // Create a new request ("פניה חדשה"). It is written to its source table
  // (malfunction→malfunctions, installation→installations, filter_replacement→ongoing_services)
  // and — when no technician/date is provided — stays unscheduled, landing in the
  // "ממתינים לשיבוץ" pool and OFF the monthly board until the manager schedules it.
  const addJob = async (data: { type: JobType; customerId: string; technicianId: string; scheduledDate: string; scheduledTime: string; notes: string; status?: JobStatus; id?: string; estimatedDuration?: number; location?: string; city?: string }) => {
    const customer = customersList.find(c => c.id === data.customerId);
    const config = JOB_TYPE_CONFIG[data.type];
    const persistedCustomer = await ensureCustomerInDb(customer);
    const location = data.location || customer?.address || '';
    const city = data.city || customer?.city || '';
    const estimatedDuration = data.estimatedDuration || config.duration;

    const input: NewJobInsertInput = {
      customerId: persistedCustomer?.id,
      customerName: customer?.name || 'ללא שם',
      phone: customer?.phone || '',
      city,
      address: location,
      notes: data.notes,
      productType: customer?.product || '',
      technicianId: data.technicianId || null,
      scheduledDate: data.scheduledDate || null,
      scheduledTime: data.scheduledTime || null,
      estimatedDuration,
    };

    let newId: string | null = null;
    try {
      if (data.type === 'malfunction') {
        const { data: row, error } = await supabase.from('malfunctions').insert(buildMalfunctionInsert(input)).select('id').single();
        if (error) throw error;
        newId = `db-malf-${row.id}`;
      } else if (data.type === 'installation') {
        const { data: row, error } = await supabase.from('installations').insert(buildInstallationInsert(input)).select('id').single();
        if (error) throw error;
        newId = `db-inst-${row.id}`;
      } else {
        const serviceDate = data.scheduledDate || new Date().toISOString().split('T')[0];
        const { data: row, error } = await supabase.from('ongoing_services').insert(buildOngoingServiceInsert(input, serviceDate)).select('id').single();
        if (error) throw error;
        newId = `db-ongoing-${row.id}`;
      }
    } catch (e) {
      console.error('Failed to persist new job:', e);
      toast.error('שמירת הפנייה נכשלה — נסה שוב');
    }

    const newJob: Job = {
      id: newId || data.id || `j${Date.now()}`,
      type: data.type,
      status: data.status || 'draft',
      priority: config.priority,
      customerId: persistedCustomer?.id || data.customerId,
      technicianId: data.technicianId || undefined,
      scheduledDate: data.scheduledDate || undefined,
      scheduledTime: data.scheduledTime || undefined,
      estimatedDuration,
      location,
      city,
      notes: data.notes,
      createdAt: new Date().toISOString().split('T')[0],
      // date stamp — when the request is opened (Hebrew display, date + time)
      openedDate: formatHebrewDateTime(),
    };
    addLog(newJob.customerId, 'פתיחת קריאה', `${config.label} — ${data.notes}`, newJob.id);
    setJobs(prev => [...prev, newJob]);
  };

  const addCustomer = (data: { name: string; phone: string; address: string; city: string; email: string; product: string; lat?: number; lng?: number; placeId?: string; filterReplacementMonth?: number }) => {
    const newCustomer: Customer = {
      ...data,
      id: `c${Date.now()}`,
      filterReplacementMonth: data.filterReplacementMonth || (new Date().getMonth() + 1),
    };
    setCustomersList(prev => [...prev, newCustomer]);
    // Persist to the customers table (backup + going-forward). Realtime folds in the
    // db-cust- row; the import_key upsert keeps this idempotent with addJob's backup.
    upsertCustomerByImportKey(newCustomer).catch(e => console.error('Failed to persist new customer:', e));
    return newCustomer;
  };

  const updateCustomer = useCallback((customerId: string, data: Partial<Customer>) => {
    const nextData = shouldResetStoredCoords(data)
      ? { ...data, lat: undefined, lng: undefined, placeId: undefined }
      : data;

    setCustomersList(prev => prev.map(c => c.id === customerId ? { ...c, ...nextData } : c));
    addLog(customerId, 'עדכון פרטים', 'פרטי הלקוח עודכנו');

    // Persist the edit. db-cust- customers update their row directly; in-memory
    // (CSV/ICS) or job-derived customers get upserted so the edit is backed up.
    const uuid = customerDbId(customerId);
    if (uuid) {
      updateCustomerRow(uuid, nextData).catch(e => console.error('Failed to update customer:', e));
    } else {
      const existing = customersList.find(c => c.id === customerId);
      if (existing) {
        upsertCustomerByImportKey({ ...existing, ...nextData }).catch(e => console.error('Failed to back up customer:', e));
      }
    }
  }, [addLog, customersList]);

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

  return { jobs, customersList, closedJobs, ongoingServices, activityLogs, dataLoaded, boardReady, dbSyncStatus, dbSyncError: dbSyncError || undefined, dbLastSyncedAt: dbLastSyncedAt || undefined, refreshDbJobs, updateJobStatus, approveSchedule, approveDaySchedule, approvedDayKeys, approveDay, unapproveDay, completeJob, markJobCompletion, closeJob, returnJob, archiveJob, completeFilterJob, addJob, addCustomer, updateCustomer, updateJob, assignJob, unassignJob, assignFilterService, unassignFilterService, getUnassignedJobs, getJobsByArea, getJobsByTechnician, getCustomerLogs, addLog, distributeServiceTracks, recalcNextServiceDate, resetServiceCycle };
}
