import { format } from "date-fns";
import { he } from "date-fns/locale";
import { ArrowLeftRight, CheckCircle, Lock, Plus, Trash2 } from "lucide-react";
import { DayAreaPicker } from "./DayAreaPicker";
import { DocumentedJobChip } from "./DocumentedJobChip";
import { MiniJobChip } from "./MiniJobChip";
import type { DayCellActions, DayCellData } from "./dayCellTypes";

/**
 * One day of the desktop 7-column board. Purely presentational: props in,
 * callbacks out — no context reads, no state of its own.
 *
 * Extracted verbatim out of MonthlyScheduleBoard's `displayDays.map`; the
 * mobile agenda (MobileDayAgenda) renders the same DayCellData differently.
 */
export function DayCell({
  data,
  isWeekView,
  maxShow,
  otherTechName,
  onOpenDay,
  onAreaChange,
  onAddTask,
  onSwapDay,
  onResetDay,
  onRemoveJob,
  onMoveJobNext,
}: {
  data: DayCellData;
  isWeekView: boolean;
  maxShow: number;
  otherTechName?: string;
} & DayCellActions) {
  const {
    day,
    dateStr,
    isWeekend,
    isToday,
    inCurrentMonth,
    dayLabel,
    dayAreas,
    filterJobs,
    manualJobs,
    documentation,
    totalMinutes,
    totalDayJobs,
    isOpenable,
    isApproved,
    isLocked,
    confirmedCount,
  } = data;

  const openDay = () => {
    if (isWeekend || !inCurrentMonth) return;
    onOpenDay(dateStr);
  };

  return (
    <div
      className={`${isWeekView ? "min-h-[280px]" : "min-h-[130px]"} border-b border-r border-border p-2 transition-colors hover:bg-muted/20 ${
        isOpenable ? "cursor-pointer" : ""
      } ${
        isWeekend ? "bg-muted/30" : ""
      } ${isToday ? "ring-2 ring-inset ring-primary" : ""} ${!inCurrentMonth ? "opacity-40" : ""} ${isApproved ? "bg-success/5" : ""}`}
      onClick={openDay}>
      <div className='flex items-center justify-between mb-1'>
        <div className='flex items-center gap-1'>
          {/* Clicking anywhere on the cell opens the day, but the keyboard
              path is this one button: the cell is a container full of real
              controls (area popover, job chips, the action row), so giving it
              role="button" would nest interactives inside a button and make
              the whole thing a tab stop that swallows them. */}
          {isOpenable ? (
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation();
                openDay();
              }}
              aria-label={`${dayLabel}${isApproved ? " — אושר" : ""}${
                isLocked ? ", נעול" : ""
              } — ${totalDayJobs > 0 ? "פתח אישור לו״ז" : "פתח תיעוד היום"}`}
              className={`rounded text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isToday ? "text-primary font-bold" : "text-card-foreground"}`}>
              {isWeekView ? format(day, "d/M") : day.getDate()}
            </button>
          ) : (
            <span
              className={`text-sm font-medium ${isToday ? "text-primary font-bold" : "text-card-foreground"}`}>
              {isWeekView ? format(day, "d/M") : day.getDate()}
            </span>
          )}
        </div>
        <div className='flex items-center gap-1'>
          {totalMinutes > 0 && !isWeekend && (
            <span className='text-xs text-muted-foreground'>
              {Math.floor(totalMinutes / 60)}:
              {String(totalMinutes % 60).padStart(2, "0")}
            </span>
          )}
          {/* Approved / locked are STATUS, not controls — the actions that
              used to sit here moved to the action row at the bottom of the
              cell and to the approval dialog's menu. The cell's aria-label
              carries the same information for screen readers, so these are
              hidden from them rather than read as stray icons. */}
          {!isWeekend && inCurrentMonth && isApproved && (
            <span
              className='flex items-center'
              title='היום אושר — הודעות נשלחו ללקוחות'>
              <CheckCircle className='w-3 h-3 text-success' aria-hidden='true' />
            </span>
          )}
          {/* How many of the day's customers have confirmed the visit, so days
              still waiting on replies stand out at a glance. */}
          {!isWeekend && inCurrentMonth && totalDayJobs > 0 && isApproved && (
            <span
              className={`text-[10px] font-medium leading-none ${
                confirmedCount === totalDayJobs
                  ? "text-success"
                  : "text-muted-foreground"
              }`}
              title={`${confirmedCount} מתוך ${totalDayJobs} לקוחות אישרו הגעת טכנאי`}>
              ✓{confirmedCount}/{totalDayJobs}
            </span>
          )}
          {/* Locked-day status. Locking blocks the technician's own
              completion-report edits (client-side here and in TechnicianView,
              and enforced in Supabase RLS triggers); it is toggled from the
              approval dialog's menu. */}
          {!isWeekend && inCurrentMonth && isLocked && (
            <span
              className='flex items-center'
              title='היום נעול — הטכנאי לא יכול לערוך'>
              <Lock className='w-3 h-3 text-primary' aria-hidden='true' />
            </span>
          )}
        </div>
      </div>

      {!isWeekend && inCurrentMonth && (
        <div className='mb-0.5'>
          <DayAreaPicker
            dayAreas={dayAreas}
            onAreaChange={(areas) => onAreaChange(dateStr, areas)}
          />
        </div>
      )}

      {!isWeekend && inCurrentMonth && (
        <div className='space-y-1'>
          {filterJobs.slice(0, maxShow).map((job) => (
            <MiniJobChip
              key={job.id}
              job={job}
              isAutoScheduled
              onRemove={() => onRemoveJob(job.id, dateStr, true)}
              onMoveNext={() => onMoveJobNext(job.id, dateStr, true)}
            />
          ))}
          {filterJobs.length > maxShow && (
            <span className='text-xs text-info'>
              +{filterJobs.length - maxShow} שירות
            </span>
          )}
          {manualJobs.slice(0, maxShow).map((job) => (
            <MiniJobChip
              key={job.id}
              job={job}
              onRemove={() => onRemoveJob(job.id, dateStr, false)}
              onMoveNext={() => onMoveJobNext(job.id, dateStr, false)}
            />
          ))}
          {manualJobs.length > maxShow && (
            <span className='text-xs text-muted-foreground'>
              +{manualJobs.length - maxShow} עוד
            </span>
          )}

          {/* Finished visits stay here as documentation, including ones
              whose call was already closed. Read-only and muted so they
              never compete with the day's live work. */}
          {documentation.slice(0, maxShow).map((record) => (
            <DocumentedJobChip key={record.id} record={record} />
          ))}
          {documentation.length > maxShow && (
            <span className='text-xs text-muted-foreground'>
              +{documentation.length - maxShow} תיעוד
            </span>
          )}

          {/* The day's own actions, in one row at a single visual altitude:
              add · swap · reset. Everything else lives in the approval
              dialog's menu, which the cell click opens.
              The two icon buttons are week-view only: a month cell is ~84px of
              content across the 7-column min-w-[700px] grid, and three controls
              would squeeze the add button down to ~20px. In month view they stay
              reachable through that same menu. (On a phone the board switches to
              MobileDayAgenda, where all three are labeled h-11 buttons.) */}
          <div className='mt-1 flex items-stretch gap-1'>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddTask(
                  dateStr,
                  format(new Date(dateStr + "T00:00:00"), "EEEE d/M", {
                    locale: he,
                  }),
                );
              }}
              className='flex-1 text-xs text-muted-foreground flex items-center justify-center gap-0.5 py-1 rounded border border-dashed border-border hover:border-primary/50 hover:text-primary transition-colors'
              title='הוסף משימה'
              aria-label='הוסף משימה'>
              <Plus className='w-3 h-3' />
            </button>
            {/* Swap the whole day with the other technician (this one is sick /
                away). Hidden on a locked day — that day's reporting is final,
                so there is nothing left to trade. */}
            {isWeekView && totalDayJobs > 0 && !isLocked && otherTechName && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSwapDay(dateStr);
                }}
                className='w-7 shrink-0 flex items-center justify-center py-1 rounded border border-dashed border-border text-muted-foreground hover:border-info/50 hover:text-info transition-colors'
                title={`החלף את היום עם ${otherTechName}`}
                aria-label={`החלף את היום עם ${otherTechName}`}>
                <ArrowLeftRight className='w-3 h-3' />
              </button>
            )}
            {/* Reset day — unassign every job on this day back to the pool.
                Destructive, so it sits apart from the add button and is guarded
                by a confirmation dialog. */}
            {isWeekView && totalDayJobs > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onResetDay(dateStr);
                }}
                className='w-7 shrink-0 flex items-center justify-center py-1 rounded border border-dashed border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive transition-colors'
                title='אפס יום — הסר את כל המשימות'
                aria-label='אפס יום — הסר את כל המשימות'>
                <Trash2 className='w-3 h-3' />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
