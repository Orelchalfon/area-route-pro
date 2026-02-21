import { Job, JOB_TYPE_CONFIG, STATUS_CONFIG, Customer } from '@/types';
import { technicians } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, User, Phone, Navigation, CheckCircle2 } from 'lucide-react';
import { useJobsContext } from '@/contexts/JobsContext';

interface JobCardProps {
  job: Job;
  variant?: 'manager' | 'technician';
  onStatusChange?: (jobId: string, status: string) => void;
  onComplete?: (jobId: string) => void;
  isNext?: boolean;
}

export function JobCard({ job, variant = 'manager', onStatusChange, onComplete, isNext }: JobCardProps) {
  const { customersList } = useJobsContext();
  const customer = customersList.find(c => c.id === job.customerId);
  const tech = technicians.find(t => t.id === job.technicianId);
  const typeConfig = JOB_TYPE_CONFIG[job.type];
  const statusConfig = STATUS_CONFIG[job.status];

  const priorityStyles: Record<string, string> = {
    high: 'border-r-4 border-r-destructive',
    medium: 'border-r-4 border-r-secondary',
    low: 'border-r-4 border-r-info',
  };

  const colorMap: Record<string, string> = {
    muted: 'bg-muted text-muted-foreground',
    warning: 'bg-warning/15 text-warning',
    info: 'bg-info/15 text-info',
    secondary: 'bg-secondary/15 text-secondary',
    success: 'bg-success/15 text-success',
    accent: 'bg-accent/15 text-accent-foreground',
  };

  return (
    <div dir="rtl" className={`bg-card rounded-lg shadow-card p-4 transition-all hover:shadow-elevated animate-slide-in ${priorityStyles[job.priority]} ${isNext ? 'ring-2 ring-secondary' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-card-foreground">{typeConfig.label}</span>
            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${colorMap[statusConfig?.color] || colorMap.muted}`}>
              {statusConfig?.label || job.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{job.notes}</p>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>{job.scheduledTime}</span>
          <span className="text-xs mr-1">({typeConfig.duration} ד׳)</span>
        </div>
      </div>

      <div className="space-y-1.5 text-sm mb-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <User className="w-3.5 h-3.5 shrink-0" />
          <span>{customer?.name}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span>{job.location}, {job.city}</span>
        </div>
        {variant === 'manager' && tech && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="w-3.5 h-3.5 rounded-full bg-secondary shrink-0 flex items-center justify-center text-[9px] text-secondary-foreground font-bold">
              {tech.name[0]}
            </span>
            <span>{tech.name}</span>
          </div>
        )}
      </div>

      {variant === 'technician' && (
        <div className="flex gap-2 mt-3">
          {customer && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => window.open(`tel:${customer.phone}`)}
            >
              <Phone className="w-3.5 h-3.5 ml-1" />
              התקשר
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => window.open(`https://waze.com/ul?q=${encodeURIComponent(job.location + ', ' + job.city)}`)}
          >
            <Navigation className="w-3.5 h-3.5 ml-1" />
            נווט
          </Button>
        </div>
      )}

      {variant === 'technician' && job.status === 'completed' && (
        <div className="mt-2 p-2 bg-success/10 rounded text-sm text-success">
          ✓ הושלם {job.completionNotes && `— ${job.completionNotes}`}
        </div>
      )}
    </div>
  );
}
