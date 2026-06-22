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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useJobsContext } from "@/contexts/JobsContext";
import { technicians } from "@/data/mockData";
import { useGoogleMapsKey } from "@/hooks/useGoogleMapsKey";
import { geocodeAddress } from "@/lib/geocodeAddress";
import { cn } from "@/lib/utils";
import { normalizeIsraeliPhone, whatsappUrl } from "@/lib/whatsapp";
import { Customer, Job, JOB_TYPE_CONFIG, JobType } from "@/types";
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
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
  Archive,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  GripVertical,
  MapPin,
  MessageCircle,
  Navigation,
  Pencil,
  Plus,
  Save,
  Undo2,
  Wrench,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { CustomerInfoPopover } from "./CustomerInfoPopover";
import { DayRouteMap } from "./DayRouteMap";
import {
  DAY_HEADERS,
  MONTH_NAMES,
  typeColors,
  typeIcons,
} from "./monthly-schedule/constants";
import { FollowUpTasksPopover } from "./monthly-schedule/FollowUpTasksPopover";
import { MiniJobChip } from "./monthly-schedule/MiniJobChip";
import { REGIONS, jobMatchesAreas } from "./monthly-schedule/regions";
import {
  calculateTimeRanges,
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

// Unified picker dialog for adding any job type to a day
function UnifiedJobPickerDialog({
  open,
  onClose,
  unassignedManualJobs,
  unassignedFilterJobs,
  filterJobsFromOtherDays,
  otherDayIds,
  onSelectManualJobs,
  onSelectFilterJobs,
  dayLabel,
  dayAreas,
}: {
  open: boolean;
  onClose: () => void;
  unassignedManualJobs: Job[];
  unassignedFilterJobs: Job[];
  filterJobsFromOtherDays: Job[];
  otherDayIds: Set<string>;
  onSelectManualJobs: (jobIds: string[]) => void;
  onSelectFilterJobs: (jobIds: string[], otherDayIds: Set<string>) => void;
  dayLabel: string;
  dayAreas: string[];
}) {
  const { customersList: customers } = useJobsContext();
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("malfunction");

  // Filter jobs to only those in the selected day areas
  const areaFilteredManualJobs = useMemo(
    () =>
      dayAreas.length > 0
        ? unassignedManualJobs.filter((j) => jobMatchesAreas(j, dayAreas))
        : unassignedManualJobs,
    [dayAreas, unassignedManualJobs],
  );

  const areaFilteredFilterJobs = useMemo(() => {
    const all = [...unassignedFilterJobs, ...filterJobsFromOtherDays];
    return dayAreas.length > 0
      ? all.filter((j) => jobMatchesAreas(j, dayAreas))
      : all;
  }, [dayAreas, unassignedFilterJobs, filterJobsFromOtherDays]);

  const jobsByType = useMemo(
    () => ({
      malfunction: areaFilteredManualJobs.filter(
        (j) => j.type === "malfunction",
      ),
      installation: areaFilteredManualJobs.filter(
        (j) => j.type === "installation",
      ),
      filter_replacement: areaFilteredFilterJobs,
    }),
    [areaFilteredManualJobs, areaFilteredFilterJobs],
  );

  const toggleJob = (jobId: string) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const handleConfirm = () => {
    const manualIds = Array.from(selectedJobIds).filter((id) =>
      unassignedManualJobs.some((j) => j.id === id),
    );
    const filterIds = Array.from(selectedJobIds).filter((id) =>
      [...unassignedFilterJobs, ...filterJobsFromOtherDays].some(
        (j) => j.id === id,
      ),
    );

    if (manualIds.length > 0) onSelectManualJobs(manualIds);
    if (filterIds.length > 0) onSelectFilterJobs(filterIds, otherDayIds);

    setSelectedJobIds(new Set());
  };

  const handleClose = () => {
    setSelectedJobIds(new Set());
    onClose();
  };

  const renderJobList = (items: Job[], isFilter = false) => {
    if (items.length === 0)
      return (
        <p className='text-xs text-muted-foreground py-4 text-center'>
          אין פניות באזור זה
        </p>
      );
    return (
      <div className='space-y-2'>
        {items.map((job) => {
          const customer = customers.find((c) => c.id === job.customerId);
          const isFromOther = otherDayIds.has(job.id);
          return (
            <label
              key={job.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 cursor-pointer transition-colors",
                isFromOther ? "border-accent bg-accent/5" : "border-border",
              )}>
              <Checkbox
                checked={selectedJobIds.has(job.id)}
                onCheckedChange={() => toggleJob(job.id)}
                className='mt-0.5'
              />
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2'>
                  <span className='font-medium text-sm'>{customer?.name}</span>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                      job.priority === "high"
                        ? "bg-destructive/15 text-destructive"
                        : job.priority === "medium"
                          ? "bg-warning/15 text-warning"
                          : "bg-info/15 text-info"
                    }`}>
                    {job.priority === "high"
                      ? "גבוהה"
                      : job.priority === "medium"
                        ? "בינונית"
                        : "נמוכה"}
                  </span>
                </div>
                <p className='text-xs text-muted-foreground mt-0.5'>
                  {job.location}
                  {job.city ? `, ${job.city}` : ""}
                </p>
                <div className='flex items-center gap-3 text-xs text-muted-foreground mt-0.5'>
                  <span className='flex items-center gap-1'>
                    <Clock className='w-3 h-3' />
                    {job.estimatedDuration} דק׳
                  </span>
                  <span>{job.notes}</span>
                </div>
                {isFromOther && (
                  <p className='text-xs text-accent-foreground mt-0.5'>
                    📌 משובץ ביום אחר — יועבר לכאן
                  </p>
                )}
              </div>
            </label>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className='max-w-lg max-h-[80vh] overflow-y-auto'
        dir='rtl'>
        <DialogHeader>
          <DialogTitle>הוספת משימה — {dayLabel}</DialogTitle>
          {dayAreas.length > 0 && (
            <p className='text-xs text-muted-foreground'>
              אזורים: {dayAreas.join(", ")}
            </p>
          )}
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
          <TabsList className='w-full justify-start'>
            <TabsTrigger value='malfunction' className='gap-1'>
              <AlertTriangle className='w-3.5 h-3.5' />
              תקלות ({jobsByType.malfunction.length})
            </TabsTrigger>
            <TabsTrigger value='installation' className='gap-1'>
              <Wrench className='w-3.5 h-3.5' />
              התקנות ({jobsByType.installation.length})
            </TabsTrigger>
            <TabsTrigger value='filter_replacement' className='gap-1'>
              <Filter className='w-3.5 h-3.5' />
              שירות ({jobsByType.filter_replacement.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value='malfunction'>
            {renderJobList(jobsByType.malfunction)}
          </TabsContent>
          <TabsContent value='installation'>
            {renderJobList(jobsByType.installation)}
          </TabsContent>
          <TabsContent value='filter_replacement'>
            {renderJobList(jobsByType.filter_replacement, true)}
          </TabsContent>
        </Tabs>

        {selectedJobIds.size > 0 && (
          <div className='sticky bottom-0 bg-card border-t border-border pt-3 flex items-center justify-between'>
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
    </Dialog>
  );
}

// Calculate time ranges for jobs in a day, starting from 10:00
// Day approval dialog with drag-and-drop reordering
function DayApprovalDialog({
  open,
  onClose,
  dateStr,
  dayJobs,
  filterJobs,
  onApprove,
  approvedDays,
}: {
  open: boolean;
  onClose: () => void;
  dateStr: string;
  dayJobs: Job[];
  filterJobs: Job[];
  onApprove: (jobIds: string[], dateStr: string) => void;
  approvedDays: Set<string>;
}) {
  const initialJobs = useMemo(
    () => [...filterJobs, ...dayJobs],
    [filterJobs, dayJobs],
  );
  const [orderedJobs, setOrderedJobs] = useState<Job[]>(initialJobs);
  const { customersList: customers } = useJobsContext();
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dayDate = new Date(dateStr + "T00:00:00");
  const dayLabel = format(dayDate, "EEEE d/M", { locale: he });
  const dayDateText = format(dayDate, "d/M/yyyy");
  const isApproved = approvedDays.has(dateStr);

  // Sync when source data changes
  useMemo(() => {
    setOrderedJobs([...filterJobs, ...dayJobs]);
  }, [filterJobs.length, dayJobs.length]);

  const timeRanges = useMemo(
    () => calculateTimeRanges(orderedJobs),
    [orderedJobs],
  );
  const totalMinutes = orderedJobs.reduce((s, j) => s + j.estimatedDuration, 0);
  const endMinutes = 10 * 60 + totalMinutes;
  const overTime = endMinutes > 17 * 60;

  const handleDragStart = useCallback((idx: number) => setDragIdx(idx), []);
  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setOverIdx(idx);
  }, []);
  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setOverIdx(null);
  }, []);
  const handleDrop = useCallback(
    (idx: number) => {
      if (dragIdx === null || dragIdx === idx) {
        setDragIdx(null);
        setOverIdx(null);
        return;
      }
      setOrderedJobs((prev) => {
        const next = [...prev];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(idx, 0, moved);
        return next;
      });
      setDragIdx(null);
      setOverIdx(null);
    },
    [dragIdx],
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
                  const typeConfig = JOB_TYPE_CONFIG[job.type];
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
                        <span>{job.location}</span>
                      </div>
                      {customer?.phone && (
                        <div className='text-xs opacity-60 mt-0.5'>
                          📱 {customer.phone}
                        </div>
                      )}
                      {/* WhatsApp — fades in once the day is approved; coordinates the appointment a week ahead */}
                      {isApproved &&
                        customer &&
                        (() => {
                          const waPhone = normalizeIsraeliPhone(customer.phone);
                          if (!waPhone) return null;
                          const msg = `היי ${customer.name} מדברים מטל חרמון רצינו לתאם פגישה לשבוע הבא בתאריך ${dayDateText} בשעה ${startTime} ,אנא אשר הגעת טכנאי.`;
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
                  <div className='text-center p-3 bg-success/10 rounded-lg text-success text-sm font-medium'>
                    ✓ יום זה אושר — הודעות נשלחו ללקוחות
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

function DayDetailDialog({
  open,
  onClose,
  dateStr,
  dayJobs,
  filterJobs,
  onRemoveJob,
  onMoveJob,
  onCloseJob,
  onReturnJob,
  onAddJob,
}: {
  open: boolean;
  onClose: () => void;
  dateStr: string;
  dayJobs: Job[];
  filterJobs: Job[];
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
  const {
    customersList: customers,
    updateJob,
    updateCustomer,
  } = useJobsContext();
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  const dayDate = new Date(dateStr + "T00:00:00");
  const dayLabel = format(dayDate, "EEEE d/M", { locale: he });
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    location: string;
    city: string;
    notes: string;
    estimatedDuration: number;
  }>({ location: "", city: "", notes: "", estimatedDuration: 0 });
  const [pendingEditCoords, setPendingEditCoords] = useState<{
    lat: number;
    lng: number;
    placeId?: string;
  } | null>(null);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const { fetchKey } = useGoogleMapsKey();

  const startEditingJob = useCallback((job: Job) => {
    setEditingJobId(job.id);
    setEditForm({
      location: job.location,
      city: job.city,
      notes: job.notes,
      estimatedDuration: job.estimatedDuration,
    });
    setPendingEditCoords(null);
  }, []);

  const closeEditingJob = useCallback(() => {
    setEditingJobId(null);
    setPendingEditCoords(null);
  }, []);

  const handleSaveEditedJob = useCallback(
    async (job: Job) => {
      if (isEditSaving) return;

      const nextLocation = editForm.location.trim();
      const nextCity = editForm.city.trim();
      const customer = customers.find((c) => c.id === job.customerId);
      const hasLocationChange =
        !!customer &&
        (nextLocation !== (customer.address || "").trim() ||
          nextCity !== (customer.city || "").trim());

      const customerUpdate: Partial<Customer> | null = customer
        ? { address: nextLocation, city: nextCity }
        : null;

      setIsEditSaving(true);

      try {
        if (customerUpdate && hasLocationChange && (nextLocation || nextCity)) {
          const geocoded =
            pendingEditCoords ??
            (await geocodeAddress(
              [nextLocation, nextCity].filter(Boolean).join(", "),
              await fetchKey(),
            ));

          if (geocoded) {
            customerUpdate.lat = geocoded.lat;
            customerUpdate.lng = geocoded.lng;
            customerUpdate.placeId = geocoded.placeId;
          } else {
            customerUpdate.lat = undefined;
            customerUpdate.lng = undefined;
            customerUpdate.placeId = undefined;
          }
        }

        const nextJobData: Partial<
          Pick<Job, "location" | "city" | "notes" | "estimatedDuration">
        > & { lat?: number; lng?: number } = {
          ...editForm,
          location: nextLocation,
          city: nextCity,
        };

        // Propagate geocoded coords into the job so the map moves immediately
        if (
          customerUpdate &&
          (customerUpdate.lat != null || customerUpdate.lng != null)
        ) {
          nextJobData.lat = customerUpdate.lat;
          nextJobData.lng = customerUpdate.lng;
        }

        updateJob(job.id, nextJobData);
        setOrderedJobs((prev) =>
          prev.map((j) => (j.id === job.id ? { ...j, ...nextJobData } : j)),
        );

        if (customer && customerUpdate) {
          updateCustomer(customer.id, customerUpdate);
        }

        closeEditingJob();
        toast.success("המשימה עודכנה בהצלחה");
      } finally {
        setIsEditSaving(false);
      }
    },
    [
      closeEditingJob,
      customers,
      editForm,
      fetchKey,
      isEditSaving,
      pendingEditCoords,
      updateCustomer,
      updateJob,
    ],
  );

  // Sync when source data changes
  useMemo(() => {
    setOrderedJobs([...filterJobs, ...dayJobs]);
  }, [filterJobs.length, dayJobs.length]);

  const handleDragStart = useCallback((idx: number) => {
    setDragIdx(idx);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setOverIdx(idx);
  }, []);

  const handleDrop = useCallback(
    (idx: number) => {
      if (dragIdx === null || dragIdx === idx) {
        setDragIdx(null);
        setOverIdx(null);
        return;
      }
      setOrderedJobs((prev) => {
        const next = [...prev];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(idx, 0, moved);
        return next;
      });
      setDragIdx(null);
      setOverIdx(null);
    },
    [dragIdx],
  );

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setOverIdx(null);
  }, []);

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
            <div className='flex items-center gap-2'>
              <span className='text-xs font-normal text-muted-foreground flex items-center gap-1'>
                <GripVertical className='w-3 h-3' /> גרור לשינוי סדר
              </span>
            </div>
          </DialogTitle>
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
              const isCompleted = job.status === "completed";
              const borderClass = job.completionStatus
                ? completionColorMap[job.completionStatus]
                : typeColors[job.type];
              const isExpanded = expandedJobId === job.id;
              const isDragging = dragIdx === idx;
              const isOver = overIdx === idx && dragIdx !== idx;
              const time = timeRanges[idx];

              return (
                <div key={job.id}>
                  <div
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      `p-3 rounded-lg border-2 ${borderClass} flex items-center gap-2 cursor-grab active:cursor-grabbing transition-all`,
                      isDragging && "opacity-40 scale-95",
                      isOver && "ring-2 ring-primary ring-offset-2",
                    )}
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
                    <div className='text-muted-foreground/40 hover:text-muted-foreground shrink-0 cursor-grab'>
                      <GripVertical className='w-4 h-4' />
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
                          <span className='text-[10px] font-mono text-muted-foreground shrink-0'>
                            {time.startTime}–{time.endTime}
                          </span>
                        )}
                      </div>
                      <p className='text-xs opacity-70'>
                        {typeConfig.label} · {job.estimatedDuration} דק׳
                      </p>
                      <p className='text-xs opacity-60'>{job.location}</p>
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
                              className='flex-1 text-xs border-warning text-warning hover:bg-warning/10'
                              onClick={() => {
                                onReturnJob(job.id);
                                toast.success(
                                  job.type === "filter_replacement"
                                    ? "המשימה שובצה מחדש"
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
// Filter job picker with checkboxes
function FilterJobPicker({
  jobs,
  onSelect,
  movedFromOtherDay,
}: {
  jobs: Job[];
  onSelect: (jobIds: string[]) => void;
  movedFromOtherDay?: Set<string>;
}) {
  const { customersList: customers } = useJobsContext();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className='space-y-2'>
      {jobs.map((job) => {
        const customer = customers.find((c) => c.id === job.customerId);
        const isFromOther = movedFromOtherDay?.has(job.id);
        return (
          <label
            key={job.id}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 cursor-pointer transition-colors",
              isFromOther ? "border-accent bg-accent/5" : "border-border",
            )}>
            <Checkbox
              checked={selectedIds.has(job.id)}
              onCheckedChange={() => toggle(job.id)}
              className='mt-0.5'
            />
            <div className='flex-1 min-w-0'>
              <p className='text-sm font-medium'>{customer?.name}</p>
              <p className='text-xs text-muted-foreground'>
                {job.location} · {customer?.city}
              </p>
              {isFromOther && (
                <p className='text-xs text-accent-foreground mt-0.5'>
                  📌 משובץ ביום אחר — יועבר לכאן
                </p>
              )}
            </div>
          </label>
        );
      })}
      {selectedIds.size > 0 && (
        <div className='sticky bottom-0 bg-card border-t border-border pt-3 flex items-center justify-between'>
          <span className='text-sm font-medium'>{selectedIds.size} נבחרו</span>
          <Button onClick={() => onSelect(Array.from(selectedIds))}>
            <Plus className='w-4 h-4 ml-1' />
            הוסף
          </Button>
        </div>
      )}
    </div>
  );
}

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
  const { customersList } = useJobsContext();
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
  const [approvedDays, setApprovedDays] = useState<Set<string>>(new Set());

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
    setApprovedDays((prev) => new Set(prev).add(dateStr));
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

  // When areas are overridden, rebuild that day's filter list from the new areas
  const handleAreaOverride = (dateStr: string, newAreas: string[]) => {
    setDayAreaOverrides((prev) => new Map(prev).set(dateStr, newAreas));

    // Clear extra filter assignments for this day
    setExtraFilterAssignments((prev) => {
      const next = new Map(prev);
      next.delete(dateStr);
      return next;
    });

    // Unassign manual jobs (malfunction/installation) from this day so the route resets
    const manualDayJobs = getManualDayJobs(dateStr);
    manualDayJobs.forEach((j) => onUnassignJob(j.id));

    // Unassign any previously approved filter jobs for this day from global state
    const approvedFilterJobsForDay = jobs.filter(
      (j) =>
        j.type === "filter_replacement" &&
        j.scheduledDate === dateStr &&
        (j.status === "confirmed" || j.status === "in_progress"),
    );
    approvedFilterJobsForDay.forEach((j) => onUnassignJob(j.id));

    // Revoke day approval so the new set must be re-approved
    setApprovedDays((prev) => {
      const next = new Set(prev);
      next.delete(dateStr);
      return next;
    });

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
      filterJobs,
      filterDistribution,
      findNearestAreaDay,
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
      // Delete the persisted row + remove from global state
      onUnassignFilterService?.(jobId);
      toast.info("השירות הוסר מהלו״ז");
    },
    [filterDistribution, onUnassignFilterService],
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
              <p className='text-2xl font-bold text-card-foreground'>
                {s.count}
              </p>
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
      {(() => {
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
                const dayFilterJobs = getFilterDayJobs(dateStr);
                const dayManualJobs = getManualDayJobs(dateStr);
                const totalMinutes =
                  dayFilterJobs.reduce((s, j) => s + j.estimatedDuration, 0) +
                  dayManualJobs.reduce((s, j) => s + j.estimatedDuration, 0);
                const maxShow = isWeekView ? 20 : 2;
                const dayAreas =
                  !isWeekend && inCurrentMonth ? getDayAreas(dateStr) : [];
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
                        {isDayApproved && (
                          <CheckCircle className='w-2.5 h-2.5 text-success' />
                        )}
                      </div>
                      <div className='flex items-center gap-1'>
                        {totalMinutes > 0 && !isWeekend && (
                          <span className='text-[10px] text-muted-foreground'>
                            {Math.floor(totalMinutes / 60)}:
                            {String(totalMinutes % 60).padStart(2, "0")}
                          </span>
                        )}
                        {!isWeekend &&
                          inCurrentMonth &&
                          hasJobs &&
                          !isDayApproved && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setApprovalState({ open: true, dateStr });
                              }}
                              className='p-0.5 rounded hover:bg-success/20 transition-colors'
                              title='אשר יום'>
                              <CheckCircle className='w-3 h-3 text-muted-foreground hover:text-success' />
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
                              {REGIONS.map((r) => (
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
      })()}

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
              filterJobsFromOtherDays={fromOtherDays}
              otherDayIds={allOtherDayIdSet}
              onSelectManualJobs={handlePickerSelect}
              onSelectFilterJobs={(jobIds, odi) =>
                handleFilterPickerMoveSelect(jobIds, odi, pickerState.dateStr)
              }
              dayLabel={pickerState.dayLabel}
              dayAreas={dayAreas}
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
          approvedDays={approvedDays}
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
    </div>
  );
}
