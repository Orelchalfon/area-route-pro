import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { technicians } from '@/data/mockData';
import { Customer, Job, JobType } from '@/types';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { DAY_NAMES } from './regions';

// Dialog to add a task to an approved schedule
export function AddTaskToScheduleDialog({
  techId, dateStr, existingJobs, customersList, onAdd, onClose, getCustomerName,
}: {
  techId: string;
  dateStr: string;
  existingJobs: Job[];
  customersList: Customer[];
  onAdd: (customerId: string, type: JobType, afterJobId: string | null, notes?: string) => void;
  onClose: () => void;
  getCustomerName: (id: string) => string;
}) {
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [jobType, setJobType] = useState<JobType>('malfunction');
  const [afterJobId, setAfterJobId] = useState<string | null>(null);
  const [serviceSubType, setServiceSubType] = useState<string>('annual_filter');

  const tech = technicians.find(t => t.id === techId);
  const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay();

  const filteredCustomers = customersList.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.city?.toLowerCase().includes(q) ||
      c.address?.toLowerCase().includes(q);
  });

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            הוסף משימה — {tech?.name} — יום {DAY_NAMES[dayOfWeek]} {format(new Date(dateStr + 'T00:00:00'), 'd/M')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Job type selection */}
          <div>
            <label className="text-sm font-medium mb-1 block">סוג משימה</label>
            <Tabs value={jobType} onValueChange={v => setJobType(v as JobType)}>
              <TabsList className="w-full">
                <TabsTrigger value="malfunction" className="flex-1">תקלה</TabsTrigger>
                <TabsTrigger value="installation" className="flex-1">התקנה</TabsTrigger>
                <TabsTrigger value="filter_replacement" className="flex-1">שירות</TabsTrigger>
              </TabsList>
            </Tabs>
            {jobType === 'filter_replacement' && (
              <div className="mt-2 space-y-1">
                <label className="text-xs font-medium text-muted-foreground block">סוג שירות</label>
                <Select value={serviceSubType} onValueChange={v => setServiceSubType(v)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual_filter">החלפת פילטר שנתי</SelectItem>
                    <SelectItem value="external_filter">החלפת פילטר חוץ</SelectItem>
                    <SelectItem value="siliphos">החלפת סיליפוס</SelectItem>
                    <SelectItem value="general">שירות כללי</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Customer search */}
          <div>
            <label className="text-sm font-medium mb-1 block">בחר לקוח</label>
            <input
              type="text"
              placeholder="חפש לפי שם, טלפון, עיר..."
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="max-h-40 overflow-y-auto mt-1 border rounded-md">
              {filteredCustomers.slice(0, 50).map(c => (
                <div
                  key={c.id}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted/50 flex justify-between ${selectedCustomerId === c.id ? 'bg-primary/10 font-medium' : ''}`}
                  onClick={() => setSelectedCustomerId(c.id)}
                >
                  <span>{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.city}</span>
                </div>
              ))}
              {filteredCustomers.length === 0 && (
                <p className="text-xs text-muted-foreground p-2">לא נמצאו לקוחות</p>
              )}
            </div>
          </div>

          {/* Position selection */}
          {existingJobs.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-1 block">שבץ אחרי</label>
              <Select value={afterJobId || '__end__'} onValueChange={v => setAfterJobId(v === '__end__' ? null : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__start__">בתחילת היום</SelectItem>
                  {existingJobs.map(j => (
                    <SelectItem key={j.id} value={j.id}>
                      אחרי {getCustomerName(j.customerId)} {j.scheduledTime ? `(${j.scheduledTime})` : ''}
                    </SelectItem>
                  ))}
                  <SelectItem value="__end__">בסוף היום</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            className="w-full"
            disabled={!selectedCustomerId}
            onClick={() => {
              if (selectedCustomerId) {
                const serviceLabels: Record<string, string> = {
                  annual_filter: 'החלפת פילטר שנתי',
                  external_filter: 'החלפת פילטר חוץ',
                  siliphos: 'החלפת סיליפוס',
                  general: 'שירות כללי',
                };
                const notes = jobType === 'filter_replacement' ? (serviceLabels[serviceSubType] || '') : '';
                onAdd(selectedCustomerId, jobType, afterJobId, notes);
              }
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            הוסף משימה
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
