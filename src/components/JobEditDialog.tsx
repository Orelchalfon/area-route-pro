import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useJobsContext } from '@/contexts/JobsContext';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { geocodeAddress } from '@/lib/geocodeAddress';
import { splitJobNotes } from '@/lib/jobNotes';
import { cn } from '@/lib/utils';
import { Job, JobPriority } from '@/types';
import { Pencil, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

// Edit dialog for a malfunction/installation request row. Unlike CustomerEditDialog
// (which edits a customer record), this edits the JOB itself via `updateJob`, so the
// change persists to the source malfunctions/installations row — the same row the
// monthly board and the technician's נווט button read `location`/`city` from. The
// customer of these jobs is synthetic (db-malf-cust-* / db-inst-cust-*), so routing
// the edit through updateCustomer would never touch the row (see plan/CLAUDE.md).
const PRIORITY_OPTIONS: { value: JobPriority; label: string; dot: string }[] = [
  { value: 'high', label: 'גבוהה', dot: 'bg-destructive' },
  { value: 'medium', label: 'בינונית', dot: 'bg-warning' },
  { value: 'low', label: 'נמוכה', dot: 'bg-info' },
];

interface EditForm {
  location: string;
  city: string;
  phone: string;
  notes: string;
  priority: JobPriority;
  estimatedDuration: number;
}

const EMPTY_FORM: EditForm = {
  location: '',
  city: '',
  phone: '',
  notes: '',
  priority: 'medium',
  estimatedDuration: 0,
};

export function JobEditDialog({
  job,
  open,
  onOpenChange,
}: {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { customersList, updateJob } = useJobsContext();
  const { fetchKey } = useGoogleMapsKey();

  const customer = job
    ? customersList.find((c) => c.id === job.customerId)
    : undefined;

  const [form, setForm] = useState<EditForm>(EMPTY_FORM);
  const [pendingCoords, setPendingCoords] = useState<{
    lat: number;
    lng: number;
    placeId?: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Seed the form to whichever job is being edited. Address/city come from the job
  // row (the source of truth for these synthetic-customer jobs); phone falls back to
  // the derived customer when the row has none.
  useEffect(() => {
    if (job) {
      setForm({
        location: job.location || '',
        city: job.city || '',
        phone: job.phone || customer?.phone || '',
        notes: job.notes || '',
        priority: job.priority,
        estimatedDuration: job.estimatedDuration,
      });
      setPendingCoords(null);
    }
    // customer?.phone intentionally omitted: only re-seed when the job changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job]);

  const handlePlaceSelect = (place: {
    address: string;
    city: string;
    lat: number;
    lng: number;
    placeId: string;
  }) => {
    setForm((f) => ({ ...f, location: place.address, city: place.city }));
    setPendingCoords({ lat: place.lat, lng: place.lng, placeId: place.placeId });
  };

  const handleSave = async () => {
    if (!job || isSaving) return;

    const nextLocation = form.location.trim();
    const nextCity = form.city.trim();
    const hasManualLocationChange =
      !pendingCoords &&
      (nextLocation !== (job.location || '').trim() ||
        nextCity !== (job.city || '').trim());

    const jobData: Partial<
      Pick<Job, 'location' | 'city' | 'phone' | 'notes' | 'priority' | 'estimatedDuration'>
    > & { lat?: number; lng?: number; description?: string } = {
      location: nextLocation,
      city: nextCity,
      phone: form.phone.trim(),
      priority: form.priority,
      estimatedDuration: form.estimatedDuration,
    };

    // The textarea holds the DISPLAY string, which the loaders join from two columns
    // (description/product_type + notes). Writing it back whole would duplicate the
    // description on the next refetch, so split it — and only when it actually changed,
    // to avoid shuffling text between columns on an unrelated save.
    if (form.notes !== (job.notes || '')) {
      const split = splitJobNotes(form.notes);
      jobData.description = split.description;
      jobData.notes = split.notes;
    }

    setIsSaving(true);
    try {
      // Best-effort coords so the map marker moves immediately. The malfunction/
      // installation row only persists a text address (navigation uses that), so this
      // is optimistic UI only — a geocode miss is harmless.
      if (pendingCoords) {
        jobData.lat = pendingCoords.lat;
        jobData.lng = pendingCoords.lng;
      } else if (hasManualLocationChange && (nextLocation || nextCity)) {
        const geocoded = await geocodeAddress(
          [nextLocation, nextCity].filter(Boolean).join(', '),
          await fetchKey(),
        );
        if (geocoded) {
          jobData.lat = geocoded.lat;
          jobData.lng = geocoded.lng;
        }
      }

      updateJob(job.id, jobData);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            עריכת פנייה{customer?.name ? ` — ${customer.name}` : ''}
          </DialogTitle>
          <DialogDescription className="sr-only">עריכת פרטי הפנייה, השיבוץ והמועד.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>טלפון</Label>
            <Input
              type="tel"
              dir="ltr"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="מספר טלפון"
            />
          </div>
          <div className="space-y-2">
            <Label>כתובת</Label>
            <AddressAutocomplete
              value={form.location}
              onChange={(val) => {
                setForm((f) => ({ ...f, location: val }));
                setPendingCoords(null);
              }}
              onPlaceSelect={handlePlaceSelect}
              placeholder="הקלד כתובת..."
            />
          </div>
          <div className="space-y-2">
            <Label>עיר</Label>
            <Input
              value={form.city}
              onChange={(e) => {
                setForm((f) => ({ ...f, city: e.target.value }));
                setPendingCoords(null);
              }}
              placeholder="עיר"
            />
          </div>
          <div className="space-y-2">
            <Label>הערות</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>עדיפות</Label>
            <div className="flex flex-wrap gap-2">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={form.priority === opt.value}
                  onClick={() => setForm((f) => ({ ...f, priority: opt.value }))}
                  className={cn(
                    'flex items-center gap-2 rounded-md border px-3 min-h-[40px] text-sm transition-colors cursor-pointer',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                    form.priority === opt.value
                      ? 'border-primary bg-primary/10 font-medium'
                      : 'border-border hover:bg-muted/60',
                  )}>
                  <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', opt.dot)} aria-hidden />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>משך (דקות)</Label>
            <Input
              type="number"
              value={form.estimatedDuration}
              onChange={(e) =>
                setForm((f) => ({ ...f, estimatedDuration: Number(e.target.value) || 0 }))
              }
              className="w-28"
            />
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="w-full gap-1.5">
            <Save className="w-4 h-4" />
            {isSaving ? 'שומר...' : 'שמור שינויים'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
