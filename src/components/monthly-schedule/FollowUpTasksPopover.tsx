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
    { id: "annual_filter", label: "החלפת פילטר שנתי", monthsFromNow: 12 },
    { id: "external_filter", label: "החלפת פילטר חוץ", monthsFromNow: 6 },
    { id: "siliphos", label: "החלפת סיליפוס", monthsFromNow: 6 },
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
      <PopoverContent className='w-64 p-3' align='start' dir='rtl'>
        <p className='text-xs font-semibold text-foreground mb-2'>
          בחר משימות המשך:
        </p>
        <div className='space-y-2'>
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
                  ({option.monthsFromNow === 12 ? "שנה" : "חצי שנה"} מהיום)
                </span>
              </div>
            </label>
          ))}
        </div>
        {selected.length > 0 && (
          <Button
            size='sm'
            className='w-full mt-3 text-xs gap-1.5'
            onClick={handleConfirm}>
            <CheckCircle className='w-3 h-3' />
            צור {selected.length} משימות
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
