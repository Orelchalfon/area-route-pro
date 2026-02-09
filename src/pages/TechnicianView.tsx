import { useState } from 'react';
import { Link } from 'react-router-dom';
import { technicians } from '@/data/mockData';
import { Job } from '@/types';
import { JobCard } from '@/components/JobCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { User, Calendar, CheckCircle2, Clock, LayoutDashboard, Users } from 'lucide-react';
import { toast } from 'sonner';

interface TechnicianViewProps {
  jobs: Job[];
  onComplete: (jobId: string, notes: string) => void;
}

export default function TechnicianView({ jobs, onComplete }: TechnicianViewProps) {
  const [selectedTech, setSelectedTech] = useState(technicians[0].id);
  const [completingJobId, setCompletingJobId] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');

  const tech = technicians.find(t => t.id === selectedTech)!;
  const techJobs = jobs
    .filter(j => j.technicianId === selectedTech)
    .sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));

  const activeJobs = techJobs.filter(j => j.status === 'confirmed');
  const completedJobs = techJobs.filter(j => j.status === 'completed');
  const nextJob = activeJobs[0];

  const handleComplete = () => {
    if (!completingJobId) return;
    onComplete(completingJobId, completionNotes);
    toast.success('Job completed!', { description: 'Notes saved. Moving to next task.' });
    setCompletingJobId(null);
    setCompletionNotes('');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-hero text-primary-foreground p-4 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold">
            {tech.name[0]}
          </div>
          <div>
            <h1 className="font-semibold text-lg">{tech.name}</h1>
            <p className="text-sm opacity-80">{tech.region} · {tech.skills.join(', ')}</p>
          </div>
        </div>

        {/* Tech Selector */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {technicians.map(t => (
            <Button
              key={t.id}
              size="sm"
              variant={t.id === selectedTech ? 'secondary' : 'ghost'}
              className={t.id !== selectedTech ? 'text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10' : ''}
              onClick={() => setSelectedTech(t.id)}
            >
              {t.name.split(' ')[0]}
            </Button>
          ))}
        </div>
      </div>

      <div className="p-4 -mt-3 space-y-4">
        {/* Summary */}
        <div className="bg-card rounded-lg shadow-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{activeJobs.length}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold text-success">{completedJobs.length}</p>
              <p className="text-xs text-muted-foreground">Done</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Today</span>
          </div>
        </div>

        {/* Next Task Banner */}
        {nextJob && (
          <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium text-foreground">Next up at {nextJob.scheduledTime}</span>
          </div>
        )}

        {/* Active Jobs */}
        {activeJobs.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse-soft" />
              Active Jobs
            </h2>
            {activeJobs.map((job, idx) => (
              <JobCard
                key={job.id}
                job={job}
                variant="technician"
                isNext={idx === 0}
                onComplete={(id) => setCompletingJobId(id)}
              />
            ))}
          </div>
        )}

        {/* Completed */}
        {completedJobs.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              Completed ({completedJobs.length})
            </h2>
            {completedJobs.map(job => (
              <JobCard key={job.id} job={job} variant="technician" />
            ))}
          </div>
        )}

        {activeJobs.length === 0 && completedJobs.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No jobs scheduled</p>
            <p className="text-sm">Check back later for assignments</p>
          </div>
        )}
      </div>

      {/* Complete Dialog */}
      <Dialog open={!!completingJobId} onOpenChange={() => setCompletingJobId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Job</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Add professional notes about the completed work..."
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletingJobId(null)}>Cancel</Button>
            <Button onClick={handleComplete} className="bg-success hover:bg-success/90 text-success-foreground">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Mark Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
