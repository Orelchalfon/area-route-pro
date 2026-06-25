import { TableCell, TableRow } from "@/components/ui/table";
import { formatHebrewDate } from "@/lib/dates";
import { Customer, Job } from "@/types";
import { Pencil, Trash2 } from "lucide-react";
import { PriorityBadge, StatusBadge } from "./badges";

export function EditableJobRow({
  job,
  customer,
  tech,
  showAssignment,
  onEditCustomer,
  onDeleteJob,
}: {
  job: Job;
  customer: Customer | undefined;
  tech: { name: string } | undefined;
  showAssignment?: boolean;
  onEditCustomer: (customer: Customer) => void;
  onDeleteJob: (job: Job) => void;
}) {
  // "Opened on" stamp: prefer the stored Hebrew openedDate, fall back to
  // formatting createdAt for jobs that predate the field (e.g. DB-loaded rows).
  const openedLabel = job.openedDate ?? formatHebrewDate(job.createdAt);

  return (
    <TableRow>
      <TableCell className='font-medium'>
        {customer?.name}
        {openedLabel && (
          <span className='block text-xs font-normal text-muted-foreground'>
            נפתח: {openedLabel}
          </span>
        )}
      </TableCell>
      <TableCell>{job.location}</TableCell>
      <TableCell>
        <PriorityBadge priority={job.priority} />
      </TableCell>
      <TableCell>
        <StatusBadge status={job.status} />
      </TableCell>
      {showAssignment && <TableCell>{tech?.name || "—"}</TableCell>}
      {showAssignment && (
        <TableCell className='whitespace-nowrap'>
          {job.scheduledDate || "—"}
        </TableCell>
      )}
      <TableCell className='max-w-50 truncate'>{job.notes}</TableCell>
      <TableCell>
        <div className='flex items-center gap-1'>
          <button
            onClick={() => customer && onEditCustomer(customer)}
            disabled={!customer}
            className='p-1 rounded hover:bg-muted/50 transition-colors disabled:opacity-40'
            title='ערוך לקוח'>
            <Pencil className='w-3.5 h-3.5 text-muted-foreground' />
          </button>
          <button
            onClick={() => onDeleteJob(job)}
            className='p-1 rounded hover:bg-destructive/10 transition-colors'
            title='מחק'>
            <Trash2 className='w-3.5 h-3.5 text-destructive' />
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
}
