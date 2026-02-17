import { Job, JOB_TYPE_CONFIG, Customer, CompletionStatus } from '@/types';
import { CheckCircle, Calendar, XCircle, RotateCcw, Filter, AlertTriangle, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DailyReportCardProps {
  job: Job;
  customer?: Customer;
  nextDate?: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  filter_replacement: <Filter className="w-4 h-4" />,
  malfunction: <AlertTriangle className="w-4 h-4" />,
  installation: <Wrench className="w-4 h-4" />,
};

function StatusBadge({ status }: { status?: CompletionStatus }) {
  if (status === 'done') {
    return <Badge className="bg-success/15 text-success border-success/30 gap-1"><CheckCircle className="w-3 h-3" />הושלם</Badge>;
  }
  if (status === 'need_return') {
    return <Badge className="bg-warning/15 text-warning border-warning/30 gap-1"><RotateCcw className="w-3 h-3" />ממתין לחזרה</Badge>;
  }
  return <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1"><XCircle className="w-3 h-3" />לא בוצע</Badge>;
}

export function DailyReportCard({ job, customer, nextDate }: DailyReportCardProps) {
  const config = JOB_TYPE_CONFIG[job.type];

  const getOutcome = (): string => {
    if (job.completionStatus === 'done') {
      if (job.type === 'filter_replacement' && nextDate) return `מתוזמן: ${nextDate}`;
      if (job.type === 'malfunction') return 'הוסר מרשימת התקלות';
      return 'הושלם בהצלחה';
    }
    if (job.completionStatus === 'need_return') return 'הוחזר למאגר — דורש ביקור חוזר';
    return 'הוחזר למאגר — לא בוצע';
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 print:break-inside-avoid print:shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="mt-0.5 p-2 rounded-lg bg-muted/50">
            {typeIcons[job.type]}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-foreground">{customer?.name || 'לקוח לא ידוע'}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{customer?.address}, {customer?.city}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-medium text-muted-foreground">{config.label}</span>
              <span className="text-muted-foreground/40">•</span>
              <span className="text-xs text-muted-foreground">{job.completionNotes || job.notes}</span>
            </div>
          </div>
        </div>
        <StatusBadge status={job.completionStatus} />
      </div>
      <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2 text-xs">
        {job.completionStatus === 'done' && job.type === 'filter_replacement' && nextDate && (
          <div className="flex items-center gap-1.5 text-info bg-info/10 px-2.5 py-1 rounded-md">
            <Calendar className="w-3 h-3" />
            <span>טיפול הבא: {nextDate}</span>
          </div>
        )}
        {job.completionStatus === 'done' && job.type === 'malfunction' && (
          <div className="flex items-center gap-1.5 text-success">
            <CheckCircle className="w-3 h-3" />
            <span>{getOutcome()}</span>
          </div>
        )}
        {job.completionStatus !== 'done' && (
          <div className="flex items-center gap-1.5 text-warning">
            <RotateCcw className="w-3 h-3" />
            <span>{getOutcome()}</span>
          </div>
        )}
        {job.completionStatus === 'done' && job.type === 'installation' && (
          <div className="flex items-center gap-1.5 text-success">
            <CheckCircle className="w-3 h-3" />
            <span>{getOutcome()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
