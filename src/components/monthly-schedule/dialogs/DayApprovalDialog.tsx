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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useJobsContext } from "@/contexts/JobsContext";
import { arrivalStateFor } from "@/hooks/useArrivalConfirmations";
import { getCustomerCoords } from "@/lib/customerCoords";
import { isOngoingJob } from "@/lib/idConventions";
import { optimizeStopOrder, type LatLng } from "@/lib/routeOptimizer";
import { cn } from "@/lib/utils";
import { normalizeIsraeliPhone, whatsappUrl } from "@/lib/whatsapp";
import { Job, JOB_TYPE_CONFIG, JobType } from "@/types";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle,
  CheckCircle2,
  Circle,
  Clock,
  GripVertical,
  ListChecks,
  Lock,
  LockOpen,
  MessageCircle,
  MoreHorizontal,
  Printer,
  RotateCcw,
  Save,
  Trash2,
  Wand2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { CustomerInfoPopover } from "../../CustomerInfoPopover";
import { DayRouteMap } from "../../DayRouteMap";
import { DayRouteSheet } from "../DayRouteSheet";
import { FollowUpTasksPopover } from "../FollowUpTasksPopover";
import { typeColors, typeIcons } from "../constants";
import { useDragReorder } from "../hooks/useDragReorder";
import { buildRouteSheetRows } from "../routeSheet";
import { calculateTimeRanges } from "../utils";

// Day approval dialog: proposes an efficient route, lets the manager rearrange it, and
// persists that arrangement.
//
// Route order is stored implicitly as `scheduledTime` — every consumer sorts by it
// (DailyRoutePage, TechnicianView, the schedule boards) — so "saving the order" means
// rewriting each stop's clock time from its position in the list.
export function DayApprovalDialog({
  open,
  onClose,
  dateStr,
  dayJobs,
  filterJobs,
  onApprove,
  onSaveRouteOrder,
  onUnapprove,
  approvedDays,
  isLocked,
  onToggleLock,
  onAddJob,
  dayAreas,
  technicianName,
  onOpenDetails,
  onResetDay,
  onMoveDayToOtherTech,
  otherTechName,
  moveDisabled,
}: {
  open: boolean;
  onClose: () => void;
  dateStr: string;
  dayJobs: Job[];
  filterJobs: Job[];
  onApprove: (jobIds: string[], dateStr: string) => void;
  // Re-saves the stop order on an already-approved day. Writes times only and must NOT
  // touch approved_schedule_days, so re-saving can never clear the day's `locked` flag.
  onSaveRouteOrder: (jobIds: string[], dateStr: string) => void;
  onUnapprove: (dateStr: string, resetCompletions: boolean) => void;
  approvedDays: Set<string>;
  isLocked: boolean;
  onToggleLock: () => void;
  // Returns the created job (when it came from addJob) so a caller can offer an undo.
  onAddJob?: (data: {
    type: JobType;
    customerId: string;
    technicianId: string;
    scheduledDate: string;
    scheduledTime: string;
    notes: string;
  }) => void | Promise<Job | undefined>;
  // Both only reach the printed day sheet: the areas the manager selected for the day,
  // and whose sheet this is.
  dayAreas: string[];
  technicianName: string;
  // The day's remaining actions, grouped in this dialog's overflow menu now that the day
  // cell itself only carries add / transfer / reset. Each one replaces this dialog with
  // another one, so the board closes this dialog before opening the next.
  // Not optional: this dialog is the only way into the detail view, which owns per-job
  // editing, closing/returning a call, and the day's completion documentation.
  onOpenDetails: () => void;
  onResetDay?: () => void;
  onMoveDayToOtherTech?: () => void;
  otherTechName?: string;
  /** Target technician's day is locked — the move would produce unreportable stops. */
  moveDisabled?: boolean;
}) {
  const initialJobs = useMemo(
    () =>
      [...filterJobs, ...dayJobs].sort((a, b) =>
        (a.scheduledTime || "").localeCompare(b.scheduledTime || ""),
      ),
    [filterJobs, dayJobs],
  );
  const [orderedJobs, setOrderedJobs] = useState<Job[]>(initialJobs);
  const [confirmUnapproveOpen, setConfirmUnapproveOpen] = useState(false);
  // 'auto' means we own the order and may re-optimize it; 'manual' means the manager
  // arranged it by hand and nothing may reorder it behind their back.
  const [routeMode, setRouteMode] = useState<"auto" | "manual">("auto");
  const [optimizing, setOptimizing] = useState(false);
  const [resolvedCoords, setResolvedCoords] = useState<Map<string, LatLng>>(
    () => new Map(),
  );
  // Content signature of the last coordinate report we accepted, and the job-set key we
  // last auto-optimized for. Both are reset when the dialog moves to another day.
  const coordsSignatureRef = useRef("");
  const autoOptimizedKeyRef = useRef("");
  const {
    customersList: customers,
    markJobCompletion,
    arrivalConfirmations,
    confirmArrival,
    unconfirmArrival,
  } = useJobsContext();
  const {
    dragIdx,
    overIdx,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop: reorderOnDrop,
  } = useDragReorder(setOrderedJobs);
  const dayDate = new Date(dateStr + "T00:00:00");
  const dayLabel = format(dayDate, "EEEE d/M", { locale: he });
  const dayDateText = format(dayDate, "d/M/yyyy");
  const isApproved = approvedDays.has(dateStr);

  // A hand-drag pins the order for good: routeMode flips to 'manual' and auto-optimize
  // never runs again for this day.
  const handleDrop = useCallback(
    (idx: number) => {
      if (dragIdx !== null && dragIdx !== idx) setRouteMode("manual");
      reorderOnDrop(idx);
    },
    [dragIdx, reorderOnDrop],
  );

  // Resync the ordered list when the day's actual job set changes (by id). This MERGES
  // rather than replaces: ids still present keep their current relative position, new
  // ids are appended, removed ids are dropped. Replacing (the previous behavior) would
  // wipe an optimized or hand-dragged order whenever a background refresh changed the
  // set — and since routeMode would still be 'manual', nothing would rebuild it.
  const jobIdsKey = [...filterJobs, ...dayJobs].map((j) => j.id).join(",");
  useEffect(() => {
    setOrderedJobs((prev) => {
      const incoming = new Map(initialJobs.map((j) => [j.id, j]));
      const kept = prev
        .filter((j) => incoming.has(j.id))
        .map((j) => incoming.get(j.id)!);
      const keptIds = new Set(kept.map((j) => j.id));
      const added = initialJobs.filter((j) => !keptIds.has(j.id));
      return [...kept, ...added];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobIdsKey]);

  // Reset per-day planning state when the dialog moves to another day.
  useEffect(() => {
    setRouteMode("auto");
    setResolvedCoords(new Map());
    coordsSignatureRef.current = "";
    autoOptimizedKeyRef.current = "";
  }, [dateStr]);

  // --- Coordinates -------------------------------------------------------------
  // DayRouteMap reports the coordinates it geocoded. Ignore reports whose content is
  // unchanged (the signature is id-sorted, so merely reordering the list does not
  // count) — otherwise optimizing would change the order, which would re-report, which
  // would optimize again.
  const handleCoordsResolved = useCallback((coords: Map<string, LatLng>) => {
    const signature = [...coords.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, c]) => `${id}:${c.lat.toFixed(5)}:${c.lng.toFixed(5)}`)
      .join("|");
    if (signature === coordsSignatureRef.current) return;
    coordsSignatureRef.current = signature;
    setResolvedCoords(coords);
  }, []);

  // Geocoded position when we have one; otherwise the city-centre estimate, which is
  // rough but still better than optimizing on nothing.
  const coordsForJob = useCallback(
    (job: Job): LatLng => {
      const resolved = resolvedCoords.get(job.id);
      if (resolved) return resolved;
      const customer = customers.find((c) => c.id === job.customerId);
      return customer
        ? getCustomerCoords(customer)
        : { lat: 32.07, lng: 34.77 };
    },
    [resolvedCoords, customers],
  );

  // --- Optimization ------------------------------------------------------------
  const runOptimize = useCallback(async () => {
    const snapshot = orderedJobs;
    if (snapshot.length < 2) return;
    setOptimizing(true);
    try {
      const order = await optimizeStopOrder(snapshot.map(coordsForJob));
      setOrderedJobs((prev) => {
        // Bail if the job set shifted while we were awaiting Google.
        const stale =
          prev.length !== snapshot.length ||
          prev.some((j, i) => j.id !== snapshot[i].id);
        return stale ? prev : order.map((i) => snapshot[i]);
      });
    } finally {
      setOptimizing(false);
    }
  }, [orderedJobs, coordsForJob]);

  // Propose an efficient route as soon as the day is opened — but only while we still
  // own the order, and never on an approved day (whose saved order is the plan of
  // record, and whose customers have already been told their times).
  // Runs at most twice per job set: once on the first coordinates we get, once more if
  // they later become complete enough to give a better answer.
  const coordsComplete =
    orderedJobs.length > 0 &&
    orderedJobs.every((j) => resolvedCoords.has(j.id));
  useEffect(() => {
    if (!open || isApproved || routeMode === "manual") return;
    if (orderedJobs.length < 2) return;
    const key = `${dateStr}|${jobIdsKey}|${coordsComplete ? "full" : "partial"}`;
    if (key === autoOptimizedKeyRef.current) return;
    autoOptimizedKeyRef.current = key;
    void runOptimize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isApproved, routeMode, dateStr, jobIdsKey, coordsComplete]);

  const handleManualOptimize = useCallback(async () => {
    setRouteMode("auto");
    autoOptimizedKeyRef.current = `${dateStr}|${jobIdsKey}|manual-run`;
    await runOptimize();
    toast.success("המסלול סודר מחדש לפי המרחק בפועל");
  }, [dateStr, jobIdsKey, runOptimize]);

  const timeRanges = useMemo(
    () => calculateTimeRanges(orderedJobs),
    [orderedJobs],
  );
  const totalMinutes = orderedJobs.reduce((s, j) => s + j.estimatedDuration, 0);
  const endMinutes = 10 * 60 + totalMinutes;

  // Anything unsaved at all, including stops that had no time yet.
  const hasUnsavedOrder = timeRanges.some(
    ({ job, startTime }) => job.scheduledTime !== startTime,
  );

  // Whether the customer agreed to this visit, judged against the slot currently ON SCREEN
  // rather than the persisted one. That way an unsaved reorder immediately shows the affected
  // customers as needing re-confirmation, and confirming during an unsaved reorder records the
  // time the manager is actually looking at.
  const arrivalStateOf = useCallback(
    (job: Job, startTime: string) =>
      arrivalStateFor(
        { scheduledDate: dateStr, scheduledTime: startTime },
        arrivalConfirmations.get(job.id),
      ),
    [dateStr, arrivalConfirmations],
  );

  // Rows of the printable day sheet. Built from `timeRanges` — the very array the
  // timeline below maps over — rather than from the persisted times, so the numbers on
  // paper are the numbers on screen even mid-reorder. `startTime` is derived from list
  // position, so buildRouteSheetRows' sort by it is the identity here.
  const sheetRows = useMemo(
    () =>
      buildRouteSheetRows(
        timeRanges.map(({ job, startTime }) => ({
          ...job,
          scheduledTime: startTime,
        })),
        customers,
      ),
    [timeRanges, customers],
  );

  const arrivalCounts = useMemo(() => {
    const counts = { confirmed: 0, stale: 0, none: 0 };
    timeRanges.forEach(({ job, startTime }) => {
      counts[arrivalStateOf(job, startTime)] += 1;
    });
    return counts;
  }, [timeRanges, arrivalStateOf]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className='max-w-6xl max-h-[90vh] overflow-y-auto'
        dir='rtl'>
        <DialogHeader>
          <DialogTitle className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              {isApproved && <CheckCircle className='w-5 h-5 text-success' />}
              אישור לו״ז — {dayLabel}
            </div>
            <span className='text-xs font-normal text-muted-foreground flex items-center gap-1 me-6'>
              <GripVertical className='w-3 h-3' />
              {routeMode === "manual" ? "סדר ידני — נשמר כפי שסידרת" : "גרור לשינוי סדר"}
            </span>
          </DialogTitle>
        </DialogHeader>

        {orderedJobs.length === 0 ? (
          <p className='text-sm text-muted-foreground text-center py-6'>
            אין משימות ליום זה
          </p>
        ) : (
          <div
            className='grid grid-cols-1 lg:grid-cols-[65%_35%] gap-4'
            style={{ direction: "ltr" }}>
            {/* Map - LEFT side */}
            <div className='rounded-xl overflow-hidden border border-border order-first h-[45vh] lg:h-[70vh]'>
              <DayRouteMap
                jobs={orderedJobs}
                height='100%'
                onCoordsResolved={handleCoordsResolved}
              />
            </div>

            {/* Job list - RIGHT side */}
            <div
              className='order-last flex flex-col gap-3 h-[55vh] lg:h-[70vh]'
              dir='rtl'>
              {/* Summary */}
              <div className='flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm shrink-0'>
                <span>{orderedJobs.length} משימות</span>
                {/* All three states, not a "5/8" fraction: re-optimizing a fully confirmed day
                    would send a fraction to 0/8, which reads as data loss rather than "these
                    need re-confirming". */}
                {isApproved && (
                  <span className='flex items-center gap-2 text-xs'>
                    <span className='text-success'>✓ {arrivalCounts.confirmed}</span>
                    {arrivalCounts.stale > 0 && (
                      <span className='text-warning'>⚠ {arrivalCounts.stale}</span>
                    )}
                    {arrivalCounts.none > 0 && (
                      <span className='text-muted-foreground'>○ {arrivalCounts.none}</span>
                    )}
                    <span className='text-muted-foreground'>אישרו הגעה</span>
                  </span>
                )}
                <span>
                  10:00 – {String(Math.floor(endMinutes / 60)).padStart(2, "0")}
                  :{String(endMinutes % 60).padStart(2, "0")}
                </span>
              </div>

              {/* Re-optimize — always an explicit act, never something that happens
                  to a manually arranged route on its own. */}
              <Button
                variant='outline'
                size='sm'
                className='w-full gap-2 shrink-0'
                disabled={optimizing || orderedJobs.length < 2}
                onClick={handleManualOptimize}>
                {optimizing ? (
                  <>
                    <span className='w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin' />
                    מחשב מסלול יעיל…
                  </>
                ) : (
                  <>
                    <Wand2 className='w-4 h-4' />
                    סדר מסלול אוטומטית (מאבני חפץ וחזרה)
                  </>
                )}
              </Button>

              {/* Scrollable timeline */}
              <div className='flex-1 overflow-y-auto space-y-1 min-h-0'>
                {timeRanges.map(({ job, startTime, endTime }, i) => {
                  const customer = customers.find(
                    (c) => c.id === job.customerId,
                  );
                  const phone = job.phone || customer?.phone;
                  const typeConfig = JOB_TYPE_CONFIG[job.type];
                  // Job details (הערות) shown inline so the manager sees them without
                  // opening anything — mirrors UnifiedJobPickerDialog: ongoing-service
                  // jobs store "task | note", so surface just the task description; all
                  // other jobs show their full notes string.
                  const isOngoing = isOngoingJob(job.id);
                  const noteText = (
                    isOngoing ? (job.notes || "").split(" | ")[0] : job.notes
                  )?.trim();
                  const isDragging = dragIdx === i;
                  const isOver = overIdx === i && dragIdx !== i;
                  return (
                    <div
                      key={job.id}
                      draggable
                      onDragStart={() => handleDragStart(i)}
                      onDragOver={(e) => handleDragOver(e, i)}
                      onDrop={() => handleDrop(i)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        `p-3 rounded-lg border ${typeColors[job.type]} cursor-grab active:cursor-grabbing transition-all`,
                        isDragging && "opacity-40 scale-95",
                        isOver && "ring-2 ring-primary ring-offset-2",
                      )}>
                      <div className='flex items-center justify-between mb-1'>
                        <div className='flex items-center gap-2'>
                          <div className='w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-primary shrink-0'>
                            {i + 1}
                          </div>
                          <GripVertical className='w-4 h-4 text-muted-foreground/40' />
                          {typeIcons[job.type]}
                          {customer ? (
                            <CustomerInfoPopover customer={customer}>
                              <span className='font-medium text-sm'>
                                {customer.name}
                              </span>
                            </CustomerInfoPopover>
                          ) : (
                            <span className='font-medium text-sm'>—</span>
                          )}
                        </div>
                        <div className='flex items-center gap-1.5 text-xs font-mono'>
                          <Clock className='w-3 h-3' />
                          <span>
                            {startTime} – {endTime}
                          </span>
                        </div>
                      </div>
                      <div className='flex items-center justify-between text-xs opacity-70'>
                        <span>
                          {typeConfig.label} · {job.estimatedDuration} דק׳
                        </span>
                        <span
                          title={[job.location, job.city]
                            .filter(Boolean)
                            .join(", ")}>
                          {job.location}
                          {job.city ? `, ${job.city}` : ""}
                        </span>
                      </div>
                      {noteText && (
                        <p
                          className='text-xs opacity-70 mt-1 line-clamp-2'
                          title={noteText}>
                          {noteText}
                        </p>
                      )}
                      {phone && (
                        <div className='text-xs opacity-60 mt-0.5'>
                          📱 <span dir='ltr'>{phone}</span>
                        </div>
                      )}
                      {/* WhatsApp — fades in once the day is approved; coordinates the appointment a week ahead */}
                      {isApproved &&
                        (() => {
                          const waPhone = normalizeIsraeliPhone(phone);
                          if (!waPhone) return null;
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(
                                  whatsappUrl(waPhone),
                                  "_blank",
                                );
                              }}
                              className='mt-2 w-full flex items-center justify-center gap-1.5 h-8 rounded-md bg-[#25D366] hover:bg-[#1da851] text-white text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-300'>
                              <MessageCircle className='w-3.5 h-3.5' />
                              תאם בוואטסאפ
                            </button>
                          );
                        })()}
                      {/* Did the customer actually agree? Recorded by the manager after the
                          WhatsApp reply comes back. Deliberately NOT gated on having a phone —
                          plenty of customers confirm by voice. One click either way. */}
                      {isApproved &&
                        (() => {
                          const state = arrivalStateOf(job, startTime);
                          const confirmation = arrivalConfirmations.get(job.id);
                          const isConfirmed = state === "confirmed";
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isConfirmed) {
                                  unconfirmArrival(job.id);
                                  return;
                                }
                                confirmArrival(
                                  job.id,
                                  dateStr,
                                  startTime,
                                  job.technicianId,
                                );
                              }}
                              title={
                                isConfirmed && confirmation
                                  ? `אושר ב-${new Date(confirmation.confirmedAt).toLocaleString("he-IL")} — לחץ לביטול`
                                  : "סמן שהלקוח אישר את הגעת הטכנאי"
                              }
                              className={cn(
                                "mt-1.5 w-full flex items-center justify-center gap-1.5 h-8 rounded-md border text-xs font-medium transition-colors",
                                isConfirmed
                                  ? "bg-success/10 border-success/30 text-success hover:bg-success/20"
                                  : state === "stale"
                                    ? "bg-warning/10 border-warning/30 text-warning hover:bg-warning/20"
                                    : "border-border text-muted-foreground hover:bg-muted",
                              )}>
                              {isConfirmed ? (
                                <>
                                  <CheckCircle2 className='w-3.5 h-3.5' />
                                  אושרה הגעת טכנאי
                                </>
                              ) : state === "stale" ? (
                                <>
                                  <AlertTriangle className='w-3.5 h-3.5' />
                                  אושר ל-{confirmation?.scheduledTime} · המועד השתנה
                                </>
                              ) : (
                                <>
                                  <Circle className='w-3.5 h-3.5' />
                                  סמן שהלקוח אישר
                                </>
                              )}
                            </button>
                          );
                        })()}
                      {/* Follow-up tasks (משימות להמשך) — only for a job the technician
                          already reported as done. Creates the next annual service
                          (שנה מהיום) and re-affirms the current job as done. */}
                      {job.completionStatus === "done" && onAddJob && (
                        <div className='mt-2 flex' onClick={(e) => e.stopPropagation()}>
                          <FollowUpTasksPopover
                            job={job}
                            customers={customers}
                            onAddJob={(data) => {
                              markJobCompletion(
                                job.id,
                                "done",
                                job.completionNotes || "",
                              );
                              // Returned so the popover can offer to revert what it created.
                              return onAddJob(data);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Day actions. One row, laid out right-to-left by the enclosing dir='rtl':
                  primary action · save · everything else behind a menu. An unapproved day
                  has only the one button, so it keeps the full width and the full label. */}
              <div className='shrink-0 space-y-2'>
                {isApproved && (
                  <div className='flex items-center justify-center gap-2 p-3 bg-success/10 rounded-lg text-success text-sm font-medium'>
                    <span>✓ יום זה אושר — הודעות נשלחו ללקוחות</span>
                    {/* The lock button now lives in the menu, so its state has to show
                        somewhere it can be seen without opening anything. */}
                    {isLocked && (
                      <span className='flex items-center gap-1'>
                        <Lock className='w-3.5 h-3.5' />
                        נעול
                      </span>
                    )}
                  </div>
                )}
                <div className='flex items-center gap-2'>
                  {!isApproved ? (
                    <Button
                      className='flex-1 min-w-0 gap-2 bg-success hover:bg-success/90 text-success-foreground'
                      onClick={() => {
                        onApprove(
                          orderedJobs.map((j) => j.id),
                          dateStr,
                        );
                        toast.success(
                          `יום ${dayLabel} אושר — ${orderedJobs.length} משימות שובצו לטכנאי`,
                        );
                      }}>
                      <CheckCircle className='w-4 h-4 shrink-0' />
                      <span className='truncate'>אשר יום ושלח הודעות ללקוחות</span>
                    </Button>
                  ) : (
                    /* Re-save the arrangement on an already-approved day. Writes stop
                       times only — it must not re-approve, or it would risk clearing
                       the day's lock. It is the one thing a manager does repeatedly on an
                       approved day, so it gets the row to itself; בטל אישור moved into the
                       menu with the rest of the day-level actions. */
                    <Button
                      className='flex-1 min-w-0'
                      disabled={!hasUnsavedOrder}
                      onClick={() => {
                        onSaveRouteOrder(
                          orderedJobs.map((j) => j.id),
                          dateStr,
                        );
                        toast.success(
                          `סדר המסלול נשמר — ${orderedJobs.length} עצירות`,
                        );
                      }}>
                      <Save className='w-4 h-4' />
                      <span className='truncate'>
                        {hasUnsavedOrder ? "שמור סדר מסלול" : "סדר המסלול שמור"}
                      </span>
                    </Button>
                  )}
                  {/* Every remaining action for this day, in one menu — the day cell keeps
                      only add / transfer / reset. Rendered for an unapproved day too: the
                      detail view and the reset are reachable from nowhere else once the
                      cell's icon buttons are gone. */}
                  {/* dir belongs on the root, not on Content: Radix reads it for arrow-key
                      direction and passes it down to the rendered element. */}
                  <DropdownMenu dir='rtl'>
                    <DropdownMenuTrigger asChild>
                      {/* "More actions", not "expand the button beside me" — hence the
                          overflow glyph rather than a chevron. */}
                      <Button
                        variant='outline'
                        size='icon'
                        className='shrink-0'
                        title='פעולות נוספות'
                        aria-label='פעולות נוספות ליום'>
                        <MoreHorizontal className='w-4 h-4' />
                      </Button>
                    </DropdownMenuTrigger>
                    {/* Fixed width: the item set changes between an approved and an
                        unapproved day, and an auto-sized menu would jump between them. */}
                    <DropdownMenuContent align='end' className='w-64'>
                      <DropdownMenuItem onSelect={onOpenDetails}>
                        <ListChecks className='w-4 h-4' />
                        פרטי היום ועריכת משימות
                      </DropdownMenuItem>
                      {isApproved && (
                        <DropdownMenuItem onSelect={onToggleLock}>
                          {isLocked ? (
                            <Lock className='w-4 h-4' />
                          ) : (
                            <LockOpen className='w-4 h-4' />
                          )}
                          {isLocked
                            ? "בטל נעילה — אפשר לטכנאי לערוך"
                            : "נעל יום — מנע עריכה מהטכנאי"}
                        </DropdownMenuItem>
                      )}
                      {/* The paper sheet the technician takes to the field, replacing
                          the hand-copied form. Only for an approved day — the portalled
                          sheet below renders on the same condition. Print CSS hides the
                          app and this dialog and leaves only that sheet.
                          Deferred a tick: window.print() blocks the main thread until
                          the print dialog is dismissed, and firing it mid-close leaves
                          the menu's unmount — including the pointer-events lock Radix
                          puts on <body> — half-finished behind the modal. */}
                      {isApproved && (
                        <DropdownMenuItem
                          onSelect={() => {
                            window.setTimeout(() => window.print(), 0);
                          }}>
                          <Printer className='w-4 h-4' />
                          הדפס דף יום
                        </DropdownMenuItem>
                      )}
                      {onMoveDayToOtherTech && otherTechName && !isLocked && (
                        <DropdownMenuItem
                          onSelect={onMoveDayToOtherTech}
                          disabled={moveDisabled}>
                          <ArrowLeftRight className='w-4 h-4' />
                          {moveDisabled
                            ? `היום נעול אצל ${otherTechName}`
                            : `העבר את היום ל${otherTechName}`}
                        </DropdownMenuItem>
                      )}
                      {/* Everything that undoes work sits below the separator, away from
                          the routine actions above it. */}
                      {(isApproved || onResetDay) && <DropdownMenuSeparator />}
                      {isApproved && (
                        <DropdownMenuItem
                          onSelect={() => setConfirmUnapproveOpen(true)}
                          className='text-destructive focus:text-destructive'>
                          <RotateCcw className='w-4 h-4' />
                          בטל אישור יום
                        </DropdownMenuItem>
                      )}
                      {onResetDay && (
                        <DropdownMenuItem
                          onSelect={onResetDay}
                          className='text-destructive focus:text-destructive'>
                          <Trash2 className='w-4 h-4' />
                          אפס יום — הסר את כל המשימות
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Portalled to <body> rather than rendered inside DialogContent, whose
          max-h/overflow would clip the printed output to a single viewport. The rows
          still come from this dialog's own state, so the sheet cannot disagree with the
          route that was approved. */}
      {open &&
        isApproved &&
        sheetRows.length > 0 &&
        createPortal(
          <div className='print-sheet-root'>
            <DayRouteSheet
              dateText={dayDateText}
              areas={dayAreas}
              technicianName={technicianName}
              rows={sheetRows}
            />
          </div>,
          document.body,
        )}

      <AlertDialog
        open={confirmUnapproveOpen}
        onOpenChange={setConfirmUnapproveOpen}>
        <AlertDialogContent dir='rtl'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-right'>
              לאפס גם את דיווחי ההשלמה?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-right'>
              ביטול האישור יחזיר את היום לעריכה. האם לאפס גם את הדיווחים
              ("בוצע"/"לא בוצע") שהטכנאי כבר סימן, כך שהמשימות יחזרו למצב פתוח?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <Button
              variant='outline'
              onClick={() => {
                onUnapprove(dateStr, false);
                setConfirmUnapproveOpen(false);
                onClose();
              }}>
              לא, רק בטל אישור
            </Button>
            <AlertDialogAction
              onClick={() => {
                onUnapprove(dateStr, true);
                setConfirmUnapproveOpen(false);
                onClose();
              }}>
              כן, אפס גם דיווחים
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
