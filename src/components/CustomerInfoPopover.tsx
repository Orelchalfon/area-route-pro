import { Customer } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ServiceTrackBadge } from './ServiceTrackBadge';
import { Phone, Mail, MapPin, Package, CalendarClock, StickyNote } from 'lucide-react';

interface CustomerInfoPopoverProps {
  customer: Customer;
  children: React.ReactNode;
}

export function CustomerInfoPopover({ customer, children }: CustomerInfoPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" onClick={(e) => e.stopPropagation()} className="hover:underline cursor-pointer text-inherit font-inherit text-right bg-transparent border-none p-0">
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent dir="rtl" className="w-72 p-4 space-y-3" align="start">
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-base text-foreground">{customer.name}</h4>
          {customer.serviceTrack && <ServiceTrackBadge track={customer.serviceTrack} />}
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
          {customer.email && (
            <a href={`mailto:${customer.email}`} className="flex items-center gap-2 hover:text-primary transition-colors">
              <Mail className="w-4 h-4" />
              <span>{customer.email}</span>
            </a>
          )}
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
      </PopoverContent>
    </Popover>
  );
}
