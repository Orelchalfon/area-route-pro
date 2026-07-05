import { cn } from '@/lib/utils';
import { Customer, Job, JOB_TYPE_CONFIG } from '@/types';
import { OngoingService } from '@/hooks/useOngoingServices';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle, Filter, Search, Wrench } from 'lucide-react';
import { type ReactNode } from 'react';
import { statusClass, statusText } from './status';

export type JobResult = { job: Job; customer: Customer | undefined };
export type SearchResults = {
  ongoing: OngoingService[];
  jobs: JobResult[];
  total: number;
};

const COMPLETION_LABELS: Record<string, { label: string; cls: string }> = {
  done: { label: 'בוצע', cls: 'bg-green-100 border-green-300 text-green-800' },
  not_done: { label: 'לא בוצע', cls: 'bg-red-100 border-red-300 text-red-800' },
  need_return: { label: 'צריך לחזור', cls: 'bg-amber-100 border-amber-300 text-amber-800' },
};

function jobDate(job: Job) {
  return job.scheduledDate || job.createdAt;
}

export function ClientSearchResults({ results }: { results: SearchResults }) {
  const malfunctions = results.jobs.filter(r => r.job.type === 'malfunction');
  const installations = results.jobs.filter(r => r.job.type === 'installation');

  if (results.total === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p>לא נמצאו רשומות תואמות.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ongoing services */}
      <ResultSection title="שירות שוטף" count={results.ongoing.length} icon={<Filter className="w-4 h-4 text-primary" />}>
        {results.ongoing.map(s => (
          <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors">
            <span className="text-xs text-muted-foreground w-24 flex-shrink-0">
              {format(new Date(s.service_date), 'dd/MM/yyyy')}
            </span>
            <span className="text-sm font-medium text-foreground flex-1">{s.task_description}</span>
            {s.phone && (
              <span className="text-xs text-muted-foreground" dir="ltr">{s.phone}</span>
            )}
            {s.location && (
              <span className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-0.5">{s.location}</span>
            )}
            <span className={cn('text-[11px] rounded-full border px-2 py-0.5 flex items-center gap-1 flex-shrink-0', statusClass(s))}>
              {(s.completion_status === 'done' || s.is_done) && <CheckCircle className="w-3 h-3" />}
              {statusText(s)}
            </span>
          </div>
        ))}
      </ResultSection>

      {/* Malfunctions */}
      <ResultSection title="תקלות" count={malfunctions.length} icon={<AlertTriangle className="w-4 h-4 text-destructive" />}>
        {malfunctions.map(r => <JobRow key={r.job.id} {...r} />)}
      </ResultSection>

      {/* Installations */}
      <ResultSection title="התקנות" count={installations.length} icon={<Wrench className="w-4 h-4 text-secondary" />}>
        {installations.map(r => <JobRow key={r.job.id} {...r} />)}
      </ResultSection>
    </div>
  );
}

function ResultSection({ title, count, icon, children }: { title: string; count: number; icon: ReactNode; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="bg-muted/40 px-4 py-2 border-b border-border flex items-center gap-2">
        {icon}
        <span className="font-semibold text-sm">{title}</span>
        <span className="text-xs text-muted-foreground mr-auto">{count} רשומות</span>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function JobRow({ job, customer }: JobResult) {
  const completion = job.completionStatus ? COMPLETION_LABELS[job.completionStatus] : null;
  const addressParts = [customer?.address, customer?.city || job.city].filter(Boolean).join(', ');
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors">
      <span className="text-xs text-muted-foreground w-24 flex-shrink-0">
        {format(new Date(jobDate(job)), 'dd/MM/yyyy')}
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground">{customer?.name || 'ללא שם'}</span>
        {customer?.phone && <span className="text-xs text-muted-foreground mr-2">{customer.phone}</span>}
        {job.notes && <p className="text-xs text-muted-foreground truncate">{job.notes}</p>}
      </div>
      <span className="text-[11px] text-muted-foreground bg-muted/30 rounded px-2 py-0.5 flex-shrink-0">
        {JOB_TYPE_CONFIG[job.type].label}
      </span>
      {addressParts && (
        <span className="text-xs text-muted-foreground hidden sm:inline">{addressParts}</span>
      )}
      {completion && (
        <span className={cn('text-[11px] rounded-full border px-2 py-0.5 flex-shrink-0', completion.cls)}>
          {completion.label}
        </span>
      )}
    </div>
  );
}
