import { useMemo, useState } from 'react';
import { Job, JOB_TYPE_CONFIG, Customer, SERVICE_TRACK_CONFIG } from '@/types';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar, CalendarIcon, Filter, AlertTriangle, Wrench, XCircle, RotateCcw, ClipboardCheck, ArrowRight, Printer, ChevronRight, ChevronLeft } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { DailyReportCard } from '@/components/DailyReportCard';
import { ServiceTrackBadge } from '@/components/ServiceTrackBadge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface DailySummaryDialogProps {
  open: boolean;
  onClose: () => void;
  jobs: Job[];
  closedJobs: Job[];
  activityLogs: { id: string; customerId: string; jobId?: string; action: string; details: string; timestamp: string }[];
  onConfirmSummary: (dateStr: string) => void;
  allCustomers?: Customer[];
}

export function DailySummaryDialog({ open, onClose, jobs, closedJobs, activityLogs, onConfirmSummary, allCustomers = [] }: DailySummaryDialogProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

  const summary = useMemo(() => {
    const todayLogs = activityLogs.filter(l => l.timestamp.startsWith(selectedDateStr));
    const completedToday = jobs.filter(j =>
      j.scheduledDate === selectedDateStr && j.status === 'completed' && j.completionStatus
    );
    const filtersDone = completedToday.filter(j => j.type === 'filter_replacement' && j.completionStatus === 'done');
    const malfunctionsDone = completedToday.filter(j => j.type === 'malfunction' && j.completionStatus === 'done');
    const installationsDone = completedToday.filter(j => j.type === 'installation' && j.completionStatus === 'done');
    const notCompleted = completedToday.filter(j => j.completionStatus === 'not_done' || j.completionStatus === 'need_return');

    // Group actions per customer into one summary line
    const customerMap = new Map<string, { customerName: string; actions: string[]; mainIcon: 'close' | 'return' | 'schedule' }>();

    // Also include technician reports as action items
    for (const job of completedToday) {
      const customer = allCustomers.find(c => c.id === job.customerId);
      const name = customer?.name || job.customerId;
      const key = job.customerId;
      if (!customerMap.has(key)) {
        customerMap.set(key, { customerName: name, actions: [], mainIcon: 'close' });
      }
      const entry = customerMap.get(key)!;
      const typeLabel = JOB_TYPE_CONFIG[job.type]?.label || job.type;
      if (job.completionStatus === 'done') {
        entry.actions.push(`${typeLabel} — בוצע`);
        entry.mainIcon = 'close';
      } else if (job.completionStatus === 'not_done') {
        entry.actions.push(`${typeLabel} — לא בוצע`);
        entry.mainIcon = 'return';
      } else if (job.completionStatus === 'need_return') {
        entry.actions.push(`${typeLabel} — צריך לחזור`);
        entry.mainIcon = 'return';
      }
    }

    for (const log of todayLogs) {
      const customer = allCustomers.find(c => c.id === log.customerId);
      const name = customer?.name || log.customerId;
      const key = log.customerId;
      if (!customerMap.has(key)) {
        customerMap.set(key, { customerName: name, actions: [], mainIcon: 'close' });
      }
      const entry = customerMap.get(key)!;
      if (log.action === 'סגירת קריאה') {
        entry.actions.push('נסגרה');
        entry.mainIcon = 'close';
      } else if (log.action === 'החזרת קריאה') {
        entry.actions.push('הוחזרה למאגר');
        entry.mainIcon = 'return';
      } else if (log.action === 'תזמון שירות') {
        entry.actions.push('שובץ לשנה הבאה');
        entry.mainIcon = 'schedule';
      } else if (log.action === 'עדכון מועד') {
        entry.actions.push('מועד שירות עודכן');
        entry.mainIcon = 'schedule';
      }
    }
    const actionItems = Array.from(customerMap.values()).filter(e => e.actions.length > 0);

    return { todayLogs, completedToday, filtersDone, malfunctionsDone, installationsDone, notCompleted, actionItems, totalActions: todayLogs.length };
  }, [jobs, closedJobs, activityLogs, selectedDateStr, allCustomers]);

  const getCustomer = (customerId: string): Customer | undefined =>
    allCustomers.find(c => c.id === customerId);

  const getNextYearDate = (job: Job): string => {
    const customer = getCustomer(job.customerId);
    const currentYear = parseInt(job.createdAt.split('-')[0]);
    const month = customer?.filterReplacementMonth || parseInt(job.createdAt.split('-')[1]);
    return `01/${String(month).padStart(2, '0')}/${currentYear + 1}`;
  };

  const dateLabel = format(selectedDate, 'EEEE, d בMMMM yyyy', { locale: he });

  const handleConfirm = () => {
    onConfirmSummary(selectedDateStr);
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
          <div className="flex items-center gap-2 mt-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="היום הקודם" onClick={() => setSelectedDate(d => subDays(d, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-sm font-normal">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {dateLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <CalendarPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(d)}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="היום הבא" onClick={() => setSelectedDate(d => addDays(d, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Phase 1: Action summary (before confirm) */}
          {!confirmed && (
            <>
              {summary.actionItems.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">פקודות שבוצעו היום ({summary.actionItems.length})</h3>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">#</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">לקוח</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">סיכום</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.actionItems.map((item, i) => (
                          <tr key={i} className="border-b border-border/50 last:border-0">
                            <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                            <td className="py-2 px-3 font-medium">{item.customerName}</td>
                            <td className="py-2 px-3">
                              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                                item.mainIcon === 'close' ? 'bg-success/10 text-success' :
                                item.mainIcon === 'return' ? 'bg-warning/10 text-warning' :
                                'bg-primary/10 text-primary'
                              }`}>
                                {item.mainIcon === 'close' && <CheckCircle className="w-3 h-3" />}
                                {item.mainIcon === 'return' && <RotateCcw className="w-3 h-3" />}
                                {item.mainIcon === 'schedule' && <Calendar className="w-3 h-3" />}
                                {item.actions.join(' → ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">לא בוצעו פקודות היום</p>
                  <p className="text-xs mt-1">סגור או החזר קריאות מתוך תצוגת היום כדי לראות סיכום כאן</p>
                </div>
              )}

              {summary.actionItems.length > 0 && (
                <Button className="w-full gap-2" size="lg" onClick={handleConfirm}>
                  <CheckCircle className="w-4 h-4" />
                  אישור וסיום יום עבודה
                </Button>
              )}
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
