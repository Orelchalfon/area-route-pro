import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useJobsContext } from "@/contexts/JobsContext";
import { cn } from "@/lib/utils";
import { normalizeIsraeliPhone, whatsappUrl } from "@/lib/whatsapp";
import { Job, JOB_TYPE_CONFIG, JobType } from "@/types";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { CheckCircle, Clock, GripVertical, MessageCircle, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CustomerInfoPopover } from "../../CustomerInfoPopover";
import { DayRouteMap } from "../../DayRouteMap";
import { FollowUpTasksPopover } from "../FollowUpTasksPopover";
import { typeColors, typeIcons } from "../constants";
import { useDragReorder } from "../hooks/useDragReorder";
import { calculateTimeRanges } from "../utils";

// Day approval dialog with drag-and-drop reordering
export function DayApprovalDialog({
  open,
  onClose,
  dateStr,
  dayJobs,
  filterJobs,
  onApprove,
  onUnapprove,
  approvedDays,
  onAddJob,
}: {
  open: boolean;
  onClose: () => void;
  dateStr: string;
  dayJobs: Job[];
  filterJobs: Job[];
  onApprove: (jobIds: string[], dateStr: string) => void;
  onUnapprove: (dateStr: string) => void;
  approvedDays: Set<string>;
  onAddJob?: (data: {
    type: JobType;
    customerId: string;
    technicianId: string;
    scheduledDate: string;
    scheduledTime: string;
    notes: string;
  }) => void;
}) {
  const initialJobs = useMemo(
    () => [...filterJobs, ...dayJobs],
    [filterJobs, dayJobs],
  );
  const [orderedJobs, setOrderedJobs] = useState<Job[]>(initialJobs);
  const { customersList: customers, markJobCompletion } = useJobsContext();
  const {
    dragIdx,
    overIdx,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
  } = useDragReorder(setOrderedJobs);
  const dayDate = new Date(dateStr + "T00:00:00");
  const dayLabel = format(dayDate, "EEEE d/M", { locale: he });
  const dayDateText = format(dayDate, "d/M/yyyy");
  const isApproved = approvedDays.has(dateStr);

  // Resync the ordered list only when the day's actual job set changes (by id),
  // so a background board refresh while the dialog is open never wipes the manual
  // drag order. (Was a useMemo-as-side-effect keyed on lengths, which reset on every refresh.)
  const jobIdsKey = [...filterJobs, ...dayJobs].map((j) => j.id).join(",");
  useEffect(() => {
    setOrderedJobs([...filterJobs, ...dayJobs]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobIdsKey]);

  const timeRanges = useMemo(
    () => calculateTimeRanges(orderedJobs),
    [orderedJobs],
  );
  const totalMinutes = orderedJobs.reduce((s, j) => s + j.estimatedDuration, 0);
  const endMinutes = 10 * 60 + totalMinutes;
  const overTime = endMinutes > 17 * 60;

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
            <span className='text-xs font-normal text-muted-foreground flex items-center gap-1'>
              <GripVertical className='w-3 h-3' /> גרור לשינוי סדר
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
              <DayRouteMap jobs={orderedJobs} height='100%' />
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
                {overTime && (
                  <span className='text-destructive font-medium'>
                    ⚠ חריגה מ-17:00
                  </span>
                )}
              </div>

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
                  const isOngoing = job.id.startsWith("db-ongoing-");
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
                              onAddJob(data);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

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
                    <Button
                      variant='outline'
                      className='w-full gap-2 border-destructive text-destructive hover:bg-destructive/10'
                      onClick={() => {
                        onUnapprove(dateStr);
                        toast.success("האישור בוטל — ניתן לערוך את היום");
                        onClose();
                      }}>
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
    </Dialog>
  );
}
