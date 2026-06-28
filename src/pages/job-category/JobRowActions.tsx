import { Customer, Job } from "@/types";
import { Pencil, Trash2 } from "lucide-react";

export function JobRowActions({
  job,
  customer,
  onEditCustomer,
  onDeleteJob,
}: {
  job: Job;
  customer: Customer | undefined;
  onEditCustomer: (customer: Customer) => void;
  onDeleteJob: (job: Job) => void;
}) {
  return (
    <div className='flex items-center gap-1'>
      <button
        onClick={() => customer && onEditCustomer(customer)}
        disabled={!customer}
        className='p-1.5 rounded hover:bg-muted/50 transition-colors disabled:opacity-40'
        aria-label='ערוך לקוח'
        title='ערוך לקוח'>
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
