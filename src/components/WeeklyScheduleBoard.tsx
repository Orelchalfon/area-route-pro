import { useState, useMemo } from 'react';
import { Job, JOB_TYPE_CONFIG, STATUS_CONFIG } from '@/types';
import { technicians, customers } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, MapPin, User, AlertTriangle, Filter, Wrench, Users } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, startOfToday } from 'date-fns';
import { he } from 'date-fns/locale';

interface WeeklyScheduleBoardProps {
  jobs: Job[];
  onApprove: (jobIds: string[]) => void;
  onStatusChange: (jobId: string, status: string) => void;
}

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

const typeIcons: Record<string, React.ReactNode> = {
  filter_replacement: <Filter className="w-3.5 h-3.5" />,
  malfunction: <AlertTriangle className="w-3.5 h-3.5" />,
  installation: <Wrench className="w-3.5 h-3.5" />,
};

function MiniJobCard({ job }: { job: Job }) {
  const customer = customers.find(c => c.id === job.customerId);
  const typeConfig = JOB_TYPE_CONFIG[job.type];
  const statusConfig = STATUS_CONFIG[job.status];

  const statusColors: Record<string, string> = {
    muted: 'bg-muted text-muted-foreground',
    warning: 'bg-warning/15 text-warning',
    info: 'bg-info/15 text-info',
    secondary: 'bg-secondary/15 text-secondary',
    success: 'bg-success/15 text-success',
    accent: 'bg-accent/15 text-accent-foreground',
    destructive: 'bg-destructive/15 text-destructive',
  };

  const priorityBorder: Record<string, string> = {
    high: 'border-r-destructive',
    medium: 'border-r-secondary',
    low: 'border-r-info',
  };

  return (
    <div dir="rtl" className={`bg-card rounded-lg p-3 shadow-card border-r-4 ${priorityBorder[job.priority]} transition-all hover:shadow-elevated`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">{typeIcons[job.type]}</span>
          <span className="font-medium text-sm text-card-foreground">{typeConfig.label}</span>
        </div>
        <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full ${statusColors[statusConfig?.color] || statusColors.muted}`}>
          {statusConfig?.label}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        <User className="w-3 h-3 shrink-0" />
        <span className="truncate">{customer?.name}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{job.scheduledTime}</span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <span className="truncate max-w-[80px]">{job.city}</span>
        </div>
      </div>
    </div>
  );
}

export function WeeklyScheduleBoard({ jobs, onApprove, onStatusChange }: WeeklyScheduleBoardProps) {
  const today = startOfToday();
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);

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

  const filteredJobs = selectedTechId
    ? jobs.filter(j => j.technicianId === selectedTechId)
    : jobs;

  const draftJobs = filteredJobs.filter(j => j.status === 'draft');

  const handleApproveAll = () => {
    const ids = draftJobs.map(j => j.id);
    if (ids.length === 0) return;
    onApprove(ids);
    toast.success(`${ids.length} משימות אושרו — הודעות נשלחו ללקוחות`, {
      description: 'הלקוחות יקבלו SMS/אימייל עם שעת הגעה משוערת.',
    });
  };

  const stats = [
    { label: 'טיוטה', count: filteredJobs.filter(j => j.status === 'draft').length, color: 'bg-muted-foreground' },
    { label: 'ממתין', count: filteredJobs.filter(j => j.status === 'pending_customer').length, color: 'bg-warning' },
    { label: 'מאושר', count: filteredJobs.filter(j => j.status === 'confirmed').length, color: 'bg-info' },
    { label: 'הושלם', count: filteredJobs.filter(j => j.status === 'completed').length, color: 'bg-success' },
  ];

  return (
    <div dir="rtl" className="space-y-6">
      {/* Technician toggle buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant={selectedTechId === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedTechId(null)}
        >
          <Users className="w-4 h-4 ml-1.5" />
          כל הטכנאים
        </Button>
        {technicians.slice(0, 2).map(tech => (
          <Button
            key={tech.id}
            variant={selectedTechId === tech.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTechId(tech.id)}
          >
            <div className="w-5 h-5 rounded-full bg-gradient-secondary flex items-center justify-center text-secondary-foreground font-bold text-[10px] ml-1.5">
              {tech.name[0]}
            </div>
            {tech.name}
          </Button>
        ))}
      </div>

      {/* Stats bar */}
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

      {/* Approve button */}
      {draftJobs.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{draftJobs.length} משימות בטיוטה</span>
          <Button onClick={handleApproveAll} className="bg-gradient-secondary text-secondary-foreground">
            <CheckCircle className="w-4 h-4 ml-2" />
            אשר לו״ז
          </Button>
        </div>
      )}

      {/* Weekly grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Header row - days */}
          <div className={`grid ${selectedTechId ? 'grid-cols-[100px_repeat(5,1fr)]' : 'grid-cols-[100px_repeat(5,1fr)]'} gap-2 mb-2`}>
            <div className="p-2" />
            {weekDays.map((day, i) => {
              const isToday = i === 0 && addDays(today, 0).getTime() === day.getTime();
              const dayOfWeek = day.getDay();
              return (
                <div
                  key={i}
                  className={`text-center p-3 rounded-lg ${isToday ? 'bg-primary text-primary-foreground' : 'bg-card shadow-card'}`}
                >
                  <p className={`text-sm font-semibold ${isToday ? '' : 'text-card-foreground'}`}>
                    {DAY_NAMES[dayOfWeek]}
                  </p>
                  <p className={`text-xs ${isToday ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {format(day, 'd/M', { locale: he })}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Technician rows */}
          {displayTechs.map(tech => (
            <div key={tech.id} className="grid grid-cols-[100px_repeat(5,1fr)] gap-2 mb-2">
              {/* Tech name cell */}
              <div className="bg-card rounded-lg shadow-card p-3 flex flex-col items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-gradient-secondary flex items-center justify-center text-secondary-foreground font-bold text-sm mb-1">
                  {tech.name[0]}
                </div>
                <p className="text-xs font-medium text-card-foreground text-center leading-tight">{tech.name}</p>
                <p className="text-[10px] text-muted-foreground">{tech.region}</p>
              </div>

              {/* Day cells */}
              {weekDays.map((day, i) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayJobs = jobs
                  .filter(j => j.technicianId === tech.id && j.scheduledDate === dateStr)
                  .sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));

                return (
                  <div
                    key={i}
                    className="bg-muted/30 rounded-lg p-2 min-h-[120px] space-y-2"
                  >
                    {dayJobs.length === 0 && (
                      <p className="text-xs text-muted-foreground/50 text-center mt-8">—</p>
                    )}
                    {dayJobs.map(job => (
                      <MiniJobCard key={job.id} job={job} />
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
