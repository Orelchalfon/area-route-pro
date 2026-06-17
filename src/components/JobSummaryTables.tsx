import { Job, STATUS_CONFIG } from '@/types';
import { technicians } from '@/data/mockData';
import { useJobsContext } from '@/contexts/JobsContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { groupJobsByArea } from '@/lib/areas';
import { AlertTriangle, Wrench, Filter, ChevronDown, MapPin } from 'lucide-react';

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

function JobsByArea({ jobs }: { jobs: Job[] }) {
  const { customersList: customers } = useJobsContext();
  const areaGroups = groupJobsByArea(jobs);

  return (
    <div className="space-y-6">
      {areaGroups.map(({ area, count, cities }) => (
        <Collapsible key={area} defaultOpen className="space-y-3">
          <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-lg bg-primary/10 px-4 py-2.5 text-right transition-colors hover:bg-primary/15">
            <ChevronDown className="w-5 h-5 text-primary transition-transform group-data-[state=closed]:-rotate-90" />
            <h3 className="text-lg font-bold text-primary">{area}</h3>
            <span className="text-sm font-medium text-primary/70">({count})</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pr-2">
            {cities.map(({ city, jobs: cityJobs }) => (
              <div key={city} className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
                <div className="flex items-center gap-2 p-3 border-b border-border bg-muted/30">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <h4 className="font-semibold text-card-foreground">{city}</h4>
                  <span className="text-xs text-muted-foreground">({cityJobs.length})</span>
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
                      {cityJobs.map(job => {
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
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}

export function JobSummaryTables({ jobs }: JobSummaryTablesProps) {
  const malfunctions = jobs.filter(j => j.type === 'malfunction');
  const installations = jobs.filter(j => j.type === 'installation');
  const filterReplacements = jobs.filter(j => j.type === 'filter_replacement');

  return (
    <div dir="rtl">
      <Tabs defaultValue="malfunctions" className="w-full">
        <TabsList className="w-full justify-start mb-4">
          <TabsTrigger value="malfunctions" className="gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            תקלות ({malfunctions.length})
          </TabsTrigger>
          <TabsTrigger value="installations" className="gap-1.5">
            <Wrench className="w-4 h-4" />
            התקנות ({installations.length})
          </TabsTrigger>
          <TabsTrigger value="service" className="gap-1.5">
            <Filter className="w-4 h-4" />
            שירות שוטף ({filterReplacements.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="malfunctions">
          <JobsByArea jobs={malfunctions} />
        </TabsContent>
        <TabsContent value="installations">
          <JobsByArea jobs={installations} />
        </TabsContent>
        <TabsContent value="service">
          <JobsByArea jobs={filterReplacements} />
        </TabsContent>
      </Tabs>
    </div>
  );
}