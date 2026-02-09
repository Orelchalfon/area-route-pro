import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { JobType, JOB_TYPE_CONFIG, Customer } from '@/types';
import { technicians } from '@/data/mockData';

interface NewJobDialogProps {
  customers: Customer[];
  onAdd: (data: { type: JobType; customerId: string; technicianId: string; scheduledDate: string; scheduledTime: string; notes: string }) => void;
}

export function NewJobDialog({ customers, onAdd }: NewJobDialogProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<JobType>('filter_replacement');
  const [customerId, setCustomerId] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!customerId || !technicianId || !scheduledDate || !scheduledTime) return;
    onAdd({ type, customerId, technicianId, scheduledDate, scheduledTime, notes });
    setOpen(false);
    setType('filter_replacement');
    setCustomerId('');
    setTechnicianId('');
    setScheduledDate('');
    setScheduledTime('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1.5">
          <Plus className="w-4 h-4" />
          פניה חדשה
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>פניה חדשה</DialogTitle>
          <DialogDescription>מלא את הפרטים ליצירת משימה חדשה</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>סוג פניה</Label>
            <Select value={type} onValueChange={(v) => setType(v as JobType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(JOB_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>לקוח</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="בחר לקוח" /></SelectTrigger>
              <SelectContent>
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name} - {c.city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>טכנאי</Label>
            <Select value={technicianId} onValueChange={setTechnicianId}>
              <SelectTrigger><SelectValue placeholder="בחר טכנאי" /></SelectTrigger>
              <SelectContent>
                {technicians.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name} - {t.region}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>תאריך</Label>
              <Input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>שעה</Label>
              <Input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>הערות</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="הערות נוספות..." />
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={!customerId || !technicianId || !scheduledDate || !scheduledTime}>
            שמור פניה
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
