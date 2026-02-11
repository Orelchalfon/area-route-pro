import { useJobsContext } from '@/contexts/JobsContext';
import { Job, STATUS_CONFIG, JobType } from '@/types';
import { customers, technicians } from '@/data/mockData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const categoryConfig: Record<string, { type: JobType; title: string }> = {
  malfunctions: { type: 'malfunction', title: 'סיכום תקלות' },
  installations: { type: 'installation', title: 'סיכום התקנות' },
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

function JobsByArea({ jobs }: { jobs: Job[] }) {
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
            <h4 className="font-semibold text-card-foreground">{city}</h4>
            <span className="text-xs text-muted-foreground">({grouped[city].length})</span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">תאריך</TableHead>
                  <TableHead className="text-right">שעה</TableHead>
                  <TableHead className="text-right">לקוח</TableHead>
                  <TableHead className="text-right">כתובת</TableHead>
                  <TableHead className="text-right">טכנאי</TableHead>
                  <TableHead className="text-right">עדיפות</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
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
                        <TableCell className="whitespace-nowrap">{job.scheduledDate}</TableCell>
                        <TableCell>{job.scheduledTime}</TableCell>
                        <TableCell className="font-medium">{customer?.name}</TableCell>
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
      ))}
    </div>
  );
}

export default function JobCategoryPage({ category }: { category: 'malfunctions' | 'installations' | 'service' }) {
  const { jobs } = useJobsContext();
  const config = categoryConfig[category];
  const filtered = jobs.filter(j => j.type === config.type);

  return (
    <div dir="rtl">
      <h2 className="text-2xl font-bold text-foreground mb-4">{config.title}</h2>
      <JobsByArea jobs={filtered} />
    </div>
  );
}
