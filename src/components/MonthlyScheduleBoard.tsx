import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useJobsContext } from "@/contexts/JobsContext";
import { technicians } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { Job, JOB_TYPE_CONFIG, JobType } from "@/types";
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  addDays,
  endOfWeek,
  format,
  getDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { he } from "date-fns/locale";
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  MapPin,
  Plus,
  Trash2,
  Wrench,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { DAY_HEADERS, MONTH_NAMES } from "./monthly-schedule/constants";
import { DayApprovalDialog } from "./monthly-schedule/dialogs/DayApprovalDialog";
import { DayDetailDialog } from "./monthly-schedule/dialogs/DayDetailDialog";
import { UnifiedJobPickerDialog } from "./monthly-schedule/dialogs/UnifiedJobPickerDialog";
import { MiniJobChip } from "./monthly-schedule/MiniJobChip";
import {
  REGIONS,
  UNASSIGNED_REGION,
  jobMatchesAreas,
} from "./monthly-schedule/regions";
import {
  distributeFilterJobs,
  generateFilterJobs,
} from "./monthly-schedule/utils";

interface MonthlyScheduleBoardProps {
  jobs: Job[];
  onApprove: (jobIds: string[]) => void;
  onApproveDaySchedule: (
    assignments: {
      jobId: string;
      technicianId: string;
      scheduledDate: string;
      scheduledTime: string;
    }[],
    jobObjects?: Job[],
  ) => void;
  onStatusChange: (jobId: string, status: string) => void;
  onAssignJob: (
    jobId: string,
    technicianId: string,
    scheduledDate: string,
    scheduledTime: string,
  ) => void;
  onUnassignJob: (jobId: string) => void;
  onAssignFilterService?: (
    job: Job,
    technicianId: string,
    scheduledDate: string,
    scheduledTime: string,
  ) => void;
  onUnassignFilterService?: (jobId: string) => void;
  onCloseJob?: (jobId: string) => void;
  onReturnJob?: (jobId: string) => void;
  onAddJob?: (data: {
    type: JobType;
    customerId: string;
    technicianId: string;
    scheduledDate: string;
    scheduledTime: string;
    notes: string;
  }) => void;
}

// Stable empty default so days with no selection don't create a new Set each render.
const EMPTY_SELECTION: Set<string> = new Set();

export function MonthlyScheduleBoard({
  jobs,
  onApprove,
  onApproveDaySchedule,
  onStatusChange,
  onAssignJob,
  onUnassignJob,
  onAssignFilterService,
  onUnassignFilterService,
  onCloseJob,
  onReturnJob,
  onAddJob,
}: MonthlyScheduleBoardProps) {
  const {
    customersList,
    ongoingServices,
    boardReady,
    approvedDayKeys,
    approveDay,
    unapproveDay,
  } = useJobsContext();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTechId, setSelectedTechId] = useState<string>(
    technicians[0].id,
  );
  const [viewMode, setViewMode] = useState<"month" | "week">("week");
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 0 }),
  );
  const [pickerState, setPickerState] = useState<{
    open: boolean;
    dateStr: string;
    dayLabel: string;
  } | null>(null);
  // Picker checkbox selections kept per day so closing/reopening the picker for
  // the same day restores what was checked (the dialog itself unmounts on close).
  const [pickerSelections, setPickerSelections] = useState<
    Record<string, Set<string>>
  >({});
  const [pendingDayReset, setPendingDayReset] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    jobId: string;
    fromDateStr: string;
    isFilter: boolean;
  } | null>(null);
  const [detailState, setDetailState] = useState<{
    open: boolean;
    dateStr: string;
  } | null>(null);
  const [approvalState, setApprovalState] = useState<{
    open: boolean;
    dateStr: string;
  } | null>(null);
  // Approved days for the selected technician, derived from the persisted
  // approved_schedule_days keys (`${technicianId}|${date}`) so the green-check /
  // "messages sent" state survives a refresh and stays in sync across managers.
  const approvedDays = useMemo(() => {
    const prefix = `${selectedTechId}|`;
    const set = new Set<string>();
    approvedDayKeys.forEach((k) => {
      if (k.startsWith(prefix)) set.add(k.slice(prefix.length));
    });
    return set;
  }, [approvedDayKeys, selectedTechId]);

  const handleApproveDay = (jobIds: string[], dateStr: string) => {
    // Calculate time ranges for assignments
    const filterDayJobs = getFilterDayJobs(dateStr);
    const manualDayJobs = getManualDayJobs(dateStr);
    const allDayJobs = [...filterDayJobs, ...manualDayJobs];

    const allJobs = jobIds
      .map((id) => {
        return allDayJobs.find((j) => j.id === id);
      })
      .filter(Boolean) as Job[];

    let currentMinutes = 10 * 60; // Start at 10:00
    const assignments = allJobs.map((job) => {
      const startHour = Math.floor(currentMinutes / 60);
      const startMin = currentMinutes % 60;
      const scheduledTime = `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}`;
      currentMinutes += job.estimatedDuration;
      return {
        jobId: job.id,
        technicianId: selectedTechId,
        scheduledDate: dateStr,
        scheduledTime,
      };
    });

    onApproveDaySchedule(assignments, allJobs);
    approveDay(selectedTechId, dateStr);
  };

  const handleUnapproveDay = (dateStr: string) => {
    unapproveDay(selectedTechId, dateStr);
    toast.success("האישור בוטל — ניתן לערוך את היום");
  };

  const month = currentMonth.getMonth() + 1; // 1-12
  const year = currentMonth.getFullYear();

  // Calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Working days (Sun-Thu, not Fri/Sat), only today and forward for distribution
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const workingDays = allDays.filter((d) => {
    const dow = getDay(d);
    return dow !== 5 && dow !== 6;
  });
  const futureWorkingDays = workingDays.filter((d) => d >= todayDate);

  // Auto-generated filter jobs for this month, merged with global state + redistributed overdue jobs
  const filterJobs = useMemo(() => {
    const generated = generateFilterJobs(month, year, customersList);
    const jobMap = new Map(jobs.map((j) => [j.id, j]));
    const generatedIds = new Set(generated.map((g) => g.id));
    const generatedCustomerIds = new Set(generated.map((g) => g.customerId));

    // Merge completion data from global jobs state
    const merged = generated.map((gj) => {
      const globalJob = jobMap.get(gj.id);
      if (globalJob) {
        return {
          ...gj,
          status: globalJob.status,
          completionStatus: globalJob.completionStatus,
          completionNotes: globalJob.completionNotes,
        };
      }
      return gj;
    });

    // Add redistributed overdue filter jobs that landed in this month (skip if customer already has a job)
    const redistributed = jobs.filter(
      (j) =>
        j.type === "filter_replacement" &&
        !generatedIds.has(j.id) &&
        !generatedCustomerIds.has(j.customerId) &&
        j.createdAt.startsWith(`${year}-${String(month).padStart(2, "0")}`),
    );
    return [...merged, ...redistributed];
  }, [month, year, jobs]);

  // Generate filter jobs for a 2-week range around a given date (for the picker)
  const getFilterJobsInRange = useCallback(
    (targetDateStr: string): Job[] => {
      const targetDate = new Date(targetDateStr + "T00:00:00");
      const twoWeeksBefore = new Date(targetDate);
      twoWeeksBefore.setDate(twoWeeksBefore.getDate() - 14);
      const twoWeeksAfter = new Date(targetDate);
      twoWeeksAfter.setDate(twoWeeksAfter.getDate() + 14);

      // Collect unique year-month combos in the range
      const monthsInRange = new Set<string>();
      const d = new Date(twoWeeksBefore);
      while (d <= twoWeeksAfter) {
        monthsInRange.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
        d.setDate(d.getDate() + 1);
      }

      const jobMap = new Map(jobs.map((j) => [j.id, j]));
      const allRangeJobs: Job[] = [];
      const seenCustomerIds = new Set<string>();

      monthsInRange.forEach((key) => {
        const [y, m] = key.split("-").map(Number);
        const generated = generateFilterJobs(m, y, customersList);
        generated.forEach((gj) => {
          if (seenCustomerIds.has(gj.customerId)) return;
          seenCustomerIds.add(gj.customerId);
          const globalJob = jobMap.get(gj.id);
          if (globalJob) {
            allRangeJobs.push({
              ...gj,
              status: globalJob.status,
              completionStatus: globalJob.completionStatus,
              completionNotes: globalJob.completionNotes,
            });
          } else {
            allRangeJobs.push(gj);
          }
        });
      });

      return allRangeJobs;
    },
    [customersList, jobs],
  );
  const [extraFilterAssignments, setExtraFilterAssignments] = useState<
    Map<string, Job[]>
  >(new Map());
  const [removedFromAutoIds, setRemovedFromAutoIds] = useState<Set<string>>(
    new Set(),
  );
  const [dayAreaOverrides, setDayAreaOverrides] = useState<
    Map<string, string[]>
  >(new Map());
  const filterDistribution = useMemo(
    () => distributeFilterJobs(filterJobs, futureWorkingDays),
    [filterJobs, futureWorkingDays],
  );

  const getDayAreas = (dateStr: string): string[] => {
    if (dayAreaOverrides.has(dateStr)) return dayAreaOverrides.get(dateStr)!;
    // No auto-determined areas — days start empty, areas are selected manually
    return [];
  };

  // Area selection is a non-destructive view filter: it only records which areas
  // are shown for the day. Nothing is unassigned, so jobs survive a refresh and
  // reappear when the day is returned to the general (no-area) view.
  const handleAreaOverride = (dateStr: string, newAreas: string[]) => {
    setDayAreaOverrides((prev) => new Map(prev).set(dateStr, newAreas));
    toast.success(`אזורים עודכנו: ${newAreas.join(", ")}`);
  };

  // Unassigned filter jobs (not yet distributed to any day)
  const assignedFilterIds = useMemo(() => {
    const ids = new Set<string>();
    filterDistribution.forEach((jobs) =>
      jobs.forEach((j) => {
        if (!removedFromAutoIds.has(j.id)) ids.add(j.id);
      }),
    );
    extraFilterAssignments.forEach((jobs) =>
      jobs.forEach((j) => ids.add(j.id)),
    );
    return ids;
  }, [filterDistribution, extraFilterAssignments, removedFromAutoIds]);

  const unassignedFilterJobs = useMemo(
    () => filterJobs.filter((j) => !assignedFilterIds.has(j.id)),
    [filterJobs, assignedFilterIds],
  );

  // Manually assigned jobs (malfunction/installation) for this tech & month — exclude filter jobs which are managed separately
  const manualJobs = jobs.filter(
    (j) =>
      j.type !== "filter_replacement" &&
      j.technicianId === selectedTechId &&
      j.scheduledDate &&
      j.scheduledDate.startsWith(`${year}-${String(month).padStart(2, "0")}`),
  );

  // Unassigned malfunction/installation jobs
  const unassignedManualJobs = jobs.filter(
    (j) =>
      j.type !== "filter_replacement" && (!j.technicianId || !j.scheduledDate),
  );

  // Real ongoing-service ("שירות שוטף") backlog surfaced in the picker's 'שירות' tab.
  // Sourced from `ongoingServices` (same data as ServiceCyclePage) — NOT from `jobs` —
  // so all not-done calendar rows appear, not just the few app-created ones. Kept to a
  // window of the last 6 months + next 2 weeks, not done, and not yet scheduled (a
  // scheduled row becomes a real board job and drops out of this pool).
  const unassignedOngoingJobs = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const windowStart = subMonths(today, 6);
    const windowEnd = addDays(today, 14);
    return ongoingServices
      .filter((s) => {
        if (s.is_done === true || s.completion_status === "done") return false;
        if (s.scheduled_date) return false;
        const d = new Date(s.service_date.slice(0, 10) + "T00:00:00");
        return d >= windowStart && d <= windowEnd;
      })
      .map<Job>((s) => ({
        id: `db-ongoing-${s.id}`,
        type: "filter_replacement",
        status: "draft",
        priority: "low",
        customerId: s.customer_id
          ? `db-cust-${s.customer_id}`
          : `db-ongoing-cust-${s.id}`,
        estimatedDuration: 20,
        phone: s.phone || undefined,
        location: s.location,
        city: s.location,
        notes: s.task_description,
        createdAt: s.service_date.slice(0, 10),
      }));
  }, [ongoingServices]);

  const getManualDayJobs = (dateStr: string) =>
    manualJobs.filter((j) => j.scheduledDate === dateStr);
  const getFilterDayJobs = (dateStr: string) => {
    const localJobs = extraFilterAssignments.get(dateStr) || [];
    const localIds = new Set(localJobs.map((j) => j.id));
    // Also include filter_replacement jobs from global state that were approved/assigned to this day
    const globalFilterJobs = jobs.filter(
      (j) =>
        j.type === "filter_replacement" &&
        j.scheduledDate === dateStr &&
        j.technicianId === selectedTechId &&
        !localIds.has(j.id),
    );
    return [...localJobs, ...globalFilterJobs];
  };

  const handleFilterPickerSelect = (jobIds: string[], dateStr: string) => {
    // Search in ranged jobs (not just current month) so adjacent-month jobs are found
    const ranged = getFilterJobsInRange(dateStr);
    const allCandidates = [...filterJobs, ...ranged];
    const seen = new Set<string>();
    const unique = allCandidates.filter((j) => {
      if (seen.has(j.id)) return false;
      seen.add(j.id);
      return true;
    });
    const selected = unique.filter((j) => jobIds.includes(j.id));
    setExtraFilterAssignments((prev) => {
      const next = new Map(prev);
      const existing = next.get(dateStr) || [];
      next.set(dateStr, [...existing, ...selected]);
      return next;
    });
    // Persist each scheduled service so it survives a refresh
    selected.forEach((job) =>
      onAssignFilterService?.(job, selectedTechId, dateStr, ""),
    );
  };

  const handleFilterPickerMoveSelect = (
    jobIds: string[],
    otherDayIdsSet: Set<string>,
    dateStr: string,
  ) => {
    // Search in ranged jobs (not just current month) so adjacent-month jobs are found
    const ranged = getFilterJobsInRange(dateStr);
    const allCandidates = [...filterJobs, ...ranged];
    const seen = new Set<string>();
    const unique = allCandidates.filter((j) => {
      if (seen.has(j.id)) return false;
      seen.add(j.id);
      return true;
    });
    const selected = unique.filter((j) => jobIds.includes(j.id));
    const movedIds = new Set(jobIds.filter((id) => otherDayIdsSet.has(id)));

    const autoMovedIds = new Set<string>();
    if (movedIds.size > 0) {
      filterDistribution.forEach((dayJobs, key) => {
        if (key !== dateStr) {
          dayJobs.forEach((j) => {
            if (movedIds.has(j.id)) autoMovedIds.add(j.id);
          });
        }
      });
    }
    if (autoMovedIds.size > 0) {
      setRemovedFromAutoIds((prev) => {
        const next = new Set(prev);
        autoMovedIds.forEach((id) => next.add(id));
        return next;
      });
    }

    setExtraFilterAssignments((prev) => {
      const next = new Map(prev);
      if (movedIds.size > 0) {
        next.forEach((dayJobs, key) => {
          if (key !== dateStr) {
            const filtered = dayJobs.filter((j) => !movedIds.has(j.id));
            if (filtered.length > 0) next.set(key, filtered);
            else next.delete(key);
          }
        });
      }
      const existing = next.get(dateStr) || [];
      next.set(dateStr, [...existing, ...selected]);
      return next;
    });
    // Persist each scheduled service so it survives a refresh. Upsert is keyed on
    // job_key, so a job moved from another day just gets its date updated in place.
    selected.forEach((job) =>
      onAssignFilterService?.(job, selectedTechId, dateStr, ""),
    );
  };

  const handlePickerSelect = (jobIds: string[]) => {
    if (!pickerState) return;
    const { dateStr } = pickerState;
    jobIds.forEach((jobId) => {
      onAssignJob(jobId, selectedTechId, dateStr, "08:00");
    });
  };

  // Find the nearest working day (after the removed day) that has jobs in the same area
  const findNearestAreaDay = useCallback(
    (removedDateStr: string, jobCity: string): string | null => {
      const removedDate = new Date(removedDateStr + "T00:00:00");
      // Look forward through working days for same-area days
      const candidates = futureWorkingDays
        .filter(
          (d) => format(d, "yyyy-MM-dd") !== removedDateStr && d >= removedDate,
        )
        .map((d) => format(d, "yyyy-MM-dd"));

      // First: find a day that already has jobs in the same area
      for (const dateStr of candidates) {
        const area = getDayAreas(dateStr);
        if (area.includes(jobCity)) return dateStr;
      }
      // Fallback: find any day with capacity (fewer than 15 total jobs)
      for (const dateStr of candidates) {
        const filterCount = getFilterDayJobs(dateStr).length;
        const manualCount = getManualDayJobs(dateStr).length;
        if (filterCount + manualCount < 15) return dateStr;
      }
      return null;
    },
    [
      futureWorkingDays,
      filterDistribution,
      extraFilterAssignments,
      removedFromAutoIds,
      manualJobs,
    ],
  );

  // Remove a filter job from its current day and reschedule to nearest same-area day
  const handleRemoveAndRescheduleFilter = useCallback(
    (jobId: string, fromDateStr: string) => {
      // db-ongoing-* are real DB rows scheduled via assignJob — move/unschedule them
      // through the DB-job path (persists to ongoing_services), not the synthetic
      // scheduled_filter_services path.
      if (jobId.startsWith("db-ongoing-")) {
        const dbJob = jobs.find((j) => j.id === jobId);
        if (!dbJob) return;
        const targetDate = findNearestAreaDay(fromDateStr, dbJob.city);
        if (targetDate) {
          onAssignJob(jobId, selectedTechId, targetDate, "08:00");
          toast.success(`שירות הועבר ל-${targetDate} (${dbJob.city})`);
        } else {
          onUnassignJob(jobId);
          toast.info("המשימה הוסרה מהלו״ז — לא נמצא יום מתאים באותו אזור");
        }
        return;
      }

      const job = filterJobs.find((j) => j.id === jobId);
      if (!job) return;

      // Remove from current day
      const isAuto = (filterDistribution.get(fromDateStr) || []).some(
        (j) => j.id === jobId,
      );
      if (isAuto) {
        setRemovedFromAutoIds((prev) => new Set(prev).add(jobId));
      } else {
        setExtraFilterAssignments((prev) => {
          const next = new Map(prev);
          const dayJobs = next.get(fromDateStr) || [];
          const filtered = dayJobs.filter((j) => j.id !== jobId);
          if (filtered.length > 0) next.set(fromDateStr, filtered);
          else next.delete(fromDateStr);
          return next;
        });
      }

      // Find nearest day with same area and add there
      const targetDate = findNearestAreaDay(fromDateStr, job.city);
      if (targetDate) {
        setExtraFilterAssignments((prev) => {
          const next = new Map(prev);
          const existing = next.get(targetDate) || [];
          next.set(targetDate, [...existing, job]);
          return next;
        });
        // Upsert (keyed on job_key) moves the persisted row to the new day
        onAssignFilterService?.(job, selectedTechId, targetDate, "");
        toast.success(`שירות הועבר ל-${targetDate} (${job.city})`);
      } else {
        // No target day — drop the persisted row entirely
        onUnassignFilterService?.(jobId);
        toast.info("המשימה הוסרה מהלו״ז — לא נמצא יום מתאים באותו אזור");
      }
    },
    [
      jobs,
      filterJobs,
      filterDistribution,
      findNearestAreaDay,
      onAssignJob,
      onUnassignJob,
      onAssignFilterService,
      onUnassignFilterService,
      selectedTechId,
    ],
  );

  // Delete a filter job from the schedule (no reschedule)
  const handleDeleteFilter = useCallback(
    (jobId: string, fromDateStr: string) => {
      const isAuto = (filterDistribution.get(fromDateStr) || []).some(
        (j) => j.id === jobId,
      );
      if (isAuto) {
        setRemovedFromAutoIds((prev) => new Set(prev).add(jobId));
      } else {
        setExtraFilterAssignments((prev) => {
          const next = new Map(prev);
          const dayJobs = next.get(fromDateStr) || [];
          const filtered = dayJobs.filter((j) => j.id !== jobId);
          if (filtered.length > 0) next.set(fromDateStr, filtered);
          else next.delete(fromDateStr);
          return next;
        });
      }
      // db-ongoing-* are real ongoing_services rows — their scheduling lives on the
      // row (technician_id/scheduled_date), NOT in scheduled_filter_services. Clear it
      // via the DB-job path so the delete actually persists across a refresh.
      if (jobId.startsWith("db-ongoing-")) {
        onUnassignJob(jobId);
      } else {
        onUnassignFilterService?.(jobId);
      }
      toast.info("השירות הוסר מהלו״ז");
    },
    [filterDistribution, onUnassignFilterService, onUnassignJob],
  );

  // Delete a manual job — return it to the unassigned pool
  const handleDeleteManual = useCallback(
    (jobId: string) => {
      onUnassignJob(jobId);
      toast.info("המשימה הוסרה מהלו״ז וחזרה למאגר");
    },
    [onUnassignJob],
  );

  // Move a manual job to the nearest same-area working day
  const handleMoveManual = useCallback(
    (jobId: string, fromDateStr: string) => {
      const job =
        manualJobs.find((j) => j.id === jobId) ||
        jobs.find((j) => j.id === jobId);
      if (!job) return;
      const targetDate = findNearestAreaDay(fromDateStr, job.city);
      if (targetDate) {
        onAssignJob(jobId, selectedTechId, targetDate, "08:00");
        toast.success(`המשימה הועברה ל-${targetDate} (${job.city})`);
      } else {
        toast.info("לא נמצא יום מתאים באותו אזור");
      }
    },
    [manualJobs, jobs, findNearestAreaDay, onAssignJob, selectedTechId],
  );

  // Run the actual delete once confirmed in the popup
  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return;
    if (pendingDelete.isFilter) {
      handleDeleteFilter(pendingDelete.jobId, pendingDelete.fromDateStr);
    } else {
      handleDeleteManual(pendingDelete.jobId);
    }
    setPendingDelete(null);
  }, [pendingDelete, handleDeleteFilter, handleDeleteManual]);

  // Reset a whole day — unassign every job (manual + filter/service) back to the
  // pool. Replicates handleDeleteFilter/handleDeleteManual side-effects in a
  // single pass with one summary toast instead of one toast per job. Plain
  // function (not useCallback) since it closes over the render-fresh
  // getFilterDayJobs/getManualDayJobs helpers and is only invoked on confirm.
  const handleResetDay = (dateStr: string) => {
    const filters = getFilterDayJobs(dateStr);
    const manual = getManualDayJobs(dateStr);
    const count = filters.length + manual.length;
    if (count === 0) return;
    filters.forEach((j) => {
      const isAuto = (filterDistribution.get(dateStr) || []).some(
        (f) => f.id === j.id,
      );
      if (isAuto) {
        setRemovedFromAutoIds((prev) => new Set(prev).add(j.id));
      } else {
        setExtraFilterAssignments((prev) => {
          const next = new Map(prev);
          const dayJobs = (next.get(dateStr) || []).filter(
            (f) => f.id !== j.id,
          );
          if (dayJobs.length > 0) next.set(dateStr, dayJobs);
          else next.delete(dateStr);
          return next;
        });
      }
      // db-ongoing-* schedule lives on the row; others in scheduled_filter_services.
      if (j.id.startsWith("db-ongoing-")) onUnassignJob(j.id);
      else onUnassignFilterService?.(j.id);
    });
    manual.forEach((j) => onUnassignJob(j.id));
    toast.info(`${count} משימות הוסרו מהיום וחזרו למאגר`);
  };

  const confirmDayReset = () => {
    if (!pendingDayReset) return;
    handleResetDay(pendingDayReset);
    setPendingDayReset(null);
  };

  // Stats
  const stats = useMemo(() => {
    const filterCount = filterJobs.length;
    // Manually-scheduled ongoing services (filter jobs) count as manual assignments too.
    // Mirror getFilterDayJobs' sources — session-local extraFilterAssignments and persisted
    // global jobs — deduped by id (a fresh add lives in both).
    const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
    const manualFilterIds = new Set<string>();
    extraFilterAssignments.forEach((dayJobs, dateStr) => {
      if (dateStr.startsWith(monthPrefix))
        dayJobs.forEach((j) => manualFilterIds.add(j.id));
    });
    jobs.forEach((j) => {
      if (
        j.type === "filter_replacement" &&
        j.technicianId === selectedTechId &&
        j.scheduledDate?.startsWith(monthPrefix)
      ) {
        manualFilterIds.add(j.id);
      }
    });
    const manualAssigned = manualJobs.length + manualFilterIds.size;
    const unassigned = unassignedManualJobs.length;
    return [
      { label: "שירות שוטף", count: filterCount, color: "bg-info" },
      { label: "משובצים ידנית", count: manualAssigned, color: "bg-secondary" },
      {
        label: "ממתינים לשיבוץ",
        count: unassigned,
        color: "bg-muted-foreground",
      },
    ];
  }, [
    filterJobs,
    manualJobs,
    unassignedManualJobs,
    extraFilterAssignments,
    jobs,
    selectedTechId,
    month,
    year,
  ]);

  // Calendar grid padding
  const startDow = getDay(monthStart); // 0=Sun

  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div dir='rtl' className='space-y-5'>
      {/* Tech toggle */}
      <div className='flex items-center gap-2'>
        {technicians.map((tech) => (
          <Button
            key={tech.id}
            variant={selectedTechId === tech.id ? "default" : "outline"}
            size='sm'
            onClick={() => {
              setSelectedTechId(tech.id);
              setExtraFilterAssignments(new Map());
              setRemovedFromAutoIds(new Set());
              setDayAreaOverrides(new Map());
            }}>
            <div className='w-5 h-5 rounded-full bg-gradient-secondary flex items-center justify-center text-secondary-foreground font-bold text-[10px] ml-1.5'>
              {tech.name[0]}
            </div>
            {tech.name}
          </Button>
        ))}
      </div>

      {/* View mode toggle + Navigator */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-1'>
          <Button
            variant='ghost'
            size='sm'
            disabled={
              viewMode === "month"
                ? currentMonth.getFullYear() === new Date().getFullYear() &&
                  currentMonth.getMonth() <= new Date().getMonth()
                : currentWeekStart <=
                  startOfWeek(new Date(), { weekStartsOn: 0 })
            }
            onClick={() => {
              if (viewMode === "month")
                setCurrentMonth((prev) => subMonths(prev, 1));
              else setCurrentWeekStart((prev) => subWeeks(prev, 1));
            }}>
            <ChevronRight className='w-4 h-4' />
          </Button>
        </div>
        <div className='flex items-center gap-3'>
          <h3 className='text-lg font-bold text-card-foreground'>
            {viewMode === "month"
              ? `${MONTH_NAMES[month - 1]} ${year}`
              : `${format(currentWeekStart, "d/M")} – ${format(endOfWeek(currentWeekStart, { weekStartsOn: 0 }), "d/M/yyyy")}`}
          </h3>
          {viewMode === "month" ? (
            <div className='flex items-center gap-1'>
              {(() => {
                // Calculate week starts for this month
                const weeks: Date[] = [];
                let ws = startOfWeek(monthStart, { weekStartsOn: 0 });
                while (ws <= monthEnd) {
                  weeks.push(ws);
                  ws = addWeeks(ws, 1);
                }
                return weeks.map((ws, i) => (
                  <Button
                    key={i}
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      setCurrentWeekStart(ws);
                      setViewMode("week");
                    }}
                    className='gap-1 text-xs px-2'>
                    <ZoomIn className='w-3 h-3' />
                    שבוע {i + 1}
                  </Button>
                ));
              })()}
            </div>
          ) : (
            <Button
              variant='outline'
              size='sm'
              onClick={() => setViewMode("month")}
              className='gap-1.5'>
              <ZoomOut className='w-3.5 h-3.5' />
              תצוגת חודש
            </Button>
          )}
        </div>
        <div className='flex items-center gap-1'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => {
              if (viewMode === "month")
                setCurrentMonth((prev) => addMonths(prev, 1));
              else setCurrentWeekStart((prev) => addWeeks(prev, 1));
            }}>
            <ChevronLeft className='w-4 h-4' />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-3 gap-4'>
        {stats.map((s) => (
          <div
            key={s.label}
            className='bg-card rounded-xl shadow-card p-4 flex items-center gap-4'>
            <div className={`w-4 h-4 rounded-full ${s.color}`} />
            <div>
              {boardReady ? (
                <p className='text-2xl font-bold text-card-foreground'>
                  {s.count}
                </p>
              ) : (
                <Skeleton className='h-7 w-10 mb-1' />
              )}
              <p className='text-sm text-muted-foreground'>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className='flex items-center gap-5 text-sm text-muted-foreground'>
        <div className='flex items-center gap-1.5'>
          <Filter className='w-4 h-4 text-info' /> שירות שוטף
        </div>
        <div className='flex items-center gap-1.5'>
          <AlertTriangle className='w-4 h-4 text-destructive' /> תקלה
        </div>
        <div className='flex items-center gap-1.5'>
          <Wrench className='w-4 h-4 text-secondary' /> התקנה
        </div>
      </div>

      {/* Calendar grid */}
      {!boardReady ? (
        <div className='bg-card rounded-xl shadow-card overflow-x-auto'>
          {/* Day headers stay real; only the cells are placeholders so the whole
              board reveals at once when every job source has loaded. */}
          <div className='grid grid-cols-7 border-b border-border min-w-[700px]'>
            {DAY_HEADERS.map((d, i) => (
              <div
                key={i}
                className={`text-center py-2.5 text-sm font-semibold ${i === 5 || i === 6 ? "text-muted-foreground/50" : "text-card-foreground"}`}>
                {d}
              </div>
            ))}
          </div>
          <div className='grid grid-cols-7 min-w-[700px]'>
            {Array.from({
              length: viewMode === "week" ? 7 : startDow + allDays.length,
            }).map((_, i) => (
              <div
                key={`sk-${i}`}
                className={`${viewMode === "week" ? "min-h-[280px]" : "min-h-[130px]"} border-b border-r border-border p-1.5 space-y-1.5`}>
                <Skeleton className='h-4 w-5' />
                <Skeleton className='h-5 w-full' />
                <Skeleton className='h-5 w-2/3' />
              </div>
            ))}
          </div>
        </div>
      ) : (
        (() => {
          const isWeekView = viewMode === "week";
          const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0 });
        const displayDays = isWeekView
          ? eachDayOfInterval({ start: currentWeekStart, end: weekEnd })
          : allDays;
        const emptyBefore = isWeekView ? 0 : startDow;

        return (
          <div className='bg-card rounded-xl shadow-card overflow-x-auto'>
            {/* Day headers — min-width lets the 7-col grid scroll on mobile instead of crushing */}
            <div className='grid grid-cols-7 border-b border-border min-w-[700px]'>
              {DAY_HEADERS.map((d, i) => (
                <div
                  key={i}
                  className={`text-center py-2.5 text-sm font-semibold ${i === 5 || i === 6 ? "text-muted-foreground/50" : "text-card-foreground"}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className='grid grid-cols-7 min-w-[700px]'>
              {Array.from({ length: emptyBefore }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className={`${isWeekView ? "min-h-[280px]" : "min-h-[130px]"} border-b border-r border-border bg-muted/20`}
                />
              ))}

              {displayDays.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const dow = getDay(day);
                const isWeekend = dow === 5 || dow === 6;
                const isToday = dateStr === today;
                const inCurrentMonth = isWeekView
                  ? true
                  : isSameMonth(day, currentMonth);
                const dayAreas =
                  !isWeekend && inCurrentMonth ? getDayAreas(dateStr) : [];
                // Area selection is a non-destructive view filter — hide jobs that
                // don't match the selected areas (jobMatchesAreas returns true for
                // all jobs when dayAreas is empty, i.e. the general view).
                const dayFilterJobs = getFilterDayJobs(dateStr).filter((j) =>
                  jobMatchesAreas(j, dayAreas),
                );
                const dayManualJobs = getManualDayJobs(dateStr).filter((j) =>
                  jobMatchesAreas(j, dayAreas),
                );
                const totalMinutes =
                  dayFilterJobs.reduce((s, j) => s + j.estimatedDuration, 0) +
                  dayManualJobs.reduce((s, j) => s + j.estimatedDuration, 0);
                const maxShow = isWeekView ? 20 : 2;
                const isDayApproved = approvedDays.has(dateStr);
                const hasJobs = dayFilterJobs.length + dayManualJobs.length > 0;

                return (
                  <div
                    key={dateStr}
                    className={`${isWeekView ? "min-h-[280px]" : "min-h-[130px]"} border-b border-r border-border p-2 transition-colors cursor-pointer hover:bg-muted/20 ${
                      isWeekend ? "bg-muted/30" : ""
                    } ${isToday ? "ring-2 ring-inset ring-primary" : ""} ${!inCurrentMonth ? "opacity-40" : ""} ${isDayApproved ? "bg-success/5" : ""}`}
                    onClick={() =>
                      !isWeekend &&
                      inCurrentMonth &&
                      setDetailState({ open: true, dateStr })
                    }>
                    <div className='flex items-center justify-between mb-1'>
                      <div className='flex items-center gap-1'>
                        <span
                          className={`text-sm font-medium ${isToday ? "text-primary font-bold" : "text-card-foreground"}`}>
                          {isWeekView ? format(day, "d/M") : day.getDate()}
                        </span>
                      </div>
                      <div className='flex items-center gap-1'>
                        {totalMinutes > 0 && !isWeekend && (
                          <span className='text-[10px] text-muted-foreground'>
                            {Math.floor(totalMinutes / 60)}:
                            {String(totalMinutes % 60).padStart(2, "0")}
                          </span>
                        )}
                        {/* Reset day — unassign every job on this day back to the pool.
                            Destructive, so it's separated from the '+' add button and
                            guarded by a confirmation dialog. */}
                        {!isWeekend && inCurrentMonth && hasJobs && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingDayReset(dateStr);
                            }}
                            className='p-0.5 rounded hover:bg-destructive/15 transition-colors'
                            title='אפס יום — הסר את כל המשימות'
                            aria-label='אפס יום — הסר את כל המשימות'>
                            <Trash2 className='w-3 h-3 text-muted-foreground hover:text-destructive' />
                          </button>
                        )}
                        {/* Approve / manage-approval entry point. When approved the green check
                            reopens the dialog so the day can be un-approved and edited. */}
                        {!isWeekend &&
                          inCurrentMonth &&
                          hasJobs && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setApprovalState({ open: true, dateStr });
                              }}
                              className='p-0.5 rounded hover:bg-success/20 transition-colors'
                              title={isDayApproved ? "היום אושר — לחץ לניהול/ביטול" : "אשר יום"}>
                              <CheckCircle
                                className={`w-3 h-3 ${isDayApproved ? "text-success" : "text-muted-foreground hover:text-success"}`}
                              />
                            </button>
                          )}
                      </div>
                    </div>

                    {!isWeekend && inCurrentMonth && (
                      <div
                        className='mb-0.5'
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}>
                        <Popover modal={false}>
                          <PopoverTrigger asChild>
                            <button
                              className={`h-auto min-h-[20px] px-1.5 py-0.5 text-[10px] border-0 rounded w-full text-right flex items-center gap-0.5 flex-wrap ${
                                dayAreas.length > 0
                                  ? "bg-info/10 text-info hover:bg-info/20"
                                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                              }`}
                              onClick={(e) => e.stopPropagation()}>
                              <MapPin className='w-2.5 h-2.5 shrink-0' />
                              <span className='truncate'>
                                {dayAreas.length > 0
                                  ? dayAreas.join(", ")
                                  : "בחר אזור"}
                              </span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            dir='rtl'
                            className='w-56 p-2'
                            align='start'
                            onOpenAutoFocus={(e) => e.preventDefault()}
                            onInteractOutside={(e) => {
                              if (
                                (e.target as HTMLElement)?.closest?.(
                                  "[data-radix-popover-content]",
                                )
                              )
                                e.preventDefault();
                            }}>
                            <p className='text-xs font-semibold mb-2 text-muted-foreground'>
                              בחר אזורים ליום:
                            </p>
                            <div className='space-y-1 max-h-[200px] overflow-y-auto'>
                              {[...REGIONS, UNASSIGNED_REGION].map((r) => (
                                <label
                                  key={r}
                                  className='flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-xs'>
                                  <Checkbox
                                    checked={dayAreas.includes(r)}
                                    onCheckedChange={(checked) => {
                                      const newAreas = checked
                                        ? [...dayAreas, r]
                                        : dayAreas.filter((a) => a !== r);
                                      if (newAreas.length > 0) {
                                        handleAreaOverride(dateStr, newAreas);
                                      } else {
                                        // Allow clearing all areas
                                        setDayAreaOverrides((prev) => {
                                          const next = new Map(prev);
                                          next.delete(dateStr);
                                          return next;
                                        });
                                      }
                                    }}
                                  />
                                  <span>{r}</span>
                                </label>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}

                    {!isWeekend && inCurrentMonth && (
                      <div className='space-y-1'>
                        {dayFilterJobs.slice(0, maxShow).map((job) => (
                          <MiniJobChip
                            key={job.id}
                            job={job}
                            isAutoScheduled
                            onRemove={() =>
                              setPendingDelete({
                                jobId: job.id,
                                fromDateStr: dateStr,
                                isFilter: true,
                              })
                            }
                            onMoveNext={() =>
                              handleRemoveAndRescheduleFilter(job.id, dateStr)
                            }
                          />
                        ))}
                        {dayFilterJobs.length > maxShow && (
                          <span className='text-[10px] text-info'>
                            +{dayFilterJobs.length - maxShow} שירות
                          </span>
                        )}
                        {dayManualJobs.slice(0, maxShow).map((job) => (
                          <MiniJobChip
                            key={job.id}
                            job={job}
                            onRemove={() =>
                              setPendingDelete({
                                jobId: job.id,
                                fromDateStr: dateStr,
                                isFilter: false,
                              })
                            }
                            onMoveNext={() => handleMoveManual(job.id, dateStr)}
                          />
                        ))}
                        {dayManualJobs.length > maxShow && (
                          <span className='text-[10px] text-muted-foreground'>
                            +{dayManualJobs.length - maxShow} עוד
                          </span>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const dayDate = new Date(dateStr + "T00:00:00");
                            setPickerState({
                              open: true,
                              dateStr,
                              dayLabel: format(dayDate, "EEEE d/M", {
                                locale: he,
                              }),
                            });
                          }}
                          className='w-full text-[10px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-0.5 py-1 rounded border border-dashed border-border hover:border-primary/50 hover:text-primary transition-colors mt-1'
                          title='הוסף משימה'>
                          <Plus className='w-3 h-3' />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
        })()
      )}

      {/* Add button for days that already have jobs */}
      <div className='flex justify-center'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => {
            // Find next available working day
            const nextDay =
              workingDays.find((d) => format(d, "yyyy-MM-dd") >= today) ||
              workingDays[0];
            const dateStr = format(nextDay, "yyyy-MM-dd");
            setPickerState({
              open: true,
              dateStr,
              dayLabel: format(nextDay, "EEEE d/M", { locale: he }),
            });
          }}>
          <Plus className='w-4 h-4 ml-1' />
          הוסף משימה ידנית
        </Button>
      </div>

      {/* Picker dialog */}
      {pickerState &&
        (() => {
          const dayAreas = getDayAreas(pickerState.dateStr);
          const dayExistingFilters = getFilterDayJobs(pickerState.dateStr);
          const dayExistingIds = new Set(dayExistingFilters.map((j) => j.id));

          // Get filter jobs within 2-week range of this day
          const rangedFilterJobs = getFilterJobsInRange(pickerState.dateStr);
          const assignedIds = new Set<string>();
          extraFilterAssignments.forEach((dayJobs) =>
            dayJobs.forEach((j) => assignedIds.add(j.id)),
          );
          // Also mark jobs already assigned via global state
          jobs
            .filter((j) => j.type === "filter_replacement" && j.scheduledDate)
            .forEach((j) => assignedIds.add(j.id));

          const unassignedRangedFilters = rangedFilterJobs.filter(
            (j) => !assignedIds.has(j.id) && !dayExistingIds.has(j.id),
          );

          const fromOtherDays: Job[] = [];
          const allOtherDayIdSet = new Set<string>();
          extraFilterAssignments.forEach((dayJobs, dStr) => {
            if (dStr === pickerState.dateStr) return;
            dayJobs.forEach((j) => {
              if (!dayExistingIds.has(j.id)) {
                fromOtherDays.push(j);
                allOtherDayIdSet.add(j.id);
              }
            });
          });

          return (
            <UnifiedJobPickerDialog
              open={pickerState.open}
              onClose={() => setPickerState(null)}
              unassignedManualJobs={unassignedManualJobs}
              unassignedFilterJobs={unassignedRangedFilters}
              unassignedOngoingJobs={unassignedOngoingJobs}
              filterJobsFromOtherDays={fromOtherDays}
              otherDayIds={allOtherDayIdSet}
              onSelectManualJobs={handlePickerSelect}
              onSelectOngoingJobs={handlePickerSelect}
              onSelectFilterJobs={(jobIds, odi) =>
                handleFilterPickerMoveSelect(jobIds, odi, pickerState.dateStr)
              }
              dayLabel={pickerState.dayLabel}
              dayAreas={dayAreas}
              selectedJobIds={
                pickerSelections[pickerState.dateStr] ?? EMPTY_SELECTION
              }
              onSelectedJobIdsChange={(next) =>
                setPickerSelections((prev) => ({
                  ...prev,
                  [pickerState.dateStr]: next,
                }))
              }
            />
          );
        })()}

      {/* Day detail dialog */}
      {detailState && (
        <DayDetailDialog
          open={detailState.open}
          onClose={() => setDetailState(null)}
          dateStr={detailState.dateStr}
          dayJobs={getManualDayJobs(detailState.dateStr)}
          filterJobs={getFilterDayJobs(detailState.dateStr)}
          onRemoveJob={(jobId) => {
            const isFilter = filterJobs.some((j) => j.id === jobId);
            setPendingDelete({
              jobId,
              fromDateStr: detailState.dateStr,
              isFilter,
            });
          }}
          onMoveJob={(jobId) => {
            const isFilter = filterJobs.some((j) => j.id === jobId);
            if (isFilter) {
              handleRemoveAndRescheduleFilter(jobId, detailState.dateStr);
            } else {
              handleMoveManual(jobId, detailState.dateStr);
            }
          }}
          onCloseJob={onCloseJob}
          onReturnJob={onReturnJob}
          onAddJob={onAddJob}
        />
      )}

      {/* Day approval dialog */}
      {approvalState && (
        <DayApprovalDialog
          open={approvalState.open}
          onClose={() => setApprovalState(null)}
          dateStr={approvalState.dateStr}
          dayJobs={getManualDayJobs(approvalState.dateStr)}
          filterJobs={getFilterDayJobs(approvalState.dateStr)}
          onApprove={handleApproveDay}
          onUnapprove={handleUnapproveDay}
          approvedDays={approvedDays}
          onAddJob={onAddJob}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null);
        }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader  >
            <AlertDialogTitle className='text-right'>הסרת משימה מהלו״ז</AlertDialogTitle>
            <AlertDialogDescription className='text-right' >
              {(() => {
                if (!pendingDelete) return "האם להסיר את המשימה מהלו״ז?";
                const job =
                  [...filterJobs, ...manualJobs].find(
                    (j) => j.id === pendingDelete.jobId,
                  ) || jobs.find((j) => j.id === pendingDelete.jobId);
                const name = job
                  ? customersList.find((c) => c.id === job.customerId)?.name
                  : undefined;
                return name
                  ? `האם להסיר את המשימה של ${name} מהלו״ז?`
                  : "האם להסיר את המשימה מהלו״ז?";
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
              הסר
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Day reset confirmation */}
      <AlertDialog
        open={!!pendingDayReset}
        onOpenChange={(o) => {
          if (!o) setPendingDayReset(null);
        }}>
        <AlertDialogContent dir='rtl'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-right'>איפוס יום</AlertDialogTitle>
            <AlertDialogDescription className='text-right'>
              {(() => {
                if (!pendingDayReset) return "האם להסיר את כל המשימות מהיום?";
                const count =
                  getFilterDayJobs(pendingDayReset).length +
                  getManualDayJobs(pendingDayReset).length;
                const label = format(
                  new Date(pendingDayReset + "T00:00:00"),
                  "EEEE d/M",
                  { locale: he },
                );
                return `האם להסיר את כל ${count} המשימות מ${label} ולהחזירן למאגר?`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDayReset}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
              הסר הכל
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
