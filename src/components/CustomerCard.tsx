import { memo } from 'react';
import { Customer } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MapPin, Package, History, CalendarClock, StickyNote, Pencil } from 'lucide-react';
import { ServiceTrackBadge } from './ServiceTrackBadge';

interface CustomerCardProps {
  customer: Customer;
  /** Number of activity-log entries, shown as a badge on the history button. */
  logCount?: number;
  onEdit?: (customer: Customer) => void;
  onShowHistory?: (customer: Customer) => void;
}

function CustomerCardComponent({ customer, logCount = 0, onEdit, onShowHistory }: CustomerCardProps) {
  return (
    <Card dir="rtl" className="hover:shadow-md transition-shadow">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg text-foreground">{customer.name}</h3>
            {customer.serviceTrack && <ServiceTrackBadge track={customer.serviceTrack} />}
          </div>
          <div className="flex items-center gap-1">
            {onEdit && (
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" onClick={() => onEdit(customer)}>
                <Pencil className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" onClick={() => onShowHistory?.(customer)}>
              <History className="w-4 h-4 ml-1" />
              <span className="text-xs">היסטוריה</span>
              {logCount > 0 && (
                <span className="mr-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full px-1.5 py-0.5">
                  {logCount}
                </span>
              )}
            </Button>
          </div>
        </div>
        {customer.nextServiceDate && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5">
            <CalendarClock className="w-3.5 h-3.5" />
            <span>שירות הבא: {customer.nextServiceDate}</span>
          </div>
        )}
        <div className="space-y-2 text-sm text-muted-foreground">
          <a href={`tel:${customer.phone}`} className="flex items-center gap-2 hover:text-primary transition-colors">
            <Phone className="w-4 h-4" />
            <span>{customer.phone}</span>
          </a>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{customer.address}, {customer.city}</span>
          </div>
          <a href={`mailto:${customer.email}`} className="flex items-center gap-2 hover:text-primary transition-colors">
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
              <StickyNote className="w-4 h-4 mt-0.5 shrink-0 text-accent" />
              <span className="text-xs leading-relaxed">{customer.notes}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export const CustomerCard = memo(CustomerCardComponent);
