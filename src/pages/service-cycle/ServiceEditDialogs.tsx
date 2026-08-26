import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { CustomerEditDialog } from '@/components/CustomerEditDialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OngoingService } from '@/hooks/useOngoingServices';
import { cn } from '@/lib/utils';
import { CompletionStatus, Customer } from '@/types';
import { Pencil, UserCog } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { STATUS_OPTIONS } from './status';

// Shared handler shapes so every consumer (list view, calendar view, search results) passes the
// same thing into the edit modal.
export type ServiceUpdatePatch = {
  task_description?: string;
  location?: string;
  service_date?: string;
  phone?: string;
  completion_status?: CompletionStatus | null;
};
// Resolves to whether the write actually landed, so callers can tell the manager the
// truth instead of toasting success over a rejected UPDATE.
export type UpdateServiceFn = (id: string, patch: ServiceUpdatePatch) => Promise<boolean>;
export type ArchiveServiceFn = (id: string) => Promise<boolean>;
export type UpdateCustomerFn = (customerId: string, data: Partial<Customer>) => void;

// Renders the service edit + customer edit dialogs for a controlled `editing` row. Shared by the
// list, calendar, and search views so they all open the same modal (with an inline status
// selector) and keep the "changed phone syncs back to the linked customer" behavior identical.
export function ServiceEditDialogs({
  editing,
  onCloseEdit,
  onUpdateService,
  onUpdateCustomer,
  customersById,
}: {
  editing: OngoingService | null;
  onCloseEdit: () => void;
  onUpdateService?: UpdateServiceFn;
  onUpdateCustomer?: UpdateCustomerFn;
  customersById?: Map<string, Customer>;
}) {
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const linkedCustomer = editing?.customer_id
    ? customersById?.get(editing.customer_id)
    : undefined;

  return (
    <>
      <ServiceLineEditDialog
        service={editing}
        open={!!editing}
        onOpenChange={(open) => !open && onCloseEdit()}
        onSave={async (patch) => {
          // Close first — the dialog's job is done either way; the outcome arrives as a toast.
          const row = editing;
          onCloseEdit();
          if (!row) return;
          const ok = await onUpdateService?.(row.id, patch);
          if (ok === false) {
            toast.error('שמירת השינויים נכשלה');
            return;
          }
          if (
            linkedCustomer &&
            patch.phone.trim() !== (linkedCustomer.phone || '').trim()
          ) {
            onUpdateCustomer?.(linkedCustomer.id, { phone: patch.phone.trim() });
          }
        }}
        linkedCustomer={linkedCustomer}
        onEditCustomer={(customer) => {
          onCloseEdit();
          setEditingCustomer(customer);
        }}
      />

      <CustomerEditDialog
        customer={editingCustomer}
        open={!!editingCustomer}
        onOpenChange={(open) => !open && setEditingCustomer(null)}
        onUpdate={onUpdateCustomer}
      />
    </>
  );
}

function ServiceLineEditDialog({
  service,
  open,
  onOpenChange,
  onSave,
  linkedCustomer,
  onEditCustomer,
}: {
  service: OngoingService | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (patch: {
    task_description: string;
    location: string;
    service_date: string;
    phone: string;
    completion_status: CompletionStatus | null;
  }) => void;
  linkedCustomer?: Customer;
  onEditCustomer: (customer: Customer) => void;
}) {
  const [form, setForm] = useState<{
    task_description: string;
    location: string;
    service_date: string;
    phone: string;
    completion_status: CompletionStatus | null;
  }>({ task_description: '', location: '', service_date: '', phone: '', completion_status: null });

  useEffect(() => {
    if (service) {
      setForm({
        task_description: service.task_description || '',
        location: service.location || '',
        service_date: service.service_date?.slice(0, 10) || '',
        phone: linkedCustomer?.phone || service.phone || '',
        completion_status: service.completion_status ?? null,
      });
    }
  }, [linkedCustomer?.phone, service]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            עריכת שירות
          </DialogTitle>
          <DialogDescription className="sr-only">עריכת פרטי מחזור השירות של הלקוח.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>תיאור</Label>
            <Input
              value={form.task_description}
              onChange={e => setForm(f => ({ ...f, task_description: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>מיקום</Label>
            <AddressAutocomplete
              value={form.location}
              onChange={val => setForm(f => ({ ...f, location: val }))}
              onPlaceSelect={place => setForm(f => ({ ...f, location: place.address }))}
              placeholder="הקלד כתובת..."
            />
          </div>
          <div className="space-y-2">
            <Label>טלפון</Label>
            <Input
              type="tel"
              dir="ltr"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="מספר טלפון"
            />
          </div>
          <div className="space-y-2">
            <Label>תאריך</Label>
            <Input
              type="date"
              value={form.service_date}
              onChange={e => setForm(f => ({ ...f, service_date: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>סטטוס</Label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={form.completion_status === opt.value}
                  onClick={() => setForm(f => ({ ...f, completion_status: opt.value }))}
                  className={cn(
                    'flex items-center gap-2 rounded-md border px-3 min-h-[40px] text-sm transition-colors cursor-pointer',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                    form.completion_status === opt.value
                      ? 'border-primary bg-primary/10 font-medium'
                      : 'border-border hover:bg-muted/60',
                  )}>
                  <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', opt.dot)} aria-hidden />
                  {opt.label}
                </button>
              ))}
              {form.completion_status && (
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, completion_status: null }))}
                  className={cn(
                    'rounded-md border border-border px-3 min-h-[40px] text-sm text-muted-foreground transition-colors cursor-pointer hover:bg-muted/60',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                  )}>
                  נקה סטטוס
                </button>
              )}
            </div>
          </div>
          {linkedCustomer && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => onEditCustomer(linkedCustomer)}>
              <UserCog className="w-4 h-4" />
              ערוך לקוח — {linkedCustomer.name}
            </Button>
          )}
          <Button
            className="w-full"
            disabled={!form.task_description}
            onClick={() =>
              onSave({
                ...form,
                phone: form.phone.trim(),
                completion_status: form.completion_status,
              })
            }>
            שמור שינויים
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
