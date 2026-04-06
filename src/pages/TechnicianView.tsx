import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { technicians } from '@/data/mockData';
import { Job, CompletionStatus } from '@/types';
import { JobCard } from '@/components/JobCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar, CheckCircle2, ChevronRight, ChevronLeft, Clock, LayoutDashboard, XCircle, RotateCcw, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfWeek, addDays, isToday, addWeeks, subWeeks } from 'date-fns';
import { he } from 'date-fns/locale';

const getTodayStr = () => format(new Date(), 'yyyy-MM-dd');

interface TechnicianViewProps {
  jobs: Job[];
  onMarkCompletion: (jobId: string, status: CompletionStatus, notes: string) => void;
}

export default function TechnicianView({ jobs, onMarkCompletion }: TechnicianViewProps) {
  const [selectedTech, setSelectedTech] = useState(technicians[0].id);
  const [completingJobId, setCompletingJobId] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<CompletionStatus>('done');
  const [selectedDay, setSelectedDay] = useState<string>(getTodayStr);
  const [weekOffset, setWeekOffset] = useState(0);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<CompletionStatus>('done');
  const [editNotes, setEditNotes] = useState('');
  const todayStr = getTodayStr();

  const tech = technicians.find(t => t.id === selectedTech)!;

  // Week days based on offset
  const weekDays = useMemo(() => {
    const base = weekOffset === 0 ? new Date() : addWeeks(new Date(), weekOffset);
    const weekStart = startOfWeek(base, { weekStartsOn: 0 });
    return Array.from({ length: 5 }, (_, i) => {
      const day = addDays(weekStart, i);
      return {
        date: format(day, 'yyyy-MM-dd'),
        label: format(day, 'EEEE', { locale: he }),
        shortLabel: format(day, 'EEE', { locale: he }),
        dayNum: format(day, 'd/M'),
        isToday: isToday(day),
      };
    });
  }, [weekOffset]);

  const techJobs = jobs
    .filter(j => j.technicianId === selectedTech && j.scheduledDate === selectedDay)
    .sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));

  const activeJobs = techJobs.filter(j => j.status === 'confirmed');
  const completedJobs = techJobs.filter(j => j.status === 'completed');
  const nextJob = activeJobs[0];

  const handleComplete = () => {
    if (!completingJobId) return;
    onMarkCompletion(completingJobId, selectedStatus, completionNotes);
    const messages: Record<CompletionStatus, string> = {
      done: 'המשימה סומנה כבוצעה!',
      not_done: 'המשימה סומנה כלא בוצעה',
      need_return: 'המשימה סומנה — צריך לחזור',
    };
    toast.success(messages[selectedStatus]);
    setCompletingJobId(null);
    setCompletionNotes('');
    setSelectedStatus('done');
  };

  const openCompletionDialog = (jobId: string, status: CompletionStatus) => {
    setCompletingJobId(jobId);
    setSelectedStatus(status);
    setCompletionNotes('');
  };

  const openEditDialog = (job: Job) => {
    setEditingJobId(job.id);
    setEditStatus(job.completionStatus || 'done');
    setEditNotes(job.completionNotes || '');
  };

  const handleEditSave = () => {
    if (!editingJobId) return;
    onMarkCompletion(editingJobId, editStatus, editNotes);
    toast.success('הדיווח עודכן בהצלחה');
    setEditingJobId(null);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-hero text-primary-foreground p-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold">
              {tech.name[0]}
            </div>
            <div>
              <h1 className="font-semibold text-lg">{tech.name}</h1>
              <p className="text-sm opacity-80">{tech.region} · {tech.skills.join(', ')}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10" asChild>
              <Link to="/"><LayoutDashboard className="w-4 h-4" /></Link>
            </Button>
          </div>
        </div>

        {/* Tech Selector */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {technicians.map(t => (
            <Button
              key={t.id}
              size="sm"
              variant={t.id === selectedTech ? 'secondary' : 'ghost'}
              className={t.id !== selectedTech ? 'text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10' : ''}
              onClick={() => setSelectedTech(t.id)}
            >
              {t.name.split(' ')[0]}
            </Button>
          ))}
        </div>
      </div>

      <div className="p-4 -mt-3 space-y-4">
        {/* Summary */}
        <div className="bg-card rounded-lg shadow-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{activeJobs.length}</p>
              <p className="text-xs text-muted-foreground">פעילות</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold text-success">{completedJobs.length}</p>
              <p className="text-xs text-muted-foreground">הושלמו</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{weekDays.find(d => d.date === selectedDay)?.label || 'היום'}</span>
          </div>
        </div>

        {/* Week Navigation + Day Selector */}
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => { setWeekOffset(w => w + 1); }}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <div className="flex gap-1.5 overflow-x-auto pb-1 flex-1">
            {weekDays.map(day => {
              const dayJobCount = jobs.filter(j => j.technicianId === selectedTech && j.scheduledDate === day.date && (j.status === 'confirmed' || j.status === 'completed')).length;
              const isSelected = day.date === selectedDay;
              return (
                <button
                  key={day.date}
                  onClick={() => setSelectedDay(day.date)}
                  className={`flex-1 min-w-[60px] rounded-lg p-2 text-center transition-colors border ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : day.isToday
                      ? 'bg-primary/10 border-primary/30 text-foreground'
                      : 'bg-card border-border text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <div className="text-[11px] font-medium">{day.shortLabel}</div>
                  <div className="text-sm font-bold">{day.dayNum}</div>
                  {dayJobCount > 0 && (
                    <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {dayJobCount} משימות
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => { setWeekOffset(w => w - 1); }}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
        {weekOffset !== 0 && (
          <Button size="sm" variant="link" className="text-xs text-muted-foreground p-0 h-auto" onClick={() => { setWeekOffset(0); setSelectedDay(todayStr); }}>
            חזור להיום
          </Button>
        )}

        {/* Next Task Banner */}
        {nextJob && selectedDay === todayStr && (
          <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium text-foreground">הבא בתור ב-{nextJob.scheduledTime}</span>
          </div>
        )}

        {/* Active Jobs */}
        {activeJobs.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse-soft" />
              משימות פעילות
            </h2>
            {activeJobs.map((job, idx) => (
              <div key={job.id}>
                <JobCard
                  job={job}
                  variant="technician"
                  isNext={idx === 0}
                />
                {/* 3 action buttons */}
                <div className="flex gap-2 mt-2 px-1">
                  <Button
                    size="sm"
                    className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                    onClick={() => openCompletionDialog(job.id, 'done')}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
                    בוצע
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
                    onClick={() => openCompletionDialog(job.id, 'not_done')}
                  >
                    <XCircle className="w-3.5 h-3.5 ml-1" />
                    לא בוצע
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-warning text-warning hover:bg-warning/10"
                    onClick={() => openCompletionDialog(job.id, 'need_return')}
                  >
                    <RotateCcw className="w-3.5 h-3.5 ml-1" />
                    צריך לחזור
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Completed */}
        {completedJobs.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              דווחו ({completedJobs.length})
            </h2>
            {completedJobs.map(job => {
              const statusColor = job.completionStatus === 'done' ? 'bg-success/10 border-success/30' :
                job.completionStatus === 'not_done' ? 'bg-destructive/10 border-destructive/30' :
                job.completionStatus === 'need_return' ? 'bg-warning/10 border-warning/30' : 'bg-muted/10';
              const statusLabel = job.completionStatus === 'done' ? '✓ בוצע' :
                job.completionStatus === 'not_done' ? '✗ לא בוצע' :
                job.completionStatus === 'need_return' ? '↻ צריך לחזור' : 'הושלם';
              return (
                <div key={job.id} className={`rounded-lg border p-3 ${statusColor}`}>
                  <JobCard job={job} variant="technician" />
                  <div className="mt-2 text-sm font-medium">
                    {statusLabel}
                    {job.completionNotes && <span className="text-muted-foreground"> — {job.completionNotes}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeJobs.length === 0 && completedJobs.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">אין משימות מתוזמנות</p>
            <p className="text-sm">בדוק שוב מאוחר יותר</p>
          </div>
        )}
      </div>

      {/* Complete Dialog */}
      <Dialog open={!!completingJobId} onOpenChange={() => setCompletingJobId(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {selectedStatus === 'done' ? 'סימון כבוצע' :
               selectedStatus === 'not_done' ? 'סימון כלא בוצע' :
               'סימון — צריך לחזור'}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="הוסף הערות..."
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
            rows={4}
          />
          <DialogFooter className="flex-row-reverse gap-2 sm:flex-row-reverse">
            <Button
              onClick={handleComplete}
              className={
                selectedStatus === 'done' ? 'bg-success hover:bg-success/90 text-success-foreground' :
                selectedStatus === 'not_done' ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' :
                'bg-warning hover:bg-warning/90 text-warning-foreground'
              }
            >
              {selectedStatus === 'done' ? <CheckCircle2 className="w-4 h-4 ml-2" /> :
               selectedStatus === 'not_done' ? <XCircle className="w-4 h-4 ml-2" /> :
               <RotateCcw className="w-4 h-4 ml-2" />}
              אישור
            </Button>
            <Button variant="outline" onClick={() => setCompletingJobId(null)}>ביטול</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
