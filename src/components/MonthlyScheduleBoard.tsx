import { useState, useMemo } from 'react';
import { Job, JOB_TYPE_CONFIG, Customer } from '@/types';
import { technicians, customers } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, MapPin, User, AlertTriangle, Filter, Wrench, Users, Plus, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, getDay, addMonths, subMonths, addWeeks, subWeeks, isSameMonth } from 'date-fns';
import { he } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';

interface MonthlyScheduleBoardProps {
  jobs: Job[];
  onApprove: (jobIds: string[]) => void;
  onStatusChange: (jobId: string, status: string) => void;
  onAssignJob: (jobId: string, technicianId: string, scheduledDate: string, scheduledTime: string) => void;
  onUnassignJob: (jobId: string) => void;
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
  const typeConfig = JOB_TYPE_CONFIG[job.type];

  return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${typeColors[job.type]} group relative`}>
      {typeIcons[job.type]}
      <span className="truncate max-w-[60px]">{customer?.name}</span>
      {isAutoScheduled && <span className="text-[8px] opacity-60">●</span>}
      {onRemove && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="opacity-0 group-hover:opacity-100 transition-opacity">
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}

// Area picker dialog for adding manual jobs
function ManualJobPickerDialog({ open, onClose, unassignedJobs, onSelectJobs, dayLabel }: {
  open: boolean;
  onClose: () => void;
  unassignedJobs: Job[];
  onSelectJobs: (jobIds: string[]) => void;
  dayLabel: string;
}) {
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());

  const cities = useMemo(() => {
    const citySet = new Set(unassignedJobs.map(j => j.city));
    return Array.from(citySet).sort();
  }, [unassignedJobs]);

  const areaJobs = useMemo(() => {
    if (!selectedArea) return [];
    return unassignedJobs.filter(j => j.city === selectedArea);
  }, [selectedArea, unassignedJobs]);

  const jobsByType = useMemo(() => ({
    malfunction: areaJobs.filter(j => j.type === 'malfunction'),
    installation: areaJobs.filter(j => j.type === 'installation'),
  }), [areaJobs]);

  const toggleJob = (jobId: string) => {
    setSelectedJobIds(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId); else next.add(jobId);
      return next;
    });
  };

  const handleConfirm = () => {
    onSelectJobs(Array.from(selectedJobIds));
    setSelectedArea(null);
    setSelectedJobIds(new Set());
    onClose();
  };

  const handleClose = () => {
    setSelectedArea(null);
    setSelectedJobIds(new Set());
    onClose();
  };

  const renderJobList = (items: Job[]) => {
    if (items.length === 0) return <p className="text-xs text-muted-foreground py-4 text-center">אין פניות באזור זה</p>;
    return (
      <div className="space-y-2">
        {items.map(job => {
          const customer = customers.find(c => c.id === job.customerId);
          return (
            <label key={job.id} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors">
              <Checkbox checked={selectedJobIds.has(job.id)} onCheckedChange={() => toggleJob(job.id)} className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{customer?.name}</span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                    job.priority === 'high' ? 'bg-destructive/15 text-destructive' : 'bg-warning/15 text-warning'
                  }`}>
                    {job.priority === 'high' ? 'גבוהה' : 'בינונית'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{job.location}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{job.estimatedDuration} דק׳</span>
                  <span>{job.notes}</span>
                </div>
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
          <DialogTitle>הוספת תקלה/התקנה — {dayLabel}</DialogTitle>
        </DialogHeader>

        {!selectedArea ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-3">בחר אזור:</p>
            <div className="grid grid-cols-2 gap-2">
              {cities.map(city => {
                const count = unassignedJobs.filter(j => j.city === city).length;
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

            <Tabs defaultValue="malfunction" className="w-full">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="malfunction" className="gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />תקלות ({jobsByType.malfunction.length})
                </TabsTrigger>
                <TabsTrigger value="installation" className="gap-1">
                  <Wrench className="w-3.5 h-3.5" />התקנות ({jobsByType.installation.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="malfunction">{renderJobList(jobsByType.malfunction)}</TabsContent>
              <TabsContent value="installation">{renderJobList(jobsByType.installation)}</TabsContent>
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

// Day detail dialog
function DayDetailDialog({ open, onClose, dateStr, dayJobs, filterJobs, onRemoveJob }: {
  open: boolean; onClose: () => void; dateStr: string; dayJobs: Job[]; filterJobs: Job[]; onRemoveJob: (jobId: string) => void;
}) {
  const allJobs = [...filterJobs, ...dayJobs];
  const dayDate = new Date(dateStr + 'T00:00:00');
  const dayLabel = format(dayDate, 'EEEE d/M', { locale: he });

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
            return (
              <div key={job.id} className={`p-3 rounded-lg border ${typeColors[job.type]} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  {typeIcons[job.type]}
                  <div>
                    <p className="text-sm font-medium">{customer?.name}</p>
                    <p className="text-xs opacity-70">{typeConfig.label} · {job.estimatedDuration} דק׳</p>
                    <p className="text-xs opacity-60">{job.location}</p>
                  </div>
                </div>
                {!isFilter && (
                  <button onClick={() => onRemoveJob(job.id)} className="p-1 rounded hover:bg-destructive/10">
                    <X className="w-3.5 h-3.5 text-destructive" />
                  </button>
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
function FilterJobPicker({ jobs, onSelect }: { jobs: Job[]; onSelect: (jobIds: string[]) => void }) {
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
        return (
          <label key={job.id} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors">
            <Checkbox checked={selectedIds.has(job.id)} onCheckedChange={() => toggle(job.id)} className="mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{customer?.name}</p>
              <p className="text-xs text-muted-foreground">{job.location} · {customer?.city}</p>
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


export function MonthlyScheduleBoard({ jobs, onApprove, onStatusChange, onAssignJob, onUnassignJob }: MonthlyScheduleBoardProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTechId, setSelectedTechId] = useState<string>(technicians[0].id);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [pickerState, setPickerState] = useState<{ open: boolean; dateStr: string; dayLabel: string } | null>(null);
  const [filterPickerState, setFilterPickerState] = useState<{ open: boolean; dateStr: string; dayLabel: string } | null>(null);
  const [detailState, setDetailState] = useState<{ open: boolean; dateStr: string } | null>(null);

  const month = currentMonth.getMonth() + 1; // 1-12
  const year = currentMonth.getFullYear();

  // Calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Working days (Sun-Thu, not Fri/Sat)
  const workingDays = allDays.filter(d => {
    const dow = getDay(d);
    return dow !== 5 && dow !== 6;
  });

  // Auto-generated filter jobs for this month
  const filterJobs = useMemo(() => generateFilterJobs(month, year, customers), [month, year]);
  const [extraFilterAssignments, setExtraFilterAssignments] = useState<Map<string, Job[]>>(new Map());
  const filterDistribution = useMemo(() => distributeFilterJobs(filterJobs, workingDays), [filterJobs, workingDays]);

  // Unassigned filter jobs (not yet distributed to any day)
  const assignedFilterIds = useMemo(() => {
    const ids = new Set<string>();
    filterDistribution.forEach(jobs => jobs.forEach(j => ids.add(j.id)));
    extraFilterAssignments.forEach(jobs => jobs.forEach(j => ids.add(j.id)));
    return ids;
  }, [filterDistribution, extraFilterAssignments]);

  const unassignedFilterJobs = useMemo(() =>
    filterJobs.filter(j => !assignedFilterIds.has(j.id)),
    [filterJobs, assignedFilterIds]
  );

  // Manually assigned jobs (malfunction/installation) for this tech & month
  const manualJobs = jobs.filter(j =>
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
    ...(filterDistribution.get(dateStr) || []),
    ...(extraFilterAssignments.get(dateStr) || []),
  ];

  const handleFilterPickerSelect = (jobIds: string[]) => {
    if (!filterPickerState) return;
    const { dateStr } = filterPickerState;
    const selected = filterJobs.filter(j => jobIds.includes(j.id));
    setExtraFilterAssignments(prev => {
      const next = new Map(prev);
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
          <Button variant="ghost" size="sm" onClick={() => {
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (viewMode === 'month') {
                setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
                setViewMode('week');
              } else {
                setViewMode('month');
              }
            }}
            className="gap-1.5"
          >
            {viewMode === 'month' ? <ZoomIn className="w-3.5 h-3.5" /> : <ZoomOut className="w-3.5 h-3.5" />}
            {viewMode === 'month' ? 'תצוגת שבוע' : 'תצוגת חודש'}
          </Button>
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
      <div className="grid grid-cols-3 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-card rounded-lg shadow-card p-3 flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${s.color}`} />
            <div>
              <p className="text-xl font-bold text-card-foreground">{s.count}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1"><Filter className="w-3 h-3 text-info" /> שירות שוטף (אוטומטי)</div>
        <div className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-destructive" /> תקלה (ידני)</div>
        <div className="flex items-center gap-1"><Wrench className="w-3 h-3 text-secondary" /> התקנה (ידני)</div>
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
                <div key={i} className={`text-center py-2 text-xs font-semibold ${i === 5 || i === 6 ? 'text-muted-foreground/50' : 'text-card-foreground'}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className="grid grid-cols-7">
              {Array.from({ length: emptyBefore }).map((_, i) => (
                <div key={`empty-${i}`} className={`${isWeekView ? 'min-h-[250px]' : 'min-h-[100px]'} border-b border-r border-border bg-muted/20`} />
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

                return (
                  <div
                    key={dateStr}
                    className={`${isWeekView ? 'min-h-[250px]' : 'min-h-[100px]'} border-b border-r border-border p-1.5 transition-colors cursor-pointer hover:bg-muted/20 ${
                      isWeekend ? 'bg-muted/30' : ''
                    } ${isToday ? 'ring-2 ring-inset ring-primary' : ''} ${!inCurrentMonth ? 'opacity-40' : ''}`}
                    onClick={() => !isWeekend && inCurrentMonth && setDetailState({ open: true, dateStr })}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium ${isToday ? 'text-primary font-bold' : 'text-card-foreground'}`}>
                        {isWeekView ? format(day, 'd/M') : day.getDate()}
                      </span>
                      {totalMinutes > 0 && !isWeekend && (
                        <span className="text-[9px] text-muted-foreground">
                          {Math.floor(totalMinutes / 60)}:{String(totalMinutes % 60).padStart(2, '0')}
                        </span>
                      )}
                    </div>

                    {!isWeekend && inCurrentMonth && (
                      <div className="space-y-0.5">
                        {dayFilterJobs.slice(0, maxShow).map(job => (
                          <MiniJobChip key={job.id} job={job} isAutoScheduled />
                        ))}
                        {dayFilterJobs.length > maxShow && (
                          <span className="text-[9px] text-info">+{dayFilterJobs.length - maxShow} שירות</span>
                        )}
                        {dayManualJobs.slice(0, maxShow).map(job => (
                          <MiniJobChip key={job.id} job={job} onRemove={() => onUnassignJob(job.id)} />
                        ))}
                        {dayManualJobs.length > maxShow && (
                          <span className="text-[9px] text-muted-foreground">+{dayManualJobs.length - maxShow} עוד</span>
                        )}

                        <div className="flex gap-0.5 mt-0.5">
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
                            className="flex-1 text-[8px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-0.5 py-0.5 rounded border border-dashed border-border hover:border-destructive/50 hover:text-destructive transition-colors"
                            title="הוסף תקלה/התקנה"
                          >
                            <AlertTriangle className="w-2 h-2" />
                            <Plus className="w-2 h-2" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const dayDate = new Date(dateStr + 'T00:00:00');
                              setFilterPickerState({
                                open: true,
                                dateStr,
                                dayLabel: format(dayDate, 'EEEE d/M', { locale: he }),
                              });
                            }}
                            className="flex-1 text-[8px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-0.5 py-0.5 rounded border border-dashed border-border hover:border-info/50 hover:text-info transition-colors"
                            title="הוסף החלפת פילטר"
                          >
                            <Filter className="w-2 h-2" />
                            <Plus className="w-2 h-2" />
                          </button>
                        </div>
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
          הוסף תקלה/התקנה ידנית
        </Button>
      </div>

      {/* Picker dialog */}
      {pickerState && (
        <ManualJobPickerDialog
          open={pickerState.open}
          onClose={() => setPickerState(null)}
          unassignedJobs={unassignedManualJobs}
          onSelectJobs={handlePickerSelect}
          dayLabel={pickerState.dayLabel}
        />
      )}

      {/* Filter picker dialog */}
      {filterPickerState && (() => {
        // Determine the area already assigned to this day
        const dayExistingFilters = getFilterDayJobs(filterPickerState.dateStr);
        const dayArea = dayExistingFilters.length > 0 ? dayExistingFilters[0].city : null;
        // Show only unassigned filters from the same area
        const availableFilters = dayArea
          ? unassignedFilterJobs.filter(j => j.city === dayArea)
          : unassignedFilterJobs;
        const areaLabel = dayArea ? ` (${dayArea})` : '';

        return (
          <Dialog open={filterPickerState.open} onOpenChange={() => setFilterPickerState(null)}>
            <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle>הוסף החלפות פילטר — {filterPickerState.dayLabel}{areaLabel}</DialogTitle>
              </DialogHeader>
              {availableFilters.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {dayArea ? `אין עוד לקוחות באזור ${dayArea}` : 'כל הפילטרים כבר משובצים בחודש זה'}
                </p>
              ) : (
                <FilterJobPicker
                  jobs={availableFilters}
                  onSelect={(jobIds) => {
                    handleFilterPickerSelect(jobIds);
                    setFilterPickerState(null);
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
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
        />
      )}
    </div>
  );
}
