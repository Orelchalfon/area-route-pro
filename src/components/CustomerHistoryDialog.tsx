import { useJobsContext } from '@/contexts/JobsContext';
import { CustomerVisit, useCustomerVisits } from '@/hooks/useCustomerVisits';
import { ActivityLog, COMPLETION_STATUS_CONFIG, Customer, JOB_TYPE_CONFIG } from '@/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { History, Loader2, MapPin, Wrench } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface CustomerHistoryDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Everything on record for one customer, newest first.
 *
 * Two streams, deliberately merged rather than tabbed — the manager's question is
 * "what happened here and when", not "which table was it in":
 *
 *  - VISITS come from the four job tables (`useCustomerVisits`) and are retroactive, so
 *    years of history show up without anything having been logged at the time. A visit
 *    where the technician arrived and could NOT do the work is a visit: `לא בוצע` and
 *    `צריך לחזור` are rendered exactly like `בוצע`, never filtered out.
 *  - ACTIONS come from `activity_logs` and cover everything that isn't a visit —
 *    scheduling, edits, closures, status changes.
 */

type TimelineItem =
  | { kind: 'visit'; at: string; visit: CustomerVisit }
  | { kind: 'log'; at: string; log: ActivityLog };

const dateLabel = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('he-IL');
};

const timeLabel = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
};

function VisitRow({ visit }: { visit: CustomerVisit }) {
  const outcome = visit.completionStatus ? COMPLETION_STATUS_CONFIG[visit.completionStatus] : null;
  return (
    <div className="border border-border rounded-lg p-3 space-y-1.5 bg-card">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Wrench className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <span className="text-sm font-semibold text-foreground truncate">
            {JOB_TYPE_CONFIG[visit.type].label}
          </span>
          {visit.archived && (
            <span className="text-[10px] text-muted-foreground border border-border rounded-full px-1.5 py-0.5 shrink-0">
              נסגר
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{dateLabel(visit.date)}</span>
      </div>

      {visit.description && (
        <p className="text-sm text-muted-foreground break-words">{visit.description}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={cn(
            'text-xs rounded-full border px-2 py-0.5',
            outcome ? outcome.pill : 'bg-muted/40 border-border text-muted-foreground',
          )}
        >
          {/* No report is itself information: the visit is on the books but nobody
              said what happened. Saying so beats showing nothing. */}
          {outcome ? outcome.label : 'ממתין לדיווח'}
        </span>
        {(visit.location || visit.city) && (
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <MapPin className="w-3 h-3" aria-hidden="true" />
            {[visit.location, visit.city].filter(Boolean).join(', ')}
          </span>
        )}
      </div>

      {visit.completionNotes && (
        <p className="text-xs text-muted-foreground bg-muted/40 rounded px-2 py-1 whitespace-pre-wrap">
          {visit.completionNotes}
        </p>
      )}
    </div>
  );
}

function LogRow({ log }: { log: ActivityLog }) {
  return (
    <div className="border border-border/60 rounded-lg p-3 space-y-1 bg-muted/20">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">{log.action}</span>
        <span className="text-xs text-muted-foreground shrink-0">
          {dateLabel(log.timestamp)} {timeLabel(log.timestamp)}
        </span>
      </div>
      <p className="text-sm text-muted-foreground break-words">{log.details}</p>
      {log.actorName && <p className="text-xs text-muted-foreground">בוצע על ידי: {log.actorName}</p>}
    </div>
  );
}

export function CustomerHistoryDialog({ customer, open, onOpenChange }: CustomerHistoryDialogProps) {
  const { fetchCustomerLogs } = useJobsContext();

  // Pass null while closed so a closed dialog costs nothing.
  const { visits, loading: visitsLoading, error } = useCustomerVisits(open ? customer : null);

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const customerId = customer?.id ?? null;
  useEffect(() => {
    if (!open || !customerId) {
      setLogs([]);
      return;
    }
    let cancelled = false;
    setLogsLoading(true);
    void fetchCustomerLogs(customerId)
      .then((rows) => {
        if (!cancelled) setLogs(rows);
      })
      .finally(() => {
        if (!cancelled) setLogsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, customerId, fetchCustomerLogs]);

  const items = useMemo<TimelineItem[]>(() => {
    const merged: TimelineItem[] = [
      // A visit carries a date but no clock time, so it sorts against the log's date half.
      ...visits.map((visit) => ({ kind: 'visit' as const, at: visit.date, visit })),
      ...logs.map((log) => ({ kind: 'log' as const, at: log.timestamp, log })),
    ];
    return merged.sort((a, b) => b.at.slice(0, 10).localeCompare(a.at.slice(0, 10)));
  }, [visits, logs]);

  const loading = visitsLoading || logsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            היסטוריה — {customer?.name}
          </DialogTitle>
          <DialogDescription className="sr-only">היסטוריית הפניות והשירותים של הלקוח.</DialogDescription>
        </DialogHeader>

        {!loading && !error && items.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {visits.length} ביקורים · {logs.length} פעולות
          </p>
        )}

        <ScrollArea className="max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              <span className="text-sm ms-2">טוען היסטוריה...</span>
            </div>
          ) : error ? (
            <p className="text-sm text-destructive text-center py-8">
              שגיאה בטעינת ההיסטוריה: {error}
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">אין פעולות מתועדות עדיין</p>
          ) : (
            <div className="space-y-3 pe-2">
              {items.map((item) =>
                item.kind === 'visit' ? (
                  <VisitRow key={`v-${item.visit.jobKey}`} visit={item.visit} />
                ) : (
                  <LogRow key={`l-${item.log.id}`} log={item.log} />
                ),
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
