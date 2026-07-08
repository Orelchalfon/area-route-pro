import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Customer, JobType } from "@/types";
import { Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { CustomerSearchField } from "./CustomerSearchField";

// Per-page request modal. Replaces the old shared tabbed dialog: each page
// (malfunctions / installations) renders its own OpenJobDialog for a single type,
// and the customer is always selected from the existing customer database.
//
// Opening a request only picks a customer (+ optional notes) — it never schedules.
// The job is created unscheduled, so it lands in the "ממתינים לשיבוץ" pool and
// stays OFF the monthly board until the manager adds it there manually.
type OpenJobType = Extract<JobType, "malfunction" | "installation">;

const TYPE_LABELS: Record<
  OpenJobType,
  { trigger: string; title: string; submit: string }
> = {
  malfunction: {
    trigger: "פתח תקלה",
    title: "פתיחת תקלה",
    submit: "שמור תקלה",
  },
  installation: {
    trigger: "פתח התקנה",
    title: "פתיחת התקנה",
    submit: "שמור התקנה",
  },
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
    oneTimeCustomer?: {
      name: string;
      phone: string;
      address: string;
      city: string;
    };
  }) => void;
}

export function OpenJobDialog({ type, customers, onAdd }: OpenJobDialogProps) {
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");
  const [isOneTime, setIsOneTime] = useState(false);
  const [oneTimeName, setOneTimeName] = useState("");
  const [oneTimePhone, setOneTimePhone] = useState("");
  const [oneTimeAddress, setOneTimeAddress] = useState("");
  const [oneTimeCity, setOneTimeCity] = useState("");

  const handlePlaceSelect = useCallback(
    (place: { address: string; city: string }) => {
      setOneTimeAddress(place.address);
      setOneTimeCity(place.city);
    },
    [],
  );

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
    setIsOneTime(false);
    setOneTimeName("");
    setOneTimePhone("");
    setOneTimeAddress("");
    setOneTimeCity("");
  };

  const handleSubmit = () => {
    // Only the customer is required (a real customer, or a name for a one-time
    // non-client request). Scheduling fields are always empty here, so the request
    // is created unscheduled (lands in "ממתינים לשיבוץ", off the board).
    if (isOneTime) {
      if (!oneTimeName.trim()) return;
      onAdd({
        type,
        customerId: "",
        technicianId: "",
        scheduledDate: "",
        scheduledTime: "",
        notes,
        oneTimeCustomer: {
          name: oneTimeName,
          phone: oneTimePhone,
          address: oneTimeAddress,
          city: oneTimeCity,
        },
      });
    } else {
      if (!customerId) return;
      onAdd({
        type,
        customerId,
        technicianId: "",
        scheduledDate: "",
        scheduledTime: "",
        notes,
      });
    }
    setOpen(false);
    resetForm();
  };

  const canSubmit = isOneTime ? !!oneTimeName.trim() : !!customerId;

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
          <label className='flex items-center gap-2 cursor-pointer'>
            <Checkbox
              checked={isOneTime}
              onCheckedChange={(v) => setIsOneTime(v === true)}
            />
            <span className='text-sm'>לקוח חד-פעמי (לא לקוח קבוע)</span>
          </label>

          {isOneTime ? (
            <>
              <div className='space-y-2'>
                <Label>שם</Label>
                <Input
                  value={oneTimeName}
                  onChange={(e) => setOneTimeName(e.target.value)}
                  placeholder='שם מלא'
                />
              </div>
              <div className='space-y-2'>
                <Label>טלפון</Label>
                <Input
                  value={oneTimePhone}
                  onChange={(e) => setOneTimePhone(e.target.value)}
                  placeholder='+972-50-0000000'
                />
              </div>
              <div className='space-y-2'>
                <Label>כתובת</Label>
                <AddressAutocomplete
                  value={oneTimeAddress}
                  onChange={setOneTimeAddress}
                  onPlaceSelect={handlePlaceSelect}
                  placeholder='הקלד כתובת...'
                />
              </div>
            </>
          ) : (
            <CustomerSearchField
              customers={customers}
              customerId={customerId}
              setCustomerId={setCustomerId}
            />
          )}

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

          <Button
            onClick={handleSubmit}
            className='w-full'
            disabled={!canSubmit}>
            {labels.submit}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
