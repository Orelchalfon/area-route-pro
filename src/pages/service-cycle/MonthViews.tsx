import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { CustomerEditDialog } from '@/components/CustomerEditDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OngoingService } from '@/hooks/useOngoingServices';
import { cn } from '@/lib/utils';
import { CompletionStatus, Customer } from '@/types';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { CalendarDays, CheckCircle, Filter, Pencil, Phone, Trash2, UserCog } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { statusClass, statusText } from './status';
import { StatusEditPopover } from './StatusEditPopover';

const DAY_HEADERS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

interface MonthListViewProps {
  services: OngoingService[];
  onUpdateService?: (
    id: string,
    patch: {
      task_description?: string;
      location?: string;
      service_date?: string;
      phone?: string;
      completion_status?: CompletionStatus | null;
    },
  ) => void;
  onArchiveService?: (id: string) => void;
  customersById?: Map<string, Customer>;
  onUpdateCustomer?: (customerId: string, data: Partial<Customer>) => void;
}

export function MonthListView({
  services,
  onUpdateService,
  onArchiveService,
  customersById,
  onUpdateCustomer,
}: MonthListViewProps) {
  const [editing, setEditing] = useState<OngoingService | null>(null);
  const [pendingDelete, setPendingDelete] = useState<OngoingService | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const canManage = !!(onUpdateService || onArchiveService);

  const sorted = [...services].sort((a, b) => a.service_date.localeCompare(b.service_date));
  if (sorted.length === 0) {
    return <p className="text-muted-foreground text-center py-8">אין משימות בחודש זה.</p>;
  }

  // Group by date
  const byDate: Record<string, OngoingService[]> = {};
  sorted.forEach(s => {
    const key = s.service_date;
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(s);
  });

  const confirmDelete = () => {
    if (!pendingDelete) return;
    onArchiveService?.(pendingDelete.id);
    toast.success('הרשומה נמחקה');
    setPendingDelete(null);
  };

  return (
    <div className="space-y-4">
      {Object.entries(byDate).map(([dateStr, items]) => (
        <div key={dateStr} className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="bg-muted/40 px-4 py-2 border-b border-border flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">
              {format(new Date(dateStr), 'EEEE, dd/MM/yyyy')}
            </span>
            <span className="text-xs text-muted-foreground mr-auto">{items.length} משימות</span>
          </div>
          <div className="divide-y divide-border">
            {items.map(s => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors">
                <Filter className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium text-foreground flex-1">{s.task_description}</span>
                {(() => {
                  const phone = s.customer_id
                    ? customersById?.get(s.customer_id)?.phone || s.phone
                    : s.phone;
                  return phone ? (
                    <a
                      href={`tel:${phone}`}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                      title="התקשר">
                      <Phone className="w-3 h-3" />
                      <span dir="ltr">{phone}</span>
                    </a>
                  ) : null;
                })()}
                {s.location && (
                  <span className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-0.5">{s.location}</span>
                )}
                {onUpdateService ? (
                  <StatusEditPopover service={s} onUpdateService={onUpdateService}>
                    <button
                      type="button"
                      title="לחץ לעדכון סטטוס"
                      aria-label={`עדכן סטטוס — ${s.task_description}`}
                      className={cn(
                        'text-[11px] rounded-full border px-2 py-0.5 flex items-center gap-1 flex-shrink-0 cursor-pointer',
                        'hover:opacity-80 motion-safe:active:scale-95 transition-all',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                        statusClass(s),
                      )}>
                      {(s.completion_status === 'done' || s.is_done) && <CheckCircle className="w-3 h-3" />}
                      {statusText(s)}
                    </button>
                  </StatusEditPopover>
                ) : (
                  <span className={cn('text-[11px] rounded-full border px-2 py-0.5 flex items-center gap-1 flex-shrink-0', statusClass(s))}>
                    {(s.completion_status === 'done' || s.is_done) && <CheckCircle className="w-3 h-3" />}
                    {statusText(s)}
                  </span>
                )}
                {canManage && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {onUpdateService && (
                      <button
                        onClick={() => setEditing(s)}
                        className="p-1 rounded hover:bg-muted/50 transition-colors"
                        title="ערוך">
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    )}
                    {onArchiveService && (
                      <button
                        onClick={() => setPendingDelete(s)}
                        className="p-1 rounded hover:bg-destructive/10 transition-colors"
                        title="מחק">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <ServiceLineEditDialog
        service={editing}
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onSave={(patch) => {
          if (editing) {
            onUpdateService?.(editing.id, patch);
            const linkedCustomer = editing.customer_id
              ? customersById?.get(editing.customer_id)
              : undefined;
            if (
              linkedCustomer &&
              patch.phone.trim() !== (linkedCustomer.phone || "").trim()
            ) {
              onUpdateCustomer?.(linkedCustomer.id, { phone: patch.phone.trim() });
            }
          }
          setEditing(null);
        }}
        linkedCustomer={
          editing?.customer_id ? customersById?.get(editing.customer_id) : undefined
        }
        onEditCustomer={(customer) => {
          setEditing(null);
          setEditingCustomer(customer);
        }}
      />

      <CustomerEditDialog
        customer={editingCustomer}
        open={!!editingCustomer}
        onOpenChange={(open) => !open && setEditingCustomer(null)}
        onUpdate={onUpdateCustomer}
      />

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">מחיקת רשומה</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              האם למחוק את "{pendingDelete?.task_description}"? הרשומה תוסתר מהרשימה.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
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
  onSave: (patch: { task_description: string; location: string; service_date: string; phone: string }) => void;
  linkedCustomer?: Customer;
  onEditCustomer: (customer: Customer) => void;
}) {
  const [form, setForm] = useState({ task_description: '', location: '', service_date: '', phone: '' });

  useEffect(() => {
    if (service) {
      setForm({
        task_description: service.task_description || '',
        location: service.location || '',
        service_date: service.service_date?.slice(0, 10) || '',
        phone: linkedCustomer?.phone || service.phone || '',
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
            <Input
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
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
              })
            }>
            שמור שינויים
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// One service inside a calendar day cell. Editable (opens the status popover) when
// an update handler is provided; otherwise a plain read-only chip.
function CalendarServiceChip({
  service: s,
  onUpdateService,
}: {
  service: OngoingService;
  onUpdateService?: MonthListViewProps['onUpdateService'];
}) {
  const isDone = s.completion_status === 'done' || s.is_done;
  const title = `${s.task_description} — ${s.location}${s.phone ? ` — ${s.phone}` : ''} — ${statusText(s)}`;
  const base = cn(
    'flex items-center gap-1 px-1.5 min-h-[22px] w-full rounded text-[10px] border truncate',
    statusClass(s),
  );
  const inner = (
    <>
      {isDone ? (
        <CheckCircle className="w-2.5 h-2.5 flex-shrink-0" />
      ) : (
        <Filter className="w-2.5 h-2.5 flex-shrink-0" />
      )}
      <span className="truncate">{s.task_description}</span>
    </>
  );

  if (!onUpdateService) {
    return (
      <div className={base} title={title}>
        {inner}
      </div>
    );
  }

  return (
    <StatusEditPopover service={s} onUpdateService={onUpdateService} align="start">
      <button
        type="button"
        title={title}
        aria-label={`עדכן סטטוס — ${s.task_description}`}
        className={cn(
          base,
          'cursor-pointer text-right hover:brightness-95 motion-safe:active:scale-[0.98] transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
        )}>
        {inner}
      </button>
    </StatusEditPopover>
  );
}

export function MonthCalendarView({
  services,
  selectedMonth,
  selectedYear,
  onUpdateService,
}: {
  services: OngoingService[];
  selectedMonth: number;
  selectedYear: number;
  onUpdateService?: MonthListViewProps['onUpdateService'];
}) {
  // Days with more than 4 services collapse to keep the grid compact; the manager can
  // expand a day inline so every service stays reachable/editable.
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const toggleExpand = (dateStr: string) =>
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });

  const monthDate = new Date(selectedYear, selectedMonth - 1, 1);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const servicesByDate: Record<string, OngoingService[]> = {};
  services.forEach(s => {
    if (!servicesByDate[s.service_date]) servicesByDate[s.service_date] = [];
    servicesByDate[s.service_date].push(s);
  });

  return (
    <div className="bg-card rounded-xl border border-border overflow-x-auto">
      <div className="grid grid-cols-7 border-b border-border min-w-[640px]">
        {DAY_HEADERS.map(d => (
          <div key={d} className="p-2 text-center text-xs font-semibold text-muted-foreground bg-muted/30">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 min-w-[640px]">
        {calDays.map((day, idx) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isCurrentMonth = day.getMonth() === selectedMonth - 1;
          const isWeekend = getDay(day) === 5 || getDay(day) === 6;
          const dayServices = servicesByDate[dateStr] || [];
          const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
          const isExpanded = expandedDays.has(dateStr);
          const visibleServices = isExpanded ? dayServices : dayServices.slice(0, 4);

          return (
            <div
              key={idx}
              className={cn(
                'min-h-[80px] sm:min-h-[110px] border-b border-r border-border p-1.5 transition-colors',
                !isCurrentMonth && 'bg-muted/20 opacity-40',
                isWeekend && isCurrentMonth && 'bg-muted/10',
                isToday && 'ring-2 ring-primary ring-inset',
              )}
            >
              <div className={cn(
                'text-xs font-medium mb-1',
                isToday ? 'text-primary font-bold' : 'text-muted-foreground'
              )}>
                {day.getDate()}
              </div>
              {isCurrentMonth && !isWeekend && (
                <div className="space-y-0.5">
                  {visibleServices.map(s => (
                    <CalendarServiceChip
                      key={s.id}
                      service={s}
                      onUpdateService={onUpdateService}
                    />
                  ))}
                  {dayServices.length > 4 && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(dateStr)}
                      aria-expanded={isExpanded}
                      className="w-full text-[9px] text-muted-foreground hover:text-foreground px-1 py-0.5 rounded text-right cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                      {isExpanded ? 'הצג פחות' : `+${dayServices.length - 4} עוד`}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
