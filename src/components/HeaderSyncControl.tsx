import { Button } from "@/components/ui/button";
import { useJobsContext } from "@/contexts/JobsContext";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function formatTime(value?: string) {
  if (!value) return null;
  return new Intl.DateTimeFormat("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

/**
 * Manual refresh + freshness readout, in the shared app header so it reaches every screen.
 *
 * This is not a convenience: installed to the home screen on iOS the app runs in standalone
 * mode with no address bar, no reload button and no pull-to-refresh, so without this a
 * technician whose realtime socket died has no way at all to get current data.
 */
export function HeaderSyncControl() {
  const { refreshAll, dbSyncStatus, dbLastSyncedAt } = useJobsContext();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refreshAll();
      toast.success("הנתונים עודכנו");
    } finally {
      setRefreshing(false);
    }
  };

  const time = formatTime(dbLastSyncedAt);
  const spinning = refreshing || dbSyncStatus === "loading" || dbSyncStatus === "syncing";
  const hasError = dbSyncStatus === "error";

  return (
    <div className='flex items-center gap-1'>
      {/* Freshness is the useful signal for a technician ("is what I'm looking at current?"),
          so show the time from ~sm up and fall back to the error icon alone on narrow phones. */}
      {hasError ? (
        <span
          className='hidden sm:flex items-center gap-1 text-[11px] text-destructive'
          title='העדכונים החיים מנותקים — הקש לרענון'>
          <AlertTriangle className='w-3.5 h-3.5' />
          לא מחובר
        </span>
      ) : (
        time && (
          <span className='hidden sm:inline text-[11px] text-muted-foreground tabular-nums'>
            עודכן {time}
          </span>
        )
      )}
      <Button
        variant='ghost'
        size='icon'
        className='h-11 w-11'
        onClick={handleRefresh}
        disabled={refreshing}
        aria-label='רענן נתונים'
        title={time ? `עודכן ${time} — הקש לרענון` : "רענן נתונים"}>
        <RefreshCw
          className={`w-5 h-5 ${spinning ? "animate-spin" : ""} ${hasError ? "text-destructive" : ""}`}
        />
      </Button>
    </div>
  );
}
