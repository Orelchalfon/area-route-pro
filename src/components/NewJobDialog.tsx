import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JobType, Customer } from '@/types';
import { technicians } from '@/data/mockData';

interface NewJobDialogProps {
  customers: Customer[];
  onAdd: (data: { type: JobType; customerId: string; technicianId: string; scheduledDate: string; scheduledTime: string; notes: string }) => void;
}

function CustomerSearchField({ customers, customerId, setCustomerId }: { customers: Customer[]; customerId: string; setCustomerId: (id: string) => void }) {
  const [customerOpen, setCustomerOpen] = useState(false);
  const selectedCustomer = customers.find(c => c.id === customerId);

  return (
    <div className="space-y-2">
      <Label>לקוח</Label>
      <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={customerOpen} className="w-full justify-between font-normal">
            {selectedCustomer ? `${selectedCustomer.name} - ${selectedCustomer.city}` : 'חפש ובחר לקוח...'}
            <ChevronsUpDown className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command dir="rtl">
            <CommandInput placeholder="חפש לפי שם, טלפון, עיר..." />
            <CommandList>
              <CommandEmpty>לא נמצאו לקוחות</CommandEmpty>
              <CommandGroup>
                {customers.map(c => (
                  <CommandItem
                    key={c.id}
                    value={`${c.name} ${c.phone} ${c.city} ${c.address}`}
                    onSelect={() => {
                      setCustomerId(c.id);
                      setCustomerOpen(false);
                    }}
                  >
                    <Check className={cn("ml-2 h-4 w-4", customerId === c.id ? "opacity-100" : "opacity-0")} />
                    <div className="flex flex-col">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.phone} · {c.city}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function JobFormFields({ customers, customerId, setCustomerId, technicianId, setTechnicianId, scheduledDate, setScheduledDate, scheduledTime, setScheduledTime, notes, setNotes }: {
  customers: Customer[];
  customerId: string; setCustomerId: (v: string) => void;
  technicianId: string; setTechnicianId: (v: string) => void;
  scheduledDate: string; setScheduledDate: (v: string) => void;
  scheduledTime: string; setScheduledTime: (v: string) => void;
  notes: string; setNotes: (v: string) => void;
}) {
  return (
    <>
      <CustomerSearchField customers={customers} customerId={customerId} setCustomerId={setCustomerId} />

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
    </>
  );
}

export function NewJobDialog({ customers, onAdd }: NewJobDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('malfunction');
  const [customerId, setCustomerId] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setCustomerId('');
    setTechnicianId('');
    setScheduledDate('');
    setScheduledTime('');
    setNotes('');
  };

  const handleSubmit = (type: JobType) => {
    if (!customerId || !technicianId || !scheduledDate || !scheduledTime) return;
    onAdd({ type, customerId, technicianId, scheduledDate, scheduledTime, notes });
    setOpen(false);
    resetForm();
  };

  const isDisabled = !customerId || !technicianId || !scheduledDate || !scheduledTime;

  const formProps = { customers, customerId, setCustomerId, technicianId, setTechnicianId, scheduledDate, setScheduledDate, scheduledTime, setScheduledTime, notes, setNotes };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="gap-1.5">
          <Plus className="w-4 h-4" />
          פניה חדשה
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>פניה חדשה</DialogTitle>
          <DialogDescription>בחר סוג פניה ומלא את הפרטים</DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl" className="mt-2">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="malfunction">תקלה</TabsTrigger>
            <TabsTrigger value="installation">התקנה</TabsTrigger>
            <TabsTrigger value="filter_replacement">שירות שוטף</TabsTrigger>
          </TabsList>

          <TabsContent value="malfunction" className="space-y-4 mt-4">
            <JobFormFields {...formProps} />
            <Button onClick={() => handleSubmit('malfunction')} className="w-full" disabled={isDisabled}>
              שמור תקלה
            </Button>
          </TabsContent>

          <TabsContent value="installation" className="space-y-4 mt-4">
            <JobFormFields {...formProps} />
            <Button onClick={() => handleSubmit('installation')} className="w-full" disabled={isDisabled}>
              שמור התקנה
            </Button>
          </TabsContent>

          <TabsContent value="filter_replacement" className="space-y-4 mt-4">
            <JobFormFields {...formProps} />
            <Button onClick={() => handleSubmit('filter_replacement')} className="w-full" disabled={isDisabled}>
              שמור שירות שוטף
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
