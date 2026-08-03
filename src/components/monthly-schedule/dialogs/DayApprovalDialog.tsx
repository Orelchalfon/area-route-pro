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
import { useJobsContext } from "@/contexts/JobsContext";
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
  CheckCircle,
  Clock,
  GripVertical,
  Lock,
  LockOpen,
  MessageCircle,
  RotateCcw,
  Save,
  Wand2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CustomerInfoPopover } from "../../CustomerInfoPopover";
import { DayRouteMap } from "../../DayRouteMap";
import { FollowUpTasksPopover } from "../FollowUpTasksPopover";
import { typeColors, typeIcons } from "../constants";
import { useDragReorder } from "../hooks/useDragReorder";
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
  const { customersList: customers, markJobCompletion } = useJobsContext();
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

  // Stops whose on-screen time no longer matches what is persisted. On an approved day
  // that persisted time is what the customer was told over WhatsApp, so surfacing the
  // diff is what lets the manager re-coordinate. There is no "customer confirmed" flag
  // to consult — /confirm never writes to the database.
  const movedStops = useMemo(
    () =>
      timeRanges
        .filter(
          ({ job, startTime }) => !!job.scheduledTime && job.scheduledTime !== startTime,
        )
        .map(({ job, startTime }) => ({
          job,
          from: job.scheduledTime as string,
          to: startTime,
        })),
    [timeRanges],
  );
  // Anything unsaved at all, including stops that had no time yet.
  const hasUnsavedOrder = timeRanges.some(
    ({ job, startTime }) => job.scheduledTime !== startTime,
  );

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
                          const customerName = customer?.name || "לקוח";
                          const msg = `היי ${customerName} מדברים מטל חרמון רצינו לתאם פגישה לשבוע הבא בתאריך ${dayDateText} בשעה ${startTime} ,אנא אשר הגעת טכנאי.`;
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(
                                  whatsappUrl(waPhone, msg),
                                  "_blank",
                                );
                              }}
                              className='mt-2 w-full flex items-center justify-center gap-1.5 h-8 rounded-md bg-[#25D366] hover:bg-[#1da851] text-white text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-300'>
                              <MessageCircle className='w-3.5 h-3.5' />
                              תאם בוואטסאפ
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

              {/* Customers who were already told a time that has since moved. Only
                  meaningful once the day is approved — that is when the WhatsApp
                  messages went out. */}
              {isApproved && movedStops.length > 0 && (
                <div className='shrink-0 rounded-lg border border-warning/30 bg-warning/10 p-3 space-y-2'>
                  <div className='flex items-center gap-1.5 text-xs font-medium text-warning'>
                    <AlertTriangle className='w-3.5 h-3.5 shrink-0' />
                    {movedStops.length} לקוחות עם שעה מאושרת זזו
                  </div>
                  <div className='space-y-1 max-h-28 overflow-y-auto'>
                    {movedStops.map(({ job, from, to }) => {
                      const customer = customers.find(
                        (c) => c.id === job.customerId,
                      );
                      const waPhone = normalizeIsraeliPhone(
                        job.phone || customer?.phone,
                      );
                      const customerName = customer?.name || "לקוח";
                      return (
                        <div
                          key={job.id}
                          className='flex items-center justify-between gap-2 text-xs'>
                          <span className='truncate'>{customerName}</span>
                          <span className='font-mono shrink-0 opacity-70'>
                            {from} ← {to}
                          </span>
                          {waPhone && (
                            <button
                              className='shrink-0 h-6 px-2 rounded bg-[#25D366] hover:bg-[#1da851] text-white font-medium'
                              onClick={() =>
                                window.open(
                                  whatsappUrl(
                                    waPhone,
                                    `היי ${customerName} מדברים מטל חרמון, השעה של הביקור בתאריך ${dayDateText} עודכנה ל-${to}. אנא אשר.`,
                                  ),
                                  "_blank",
                                )
                              }>
                              תאם מחדש
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Approve button */}
              <div className='shrink-0'>
                {!isApproved ? (
                  <Button
                    className='w-full gap-2 bg-success hover:bg-success/90 text-success-foreground'
                    onClick={() => {
                      onApprove(
                        orderedJobs.map((j) => j.id),
                        dateStr,
                      );
                      toast.success(
                        `יום ${dayLabel} אושר — ${orderedJobs.length} משימות שובצו לטכנאי`,
                      );
                    }}>
                    <CheckCircle className='w-4 h-4' />
                    אשר יום ושלח הודעות ללקוחות
                  </Button>
                ) : (
                  <div className='space-y-2'>
                    <div className='text-center p-3 bg-success/10 rounded-lg text-success text-sm font-medium'>
                      ✓ יום זה אושר — הודעות נשלחו ללקוחות
                    </div>
                    {/* Re-save the arrangement on an already-approved day. Writes stop
                        times only — it must not re-approve, or it would risk clearing
                        the day's lock. */}
                    <Button
                      className='w-full gap-2'
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
                      {hasUnsavedOrder ? "שמור סדר מסלול" : "סדר המסלול שמור"}
                    </Button>
                    <Button
                      variant='outline'
                      className='w-full gap-2'
                      onClick={onToggleLock}>
                      {isLocked ? (
                        <Lock className='w-4 h-4' />
                      ) : (
                        <LockOpen className='w-4 h-4' />
                      )}
                      {isLocked
                        ? "בטל נעילה — אפשר לטכנאי לערוך"
                        : "נעל יום — מנע עריכה מהטכנאי"}
                    </Button>
                    <Button
                      variant='outline'
                      className='w-full gap-2 border-destructive text-destructive hover:bg-destructive/10'
                      onClick={() => setConfirmUnapproveOpen(true)}>
                      <RotateCcw className='w-4 h-4' />
                      בטל אישור יום
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>

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
