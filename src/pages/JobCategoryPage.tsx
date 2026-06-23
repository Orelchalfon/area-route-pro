import { OpenJobDialog } from "@/components/OpenJobDialog";
import { Button } from "@/components/ui/button";
import { useJobsContext } from "@/contexts/JobsContext";
import { JobType } from "@/types";
import { CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { JobsByArea } from "./job-category/JobsByArea";
import { LiveSyncStatus } from "./job-category/LiveSyncStatus";

const categoryConfig: Record<string, { type: JobType; title: string }> = {
  malfunctions: { type: "malfunction", title: "מאגר תקלות" },
  installations: { type: "installation", title: "מאגר התקנות" },
  service: { type: "filter_replacement", title: "סיכום שירות שוטף" },
};

export default function JobCategoryPage({
  category,
}: {
  category: "malfunctions" | "installations" | "service";
}) {
  const { jobs, customersList, addJob, dbSyncStatus, dbSyncError, dbLastSyncedAt, refreshDbJobs } =
    useJobsContext();
  const config = categoryConfig[category];
  // Malfunctions/installations get a dedicated "open request" button; the
  // service page is a read-only summary, so it has none.
  const canOpenRequest = category !== "service";
  const allOfType = jobs.filter((j) => j.type === config.type);
  const showLiveSyncStatus = category !== "service";
  const isRefreshing = dbSyncStatus === "loading" || dbSyncStatus === "syncing";

  const unassigned = allOfType.filter(
    (j) => !j.technicianId && !j.scheduledDate && j.status === "draft",
  );
  const assigned = allOfType.filter(
    (j) => j.technicianId || j.scheduledDate || j.status !== "draft",
  );

  return (
    <div dir='rtl'>
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-2xl font-bold text-foreground'>{config.title}</h2>
        <div className='flex items-center gap-3 text-sm'>
          {canOpenRequest && (
            <OpenJobDialog
              type={config.type as "malfunction" | "installation"}
              customers={customersList}
              onAdd={addJob}
            />
          )}
          {showLiveSyncStatus && (
            <>
              <LiveSyncStatus
                status={dbSyncStatus}
                error={dbSyncError}
                lastSyncedAt={dbLastSyncedAt}
              />
              <Button
                variant='outline'
                size='sm'
                className='h-7 gap-1.5 px-2.5 text-xs'
                onClick={() => {
                  void refreshDbJobs();
                }}
                disabled={isRefreshing}
                aria-label='רענן נתונים מהשרת'
                title='רענן נתונים מהשרת'>
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                />
                רענן
              </Button>
            </>
          )}
          <span className='flex items-center gap-1.5 text-muted-foreground'>
            <span className='w-2 h-2 rounded-full bg-muted-foreground' />
            ממתינים: {unassigned.length}
          </span>
          <span className='flex items-center gap-1.5 text-info'>
            <span className='w-2 h-2 rounded-full bg-info' />
            שובצו: {assigned.length}
          </span>
        </div>
      </div>

      <div className='mb-6'>
        <h3 className='text-lg font-semibold text-foreground mb-3 flex items-center gap-2'>
          <Clock className='w-4 h-4 text-muted-foreground' />
          ממתינים לשיבוץ ({unassigned.length})
        </h3>
        <JobsByArea jobs={unassigned} />
      </div>

      {assigned.length > 0 && (
        <div>
          <h3 className='text-lg font-semibold text-foreground mb-3 flex items-center gap-2'>
            <CheckCircle2 className='w-4 h-4 text-info' />
            שובצו בלוח ({assigned.length})
          </h3>
          <JobsByArea jobs={assigned} showAssignment />
        </div>
      )}
    </div>
  );
}
