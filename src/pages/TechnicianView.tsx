import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useJobsContext } from '@/contexts/JobsContext';
import { ArrivalConfirmationBadge } from '@/components/ArrivalConfirmationBadge';
import { approvedDayKey } from '@/hooks/useApprovedDays';
import { arrivalStateFor } from '@/hooks/useArrivalConfirmations';
import { technicians } from '@/data/technicians';
import { Job, CompletionStatus } from '@/types';
import { JobCard } from '@/components/JobCard';
import { JobListSkeleton } from '@/components/JobListSkeleton';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle2, Clock, Map as MapIcon, Lock, XCircle, RotateCcw, Pencil, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfWeek, addDays, isToday, addWeeks } from 'date-fns';
import { he } from 'date-fns/locale';
import { normalizeIsraeliPhone, whatsappUrl } from '@/lib/whatsapp';
import { jobMatchesSearch } from '@/lib/jobSearch';
import { CompletionDialog } from './technician-view/CompletionDialog';
import { EditReportDialog } from './technician-view/EditReportDialog';
import { JobSearchBar } from './technician-view/JobSearchBar';
import { WeekDaySelector } from './technician-view/WeekDaySelector';

const getTodayStr = () => format(new Date(), 'yyyy-MM-dd');

interface TechnicianViewProps {
  jobs: Job[];
  onMarkCompletion: (jobId: string, status: CompletionStatus, notes: string) => void;
}

export default function TechnicianView({ jobs, onMarkCompletion }: TechnicianViewProps) {
  const { isAdmin, technicianId } = useAuth();
  const {
    customersList,
    approvedDayKeys,
    lockedDayKeys,
    arrivalConfirmations,
    boardReady,
  } = useJobsContext();

  // Judged against the job's persisted slot — this view has no unsaved reorder of its own.
  const arrivalStateOf = (j: Job) =>
    arrivalStateFor(j, arrivalConfirmations.get(j.id));
  // Employees only see a day's jobs once the manager approves it (realtime); admins
  // browsing keep the full view for planning.
  const dayApproved = (j: Job) =>
    isAdmin ||
    (!!j.technicianId &&
      !!j.scheduledDate &&
      approvedDayKeys.has(approvedDayKey(j.technicianId, j.scheduledDate)));
  // Once a manager locks a day (after reviewing it), the technician can no longer
  // report new completions or edit existing ones for that day.
  const dayLocked = (j: Job) =>
    !!j.technicianId &&
    !!j.scheduledDate &&
    lockedDayKeys.has(approvedDayKey(j.technicianId, j.scheduledDate));
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
  // Deliberately NOT reset when the day or the technician changes: carrying the name
  // across days is useful, and a silent state reset is more surprising than an empty
  // list that says why it's empty and offers to clear itself.
  const [searchQuery, setSearchQuery] = useState('');
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

  // Unfiltered — these describe the DAY, not the query, so they must not move while
  // the technician is typing (summary counters, the "הבא בתור" banner, day counts).
  const activeJobs = techJobs.filter(j => j.status === 'confirmed');
  const completedJobs = techJobs.filter(j => j.status === 'completed');
  const nextJob = activeJobs[0];

  // What's actually rendered. One customer lookup map instead of a .find() per job.
  const customersById = new Map(customersList.map(c => [c.id, c]));
  const matchesSearch = (j: Job) =>
    jobMatchesSearch(j, customersById.get(j.customerId), searchQuery);
  const shownActive = activeJobs.filter(matchesSearch);
  const shownCompleted = completedJobs.filter(matchesSearch);
  const shownCount = shownActive.length + shownCompleted.length;
  const isSearching = searchQuery.trim().length > 0;

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
              <Link to="/daily-route" aria-label="מסלול יומי"><MapIcon className="w-4 h-4" /></Link>
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

        {/* Search — filters the selected day's lists. Hidden on an empty day, where
            there is nothing to filter. */}
        {techJobs.length > 0 && (
          <JobSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            resultLabel={
              isSearching ? `מציג ${shownCount} מתוך ${techJobs.length} משימות` : ''
            }
          />
        )}

        {/* Next Task Banner */}
        {nextJob && selectedDay === todayStr && (
          <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium text-foreground">הבא בתור ב-{nextJob.scheduledTime}</span>
          </div>
        )}

        {/* Active Jobs */}
        {shownActive.length > 0 && (
          <div className="space-y-5">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse-soft" />
              משימות פעילות
              {isSearching && ` (${shownActive.length})`}
            </h2>
            {shownActive.map((job) => {
              const customer = customersById.get(job.customerId);
              const waPhone = normalizeIsraeliPhone(customer?.phone);
              // Keyed off the day's real next job, not the filtered list's first row —
              // otherwise a search would move the "next" emphasis onto whatever matched.
              const isNext = job.id === nextJob?.id;
              return (
              <div
                key={job.id}
                className={`rounded-xl border bg-card p-3 shadow-card ${
                  isNext
                    ? 'border-secondary ring-1 ring-secondary/40'
                    : 'border-border'
                }`}
              >
                <JobCard
                  job={job}
                  variant="technician"
                />
                {/* Whether the customer confirmed this visit — read-only here; only the
                    manager records it (and RLS has no employee write policy for it). */}
                <div className="mt-2">
                  <ArrivalConfirmationBadge state={arrivalStateOf(job)} />
                </div>
                {/* WhatsApp — pre-filled ETA message to the customer */}
                {customer && waPhone && (
                  <div className="mt-2">
                    <Button
                      size="sm"
                      className="w-full h-11 bg-[#25D366] hover:bg-[#1da851] text-white"
                      onClick={() => window.open(whatsappUrl(waPhone), '_blank')}
                    >
                      <MessageCircle className="w-3.5 h-3.5 me-1" />
                      וואטסאפ — בדרך אליך
                    </Button>
                  </div>
                )}
                {/* Report row — separated and named, so it is unmistakably tied to the
                    card above it even when the previous card is scrolled off screen. */}
                <div className="mt-3 border-t border-border pt-2.5">
                  <p className="text-xs text-muted-foreground text-start mb-2">
                    דיווח עבור {customer?.name || 'הלקוח'}
                  </p>
                  {/* 3 action buttons — hidden once the manager locks the day */}
                  {dayLocked(job) ? (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Lock className="w-3.5 h-3.5" />
                      יום זה נעול לעריכה על ידי המנהל
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="flex-1 min-w-[6.5rem] h-11 bg-success hover:bg-success/90 text-success-foreground"
                        onClick={() => openCompletionDialog(job.id, 'done')}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 me-1 hidden sm:inline-block" />
                        בוצע
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 min-w-[6.5rem] h-11 border-destructive text-destructive hover:bg-destructive/10"
                        onClick={() => openCompletionDialog(job.id, 'not_done')}
                      >
                        <XCircle className="w-3.5 h-3.5 me-1 hidden sm:inline-block" />
                        לא בוצע
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 min-w-[6.5rem] h-11 border-warning text-warning-strong hover:bg-warning/10"
                        onClick={() => openCompletionDialog(job.id, 'need_return')}
                      >
                        <RotateCcw className="w-3.5 h-3.5 me-1 hidden sm:inline-block" />
                        צריך לחזור
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}

        {/* Completed */}
        {shownCompleted.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              דווחו ({shownCompleted.length})
            </h2>
            {shownCompleted.map(job => {
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
                    {dayLocked(job) ? (
                      <div className="flex items-center gap-1 h-7 px-2 text-xs text-muted-foreground">
                        <Lock className="w-3.5 h-3.5" />
                        נעול
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground hover:text-foreground" onClick={() => openEditDialog(job)}>
                        <Pencil className="w-3.5 h-3.5 ml-1" />
                        עריכה
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {shownActive.length === 0 &&
          shownCompleted.length === 0 &&
          // Don't claim the day is empty until everything has actually loaded — that
          // message is otherwise indistinguishable from a failed sync. And "no matches"
          // is only knowable once the day actually HAS jobs to search — otherwise it
          // would be shown over a day that simply hasn't loaded yet.
          (isSearching && techJobs.length > 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">לא נמצאו משימות התואמות את החיפוש</p>
              <Button
                variant="link"
                className="text-sm h-auto p-0 mt-1"
                onClick={() => setSearchQuery('')}
              >
                נקה חיפוש
              </Button>
            </div>
          ) : boardReady ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">אין משימות מתוזמנות</p>
              <p className="text-sm">בדוק שוב מאוחר יותר</p>
            </div>
          ) : (
            <JobListSkeleton />
          ))}
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
