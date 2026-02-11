import { MonthlyScheduleBoard } from '@/components/MonthlyScheduleBoard';
import { NewJobDialog } from '@/components/NewJobDialog';
import { useJobsContext } from '@/contexts/JobsContext';

export default function Dashboard() {
  const { jobs, customersList, approveSchedule, approveDaySchedule, updateJobStatus, addJob, assignJob, unassignJob, closeJob, returnJob } = useJobsContext();

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">ניהול לו״ז חודשי</h2>
          <p className="text-sm text-muted-foreground mt-1">
            שירות שוטף מתוזמן אוטומטית לפי חודש קבוע ללקוח. תקלות והתקנות משובצות ידנית.
          </p>
        </div>
        <NewJobDialog customers={customersList} onAdd={addJob} />
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
    </div>
  );
}
