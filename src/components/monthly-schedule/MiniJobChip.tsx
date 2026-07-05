import { useJobsContext } from "@/contexts/JobsContext";
import { Job } from "@/types";
import { ArrowLeft, Check, RotateCcw, X, XCircle } from "lucide-react";
import { CustomerInfoPopover } from "../CustomerInfoPopover";
import { typeIcons } from "./constants";

export function MiniJobChip({
  job,
  onRemove,
  onMoveNext,
  isAutoScheduled,
}: {
  job: Job;
  onRemove?: () => void;
  onMoveNext?: () => void;
  isAutoScheduled?: boolean;
}) {
  const { customersList } = useJobsContext();
  const customer = customersList.find((c) => c.id === job.customerId);

  // Only color chips that have a completion status from technician
  const completionColorMap: Record<string, string> = {
    done: "bg-success/20 text-success border-success/40",
    not_done: "bg-destructive/20 text-destructive border-destructive/40",
    need_return: "bg-warning/20 text-warning border-warning/40",
  };
  // Neutral default for jobs not yet reported by technician
  const chipColor = job.completionStatus
    ? completionColorMap[job.completionStatus]
    : "bg-muted/30 text-muted-foreground border-border";
  const customerName = customer?.name || "—";

  return (
    <div
      className={`group flex h-6 w-full min-w-0 items-center gap-1.5 overflow-hidden rounded border px-1.5 text-xs leading-none ${chipColor}`}
      title={customerName}>
      <div className='flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden whitespace-nowrap'>
        <span className='shrink-0 [&_svg]:h-3 [&_svg]:w-3'>{typeIcons[job.type]}</span>
        {customer ? (
          <CustomerInfoPopover customer={customer}>
            <span className='block min-w-0 flex-1 truncate font-medium'>
              {customer.name}
            </span>
          </CustomerInfoPopover>
        ) : (
          <span className='block min-w-0 flex-1 truncate font-medium'>—</span>
        )}
        {isAutoScheduled && !job.completionStatus && (
          <span
            className='h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-50'
            aria-label='שובץ אוטומטית'
          />
        )}
      </div>

      {job.completionStatus === "done" && (
        <Check className='h-3 w-3 shrink-0' aria-label='בוצע' />
      )}
      {job.completionStatus === "not_done" && (
        <XCircle className='h-3 w-3 shrink-0' aria-label='לא בוצע' />
      )}
      {job.completionStatus === "need_return" && (
        <RotateCcw className='h-3 w-3 shrink-0' aria-label='צריך לחזור' />
      )}

      <div className='flex h-full w-9 shrink-0 items-center justify-end gap-0.5'>
        {onRemove && !job.completionStatus && (
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className='flex h-5 w-4 items-center justify-center rounded opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-destructive/50'
            aria-label='הסר מהלו״ז'
            title='הסר מהלו״ז'>
            <X className='w-3 h-3' />
          </button>
        )}
        {onMoveNext && !job.completionStatus && (
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation();
              onMoveNext();
            }}
            className='flex h-5 w-4 items-center justify-center rounded opacity-0 transition-opacity hover:bg-primary/10 hover:text-primary group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-primary/50'
            aria-label='העבר ליום הבא'
            title='העבר ליום הבא'>
            <ArrowLeft className='w-3 h-3' />
          </button>
        )}
      </div>
    </div>
  );
}
