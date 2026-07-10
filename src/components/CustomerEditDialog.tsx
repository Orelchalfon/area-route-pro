import { useEffect, useState } from 'react';
import { Customer } from '@/types';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Pencil } from 'lucide-react';

interface CustomerEditDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: (customerId: string, data: Partial<Customer>) => void;
}

const emptyForm = { name: '', phone: '', address: '', city: '', email: '', product: '', notes: '' };

export function CustomerEditDialog({ customer, open, onOpenChange, onUpdate }: CustomerEditDialogProps) {
  const [editData, setEditData] = useState(emptyForm);
  // Coords captured from a Google Places pick. Only sent on save when present, so
  // manual address edits fall through to shouldResetStoredCoords (drops stale coords).
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number; placeId?: string } | null>(null);

  // Sync the single form instance to whichever customer is being edited.
  useEffect(() => {
    if (customer) {
      setEditData({
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        email: customer.email,
        product: customer.product,
        notes: customer.notes || '',
      });
      setPendingCoords(null);
    }
  }, [customer]);

  const handleSave = () => {
    if (customer && onUpdate) {
      onUpdate(customer.id, {
        ...editData,
        ...(pendingCoords
          ? { lat: pendingCoords.lat, lng: pendingCoords.lng, placeId: pendingCoords.placeId }
          : {}),
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            עריכת לקוח — {customer?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>שם מלא</Label>
            <Input value={editData.name} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>טלפון</Label>
            <Input value={editData.phone} onChange={e => setEditData(d => ({ ...d, phone: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>כתובת</Label>
            <AddressAutocomplete
              value={editData.address}
              onChange={val => {
                setEditData(d => ({ ...d, address: val }));
                setPendingCoords(null);
              }}
              onPlaceSelect={place => {
                setEditData(d => ({ ...d, address: place.address, city: place.city }));
                setPendingCoords({ lat: place.lat, lng: place.lng, placeId: place.placeId });
              }}
              placeholder="הקלד כתובת..."
            />
          </div>
          <div className="space-y-2">
            <Label>עיר</Label>
            <Input
              value={editData.city}
              onChange={e => {
                setEditData(d => ({ ...d, city: e.target.value }));
                setPendingCoords(null);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>מייל</Label>
            <Input type="email" value={editData.email} onChange={e => setEditData(d => ({ ...d, email: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>מוצר</Label>
            <Input value={editData.product} onChange={e => setEditData(d => ({ ...d, product: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>הערות</Label>
            <Textarea value={editData.notes} onChange={e => setEditData(d => ({ ...d, notes: e.target.value }))} rows={4} />
          </div>
          <Button onClick={handleSave} className="w-full" disabled={!editData.name || !editData.phone}>
            שמור שינויים
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
