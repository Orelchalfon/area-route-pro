import { Customer, SERVICE_TRACK_CONFIG } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NOT_SET, filterMonthLabel, hasExactLocation } from '@/lib/customerDisplay';
import { areaForCity } from '@/lib/areas';
import { ServiceTrackBadge } from './ServiceTrackBadge';
import { User } from 'lucide-react';

interface CustomerDetailsDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Read-only view of the whole customer record, opened by clicking a card. The card itself only
// has room for part of the record — the filter-replacement month, the service track's meaning and
// whether an exact map location was captured never fit on it. Editing stays in CustomerEditDialog.

/** One label/value row. Empty values render "—" so a blank cell is never ambiguous. */
function Field({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-foreground text-end break-words">{children || '—'}</span>
    </div>
  );
}

export function CustomerDetailsDialog({ customer, open, onOpenChange }: CustomerDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            פרטי לקוח — {customer?.name}
          </DialogTitle>
        </DialogHeader>

        {customer && (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pe-2">
              {customer.serviceTrack && (
                <div className="flex items-center gap-2">
                  <ServiceTrackBadge track={customer.serviceTrack} />
                </div>
              )}

              <div>
                <Field label="טלפון">
                  {customer.phone && (
                    <a href={`tel:${customer.phone}`} className="hover:text-primary transition-colors" dir="ltr">
                      {customer.phone}
                    </a>
                  )}
                </Field>
                <Field label="כתובת">
                  {[customer.address, customer.city].filter(Boolean).join(', ')}
                </Field>
                {/* Derived from the city, never from a stored region column — see areas.ts. */}
                <Field label="אזור">{areaForCity(customer.city)}</Field>
                <Field label="מייל">
                  {customer.email && (
                    <a href={`mailto:${customer.email}`} className="hover:text-primary transition-colors" dir="ltr">
                      {customer.email}
                    </a>
                  )}
                </Field>
                <Field label="מוצר">{customer.product}</Field>
                <Field label="חודש החלפה">{filterMonthLabel(customer.filterReplacementMonth)}</Field>
                <Field label="מסלול שירות">
                  {customer.serviceTrack ? SERVICE_TRACK_CONFIG[customer.serviceTrack].label : NOT_SET}
                </Field>
                <Field label="שירות הבא">{customer.nextServiceDate}</Field>
                {/* Without coordinates the route planner falls back to a city-centre estimate,
                    so this is the difference between an accurate route and a rough one. */}
                <Field label="מיקום">
                  {hasExactLocation(customer)
                    ? 'נשמר מיקום מדויק'
                    : 'אין מיקום מדויק — ימוקם לפי העיר'}
                </Field>
              </div>

              {/* Longest field, so it gets its own block rather than a label/value row. */}
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">הערות</span>
                <p className="text-sm leading-relaxed bg-muted/50 rounded-md px-3 py-2 whitespace-pre-wrap">
                  {customer.notes || 'אין הערות'}
                </p>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
