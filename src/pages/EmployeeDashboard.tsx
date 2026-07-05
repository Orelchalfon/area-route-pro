import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Calendar, CheckCircle2, Clock, ListChecks, MapPin, Map as MapIcon, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useJobsContext } from '@/contexts/JobsContext';
import { approvedDayKey } from '@/hooks/useApprovedDays';
import { technicians } from '@/data/mockData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { JobCard } from '@/components/JobCard';

const getTodayStr = () => format(new Date(), 'yyyy-MM-dd');

export default function EmployeeDashboard() {
  const { technicianId } = useAuth();
  const { jobs, customersList, approvedDayKeys } = useJobsContext();
  const todayStr = getTodayStr();
  const tech = technicians.find(t => t.id === technicianId);

  // Employees only see a day's jobs once the manager approves it; cancelling the
  // approval removes it (approvedDayKeys is realtime-synced via useApprovedDays).
  const todayJobs = useMemo(
    () =>
      jobs
        .filter(
          j =>
            j.technicianId === technicianId &&
            j.scheduledDate === todayStr &&
            approvedDayKeys.has(approvedDayKey(j.technicianId, j.scheduledDate)),
        )
        .sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || '')),
    [jobs, technicianId, todayStr, approvedDayKeys],
  );

  const activeJobs = todayJobs.filter(j => j.status === 'confirmed');
  const completedJobs = todayJobs.filter(j => j.status === 'completed');
  const nextJob = activeJobs[0];
  const nextCustomer = nextJob ? customersList.find(c => c.id === nextJob.customerId) : undefined;

  if (!tech) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6" dir="rtl">
        <div className="text-center text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">לא שויך טכנאי לחשבון זה</p>
          <p className="text-sm">פנה למנהל המערכת כדי לשייך אותך לטכנאי</p>
        </div>
      </div>
    );
  }

  const dateLabel = format(new Date(), 'EEEE, d בMMMM yyyy', { locale: he });

  return (
    <div dir="rtl" className="space-y-4">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold text-lg">
            {tech.name[0]}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">שלום, {tech.name}</h2>
            <p className="text-sm text-muted-foreground">{dateLabel}</p>
          </div>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/technician">
            <ListChecks className="w-4 h-4" />
            הלו״ז שלי
          </Link>
        </Button>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Calendar className="w-4 h-4" /> משימות היום
          </div>
          <p className="text-3xl font-bold text-foreground">{todayJobs.length}</p>
        </Card>
        <Card className="p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Clock className="w-4 h-4" /> נותרו
          </div>
          <p className="text-3xl font-bold text-secondary">{activeJobs.length}</p>
        </Card>
        <Card className="p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <CheckCircle2 className="w-4 h-4" /> הושלמו
          </div>
          <p className="text-3xl font-bold text-success">{completedJobs.length}</p>
        </Card>
        <Card className="p-4 flex flex-col justify-between gap-2 bg-secondary/5 border-secondary/20">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <MapIcon className="w-4 h-4" /> מסלול
          </div>
          <Button asChild size="sm" className="w-full gap-2">
            <Link to="/daily-route">
              <MapIcon className="w-4 h-4" />
              מסלול יומי
            </Link>
          </Button>
        </Card>
      </div>

      {/* Next task */}
      <Card className="p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
          <Clock className="w-4 h-4 text-secondary" />
          המשימה הבאה
        </div>
        {nextJob ? (
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-foreground font-medium">
                <User className="w-4 h-4 text-muted-foreground" />
                {nextCustomer?.name || nextJob.location}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                {[nextJob.location, nextJob.city].filter(Boolean).join(', ')}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-secondary font-semibold whitespace-nowrap">
              <Clock className="w-4 h-4" />
              {nextJob.scheduledTime || '—'}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">אין משימות פעילות שנותרו להיום 🎉</p>
        )}
      </Card>

      {/* Today's stops (display only) */}
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-primary" />
          משימות היום ({todayJobs.length})
        </h3>
        {todayJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {todayJobs.map(job => (
              <JobCard key={job.id} job={job} variant="technician" />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-card rounded-xl border border-border text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="font-medium">אין משימות מתוזמנות להיום</p>
          </div>
        )}
      </div>
    </div>
  );
}
