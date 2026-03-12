import { useMemo, useState } from 'react';
import { Customer, Job, JOB_TYPE_CONFIG, SERVICE_TRACK_CONFIG } from '@/types';

import { useJobsContext } from '@/contexts/JobsContext';
import { Button } from '@/components/ui/button';
import { CheckCircle, Filter, ChevronLeft, ChevronRight, RefreshCw, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, startOfWeek, endOfWeek } from 'date-fns';
import { he } from 'date-fns/locale';

const MONTH_NAMES = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

const DAY_HEADERS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

export default function ServiceCyclePage() {
  const { jobs, customersList, completeFilterJob } = useJobsContext();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Group customers by the months they actually have service jobs (from ICS)
  const customersByMonth = useMemo(() => {
    const grouped: Record<number, Customer[]> = {};
    for (let m = 1; m <= 12; m++) grouped[m] = [];

    // Build a set of customerIds per month based on actual filter_replacement jobs
    const filterJobs = jobs.filter(j => j.type === 'filter_replacement');
    const customerIdsByMonth: Record<number, Set<string>> = {};
    for (let m = 1; m <= 12; m++) customerIdsByMonth[m] = new Set();

    filterJobs.forEach(j => {
      const dateStr = j.scheduledDate || j.createdAt;
      if (!dateStr) return;
      const jobDate = new Date(dateStr);
      if (jobDate.getFullYear() === selectedYear) {
        customerIdsByMonth[jobDate.getMonth() + 1].add(j.customerId);
      }
    });

    // Also include customers by their filterReplacementMonth if they don't have jobs yet
    customersList.forEach(c => {
      if (c.filterReplacementMonth >= 1 && c.filterReplacementMonth <= 12) {
        customerIdsByMonth[c.filterReplacementMonth].add(c.id);
      }
    });

    // Resolve customer objects
    const customerMap = new Map(customersList.map(c => [c.id, c]));
    for (let m = 1; m <= 12; m++) {
      customerIdsByMonth[m].forEach(id => {
        const c = customerMap.get(id);
        if (c) grouped[m].push(c);
      });
    }

    return grouped;
  }, [customersList, jobs, selectedYear]);

  // Find filter jobs for the selected year
  const filterJobsByMonth = useMemo(() => {
    const grouped: Record<number, Job[]> = {};
    for (let m = 1; m <= 12; m++) grouped[m] = [];
    jobs
      .filter(j => j.type === 'filter_replacement')
      .forEach(j => {
        const dateStr = j.scheduledDate || j.createdAt;
        if (!dateStr) return;
        const jobDate = new Date(dateStr);
        if (jobDate.getFullYear() === selectedYear) {
          const month = jobDate.getMonth() + 1;
          grouped[month].push(j);
        }
      });
    return grouped;
  }, [jobs, selectedYear]);

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

  // Month calendar view
  if (selectedMonth !== null) {
    const stat = monthStats[selectedMonth - 1];
    const monthDate = new Date(selectedYear, selectedMonth - 1, 1);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

    // Distribute customers across working days of the month
    const workingDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
      .filter(d => getDay(d) !== 6 && getDay(d) !== 5); // Exclude Fri+Sat

    // Group customers by city for distribution
    const customersByCity: Record<string, Customer[]> = {};
    stat.customers.forEach(c => {
      if (!customersByCity[c.city]) customersByCity[c.city] = [];
      customersByCity[c.city].push(c);
    });

    // Distribute: 3 per day, grouped by area
    const dayAssignments = new Map<string, { customer: Customer; job?: Job }[]>();
    workingDays.forEach(d => dayAssignments.set(format(d, 'yyyy-MM-dd'), []));
    const dayKeys = workingDays.map(d => format(d, 'yyyy-MM-dd'));
    let dayIdx = 0;
    Object.values(customersByCity).forEach(cityCustomers => {
      for (let i = 0; i < cityCustomers.length; i += 3) {
        if (dayIdx >= dayKeys.length) dayIdx = 0;
        const dateStr = dayKeys[dayIdx];
        const chunk = cityCustomers.slice(i, i + 3);
        const existing = dayAssignments.get(dateStr) || [];
        chunk.forEach(c => {
          const job = stat.jobs.find(j => j.customerId === c.id);
          existing.push({ customer: c, job });
        });
        dayAssignments.set(dateStr, existing);
        dayIdx++;
      }
    });

    return (
      <div dir="rtl" className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedMonth(null)} className="gap-1">
            <ArrowRight className="w-4 h-4" />
            חזרה
          </Button>
          <h2 className="text-xl font-bold text-foreground">
            <Filter className="w-5 h-5 inline ml-2 text-primary" />
            שירות שוטף — {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
          </h2>
          <span className="text-sm text-muted-foreground mr-auto">
            {stat.completed}/{stat.total} הושלמו
          </span>
        </div>

        {/* Calendar grid */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {DAY_HEADERS.map(d => (
              <div key={d} className="p-2 text-center text-xs font-semibold text-muted-foreground bg-muted/30">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calDays.map((day, idx) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isCurrentMonth = day.getMonth() === selectedMonth - 1;
              const isWeekend = getDay(day) === 5 || getDay(day) === 6;
              const dayItems = dayAssignments.get(dateStr) || [];
              const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

              return (
                <div
                  key={idx}
                  className={cn(
                    'min-h-[120px] border-b border-r border-border p-1.5 transition-colors',
                    !isCurrentMonth && 'bg-muted/20 opacity-40',
                    isWeekend && isCurrentMonth && 'bg-muted/10',
                    isToday && 'ring-2 ring-primary ring-inset',
                  )}
                >
                  <div className={cn(
                    'text-xs font-medium mb-1',
                    isToday ? 'text-primary font-bold' : 'text-muted-foreground'
                  )}>
                    {day.getDate()}
                  </div>
                  {isCurrentMonth && !isWeekend && (
                    <div className="space-y-0.5">
                      {dayItems.map(({ customer, job }) => {
                        const isCompleted = job?.status === 'completed';
                        return (
                          <div
                            key={customer.id}
                            className={cn(
                              'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border cursor-pointer group',
                              isCompleted
                                ? 'bg-success/10 text-success border-success/30 line-through'
                                : 'bg-info/10 text-info border-info/30 hover:bg-info/20'
                            )}
                            onClick={() => {
                              if (job && !isCompleted) {
                                completeFilterJob(job.id);
                              }
                            }}
                            title={isCompleted ? 'הוחלף' : 'לחץ לסמן כהוחלף'}
                          >
                            {isCompleted ? (
                              <CheckCircle className="w-2.5 h-2.5 flex-shrink-0" />
                            ) : (
                              <Filter className="w-2.5 h-2.5 flex-shrink-0" />
                            )}
                            <span className="truncate">{customer.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Filter className="w-3 h-3 text-info" /> ממתין להחלפה</span>
          <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-success" /> הוחלף</span>
          <span>לחץ על לקוח לסמן כהוחלף</span>
        </div>
      </div>
    );
  }

  // Annual overview
  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-primary" />
            שירות שוטף — מעגל שנתי
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            מעקב אחר החלפת פילטרים — מחזור שנתי. לחץ על חודש לצפייה בלוח החודשי.
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

      {/* 12-month grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {monthStats.map(stat => {
          const pct = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;
          const allDone = stat.total > 0 && stat.completed === stat.total;

          return (
            <button
              key={stat.month}
              onClick={() => setSelectedMonth(stat.month)}
              className={cn(
                'relative flex flex-col items-center p-4 rounded-xl border-2 transition-all hover:shadow-md cursor-pointer',
                stat.isCurrent && 'ring-2 ring-primary ring-offset-2',
                allDone ? 'border-success bg-success/5' :
                  stat.isPast && stat.total > 0 && !allDone ? 'border-warning bg-warning/5' :
                    'border-border bg-card'
              )}
            >
              <span className="text-sm font-semibold text-foreground">{MONTH_NAMES[stat.month - 1]}</span>
              
              <div className="relative w-14 h-14 my-2">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
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

              <span className="text-[11px] text-muted-foreground">{stat.total} לקוחות</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
