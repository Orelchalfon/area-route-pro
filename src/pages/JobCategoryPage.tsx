import { useJobsContext } from '@/contexts/JobsContext';
import { Job, STATUS_CONFIG, JobType, JOB_TYPE_CONFIG } from '@/types';
import { customers, technicians } from '@/data/mockData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Wrench, Filter, Clock, MapPin, CheckCircle2 } from 'lucide-react';

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

function JobsByArea({ jobs, showAssignment }: { jobs: Job[]; showAssignment?: boolean }) {
  const grouped: Record<string, Job[]> = {};
  jobs.forEach(job => {
    const city = job.city || 'לא צוין';
    if (!grouped[city]) grouped[city] = [];
    grouped[city].push(job);
  });

  if (Object.keys(grouped).length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="font-medium">אין משימות</p>
      </div>
    );
  }

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
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped[city]
                  .sort((a, b) => (a.scheduledDate || '').localeCompare(b.scheduledDate || '') || (a.scheduledTime || '').localeCompare(b.scheduledTime || ''))
                  .map(job => {
                    const customer = customers.find(c => c.id === job.customerId);
                    const tech = technicians.find(t => t.id === job.technicianId);
                    return (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">{customer?.name}</TableCell>
                        <TableCell>{job.location}</TableCell>
                        <TableCell><PriorityBadge priority={job.priority} /></TableCell>
                        <TableCell><StatusBadge status={job.status} /></TableCell>
                        {showAssignment && <TableCell>{tech?.name || '—'}</TableCell>}
                        {showAssignment && <TableCell className="whitespace-nowrap">{job.scheduledDate || '—'}</TableCell>}
                        <TableCell className="max-w-[200px] truncate">{job.notes}</TableCell>
                      </TableRow>
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

  // Split into unassigned (pool) vs assigned/in-progress
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

      {/* Unassigned pool */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          ממתינים לשיבוץ ({unassigned.length})
        </h3>
        <JobsByArea jobs={unassigned} />
      </div>

      {/* Assigned */}
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
