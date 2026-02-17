import { useState, useMemo } from 'react';
import { Job, JOB_TYPE_CONFIG, Customer, CompletionStatus } from '@/types';
import { technicians, customers } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, MapPin, User, AlertTriangle, Filter, Wrench, Users, Plus, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Calendar, XCircle, RotateCcw, Archive, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, getDay, addMonths, subMonths, addWeeks, subWeeks, isSameMonth } from 'date-fns';
import { he } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const REGIONS = [
  'דרום רחוק', 'דרום קרוב', 'דרום תל אביב והסביבה', 'ירושלים והסביבה',
  'מרכז פתח תקווה', 'הרצליה ורעננה', 'שומרון', 'נתניה ועמק חפר',
  'צפון קרוב', 'צפון רחוק',
];

interface MonthlyScheduleBoardProps {
  jobs: Job[];
  onApprove: (jobIds: string[]) => void;
  onApproveDaySchedule: (assignments: { jobId: string; technicianId: string; scheduledDate: string; scheduledTime: string }[]) => void;
  onStatusChange: (jobId: string, status: string) => void;
  onAssignJob: (jobId: string, technicianId: string, scheduledDate: string, scheduledTime: string) => void;
  onUnassignJob: (jobId: string) => void;
  onCloseJob?: (jobId: string) => void;
  onReturnJob?: (jobId: string) => void;
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
    estimatedDuration: 25,
    location: customer.address,
    city: customer.city,
    notes: 'החלפת פילטר שנתית',
    createdAt: `${year}-${String(month).padStart(2, '0')}-01`,
  }));
}

// Distribute filter jobs across working days — each day gets jobs from ONE area only (3 per day)
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

  // Assign each area's jobs to consecutive days, 3 per day
  Object.values(jobsByCity).forEach(cityJobs => {
    for (let i = 0; i < cityJobs.length; i += perDay) {
      if (dayIdx >= dayKeys.length) break;
      const dateStr = dayKeys[dayIdx];
      const chunk = cityJobs.slice(i, i + perDay);
      const existing = distribution.get(dateStr) || [];
      distribution.set(dateStr, [...existing, ...chunk]);
      dayIdx++;
    }
  });

  return distribution;
}

function MiniJobChip({ job, onRemove, isAutoScheduled }: { job: Job; onRemove?: () => void; isAutoScheduled?: boolean }) {
  const customer = customers.find(c => c.id === job.customerId);

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
      <span className="truncate max-w-[90px]">{customer?.name}</span>
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
function UnifiedJobPickerDialog({ open, onClose, unassignedManualJobs, unassignedFilterJobs, filterJobsFromOtherDays, otherDayIds, onSelectManualJobs, onSelectFilterJobs, dayLabel, dayArea }: {
  open: boolean;
  onClose: () => void;
  unassignedManualJobs: Job[];
  unassignedFilterJobs: Job[];
  filterJobsFromOtherDays: Job[];
  otherDayIds: Set<string>;
  onSelectManualJobs: (jobIds: string[]) => void;
  onSelectFilterJobs: (jobIds: string[], otherDayIds: Set<string>) => void;
  dayLabel: string;
  dayArea: string | null;
}) {
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('malfunction');

  // Combine all jobs for area selection
  const allAvailableJobs = [...unassignedManualJobs, ...unassignedFilterJobs, ...filterJobsFromOtherDays];

  const cities = useMemo(() => {
    const citySet = new Set(allAvailableJobs.map(j => j.city));
    return Array.from(citySet).sort();
  }, [allAvailableJobs]);

  const areaJobs = useMemo(() => {
    if (!selectedArea) return [];
    return allAvailableJobs.filter(j => j.city === selectedArea);
  }, [selectedArea, allAvailableJobs]);

  const jobsByType = useMemo(() => ({
    malfunction: selectedArea ? unassignedManualJobs.filter(j => j.type === 'malfunction' && j.city === selectedArea) : [],
    installation: selectedArea ? unassignedManualJobs.filter(j => j.type === 'installation' && j.city === selectedArea) : [],
    filter_replacement: selectedArea ? [...unassignedFilterJobs, ...filterJobsFromOtherDays].filter(j => j.city === selectedArea) : [],
  }), [selectedArea, unassignedManualJobs, unassignedFilterJobs, filterJobsFromOtherDays]);

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
    // Stay open — don't close the dialog, keep the area selected so user can continue adding
  };

  const handleClose = () => {
    setSelectedArea(null);
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
                <p className="text-xs text-muted-foreground mt-0.5">{job.location}</p>
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
        </DialogHeader>

        {!selectedArea ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-3">בחר אזור:</p>
            <div className="grid grid-cols-2 gap-2">
              {cities.map(city => {
                const count = allAvailableJobs.filter(j => j.city === city).length;
                return (
                  <Button key={city} variant="outline" className="justify-between h-auto py-3" onClick={() => setSelectedArea(city)}>
                    <span className="font-medium text-xs">{city}</span>
                    <span className="text-xs text-muted-foreground">{count}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setSelectedArea(null); setSelectedJobIds(new Set()); }}>← חזרה</Button>
              <span className="font-semibold">{selectedArea}</span>
            </div>

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

// Day approval dialog
function DayApprovalDialog({ open, onClose, dateStr, dayJobs, filterJobs, onApprove, approvedDays }: {
  open: boolean; onClose: () => void; dateStr: string; dayJobs: Job[]; filterJobs: Job[];
  onApprove: (jobIds: string[], dateStr: string) => void; approvedDays: Set<string>;
}) {
  const allJobs = [...filterJobs, ...dayJobs];
  const dayDate = new Date(dateStr + 'T00:00:00');
  const dayLabel = format(dayDate, 'EEEE d/M', { locale: he });
  const timeRanges = calculateTimeRanges(allJobs);
  const isApproved = approvedDays.has(dateStr);
  const totalMinutes = allJobs.reduce((s, j) => s + j.estimatedDuration, 0);
  const endMinutes = 10 * 60 + totalMinutes;
  const overTime = endMinutes > 17 * 60;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isApproved && <CheckCircle className="w-5 h-5 text-success" />}
            אישור לו״ז — {dayLabel}
          </DialogTitle>
        </DialogHeader>

        {allJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">אין משימות ליום זה</p>
        ) : (
          <div className="space-y-3">
            {/* Summary */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
              <span>{allJobs.length} משימות</span>
              <span>10:00 – {String(Math.floor(endMinutes / 60)).padStart(2, '0')}:{String(endMinutes % 60).padStart(2, '0')}</span>
              {overTime && <span className="text-destructive font-medium">⚠ חריגה מ-17:00</span>}
            </div>

            {/* Timeline */}
            <div className="space-y-1">
              {timeRanges.map(({ job, startTime, endTime }, i) => {
                const customer = customers.find(c => c.id === job.customerId);
                const typeConfig = JOB_TYPE_CONFIG[job.type];
                return (
                  <div key={job.id} className={`p-3 rounded-lg border ${typeColors[job.type]}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {typeIcons[job.type]}
                        <span className="font-medium text-sm">{customer?.name}</span>
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
            {!isApproved ? (
              <Button
                className="w-full gap-2 bg-success hover:bg-success/90 text-success-foreground"
                onClick={() => {
                  onApprove(allJobs.map(j => j.id), dateStr);
                  toast.success(`יום ${dayLabel} אושר — ${allJobs.length} משימות שובצו לטכנאי`);
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
        )}
      </DialogContent>
    </Dialog>
  );
}

// Day detail dialog
function DayDetailDialog({ open, onClose, dateStr, dayJobs, filterJobs, onRemoveJob, onCloseJob, onReturnJob }: {
  open: boolean; onClose: () => void; dateStr: string; dayJobs: Job[]; filterJobs: Job[]; onRemoveJob: (jobId: string) => void;
  onCloseJob?: (jobId: string) => void; onReturnJob?: (jobId: string) => void;
}) {
  const allJobs = [...filterJobs, ...dayJobs];
  const dayDate = new Date(dateStr + 'T00:00:00');
  const dayLabel = format(dayDate, 'EEEE d/M', { locale: he });
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  const completionColorMap: Record<string, string> = {
    done: 'border-success bg-success/10',
    not_done: 'border-destructive bg-destructive/10',
    need_return: 'border-warning bg-warning/10',
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{dayLabel}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {allJobs.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">אין משימות ליום זה</p>}
          {allJobs.map(job => {
            const customer = customers.find(c => c.id === job.customerId);
            const typeConfig = JOB_TYPE_CONFIG[job.type];
            const isFilter = job.type === 'filter_replacement';
            const isCompleted = job.status === 'completed';
            const borderClass = job.completionStatus ? completionColorMap[job.completionStatus] : typeColors[job.type];
            const isExpanded = expandedJobId === job.id;

            return (
              <div key={job.id}>
                <div
                  className={`p-3 rounded-lg border-2 ${borderClass} flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity`}
                  onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                >
                  <div className="flex items-center gap-2">
                    {typeIcons[job.type]}
                    <div>
                      <p className="text-sm font-medium">{customer?.name}</p>
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
                  </div>
                  {!isFilter && !isCompleted && (
                    <button onClick={(e) => { e.stopPropagation(); onRemoveJob(job.id); }} className="p-1 rounded hover:bg-destructive/10">
                      <X className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  )}
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
                    <div className="flex gap-2">
                      {onCloseJob && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs"
                          onClick={() => {
                            onCloseJob(job.id);
                            toast.success('הקריאה נסגרה והועברה להיסטוריה');
                            onClose();
                          }}
                        >
                          <Archive className="w-3 h-3 ml-1" />
                          סגור קריאה
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
                            onClose();
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
      </DialogContent>
    </Dialog>
  );
}
// Filter job picker with checkboxes
function FilterJobPicker({ jobs, onSelect, movedFromOtherDay }: { jobs: Job[]; onSelect: (jobIds: string[]) => void; movedFromOtherDay?: Set<string> }) {
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


export function MonthlyScheduleBoard({ jobs, onApprove, onApproveDaySchedule, onStatusChange, onAssignJob, onUnassignJob, onCloseJob, onReturnJob }: MonthlyScheduleBoardProps) {
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
    const generated = generateFilterJobs(month, year, customers);
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
  const [extraFilterAssignments, setExtraFilterAssignments] = useState<Map<string, Job[]>>(new Map());
  const [removedFromAutoIds, setRemovedFromAutoIds] = useState<Set<string>>(new Set());
  const [dayAreaOverrides, setDayAreaOverrides] = useState<Map<string, string>>(new Map());
  const filterDistribution = useMemo(() => distributeFilterJobs(filterJobs, futureWorkingDays), [filterJobs, futureWorkingDays]);

  // Get the effective area for a day (override or auto-determined)
  const getDayArea = (dateStr: string): string | null => {
    if (dayAreaOverrides.has(dateStr)) return dayAreaOverrides.get(dateStr)!;
    const autoJobs = (filterDistribution.get(dateStr) || []).filter(j => !removedFromAutoIds.has(j.id));
    const extraJobs = extraFilterAssignments.get(dateStr) || [];
    const allDayFilters = [...autoJobs, ...extraJobs];
    return allDayFilters.length > 0 ? allDayFilters[0].city : null;
  };

  // When area is overridden, rebuild that day's filter list from the new area
  const handleAreaOverride = (dateStr: string, newArea: string) => {
    setDayAreaOverrides(prev => new Map(prev).set(dateStr, newArea));

    // Remove existing auto filters from this day
    const currentAutoJobs = (filterDistribution.get(dateStr) || []);
    setRemovedFromAutoIds(prev => {
      const next = new Set(prev);
      currentAutoJobs.forEach(j => next.add(j.id));
      return next;
    });

    // Clear extra assignments for this day
    setExtraFilterAssignments(prev => {
      const next = new Map(prev);
      next.delete(dateStr);
      return next;
    });

    // Find unassigned filter jobs from the new area and assign up to 3
    const allAssignedIds = new Set<string>();
    filterDistribution.forEach((dayJobs, key) => {
      if (key !== dateStr) dayJobs.forEach(j => { if (!removedFromAutoIds.has(j.id)) allAssignedIds.add(j.id); });
    });
    // Also count current removedFromAutoIds minus the ones we just removed
    currentAutoJobs.forEach(j => allAssignedIds.delete(j.id));
    extraFilterAssignments.forEach((dayJobs, key) => {
      if (key !== dateStr) dayJobs.forEach(j => allAssignedIds.add(j.id));
    });

    const available = filterJobs.filter(j => j.city === newArea && !allAssignedIds.has(j.id));
    const toAssign = available.slice(0, 3);

    if (toAssign.length > 0) {
      setExtraFilterAssignments(prev => {
        const next = new Map(prev);
        next.set(dateStr, toAssign);
        return next;
      });
    }

    toast.success(`האזור שונה ל-${newArea} — ${toAssign.length} פילטרים שובצו`);
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
    ...(filterDistribution.get(dateStr) || []).filter(j => !removedFromAutoIds.has(j.id)),
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
        <div className="flex items-center gap-1.5"><Filter className="w-4 h-4 text-info" /> שירות שוטף (אוטומטי)</div>
        <div className="flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-destructive" /> תקלה (ידני)</div>
        <div className="flex items-center gap-1.5"><Wrench className="w-4 h-4 text-secondary" /> התקנה (ידני)</div>
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
                const dayArea = !isWeekend && inCurrentMonth ? getDayArea(dateStr) : null;
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

                    {dayArea && !isWeekend && inCurrentMonth && (
                      <div className="mb-0.5">
                        <Select
                          value={dayArea}
                          onValueChange={(val) => {
                            handleAreaOverride(dateStr, val);
                          }}
                        >
                          <SelectTrigger
                            className="h-5 px-1.5 text-[10px] border-0 bg-info/10 text-info hover:bg-info/20 rounded w-full justify-start gap-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MapPin className="w-2.5 h-2.5 shrink-0" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent dir="rtl">
                            {REGIONS.map(r => (
                              <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {!isWeekend && inCurrentMonth && (
                      <div className="space-y-1">
                        {dayFilterJobs.slice(0, maxShow).map(job => (
                          <MiniJobChip key={job.id} job={job} isAutoScheduled />
                        ))}
                        {dayFilterJobs.length > maxShow && (
                          <span className="text-[10px] text-info">+{dayFilterJobs.length - maxShow} שירות</span>
                        )}
                        {dayManualJobs.slice(0, maxShow).map(job => (
                          <MiniJobChip key={job.id} job={job} onRemove={() => onUnassignJob(job.id)} />
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
        const dayArea = getDayArea(pickerState.dateStr);
        const dayExistingFilters = getFilterDayJobs(pickerState.dateStr);
        const dayExistingIds = new Set(dayExistingFilters.map(j => j.id));

        const unassignedSameAreaFilters = dayArea
          ? unassignedFilterJobs.filter(j => j.city === dayArea)
          : unassignedFilterJobs;

        const fromOtherDays: Job[] = [];
        if (dayArea) {
          filterDistribution.forEach((dayJobs, dateStr) => {
            if (dateStr === pickerState.dateStr) return;
            dayJobs.forEach(j => {
              if (j.city === dayArea && !dayExistingIds.has(j.id)) fromOtherDays.push(j);
            });
          });
          extraFilterAssignments.forEach((dayJobs, dateStr) => {
            if (dateStr === pickerState.dateStr) return;
            dayJobs.forEach(j => {
              if (j.city === dayArea && !dayExistingIds.has(j.id)) fromOtherDays.push(j);
            });
          });
        }

        const availableFilters = [...unassignedSameAreaFilters, ...fromOtherDays];
        const otherDayIds = new Set(fromOtherDays.map(j => j.id));

        return (
          <UnifiedJobPickerDialog
            open={pickerState.open}
            onClose={() => setPickerState(null)}
            unassignedManualJobs={unassignedManualJobs}
            unassignedFilterJobs={unassignedSameAreaFilters}
            filterJobsFromOtherDays={fromOtherDays}
            otherDayIds={otherDayIds}
            onSelectManualJobs={handlePickerSelect}
            onSelectFilterJobs={(jobIds, odi) => handleFilterPickerMoveSelect(jobIds, odi, pickerState.dateStr)}
            dayLabel={pickerState.dayLabel}
            dayArea={dayArea}
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
          onRemoveJob={onUnassignJob}
          onCloseJob={onCloseJob}
          onReturnJob={onReturnJob}
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
