import { cn } from '@/lib/utils';
import { OngoingService } from '@/hooks/useOngoingServices';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { CalendarDays, CheckCircle, Filter } from 'lucide-react';
import { statusClass, statusText } from './status';

const DAY_HEADERS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

export function MonthListView({ services }: { services: OngoingService[] }) {
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
                <span className={cn('text-[11px] rounded-full border px-2 py-0.5 flex items-center gap-1 flex-shrink-0', statusClass(s.is_done))}>
                  {s.is_done && <CheckCircle className="w-3 h-3" />}
                  {statusText(s)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function MonthCalendarView({ services, selectedMonth, selectedYear }: { services: OngoingService[]; selectedMonth: number; selectedYear: number }) {
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
                      className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border truncate', statusClass(s.is_done))}
                      title={`${s.task_description} — ${s.location} — ${statusText(s)}`}
                    >
                      {s.is_done ? <CheckCircle className="w-2.5 h-2.5 flex-shrink-0" /> : <Filter className="w-2.5 h-2.5 flex-shrink-0" />}
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
