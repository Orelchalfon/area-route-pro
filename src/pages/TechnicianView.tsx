import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useJobsContext } from '@/contexts/JobsContext';
import { approvedDayKey } from '@/hooks/useApprovedDays';
import { technicians } from '@/data/mockData';
import { Job, CompletionStatus } from '@/types';
import { JobCard } from '@/components/JobCard';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle2, Clock, LayoutDashboard, XCircle, RotateCcw, Pencil, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfWeek, addDays, isToday, addWeeks } from 'date-fns';
import { he } from 'date-fns/locale';
import { normalizeIsraeliPhone, whatsappUrl } from '@/lib/whatsapp';
import { CompletionDialog } from './technician-view/CompletionDialog';
import { EditReportDialog } from './technician-view/EditReportDialog';
import { WeekDaySelector } from './technician-view/WeekDaySelector';

const getTodayStr = () => format(new Date(), 'yyyy-MM-dd');

interface TechnicianViewProps {
  jobs: Job[];
  onMarkCompletion: (jobId: string, status: CompletionStatus, notes: string) => void;
}

export default function TechnicianView({ jobs, onMarkCompletion }: TechnicianViewProps) {
  const { isAdmin, technicianId } = useAuth();
  const { customersList, approvedDayKeys } = useJobsContext();
  // Employees only see a day's jobs once the manager approves it (realtime); admins
  // browsing keep the full view for planning.
  const dayApproved = (j: Job) =>
    isAdmin ||
    (!!j.technicianId &&
      !!j.scheduledDate &&
      approvedDayKeys.has(approvedDayKey(j.technicianId, j.scheduledDate)));
  const [selectedTech, setSelectedTech] = useState(technicians[0].id);
  // Admins may browse any technician; employees are locked to their own.
  const activeTechId = isAdmin ? selectedTech : technicianId;
  const [completingJobId, setCompletingJobId] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<CompletionStatus>('done');
  const [selectedDay, setSelectedDay] = useState<string>(getTodayStr);
  const [weekOffset, setWeekOffset] = useState(0);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<CompletionStatus>('done');
  const [editNotes, setEditNotes] = useState('');
  const todayStr = getTodayStr();

  const tech = technicians.find(t => t.id === activeTechId);

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
    .filter(j => j.technicianId === activeTechId && j.scheduledDate === selectedDay && dayApproved(j))
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

  if (!tech) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6" dir="rtl">
        <div className="text-center text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">לא שויך טכנאי לחשבון זה</p>
          <p className="text-sm">פנה למנהל המערכת כדי לשייך אותך לטכנאי</p>
        </div>
      </div>
    );
  }

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

        {/* Tech Selector — admins only; employees are locked to their own view */}
        {isAdmin && (
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
        )}
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
        <WeekDaySelector
          weekDays={weekDays}
          selectedDay={selectedDay}
          weekOffset={weekOffset}
          getDayJobCount={(date) =>
            jobs.filter(j => j.technicianId === activeTechId && j.scheduledDate === date && dayApproved(j) && (j.status === 'confirmed' || j.status === 'completed')).length
          }
          onSelectDay={setSelectedDay}
          onPrevWeek={() => setWeekOffset(w => w - 1)}
          onNextWeek={() => setWeekOffset(w => w + 1)}
          onResetToToday={() => { setWeekOffset(0); setSelectedDay(todayStr); }}
        />

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
            {activeJobs.map((job, idx) => {
              const customer = customersList.find(c => c.id === job.customerId);
              const waPhone = normalizeIsraeliPhone(customer?.phone);
              return (
              <div key={job.id}>
                <JobCard
                  job={job}
                  variant="technician"
                  isNext={idx === 0}
                />
                {/* WhatsApp — pre-filled ETA message to the customer */}
                {customer && waPhone && (
                  <div className="mt-2 px-1">
                    <Button
                      size="sm"
                      className="w-full h-11 bg-[#25D366] hover:bg-[#1da851] text-white"
                      onClick={() => window.open(whatsappUrl(waPhone, `היי ${customer.name} מדבר ${tech.name} אנחנו מגיעים אליך עוד חצי שעה`), '_blank')}
                    >
                      <MessageCircle className="w-3.5 h-3.5 ml-1" />
                      וואטסאפ — בדרך אליך
                    </Button>
                  </div>
                )}
                {/* 3 action buttons */}
                <div className="flex gap-2 mt-2 px-1">
                  <Button
                    size="sm"
                    className="flex-1 h-11 bg-success hover:bg-success/90 text-success-foreground"
                    onClick={() => openCompletionDialog(job.id, 'done')}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
                    בוצע
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-11 border-destructive text-destructive hover:bg-destructive/10"
                    onClick={() => openCompletionDialog(job.id, 'not_done')}
                  >
                    <XCircle className="w-3.5 h-3.5 ml-1" />
                    לא בוצע
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-11 border-warning text-warning hover:bg-warning/10"
                    onClick={() => openCompletionDialog(job.id, 'need_return')}
                  >
                    <RotateCcw className="w-3.5 h-3.5 ml-1" />
                    צריך לחזור
                  </Button>
                </div>
              </div>
              );
            })}
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
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-sm font-medium">
                      {statusLabel}
                      {job.completionNotes && <span className="text-muted-foreground"> — {job.completionNotes}</span>}
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground hover:text-foreground" onClick={() => openEditDialog(job)}>
                      <Pencil className="w-3.5 h-3.5 ml-1" />
                      עריכה
                    </Button>
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

      <CompletionDialog
        open={!!completingJobId}
        status={selectedStatus}
        notes={completionNotes}
        onNotesChange={setCompletionNotes}
        onConfirm={handleComplete}
        onClose={() => setCompletingJobId(null)}
      />

      <EditReportDialog
        open={!!editingJobId}
        status={editStatus}
        notes={editNotes}
        onStatusChange={setEditStatus}
        onNotesChange={setEditNotes}
        onSave={handleEditSave}
        onClose={() => setEditingJobId(null)}
      />
    </div>
  );
}
