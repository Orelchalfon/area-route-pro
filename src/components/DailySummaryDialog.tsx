import { useMemo } from 'react';
import { Job, JOB_TYPE_CONFIG, Customer } from '@/types';
import { customers } from '@/data/mockData';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar, Filter, AlertTriangle, Wrench, XCircle, RotateCcw, ClipboardCheck, ArrowRight } from 'lucide-react';
import { format, addYears } from 'date-fns';
import { he } from 'date-fns/locale';

interface DailySummaryDialogProps {
  open: boolean;
  onClose: () => void;
  jobs: Job[];
  closedJobs: Job[];
  activityLogs: { id: string; customerId: string; jobId?: string; action: string; details: string; timestamp: string }[];
  onConfirmSummary: () => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  filter_replacement: <Filter className="w-4 h-4" />,
  malfunction: <AlertTriangle className="w-4 h-4" />,
  installation: <Wrench className="w-4 h-4" />,
};

export function DailySummaryDialog({ open, onClose, jobs, closedJobs, activityLogs, onConfirmSummary }: DailySummaryDialogProps) {
  const todayStr = new Date().toISOString().split('T')[0];

  const summary = useMemo(() => {
    // Today's logs
    const todayLogs = activityLogs.filter(l => l.timestamp.startsWith(todayStr));

    // Jobs that were completed today (have completionStatus and scheduled today)
    const completedToday = jobs.filter(j =>
      j.scheduledDate === todayStr && j.status === 'completed' && j.completionStatus
    );

    // Jobs closed today (moved to closedJobs today — check logs)
    const closedToday = closedJobs.filter(j => {
      const closeLog = todayLogs.find(l => l.jobId === j.id && l.action === 'סגירת קריאה');
      return !!closeLog;
    });

    // Filter replacements done → show next year date
    const filtersDone = completedToday.filter(j => j.type === 'filter_replacement' && j.completionStatus === 'done');

    // Malfunctions fixed
    const malfunctionsDone = completedToday.filter(j => j.type === 'malfunction' && j.completionStatus === 'done');

    // Installations done
    const installationsDone = completedToday.filter(j => j.type === 'installation' && j.completionStatus === 'done');

    // Not done / need return
    const notCompleted = completedToday.filter(j => j.completionStatus === 'not_done' || j.completionStatus === 'need_return');

    // Assignments made today
    const assignmentLogs = todayLogs.filter(l => l.action === 'שיבוץ');

    return {
      todayLogs,
      completedToday,
      closedToday,
      filtersDone,
      malfunctionsDone,
      installationsDone,
      notCompleted,
      assignmentLogs,
      totalActions: todayLogs.length,
    };
  }, [jobs, closedJobs, activityLogs, todayStr]);

  const getCustomer = (customerId: string): Customer | undefined =>
    customers.find(c => c.id === customerId);

  const getNextYearDate = (job: Job): string => {
    const customer = getCustomer(job.customerId);
    const currentYear = parseInt(job.createdAt.split('-')[0]);
    const month = customer?.filterReplacementMonth || parseInt(job.createdAt.split('-')[1]);
    return `01/${String(month).padStart(2, '0')}/${currentYear + 1}`;
  };

  const todayLabel = format(new Date(), 'EEEE, d בMMMM yyyy', { locale: he });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            סיכום יום עבודה
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{todayLabel}</p>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Stats Overview */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border bg-success/10 border-success/30 p-4 text-center">
              <div className="text-2xl font-bold text-success">{summary.completedToday.filter(j => j.completionStatus === 'done').length}</div>
              <div className="text-xs text-success/80 mt-1">בוצעו בהצלחה</div>
            </div>
            <div className="rounded-xl border bg-warning/10 border-warning/30 p-4 text-center">
              <div className="text-2xl font-bold text-warning">{summary.notCompleted.length}</div>
              <div className="text-xs text-warning/80 mt-1">לא הושלמו</div>
            </div>
            <div className="rounded-xl border bg-primary/10 border-primary/30 p-4 text-center">
              <div className="text-2xl font-bold text-primary">{summary.totalActions}</div>
              <div className="text-xs text-primary/80 mt-1">פעולות היום</div>
            </div>
          </div>

          {/* Filter Replacements Done */}
          {summary.filtersDone.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Filter className="w-4 h-4 text-info" />
                החלפות פילטר שבוצעו
              </h3>
              <div className="space-y-1.5">
                {summary.filtersDone.map(job => {
                  const customer = getCustomer(job.customerId);
                  const nextDate = getNextYearDate(job);
                  return (
                    <div key={job.id} className="flex items-center justify-between p-3 rounded-lg border border-success/30 bg-success/5">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-success" />
                        <div>
                          <p className="text-sm font-medium">{customer?.name}</p>
                          <p className="text-xs text-muted-foreground">{job.location}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs bg-info/10 text-info px-2.5 py-1.5 rounded-lg border border-info/20">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>מתוזמן: {nextDate}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Malfunctions Fixed */}
          {summary.malfunctionsDone.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                תקלות שתוקנו
              </h3>
              <div className="space-y-1.5">
                {summary.malfunctionsDone.map(job => {
                  const customer = getCustomer(job.customerId);
                  return (
                    <div key={job.id} className="flex items-center justify-between p-3 rounded-lg border border-success/30 bg-success/5">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-success" />
                        <div>
                          <p className="text-sm font-medium">{customer?.name}</p>
                          <p className="text-xs text-muted-foreground">{job.completionNotes || job.notes}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-success font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />
                        תוקן — הוסר מרשימת התקלות
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Installations Done */}
          {summary.installationsDone.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Wrench className="w-4 h-4 text-secondary" />
                התקנות שהושלמו
              </h3>
              <div className="space-y-1.5">
                {summary.installationsDone.map(job => {
                  const customer = getCustomer(job.customerId);
                  return (
                    <div key={job.id} className="flex items-center justify-between p-3 rounded-lg border border-success/30 bg-success/5">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-success" />
                        <div>
                          <p className="text-sm font-medium">{customer?.name}</p>
                          <p className="text-xs text-muted-foreground">{job.location}</p>
                        </div>
                      </div>
                      <span className="text-xs text-success font-medium">הושלם</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Not Completed / Need Return */}
          {summary.notCompleted.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <XCircle className="w-4 h-4 text-warning" />
                לא הושלמו
              </h3>
              <div className="space-y-1.5">
                {summary.notCompleted.map(job => {
                  const customer = getCustomer(job.customerId);
                  const isReturn = job.completionStatus === 'need_return';
                  return (
                    <div key={job.id} className={`flex items-center justify-between p-3 rounded-lg border ${isReturn ? 'border-warning/30 bg-warning/5' : 'border-destructive/30 bg-destructive/5'}`}>
                      <div className="flex items-center gap-3">
                        {isReturn ? <RotateCcw className="w-4 h-4 text-warning" /> : <XCircle className="w-4 h-4 text-destructive" />}
                        <div>
                          <p className="text-sm font-medium">{customer?.name}</p>
                          <p className="text-xs text-muted-foreground">{job.completionNotes || job.notes}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        {typeIcons[job.type]}
                        <span>{JOB_TYPE_CONFIG[job.type].label}</span>
                        <span className="mr-2 font-medium">{isReturn ? '↻ צריך לחזור' : '✗ לא בוצע'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Activity Log */}
          {summary.todayLogs.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">יומן פעילות</h3>
              <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-border p-3 bg-muted/30">
                {summary.todayLogs.slice(0, 20).map(log => {
                  const customer = getCustomer(log.customerId);
                  return (
                    <div key={log.id} className="flex items-center gap-2 text-xs text-muted-foreground py-1 border-b border-border/50 last:border-0">
                      <span className="text-[10px] font-mono opacity-60">{log.timestamp.split('T')[1]?.slice(0, 5)}</span>
                      <span className="font-medium text-foreground">{customer?.name}</span>
                      <ArrowRight className="w-3 h-3 opacity-40" />
                      <span>{log.action}: {log.details}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {summary.completedToday.length === 0 && summary.todayLogs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">אין פעילות מתועדת להיום</p>
            </div>
          )}

          {/* Confirm button */}
          <Button
            className="w-full gap-2"
            size="lg"
            onClick={() => {
              onConfirmSummary();
              onClose();
            }}
          >
            <CheckCircle className="w-4 h-4" />
            אישור וסיום יום עבודה
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
