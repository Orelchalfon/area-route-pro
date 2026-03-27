import { useState, useMemo, useCallback } from 'react';
import { Job, JOB_TYPE_CONFIG, Customer, CompletionStatus } from '@/types';
import { technicians } from '@/data/mockData';
import { useJobsContext } from '@/contexts/JobsContext';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, MapPin, User, AlertTriangle, Filter, Wrench, Users, Plus, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Calendar, XCircle, RotateCcw, Archive, Undo2, GripVertical, Navigation, ListPlus } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, getDay, addMonths, subMonths, addWeeks, subWeeks, isSameMonth } from 'date-fns';
import { he } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { DayRouteMap } from './DayRouteMap';
import { CustomerInfoPopover } from './CustomerInfoPopover';

const REGIONS = [
  'דרום רחוק', 'מרכז דרום', 'תל אביב', 'ירושלים',
  'גוש דן', 'השרון', 'נתניה', 'צפון קרוב', 'צפון רחוק',
];

// Map specific cities to their parent region
const CITY_TO_REGION: Record<string, string> = {
  // השרון
  'רעננה': 'השרון', 'הרצליה': 'השרון', 'הרצליה פיתוח': 'השרון',
  'הוד השרון': 'השרון', 'רמת השרון': 'השרון', 'כפר סבא': 'השרון',
  'צפון תל אביב': 'השרון', 'רמת החייל': 'השרון', 'ארסוף': 'השרון',
  // תל אביב
  'תל אביב יפו': 'תל אביב', 'יפו': 'תל אביב', 'רמת גן': 'תל אביב',
  'גבעתיים': 'תל אביב', 'בני ברק': 'תל אביב', 'חולון': 'תל אביב', 'אזור': 'תל אביב',
  // גוש דן
  'פתח תקוה': 'גוש דן', 'פתח תקווה': 'גוש דן', 'ראש העין': 'גוש דן',
  'קריית אונו': 'גוש דן', 'יהוד': 'גוש דן', 'גבעת שמואל': 'גוש דן',
  'אור יהודה': 'גוש דן',
  // מרכז דרום
  'בת ים': 'מרכז דרום', 'ראשון לציון': 'מרכז דרום', 'ראשלצ': 'מרכז דרום',
  'רחובות': 'מרכז דרום', 'נס ציונה': 'מרכז דרום', 'יבנה': 'מרכז דרום',
  'גדרה': 'מרכז דרום', 'לוד': 'מרכז דרום', 'רמלה': 'מרכז דרום',
  'באר יעקב': 'מרכז דרום', 'גן יבנה': 'מרכז דרום',
  // ירושלים
  'מודיעין': 'ירושלים', 'מודיעין מכבים רעות': 'ירושלים', 'שוהם': 'ירושלים',
  'גוש עציון': 'ירושלים', 'מעלה אדומים': 'ירושלים', 'בית שמש': 'ירושלים',
  'ביתר עילית': 'ירושלים', 'מבשרת ציון': 'ירושלים',
  // דרום רחוק
  'באר שבע': 'דרום רחוק', 'אילת': 'דרום רחוק', 'דימונה': 'דרום רחוק',
  'אשדוד': 'דרום רחוק', 'אשקלון': 'דרום רחוק', 'קריית גת': 'דרום רחוק',
  'קרית גת': 'דרום רחוק', 'קריית מלאכי': 'דרום רחוק', 'קרית מלאכי': 'דרום רחוק',
  'נתיבות': 'דרום רחוק',
  // נתניה
  'עמק חפר': 'נתניה', 'קדימה צורן': 'נתניה', 'אבן יהודה': 'נתניה',
  'נתניה': 'נתניה', 'כפר הס': 'נתניה', 'עולש': 'נתניה', 'עין ורד': 'נתניה',
  // צפון קרוב
  'חדרה': 'צפון קרוב', 'בנימינה': 'צפון קרוב', 'פרדס חנה': 'צפון קרוב',
  'קיסריה': 'צפון קרוב', 'חריש': 'צפון קרוב', 'אור עקיבא': 'צפון קרוב',
  'כרכור': 'צפון קרוב', 'עתלית': 'צפון קרוב', 'אליכין': 'צפון קרוב',
  // צפון רחוק
  'חיפה': 'צפון רחוק', 'נהריה': 'צפון רחוק', 'צפת': 'צפון רחוק',
  'כרמיאל': 'צפון רחוק', 'זיכרון יעקב': 'צפון רחוק', 'בית רימון': 'צפון רחוק',
  'קריית שמונה': 'צפון רחוק', 'עכו': 'צפון רחוק', 'טבריה': 'צפון רחוק',
  'נצרת': 'צפון רחוק', 'עפולה': 'צפון רחוק', 'נווה ים': 'צפון רחוק',
};

/** Check if a job's city belongs to any of the selected regions */
function jobMatchesAreas(job: Job, areas: string[]): boolean {
  if (areas.length === 0) return true;
  const city = (job.city || '').trim();
  // Direct match (city IS a region name)
  if (areas.includes(city)) return true;
  // Map city to region
  const region = CITY_TO_REGION[city];
  if (region && areas.includes(region)) return true;
  // Partial match: check if city contains or is contained by a region name
  for (const area of areas) {
    if (city.includes(area) || area.includes(city)) return true;
  }
  return false;
}

interface MonthlyScheduleBoardProps {
  jobs: Job[];
  onApprove: (jobIds: string[]) => void;
  onApproveDaySchedule: (assignments: { jobId: string; technicianId: string; scheduledDate: string; scheduledTime: string }[]) => void;
  onStatusChange: (jobId: string, status: string) => void;
  onAssignJob: (jobId: string, technicianId: string, scheduledDate: string, scheduledTime: string) => void;
  onUnassignJob: (jobId: string) => void;
  onCloseJob?: (jobId: string) => void;
  onReturnJob?: (jobId: string) => void;
  onAddJob?: (job: { type: JobType; customerId: string; technicianId: string; scheduledDate: string; scheduledTime: string; notes: string }) => void;
}

const DAY_HEADERS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const MONTH_NAMES = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

const typeIcons: Record<string, React.ReactNode> = {
  filter_replacement: <Filter className="w-3 h-3" />,
  malfunction: <AlertTriangle className="w-3 h-3" />,
  installation: <Wrench className="w-3 h-3" />,
};

const typeColors: Record<string, string> = {
  filter_replacement: 'bg-info/15 text-info border-info/30',
  malfunction: 'bg-destructive/15 text-destructive border-destructive/30',
  installation: 'bg-secondary/15 text-secondary border-secondary/30',
};

// Generate filter replacement jobs for a given month based on customer data
function generateFilterJobs(month: number, year: number, allCustomers: Customer[]): Job[] {
  const monthCustomers = allCustomers.filter(c => c.filterReplacementMonth === month);
  return monthCustomers.map((customer, i) => ({
    id: `filter-${year}-${month}-${customer.id}`,
    type: 'filter_replacement' as const,
    status: 'draft' as const,
    priority: 'low' as const,
    customerId: customer.id,
    estimatedDuration: 20,
    location: customer.address,
    city: customer.city,
    notes: 'החלפת פילטר שנתית',
    createdAt: `${year}-${String(month).padStart(2, '0')}-01`,
  }));
}

// Distribute filter jobs across working days — pack up to 15 per day, mixing areas when needed
function distributeFilterJobs(filterJobs: Job[], workingDays: Date[]): Map<string, Job[]> {
  const distribution = new Map<string, Job[]>();
  workingDays.forEach(d => distribution.set(format(d, 'yyyy-MM-dd'), []));

  // Group jobs by city/area
  const jobsByCity: Record<string, Job[]> = {};
  filterJobs.forEach(job => {
    if (!jobsByCity[job.city]) jobsByCity[job.city] = [];
    jobsByCity[job.city].push(job);
  });

  const dayKeys = workingDays.map(d => format(d, 'yyyy-MM-dd'));
  const perDay = 3;
  let dayIdx = 0;

  // Pack areas into days: fill each day up to perDay before moving to the next
  for (const cityJobs of Object.values(jobsByCity)) {
    let remaining = [...cityJobs];
    while (remaining.length > 0 && dayIdx < dayKeys.length) {
      const dateStr = dayKeys[dayIdx];
      const existing = distribution.get(dateStr) || [];
      const available = perDay - existing.length;
      if (available <= 0) {
        dayIdx++;
        continue;
      }
      const chunk = remaining.splice(0, available);
      distribution.set(dateStr, [...existing, ...chunk]);
      // Only advance day if this day is now full
      if (existing.length + chunk.length >= perDay) {
        dayIdx++;
      }
    }
  }

  return distribution;
}

function MiniJobChip({ job, onRemove, isAutoScheduled }: { job: Job; onRemove?: () => void; isAutoScheduled?: boolean }) {
  const { customersList } = useJobsContext();
  const customer = customersList.find(c => c.id === job.customerId);

  // Only color chips that have a completion status from technician
  const completionColorMap: Record<string, string> = {
    done: 'bg-success/20 text-success border-success/40',
    not_done: 'bg-destructive/20 text-destructive border-destructive/40',
    need_return: 'bg-warning/20 text-warning border-warning/40',
  };
  // Neutral default for jobs not yet reported by technician
  const chipColor = job.completionStatus ? completionColorMap[job.completionStatus] : 'bg-muted/30 text-muted-foreground border-border';

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs border ${chipColor} group relative`}>
      {typeIcons[job.type]}
      {customer ? (
        <CustomerInfoPopover customer={customer}>
          <span className="truncate max-w-[90px]">{customer.name}</span>
        </CustomerInfoPopover>
      ) : (
        <span className="truncate max-w-[90px]">—</span>
      )}
      {isAutoScheduled && !job.completionStatus && <span className="text-[9px] opacity-60">●</span>}
      {job.completionStatus === 'done' && <span className="text-[9px]">✓</span>}
      {job.completionStatus === 'not_done' && <span className="text-[9px]">✗</span>}
      {job.completionStatus === 'need_return' && <span className="text-[9px]">↻</span>}
      {onRemove && !job.completionStatus && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="opacity-0 group-hover:opacity-100 transition-opacity">
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// Unified picker dialog for adding any job type to a day
function UnifiedJobPickerDialog({ open, onClose, unassignedManualJobs, unassignedFilterJobs, filterJobsFromOtherDays, otherDayIds, onSelectManualJobs, onSelectFilterJobs, dayLabel, dayAreas }: {
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
  const [activeTab, setActiveTab] = useState('malfunction');

  // Filter jobs to only those in the selected day areas
  const areaFilteredManualJobs = useMemo(() => 
    dayAreas.length > 0 ? unassignedManualJobs.filter(j => jobMatchesAreas(j, dayAreas)) : unassignedManualJobs
  , [dayAreas, unassignedManualJobs]);

  const areaFilteredFilterJobs = useMemo(() => {
    const all = [...unassignedFilterJobs, ...filterJobsFromOtherDays];
    return dayAreas.length > 0 ? all.filter(j => jobMatchesAreas(j, dayAreas)) : all;
  }, [dayAreas, unassignedFilterJobs, filterJobsFromOtherDays]);

  const jobsByType = useMemo(() => ({
    malfunction: areaFilteredManualJobs.filter(j => j.type === 'malfunction'),
    installation: areaFilteredManualJobs.filter(j => j.type === 'installation'),
    filter_replacement: areaFilteredFilterJobs,
  }), [areaFilteredManualJobs, areaFilteredFilterJobs]);

  const toggleJob = (jobId: string) => {
    setSelectedJobIds(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId); else next.add(jobId);
      return next;
    });
  };

  const handleConfirm = () => {
    const manualIds = Array.from(selectedJobIds).filter(id => unassignedManualJobs.some(j => j.id === id));
    const filterIds = Array.from(selectedJobIds).filter(id => [...unassignedFilterJobs, ...filterJobsFromOtherDays].some(j => j.id === id));
    
    if (manualIds.length > 0) onSelectManualJobs(manualIds);
    if (filterIds.length > 0) onSelectFilterJobs(filterIds, otherDayIds);
    
    setSelectedJobIds(new Set());
  };

  const handleClose = () => {
    setSelectedJobIds(new Set());
    onClose();
  };

  const renderJobList = (items: Job[], isFilter = false) => {
    if (items.length === 0) return <p className="text-xs text-muted-foreground py-4 text-center">אין פניות באזור זה</p>;
    return (
      <div className="space-y-2">
        {items.map(job => {
          const customer = customers.find(c => c.id === job.customerId);
          const isFromOther = otherDayIds.has(job.id);
          return (
            <label key={job.id} className={cn("flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 cursor-pointer transition-colors", isFromOther ? "border-accent bg-accent/5" : "border-border")}>
              <Checkbox checked={selectedJobIds.has(job.id)} onCheckedChange={() => toggleJob(job.id)} className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{customer?.name}</span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                    job.priority === 'high' ? 'bg-destructive/15 text-destructive' : job.priority === 'medium' ? 'bg-warning/15 text-warning' : 'bg-info/15 text-info'
                  }`}>
                    {job.priority === 'high' ? 'גבוהה' : job.priority === 'medium' ? 'בינונית' : 'נמוכה'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{job.location}{job.city ? `, ${job.city}` : ''}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{job.estimatedDuration} דק׳</span>
                  <span>{job.notes}</span>
                </div>
                {isFromOther && <p className="text-xs text-accent-foreground mt-0.5">📌 משובץ ביום אחר — יועבר לכאן</p>}
              </div>
            </label>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>הוספת משימה — {dayLabel}</DialogTitle>
          {dayAreas.length > 0 && (
            <p className="text-xs text-muted-foreground">אזורים: {dayAreas.join(', ')}</p>
          )}
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="malfunction" className="gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />תקלות ({jobsByType.malfunction.length})
            </TabsTrigger>
            <TabsTrigger value="installation" className="gap-1">
              <Wrench className="w-3.5 h-3.5" />התקנות ({jobsByType.installation.length})
            </TabsTrigger>
            <TabsTrigger value="filter_replacement" className="gap-1">
              <Filter className="w-3.5 h-3.5" />שירות ({jobsByType.filter_replacement.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="malfunction">{renderJobList(jobsByType.malfunction)}</TabsContent>
          <TabsContent value="installation">{renderJobList(jobsByType.installation)}</TabsContent>
          <TabsContent value="filter_replacement">{renderJobList(jobsByType.filter_replacement, true)}</TabsContent>
        </Tabs>

        {selectedJobIds.size > 0 && (
          <div className="sticky bottom-0 bg-card border-t border-border pt-3 flex items-center justify-between">
            <span className="text-sm font-medium">{selectedJobIds.size} נבחרו</span>
            <Button onClick={handleConfirm}><Plus className="w-4 h-4 ml-1" />הוסף</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Calculate time ranges for jobs in a day, starting from 10:00
function calculateTimeRanges(allJobs: Job[]): { job: Job; startTime: string; endTime: string }[] {
  let currentMinutes = 10 * 60; // Start at 10:00
  return allJobs.map(job => {
    const startHour = Math.floor(currentMinutes / 60);
    const startMin = currentMinutes % 60;
    const endMinutes = currentMinutes + job.estimatedDuration;
    const endHour = Math.floor(endMinutes / 60);
    const endMin = endMinutes % 60;
    const startTime = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
    const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
    currentMinutes = endMinutes;
    return { job, startTime, endTime };
  });
}

// Day approval dialog with drag-and-drop reordering
function DayApprovalDialog({ open, onClose, dateStr, dayJobs, filterJobs, onApprove, approvedDays }: {
  open: boolean; onClose: () => void; dateStr: string; dayJobs: Job[]; filterJobs: Job[];
  onApprove: (jobIds: string[], dateStr: string) => void; approvedDays: Set<string>;
}) {
  const initialJobs = useMemo(() => [...filterJobs, ...dayJobs], [filterJobs, dayJobs]);
  const [orderedJobs, setOrderedJobs] = useState<Job[]>(initialJobs);
  const { customersList: customers } = useJobsContext();
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dayDate = new Date(dateStr + 'T00:00:00');
  const dayLabel = format(dayDate, 'EEEE d/M', { locale: he });
  const isApproved = approvedDays.has(dateStr);

  // Sync when source data changes
  useMemo(() => {
    setOrderedJobs([...filterJobs, ...dayJobs]);
  }, [filterJobs.length, dayJobs.length]);

  const timeRanges = useMemo(() => calculateTimeRanges(orderedJobs), [orderedJobs]);
  const totalMinutes = orderedJobs.reduce((s, j) => s + j.estimatedDuration, 0);
  const endMinutes = 10 * 60 + totalMinutes;
  const overTime = endMinutes > 17 * 60;

  const handleDragStart = useCallback((idx: number) => setDragIdx(idx), []);
  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => { e.preventDefault(); setOverIdx(idx); }, []);
  const handleDragEnd = useCallback(() => { setDragIdx(null); setOverIdx(null); }, []);
  const handleDrop = useCallback((idx: number) => {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setOverIdx(null); return; }
    setOrderedJobs(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIdx(null);
    setOverIdx(null);
  }, [dragIdx]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isApproved && <CheckCircle className="w-5 h-5 text-success" />}
              אישור לו״ז — {dayLabel}
            </div>
            <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
              <GripVertical className="w-3 h-3" /> גרור לשינוי סדר
            </span>
          </DialogTitle>
        </DialogHeader>

        {orderedJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">אין משימות ליום זה</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-4" style={{ direction: 'ltr' }}>
            {/* Map - LEFT side */}
            <div className="rounded-xl overflow-hidden border border-border order-first" style={{ height: '70vh' }}>
              <DayRouteMap jobs={orderedJobs} height="70vh" />
            </div>

            {/* Job list - RIGHT side */}
            <div className="order-last flex flex-col gap-3" dir="rtl" style={{ height: '70vh' }}>
              {/* Summary */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm shrink-0">
                <span>{orderedJobs.length} משימות</span>
                <span>10:00 – {String(Math.floor(endMinutes / 60)).padStart(2, '0')}:{String(endMinutes % 60).padStart(2, '0')}</span>
                {overTime && <span className="text-destructive font-medium">⚠ חריגה מ-17:00</span>}
              </div>

              {/* Scrollable timeline */}
              <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                {timeRanges.map(({ job, startTime, endTime }, i) => {
                  const customer = customers.find(c => c.id === job.customerId);
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
                        isDragging && 'opacity-40 scale-95',
                        isOver && 'ring-2 ring-primary ring-offset-2'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-primary shrink-0">
                            {i + 1}
                          </div>
                          <GripVertical className="w-4 h-4 text-muted-foreground/40" />
                          {typeIcons[job.type]}
                          {customer ? (
                            <CustomerInfoPopover customer={customer}>
                              <span className="font-medium text-sm">{customer.name}</span>
                            </CustomerInfoPopover>
                          ) : (
                            <span className="font-medium text-sm">—</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-mono">
                          <Clock className="w-3 h-3" />
                          <span>{startTime} – {endTime}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs opacity-70">
                        <span>{typeConfig.label} · {job.estimatedDuration} דק׳</span>
                        <span>{job.location}</span>
                      </div>
                      {customer?.phone && (
                        <div className="text-xs opacity-60 mt-0.5">📱 {customer.phone}</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Approve button */}
              <div className="shrink-0">
                {!isApproved ? (
                  <Button
                    className="w-full gap-2 bg-success hover:bg-success/90 text-success-foreground"
                    onClick={() => {
                      onApprove(orderedJobs.map(j => j.id), dateStr);
                      toast.success(`יום ${dayLabel} אושר — ${orderedJobs.length} משימות שובצו לטכנאי`);
                    }}
                  >
                    <CheckCircle className="w-4 h-4" />
                    אשר יום ושלח הודעות ללקוחות
                  </Button>
                ) : (
                  <div className="text-center p-3 bg-success/10 rounded-lg text-success text-sm font-medium">
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

// Day detail dialog with drag-and-drop reordering, map, and navigation
function DayDetailDialog({ open, onClose, dateStr, dayJobs, filterJobs, onRemoveJob, onCloseJob, onReturnJob, onAddJob }: {
  open: boolean; onClose: () => void; dateStr: string; dayJobs: Job[]; filterJobs: Job[]; onRemoveJob: (jobId: string) => void;
  onCloseJob?: (jobId: string) => void; onReturnJob?: (jobId: string) => void; onAddJob?: (job: Omit<Job, 'id'>) => void;
}) {
  const initialJobs = useMemo(() => [...filterJobs, ...dayJobs], [filterJobs, dayJobs]);
  const [orderedJobs, setOrderedJobs] = useState<Job[]>(initialJobs);
  const { customersList: customers } = useJobsContext();
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  const dayDate = new Date(dateStr + 'T00:00:00');
  const dayLabel = format(dayDate, 'EEEE d/M', { locale: he });
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

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

  const handleDrop = useCallback((idx: number) => {
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    setOrderedJobs(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIdx(null);
    setOverIdx(null);
  }, [dragIdx]);

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setOverIdx(null);
  }, []);

  const completionColorMap: Record<string, string> = {
    done: 'border-success bg-success/10',
    not_done: 'border-destructive bg-destructive/10',
    need_return: 'border-warning bg-warning/10',
  };

  // Calculate time ranges based on current order
  const timeRanges = useMemo(() => {
    let currentMinutes = 10 * 60;
    return orderedJobs.map(job => {
      const startHour = Math.floor(currentMinutes / 60);
      const startMin = currentMinutes % 60;
      const endMinutes = currentMinutes + job.estimatedDuration;
      const endHour = Math.floor(endMinutes / 60);
      const endMin = endMinutes % 60;
      const startTime = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
      const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
      currentMinutes = endMinutes;
      return { startTime, endTime };
    });
  }, [orderedJobs]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{dayLabel}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                <GripVertical className="w-3 h-3" /> גרור לשינוי סדר
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-4" style={{ direction: 'ltr' }}>
          {/* Map - LEFT side */}
          <div className="rounded-xl overflow-hidden border border-border order-first" style={{ height: '70vh' }}>
            {orderedJobs.length > 0 ? (
              <DayRouteMap jobs={orderedJobs} height="70vh" />
            ) : (
              <div className="flex items-center justify-center h-full bg-muted/20">
                <p className="text-sm text-muted-foreground">אין משימות להצגה</p>
              </div>
            )}
          </div>

          {/* Job list - RIGHT side */}
          <div className="order-last overflow-y-auto space-y-2" dir="rtl" style={{ height: '70vh' }}>
            {orderedJobs.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">אין משימות ליום זה</p>}
            {orderedJobs.map((job, idx) => {
              const customer = customers.find(c => c.id === job.customerId);
              const typeConfig = JOB_TYPE_CONFIG[job.type];
              const isCompleted = job.status === 'completed';
              const borderClass = job.completionStatus ? completionColorMap[job.completionStatus] : typeColors[job.type];
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
                      isDragging && 'opacity-40 scale-95',
                      isOver && 'ring-2 ring-primary ring-offset-2'
                    )}
                    onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                  >
                    {/* Number badge */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                      isCompleted && job.completionStatus === 'done' ? 'bg-success' : 'bg-primary'
                    }`}>
                      {isCompleted && job.completionStatus === 'done' ? '✓' : idx + 1}
                    </div>
                    <div className="text-muted-foreground/40 hover:text-muted-foreground shrink-0 cursor-grab">
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {typeIcons[job.type]}
                          <span className="text-sm font-medium">{customer?.name}</span>
                        </div>
                        {time && (
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                            {time.startTime}–{time.endTime}
                          </span>
                        )}
                      </div>
                      <p className="text-xs opacity-70">{typeConfig.label} · {job.estimatedDuration} דק׳</p>
                      <p className="text-xs opacity-60">{job.location}</p>
                      {isCompleted && (
                        <p className="text-xs font-medium mt-0.5">
                          {job.completionStatus === 'done' ? '✓ בוצע' :
                           job.completionStatus === 'not_done' ? '✗ לא בוצע' :
                           job.completionStatus === 'need_return' ? '↻ צריך לחזור' : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {customer && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(customer.address + ', ' + customer.city)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-primary/10 transition-colors"
                          title="נווט"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Navigation className="w-3.5 h-3.5 text-primary" />
                        </a>
                      )}
                      {!isCompleted && (
                        <button onClick={(e) => { e.stopPropagation(); onRemoveJob(job.id); }} className="p-1 rounded hover:bg-destructive/10" title="הסר מהלו״ז">
                          <X className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && isCompleted && (
                    <div className="mt-1 p-3 rounded-lg bg-muted/50 border border-border space-y-2">
                      {job.completionNotes && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-0.5">הערות טכנאי:</p>
                          <p className="text-sm">{job.completionNotes}</p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {onCloseJob && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs"
                            onClick={() => {
                              onCloseJob(job.id);
                              toast.success('הקריאה נסגרה והועברה להיסטוריה');
                            }}
                          >
                            <Archive className="w-3 h-3 ml-1" />
                            סגור קריאה
                          </Button>
                        )}
                        {job.type === 'installation' && job.completionStatus === 'done' && onAddJob && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs border-secondary text-secondary hover:bg-secondary/10"
                            onClick={() => {
                              const customer = customers.find(c => c.id === job.customerId);
                              onAddJob({
                                type: 'malfunction',
                                status: 'draft',
                                priority: 'medium',
                                customerId: job.customerId,
                                estimatedDuration: 60,
                                location: customer?.address || job.location,
                                city: customer?.city || job.city,
                                notes: `משימת המשך להתקנה — ${customer?.name || ''}`,
                                createdAt: new Date().toISOString().split('T')[0],
                              });
                              toast.success('משימת המשך נוצרה בהצלחה');
                            }}
                          >
                            <ListPlus className="w-3 h-3 ml-1" />
                            משימות להמשך
                          </Button>
                        )}
                        {onReturnJob && (job.completionStatus === 'not_done' || job.completionStatus === 'need_return') && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs border-warning text-warning hover:bg-warning/10"
                            onClick={() => {
                              onReturnJob(job.id);
                              toast.success(job.type === 'filter_replacement' ? 'המשימה שובצה מחדש' : 'הקריאה הוחזרה לטבלה');
                            }}
                          >
                            <Undo2 className="w-3 h-3 ml-1" />
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
function FilterJobPicker({ jobs, onSelect, movedFromOtherDay }: { jobs: Job[]; onSelect: (jobIds: string[]) => void; movedFromOtherDay?: Set<string> }) {
  const { customersList: customers } = useJobsContext();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {jobs.map(job => {
        const customer = customers.find(c => c.id === job.customerId);
        const isFromOther = movedFromOtherDay?.has(job.id);
        return (
          <label key={job.id} className={cn("flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 cursor-pointer transition-colors", isFromOther ? "border-accent bg-accent/5" : "border-border")}>
            <Checkbox checked={selectedIds.has(job.id)} onCheckedChange={() => toggle(job.id)} className="mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{customer?.name}</p>
              <p className="text-xs text-muted-foreground">{job.location} · {customer?.city}</p>
              {isFromOther && <p className="text-xs text-accent-foreground mt-0.5">📌 משובץ ביום אחר — יועבר לכאן</p>}
            </div>
          </label>
        );
      })}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-0 bg-card border-t border-border pt-3 flex items-center justify-between">
          <span className="text-sm font-medium">{selectedIds.size} נבחרו</span>
          <Button onClick={() => onSelect(Array.from(selectedIds))}><Plus className="w-4 h-4 ml-1" />הוסף</Button>
        </div>
      )}
    </div>
  );
}


export function MonthlyScheduleBoard({ jobs, onApprove, onApproveDaySchedule, onStatusChange, onAssignJob, onUnassignJob, onCloseJob, onReturnJob, onAddJob }: MonthlyScheduleBoardProps) {
  const { customersList } = useJobsContext();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTechId, setSelectedTechId] = useState<string>(technicians[0].id);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('week');
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [pickerState, setPickerState] = useState<{ open: boolean; dateStr: string; dayLabel: string } | null>(null);
  const [detailState, setDetailState] = useState<{ open: boolean; dateStr: string } | null>(null);
  const [approvalState, setApprovalState] = useState<{ open: boolean; dateStr: string } | null>(null);
  const [approvedDays, setApprovedDays] = useState<Set<string>>(new Set());

  const handleApproveDay = (jobIds: string[], dateStr: string) => {
    // Calculate time ranges for assignments
    const allJobs = jobIds.map(id => {
      // Find job from filter distribution, extra assignments, or main jobs
      const filterDayJobs = getFilterDayJobs(dateStr);
      const manualDayJobs = getManualDayJobs(dateStr);
      return [...filterDayJobs, ...manualDayJobs].find(j => j.id === id);
    }).filter(Boolean) as Job[];

    let currentMinutes = 10 * 60; // Start at 10:00
    const assignments = allJobs.map(job => {
      const startHour = Math.floor(currentMinutes / 60);
      const startMin = currentMinutes % 60;
      const scheduledTime = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
      currentMinutes += job.estimatedDuration;
      return {
        jobId: job.id,
        technicianId: selectedTechId,
        scheduledDate: dateStr,
        scheduledTime,
      };
    });

    onApproveDaySchedule(assignments);
    setApprovedDays(prev => new Set(prev).add(dateStr));
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
  const workingDays = allDays.filter(d => {
    const dow = getDay(d);
    return dow !== 5 && dow !== 6;
  });
  const futureWorkingDays = workingDays.filter(d => d >= todayDate);

  // Auto-generated filter jobs for this month, merged with global state + redistributed overdue jobs
  const filterJobs = useMemo(() => {
    const generated = generateFilterJobs(month, year, customersList);
    const jobMap = new Map(jobs.map(j => [j.id, j]));
    const generatedIds = new Set(generated.map(g => g.id));
    const generatedCustomerIds = new Set(generated.map(g => g.customerId));

    // Merge completion data from global jobs state
    const merged = generated.map(gj => {
      const globalJob = jobMap.get(gj.id);
      if (globalJob) {
        return { ...gj, status: globalJob.status, completionStatus: globalJob.completionStatus, completionNotes: globalJob.completionNotes };
      }
      return gj;
    });

    // Add redistributed overdue filter jobs that landed in this month (skip if customer already has a job)
    const redistributed = jobs.filter(j =>
      j.type === 'filter_replacement' &&
      !generatedIds.has(j.id) &&
      !generatedCustomerIds.has(j.customerId) &&
      j.createdAt.startsWith(`${year}-${String(month).padStart(2, '0')}`)
    );
    return [...merged, ...redistributed];
  }, [month, year, jobs]);

  // Generate filter jobs for a 2-week range around a given date (for the picker)
  const getFilterJobsInRange = useCallback((targetDateStr: string): Job[] => {
    const targetDate = new Date(targetDateStr + 'T00:00:00');
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

    const jobMap = new Map(jobs.map(j => [j.id, j]));
    const allRangeJobs: Job[] = [];
    const seenCustomerIds = new Set<string>();

    monthsInRange.forEach(key => {
      const [y, m] = key.split('-').map(Number);
      const generated = generateFilterJobs(m, y, customersList);
      generated.forEach(gj => {
        if (seenCustomerIds.has(gj.customerId)) return;
        seenCustomerIds.add(gj.customerId);
        const globalJob = jobMap.get(gj.id);
        if (globalJob) {
          allRangeJobs.push({ ...gj, status: globalJob.status, completionStatus: globalJob.completionStatus, completionNotes: globalJob.completionNotes });
        } else {
          allRangeJobs.push(gj);
        }
      });
    });

    return allRangeJobs;
  }, [customersList, jobs]);
  const [extraFilterAssignments, setExtraFilterAssignments] = useState<Map<string, Job[]>>(new Map());
  const [removedFromAutoIds, setRemovedFromAutoIds] = useState<Set<string>>(new Set());
  const [dayAreaOverrides, setDayAreaOverrides] = useState<Map<string, string[]>>(new Map());
  const filterDistribution = useMemo(() => distributeFilterJobs(filterJobs, futureWorkingDays), [filterJobs, futureWorkingDays]);

  const getDayAreas = (dateStr: string): string[] => {
    if (dayAreaOverrides.has(dateStr)) return dayAreaOverrides.get(dateStr)!;
    // No auto-determined areas — days start empty, areas are selected manually
    return [];
  };

  // When areas are overridden, rebuild that day's filter list from the new areas
  const handleAreaOverride = (dateStr: string, newAreas: string[]) => {
    setDayAreaOverrides(prev => new Map(prev).set(dateStr, newAreas));

    // Clear extra filter assignments for this day
    setExtraFilterAssignments(prev => {
      const next = new Map(prev);
      next.delete(dateStr);
      return next;
    });

    // Unassign manual jobs (malfunction/installation) from this day so the route resets
    const manualDayJobs = getManualDayJobs(dateStr);
    manualDayJobs.forEach(j => onUnassignJob(j.id));

    // Unassign any previously approved filter jobs for this day from global state
    const approvedFilterJobsForDay = jobs.filter(
      j => j.type === 'filter_replacement' &&
        j.scheduledDate === dateStr &&
        (j.status === 'confirmed' || j.status === 'in_progress')
    );
    approvedFilterJobsForDay.forEach(j => onUnassignJob(j.id));

    // Revoke day approval so the new set must be re-approved
    setApprovedDays(prev => {
      const next = new Set(prev);
      next.delete(dateStr);
      return next;
    });

    toast.success(`אזורים עודכנו: ${newAreas.join(', ')}`);
  };

  // Unassigned filter jobs (not yet distributed to any day)
  const assignedFilterIds = useMemo(() => {
    const ids = new Set<string>();
    filterDistribution.forEach(jobs => jobs.forEach(j => { if (!removedFromAutoIds.has(j.id)) ids.add(j.id); }));
    extraFilterAssignments.forEach(jobs => jobs.forEach(j => ids.add(j.id)));
    return ids;
  }, [filterDistribution, extraFilterAssignments, removedFromAutoIds]);

  const unassignedFilterJobs = useMemo(() =>
    filterJobs.filter(j => !assignedFilterIds.has(j.id)),
    [filterJobs, assignedFilterIds]
  );

  // Manually assigned jobs (malfunction/installation) for this tech & month — exclude filter jobs which are managed separately
  const manualJobs = jobs.filter(j =>
    j.type !== 'filter_replacement' &&
    j.technicianId === selectedTechId &&
    j.scheduledDate &&
    j.scheduledDate.startsWith(`${year}-${String(month).padStart(2, '0')}`)
  );

  // Unassigned malfunction/installation jobs
  const unassignedManualJobs = jobs.filter(j =>
    j.type !== 'filter_replacement' &&
    (!j.technicianId || !j.scheduledDate)
  );

  const getManualDayJobs = (dateStr: string) => manualJobs.filter(j => j.scheduledDate === dateStr);
  const getFilterDayJobs = (dateStr: string) => [
    ...(extraFilterAssignments.get(dateStr) || []),
  ];

  const handleFilterPickerSelect = (jobIds: string[], dateStr: string) => {
    const selected = filterJobs.filter(j => jobIds.includes(j.id));
    setExtraFilterAssignments(prev => {
      const next = new Map(prev);
      const existing = next.get(dateStr) || [];
      next.set(dateStr, [...existing, ...selected]);
      return next;
    });
  };

  const handleFilterPickerMoveSelect = (jobIds: string[], otherDayIdsSet: Set<string>, dateStr: string) => {
    const selected = filterJobs.filter(j => jobIds.includes(j.id));
    const movedIds = new Set(jobIds.filter(id => otherDayIdsSet.has(id)));

    const autoMovedIds = new Set<string>();
    if (movedIds.size > 0) {
      filterDistribution.forEach((dayJobs, key) => {
        if (key !== dateStr) {
          dayJobs.forEach(j => { if (movedIds.has(j.id)) autoMovedIds.add(j.id); });
        }
      });
    }
    if (autoMovedIds.size > 0) {
      setRemovedFromAutoIds(prev => {
        const next = new Set(prev);
        autoMovedIds.forEach(id => next.add(id));
        return next;
      });
    }

    setExtraFilterAssignments(prev => {
      const next = new Map(prev);
      if (movedIds.size > 0) {
        next.forEach((dayJobs, key) => {
          if (key !== dateStr) {
            const filtered = dayJobs.filter(j => !movedIds.has(j.id));
            if (filtered.length > 0) next.set(key, filtered);
            else next.delete(key);
          }
        });
      }
      const existing = next.get(dateStr) || [];
      next.set(dateStr, [...existing, ...selected]);
      return next;
    });
  };

  const handlePickerSelect = (jobIds: string[]) => {
    if (!pickerState) return;
    const { dateStr } = pickerState;
    jobIds.forEach(jobId => {
      onAssignJob(jobId, selectedTechId, dateStr, '08:00');
    });
  };

  // Find the nearest working day (after the removed day) that has jobs in the same area
  const findNearestAreaDay = useCallback((removedDateStr: string, jobCity: string): string | null => {
    const removedDate = new Date(removedDateStr + 'T00:00:00');
    // Look forward through working days for same-area days
    const candidates = futureWorkingDays
      .filter(d => format(d, 'yyyy-MM-dd') !== removedDateStr && d >= removedDate)
      .map(d => format(d, 'yyyy-MM-dd'));
    
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
  }, [futureWorkingDays, filterDistribution, extraFilterAssignments, removedFromAutoIds, manualJobs]);

  // Remove a filter job from its current day and reschedule to nearest same-area day
  const handleRemoveAndRescheduleFilter = useCallback((jobId: string, fromDateStr: string) => {
    const job = filterJobs.find(j => j.id === jobId);
    if (!job) return;

    // Remove from current day
    const isAuto = (filterDistribution.get(fromDateStr) || []).some(j => j.id === jobId);
    if (isAuto) {
      setRemovedFromAutoIds(prev => new Set(prev).add(jobId));
    } else {
      setExtraFilterAssignments(prev => {
        const next = new Map(prev);
        const dayJobs = next.get(fromDateStr) || [];
        const filtered = dayJobs.filter(j => j.id !== jobId);
        if (filtered.length > 0) next.set(fromDateStr, filtered);
        else next.delete(fromDateStr);
        return next;
      });
    }

    // Find nearest day with same area and add there
    const targetDate = findNearestAreaDay(fromDateStr, job.city);
    if (targetDate) {
      setExtraFilterAssignments(prev => {
        const next = new Map(prev);
        const existing = next.get(targetDate) || [];
        next.set(targetDate, [...existing, job]);
        return next;
      });
      toast.success(`שירות הועבר ל-${targetDate} (${job.city})`);
    } else {
      toast.info('המשימה הוסרה מהלו״ז — לא נמצא יום מתאים באותו אזור');
    }
  }, [filterJobs, filterDistribution, findNearestAreaDay]);

  // Remove a manual job and reschedule to nearest same-area day
  const handleRemoveAndRescheduleManual = useCallback((jobId: string, fromDateStr: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    const targetDate = findNearestAreaDay(fromDateStr, job.city);
    if (targetDate) {
      onUnassignJob(jobId);
      // Small delay to let state update, then reassign
      setTimeout(() => {
        onAssignJob(jobId, selectedTechId, targetDate, '08:00');
        toast.success(`${JOB_TYPE_CONFIG[job.type].label} הועבר ל-${targetDate} (${job.city})`);
      }, 0);
    } else {
      onUnassignJob(jobId);
      toast.info('המשימה הוסרה מהלו״ז — לא נמצא יום מתאים באותו אזור');
    }
  }, [jobs, findNearestAreaDay, onUnassignJob, onAssignJob, selectedTechId]);

  // Stats
  const stats = useMemo(() => {
    const filterCount = filterJobs.length;
    const manualAssigned = manualJobs.length;
    const unassigned = unassignedManualJobs.length;
    return [
      { label: 'שירות שוטף', count: filterCount, color: 'bg-info' },
      { label: 'משובצים ידנית', count: manualAssigned, color: 'bg-secondary' },
      { label: 'ממתינים לשיבוץ', count: unassigned, color: 'bg-muted-foreground' },
    ];
  }, [filterJobs, manualJobs, unassignedManualJobs]);

  // Calendar grid padding
  const startDow = getDay(monthStart); // 0=Sun

  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <div dir="rtl" className="space-y-5">
      {/* Tech toggle */}
      <div className="flex items-center gap-2">
        {technicians.map(tech => (
          <Button key={tech.id} variant={selectedTechId === tech.id ? 'default' : 'outline'} size="sm" onClick={() => setSelectedTechId(tech.id)}>
            <div className="w-5 h-5 rounded-full bg-gradient-secondary flex items-center justify-center text-secondary-foreground font-bold text-[10px] ml-1.5">
              {tech.name[0]}
            </div>
            {tech.name}
          </Button>
        ))}
      </div>

      {/* View mode toggle + Navigator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" disabled={
            viewMode === 'month'
              ? currentMonth.getFullYear() === new Date().getFullYear() && currentMonth.getMonth() <= new Date().getMonth()
              : currentWeekStart <= startOfWeek(new Date(), { weekStartsOn: 0 })
          } onClick={() => {
            if (viewMode === 'month') setCurrentMonth(prev => subMonths(prev, 1));
            else setCurrentWeekStart(prev => subWeeks(prev, 1));
          }}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-card-foreground">
            {viewMode === 'month'
              ? `${MONTH_NAMES[month - 1]} ${year}`
              : `${format(currentWeekStart, 'd/M')} – ${format(endOfWeek(currentWeekStart, { weekStartsOn: 0 }), 'd/M/yyyy')}`
            }
          </h3>
          {viewMode === 'month' ? (
            <div className="flex items-center gap-1">
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
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentWeekStart(ws);
                      setViewMode('week');
                    }}
                    className="gap-1 text-xs px-2"
                  >
                    <ZoomIn className="w-3 h-3" />
                    שבוע {i + 1}
                  </Button>
                ));
              })()}
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('month')}
              className="gap-1.5"
            >
              <ZoomOut className="w-3.5 h-3.5" />
              תצוגת חודש
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => {
            if (viewMode === 'month') setCurrentMonth(prev => addMonths(prev, 1));
            else setCurrentWeekStart(prev => addWeeks(prev, 1));
          }}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-card rounded-xl shadow-card p-4 flex items-center gap-4">
            <div className={`w-4 h-4 rounded-full ${s.color}`} />
            <div>
              <p className="text-2xl font-bold text-card-foreground">{s.count}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5"><Filter className="w-4 h-4 text-info" /> שירות שוטף</div>
        <div className="flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-destructive" /> תקלה</div>
        <div className="flex items-center gap-1.5"><Wrench className="w-4 h-4 text-secondary" /> התקנה</div>
      </div>

      {/* Calendar grid */}
      {(() => {
        const isWeekView = viewMode === 'week';
        const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0 });
        const displayDays = isWeekView
          ? eachDayOfInterval({ start: currentWeekStart, end: weekEnd })
          : allDays;
        const emptyBefore = isWeekView ? 0 : startDow;

        return (
          <div className="bg-card rounded-xl shadow-card overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {DAY_HEADERS.map((d, i) => (
                <div key={i} className={`text-center py-2.5 text-sm font-semibold ${i === 5 || i === 6 ? 'text-muted-foreground/50' : 'text-card-foreground'}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className="grid grid-cols-7">
              {Array.from({ length: emptyBefore }).map((_, i) => (
                <div key={`empty-${i}`} className={`${isWeekView ? 'min-h-[280px]' : 'min-h-[130px]'} border-b border-r border-border bg-muted/20`} />
              ))}

              {displayDays.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dow = getDay(day);
                const isWeekend = dow === 5 || dow === 6;
                const isToday = dateStr === today;
                const inCurrentMonth = isWeekView ? true : isSameMonth(day, currentMonth);
                const dayFilterJobs = getFilterDayJobs(dateStr);
                const dayManualJobs = getManualDayJobs(dateStr);
                const totalMinutes = dayFilterJobs.reduce((s, j) => s + j.estimatedDuration, 0) + dayManualJobs.reduce((s, j) => s + j.estimatedDuration, 0);
                const maxShow = isWeekView ? 20 : 2;
                const dayAreas = !isWeekend && inCurrentMonth ? getDayAreas(dateStr) : [];
                const isDayApproved = approvedDays.has(dateStr);
                const hasJobs = dayFilterJobs.length + dayManualJobs.length > 0;

                return (
                  <div
                    key={dateStr}
                    className={`${isWeekView ? 'min-h-[280px]' : 'min-h-[130px]'} border-b border-r border-border p-2 transition-colors cursor-pointer hover:bg-muted/20 ${
                      isWeekend ? 'bg-muted/30' : ''
                    } ${isToday ? 'ring-2 ring-inset ring-primary' : ''} ${!inCurrentMonth ? 'opacity-40' : ''} ${isDayApproved ? 'bg-success/5' : ''}`}
                    onClick={() => !isWeekend && inCurrentMonth && setDetailState({ open: true, dateStr })}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        <span className={`text-sm font-medium ${isToday ? 'text-primary font-bold' : 'text-card-foreground'}`}>
                          {isWeekView ? format(day, 'd/M') : day.getDate()}
                        </span>
                        {isDayApproved && <CheckCircle className="w-2.5 h-2.5 text-success" />}
                      </div>
                      <div className="flex items-center gap-1">
                        {totalMinutes > 0 && !isWeekend && (
                          <span className="text-[10px] text-muted-foreground">
                            {Math.floor(totalMinutes / 60)}:{String(totalMinutes % 60).padStart(2, '0')}
                          </span>
                        )}
                        {!isWeekend && inCurrentMonth && hasJobs && !isDayApproved && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setApprovalState({ open: true, dateStr });
                            }}
                            className="p-0.5 rounded hover:bg-success/20 transition-colors"
                            title="אשר יום"
                          >
                            <CheckCircle className="w-3 h-3 text-muted-foreground hover:text-success" />
                          </button>
                        )}
                      </div>
                    </div>

                    {!isWeekend && inCurrentMonth && (
                      <div className="mb-0.5" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                        <Popover modal={false}>
                          <PopoverTrigger asChild>
                            <button
                              className={`h-auto min-h-[20px] px-1.5 py-0.5 text-[10px] border-0 rounded w-full text-right flex items-center gap-0.5 flex-wrap ${
                                dayAreas.length > 0 ? 'bg-info/10 text-info hover:bg-info/20' : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                              }`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MapPin className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{dayAreas.length > 0 ? dayAreas.join(', ') : 'בחר אזור'}</span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent dir="rtl" className="w-56 p-2" align="start" onOpenAutoFocus={(e) => e.preventDefault()} onInteractOutside={(e) => { if ((e.target as HTMLElement)?.closest?.('[data-radix-popover-content]')) e.preventDefault(); }}>
                            <p className="text-xs font-semibold mb-2 text-muted-foreground">בחר אזורים ליום:</p>
                            <div className="space-y-1 max-h-[200px] overflow-y-auto">
                              {REGIONS.map(r => (
                                <label key={r} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-xs">
                                  <Checkbox
                                    checked={dayAreas.includes(r)}
                                    onCheckedChange={(checked) => {
                                      const newAreas = checked
                                        ? [...dayAreas, r]
                                        : dayAreas.filter(a => a !== r);
                                      if (newAreas.length > 0) {
                                        handleAreaOverride(dateStr, newAreas);
                                      } else {
                                        // Allow clearing all areas
                                        setDayAreaOverrides(prev => {
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
                      <div className="space-y-1">
                        {dayFilterJobs.slice(0, maxShow).map(job => (
                          <MiniJobChip key={job.id} job={job} isAutoScheduled onRemove={() => handleRemoveAndRescheduleFilter(job.id, dateStr)} />
                        ))}
                        {dayFilterJobs.length > maxShow && (
                          <span className="text-[10px] text-info">+{dayFilterJobs.length - maxShow} שירות</span>
                        )}
                        {dayManualJobs.slice(0, maxShow).map(job => (
                          <MiniJobChip key={job.id} job={job} onRemove={() => handleRemoveAndRescheduleManual(job.id, dateStr)} />
                        ))}
                        {dayManualJobs.length > maxShow && (
                          <span className="text-[10px] text-muted-foreground">+{dayManualJobs.length - maxShow} עוד</span>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const dayDate = new Date(dateStr + 'T00:00:00');
                            setPickerState({
                              open: true,
                              dateStr,
                              dayLabel: format(dayDate, 'EEEE d/M', { locale: he }),
                            });
                          }}
                          className="w-full text-[10px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-0.5 py-1 rounded border border-dashed border-border hover:border-primary/50 hover:text-primary transition-colors mt-1"
                          title="הוסף משימה"
                        >
                          <Plus className="w-3 h-3" />
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
      <div className="flex justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // Find next available working day
            const nextDay = workingDays.find(d => format(d, 'yyyy-MM-dd') >= today) || workingDays[0];
            const dateStr = format(nextDay, 'yyyy-MM-dd');
            setPickerState({
              open: true,
              dateStr,
              dayLabel: format(nextDay, 'EEEE d/M', { locale: he }),
            });
          }}
        >
          <Plus className="w-4 h-4 ml-1" />
          הוסף משימה ידנית
        </Button>
      </div>

      {/* Picker dialog */}
      {pickerState && (() => {
        const dayAreas = getDayAreas(pickerState.dateStr);
        const dayExistingFilters = getFilterDayJobs(pickerState.dateStr);
        const dayExistingIds = new Set(dayExistingFilters.map(j => j.id));

        // Get filter jobs within 2-week range of this day
        const rangedFilterJobs = getFilterJobsInRange(pickerState.dateStr);
        const assignedIds = new Set<string>();
        extraFilterAssignments.forEach(dayJobs => dayJobs.forEach(j => assignedIds.add(j.id)));
        // Also mark jobs already assigned via global state
        jobs.filter(j => j.type === 'filter_replacement' && j.scheduledDate).forEach(j => assignedIds.add(j.id));

        const unassignedRangedFilters = rangedFilterJobs.filter(j => 
          !assignedIds.has(j.id) && !dayExistingIds.has(j.id)
        );

        const fromOtherDays: Job[] = [];
        const allOtherDayIdSet = new Set<string>();
        extraFilterAssignments.forEach((dayJobs, dStr) => {
          if (dStr === pickerState.dateStr) return;
          dayJobs.forEach(j => {
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
            onSelectFilterJobs={(jobIds, odi) => handleFilterPickerMoveSelect(jobIds, odi, pickerState.dateStr)}
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
            const isFilter = filterJobs.some(j => j.id === jobId);
            if (isFilter) {
              handleRemoveAndRescheduleFilter(jobId, detailState.dateStr);
            } else {
              handleRemoveAndRescheduleManual(jobId, detailState.dateStr);
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
    </div>
  );
}
