import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus } from 'lucide-react';
import { AddressAutocomplete } from './AddressAutocomplete';

interface NewCustomerDialogProps {
  onAdd: (data: { name: string; phone: string; address: string; city: string; email: string; product: string; lat?: number; lng?: number; placeId?: string }) => void;
}

export function NewCustomerDialog({ onAdd }: NewCustomerDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [product, setProduct] = useState('');
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [placeId, setPlaceId] = useState<string | undefined>();

  const handlePlaceSelect = useCallback((place: { address: string; city: string; lat: number; lng: number; placeId: string }) => {
    setAddress(place.address);
    setCity(place.city);
    setLat(place.lat);
    setLng(place.lng);
    setPlaceId(place.placeId);
  }, []);

  const handleSubmit = () => {
    // Email is the only required field; all other fields are optional.
    if (!email) return;
    onAdd({ name, phone, address, city, email, product, lat, lng, placeId });
    setOpen(false);
    setName(''); setPhone(''); setAddress(''); setCity(''); setEmail(''); setProduct('');
    setLat(undefined); setLng(undefined); setPlaceId(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1.5">
          <UserPlus className="w-4 h-4" />
          לקוח חדש
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>לקוח חדש</DialogTitle>
          <DialogDescription>הזן את פרטי הלקוח החדש</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>שם מלא</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="שם מלא" />
          </div>
          <div className="space-y-2">
            <Label>טלפון</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+972-50-0000000" />
          </div>
          <div className="space-y-2">
            <Label>כתובת</Label>
            <AddressAutocomplete
              value={address}
              onChange={setAddress}
              onPlaceSelect={handlePlaceSelect}
              placeholder="הקלד כתובת..."
            />
            {placeId && (
              <p className="text-xs text-muted-foreground">📍 כתובת מאומתת</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>עיר</Label>
            <Input value={city} onChange={e => setCity(e.target.value)} placeholder="עיר" />
          </div>
          <div className="space-y-2">
            <Label>מייל *</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
          </div>
          <div className="space-y-2">
            <Label>מוצר</Label>
            <Input value={product} onChange={e => setProduct(e.target.value)} placeholder="סוג המוצר" />
          </div>
          <Button onClick={handleSubmit} className="w-full" disabled={!email}>
            הוסף לקוח
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
