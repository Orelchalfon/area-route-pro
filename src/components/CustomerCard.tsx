import { useState } from 'react';
import { Customer, ActivityLog } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Phone, Mail, MapPin, Package, History, CalendarClock, StickyNote, Pencil } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ServiceTrackBadge } from './ServiceTrackBadge';

interface CustomerCardProps {
  customer: Customer;
  logs?: ActivityLog[];
  onUpdate?: (customerId: string, data: Partial<Customer>) => void;
}

export function CustomerCard({ customer, logs = [], onUpdate }: CustomerCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState({
    name: customer.name,
    phone: customer.phone,
    address: customer.address,
    city: customer.city,
    email: customer.email,
    product: customer.product,
    notes: customer.notes || '',
  });

  const openEdit = () => {
    setEditData({
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      email: customer.email,
      product: customer.product,
      notes: customer.notes || '',
    });
    setShowEdit(true);
  };

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(customer.id, editData);
    }
    setShowEdit(false);
  };

  return (
    <>
      <Card dir="rtl" className="hover:shadow-md transition-shadow">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-foreground">{customer.name}</h3>
              {customer.serviceTrack && <ServiceTrackBadge track={customer.serviceTrack} />}
            </div>
            <div className="flex items-center gap-1">
              {onUpdate && (
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" onClick={openEdit}>
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" onClick={() => setShowHistory(true)}>
                <History className="w-4 h-4 ml-1" />
                <span className="text-xs">היסטוריה</span>
                {logs.length > 0 && (
                  <span className="mr-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full px-1.5 py-0.5">
                    {logs.length}
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

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              עריכת לקוח — {customer.name}
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
              <Input value={editData.address} onChange={e => setEditData(d => ({ ...d, address: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>עיר</Label>
              <Input value={editData.city} onChange={e => setEditData(d => ({ ...d, city: e.target.value }))} />
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

      {/* History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              היסטוריה — {customer.name}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">אין פעולות מתועדות עדיין</p>
            ) : (
              <div className="space-y-3">
                {logs.map(log => (
                  <div key={log.id} className="border border-border rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">{log.action}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(log.timestamp).toLocaleDateString('he-IL')} {new Date(log.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{log.details}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
