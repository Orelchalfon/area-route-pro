import { memo } from 'react';
import { Customer } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MapPin, Package, History, CalendarClock, StickyNote, Pencil, Trash2, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ServiceTrackBadge } from './ServiceTrackBadge';

interface CustomerCardProps {
  customer: Customer;
  onEdit?: (customer: Customer) => void;
  onShowHistory?: (customer: Customer) => void;
  /** Opens the read-only full-record dialog. When given, the whole card becomes clickable. */
  onShowDetails?: (customer: Customer) => void;
  /** Soft-delete (archive) this customer. The caller owns the confirm dialog. */
  onDelete?: (customer: Customer) => void;
  /** Bring a soft-deleted customer back. Shown instead of delete in the "מחוקים" view. */
  onRestore?: (customer: Customer) => void;
}

function CustomerCardComponent({
  customer,
  onEdit,
  onShowHistory,
  onShowDetails,
  onDelete,
  onRestore,
}: CustomerCardProps) {
  // Everything interactive inside the card stops propagation, so the buttons and the tel:/mailto:
  // links keep doing only their own job instead of also opening the details dialog.
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <Card
      dir="rtl"
      className={cn('hover:shadow-md transition-shadow', onShowDetails && 'cursor-pointer')}
      {...(onShowDetails && {
        role: 'button',
        tabIndex: 0,
        'aria-label': `פרטי הלקוח ${customer.name}`,
        onClick: () => onShowDetails(customer),
        onKeyDown: (e: React.KeyboardEvent) => {
          // Keydown bubbles independently of click, so stopping propagation on the child
          // buttons/links is not enough: Enter on the pencil would fire the button AND
          // this handler, opening two dialogs at once. Only act when the card itself is
          // the focused element.
          if (e.target !== e.currentTarget) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onShowDetails(customer);
          }
        },
      })}
    >
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg text-foreground">{customer.name}</h3>
            {customer.serviceTrack && <ServiceTrackBadge track={customer.serviceTrack} />}
          </div>
          <div className="flex items-center gap-1">
            {onEdit && (
              <Button variant="ghost" size="sm" aria-label="עריכה" className="text-muted-foreground hover:text-primary" onClick={(e) => { stop(e); onEdit(customer); }}>
                <Pencil className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" onClick={(e) => { stop(e); onShowHistory?.(customer); }}>
              <History className="w-4 h-4 me-1" />
              <span className="text-xs">היסטוריה</span>
            </Button>
            {onRestore && (
              <Button variant="ghost" size="sm" aria-label={`שחזור ${customer.name}`} className="text-muted-foreground hover:text-primary" onClick={(e) => { stop(e); onRestore(customer); }}>
                <Undo2 className="w-4 h-4" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="sm" aria-label={`מחיקת ${customer.name}`} className="text-muted-foreground hover:text-destructive" onClick={(e) => { stop(e); onDelete(customer); }}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        {customer.nextServiceDate && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5">
            <CalendarClock className="w-3.5 h-3.5" />
            <span>שירות הבא: {customer.nextServiceDate}</span>
          </div>
        )}
        <div className="space-y-2 text-sm text-muted-foreground">
          <a href={`tel:${customer.phone}`} onClick={stop} className="flex items-center gap-2 hover:text-primary transition-colors">
            <Phone className="w-4 h-4" />
            <span>{customer.phone}</span>
          </a>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{customer.address}, {customer.city}</span>
          </div>
          <a href={`mailto:${customer.email}`} onClick={stop} className="flex items-center gap-2 hover:text-primary transition-colors">
            <Mail className="w-4 h-4" />
            <span>{customer.email}</span>
          </a>
          {customer.product && (
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span>{customer.product}</span>
            </div>
          )}
          {customer.notes && (
            <div className="flex items-start gap-2 bg-muted/50 rounded-md px-2 py-1.5">
              <StickyNote className="w-4 h-4 mt-0.5 shrink-0 text-accent-strong" />
              <span className="text-xs leading-relaxed">{customer.notes}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export const CustomerCard = memo(CustomerCardComponent);
