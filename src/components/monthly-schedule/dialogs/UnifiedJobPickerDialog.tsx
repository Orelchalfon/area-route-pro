import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useJobsContext } from "@/contexts/JobsContext";
import { useIncrementalRender } from "@/hooks/useIncrementalRender";
import { formatHebrewDate } from "@/lib/dates";
import { isOngoingJob } from "@/lib/idConventions";
import { cn } from "@/lib/utils";
import { Customer, Job } from "@/types";
import {
  AlertTriangle,
  CalendarDays,
  Clock,
  Filter,
  Pencil,
  Phone,
  Plus,
  Search,
  Wrench,
} from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { jobMatchesPickerSearch } from "./jobPickerSearch";
import { buildUniquePhoneCardIndex } from "@/lib/customerCardMatch";
import { resolvePickerCustomerName } from "./pickerCustomerName";
import { getPickerAssignment, PickerAssignment } from "./pickerAssignment";
import { jobMatchesAreas } from "../regions";
import {
  JobDetailsDraft,
  PlaceCoords,
  useJobDetailsSave,
} from "../hooks/useJobDetailsSave";
import { PickerJobEditForm } from "./PickerJobEditForm";
import { UpdateCustomerCardDialog } from "./UpdateCustomerCardDialog";

const PICKER_PAGE_SIZE = 100;

/**
 * One list row. `assignment` set means the job is already on someone's board: it
 * renders as a read-only "taken" row (see the assigned group in IncrementalJobList)
 * and can never be selected.
 */
type PickerRow = { job: Job; assignment: PickerAssignment | null };

// Unified picker dialog for adding any job type to a day
export function UnifiedJobPickerDialog({
  open,
  onClose,
  unassignedManualJobs,
  unassignedFilterJobs,
  unassignedOngoingJobs,
  assignedJobs,
  filterJobsFromOtherDays,
  otherDayIds,
  onSelectManualJobs,
  onSelectFilterJobs,
  onSelectOngoingJobs,
  dayLabel,
  dayAreas,
  selectedJobIds,
  onSelectedJobIdsChange,
}: {
  open: boolean;
  onClose: () => void;
  unassignedManualJobs: Job[];
  unassignedFilterJobs: Job[];
  unassignedOngoingJobs: Job[];
  /** Open work already on a technician's day — shown read-only, never selectable. */
  assignedJobs: Job[];
  filterJobsFromOtherDays: Job[];
  otherDayIds: Set<string>;
  onSelectManualJobs: (jobIds: string[]) => void;
  onSelectFilterJobs: (jobIds: string[], otherDayIds: Set<string>) => void;
  onSelectOngoingJobs: (jobIds: string[]) => void;
  dayLabel: string;
  dayAreas: string[];
  // Selection is lifted to the parent so it survives the dialog unmounting
  // when closed (the parent renders this conditionally on `pickerState`).
  selectedJobIds: Set<string>;
  onSelectedJobIdsChange: (next: Set<string>) => void;
}) {
  const { customersList: customers } = useJobsContext();
  const [activeTab, setActiveTab] = useState("malfunction");
  const [searchQuery, setSearchQuery] = useState("");
  // Inline detail editing, so a wrong phone/address can be fixed without leaving the
  // scheduling flow. One row at a time.
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const {
    isSaving,
    saveJobDetails,
    pendingCustomerUpdate,
    confirmCustomerUpdate,
    dismissCustomerUpdate,
  } = useJobDetailsSave();

  // Don't offer jobs that are already finished — only schedule open work.
  const isCompleted = (j: Job) =>
    j.status === "completed" || j.completionStatus === "done";

  // Filter jobs to those not yet completed and within the selected day areas
  const areaFilteredManualJobs = useMemo(() => {
    const open = unassignedManualJobs.filter((j) => !isCompleted(j));
    return dayAreas.length > 0
      ? open.filter((j) => jobMatchesAreas(j, dayAreas))
      : open;
  }, [dayAreas, unassignedManualJobs]);

  const areaFilteredFilterJobs = useMemo(() => {
    const all = [...unassignedFilterJobs, ...filterJobsFromOtherDays].filter(
      (j) => !isCompleted(j),
    );
    return dayAreas.length > 0
      ? all.filter((j) => jobMatchesAreas(j, dayAreas))
      : all;
  }, [dayAreas, unassignedFilterJobs, filterJobsFromOtherDays]);

  // Real ongoing-service ("שירות שוטף") jobs — shown in the same 'שירות' tab with
  // their true task description / date / status (see renderJobList).
  const areaFilteredOngoingJobs = useMemo(() => {
    const open = unassignedOngoingJobs.filter((j) => !isCompleted(j));
    return dayAreas.length > 0
      ? open.filter((j) => jobMatchesAreas(j, dayAreas))
      : open;
  }, [dayAreas, unassignedOngoingJobs]);

  // Work already on the board, shown read-only so a manager planning one technician's
  // day is told "this call is already שילה's" instead of simply not finding it.
  // Deduped against every selectable list so an id never renders twice, and area-filtered
  // ONLY while the search box is empty — once the manager searches, an assigned job must
  // be findable even when it sits outside this day's areas, which is the whole point.
  const areaFilteredAssignedJobs = useMemo(() => {
    const alreadyShown = new Set([
      ...unassignedManualJobs.map((j) => j.id),
      ...unassignedFilterJobs.map((j) => j.id),
      ...unassignedOngoingJobs.map((j) => j.id),
      ...filterJobsFromOtherDays.map((j) => j.id),
    ]);
    const open = assignedJobs.filter(
      (j) =>
        !isCompleted(j) &&
        !alreadyShown.has(j.id) &&
        !otherDayIds.has(j.id) &&
        // No technician name and no date leaves nothing to tell the manager.
        getPickerAssignment(j) !== null,
    );
    return dayAreas.length > 0 && !searchQuery.trim()
      ? open.filter((j) => jobMatchesAreas(j, dayAreas))
      : open;
  }, [
    assignedJobs,
    dayAreas,
    filterJobsFromOtherDays,
    otherDayIds,
    searchQuery,
    unassignedFilterJobs,
    unassignedManualJobs,
    unassignedOngoingJobs,
  ]);

  const jobsByType = useMemo(
    () => ({
      malfunction: areaFilteredManualJobs.filter(
        (j) => j.type === "malfunction",
      ),
      installation: areaFilteredManualJobs.filter(
        (j) => j.type === "installation",
      ),
      // The 'שירות' tab merges synthetic annual-filter reminders with the real
      // ongoing-service jobs so both appear together.
      filter_replacement: [
        ...areaFilteredOngoingJobs,
        ...areaFilteredFilterJobs,
      ],
    }),
    [areaFilteredManualJobs, areaFilteredFilterJobs, areaFilteredOngoingJobs],
  );

  const assignedByType = useMemo(
    () => ({
      malfunction: areaFilteredAssignedJobs.filter(
        (j) => j.type === "malfunction",
      ),
      installation: areaFilteredAssignedJobs.filter(
        (j) => j.type === "installation",
      ),
      filter_replacement: areaFilteredAssignedJobs.filter(
        (j) => j.type === "filter_replacement",
      ),
    }),
    [areaFilteredAssignedJobs],
  );

  const { filteredJobsByType, filteredAssignedByType } = useMemo(() => {
    const customersById = new Map(customers.map((c) => [c.id, c]));
    const filterJobs = (items: Job[]) =>
      items.filter((job) =>
        jobMatchesPickerSearch(job, customersById.get(job.customerId), searchQuery),
      );

    return {
      filteredJobsByType: {
        malfunction: filterJobs(jobsByType.malfunction),
        installation: filterJobs(jobsByType.installation),
        filter_replacement: filterJobs(jobsByType.filter_replacement),
      },
      filteredAssignedByType: {
        malfunction: filterJobs(assignedByType.malfunction),
        installation: filterJobs(assignedByType.installation),
        filter_replacement: filterJobs(assignedByType.filter_replacement),
      },
    };
  }, [assignedByType, customers, jobsByType, searchQuery]);

  // Selectable rows first, the read-only assigned group after them. Memoized because
  // useIncrementalRender resets its page whenever the items array identity changes.
  const rowsByType = useMemo(() => {
    const build = (selectable: Job[], assigned: Job[]): PickerRow[] => [
      ...selectable.map((job) => ({ job, assignment: null })),
      ...assigned.map((job) => ({ job, assignment: getPickerAssignment(job) })),
    ];
    return {
      malfunction: build(
        filteredJobsByType.malfunction,
        filteredAssignedByType.malfunction,
      ),
      installation: build(
        filteredJobsByType.installation,
        filteredAssignedByType.installation,
      ),
      filter_replacement: build(
        filteredJobsByType.filter_replacement,
        filteredAssignedByType.filter_replacement,
      ),
    };
  }, [filteredAssignedByType, filteredJobsByType]);

  // Counts stay unassigned-only — they answer "how much is still left to schedule".
  // The assigned group carries its own count in its divider header.
  const tabCounts = searchQuery.trim() ? filteredJobsByType : jobsByType;

  const toggleJob = (jobId: string) => {
    const next = new Set(selectedJobIds);
    if (next.has(jobId)) next.delete(jobId);
    else next.add(jobId);
    onSelectedJobIdsChange(next);
  };

  const handleConfirm = () => {
    const manualIds = Array.from(selectedJobIds).filter((id) =>
      unassignedManualJobs.some((j) => j.id === id),
    );
    const ongoingIds = Array.from(selectedJobIds).filter((id) =>
      unassignedOngoingJobs.some((j) => j.id === id),
    );
    const filterIds = Array.from(selectedJobIds).filter((id) =>
      [...unassignedFilterJobs, ...filterJobsFromOtherDays].some(
        (j) => j.id === id,
      ),
    );

    if (manualIds.length > 0) onSelectManualJobs(manualIds);
    if (ongoingIds.length > 0) onSelectOngoingJobs(ongoingIds);
    if (filterIds.length > 0) onSelectFilterJobs(filterIds, otherDayIds);

    onSelectedJobIdsChange(new Set());
  };

  const handleClose = () => {
    // Selections are intentionally kept so reopening the same day restores them;
    // they only clear on per-job uncheck or on confirm (handleConfirm).
    setSearchQuery("");
    setEditingJobId(null);
    onClose();
  };

  // Built once per customer list, not per row: the 'שירות' tab is mostly calendar rows
  // with no customer record, and each one would otherwise scan all ~7k customers.
  const uniquePhoneCards = useMemo(
    () => buildUniquePhoneCardIndex(customers),
    [customers],
  );

  const listProps = {
    customers,
    uniquePhoneCards,
    otherDayIds,
    selectedJobIds,
    onToggleJob: toggleJob,
    editingJobId,
    isSaving,
    onStartEdit: (jobId: string) => setEditingJobId(jobId),
    onCancelEdit: () => setEditingJobId(null),
    onSaveEdit: async (
      job: Job,
      draft: JobDetailsDraft,
      coords: PlaceCoords | null,
    ) => {
      await saveJobDetails(job, draft, coords);
      setEditingJobId(null);
    },
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className='max-w-lg max-h-[80vh] overflow-hidden flex flex-col'
        dir='rtl'>
        <DialogHeader>
          <DialogTitle>הוספת משימה — {dayLabel}</DialogTitle>
          {dayAreas.length > 0 && (
            <p className='text-xs text-muted-foreground'>
              אזורים: {dayAreas.join(", ")}
            </p>
          )}
          <DialogDescription className='sr-only'>בחירת פנייה מהממתינות לשיבוץ והוספתה ליום זה.</DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className='w-full min-h-0 flex-1 flex flex-col'>
          <TabsList className='w-full justify-start overflow-x-auto'>
            <TabsTrigger value='malfunction' className='gap-1'>
              <AlertTriangle className='w-3.5 h-3.5' />
              תקלות ({tabCounts.malfunction.length})
            </TabsTrigger>
            <TabsTrigger value='installation' className='gap-1'>
              <Wrench className='w-3.5 h-3.5' />
              התקנות ({tabCounts.installation.length})
            </TabsTrigger>
            <TabsTrigger value='filter_replacement' className='gap-1'>
              <Filter className='w-3.5 h-3.5' />
              שירות ({tabCounts.filter_replacement.length})
            </TabsTrigger>
          </TabsList>
          <div className='relative my-2'>
            <Search className='absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none' />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='חיפוש לפי שם / טלפון / תיאור / עיר...'
              className='pr-9'
            />
          </div>
          <TabsContent value='malfunction' className='min-h-0 flex-1'>
            <IncrementalJobList items={rowsByType.malfunction} {...listProps} />
          </TabsContent>
          <TabsContent value='installation' className='min-h-0 flex-1'>
            <IncrementalJobList items={rowsByType.installation} {...listProps} />
          </TabsContent>
          <TabsContent
            value='filter_replacement'
            className='min-h-0 flex-1 flex flex-col'>
            <IncrementalJobList
              items={rowsByType.filter_replacement}
              {...listProps}
            />
          </TabsContent>
        </Tabs>

        {selectedJobIds.size > 0 && (
          <div className='shrink-0 bg-card border-t border-border pt-3 flex items-center justify-between'>
            <span className='text-sm font-medium'>
              {selectedJobIds.size} נבחרו
            </span>
            <Button onClick={handleConfirm}>
              <Plus className='w-4 h-4 ml-1' />
              הוסף
            </Button>
          </div>
        )}
      </DialogContent>

      <UpdateCustomerCardDialog
        open={!!pendingCustomerUpdate}
        onOpenChange={(o) => {
          if (!o) dismissCustomerUpdate();
        }}
        customerName={pendingCustomerUpdate?.customerName || ""}
        isNewCard={pendingCustomerUpdate?.isNewCard}
        onConfirm={() => void confirmCustomerUpdate()}
      />
    </Dialog>
  );
}

function IncrementalJobList({
  items,
  customers,
  uniquePhoneCards,
  otherDayIds,
  selectedJobIds,
  onToggleJob,
  editingJobId,
  isSaving,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
}: {
  items: PickerRow[];
  customers: Customer[];
  uniquePhoneCards: Map<string, Customer>;
  otherDayIds: Set<string>;
  selectedJobIds: Set<string>;
  onToggleJob: (jobId: string) => void;
  editingJobId: string | null;
  isSaving: boolean;
  onStartEdit: (jobId: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (
    job: Job,
    draft: JobDetailsDraft,
    coords: PlaceCoords | null,
  ) => void;
}) {
  const { visible, sentinelRef, hasMore } = useIncrementalRender(
    items,
    PICKER_PAGE_SIZE,
  );
  const assignedCount = items.filter((row) => row.assignment).length;

  if (items.length === 0) {
    return (
      <p className='text-xs text-muted-foreground py-4 text-center'>
        אין פניות באזור זה
      </p>
    );
  }

  return (
    <div className='max-h-[48vh] min-h-0 overflow-y-auto pr-1'>
      <div className='space-y-2'>
        {visible.map((row, index) => {
          const { job, assignment } = row;
          // Already on someone's board: informational only, never selectable.
          const isAssigned = Boolean(assignment);
          // The assigned rows are appended last, so the group divider belongs on the
          // first row whose predecessor is still a selectable one.
          const showAssignedHeader =
            isAssigned && !visible[index - 1]?.assignment;
          const customer = customers.find((c) => c.id === job.customerId);
          const isFromOther = otherDayIds.has(job.id);
          const isOngoing = isOngoingJob(job.id);
          // A calendar row has no customer record, so its name comes off the job itself
          // (or off a card whose phone uniquely matches) — see resolvePickerCustomerName.
          const customerName = resolvePickerCustomerName(
            job,
            customer,
            uniquePhoneCards,
          );
          const rawTaskDescription = isOngoing
            ? (job.notes || "").split(" | ")[0]
            : undefined;
          // When the name FELL BACK to the description, printing both lines would show the
          // same text twice — keep the title and drop the duplicate.
          const taskDescription =
            rawTaskDescription && rawTaskDescription !== customerName
              ? rawTaskDescription
              : undefined;
          const serviceDate = isOngoing
            ? job.scheduledDate || job.createdAt
            : undefined;
          const phone = job.phone || customer?.phone;
          const isEditing = editingJobId === job.id;
          // "Opened on" stamp, so the manager can see how long a request has been
          // waiting while choosing what to schedule. Same fallback as the requests
          // table: openedDate is in-memory only, so a reloaded row formats createdAt.
          // Only for real requests — an ongoing row shows its service date in this
          // slot instead, and a synthetic filter-* createdAt is a due-month placeholder.
          const openedLabel =
            job.type === "malfunction" || job.type === "installation"
              ? (job.openedDate ?? formatHebrewDate(job.createdAt))
              : "";
          return (
            <Fragment key={job.id}>
              {showAssignedHeader && (
                <div className='flex items-center gap-2 pt-2 text-xs text-muted-foreground'>
                  <span className='h-px flex-1 bg-border' />
                  <span className='shrink-0'>
                    משובצות — לא ניתן לבחור ({assignedCount})
                  </span>
                  <span className='h-px flex-1 bg-border' />
                </div>
              )}
            <div
              aria-disabled={isAssigned || undefined}
              className={cn(
                "overflow-hidden rounded-lg border transition-colors",
                isAssigned
                  ? "border-warning/50 bg-warning/5"
                  : isFromOther
                    ? "border-accent bg-accent/5"
                    : "border-border",
              )}>
              {/* The pencil sits OUTSIDE the label — inside it, every click would be
                  forwarded to the checkbox and toggle the selection instead. */}
              <div className='flex items-stretch'>
              <label
                className={cn(
                  "flex min-w-0 flex-1 items-start gap-3 p-3 transition-colors",
                  isAssigned
                    ? "cursor-default opacity-70"
                    : "cursor-pointer hover:bg-muted/30",
                )}>
              <Checkbox
                disabled={isAssigned}
                checked={!isAssigned && selectedJobIds.has(job.id)}
                onCheckedChange={() => onToggleJob(job.id)}
                className='mt-0.5 shrink-0'
              />
              <div className='flex-1 min-w-0'>
                <div className='flex min-w-0 items-center gap-2'>
                  <span
                    className='min-w-0 truncate text-sm font-medium'
                    title={customerName}>
                    {customerName || "—"}
                  </span>
                  {isOngoing ? (
                    <span className='inline-flex shrink-0 items-center px-1.5 py-0.5 text-xs font-medium rounded-full bg-warning/15 text-warning-strong'>
                      לא בוצע
                    </span>
                  ) : (
                    <span
                      className={`inline-flex shrink-0 items-center px-1.5 py-0.5 text-xs font-medium rounded-full ${
                        job.priority === "high"
                          ? "bg-destructive/15 text-destructive"
                          : job.priority === "medium"
                            ? "bg-warning/15 text-warning-strong"
                            : "bg-info/15 text-info"
                      }`}>
                      {job.priority === "high"
                        ? "גבוהה"
                        : job.priority === "medium"
                          ? "בינונית"
                          : "נמוכה"}
                    </span>
                  )}
                </div>
                {isOngoing && taskDescription && (
                  <p 
                    className='truncate text-xs font-medium text-foreground mt-0.5'
                    title={taskDescription}>
                    {taskDescription}
                  </p>
                )}
                <p
                  className='truncate text-xs text-muted-foreground mt-0.5'
                  title={[job.location, job.city].filter(Boolean).join(", ")}>
                  {job.location + ', '}
                  {job.city ? <span className='truncate font-bold'>{job.city} </span> : ""}
                </p>
                {phone && (
                  <p className='flex min-w-0 items-center gap-1 text-xs text-muted-foreground mt-0.5'>
                    <Phone className='w-3 h-3 shrink-0' />
                    <span className='truncate' dir='ltr' title={phone}>
                      {phone}
                    </span>
                  </p>
                )}
                {assignment && (
                  <p
                    className='flex min-w-0 items-center gap-1 text-xs font-medium text-warning-strong mt-0.5'
                    title={assignment.label}>
                    <CalendarDays className='w-3 h-3 shrink-0' />
                    <span className='truncate'>{assignment.label}</span>
                  </p>
                )}
                <div className='flex min-w-0 items-center gap-3 text-xs text-muted-foreground mt-0.5'>
                  {isOngoing ? (
                    serviceDate && (
                      <span className='flex min-w-0 items-center gap-1'>
                        <CalendarDays className='w-3 h-3 shrink-0' />
                        {new Date(
                          serviceDate.slice(0, 10) + "T00:00:00",
                        ).toLocaleDateString("he-IL")}
                      </span>
                    )
                  ) : (
                    <>
                      {openedLabel && (
                        <span
                          className='flex shrink-0 items-center gap-1'
                          title={`נפתח: ${openedLabel}`}>
                          <CalendarDays className='w-3 h-3 shrink-0' />
                          נפתח: {openedLabel}
                        </span>
                      )}
                      <span className='flex shrink-0 items-center gap-1'>
                        <Clock className='w-3 h-3' />
                        {job.estimatedDuration} דק׳
                      </span>
                      <span className='min-w-0 truncate' title={job.notes}>
                        {job.notes}
                      </span>
                    </>
                  )}
                </div>
                {isFromOther && (
                  <p className='flex items-center gap-1 text-xs text-accent-foreground mt-0.5'>
                    <CalendarDays className='w-3 h-3 shrink-0' />
                    <span className='truncate'>משובץ ביום אחר — יועבר לכאן</span>
                  </p>
                )}
              </div>
              </label>
                <button
                  type='button'
                  onClick={() =>
                    isEditing ? onCancelEdit() : onStartEdit(job.id)
                  }
                  className='flex shrink-0 items-center px-3 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60'
                  aria-label={`ערוך פרטים — ${customerName || "משימה"}`}
                  aria-expanded={isEditing}
                  title='ערוך פרטים'>
                  <Pencil className='h-5 w-5' />
                </button>
              </div>

              {isEditing && (
                <PickerJobEditForm
                  job={job}
                  customer={customer}
                  isSaving={isSaving}
                  onSave={(draft, coords) => onSaveEdit(job, draft, coords)}
                  onCancel={onCancelEdit}
                />
              )}
            </div>
            </Fragment>
          );
        })}
      </div>

      {hasMore && (
        <div
          ref={sentinelRef}
          className='h-12 flex items-center justify-center text-xs text-muted-foreground'
          aria-live='polite'>
          עוד פניות זמינות בגלילה
        </div>
      )}
    </div>
  );
}
