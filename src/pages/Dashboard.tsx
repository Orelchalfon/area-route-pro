import { useState } from 'react';
import { MonthlyScheduleBoard } from '@/components/MonthlyScheduleBoard';
import { NewJobDialog } from '@/components/NewJobDialog';
import { DailySummaryDialog } from '@/components/DailySummaryDialog';
import { useJobsContext } from '@/contexts/JobsContext';
import { Button } from '@/components/ui/button';
import { ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function Dashboard() {
  const { jobs, customersList, closedJobs, activityLogs, approveSchedule, approveDaySchedule, updateJobStatus, addJob, assignJob, unassignJob, closeJob, returnJob, recalcNextServiceDate } = useJobsContext();
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
          <NewJobDialog customers={customersList} onAdd={addJob} />
        </div>
      </div>

      <MonthlyScheduleBoard
        jobs={jobs}
        onApprove={approveSchedule}
        onApproveDaySchedule={approveDaySchedule}
        onStatusChange={updateJobStatus}
        onAssignJob={assignJob}
        onUnassignJob={unassignJob}
        onCloseJob={closeJob}
        onReturnJob={returnJob}
      />
      <DailySummaryDialog
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        jobs={jobs}
        closedJobs={closedJobs}
        activityLogs={activityLogs}
        allCustomers={customersList}
        onConfirmSummary={() => {
          const todayStr = new Date().toISOString().split('T')[0];
          const todayJobs = jobs.filter(j => j.scheduledDate === todayStr && j.status === 'completed' && j.completionStatus);
          todayJobs.forEach(job => {
            if (job.completionStatus === 'done') {
              closeJob(job.id);
              recalcNextServiceDate(job.customerId);
            } else {
              returnJob(job.id);
            }
          });
          toast.success(`יום העבודה סוכם — ${todayJobs.length} משימות עובדו`);
        }}
      />
    </div>
  );
}
