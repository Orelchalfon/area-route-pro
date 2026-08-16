import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CustomerSearchField } from "@/components/CustomerSearchField";
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
import { Textarea } from "@/components/ui/textarea";
import { formatHebrewDateTime } from "@/lib/dates";
import { FOLLOW_UP_OPTIONS, FollowUpOption, monthsLabel } from "@/lib/followUpOptions";
import { cn } from "@/lib/utils";
import { Customer } from "@/types";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

// "פתח קריאת שירות" — the service-cycle counterpart of OpenJobDialog's
// "פתח תקלה" / "פתח התקנה". Several service types can be ticked at once; each becomes its
// own ongoing_services request, all sharing the one date chosen here. Like the other
// request dialogs it never schedules — the calls land in "ממתינים לשיבוץ" and stay off the
// monthly board until the manager puts them there.

const DAY_NAMES = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

// Parse a `yyyy-MM-dd` value as LOCAL midnight. `new Date('2026-09-15')` is UTC midnight,
// which reads back as the previous day east of Greenwich and would misjudge the weekday.
const parseDateInput = (value: string) => new Date(`${value}T00:00:00`);

const isWeekendDate = (value: string) => {
  const day = parseDateInput(value).getDay();
  return day === 5 || day === 6;
};

interface OpenServiceCallDialogProps {
  customers: Customer[];
  /** Pre-filled service date (`yyyy-MM-dd`) — today, or the month being viewed. */
  defaultDate: string;
  onAdd: (data: {
    customerId: string;
    options: FollowUpOption[];
    serviceDate: string;
    notes: string;
  }) => Promise<void>;
}

export function OpenServiceCallDialog({
  customers,
  defaultDate,
  onAdd,
}: OpenServiceCallDialogProps) {
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [serviceDate, setServiceDate] = useState(defaultDate);
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);

  // The default follows the view (annual → today, month view → that month), so reopening
  // the dialog after drilling into a different month doesn't offer a stale date.
  useEffect(() => {
    if (!open) setServiceDate(defaultDate);
  }, [defaultDate, open]);

  // date stamp — when the request is opened. Recomputed each time the dialog opens so a
  // stale stamp isn't shown; matches the value addJob stores on the new job.
  const openedAt = useMemo(
    () => formatHebrewDateTime(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open],
  );

  const isWeekend = !!serviceDate && isWeekendDate(serviceDate);
  const dayName = serviceDate && !Number.isNaN(parseDateInput(serviceDate).getTime())
    ? DAY_NAMES[parseDateInput(serviceDate).getDay()]
    : "";

  const toggleOption = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const resetForm = () => {
    setCustomerId("");
    setServiceDate(defaultDate);
    setSelected([]);
    setNotes("");
  };

  const canSubmit =
    !!customerId && !!serviceDate && !isWeekend && selected.length > 0 && !creating;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setCreating(true);
    try {
      await onAdd({
        customerId,
        options: FOLLOW_UP_OPTIONS.filter((o) => selected.includes(o.id)),
        serviceDate,
        notes,
      });
      setOpen(false);
      resetForm();
    } finally {
      setCreating(false);
    }
  };

  const submitLabel = (() => {
    const when = serviceDate ? ` — ${format(parseDateInput(serviceDate), "dd/MM")}` : "";
    if (selected.length === 0) return "בחר סוגי שירות";
    if (selected.length === 1) return `צור קריאת שירות${when}`;
    return `צור ${selected.length} קריאות שירות${when}`;
  })();

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
          פתח קריאת שירות
        </Button>
      </DialogTrigger>
      {/* The option list scrolls inside its own band so 13 entries don't push the submit
          button off-screen, and the panel itself is capped to the viewport as a backstop
          for short screens (the customer + date + notes fields alone fill a phone). */}
      <DialogContent
        dir='rtl'
        className='sm:max-w-md max-h-[90dvh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>פתיחת קריאות שירות</DialogTitle>
          <DialogDescription>
            בחר לקוח, תאריך וסוגי שירות — כל סוג ייפתח כקריאה נפרדת באותו תאריך
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 mt-2'>
          <CustomerSearchField
            customers={customers}
            customerId={customerId}
            setCustomerId={setCustomerId}
          />

          <div className='space-y-2'>
            <Label htmlFor='service-call-date'>תאריך שירות</Label>
            <div className='flex items-center gap-2'>
              <Input
                id='service-call-date'
                type='date'
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                className='flex-1'
              />
              {dayName && (
                <span className='text-sm text-muted-foreground shrink-0'>
                  יום {dayName}
                </span>
              )}
            </div>
            {isWeekend && (
              <p className='text-xs text-destructive'>
                ימי שישי ושבת אינם ימי עבודה — בחר יום ראשון עד חמישי.
              </p>
            )}
          </div>

          <div className='space-y-2'>
            <Label>סוגי שירות</Label>
            <div className='max-h-48 overflow-y-auto overscroll-contain space-y-2 pl-1'>
              {FOLLOW_UP_OPTIONS.map((option) => (
                <label
                  key={option.id}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-xs",
                    selected.includes(option.id)
                      ? "bg-secondary/10 border-secondary/40 text-secondary"
                      : "bg-card border-border text-foreground hover:bg-muted/50",
                  )}>
                  <Checkbox
                    checked={selected.includes(option.id)}
                    onCheckedChange={() => toggleOption(option.id)}
                  />
                  <div>
                    <span className='font-medium'>{option.label}</span>
                    <span className='text-muted-foreground mr-1'>
                      ({monthsLabel(option.monthsFromNow)})
                    </span>
                  </div>
                </label>
              ))}
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

          {/* date stamp — informs the user when the request is recorded */}
          <p className='text-xs text-muted-foreground'>נפתח: {openedAt}</p>

          <p className='text-xs text-muted-foreground'>
            הפניות יישמרו ב"ממתינים לשיבוץ" — שבץ אותן ללוח כשתרצה.
          </p>

          <Button
            onClick={handleSubmit}
            className='w-full'
            disabled={!canSubmit}>
            {submitLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
