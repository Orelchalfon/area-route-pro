import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Customer, Job, JobType } from "@/types";
import { format } from "date-fns";
import { CheckCircle, ListPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
  onAddJob: (data: {
    type: JobType;
    customerId: string;
    technicianId: string;
    scheduledDate: string;
    scheduledTime: string;
    notes: string;
  }) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const customer = customers.find((c) => c.id === job.customerId);

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

  const handleConfirm = () => {
    const now = new Date();
    // Each follow-up becomes a filter_replacement request. onAddJob (→ addJob)
    // persists it to ongoing_services, so it shows up in the service cycle and can be
    // scheduled — no separate insert needed.
    selected.forEach((optionId) => {
      const option = FOLLOW_UP_OPTIONS.find((o) => o.id === optionId)!;
      const futureDate = new Date(now);
      futureDate.setMonth(futureDate.getMonth() + option.monthsFromNow);
      // Skip Friday (5) and Saturday (6) — move to next Sunday
      while (futureDate.getDay() === 5 || futureDate.getDay() === 6) {
        futureDate.setDate(futureDate.getDate() + 1);
      }
      const scheduledDate = format(futureDate, "yyyy-MM-dd");
      const taskDesc = `${option.label} — ${customer?.name || ""}`;
      onAddJob({
        type: "filter_replacement",
        customerId: job.customerId,
        technicianId: "",
        scheduledDate,
        scheduledTime: "",
        notes: `${taskDesc} — המשך התקנה`,
      });
    });

    toast.success(`${selected.length} משימות המשך נוצרו בהצלחה`);
    setSelected([]);
    setPopoverOpen(false);
  };

  return (
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
            disabled={selected.length === 0}
            onClick={handleConfirm}>
            <CheckCircle className='w-3 h-3' />
            {selected.length > 0 ? `צור ${selected.length} משימות` : "בחר משימות"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
