import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatHebrewDate } from "@/lib/dates";
import { Customer, Job } from "@/types";
import { Pencil, Save, X } from "lucide-react";
import { useState } from "react";
import { PriorityBadge, StatusBadge } from "./badges";

export interface EditForm {
  location: string;
  city: string;
  notes: string;
  priority: string;
}

export function EditableJobRow({
  job,
  customer,
  tech,
  showAssignment,
  editingId,
  onStartEdit,
  onCancelEdit,
  onSave,
}: {
  job: Job;
  customer: Customer | undefined;
  tech: { name: string } | undefined;
  showAssignment?: boolean;
  editingId: string | null;
  onStartEdit: (id: string) => void;
  onCancelEdit: () => void;
  onSave: (jobId: string, customerId: string, data: EditForm) => void;
}) {
  const isEditing = editingId === job.id;
  const [form, setForm] = useState<EditForm>({
    location: job.location || customer?.address || "",
    city: job.city || customer?.city || "",
    notes: job.notes || "",
    priority: job.priority || "low",
  });

  const handleStartEdit = () => {
    setForm({
      location: job.location || customer?.address || "",
      city: job.city || customer?.city || "",
      notes: job.notes || "",
      priority: job.priority || "low",
    });
    onStartEdit(job.id);
  };

  if (isEditing) {
    return (
      <TableRow className='bg-primary/5'>
        <TableCell className='font-medium'>{customer?.name}</TableCell>
        <TableCell>
          <Input
            value={form.location}
            onChange={(e) =>
              setForm((f) => ({ ...f, location: e.target.value }))
            }
            className='h-7 text-xs'
            placeholder='כתובת'
          />
          <Input
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            className='h-7 text-xs mt-1'
            placeholder='עיר'
          />
        </TableCell>
        <TableCell>
          <Select
            value={form.priority}
            onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
            <SelectTrigger className='h-7 text-xs w-24'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='high'>גבוהה</SelectItem>
              <SelectItem value='medium'>בינונית</SelectItem>
              <SelectItem value='low'>נמוכה</SelectItem>
            </SelectContent>
          </Select>
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
        <TableCell>
          <Input
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className='h-7 text-xs'
            placeholder='הערות'
          />
        </TableCell>
        <TableCell>
          <div className='flex gap-1'>
            <Button
              size='sm'
              className='h-6 px-2 text-xs gap-1'
              onClick={() => customer && onSave(job.id, customer.id, form)}>
              <Save className='w-3 h-3' /> שמור
            </Button>
            <Button
              size='sm'
              variant='ghost'
              className='h-6 px-2 text-xs'
              onClick={onCancelEdit}>
              <X className='w-3 h-3' />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

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
        <button
          onClick={handleStartEdit}
          className='p-1 rounded hover:bg-muted/50 transition-colors'
          title='ערוך'>
          <Pencil className='w-3.5 h-3.5 text-muted-foreground' />
        </button>
      </TableCell>
    </TableRow>
  );
}
