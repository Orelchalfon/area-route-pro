import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useJobsContext } from "@/contexts/JobsContext";
import { isOngoingJob } from "@/lib/idConventions";
import { cn } from "@/lib/utils";
import { Customer, Job, JobType } from "@/types";
import { format } from "date-fns";
import { CheckCircle, ListPlus, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

// Marker written into the notes of every record this popover creates. It is the only
// link back from an ongoing_services row to "this was a follow-up", so reverting after
// a reload depends on it — keep the created notes and this constant in sync.
const FOLLOW_UP_MARKER = "המשך התקנה";

function monthsLabel(months: number): string {
  if (months === 2) return "חודשיים";
  if (months === 6) return "חצי שנה";
  if (months === 12) return "שנה";
  if (months === 48) return "4 שנים";
  return `${months} חודשים`;
}

// Follow-up tasks popover for installation jobs
export function FollowUpTasksPopover({
  job,
  customers,
  onAddJob,
}: {
  job: Job;
  customers: Customer[];
  // Returns the created job (when it came from addJob) so we can offer an undo.
  onAddJob: (data: {
    type: JobType;
    customerId: string;
    technicianId: string;
    scheduledDate: string;
    scheduledTime: string;
    notes: string;
  }) => void | Promise<Job | undefined>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [pendingRevert, setPendingRevert] = useState<Job[] | null>(null);
  const [creating, setCreating] = useState(false);
  // Read from context rather than threading two more props through
  // MonthlyScheduleBoard → DayApprovalDialog, which already does the same.
  const { jobs, archiveJob } = useJobsContext();

  const customer = customers.find((c) => c.id === job.customerId);

  // Follow-ups already on record for this customer. Sourced from the notes marker so it
  // survives a reload (the activity log is in-memory only). The isOngoingJob guard keeps
  // out auto-generated `filter-*` jobs, which have no DB row and archive down a
  // different path.
  const existingFollowUps = useMemo(
    () =>
      jobs.filter(
        (j) =>
          j.type === "filter_replacement" &&
          j.customerId === job.customerId &&
          isOngoingJob(j.id) &&
          j.notes?.includes(FOLLOW_UP_MARKER),
      ),
    [jobs, job.customerId],
  );

  const FOLLOW_UP_OPTIONS = [
    { id: "mehadar_filter", label: "להחליף פילטר מהדר", monthsFromNow: 12 },
    { id: "tamad_filter", label: "להחליף פילטר תמד", monthsFromNow: 12 },
    { id: "osmosis", label: "להחליף אוסמוזה", monthsFromNow: 12 },
    { id: "external_filter", label: "להחליף פילטר חוץ", monthsFromNow: 6 },
    { id: "siliphos", label: "להחליף סיליפוס", monthsFromNow: 6 },
    { id: "service_visit", label: "ביקור שירות", monthsFromNow: 2 },
    { id: "minibar_filter", label: "פילטר מיני בר", monthsFromNow: 12 },
    { id: "bb_filter", label: "פילטר BB", monthsFromNow: 6 },
    { id: "electric_osmosis", label: "אוסמוזה חשמלית", monthsFromNow: 12 },
    { id: "bb20_filter", label: "פילטר BB 20", monthsFromNow: 6 },
    { id: "external_siliphos_combo", label: "חוץ+ סיליפוס", monthsFromNow: 6 },
    { id: "contract_renewal", label: "חידוש חוזה שירות", monthsFromNow: 12 },
    { id: "resin_replacement", label: "החלפת שרף", monthsFromNow: 48 },
  ];

  const toggleOption = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const revert = (targets: Job[]) => {
    targets.forEach((j) => archiveJob(j.id));
    toast.success(
      targets.length === 1
        ? "משימת ההמשך בוטלה"
        : `${targets.length} משימות המשך בוטלו`,
    );
  };

  const handleConfirm = async () => {
    setCreating(true);
    const now = new Date();
    // Each follow-up becomes a filter_replacement request. onAddJob (→ addJob)
    // persists it to ongoing_services, so it shows up in the service cycle and can be
    // scheduled — no separate insert needed. Awaited one at a time so we can collect
    // the created records and offer to undo them.
    const created: Job[] = [];
    for (const optionId of selected) {
      const option = FOLLOW_UP_OPTIONS.find((o) => o.id === optionId)!;
      const futureDate = new Date(now);
      futureDate.setMonth(futureDate.getMonth() + option.monthsFromNow);
      // Skip Friday (5) and Saturday (6) — move to next Sunday
      while (futureDate.getDay() === 5 || futureDate.getDay() === 6) {
        futureDate.setDate(futureDate.getDate() + 1);
      }
      const scheduledDate = format(futureDate, "yyyy-MM-dd");
      const taskDesc = `${option.label} — ${customer?.name || ""}`;
      const result = await onAddJob({
        type: "filter_replacement",
        customerId: job.customerId,
        technicianId: "",
        scheduledDate,
        scheduledTime: "",
        notes: `${taskDesc} — ${FOLLOW_UP_MARKER}`,
      });
      if (result) created.push(result);
    }

    // Only offer undo for records that actually reached the database — addJob falls back
    // to a local id when the insert fails, and that has nothing to archive.
    const revertible = created.filter((j) => isOngoingJob(j.id));
    toast.success(`${selected.length} משימות המשך נוצרו בהצלחה`, {
      duration: 8000,
      action: revertible.length
        ? { label: "בטל", onClick: () => revert(revertible) }
        : undefined,
    });
    setSelected([]);
    setCreating(false);
    setPopoverOpen(false);
  };

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            size='sm'
            variant='outline'
            className='flex-1 text-xs border-secondary text-secondary hover:bg-secondary/10'>
            <ListPlus className='w-3 h-3 ml-1' />
            משימות להמשך
          </Button>
        </PopoverTrigger>
        {/* Three bands: fixed header, scrolling option list, pinned footer. Capping the
            list keeps the whole panel ~336px instead of ~630px, so it no longer blankets
            the day-approval dialog behind it, and the confirm button sits outside the
            scroll flow where it can never be pushed past the viewport edge. */}
        <PopoverContent
          className='w-64 p-0'
          align='start'
          collisionPadding={16}
          dir='rtl'>
          <p className='px-3 pt-3 pb-2 text-xs font-semibold text-foreground'>
            בחר משימות המשך:
          </p>
          <div className='max-h-60 overflow-y-auto px-3 space-y-2'>
            {/* Already-created follow-ups live inside the scroll band on purpose — putting
                them above it would re-inflate the panel and undo the height cap. */}
            {existingFollowUps.length > 0 && (
              <div className='rounded-lg border border-secondary/40 bg-secondary/5 p-2 space-y-1.5'>
                <p className='text-xs font-semibold text-muted-foreground'>
                  נוצרו כבר ({existingFollowUps.length})
                </p>
                {existingFollowUps.map((f) => (
                  <div key={f.id} className='flex items-center gap-1.5'>
                    <span
                      className='flex-1 min-w-0 truncate text-xs text-foreground'
                      title={f.notes}>
                      {f.notes?.replace(` — ${FOLLOW_UP_MARKER}`, "")}
                    </span>
                    <button
                      type='button'
                      onClick={() => setPendingRevert([f])}
                      className='p-1 rounded hover:bg-destructive/10 transition-colors flex-shrink-0'
                      aria-label={`בטל משימת המשך — ${f.notes ?? ""}`}
                      title='בטל'>
                      <Undo2 className='w-3.5 h-3.5 text-destructive' />
                    </button>
                  </div>
                ))}
                {existingFollowUps.length > 1 && (
                  <Button
                    size='sm'
                    variant='outline'
                    className='w-full h-7 text-xs gap-1.5 border-destructive text-destructive hover:bg-destructive/10'
                    onClick={() => setPendingRevert(existingFollowUps)}>
                    <Undo2 className='w-3 h-3' />
                    בטל הכל ({existingFollowUps.length})
                  </Button>
                )}
              </div>
            )}
            {FOLLOW_UP_OPTIONS.map((option) => (
              <label
                key={option.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-xs",
                  selected.includes(option.id)
                    ? "bg-secondary/10 border-secondary/40 text-secondary"
                    : "bg-card border-border text-foreground hover:bg-muted/50",
                )}>
                <Checkbox
                  checked={selected.includes(option.id)}
                  onCheckedChange={() => toggleOption(option.id)}
                />
                <div>
                  <span className='font-medium'>{option.label}</span>
                  <span className='text-muted-foreground mr-1'>
                    ({monthsLabel(option.monthsFromNow)} מהיום)
                  </span>
                </div>
              </label>
            ))}
          </div>
          {/* Always rendered (disabled when empty) so the action is discoverable up front
              and the panel doesn't jump in height on the first selection. */}
          <div className='border-t border-border p-3'>
            <Button
              size='sm'
              className='w-full text-xs gap-1.5'
              disabled={selected.length === 0 || creating}
              onClick={handleConfirm}>
              <CheckCircle className='w-3 h-3' />
              {selected.length > 0
                ? `צור ${selected.length} משימות`
                : "בחר משימות"}
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <AlertDialog
        open={!!pendingRevert}
        onOpenChange={(open) => !open && setPendingRevert(null)}>
        <AlertDialogContent dir='rtl'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-right'>
              ביטול משימות המשך
            </AlertDialogTitle>
            <AlertDialogDescription className='text-right'>
              {pendingRevert?.length === 1
                ? "האם לבטל את משימת ההמשך? הרשומה תוסתר מהרשימה."
                : `האם לבטל ${pendingRevert?.length ?? 0} משימות המשך? הרשומות יוסתרו מהרשימה.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingRevert) revert(pendingRevert);
                setPendingRevert(null);
              }}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
              בטל משימות
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
