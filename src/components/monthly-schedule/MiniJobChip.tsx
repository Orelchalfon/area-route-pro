import { useJobsContext } from "@/contexts/JobsContext";
import { Job } from "@/types";
import { ArrowLeft, X } from "lucide-react";
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

  return (
    <div
      className={`flex items-center justify-between gap-1.5 px-2 py-1 rounded text-xs border ${chipColor} group relative`}>
      <div className='flex items-center gap-1.5 min-w-0'>
        {typeIcons[job.type]}
        {customer ? (
          <CustomerInfoPopover customer={customer}>
            <span className='truncate max-w-[90px]'>{customer.name}</span>
          </CustomerInfoPopover>
        ) : (
          <span className='truncate max-w-[90px]'>—</span>
        )}
        {isAutoScheduled && !job.completionStatus && (
          <span className='text-[9px] opacity-60'>●</span>
        )}
      </div>
      {job.completionStatus === "done" && <span className='text-[9px]'>✓</span>}
      {job.completionStatus === "not_done" && (
        <span className='text-[9px]'>✗</span>
      )}
      {job.completionStatus === "need_return" && (
        <span className='text-[9px]'>↻</span>
      )}
      <div className='absolute top-0 left-2 h-full flex items-center gap-1 pr-1'>
        {onRemove && !job.completionStatus && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className='opacity-0 group-hover:opacity-100 transition-opacity hover:*:text-destructive'
            title='הסר מהלו״ז'>
            <X className='w-3 h-3' />
          </button>
        )}
        {onMoveNext && !job.completionStatus && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveNext();
            }}
            className='opacity-0 group-hover:opacity-100 transition-opacity  hover:*:text-primary'
            title='העבר ליום הבא'>
            <ArrowLeft className='w-3 h-3' />
          </button>
        )}
      </div>
    </div>
  );
}
