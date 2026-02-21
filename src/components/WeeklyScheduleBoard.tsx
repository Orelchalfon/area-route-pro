import { useState, useMemo } from 'react';
import { Job, JOB_TYPE_CONFIG, STATUS_CONFIG, JobType } from '@/types';
import { technicians } from '@/data/mockData';
import { useJobsContext } from '@/contexts/JobsContext';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, MapPin, User, AlertTriangle, Filter, Wrench, Users, Plus, X, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, startOfToday } from 'date-fns';
import { he } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';

interface WeeklyScheduleBoardProps {
  jobs: Job[];
  onApprove: (jobIds: string[]) => void;
  onStatusChange: (jobId: string, status: string) => void;
  onAssignJob: (jobId: string, technicianId: string, scheduledDate: string, scheduledTime: string) => void;
  onUnassignJob: (jobId: string) => void;
}

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

const typeIcons: Record<string, React.ReactNode> = {
  filter_replacement: <Filter className="w-3.5 h-3.5" />,
  malfunction: <AlertTriangle className="w-3.5 h-3.5" />,
  installation: <Wrench className="w-3.5 h-3.5" />,
};

function MiniJobCard({ job, onRemove }: { job: Job; onRemove?: () => void }) {
  const { customersList: customers } = useJobsContext();
  const customer = customers.find(c => c.id === job.customerId);
  const typeConfig = JOB_TYPE_CONFIG[job.type];

  const priorityBorder: Record<string, string> = {
    high: 'border-r-destructive',
    medium: 'border-r-secondary',
    low: 'border-r-info',
  };

  return (
    <div dir="rtl" className={`bg-card rounded-lg p-2.5 shadow-card border-r-4 ${priorityBorder[job.priority]} transition-all hover:shadow-elevated group relative`}>
      {onRemove && (
        <button onClick={onRemove} className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10">
          <X className="w-3 h-3 text-destructive" />
        </button>
      )}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-muted-foreground">{typeIcons[job.type]}</span>
        <span className="font-medium text-xs text-card-foreground">{typeConfig.label}</span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-0.5">
        <User className="w-3 h-3 shrink-0" />
        <span className="truncate">{customer?.name}</span>
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{job.scheduledTime || '—'}</span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <span className="truncate max-w-[70px]">{job.city}</span>
        </div>
      </div>
    </div>
  );
}

// Time slot calculator
function getNextAvailableTime(assignedJobs: Job[]): string {
  if (assignedJobs.length === 0) return '08:00';
  const sorted = [...assignedJobs].sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));
  const last = sorted[sorted.length - 1];
  const [h, m] = (last.scheduledTime || '08:00').split(':').map(Number);
  const endMinutes = h * 60 + m + last.estimatedDuration;
  const newH = Math.floor(endMinutes / 60);
  const newM = endMinutes % 60;
  if (newH >= 17) return ''; // No more time
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

function getTotalMinutes(assignedJobs: Job[]): number {
  return assignedJobs.reduce((sum, j) => sum + j.estimatedDuration, 0);
}

interface AreaPickerDialogProps {
  open: boolean;
  onClose: () => void;
  unassignedJobs: Job[];
  onSelectJobs: (jobIds: string[]) => void;
  dayLabel: string;
  techName: string;
}

function AreaPickerDialog({ open, onClose, unassignedJobs, onSelectJobs, dayLabel, techName }: AreaPickerDialogProps) {
  const { customersList: customers } = useJobsContext();
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());

  // Get unique cities
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
    filter_replacement: areaJobs.filter(j => j.type === 'filter_replacement'),
  }), [areaJobs]);

  const toggleJob = (jobId: string) => {
    setSelectedJobIds(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
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
              <Checkbox
                checked={selectedJobIds.has(job.id)}
                onCheckedChange={() => toggleJob(job.id)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{customer?.name}</span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                    job.priority === 'high' ? 'bg-destructive/15 text-destructive' :
                    job.priority === 'medium' ? 'bg-warning/15 text-warning' :
                    'bg-info/15 text-info'
                  }`}>
                    {job.priority === 'high' ? 'גבוהה' : job.priority === 'medium' ? 'בינונית' : 'נמוכה'}
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
          <DialogTitle>הוספת פניות — {techName} — {dayLabel}</DialogTitle>
        </DialogHeader>

        {!selectedArea ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-3">בחר אזור עבודה:</p>
            <div className="grid grid-cols-2 gap-2">
              {cities.map(city => {
                const count = unassignedJobs.filter(j => j.city === city).length;
                return (
                  <Button
                    key={city}
                    variant="outline"
                    className="justify-between h-auto py-3"
                    onClick={() => setSelectedArea(city)}
                  >
                    <span className="font-medium">{city}</span>
                    <span className="text-xs text-muted-foreground">{count} פניות</span>
                  </Button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setSelectedArea(null); setSelectedJobIds(new Set()); }}>
                ← חזרה לאזורים
              </Button>
              <span className="font-semibold">{selectedArea}</span>
              <span className="text-xs text-muted-foreground">({areaJobs.length} פניות)</span>
            </div>

            <Tabs defaultValue="malfunction" className="w-full">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="malfunction" className="gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  תקלות ({jobsByType.malfunction.length})
                </TabsTrigger>
                <TabsTrigger value="installation" className="gap-1">
                  <Wrench className="w-3.5 h-3.5" />
                  התקנות ({jobsByType.installation.length})
                </TabsTrigger>
                <TabsTrigger value="filter_replacement" className="gap-1">
                  <Filter className="w-3.5 h-3.5" />
                  שירות ({jobsByType.filter_replacement.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="malfunction">{renderJobList(jobsByType.malfunction)}</TabsContent>
              <TabsContent value="installation">{renderJobList(jobsByType.installation)}</TabsContent>
              <TabsContent value="filter_replacement">{renderJobList(jobsByType.filter_replacement)}</TabsContent>
            </Tabs>

            {selectedJobIds.size > 0 && (
              <div className="sticky bottom-0 bg-card border-t border-border pt-3 flex items-center justify-between">
                <span className="text-sm font-medium">{selectedJobIds.size} פניות נבחרו</span>
                <Button onClick={handleConfirm}>
                  <Plus className="w-4 h-4 ml-1" />
                  הוסף ללו״ז
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function WeeklyScheduleBoard({ jobs, onApprove, onStatusChange, onAssignJob, onUnassignJob }: WeeklyScheduleBoardProps) {
  const today = startOfToday();
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [pickerState, setPickerState] = useState<{ open: boolean; techId: string; dateStr: string; dayLabel: string } | null>(null);

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    let offset = 0;
    while (days.length < 5) {
      const d = addDays(today, offset);
      const dow = d.getDay();
      if (dow !== 5 && dow !== 6) days.push(d);
      offset++;
    }
    return days;
  }, []);

  const displayTechs = selectedTechId
    ? technicians.filter(t => t.id === selectedTechId)
    : technicians.slice(0, 2);

  const assignedJobs = jobs.filter(j => j.technicianId && j.scheduledDate);
  const unassignedJobs = jobs.filter(j => !j.technicianId || !j.scheduledDate);

  const getDayJobs = (techId: string, dateStr: string) => {
    return assignedJobs
      .filter(j => j.technicianId === techId && j.scheduledDate === dateStr)
      .sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));
  };

  const getDayDraftJobs = (dateStr: string) => {
    const techIds = displayTechs.map(t => t.id);
    return assignedJobs.filter(j => j.status === 'draft' && j.scheduledDate === dateStr && techIds.includes(j.technicianId || ''));
  };

  const handleApproveDay = (dateStr: string) => {
    const ids = getDayDraftJobs(dateStr).map(j => j.id);
    if (ids.length === 0) return;
    onApprove(ids);
    toast.success(`${ids.length} משימות אושרו ליום ${dateStr}`, {
      description: 'הלקוחות יקבלו SMS/אימייל עם שעת הגעה משוערת.',
    });
  };

  const handlePickerSelect = (jobIds: string[]) => {
    if (!pickerState) return;
    const { techId, dateStr } = pickerState;
    const existingDayJobs = getDayJobs(techId, dateStr);

    jobIds.forEach((jobId, index) => {
      const prevJobs = [...existingDayJobs];
      // Calculate time for each new job sequentially
      for (let i = 0; i < index; i++) {
        const addedJob = jobs.find(j => j.id === jobIds[i]);
        if (addedJob) prevJobs.push({ ...addedJob, scheduledTime: getNextAvailableTime(prevJobs) } as Job);
      }
      const time = getNextAvailableTime(prevJobs);
      if (time) {
        onAssignJob(jobId, techId, dateStr, time);
      }
    });
  };

  const stats = useMemo(() => [
    { label: 'לא משובצים', count: unassignedJobs.length, color: 'bg-muted-foreground' },
    { label: 'טיוטה', count: assignedJobs.filter(j => j.status === 'draft').length, color: 'bg-warning' },
    { label: 'ממתין', count: assignedJobs.filter(j => j.status === 'pending_customer').length, color: 'bg-info' },
    { label: 'הושלם', count: assignedJobs.filter(j => j.status === 'completed').length, color: 'bg-success' },
  ], [unassignedJobs, assignedJobs]);

  return (
    <div dir="rtl" className="space-y-6">
      {/* Technician toggle */}
      <div className="flex items-center gap-2">
        <Button variant={selectedTechId === null ? 'default' : 'outline'} size="sm" onClick={() => setSelectedTechId(null)}>
          <Users className="w-4 h-4 ml-1.5" />כל הטכנאים
        </Button>
        {technicians.slice(0, 2).map(tech => (
          <Button key={tech.id} variant={selectedTechId === tech.id ? 'default' : 'outline'} size="sm" onClick={() => setSelectedTechId(tech.id)}>
            <div className="w-5 h-5 rounded-full bg-gradient-secondary flex items-center justify-center text-secondary-foreground font-bold text-[10px] ml-1.5">
              {tech.name[0]}
            </div>
            {tech.name}
          </Button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-card rounded-lg shadow-card p-4 flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${s.color}`} />
            <div>
              <p className="text-2xl font-bold text-card-foreground">{s.count}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Weekly grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Header row */}
          <div className="grid grid-cols-[100px_repeat(5,1fr)] gap-2 mb-2">
            <div className="p-2" />
            {weekDays.map((day, i) => {
              const isToday = i === 0 && addDays(today, 0).getTime() === day.getTime();
              const dayOfWeek = day.getDay();
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayDrafts = getDayDraftJobs(dateStr);

              return (
                <div key={i} className={`text-center p-3 rounded-lg ${isToday ? 'bg-primary text-primary-foreground' : 'bg-card shadow-card'}`}>
                  <p className={`text-sm font-semibold ${isToday ? '' : 'text-card-foreground'}`}>{DAY_NAMES[dayOfWeek]}</p>
                  <p className={`text-xs mb-2 ${isToday ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {format(day, 'd/M', { locale: he })}
                  </p>
                  {dayDrafts.length > 0 && (
                    <Button size="sm" variant={isToday ? 'secondary' : 'default'} className="h-7 text-xs w-full" onClick={() => handleApproveDay(dateStr)}>
                      <CheckCircle className="w-3 h-3 ml-1" />אשר ({dayDrafts.length})
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Technician rows */}
          {displayTechs.map(tech => (
            <div key={tech.id} className="grid grid-cols-[100px_repeat(5,1fr)] gap-2 mb-2">
              <div className="bg-card rounded-lg shadow-card p-3 flex flex-col items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-gradient-secondary flex items-center justify-center text-secondary-foreground font-bold text-sm mb-1">
                  {tech.name[0]}
                </div>
                <p className="text-xs font-medium text-card-foreground text-center leading-tight">{tech.name}</p>
                <p className="text-[10px] text-muted-foreground">{tech.region}</p>
              </div>

              {weekDays.map((day, i) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayJobs = getDayJobs(tech.id, dateStr);
                const totalMin = getTotalMinutes(dayJobs);

                return (
                  <div key={i} className="bg-muted/30 rounded-lg p-2 min-h-[120px] flex flex-col">
                    <div className="flex-1 space-y-1.5">
                      {dayJobs.map(job => (
                        <MiniJobCard key={job.id} job={job} onRemove={() => onUnassignJob(job.id)} />
                      ))}
                    </div>
                    {/* Add button */}
                    <div className="mt-2 space-y-1">
                      {totalMin > 0 && (
                        <p className="text-[10px] text-muted-foreground text-center">{Math.floor(totalMin / 60)} שע׳ {totalMin % 60} דק׳</p>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-7 text-xs border border-dashed border-border text-muted-foreground hover:text-foreground"
                        onClick={() => setPickerState({ open: true, techId: tech.id, dateStr, dayLabel: `${DAY_NAMES[day.getDay()]} ${format(day, 'd/M')}` })}
                      >
                        <Plus className="w-3 h-3 ml-1" />
                        הוסף פניות
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Picker dialog */}
      {pickerState && (
        <AreaPickerDialog
          open={pickerState.open}
          onClose={() => setPickerState(null)}
          unassignedJobs={unassignedJobs}
          onSelectJobs={handlePickerSelect}
          dayLabel={pickerState.dayLabel}
          techName={technicians.find(t => t.id === pickerState.techId)?.name || ''}
        />
      )}
    </div>
  );
}
