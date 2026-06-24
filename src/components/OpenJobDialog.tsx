import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatHebrewDateTime } from "@/lib/dates";
import { Customer, JobType } from "@/types";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { CustomerSearchField } from "./CustomerSearchField";

// Per-page request modal. Replaces the old shared tabbed dialog: each page
// (malfunctions / installations) renders its own OpenJobDialog for a single type,
// and the customer is always selected from the existing customer database.
//
// Opening a request only picks a customer (+ optional notes) — it never schedules.
// The job is created unscheduled, so it lands in the "ממתינים לשיבוץ" pool and
// stays OFF the monthly board until the manager adds it there manually.
type OpenJobType = Extract<JobType, "malfunction" | "installation">;

const TYPE_LABELS: Record<OpenJobType, { trigger: string; title: string; submit: string }> = {
  malfunction: { trigger: "פתח תקלה", title: "פתיחת תקלה", submit: "שמור תקלה" },
  installation: { trigger: "פתח התקנה", title: "פתיחת התקנה", submit: "שמור התקנה" },
};

interface OpenJobDialogProps {
  type: OpenJobType;
  customers: Customer[];
  onAdd: (data: {
    type: JobType;
    customerId: string;
    technicianId: string;
    scheduledDate: string;
    scheduledTime: string;
    notes: string;
  }) => void;
}

export function OpenJobDialog({ type, customers, onAdd }: OpenJobDialogProps) {
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");

  const labels = TYPE_LABELS[type];

  // date stamp — when the request is opened (Hebrew display, date + time).
  // Recomputed each time the dialog opens so a stale stamp isn't shown; matches
  // the value addJob stores on the new job.
  const openedAt = useMemo(
    () => formatHebrewDateTime(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open],
  );

  const resetForm = () => {
    setCustomerId("");
    setNotes("");
  };

  const handleSubmit = () => {
    // Only the customer is required. Scheduling fields are always empty here, so
    // the request is created unscheduled (lands in "ממתינים לשיבוץ", off the board).
    if (!customerId) return;
    onAdd({ type, customerId, technicianId: "", scheduledDate: "", scheduledTime: "", notes });
    setOpen(false);
    resetForm();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}>
      <DialogTrigger asChild>
        <Button className='gap-1.5'>
          <Plus className='w-4 h-4' />
          {labels.trigger}
        </Button>
      </DialogTrigger>
      <DialogContent dir='rtl' className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>בחר לקוח ומלא את הפרטים</DialogDescription>
        </DialogHeader>

        <div className='space-y-4 mt-2'>
          <CustomerSearchField
            customers={customers}
            customerId={customerId}
            setCustomerId={setCustomerId}
          />

          <div className='space-y-2'>
            <Label>הערות</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder='הערות נוספות...'
            />
          </div>

          {/* date stamp — informs the user when the request is recorded */}
          <p className='text-xs text-muted-foreground'>נפתח: {openedAt}</p>

          <p className='text-xs text-muted-foreground'>
            הפנייה תישמר ב"ממתינים לשיבוץ" — שבץ אותה ללוח כשתרצה.
          </p>

          <Button onClick={handleSubmit} className='w-full' disabled={!customerId}>
            {labels.submit}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
