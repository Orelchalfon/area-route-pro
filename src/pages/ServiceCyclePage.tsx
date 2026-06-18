import { useMemo, useState } from 'react';
import { useOngoingServices, OngoingService } from '@/hooks/useOngoingServices';
import { Button } from '@/components/ui/button';
import { Filter, ChevronLeft, ChevronRight, RefreshCw, ArrowRight, List, CalendarDays, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, startOfWeek, endOfWeek } from 'date-fns';

const MONTH_NAMES = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];
const DAY_HEADERS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

type ViewMode = 'annual' | 'month-calendar' | 'month-list';

export default function ServiceCyclePage() {
  const { services, loading } = useOngoingServices();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('annual');
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Group services by month
  const servicesByMonth = useMemo(() => {
    const grouped: Record<number, OngoingService[]> = {};
    for (let m = 1; m <= 12; m++) grouped[m] = [];
    services.forEach(s => {
      const d = new Date(s.service_date);
      if (d.getFullYear() === selectedYear) {
        grouped[d.getMonth() + 1].push(s);
      }
    });
    return grouped;
  }, [services, selectedYear]);

  const monthStats = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const items = servicesByMonth[month];
      const isPast = selectedYear < currentYear || (selectedYear === currentYear && month < currentMonth);
      const isCurrent = selectedYear === currentYear && month === currentMonth;
      return { month, total: items.length, isPast, isCurrent, services: items };
    });
  }, [servicesByMonth, selectedYear, currentMonth, currentYear]);

  const goToMonth = (month: number, mode: ViewMode) => {
    setSelectedMonth(month);
    setViewMode(mode);
  };

  if (loading) {
    return (
      <div dir="rtl" className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        <span className="mr-2 text-muted-foreground">טוען נתונים...</span>
      </div>
    );
  }

  // Month detail view (calendar or list)
  if (selectedMonth !== null && viewMode !== 'annual') {
    const stat = monthStats[selectedMonth - 1];

    return (
      <div dir="rtl" className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedMonth(null); setViewMode('annual'); }} className="gap-1">
            <ArrowRight className="w-4 h-4" />
            חזרה
          </Button>
          <h2 className="text-xl font-bold text-foreground">
            <Filter className="w-5 h-5 inline ml-2 text-primary" />
            שירות שוטף — {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
          </h2>
          <span className="text-sm text-muted-foreground">{stat.total} משימות</span>
          <div className="mr-auto flex gap-1">
            <Button
              variant={viewMode === 'month-list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('month-list')}
            >
              <List className="w-4 h-4 ml-1" /> רשימה
            </Button>
            <Button
              variant={viewMode === 'month-calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('month-calendar')}
            >
              <CalendarDays className="w-4 h-4 ml-1" /> לוח שנה
            </Button>
          </div>
        </div>

        {viewMode === 'month-list' ? (
          <MonthListView services={stat.services} />
        ) : (
          <MonthCalendarView services={stat.services} selectedMonth={selectedMonth} selectedYear={selectedYear} />
        )}
      </div>
    );
  }

  // Annual overview
  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-primary" />
            שירות שוטף — מעגל שנתי
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            מעקב אחר שירות שוטף — לחץ על חודש לצפייה בלוח החודשי או ברשימה.
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

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
        {monthStats.map(stat => (
          <div
            key={stat.month}
            className={cn(
              'relative flex flex-col items-center p-4 rounded-xl border-2 transition-all hover:shadow-md cursor-pointer',
              stat.isCurrent && 'ring-2 ring-primary ring-offset-2',
              stat.total === 0 ? 'border-border bg-card opacity-60' : 'border-primary/30 bg-card'
            )}
          >
            <span className="text-sm font-semibold text-foreground">{MONTH_NAMES[stat.month - 1]}</span>
            <span className="text-2xl font-bold text-primary my-2">{stat.total}</span>
            <span className="text-[11px] text-muted-foreground mb-2">משימות</span>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => goToMonth(stat.month, 'month-list')}>
                <List className="w-3 h-3 ml-0.5" /> רשימה
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => goToMonth(stat.month, 'month-calendar')}>
                <CalendarDays className="w-3 h-3 ml-0.5" /> לוח
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="text-sm text-muted-foreground text-center">
        סה״כ {services.filter(s => new Date(s.service_date).getFullYear() === selectedYear).length} משימות בשנת {selectedYear}
      </div>
    </div>
  );
}

function MonthListView({ services }: { services: OngoingService[] }) {
  const sorted = [...services].sort((a, b) => a.service_date.localeCompare(b.service_date));
  if (sorted.length === 0) {
    return <p className="text-muted-foreground text-center py-8">אין משימות בחודש זה.</p>;
  }

  // Group by date
  const byDate: Record<string, OngoingService[]> = {};
  sorted.forEach(s => {
    const key = s.service_date;
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(s);
  });

  return (
    <div className="space-y-4">
      {Object.entries(byDate).map(([dateStr, items]) => (
        <div key={dateStr} className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="bg-muted/40 px-4 py-2 border-b border-border flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">
              {format(new Date(dateStr), 'EEEE, dd/MM/yyyy')}
            </span>
            <span className="text-xs text-muted-foreground mr-auto">{items.length} משימות</span>
          </div>
          <div className="divide-y divide-border">
            {items.map(s => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors">
                <Filter className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium text-foreground flex-1">{s.task_description}</span>
                {s.location && (
                  <span className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-0.5">{s.location}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MonthCalendarView({ services, selectedMonth, selectedYear }: { services: OngoingService[]; selectedMonth: number; selectedYear: number }) {
  const monthDate = new Date(selectedYear, selectedMonth - 1, 1);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const servicesByDate: Record<string, OngoingService[]> = {};
  services.forEach(s => {
    if (!servicesByDate[s.service_date]) servicesByDate[s.service_date] = [];
    servicesByDate[s.service_date].push(s);
  });

  return (
    <div className="bg-card rounded-xl border border-border overflow-x-auto">
      <div className="grid grid-cols-7 border-b border-border min-w-[640px]">
        {DAY_HEADERS.map(d => (
          <div key={d} className="p-2 text-center text-xs font-semibold text-muted-foreground bg-muted/30">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 min-w-[640px]">
        {calDays.map((day, idx) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isCurrentMonth = day.getMonth() === selectedMonth - 1;
          const isWeekend = getDay(day) === 5 || getDay(day) === 6;
          const dayServices = servicesByDate[dateStr] || [];
          const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

          return (
            <div
              key={idx}
              className={cn(
                'min-h-[80px] sm:min-h-[110px] border-b border-r border-border p-1.5 transition-colors',
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
                  {dayServices.slice(0, 4).map(s => (
                    <div
                      key={s.id}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border bg-primary/10 text-primary border-primary/30 truncate"
                      title={`${s.task_description} — ${s.location}`}
                    >
                      <Filter className="w-2.5 h-2.5 flex-shrink-0" />
                      <span className="truncate">{s.task_description}</span>
                    </div>
                  ))}
                  {dayServices.length > 4 && (
                    <span className="text-[9px] text-muted-foreground px-1">+{dayServices.length - 4} עוד</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
