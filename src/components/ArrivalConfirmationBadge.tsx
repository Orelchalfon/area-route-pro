import { ArrivalState } from '@/hooks/useArrivalConfirmations';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, Circle } from 'lucide-react';

// Read-only indicator of whether the customer agreed to the technician's visit.
// Marking happens in one place only — the day approval dialog — so every other surface
// renders this badge and nothing else.
//
// Each state gets its own icon shape as well as its own color: in a dense stop list, colour
// alone is not a distinction a colourblind user (or a glance) can rely on.
const STATE_STYLES: Record<
  ArrivalState,
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  confirmed: {
    label: 'אושרה הגעת טכנאי',
    className: 'bg-success/10 text-success border-success/30',
    Icon: CheckCircle2,
  },
  stale: {
    label: 'נדרש אישור מחדש',
    className: 'bg-warning/10 text-warning border-warning/30',
    Icon: AlertTriangle,
  },
  none: {
    label: 'ממתין לאישור לקוח',
    className: 'bg-muted/50 text-muted-foreground border-border',
    Icon: Circle,
  },
};

export function ArrivalConfirmationBadge({
  state,
  confirmedTime,
  className,
}: {
  state: ArrivalState;
  // The slot the customer originally agreed to. Only the approval dialog has this to hand;
  // everywhere else a stale badge reads simply "נדרש אישור מחדש".
  confirmedTime?: string;
  className?: string;
}) {
  const { label, className: stateClass, Icon } = STATE_STYLES[state];
  const text =
    state === 'stale' && confirmedTime
      ? `אושר ל-${confirmedTime} · המועד השתנה`
      : label;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-tight',
        stateClass,
        className,
      )}
      title={text}>
      <Icon className='w-3 h-3 shrink-0' />
      <span className='truncate'>{text}</span>
    </span>
  );
}
