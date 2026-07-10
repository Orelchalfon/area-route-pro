import { Job } from "@/types";
import { Pencil, Trash2, Undo2 } from "lucide-react";

export function JobRowActions({
  job,
  onEditJob,
  onDeleteJob,
  onUnassignJob,
}: {
  job: Job;
  onEditJob: (job: Job) => void;
  onDeleteJob: (job: Job) => void;
  onUnassignJob?: (jobId: string) => void;
}) {
  return (
    <div className='flex items-center gap-1'>
      {onUnassignJob && (
        <button
          onClick={() => onUnassignJob(job.id)}
          className='p-1.5 rounded hover:bg-info/10 transition-colors'
          aria-label='החזר לממתינים לשיבוץ'
          title='החזר לממתינים'>
          <Undo2 className='w-3.5 h-3.5 text-info' />
        </button>
      )}
      <button
        onClick={() => onEditJob(job)}
        className='p-1.5 rounded hover:bg-muted/50 transition-colors'
        aria-label='ערוך פנייה'
        title='ערוך פנייה'>
        <Pencil className='w-3.5 h-3.5 text-muted-foreground' />
      </button>
      <button
        onClick={() => onDeleteJob(job)}
        className='p-1.5 rounded hover:bg-destructive/10 transition-colors'
        aria-label='מחק רשומה'
        title='מחק'>
        <Trash2 className='w-3.5 h-3.5 text-destructive' />
      </button>
    </div>
  );
}
