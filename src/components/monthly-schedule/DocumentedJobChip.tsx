import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DayDocumentationRecord } from "@/hooks/useCompletedDayRecords";
import { Check, MapPin, RotateCcw, XCircle } from "lucide-react";
import { typeIcons } from "./constants";

const OUTCOME = {
  done: { label: "בוצע", Icon: Check },
  not_done: { label: "לא בוצע", Icon: XCircle },
  need_return: { label: "צריך לחזור", Icon: RotateCcw },
} as const;

/**
 * A finished visit shown on the board as documentation. Muted and read-only — the work
 * is done, so there is nothing to remove or move; tapping it opens the technician's
 * report, which the board never used to show anywhere.
 *
 * Separate from MiniJobChip because these records outlive the job itself: a closed job
 * is archived out of `jobs`/`customersList`, so the name and address have to come from
 * the record rather than from a customer lookup.
 */
export function DocumentedJobChip({
  record,
}: {
  record: DayDocumentationRecord;
}) {
  const { label, Icon } = OUTCOME[record.completionStatus];
  const address = [record.location, record.city].filter(Boolean).join(", ");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type='button'
          onClick={(e) => e.stopPropagation()}
          className='flex h-6 w-full min-w-0 items-center gap-1.5 overflow-hidden rounded border border-dashed border-border bg-muted/20 px-1.5 text-xs leading-none text-muted-foreground opacity-80 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/50'
          title={`${record.customerName} — ${label}`}>
          <span className='shrink-0 opacity-60 [&_svg]:h-3 [&_svg]:w-3'>
            {typeIcons[record.type]}
          </span>
          <span className='block min-w-0 flex-1 truncate text-start'>
            {record.customerName}
          </span>
          <Icon className='h-3 w-3 shrink-0' aria-label={label} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        dir='rtl'
        align='start'
        className='w-64 p-3 text-start'
        onClick={(e) => e.stopPropagation()}>
        <p className='text-sm font-semibold'>{record.customerName}</p>
        <p className='mt-1 flex items-center gap-1 text-xs text-muted-foreground'>
          <Icon className='h-3.5 w-3.5 shrink-0' />
          {label}
          {record.scheduledTime ? ` · ${record.scheduledTime.slice(0, 5)}` : ""}
        </p>
        {address && (
          <p className='mt-1 flex items-start gap-1 text-xs text-muted-foreground'>
            <MapPin className='mt-0.5 h-3.5 w-3.5 shrink-0' />
            {address}
          </p>
        )}
        <div className='mt-2 border-t border-border pt-2'>
          <p className='text-xs font-medium'>הערות טכנאי:</p>
          <p className='mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground'>
            {record.completionNotes || "לא נרשמו הערות"}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
