import { useState } from 'react';
import { Job } from '@/types';
import { technicians } from '@/data/mockData';
import { JobCard } from '@/components/JobCard';
import { Button } from '@/components/ui/button';
import { CheckCircle, MapPin, Clock, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface ScheduleBoardProps {
  jobs: Job[];
  onApprove: (jobIds: string[]) => void;
  onStatusChange: (jobId: string, status: string) => void;
}

export function ScheduleBoard({ jobs, onApprove, onStatusChange }: ScheduleBoardProps) {
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  const areas = [...new Set(jobs.map(j => j.city))];
  const filteredJobs = selectedArea ? jobs.filter(j => j.city === selectedArea) : jobs;

  const draftJobs = filteredJobs.filter(j => j.status === 'draft');
  const pendingJobs = filteredJobs.filter(j => j.status === 'pending_customer');
  const confirmedJobs = filteredJobs.filter(j => j.status === 'confirmed');
  const completedJobs = filteredJobs.filter(j => j.status === 'completed');

  const totalDraftMinutes = draftJobs.reduce((sum, j) => sum + j.estimatedDuration, 0);
  const totalHours = Math.floor(totalDraftMinutes / 60);
  const remainingMinutes = totalDraftMinutes % 60;

  const handleApproveAll = () => {
    const ids = draftJobs.map(j => j.id);
    if (ids.length === 0) return;
    onApprove(ids);
    toast.success(`${ids.length} משימות אושרו — הודעות נשלחו ללקוחות`, {
      description: 'הלקוחות יקבלו SMS/אימייל עם שעת הגעה משוערת.',
    });
  };

  const stats = [
    { label: 'טיוטה', count: draftJobs.length, icon: Filter, color: 'text-muted-foreground' },
    { label: 'ממתין', count: pendingJobs.length, icon: Clock, color: 'text-warning' },
    { label: 'מאושר', count: confirmedJobs.length, icon: CheckCircle, color: 'text-info' },
    { label: 'הושלם', count: completedJobs.length, icon: CheckCircle, color: 'text-success' },
  ];

  return (
    <div dir="rtl" className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-card rounded-lg shadow-card p-4 flex items-center gap-3">
            <s.icon className={`w-5 h-5 ${s.color}`} />
            <div>
              <p className="text-2xl font-bold text-card-foreground">{s.count}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Area Filter & Approve */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedArea === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedArea(null)}
          >
            כל האזורים
          </Button>
          {areas.map(area => (
            <Button
              key={area}
              variant={selectedArea === area ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedArea(area)}
            >
              <MapPin className="w-3.5 h-3.5 ml-1" />
              {area}
            </Button>
          ))}
        </div>

        {draftJobs.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {draftJobs.length} משימות בטיוטה · {totalHours} שע׳ {remainingMinutes} ד׳
            </span>
            <Button onClick={handleApproveAll} className="bg-gradient-secondary text-secondary-foreground">
              <CheckCircle className="w-4 h-4 ml-2" />
              אשר לו״ז
            </Button>
          </div>
        )}
      </div>

      {/* Job Groups by Area */}
      {areas.filter(a => !selectedArea || a === selectedArea).map(area => {
        const areaJobs = filteredJobs.filter(j => j.city === area);
        const areaTechs = [...new Set(areaJobs.map(j => j.technicianId).filter(Boolean))];

        return (
          <div key={area} className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-secondary" />
              <h3 className="font-semibold text-foreground">{area}</h3>
              <span className="text-xs text-muted-foreground">
                {areaJobs.length} משימות · {areaTechs.length} טכנאי{areaTechs.length !== 1 ? 'ם' : ''}
              </span>
            </div>

            {areaTechs.map(techId => {
              const tech = technicians.find(t => t.id === techId);
              const techJobs = areaJobs.filter(j => j.technicianId === techId)
                .sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));

              return (
                <div key={techId} className="mr-2 pr-4 border-r-2 border-border space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{tech?.name}</p>
                  {techJobs.map(job => (
                    <JobCard key={job.id} job={job} variant="manager" onStatusChange={onStatusChange} />
                  ))}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
