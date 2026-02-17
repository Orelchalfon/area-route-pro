import { useMemo, useState } from 'react';
import { Job, JOB_TYPE_CONFIG, Customer, SERVICE_TRACK_CONFIG } from '@/types';
import { customers } from '@/data/mockData';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar, Filter, AlertTriangle, Wrench, XCircle, RotateCcw, ClipboardCheck, ArrowRight, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { DailyReportCard } from '@/components/DailyReportCard';
import { ServiceTrackBadge } from '@/components/ServiceTrackBadge';

interface DailySummaryDialogProps {
  open: boolean;
  onClose: () => void;
  jobs: Job[];
  closedJobs: Job[];
  activityLogs: { id: string; customerId: string; jobId?: string; action: string; details: string; timestamp: string }[];
  onConfirmSummary: () => void;
  allCustomers?: Customer[];
}

export function DailySummaryDialog({ open, onClose, jobs, closedJobs, activityLogs, onConfirmSummary, allCustomers = [] }: DailySummaryDialogProps) {
  const [confirmed, setConfirmed] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];

  const summary = useMemo(() => {
    const todayLogs = activityLogs.filter(l => l.timestamp.startsWith(todayStr));
    const completedToday = jobs.filter(j =>
      j.scheduledDate === todayStr && j.status === 'completed' && j.completionStatus
    );
    const closedToday = closedJobs.filter(j => {
      const closeLog = todayLogs.find(l => l.jobId === j.id && l.action === 'סגירת קריאה');
      return !!closeLog;
    });
    const filtersDone = completedToday.filter(j => j.type === 'filter_replacement' && j.completionStatus === 'done');
    const malfunctionsDone = completedToday.filter(j => j.type === 'malfunction' && j.completionStatus === 'done');
    const installationsDone = completedToday.filter(j => j.type === 'installation' && j.completionStatus === 'done');
    const notCompleted = completedToday.filter(j => j.completionStatus === 'not_done' || j.completionStatus === 'need_return');
    const assignmentLogs = todayLogs.filter(l => l.action === 'שיבוץ');

    return { todayLogs, completedToday, closedToday, filtersDone, malfunctionsDone, installationsDone, notCompleted, assignmentLogs, totalActions: todayLogs.length };
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

  const handleConfirm = () => {
    onConfirmSummary();
    setConfirmed(true);
  };

  const handleClose = () => {
    setConfirmed(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible print:shadow-none print:border-none" dir="rtl">
        <DialogHeader className="print:mb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ClipboardCheck className="w-5 h-5 text-primary print:hidden" />
            {confirmed ? 'דו״ח פעילות יומי' : 'סיכום יום עבודה'}
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

          {/* Phase 1: Review (before confirm) */}
          {!confirmed && (
            <>
              {/* Completed jobs brief */}
              {summary.completedToday.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">משימות שדווחו היום ({summary.completedToday.length})</h3>
                  <div className="space-y-1.5">
                    {summary.completedToday.map(job => {
                      const customer = getCustomer(job.customerId);
                      const isDone = job.completionStatus === 'done';
                      const isReturn = job.completionStatus === 'need_return';
                      return (
                        <div key={job.id} className={`flex items-center justify-between p-3 rounded-lg border ${isDone ? 'border-success/30 bg-success/5' : isReturn ? 'border-warning/30 bg-warning/5' : 'border-destructive/30 bg-destructive/5'}`}>
                          <div className="flex items-center gap-3">
                            {isDone ? <CheckCircle className="w-4 h-4 text-success" /> : isReturn ? <RotateCcw className="w-4 h-4 text-warning" /> : <XCircle className="w-4 h-4 text-destructive" />}
                            <div>
                              <p className="text-sm font-medium">{customer?.name}</p>
                              <p className="text-xs text-muted-foreground">{JOB_TYPE_CONFIG[job.type].label} — {job.completionNotes || job.notes}</p>
                            </div>
                          </div>
                          <span className="text-xs font-medium">
                            {isDone ? '✓ בוצע' : isReturn ? '↻ צריך לחזור' : '✗ לא בוצע'}
                          </span>
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
              <Button className="w-full gap-2" size="lg" onClick={handleConfirm}>
                <CheckCircle className="w-4 h-4" />
                אישור וסיום יום עבודה
              </Button>
            </>
          )}

          {/* Phase 2: Report (after confirm) */}
          {confirmed && (
            <>
              <div className="flex items-center justify-between print:hidden">
                <h3 className="text-sm font-semibold text-foreground">כרטיסי סיכום ללקוח</h3>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
                  <Printer className="w-3.5 h-3.5" />
                  הדפסה
                </Button>
              </div>

              {/* Per-client report cards */}
              <div className="space-y-3 print:space-y-4">
                {summary.completedToday.map(job => (
                  <DailyReportCard
                    key={job.id}
                    job={job}
                    customer={getCustomer(job.customerId)}
                    nextDate={job.type === 'filter_replacement' && job.completionStatus === 'done' ? getNextYearDate(job) : undefined}
                  />
                ))}
              </div>

              {/* Processing summary */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-primary" />
                  עיבוד שבוצע
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1.5 mr-6 list-disc">
                  {summary.filtersDone.length > 0 && (
                    <li>{summary.filtersDone.length} החלפות פילטר נסגרו — שירות הבא תוזמן לשנה הבאה</li>
                  )}
                  {summary.malfunctionsDone.length > 0 && (
                    <li>{summary.malfunctionsDone.length} תקלות נסגרו והוסרו מהרשימה הפעילה</li>
                  )}
                  {summary.installationsDone.length > 0 && (
                    <li>{summary.installationsDone.length} התקנות הושלמו ונסגרו</li>
                  )}
                  {summary.notCompleted.length > 0 && (
                    <li>{summary.notCompleted.length} משימות הוחזרו למאגר לשיבוץ מחדש</li>
                  )}
                </ul>
              </div>

              {/* Service track recalculation summary */}
              {(() => {
                const trackedCustomers = summary.completedToday
                  .filter(j => j.completionStatus === 'done')
                  .map(j => allCustomers.find(c => c.id === j.customerId))
                  .filter(c => c?.serviceTrack);
                if (trackedCustomers.length === 0) return null;
                return (
                  <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-secondary" />
                      עדכון מועדי שירות חוזרים
                    </h4>
                    <div className="space-y-1.5">
                      {trackedCustomers.map(c => {
                        if (!c?.serviceTrack) return null;
                        const config = SERVICE_TRACK_CONFIG[c.serviceTrack];
                        return (
                          <div key={c.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-card border border-border">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{c.name}</span>
                              <ServiceTrackBadge track={c.serviceTrack} />
                            </div>
                            <span className="text-muted-foreground">
                              שירות הבא: {c.nextServiceDate || `+${config.intervalMonths} חודשים`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <Button variant="outline" className="w-full print:hidden" onClick={handleClose}>
                סגירה
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
