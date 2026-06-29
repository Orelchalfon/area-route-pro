import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface WeekDay {
  date: string;
  label: string;
  shortLabel: string;
  dayNum: string;
  isToday: boolean;
}

export function WeekDaySelector({
  weekDays,
  selectedDay,
  weekOffset,
  getDayJobCount,
  onSelectDay,
  onPrevWeek,
  onNextWeek,
  onResetToToday,
}: {
  weekDays: WeekDay[];
  selectedDay: string;
  weekOffset: number;
  getDayJobCount: (date: string) => number;
  onSelectDay: (date: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onResetToToday: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" className="h-11 w-11 shrink-0" aria-label="השבוע הבא" onClick={onNextWeek}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        <div className="flex gap-1.5 overflow-x-auto pb-1 flex-1">
          {weekDays.map(day => {
            const dayJobCount = getDayJobCount(day.date);
            const isSelected = day.date === selectedDay;
            return (
              <button
                key={day.date}
                onClick={() => onSelectDay(day.date)}
                className={`flex-1 min-w-[60px] rounded-lg p-2 text-center transition-colors border ${
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary'
                    : day.isToday
                    ? 'bg-primary/10 border-primary/30 text-foreground'
                    : 'bg-card border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <div className="text-[11px] font-medium">{day.shortLabel}</div>
                <div className="text-sm font-bold">{day.dayNum}</div>
                {dayJobCount > 0 && (
                  <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {dayJobCount} משימות
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <Button size="icon" variant="ghost" className="h-11 w-11 shrink-0" aria-label="השבוע הקודם" onClick={onPrevWeek}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>
      {weekOffset !== 0 && (
        <Button size="sm" variant="link" className="text-xs text-muted-foreground p-0 h-auto" onClick={onResetToToday}>
          חזור להיום
        </Button>
      )}
    </>
  );
}
