import { TableCell, TableRow } from "@/components/ui/table";
import { formatHebrewDate } from "@/lib/dates";
import { Customer, Job } from "@/types";
import { PriorityBadge, StatusBadge } from "./badges";
import { JobRowActions } from "./JobRowActions";

export function EditableJobRow({
  job,
  customer,
  tech,
  showAssignment,
  onEditJob,
  onDeleteJob,
  onUnassignJob,
}: {
  job: Job;
  customer: Customer | undefined;
  tech: { name: string } | undefined;
  showAssignment?: boolean;
  onEditJob: (job: Job) => void;
  onDeleteJob: (job: Job) => void;
  onUnassignJob?: (jobId: string) => void;
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
        <JobRowActions
          job={job}
          onEditJob={onEditJob}
          onDeleteJob={onDeleteJob}
          onUnassignJob={onUnassignJob}
        />
      </TableCell>
    </TableRow>
  );
}
