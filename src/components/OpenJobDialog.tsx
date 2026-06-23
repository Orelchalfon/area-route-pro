import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { technicians } from "@/data/mockData";
import { Customer, JobType } from "@/types";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { CustomerSearchField } from "./CustomerSearchField";

// Per-page request modal. Replaces the old shared tabbed NewJobDialog: each page
// (malfunctions / installations) renders its own OpenJobDialog for a single type,
// and the customer is always selected from the existing customer database.
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
  const [technicianId, setTechnicianId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [notes, setNotes] = useState("");

  const labels = TYPE_LABELS[type];

  // date stamp — when the request is opened (Hebrew display, date only)
  const openedDate = useMemo(
    () => new Date().toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem" }),
    // Recompute each time the dialog opens so a stale stamp isn't shown.
    [open],
  );

  const resetForm = () => {
    setCustomerId("");
    setTechnicianId("");
    setScheduledDate("");
    setScheduledTime("");
    setNotes("");
  };

  const handleSubmit = () => {
    // Only the customer is required — leaving technician/date empty creates the
    // request unscheduled (it lands in "ממתינים לשיבוץ", off the board).
    if (!customerId) return;
    onAdd({ type, customerId, technicianId, scheduledDate, scheduledTime, notes });
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
            <Label>טכנאי</Label>
            <Select value={technicianId} onValueChange={setTechnicianId}>
              <SelectTrigger>
                <SelectValue placeholder='בחר טכנאי' />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} - {t.region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-2'>
              <Label>תאריך</Label>
              <Input
                type='date'
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label>שעה</Label>
              <Input
                type='time'
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label>הערות</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder='הערות נוספות...'
            />
          </div>

          {/* date stamp — informs the user which date the request is recorded under */}
          <p className='text-xs text-muted-foreground'>נפתח בתאריך: {openedDate}</p>

          <p className='text-xs text-muted-foreground'>
            השארת טכנאי/תאריך ריקים תשמור את הפנייה ב"ממתינים לשיבוץ" — היא לא תיכנס ללוח עד שתשובץ.
          </p>

          <Button onClick={handleSubmit} className='w-full' disabled={!customerId}>
            {labels.submit}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
