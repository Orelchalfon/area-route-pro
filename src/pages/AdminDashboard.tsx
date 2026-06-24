import { useState } from 'react';
import { MonthlyScheduleBoard } from '@/components/MonthlyScheduleBoard';
import { DailySummaryDialog } from '@/components/DailySummaryDialog';
import { useJobsContext } from '@/contexts/JobsContext';
import { Button } from '@/components/ui/button';
import { ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const { jobs, customersList, closedJobs, activityLogs, approveSchedule, approveDaySchedule, updateJobStatus, addJob, assignJob, unassignJob, assignFilterService, unassignFilterService, closeJob, returnJob, recalcNextServiceDate } = useJobsContext();
  const [summaryOpen, setSummaryOpen] = useState(false);

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">ניהול לו״ז חודשי</h2>
          <p className="text-sm text-muted-foreground mt-1">
            שירות שוטף מתוזמן אוטומטית לפי חודש קבוע ללקוח. תקלות והתקנות משובצות ידנית.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setSummaryOpen(true)}>
            <ClipboardCheck className="w-4 h-4" />
            סיכום יום
          </Button>
        </div>
      </div>

      <MonthlyScheduleBoard
        jobs={jobs}
        onApprove={approveSchedule}
        onApproveDaySchedule={approveDaySchedule}
        onStatusChange={updateJobStatus}
        onAssignJob={assignJob}
        onUnassignJob={unassignJob}
        onAssignFilterService={assignFilterService}
        onUnassignFilterService={unassignFilterService}
        onCloseJob={closeJob}
        onReturnJob={returnJob}
        onAddJob={addJob}
      />
      <DailySummaryDialog
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        jobs={jobs}
        closedJobs={closedJobs}
        activityLogs={activityLogs}
        allCustomers={customersList}
        onConfirmSummary={(dateStr: string) => {
          const dayJobs = jobs.filter(j => j.scheduledDate === dateStr && j.status === 'completed' && j.completionStatus);
          dayJobs.forEach(job => {
            if (job.completionStatus === 'done') {
              closeJob(job.id);
              recalcNextServiceDate(job.customerId);
            } else {
              returnJob(job.id);
            }
          });
          toast.success(`יום העבודה סוכם — ${dayJobs.length} משימות עובדו`);
        }}
      />
    </div>
  );
}
