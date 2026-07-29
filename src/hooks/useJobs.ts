import { useActivityLogs } from "@/hooks/useActivityLogs";
import { useApprovedDays } from "@/hooks/useApprovedDays";
import {
  customerDbId,
  updateCustomerRow,
  upsertCustomerByImportKey,
  useCustomers,
} from "@/hooks/useCustomers";
import { useMalfunctionsInstallations } from "@/hooks/useMalfunctionsInstallations";
import { useOngoingServices } from "@/hooks/useOngoingServices";
import { useScheduledFilterServices } from "@/hooks/useScheduledFilterServices";
import { supabase } from "@/integrations/supabase/client";
import { loadCustomersFromCSV } from "@/lib/csvParser";
import { formatHebrewDateTime } from "@/lib/dates";
import {
  buildDbJobUpdatePatch,
  buildInstallationInsert,
  buildMalfunctionInsert,
  buildOngoingServiceInsert,
  getDbJobRef,
  JobSyncPatch,
  NewJobInsertInput,
} from "@/lib/dbJobSync";
import { getDbSyncStatus } from "@/lib/dbSyncStatus";
import {
  isDbCustomer,
  isFilterJob,
  isIcsCustomer,
  isIcsJob,
  isInstallationCustomer,
  isInstallationJob,
  isMalfunctionCustomer,
  isMalfunctionJob,
  isOngoingCustomer,
  isOngoingJob,
  makeFilterJobId,
  makeInstallationCustomerId,
  makeInstallationJobId,
  makeMalfunctionCustomerId,
  makeMalfunctionJobId,
  makeOngoingJobId,
} from "@/lib/idConventions";
import { buildCalendarServiceData } from "@/lib/ongoingServiceCalendar";
import {
  CompletionStatus,
  Customer,
  Job,
  JOB_TYPE_CONFIG,
  JobStatus,
  JobType,
  SERVICE_TRACK_CONFIG,
  ServiceTrack,
} from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

function shouldResetStoredCoords(data: Partial<Customer>) {
  const updatesAddress =
    Object.prototype.hasOwnProperty.call(data, "address") ||
    Object.prototype.hasOwnProperty.call(data, "city");
  const updatesCoords =
    Object.prototype.hasOwnProperty.call(data, "lat") ||
    Object.prototype.hasOwnProperty.call(data, "lng") ||
    Object.prototype.hasOwnProperty.call(data, "placeId");

  return updatesAddress && !updatesCoords;
}

// Hook ordering stable v2 - malfunctions added
export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [closedJobs, setClosedJobs] = useState<Job[]>([]);
  const { activityLogs, addLog, getCustomerLogs } = useActivityLogs();
  const [dataLoaded, setDataLoaded] = useState(false);
  const { customers: dbBaseCustomers, loaded: baseCustomersLoaded } =
    useCustomers();
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
    refresh: refreshScheduledFilterServices,
  } =
    useScheduledFilterServices();
  const { approvedDayKeys, lockedDayKeys, approveDay, unapproveDay, lockDay, unlockDay } =
    useApprovedDays();
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

  const handlePersistFailure = useCallback(
    (message: string, error: unknown) => {
      console.error(message, error);
      toast.error("שמירת השינוי נכשלה", {
        description: "הנתונים יסונכרנו מחדש",
      });
      void refreshDbJobs();
      void refreshScheduledFilterServices();
    },
    [refreshDbJobs, refreshScheduledFilterServices],
  );

  const persistDbJob = useCallback(async (jobId: string, data: JobSyncPatch) => {
    const ref = getDbJobRef(jobId);
    if (!ref) return;

    switch (ref.table) {
      case "malfunctions": {
        const { error } = await supabase
          .from("malfunctions")
          .update(buildDbJobUpdatePatch(ref.table, data))
          .eq("id", ref.dbId);
        if (error) throw error;
        break;
      }
      case "installations": {
        const { error } = await supabase
          .from("installations")
          .update(buildDbJobUpdatePatch(ref.table, data))
          .eq("id", ref.dbId);
        if (error) throw error;
        break;
      }
      case "ongoing_services": {
        const { error } = await supabase
          .from("ongoing_services")
          .update(buildDbJobUpdatePatch(ref.table, data))
          .eq("id", ref.dbId);
        if (error) throw error;
        break;
      }
    }
  }, []);

  // Filter (ongoing-service) jobs are synthetic and have no malfunctions/installations
  // row, so persistDbJob no-ops for them. Their scheduling lives in scheduled_filter_services
  // keyed by job_key (= the synthetic job id), upserted here.
  const persistFilterServiceRow = useCallback(
    async (
      job: Job,
      technicianId: string,
      scheduledDate: string,
      scheduledTime: string,
    ) => {
      const { error } = await supabase
        .from("scheduled_filter_services")
        .upsert(
          {
            job_key: job.id,
            customer_id: job.customerId,
            scheduled_date: scheduledDate,
            scheduled_time: scheduledTime || null,
            technician_id: technicianId || null,
            status: "confirmed",
            estimated_duration: job.estimatedDuration,
            location: job.location || "",
            city: job.city || "",
            notes: job.notes || "",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "job_key" },
        );
      if (error) throw error;
    },
    [],
  );

  // Persist a technician's completion report for a synthetic filter job (filter-…),
  // which has no malfunctions/installations row (persistDbJob no-ops for it). Its row
  // lives in scheduled_filter_services keyed by job_key (= the synthetic id); updating
  // it there lets the change reach the manager board via that table's realtime channel.
  const persistFilterServiceCompletion = useCallback(
    async (jobId: string, completionStatus: CompletionStatus, notes: string) => {
      const { error } = await supabase
        .from("scheduled_filter_services")
        .update({
          status: "completed",
          completion_status: completionStatus,
          completion_notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq("job_key", jobId);
      if (error) throw error;
    },
    [],
  );

  const persistDbJobSafely = useCallback(
    (jobId: string, data: JobSyncPatch) => {
      void persistDbJob(jobId, data).catch((error) =>
        handlePersistFailure(`Failed to persist job ${jobId}`, error),
      );
    },
    [handlePersistFailure, persistDbJob],
  );

  // Undo a technician's completion report for a synthetic filter job (filter-…),
  // mirroring persistFilterServiceCompletion in reverse: back to 'confirmed' with
  // the completion fields cleared, without touching the assignment itself.
  const persistFilterServiceReset = useCallback(async (jobId: string) => {
    const { error } = await supabase
      .from("scheduled_filter_services")
      .update({
        status: "confirmed",
        completion_status: null,
        completion_notes: null,
        updated_at: new Date().toISOString(),
      })
      .eq("job_key", jobId);
    if (error) throw error;
  }, []);

  const persistFilterServiceResetSafely = useCallback(
    (jobId: string) => {
      void persistFilterServiceReset(jobId).catch((error) =>
        handlePersistFailure(`Failed to reset filter completion ${jobId}`, error),
      );
    },
    [handlePersistFailure, persistFilterServiceReset],
  );

  const persistFilterServiceRowSafely = useCallback(
    (
      job: Job,
      technicianId: string,
      scheduledDate: string,
      scheduledTime: string,
    ) => {
      void persistFilterServiceRow(job, technicianId, scheduledDate, scheduledTime).catch((error) =>
        handlePersistFailure(`Failed to persist scheduled filter service ${job.id}`, error),
      );
    },
    [handlePersistFailure, persistFilterServiceRow],
  );

  const persistFilterServiceCompletionSafely = useCallback(
    (jobId: string, completionStatus: CompletionStatus, notes: string) => {
      void persistFilterServiceCompletion(jobId, completionStatus, notes).catch((error) =>
        handlePersistFailure(`Failed to persist filter completion ${jobId}`, error),
      );
    },
    [handlePersistFailure, persistFilterServiceCompletion],
  );

  // Schedule a filter job to a day: persist to DB and reflect it in global jobs so it
  // renders immediately and survives refresh.
  const assignFilterService = useCallback(
    (
      job: Job,
      technicianId: string,
      scheduledDate: string,
      scheduledTime: string,
    ) => {
      persistFilterServiceRowSafely(job, technicianId, scheduledDate, scheduledTime);
      const scheduledJob: Job = {
        ...job,
        status: "confirmed",
        technicianId,
        scheduledDate,
        scheduledTime,
      };
      setJobs((prev) => {
        const withoutSelf = prev.filter((j) => j.id !== job.id);
        return [...withoutSelf, scheduledJob];
      });
    },
    [persistFilterServiceRowSafely],
  );

  // Remove a scheduled filter job: delete the DB row and drop it from global jobs.
  const unassignFilterService = useCallback((jobId: string) => {
    void supabase
      .from("scheduled_filter_services")
      .delete()
      .eq("job_key", jobId)
      .then(({ error }) => {
        if (error) throw error;
      })
      .catch((error) => {
        handlePersistFailure(`Failed to remove scheduled filter service ${jobId}`, error);
      });
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  }, [handlePersistFailure]);

  // Load base customers: prefer the Supabase `customers` table (source of truth).
  // During the spreadsheet-retirement transition, fall back to the bundled
  // contacts.csv only while the customers table is still empty/unavailable.
  useEffect(() => {
    if (!baseCustomersLoaded) return;

    const setBaseCustomers = (base: Customer[]) => {
      setCustomersList((prev) => {
        const derived = prev.filter(
          (c) => isMalfunctionCustomer(c.id) || isInstallationCustomer(c.id),
        );
        return [...base, ...derived];
      });
      setDataLoaded(true);
    };

    if (dbBaseCustomers.length > 0) {
      setBaseCustomers(dbBaseCustomers);
      return;
    }

    loadCustomersFromCSV("/contacts.csv")
      .then(setBaseCustomers)
      .catch((err) => {
        console.error("Failed to load customers CSV fallback:", err);
        setDataLoaded(true);
      });
  }, [baseCustomersLoaded, dbBaseCustomers]);

  // Sync malfunctions + installations from DB (replaces previous CSV loaders)
  useEffect(() => {
    if (!dataLoaded || !dbLoaded) return;

    setCustomersList((prev) => {
      const withoutDb = prev.filter(
        (c) => !isMalfunctionCustomer(c.id) && !isInstallationCustomer(c.id),
      );
      return [...withoutDb, ...dbCustomers];
    });

    setJobs((prev) => {
      const withoutDb = prev.filter(
        (j) => !isMalfunctionJob(j.id) && !isInstallationJob(j.id),
      );
      return [...withoutDb, ...dbJobs];
    });
  }, [dataLoaded, dbLoaded, dbJobs, dbCustomers, dbLastSyncedAt]);

  // Merge persisted scheduled filter (ongoing-service) jobs from the DB. These reconcile
  // with the board's synthetic filter ids via job_key (id === job_key), so a job that was
  // scheduled to a day survives a refresh instead of disappearing.
  useEffect(() => {
    if (!scheduledFilterLoaded) return;
    setJobs((prev) => {
      // scheduled_filter_services is only for synthetic filter-… jobs. Ignore any row
      // whose job_key is a real DB id (e.g. a stale db-ongoing-* row left by the old
      // approve path) so it can't hijack the ongoing_services-sourced job of the same id.
      const filterOnly = scheduledFilterJobs.filter((j) => isFilterJob(j.id));
      const loadedIds = new Set(filterOnly.map((j) => j.id));
      const withoutLoaded = prev.filter((j) => !loadedIds.has(j.id));
      return [...withoutLoaded, ...filterOnly];
    });
  }, [scheduledFilterLoaded, scheduledFilterJobs]);

  // Merge ongoing-service request jobs from the DB (rows created via "פניה חדשה" →
  // שירות שוטף, identified by id prefix db-ongoing-). Only fallback derived customers
  // (db-ongoing-cust-) are folded in here; request rows that reference a real customer_id
  // already have their customer from useCustomers.
  useEffect(() => {
    if (!ongoingLoaded) return;
    setCustomersList((prev) => {
      const withoutOngoing = prev.filter((c) => !isOngoingCustomer(c.id));
      const derived = ongoingCustomers.filter((c) => isOngoingCustomer(c.id));
      return [...withoutOngoing, ...derived];
    });
    setJobs((prev) => {
      const withoutOngoing = prev.filter(
        (j) => !isOngoingJob(j.id),
      );
      return [...withoutOngoing, ...ongoingJobs];
    });
  }, [ongoingLoaded, ongoingJobs, ongoingCustomers]);

  // Reveal the board only once all sources are loaded. Declared after the
  // merge effects above so, on the commit where the last source resolves, their
  // setJobs and this setBoardReady batch into one render — the skeleton hides on
  // the same frame the merged data becomes visible, never a frame early.
  useEffect(() => {
    if (dataLoaded && dbLoaded && scheduledFilterLoaded && ongoingLoaded)
      setBoardReady(true);
  }, [dataLoaded, dbLoaded, scheduledFilterLoaded, ongoingLoaded]);

  // Merge calendar service data (derived from ongoing_services): update existing customers'
  // filterReplacementMonth & serviceTrack, add calendar-only customers, and add service jobs.
  useEffect(() => {
    if (!icsLoaded || !dataLoaded || icsCustomers.length === 0) return;

    // Precompute each calendar customer's normalized name forms once so the nested
    // name-matching below doesn't re-run .trim()/.toLowerCase() on every comparison.
    // `trimmed` is case-sensitive and `lower` is case-insensitive, matching the exact
    // semantics of the original conditions (exact = lowercased; substring = trim-only).
    const icsNorm = icsCustomers.map((ic) => {
      const trimmed = ic.name.trim();
      return { ic, trimmed, lower: trimmed.toLowerCase() };
    });

    // Update existing customers with calendar data (match by name). Drop any
    // previously-added calendar-only customers first so a realtime refresh re-syncs
    // instead of accumulating stale ics-c entries.
    setCustomersList((prev) => {
      const updated = prev
        .filter((c) => !isIcsCustomer(c.id))
        .map((c) => {
          const ct = c.name.trim();
          const cl = ct.toLowerCase();
          const match = icsNorm.find(
            (n) =>
              n.lower === cl ||
              ct.includes(n.trimmed) ||
              n.trimmed.includes(ct),
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
      const existingLower = updated.map((c) => c.name.trim().toLowerCase());
      const newCustomers = icsNorm
        .filter(
          (n) =>
            !existingLower.some(
              (en) => en.includes(n.lower) || n.lower.includes(en),
            ),
        )
        .map((n) => n.ic);

      return [...updated, ...newCustomers];
    });

    // Add calendar service jobs, remapping customerIds to match existing customers.
    // Drop any previously-merged ics- jobs first so a realtime refresh of the
    // underlying ongoing_services rows re-syncs instead of appending duplicates.
    setJobs((prev) => {
      const withoutIcs = prev.filter((j) => !isIcsJob(j.id));
      // Precompute lookups once: calendar customer by id, and existing customers'
      // normalized names (same case-sensitivity split as above).
      const icsById = new Map(icsCustomers.map((ic) => [ic.id, ic]));
      const custNorm = customersList.map((c) => {
        const trimmed = c.name.trim();
        return { c, trimmed, lower: trimmed.toLowerCase() };
      });
      const newJobs = icsJobs.map((job) => {
        const icsCustomer = icsById.get(job.customerId);
        if (!icsCustomer) return job;

        const it = icsCustomer.name.trim();
        const il = it.toLowerCase();
        const match = custNorm.find(
          (n) =>
            n.lower === il || n.trimmed.includes(it) || it.includes(n.trimmed),
        );

        return match ? { ...job, customerId: match.c.id } : job;
      });

      return [...withoutIcs, ...newJobs];
    });
  }, [icsLoaded, dataLoaded, icsCustomers.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateJobStatus = (jobId: string, status: JobStatus) => {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status } : j)));
    persistDbJobSafely(jobId, { status });
  };

  const approveSchedule = (jobIds: string[]) => {
    setJobs((prev) =>
      prev.map((j) =>
        jobIds.includes(j.id) && j.status === "draft"
          ? { ...j, status: "pending_customer" as JobStatus }
          : j,
      ),
    );
  };

  const approveDaySchedule = (
    assignments: {
      jobId: string;
      technicianId: string;
      scheduledDate: string;
      scheduledTime: string;
    }[],
    jobObjects?: Job[],
  ) => {
    setJobs((prev) => {
      const assignmentMap = new Map(assignments.map((a) => [a.jobId, a]));
      const existingIds = new Set(prev.map((j) => j.id));

      // Update existing jobs
      const updated = prev.map((j) => {
        const assignment = assignmentMap.get(j.id);
        if (assignment) {
          addLog(
            j.customerId,
            "שיבוץ",
            `שובץ לתאריך ${assignment.scheduledDate} בשעה ${assignment.scheduledTime}`,
            j.id,
          );
          // Route by id, not by type: db-ongoing-* rows are typed "filter_replacement"
          // yet live in the ongoing_services table, so routing on type wrongly sent them
          // to scheduled_filter_services and their real row never got status:'confirmed'
          // (the ongoing merge then reverted them to 'draft' → dropped from the tech view).
          if (getDbJobRef(j.id)) {
            persistDbJobSafely(j.id, {
              status: "confirmed",
              technicianId: assignment.technicianId,
              scheduledDate: assignment.scheduledDate,
              scheduledTime: assignment.scheduledTime,
            });
          } else if (isFilterJob(j.id)) {
            persistFilterServiceRowSafely(
              j,
              assignment.technicianId,
              assignment.scheduledDate,
              assignment.scheduledTime,
            );
          }
          return {
            ...j,
            status: "confirmed" as JobStatus,
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
              addLog(
                job.customerId,
                "שיבוץ",
                `שובץ לתאריך ${assignment.scheduledDate} בשעה ${assignment.scheduledTime}`,
                job.id,
              );
              // Route by id (see the update loop above): db-ongoing-* must persist to
              // ongoing_services, not scheduled_filter_services, despite its type.
              if (getDbJobRef(job.id)) {
                persistDbJobSafely(job.id, {
                  status: "confirmed",
                  technicianId: assignment.technicianId,
                  scheduledDate: assignment.scheduledDate,
                  scheduledTime: assignment.scheduledTime,
                });
              } else if (isFilterJob(job.id)) {
                persistFilterServiceRowSafely(
                  job,
                  assignment.technicianId,
                  assignment.scheduledDate,
                  assignment.scheduledTime,
                );
              }
              updated.push({
                ...job,
                status: "confirmed" as JobStatus,
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
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              status: "completed" as JobStatus,
              completionNotes: notes,
              completionStatus: "done" as CompletionStatus,
            }
          : j,
      ),
    );
    persistDbJobSafely(jobId, {
      status: "completed",
      completionNotes: notes,
      completionStatus: "done",
    });
  };

  const markJobCompletion = (
    jobId: string,
    completionStatus: CompletionStatus,
    notes: string,
  ) => {
    const statusLabels: Record<CompletionStatus, string> = {
      done: "בוצע",
      not_done: "לא בוצע",
      need_return: "צריך לחזור",
    };
    setJobs((prev) => {
      const job = prev.find((j) => j.id === jobId);
      if (job)
        addLog(
          job.customerId,
          `דיווח טכנאי: ${statusLabels[completionStatus]}`,
          notes || "ללא הערות",
          jobId,
        );
      if (job) {
        // Route by id: db-malf/inst/ongoing rows persist via persistDbJob; synthetic
        // filter-… jobs have no such row, so their completion goes to scheduled_filter_services.
        if (getDbJobRef(jobId)) {
          persistDbJobSafely(jobId, {
            status: "completed",
            completionStatus,
            completionNotes: notes,
          });
        } else if (isFilterJob(jobId)) {
          persistFilterServiceCompletionSafely(jobId, completionStatus, notes);
        }
      }
      return prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              status: "completed" as JobStatus,
              completionStatus,
              completionNotes: notes,
            }
          : j,
      );
    });
  };

  // Undo every technician completion report for a technician's day, e.g. when a
  // manager cancels day approval and chooses to reset it. Unlike returnJob, this
  // keeps the job assigned (technicianId/scheduledDate/scheduledTime untouched) —
  // only the completion report itself is cleared, back to 'confirmed'.
  const resetDayCompletions = (technicianId: string, dateStr: string) => {
    setJobs((prev) => {
      const dayJobs = prev.filter(
        (j) =>
          j.technicianId === technicianId &&
          j.scheduledDate === dateStr &&
          j.completionStatus,
      );
      dayJobs.forEach((job) => {
        addLog(
          job.customerId,
          "איפוס דיווח",
          "אישור היום בוטל — הדיווח אופס",
          job.id,
        );
        if (getDbJobRef(job.id)) {
          persistDbJobSafely(job.id, {
            status: "confirmed",
            completionStatus: null,
            completionNotes: null,
          });
        } else if (isFilterJob(job.id)) {
          persistFilterServiceResetSafely(job.id);
        }
      });
      const dayJobIds = new Set(dayJobs.map((j) => j.id));
      return prev.map((j) =>
        dayJobIds.has(j.id)
          ? {
              ...j,
              status: "confirmed" as JobStatus,
              completionStatus: undefined,
              completionNotes: undefined,
            }
          : j,
      );
    });
  };

  // Archive a synthetic filter job's scheduled_filter_services row (persistDbJob no-ops for
  // filter-… ids). Used by closeJob/archiveJob so closed/deleted filter jobs don't reload
  // onto the board or the service list.
  const archiveFilterServiceRow = useCallback((jobId: string) => {
    void supabase
      .from("scheduled_filter_services")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("job_key", jobId)
      .then(({ error }) => {
        if (error) throw error;
      })
      .catch((error) => {
        handlePersistFailure(`Failed to archive scheduled filter service ${jobId}`, error);
      });
  }, [handlePersistFailure]);

  const closeJob = (jobId: string) => {
    setJobs((prev) => {
      const job = prev.find((j) => j.id === jobId);
      if (!job) return prev;

      addLog(
        job.customerId,
        "סגירת קריאה",
        `קריאה ${JOB_TYPE_CONFIG[job.type].label} נסגרה`,
        jobId,
      );
      // Mark closed (archived) so the row is hidden everywhere on next load but kept in the DB.
      if (isFilterJob(jobId)) {
        archiveFilterServiceRow(jobId);
      } else {
        persistDbJobSafely(jobId, { status: "archived" });
      }
      setClosedJobs((old) => [...old, job]);

      if (job.type === "filter_replacement") {
        const customer = customersList.find((c) => c.id === job.customerId);
        const currentYear = parseInt(job.createdAt.split("-")[0]);
        const nextYear = currentYear + 1;
        const month =
          customer?.filterReplacementMonth ||
          parseInt(job.createdAt.split("-")[1]);
        const nextJobId = makeFilterJobId(nextYear, month, job.customerId);
        const existing = prev.find((j) => j.id === nextJobId);
        if (!existing) {
          addLog(
            job.customerId,
            "תזמון שירות",
            `שירות שוטף תוזמן לשנה הבאה (${nextYear})`,
            nextJobId,
          );
          const newJob: Job = {
            id: nextJobId,
            type: "filter_replacement",
            status: "draft",
            priority: "low",
            customerId: job.customerId,
            estimatedDuration: 25,
            location: customer?.address || job.location,
            city: customer?.city || job.city,
            notes: "החלפת פילטר שנתית",
            createdAt: `${nextYear}-${String(month).padStart(2, "0")}-01`,
          };
          return [...prev.filter((j) => j.id !== jobId), newJob];
        }
      }
      return prev.filter((j) => j.id !== jobId);
    });
  };

  const returnJob = (jobId: string) => {
    setJobs((prev) => {
      const job = prev.find((j) => j.id === jobId);
      if (!job) return prev;
      addLog(
        job.customerId,
        "החזרת קריאה",
        `קריאה ${JOB_TYPE_CONFIG[job.type].label} הוחזרה למאגר`,
        jobId,
      );

      // Synthetic filter (שירות שוטף) jobs have no malfunctions/installations row, so
      // persistDbJob no-ops for them and they'd stay on the board. Delete their
      // scheduled_filter_services row instead: the job drops back into the auto-generated
      // unassigned pool and no longer renders on any day.
      if (isFilterJob(jobId)) {
        void supabase
          .from("scheduled_filter_services")
          .delete()
          .eq("job_key", jobId)
          .then(({ error }) => {
            if (error) throw error;
          })
          .catch((error) => {
            handlePersistFailure(`Failed to return filter service ${jobId}`, error);
          });
        return prev.filter((j) => j.id !== jobId);
      }

      persistDbJobSafely(jobId, {
        status: "draft",
        technicianId: null,
        scheduledDate: null,
        scheduledTime: null,
        completionStatus: null,
        completionNotes: null,
      });
      return prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              technicianId: undefined,
              scheduledDate: undefined,
              scheduledTime: undefined,
              completionStatus: undefined,
              completionNotes: undefined,
            }
          : j,
      );
    });
  };

  // Hide a job from the active pages/board without deleting it: mark its row 'archived'
  // (kept in the DB) and drop it from local state. Synthetic filter jobs archive their
  // scheduled_filter_services row; db-malf/inst/ongoing go through persistDbJob.
  const archiveJob = useCallback(
    (jobId: string) => {
      if (isFilterJob(jobId)) {
        archiveFilterServiceRow(jobId);
      } else {
        persistDbJobSafely(jobId, { status: "archived" });
      }
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    },
    [archiveFilterServiceRow, persistDbJobSafely],
  );

  const completeFilterJob = (jobId: string) => {
    setJobs((prev) => {
      const job = prev.find((j) => j.id === jobId);
      if (!job || job.type !== "filter_replacement") {
        persistDbJobSafely(jobId, { status: "completed" });
        return prev.map((j) =>
          j.id === jobId ? { ...j, status: "completed" as JobStatus } : j,
        );
      }
      persistDbJobSafely(jobId, { status: "completed" });
      const updated = prev.map((j) =>
        j.id === jobId ? { ...j, status: "completed" as JobStatus } : j,
      );
      const customer = customersList.find((c) => c.id === job.customerId);
      const currentYear = parseInt(job.createdAt.split("-")[0]);
      const nextYear = currentYear + 1;
      const month =
        customer?.filterReplacementMonth ||
        parseInt(job.createdAt.split("-")[1]);
      const nextJobId = `filter-${nextYear}-${month}-${job.customerId}`;
      if (!updated.find((j) => j.id === nextJobId)) {
        const newJob: Job = {
          id: nextJobId,
          type: "filter_replacement",
          status: "draft",
          priority: "low",
          customerId: job.customerId,
          estimatedDuration: 25,
          location: customer?.address || job.location,
          city: customer?.city || job.city,
          notes: "החלפת פילטר שנתית",
          createdAt: `${nextYear}-${String(month).padStart(2, "0")}-01`,
        };
        updated.push(newJob);
      }
      return updated;
    });
  };

  const assignJob = (
    jobId: string,
    technicianId: string,
    scheduledDate: string,
    scheduledTime: string,
  ) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? { ...j, technicianId, scheduledDate, scheduledTime }
          : j,
      ),
    );
    persistDbJobSafely(jobId, { technicianId, scheduledDate, scheduledTime });
  };

  const updateJob = (
    jobId: string,
    data: Partial<
      Pick<
        Job,
        | "location"
        | "city"
        | "notes"
        | "estimatedDuration"
        | "priority"
        | "type"
        | "phone"
      >
    > & { lat?: number; lng?: number },
  ) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, ...data } : j)),
    );

    persistDbJobSafely(jobId, data);
  };

  const unassignJob = (jobId: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              status: "draft" as JobStatus,
              technicianId: undefined,
              scheduledDate: undefined,
              scheduledTime: undefined,
            }
          : j,
      ),
    );
    persistDbJobSafely(jobId, {
      technicianId: null,
      scheduledDate: null,
      scheduledTime: null,
    });
  };

  // Back up a customer to the customers table so every request links to a persisted
  // customer. No-op (returns as-is) for customers already in the table. Keyed on
  // import_key so it is idempotent across CSV/ICS imports and repeat saves.
  const ensureCustomerInDb = useCallback(
    async (customer?: Customer): Promise<Customer | undefined> => {
      if (!customer) return undefined;
      if (isDbCustomer(customer.id)) return customer;
      try {
        return await upsertCustomerByImportKey(customer);
      } catch (e) {
        console.error("Failed to back up customer to DB:", e);
        return customer;
      }
    },
    [],
  );

  // Create a new request ("פניה חדשה"). It is written to its source table
  // (malfunction→malfunctions, installation→installations, filter_replacement→ongoing_services)
  // and — when no technician/date is provided — stays unscheduled, landing in the
  // "ממתינים לשיבוץ" pool and OFF the monthly board until the manager schedules it.
  const addJob = async (data: {
    type: JobType;
    customerId: string;
    technicianId: string;
    scheduledDate: string;
    scheduledTime: string;
    notes: string;
    status?: JobStatus;
    id?: string;
    estimatedDuration?: number;
    location?: string;
    city?: string;
    oneTimeCustomer?: {
      name: string;
      phone?: string;
      address?: string;
      city?: string;
    };
  }) => {
    // A one-time (non-client) request skips the real customer lookup/backup entirely —
    // its name/phone/address are free text on the malfunction/installation row itself,
    // same as any other request (neither table has a customer_id FK).
    const oneTime = data.oneTimeCustomer;
    const customer = oneTime
      ? undefined
      : customersList.find((c) => c.id === data.customerId);
    const config = JOB_TYPE_CONFIG[data.type];
    const persistedCustomer = oneTime
      ? undefined
      : await ensureCustomerInDb(customer);
    const location =
      data.location || (oneTime ? oneTime.address : customer?.address) || "";
    const city = data.city || (oneTime ? oneTime.city : customer?.city) || "";
    const estimatedDuration = data.estimatedDuration || config.duration;

    const input: NewJobInsertInput = {
      customerId: persistedCustomer?.id,
      customerName: (oneTime ? oneTime.name : customer?.name) || "ללא שם",
      phone: (oneTime ? oneTime.phone : customer?.phone) || "",
      city,
      address: location,
      notes: data.notes,
      productType: customer?.product || "",
      technicianId: data.technicianId || null,
      scheduledDate: data.scheduledDate || null,
      scheduledTime: data.scheduledTime || null,
      estimatedDuration,
    };

    let newId: string | null = null;
    let newDbId: string | null = null;
    try {
      if (data.type === "malfunction") {
        const { data: row, error } = await supabase
          .from("malfunctions")
          .insert(buildMalfunctionInsert(input))
          .select("id")
          .single();
        if (error) throw error;
        newDbId = row.id;
        newId = makeMalfunctionJobId(row.id);
      } else if (data.type === "installation") {
        const { data: row, error } = await supabase
          .from("installations")
          .insert(buildInstallationInsert(input))
          .select("id")
          .single();
        if (error) throw error;
        newDbId = row.id;
        newId = makeInstallationJobId(row.id);
      } else {
        const serviceDate =
          data.scheduledDate || new Date().toISOString().split("T")[0];
        const { data: row, error } = await supabase
          .from("ongoing_services")
          .insert(buildOngoingServiceInsert(input, serviceDate))
          .select("id")
          .single();
        if (error) throw error;
        newId = makeOngoingJobId(row.id);
      }
    } catch (e) {
      console.error("Failed to persist new job:", e);
      toast.error("שמירת הפנייה נכשלה — נסה שוב");
    }

    // Optimistically mirror the synthetic customer that useMalfunctionsInstallations
    // will derive from the row on the next realtime refresh (same id scheme), so the
    // one-time customer's name/phone/address show up immediately instead of flashing
    // "ללא שם" until that refresh lands.
    let oneTimeCustomerId: string | undefined;
    if (oneTime && newDbId) {
      if (data.type === "malfunction") {
        oneTimeCustomerId = makeMalfunctionCustomerId(newDbId);
      } else if (data.type === "installation") {
        oneTimeCustomerId = makeInstallationCustomerId(newDbId);
      }
      if (oneTimeCustomerId) {
        const syntheticCustomer: Customer = {
          id: oneTimeCustomerId,
          name: oneTime.name || "ללא שם",
          phone: oneTime.phone || "",
          address: oneTime.address || "",
          city: oneTime.city || "",
          email: "",
          product: "",
          filterReplacementMonth: 1,
        };
        setCustomersList((prev) => [...prev, syntheticCustomer]);
      }
    }

    const newJob: Job = {
      id: newId || data.id || `j${Date.now()}`,
      type: data.type,
      status: data.status || "draft",
      priority: config.priority,
      customerId: oneTimeCustomerId || persistedCustomer?.id || data.customerId,
      technicianId: data.technicianId || undefined,
      scheduledDate: data.scheduledDate || undefined,
      scheduledTime: data.scheduledTime || undefined,
      estimatedDuration,
      location,
      city,
      notes: data.notes,
      createdAt: new Date().toISOString().split("T")[0],
      // date stamp — when the request is opened (Hebrew display, date + time)
      openedDate: formatHebrewDateTime(),
    };
    addLog(
      newJob.customerId,
      "פתיחת קריאה",
      `${config.label} — ${data.notes}`,
      newJob.id,
    );
    setJobs((prev) => [...prev, newJob]);
    // Returned so callers can offer an undo. Note the id falls back to a local
    // `j{timestamp}` when the insert above failed — callers must check the id
    // actually names a DB row (isOngoingJob/isFilterJob) before offering to revert.
    return newJob;
  };

  const addCustomer = (data: {
    name: string;
    phone: string;
    address: string;
    city: string;
    email: string;
    product: string;
    lat?: number;
    lng?: number;
    placeId?: string;
    filterReplacementMonth?: number;
  }) => {
    const newCustomer: Customer = {
      ...data,
      id: `c${Date.now()}`,
      filterReplacementMonth:
        data.filterReplacementMonth || new Date().getMonth() + 1,
    };
    setCustomersList((prev) => [...prev, newCustomer]);
    // Persist to the customers table (backup + going-forward). Realtime folds in the
    // db-cust- row; the import_key upsert keeps this idempotent with addJob's backup.
    upsertCustomerByImportKey(newCustomer).catch((e) =>
      console.error("Failed to persist new customer:", e),
    );
    return newCustomer;
  };

  const updateCustomer = useCallback(
    (customerId: string, data: Partial<Customer>) => {
      const nextData = shouldResetStoredCoords(data)
        ? { ...data, lat: undefined, lng: undefined, placeId: undefined }
        : data;

      setCustomersList((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, ...nextData } : c)),
      );
      addLog(customerId, "עדכון פרטים", "פרטי הלקוח עודכנו");

      // Persist the edit. db-cust- customers update their row directly; in-memory
      // (CSV/ICS) or job-derived customers get upserted so the edit is backed up.
      const uuid = customerDbId(customerId);
      if (uuid) {
        updateCustomerRow(uuid, nextData).catch((e) =>
          console.error("Failed to update customer:", e),
        );
      } else {
        const existing = customersList.find((c) => c.id === customerId);
        if (existing) {
          upsertCustomerByImportKey({ ...existing, ...nextData }).catch((e) =>
            console.error("Failed to back up customer:", e),
          );
        }
      }
    },
    [addLog, customersList],
  );

  const distributeServiceTracks = (
    assignments: {
      customerId: string;
      track: ServiceTrack;
      nextServiceDate: string;
    }[],
  ) => {
    setCustomersList((prev) => {
      const map = new Map(assignments.map((a) => [a.customerId, a]));
      return prev.map((c) => {
        const a = map.get(c.id);
        if (a) {
          addLog(
            c.id,
            "שיוך מסלול",
            `שויך למסלול ${SERVICE_TRACK_CONFIG[a.track].label} — שירות הבא: ${a.nextServiceDate}`,
          );
          return {
            ...c,
            serviceTrack: a.track,
            nextServiceDate: a.nextServiceDate,
          };
        }
        return c;
      });
    });
  };

  const recalcNextServiceDate = (customerId: string) => {
    setCustomersList((prev) =>
      prev.map((c) => {
        if (c.id !== customerId || !c.serviceTrack) return c;
        const interval = SERVICE_TRACK_CONFIG[c.serviceTrack].intervalMonths;
        const next = new Date();
        next.setMonth(next.getMonth() + interval);
        const nextDate = next.toISOString().split("T")[0];
        addLog(
          c.id,
          "עדכון מועד",
          `שירות הבא עודכן ל-${nextDate} (${SERVICE_TRACK_CONFIG[c.serviceTrack].label})`,
        );
        return { ...c, nextServiceDate: nextDate };
      }),
    );
  };

  const resetServiceCycle = useCallback(() => {
    setJobs((prev) => prev.filter((j) => j.type !== "filter_replacement"));
    setCustomersList((prev) =>
      prev.map((c) => ({ ...c, filterReplacementMonth: 0 })),
    );
  }, []);

  const getUnassignedJobs = () =>
    jobs.filter((j) => !j.technicianId && !j.scheduledDate);

  const getJobsByArea = () => {
    const grouped: Record<string, Job[]> = {};
    jobs.forEach((job) => {
      if (!grouped[job.city]) grouped[job.city] = [];
      grouped[job.city].push(job);
    });
    return grouped;
  };

  const getJobsByTechnician = (techId: string) => {
    return jobs.filter((j) => j.technicianId === techId);
  };

  return {
    jobs,
    customersList,
    closedJobs,
    ongoingServices,
    activityLogs,
    dataLoaded,
    boardReady,
    dbSyncStatus,
    dbSyncError: dbSyncError || undefined,
    dbLastSyncedAt: dbLastSyncedAt || undefined,
    refreshDbJobs,
    updateJobStatus,
    approveSchedule,
    approveDaySchedule,
    approvedDayKeys,
    lockedDayKeys,
    approveDay,
    unapproveDay,
    lockDay,
    unlockDay,
    completeJob,
    markJobCompletion,
    resetDayCompletions,
    closeJob,
    returnJob,
    archiveJob,
    completeFilterJob,
    addJob,
    addCustomer,
    updateCustomer,
    updateJob,
    assignJob,
    unassignJob,
    assignFilterService,
    unassignFilterService,
    getUnassignedJobs,
    getJobsByArea,
    getJobsByTechnician,
    getCustomerLogs,
    addLog,
    distributeServiceTracks,
    recalcNextServiceDate,
    resetServiceCycle,
  };
}
