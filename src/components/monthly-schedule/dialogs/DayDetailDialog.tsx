import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useJobsContext } from "@/contexts/JobsContext";
import type { DayDocumentationRecord } from "@/hooks/useCompletedDayRecords";
import { isOngoingJob } from "@/lib/idConventions";
import { CompletionStatus, Job, JOB_TYPE_CONFIG, JobType } from "@/types";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { Archive, Navigation, Pencil, Phone, Save, Undo2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AddressAutocomplete } from "../../AddressAutocomplete";
import { DayRouteMap } from "../../DayRouteMap";
import { FollowUpTasksPopover } from "../FollowUpTasksPopover";
import { typeColors, typeIcons } from "../constants";
import { useJobEditForm } from "../hooks/useJobEditForm";

const DOCUMENTED_OUTCOME: Record<CompletionStatus, string> = {
  done: "✓ בוצע",
  not_done: "✗ לא בוצע",
  need_return: "↻ צריך לחזור",
};

export function DayDetailDialog({
  open,
  onClose,
  dateStr,
  dayJobs,
  filterJobs,
  documentation = [],
  onRemoveJob,
  onCloseJob,
  onReturnJob,
  onAddJob,
}: {
  open: boolean;
  onClose: () => void;
  dateStr: string;
  dayJobs: Job[];
  filterJobs: Job[];
  /** Finished visits for this day, including ones whose call was already closed. */
  documentation?: DayDocumentationRecord[];
  onRemoveJob: (jobId: string) => void;
  onMoveJob?: (jobId: string) => void;
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
}) {
  const initialJobs = useMemo(
    () => [...filterJobs, ...dayJobs],
    [filterJobs, dayJobs],
  );
  const [orderedJobs, setOrderedJobs] = useState<Job[]>(initialJobs);
  const { customersList: customers } = useJobsContext();
  const {
    editingJobId,
    editForm,
    setEditForm,
    setPendingEditCoords,
    isEditSaving,
    startEditingJob,
    closeEditingJob,
    handleSaveEditedJob,
  } = useJobEditForm(setOrderedJobs);
  const dayDate = new Date(dateStr + "T00:00:00");
  const dayLabel = format(dayDate, "EEEE d/M", { locale: he });
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // Sync when source data changes
  useEffect(() => {
    setOrderedJobs([...filterJobs, ...dayJobs]);
  }, [filterJobs, dayJobs]);

  const completionColorMap: Record<string, string> = {
    done: "border-success bg-success/10",
    not_done: "border-destructive bg-destructive/10",
    need_return: "border-warning bg-warning/10",
  };

  // Calculate time ranges based on current order
  const timeRanges = useMemo(() => {
    let currentMinutes = 10 * 60;
    return orderedJobs.map((job) => {
      const startHour = Math.floor(currentMinutes / 60);
      const startMin = currentMinutes % 60;
      const endMinutes = currentMinutes + job.estimatedDuration;
      const endHour = Math.floor(endMinutes / 60);
      const endMin = endMinutes % 60;
      const startTime = `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}`;
      const endTime = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;
      currentMinutes = endMinutes;
      return { startTime, endTime };
    });
  }, [orderedJobs]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className='max-w-6xl max-h-[90vh] overflow-y-auto'
        dir='rtl'>
        <DialogHeader>
          <DialogTitle className='flex items-center justify-between'>
            <span>{dayLabel}</span>
            {/* No reorder affordance here on purpose: this dialog has no save path, and
                its list is rebuilt from fresh arrays on every parent render, so a drag
                would snap straight back. Route order is arranged in DayApprovalDialog. */}
            <span className='text-xs font-normal text-muted-foreground me-6'>
              לשינוי סדר המסלול — אישור לו״ז
            </span>
          </DialogTitle>
          <DialogDescription className='sr-only'>פירוט כל המשימות המשובצות ליום זה.</DialogDescription>
        </DialogHeader>

        <div
          className='grid grid-cols-1 lg:grid-cols-[65%_35%] gap-4'
          style={{ direction: "ltr" }}>
          {/* Map - LEFT side */}
          <div className='rounded-xl overflow-hidden border border-border order-first h-[45vh] lg:h-[70vh]'>
            {orderedJobs.length > 0 ? (
              <DayRouteMap jobs={orderedJobs} height='100%' />
            ) : (
              <div className='flex items-center justify-center h-full bg-muted/20'>
                <p className='text-sm text-muted-foreground'>
                  אין משימות להצגה
                </p>
              </div>
            )}
          </div>

          {/* Job list - RIGHT side */}
          <div
            className='order-last overflow-y-auto space-y-2 h-[55vh] lg:h-[70vh]'
            dir='rtl'>
            {orderedJobs.length === 0 && (
              <p className='text-sm text-muted-foreground text-center py-4'>
                אין משימות ליום זה
              </p>
            )}
            {orderedJobs.map((job, idx) => {
              const customer = customers.find((c) => c.id === job.customerId);
              const typeConfig = JOB_TYPE_CONFIG[job.type];
              // Job details (הערות) inline so the manager reads them without opening the
              // edit form — same job.notes the edit הערות field binds to. Ongoing-service
              // jobs store "task | note", so surface just the task description.
              const isOngoing = isOngoingJob(job.id);
              const noteText = (
                isOngoing ? (job.notes || "").split(" | ")[0] : job.notes
              )?.trim();
              const isCompleted = job.status === "completed";
              const borderClass = job.completionStatus
                ? completionColorMap[job.completionStatus]
                : typeColors[job.type];
              const isExpanded = expandedJobId === job.id;
              const time = timeRanges[idx];

              return (
                <div key={job.id}>
                  <div
                    className={`p-3 rounded-lg border-2 ${borderClass} flex items-center gap-2 cursor-pointer transition-all`}
                    onClick={() =>
                      setExpandedJobId(isExpanded ? null : job.id)
                    }>
                    {/* Number badge */}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                        isCompleted && job.completionStatus === "done"
                          ? "bg-success"
                          : "bg-primary"
                      }`}>
                      {isCompleted && job.completionStatus === "done"
                        ? "✓"
                        : idx + 1}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          {typeIcons[job.type]}
                          <span className='text-sm font-medium'>
                            {customer?.name}
                          </span>
                        </div>
                        {time && (
                          <span className='text-xs font-mono text-muted-foreground shrink-0'>
                            {time.startTime}–{time.endTime}
                          </span>
                        )}
                      </div>
                      <p className='text-xs opacity-70'>
                        {typeConfig.label} · {job.estimatedDuration} דק׳
                      </p>
                      <p
                        className='text-xs opacity-60'
                        title={[job.location, job.city]
                          .filter(Boolean)
                          .join(", ")}>
                        {job.location}
                        {job.city ? `, ${job.city}` : ""}
                      </p>
                      {noteText && (
                        <p
                          className='text-xs opacity-60 mt-0.5 line-clamp-2'
                          title={noteText}>
                          {noteText}
                        </p>
                      )}
                      {(job.phone || customer?.phone) && (
                        <a
                          href={`tel:${job.phone || customer?.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className='flex items-center gap-1 text-xs opacity-70 hover:text-primary transition-colors w-fit'>
                          <Phone className='w-3 h-3' />
                          <span dir='ltr'>{job.phone || customer?.phone}</span>
                        </a>
                      )}
                      {isCompleted && (
                        <p className='text-xs font-medium mt-0.5'>
                          {job.completionStatus === "done"
                            ? "✓ בוצע"
                            : job.completionStatus === "not_done"
                              ? "✗ לא בוצע"
                              : job.completionStatus === "need_return"
                                ? "↻ צריך לחזור"
                                : ""}
                        </p>
                      )}
                    </div>
                    <div className='flex items-center gap-1 shrink-0'>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditingJob(job);
                        }}
                        className='p-1 rounded hover:bg-info/10 transition-colors'
                        title='ערוך משימה'>
                        <Pencil className='w-3.5 h-3.5 text-info' />
                      </button>
                      {customer && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(customer.address + ", " + customer.city)}`}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='p-1 rounded hover:bg-primary/10 transition-colors'
                          title='נווט'
                          onClick={(e) => e.stopPropagation()}>
                          <Navigation className='w-3.5 h-3.5 text-primary' />
                        </a>
                      )}
                      {!isCompleted && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveJob(job.id);
                          }}
                          className='p-1 rounded hover:bg-destructive/10'
                          title='הסר מהלו״ז'>
                          <X className='w-3.5 h-3.5 text-destructive' />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Edit form */}
                  {editingJobId === job.id && (
                    <div
                      className='mt-1 p-3 rounded-lg bg-info/5 border border-info/30 space-y-2'
                      onClick={(e) => e.stopPropagation()}>
                      <div>
                        <label className='text-xs font-semibold text-muted-foreground'>
                          כתובת
                        </label>
                        <AddressAutocomplete
                          value={editForm.location}
                          onChange={(val) => {
                            setEditForm((f) => ({ ...f, location: val }));
                            setPendingEditCoords(null);
                          }}
                          onPlaceSelect={(place) => {
                            setEditForm((f) => ({
                              ...f,
                              location: place.address,
                              city: place.city,
                            }));
                            setPendingEditCoords({
                              lat: place.lat,
                              lng: place.lng,
                              placeId: place.placeId,
                            });
                          }}
                          placeholder='הקלד כתובת...'
                          className='h-8 text-xs'
                        />
                      </div>
                      <div className='grid grid-cols-2 gap-2'>
                        <div>
                          <label className='text-xs font-semibold text-muted-foreground'>
                            עיר
                          </label>
                          <Input
                            value={editForm.city}
                            onChange={(e) => {
                              setEditForm((f) => ({
                                ...f,
                                city: e.target.value,
                              }));
                              setPendingEditCoords(null);
                            }}
                            className='h-8 text-xs'
                          />
                        </div>
                        <div>
                          <label className='text-xs font-semibold text-muted-foreground'>
                            טלפון
                          </label>
                          <Input
                            type='tel'
                            dir='ltr'
                            value={editForm.phone}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                phone: e.target.value,
                              }))
                            }
                            className='h-8 text-xs'
                          />
                        </div>
                      </div>
                      <div className='grid grid-cols-2 gap-2'>
                        <div className='w-full'>
                          <label className='text-xs font-semibold text-muted-foreground'>
                            משך (דקות)
                          </label>
                          <Input
                            type='number'
                            value={editForm.estimatedDuration}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                estimatedDuration:
                                  parseInt(e.target.value) || 0,
                              }))
                            }
                            className='h-8 text-xs'
                          />
                        </div>
                      </div>
                      <div>
                        <label className='text-xs font-semibold text-muted-foreground'>
                          הערות
                        </label>
                        <Input
                          value={editForm.notes}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              notes: e.target.value,
                            }))
                          }
                          className='h-8 text-xs'
                        />
                      </div>
                      <div className='flex gap-2 pt-1'>
                        <Button
                          size='sm'
                          className='text-xs gap-1'
                          onClick={() => void handleSaveEditedJob(job)}
                          disabled={isEditSaving}>
                          <Save className='w-3 h-3' />
                          {isEditSaving ? "שומר..." : "שמור"}
                        </Button>
                        <Button
                          size='sm'
                          variant='ghost'
                          className='text-xs'
                          onClick={closeEditingJob}
                          disabled={isEditSaving}>
                          ביטול
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Expanded details */}
                  {isExpanded && isCompleted && editingJobId !== job.id && (
                    <div className='mt-1 p-3 rounded-lg bg-muted/50 border border-border space-y-2'>
                      {job.completionNotes && (
                        <div>
                          <p className='text-xs font-semibold text-muted-foreground mb-0.5'>
                            הערות טכנאי:
                          </p>
                          <p className='text-sm'>{job.completionNotes}</p>
                        </div>
                      )}
                      <div className='flex flex-wrap gap-2'>
                        {onCloseJob && (
                          <Button
                            size='sm'
                            variant='outline'
                            className='flex-1 text-xs'
                            onClick={() => {
                              onCloseJob(job.id);
                              toast.success("הקריאה נסגרה והועברה להיסטוריה");
                            }}>
                            <Archive className='w-3 h-3 ml-1' />
                            סגור קריאה
                          </Button>
                        )}
                        {job.completionStatus === "done" && onAddJob && (
                          <FollowUpTasksPopover
                            job={job}
                            customers={customers}
                            onAddJob={onAddJob}
                          />
                        )}
                        {onReturnJob &&
                          (job.completionStatus === "not_done" ||
                            job.completionStatus === "need_return") && (
                            <Button
                              size='sm'
                              variant='outline'
                              className='flex-1 text-xs border-warning text-warning-strong hover:bg-warning/10'
                              onClick={() => {
                                onReturnJob(job.id);
                                toast.success(
                                  job.type === "filter_replacement"
                                    ? "המשימה הוחזרה לשיבוץ"
                                    : "הקריאה הוחזרה לטבלה",
                                );
                              }}>
                              <Undo2 className='w-3 h-3 ml-1' />
                              החזר קריאה
                            </Button>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Visits already finished (and possibly closed) on this day. They are no
                longer work, so they sit below the list as a read-only record. */}
            {documentation.length > 0 && (
              <div className='pt-3 mt-3 border-t border-border space-y-2'>
                <p className='text-xs font-semibold text-muted-foreground'>
                  תיעוד — משימות שהושלמו ({documentation.length})
                </p>
                {documentation.map((record) => {
                  const outcome = DOCUMENTED_OUTCOME[record.completionStatus];
                  return (
                    <div
                      key={record.id}
                      className='rounded-lg border border-dashed border-border bg-muted/20 p-2'>
                      <div className='flex items-center justify-between gap-2'>
                        <span className='truncate text-sm font-medium'>
                          {record.customerName}
                        </span>
                        <span className='shrink-0 text-xs text-muted-foreground'>
                          {outcome}
                        </span>
                      </div>
                      {[record.location, record.city].filter(Boolean).length >
                        0 && (
                        <p className='truncate text-xs text-muted-foreground'>
                          {[record.location, record.city]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                      <p className='mt-1 whitespace-pre-wrap text-xs'>
                        <span className='font-medium'>הערות טכנאי: </span>
                        {record.completionNotes || "לא נרשמו הערות"}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
