import { WeeklyScheduleBoard } from '@/components/WeeklyScheduleBoard';
import { NewJobDialog } from '@/components/NewJobDialog';
import { useJobs } from '@/hooks/useJobs';

export default function Dashboard() {
  const { jobs, customersList, approveSchedule, updateJobStatus, addJob, assignJob, unassignJob } = useJobs();

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">ניהול לו״ז</h2>
          <p className="text-sm text-muted-foreground mt-1">
            בחר אזור עבודה לכל יום, בחר פניות ושבץ אותן ידנית.
          </p>
        </div>
        <NewJobDialog customers={customersList} onAdd={addJob} />
      </div>

      <WeeklyScheduleBoard
        jobs={jobs}
        onApprove={approveSchedule}
        onStatusChange={updateJobStatus}
        onAssignJob={assignJob}
        onUnassignJob={unassignJob}
      />
    </div>
  );
}
