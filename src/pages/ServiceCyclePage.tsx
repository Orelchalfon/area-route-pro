import { useMemo, useState } from 'react';
import { Customer, Job, JOB_TYPE_CONFIG } from '@/types';
import { customers } from '@/data/mockData';
import { useJobs } from '@/hooks/useJobs';
import { Button } from '@/components/ui/button';
import { CheckCircle, Filter, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const MONTH_NAMES = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

export default function ServiceCyclePage() {
  const { jobs, customersList, completeFilterJob } = useJobs();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Group customers by their filter replacement month
  const customersByMonth = useMemo(() => {
    const grouped: Record<number, Customer[]> = {};
    for (let m = 1; m <= 12; m++) grouped[m] = [];
    customersList.forEach(c => {
      if (c.filterReplacementMonth >= 1 && c.filterReplacementMonth <= 12) {
        grouped[c.filterReplacementMonth].push(c);
      }
    });
    return grouped;
  }, [customersList]);

  // Find filter jobs for the selected year
  const filterJobsByMonth = useMemo(() => {
    const grouped: Record<number, Job[]> = {};
    for (let m = 1; m <= 12; m++) grouped[m] = [];
    jobs
      .filter(j => j.type === 'filter_replacement')
      .forEach(j => {
        const created = new Date(j.createdAt);
        if (created.getFullYear() === selectedYear) {
          const month = created.getMonth() + 1;
          grouped[month].push(j);
        }
      });
    return grouped;
  }, [jobs, selectedYear]);

  // Stats per month
  const monthStats = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const monthCustomers = customersByMonth[month];
      const monthJobs = filterJobsByMonth[month];
      const completed = monthJobs.filter(j => j.status === 'completed').length;
      const total = monthCustomers.length;
      const isPast = selectedYear < currentYear || (selectedYear === currentYear && month < currentMonth);
      const isCurrent = selectedYear === currentYear && month === currentMonth;
      return { month, total, completed, isPast, isCurrent, customers: monthCustomers, jobs: monthJobs };
    });
  }, [customersByMonth, filterJobsByMonth, selectedYear, currentMonth, currentYear]);

  const selectedMonthData = selectedMonth ? monthStats[selectedMonth - 1] : null;

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-primary" />
            מעגל שירות שנתי
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            מעקב אחר החלפת פילטרים — מחזור שנתי לכל לקוח
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setSelectedYear(y => y - 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="font-bold text-lg min-w-[60px] text-center">{selectedYear}</span>
          <Button variant="outline" size="icon" onClick={() => setSelectedYear(y => y + 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Annual circle grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-3">
        {monthStats.map(stat => {
          const pct = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;
          const allDone = stat.total > 0 && stat.completed === stat.total;

          return (
            <button
              key={stat.month}
              onClick={() => setSelectedMonth(stat.month)}
              className={cn(
                'relative flex flex-col items-center p-3 rounded-xl border-2 transition-all hover:shadow-md cursor-pointer',
                stat.isCurrent && 'ring-2 ring-primary ring-offset-2',
                allDone ? 'border-success bg-success/5' :
                  stat.isPast && stat.total > 0 && !allDone ? 'border-warning bg-warning/5' :
                    'border-border bg-card'
              )}
            >
              <span className="text-xs font-medium text-muted-foreground">{MONTH_NAMES[stat.month - 1]}</span>
              
              {/* Circular progress */}
              <div className="relative w-12 h-12 my-2">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    className="stroke-muted"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    className={allDone ? 'stroke-success' : 'stroke-primary'}
                    strokeWidth="3"
                    strokeDasharray={`${pct}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  {allDone ? (
                    <CheckCircle className="w-5 h-5 text-success" />
                  ) : (
                    <span className="text-xs font-bold">{stat.completed}/{stat.total}</span>
                  )}
                </div>
              </div>

              {stat.total > 0 && (
                <span className="text-[10px] text-muted-foreground">{stat.total} לקוחות</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Month detail dialog */}
      <Dialog open={selectedMonth !== null} onOpenChange={() => setSelectedMonth(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" />
              שירות שוטף — {selectedMonth ? MONTH_NAMES[selectedMonth - 1] : ''} {selectedYear}
            </DialogTitle>
          </DialogHeader>

          {selectedMonthData && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
                <span>{selectedMonthData.completed}/{selectedMonthData.total} הושלמו</span>
                <span className="text-muted-foreground">
                  {selectedMonthData.total - selectedMonthData.completed} נותרו
                </span>
              </div>

              <div className="space-y-2">
                {selectedMonthData.customers.map(customer => {
                  const job = selectedMonthData.jobs.find(j => j.customerId === customer.id);
                  const isCompleted = job?.status === 'completed';

                  return (
                    <div
                      key={customer.id}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg border',
                        isCompleted ? 'bg-success/5 border-success/30' : 'bg-card border-border'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {isCompleted && <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />}
                          <span className="font-medium text-sm">{customer.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{customer.address}</p>
                        <p className="text-xs text-muted-foreground">{customer.product}</p>
                      </div>

                      {!isCompleted && job && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs"
                          onClick={() => {
                            completeFilterJob(job.id);
                          }}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          הוחלף
                        </Button>
                      )}
                      {isCompleted && (
                        <span className="text-xs text-success font-medium">✓ הוחלף</span>
                      )}
                    </div>
                  );
                })}

                {selectedMonthData.customers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">אין לקוחות לשירות בחודש זה</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
