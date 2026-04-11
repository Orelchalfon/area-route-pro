import { useState } from 'react';
import { useJobsContext } from '@/contexts/JobsContext';
import { Job, STATUS_CONFIG, JobType, JOB_TYPE_CONFIG, Customer } from '@/types';
import { technicians } from '@/data/mockData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Wrench, Filter, Clock, MapPin, CheckCircle2, Pencil, Save, X } from 'lucide-react';

const categoryConfig: Record<string, { type: JobType; title: string }> = {
  malfunctions: { type: 'malfunction', title: 'מאגר תקלות' },
  installations: { type: 'installation', title: 'מאגר התקנות' },
  service: { type: 'filter_replacement', title: 'סיכום שירות שוטף' },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  const colorMap: Record<string, string> = {
    muted: 'bg-muted text-muted-foreground',
    warning: 'bg-warning/15 text-warning',
    info: 'bg-info/15 text-info',
    secondary: 'bg-secondary/15 text-secondary',
    success: 'bg-success/15 text-success',
    accent: 'bg-accent/15 text-accent-foreground',
    destructive: 'bg-destructive/15 text-destructive',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${colorMap[config?.color] || colorMap.muted}`}>
      {config?.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    high: { label: 'גבוהה', cls: 'bg-destructive/15 text-destructive' },
    medium: { label: 'בינונית', cls: 'bg-warning/15 text-warning' },
    low: { label: 'נמוכה', cls: 'bg-info/15 text-info' },
  };
  const p = map[priority] || map.low;
  return <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${p.cls}`}>{p.label}</span>;
}

interface EditForm {
  location: string;
  city: string;
  notes: string;
  priority: string;
}

function EditableJobRow({ job, customer, tech, showAssignment, editingId, onStartEdit, onCancelEdit, onSave }: {
  job: Job;
  customer: Customer | undefined;
  tech: { name: string } | undefined;
  showAssignment?: boolean;
  editingId: string | null;
  onStartEdit: (id: string) => void;
  onCancelEdit: () => void;
  onSave: (jobId: string, customerId: string, data: EditForm) => void;
}) {
  const isEditing = editingId === job.id;
  const [form, setForm] = useState<EditForm>({
    location: job.location || customer?.address || '',
    city: job.city || customer?.city || '',
    notes: job.notes || '',
    priority: job.priority || 'low',
  });

  const handleStartEdit = () => {
    setForm({
      location: job.location || customer?.address || '',
      city: job.city || customer?.city || '',
      notes: job.notes || '',
      priority: job.priority || 'low',
    });
    onStartEdit(job.id);
  };

  if (isEditing) {
    return (
      <TableRow className="bg-primary/5">
        <TableCell className="font-medium">{customer?.name}</TableCell>
        <TableCell>
          <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="h-7 text-xs" placeholder="כתובת" />
          <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="h-7 text-xs mt-1" placeholder="עיר" />
        </TableCell>
        <TableCell>
          <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
            <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="high">גבוהה</SelectItem>
              <SelectItem value="medium">בינונית</SelectItem>
              <SelectItem value="low">נמוכה</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell><StatusBadge status={job.status} /></TableCell>
        {showAssignment && <TableCell>{tech?.name || '—'}</TableCell>}
        {showAssignment && <TableCell className="whitespace-nowrap">{job.scheduledDate || '—'}</TableCell>}
        <TableCell>
          <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="h-7 text-xs" placeholder="הערות" />
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Button size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => customer && onSave(job.id, customer.id, form)}>
              <Save className="w-3 h-3" /> שמור
            </Button>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={onCancelEdit}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{customer?.name}</TableCell>
      <TableCell>{job.location}</TableCell>
      <TableCell><PriorityBadge priority={job.priority} /></TableCell>
      <TableCell><StatusBadge status={job.status} /></TableCell>
      {showAssignment && <TableCell>{tech?.name || '—'}</TableCell>}
      {showAssignment && <TableCell className="whitespace-nowrap">{job.scheduledDate || '—'}</TableCell>}
      <TableCell className="max-w-[200px] truncate">{job.notes}</TableCell>
      <TableCell>
        <button onClick={handleStartEdit} className="p-1 rounded hover:bg-muted/50 transition-colors" title="ערוך">
          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </TableCell>
    </TableRow>
  );
}

function JobsByArea({ jobs, showAssignment }: { jobs: Job[]; showAssignment?: boolean }) {
  const { customersList: customers, updateJob, updateCustomer } = useJobsContext();
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSave = (jobId: string, customerId: string, data: EditForm) => {
    updateJob(jobId, {
      location: data.location,
      city: data.city,
      notes: data.notes,
      priority: data.priority as Job['priority'],
    });
    updateCustomer(customerId, {
      address: data.location,
      city: data.city,
    });
    setEditingId(null);
  };

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="font-medium">אין משימות</p>
      </div>
    );
  }

  const grouped: Record<string, Job[]> = {};
  jobs.forEach(job => {
    const city = job.city || 'לא צוין';
    if (!grouped[city]) grouped[city] = [];
    grouped[city].push(job);
  });

  return (
    <div className="space-y-4">
      {Object.keys(grouped).sort().map(city => (
        <div key={city} className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
          <div className="flex items-center gap-2 p-3 border-b border-border bg-muted/30">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <h4 className="font-semibold text-card-foreground">{city}</h4>
            <span className="text-xs text-muted-foreground">({grouped[city].length})</span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">לקוח</TableHead>
                  <TableHead className="text-right">כתובת</TableHead>
                  <TableHead className="text-right">עדיפות</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                  {showAssignment && <TableHead className="text-right">טכנאי</TableHead>}
                  {showAssignment && <TableHead className="text-right">תאריך</TableHead>}
                  <TableHead className="text-right">הערות</TableHead>
                  <TableHead className="text-right w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped[city]
                  .sort((a, b) => (a.scheduledDate || '').localeCompare(b.scheduledDate || '') || (a.scheduledTime || '').localeCompare(b.scheduledTime || ''))
                  .map(job => {
                    const customer = customers.find(c => c.id === job.customerId);
                    const tech = technicians.find(t => t.id === job.technicianId);
                    return (
                      <EditableJobRow
                        key={job.id}
                        job={job}
                        customer={customer}
                        tech={tech}
                        showAssignment={showAssignment}
                        editingId={editingId}
                        onStartEdit={setEditingId}
                        onCancelEdit={() => setEditingId(null)}
                        onSave={handleSave}
                      />
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function JobCategoryPage({ category }: { category: 'malfunctions' | 'installations' | 'service' }) {
  const { jobs } = useJobsContext();
  const config = categoryConfig[category];
  const allOfType = jobs.filter(j => j.type === config.type);

  const unassigned = allOfType.filter(j => !j.technicianId && !j.scheduledDate && j.status === 'draft');
  const assigned = allOfType.filter(j => j.technicianId || j.scheduledDate || j.status !== 'draft');

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-foreground">{config.title}</h2>
        <div className="flex gap-3 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-muted-foreground" />
            ממתינים: {unassigned.length}
          </span>
          <span className="flex items-center gap-1.5 text-info">
            <span className="w-2 h-2 rounded-full bg-info" />
            שובצו: {assigned.length}
          </span>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          ממתינים לשיבוץ ({unassigned.length})
        </h3>
        <JobsByArea jobs={unassigned} />
      </div>

      {assigned.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-info" />
            שובצו בלוח ({assigned.length})
          </h3>
          <JobsByArea jobs={assigned} showAssignment />
        </div>
      )}
    </div>
  );
}