import { Job, STATUS_CONFIG } from '@/types';
import { customers, technicians } from '@/data/mockData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Wrench } from 'lucide-react';

interface JobSummaryTablesProps {
  jobs: Job[];
}

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

export function JobSummaryTables({ jobs }: JobSummaryTablesProps) {
  const malfunctions = jobs.filter(j => j.type === 'malfunction').sort((a, b) => (a.scheduledDate || '').localeCompare(b.scheduledDate || '') || (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));
  const installations = jobs.filter(j => j.type === 'installation').sort((a, b) => (a.scheduledDate || '').localeCompare(b.scheduledDate || '') || (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));

  const renderTable = (title: string, icon: React.ReactNode, items: Job[]) => (
    <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-border">
        {icon}
        <h3 className="font-bold text-card-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">({items.length})</span>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">תאריך</TableHead>
              <TableHead className="text-right">שעה</TableHead>
              <TableHead className="text-right">לקוח</TableHead>
              <TableHead className="text-right">עיר</TableHead>
              <TableHead className="text-right">כתובת</TableHead>
              <TableHead className="text-right">טכנאי</TableHead>
              <TableHead className="text-right">עדיפות</TableHead>
              <TableHead className="text-right">סטטוס</TableHead>
              <TableHead className="text-right">הערות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(job => {
              const customer = customers.find(c => c.id === job.customerId);
              const tech = technicians.find(t => t.id === job.technicianId);
              return (
                <TableRow key={job.id}>
                  <TableCell className="whitespace-nowrap">{job.scheduledDate}</TableCell>
                  <TableCell>{job.scheduledTime}</TableCell>
                  <TableCell className="font-medium">{customer?.name}</TableCell>
                  <TableCell>{job.city}</TableCell>
                  <TableCell>{job.location}</TableCell>
                  <TableCell>{tech?.name}</TableCell>
                  <TableCell><PriorityBadge priority={job.priority} /></TableCell>
                  <TableCell><StatusBadge status={job.status} /></TableCell>
                  <TableCell className="max-w-[200px] truncate">{job.notes}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <div dir="rtl" className="space-y-6">
      {renderTable('סיכום תקלות', <AlertTriangle className="w-5 h-5 text-destructive" />, malfunctions)}
      {renderTable('סיכום התקנות', <Wrench className="w-5 h-5 text-secondary" />, installations)}
    </div>
  );
}
