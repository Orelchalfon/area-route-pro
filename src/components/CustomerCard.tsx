import { Customer } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Phone, Mail, MapPin, Package } from 'lucide-react';

interface CustomerCardProps {
  customer: Customer;
}

export function CustomerCard({ customer }: CustomerCardProps) {
  return (
    <Card dir="rtl" className="hover:shadow-md transition-shadow">
      <CardContent className="p-5 space-y-3">
        <h3 className="font-bold text-lg text-foreground">{customer.name}</h3>
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
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            <span>{customer.product}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
