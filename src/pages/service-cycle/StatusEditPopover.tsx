import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { OngoingService } from "@/hooks/useOngoingServices";
import { cn } from "@/lib/utils";
import { CompletionStatus } from "@/types";
import { Check } from "lucide-react";
import { ReactNode, useState } from "react";
import { toast } from "sonner";

// Manager-editable completion states for a service-cycle row. Shared by the list
// and calendar views so the control looks and behaves identically in both.
const STATUS_OPTIONS: { value: CompletionStatus; label: string; dot: string }[] =
  [
    { value: "done", label: "בוצע", dot: "bg-green-500" },
    { value: "need_return", label: "צריך לחזור", dot: "bg-amber-500" },
    { value: "not_done", label: "לא בוצע", dot: "bg-red-500" },
  ];

const optionRowClass =
  "w-full min-h-[40px] text-right text-sm px-2 py-2 rounded-md transition-colors " +
  "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-primary/60 flex items-center gap-2 cursor-pointer";

// Wraps any trigger element (a pill or a calendar chip) in a popover that edits the
// row's completion_status. Pass a single focusable child (rendered via asChild).
export function StatusEditPopover({
  service,
  onUpdateService,
  children,
  align = "end",
}: {
  service: OngoingService;
  onUpdateService: (
    id: string,
    patch: { completion_status?: CompletionStatus | null },
  ) => void;
  children: ReactNode;
  align?: "start" | "center" | "end";
}) {
  const [open, setOpen] = useState(false);
  const current = service.completion_status;

  const apply = (value: CompletionStatus | null, label: string) => {
    onUpdateService(service.id, { completion_status: value });
    toast.success(value ? `הסטטוס עודכן ל"${label}"` : "הסטטוס נוקה");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        dir="rtl"
        align={align}
        className="w-48 p-1"
        // Keep clicks inside the menu from bubbling to the calendar cell / row.
        onClick={(e) => e.stopPropagation()}>
        <p className="text-[11px] font-semibold text-muted-foreground px-2 py-1.5">
          עדכן סטטוס
        </p>
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={current === opt.value}
            onClick={() => apply(opt.value, opt.label)}
            className={cn(
              optionRowClass,
              "motion-safe:active:scale-[0.98]",
              current === opt.value && "bg-muted font-medium",
            )}>
            <span
              className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", opt.dot)}
              aria-hidden
            />
            <span className="flex-1">{opt.label}</span>
            {current === opt.value && (
              <Check className="w-4 h-4 text-primary flex-shrink-0" aria-hidden />
            )}
          </button>
        ))}
        <div className="h-px bg-border my-1" role="separator" />
        <button
          type="button"
          onClick={() => apply(null, "")}
          className={cn(
            optionRowClass,
            "motion-safe:active:scale-[0.98] text-muted-foreground",
          )}>
          נקה סטטוס
        </button>
      </PopoverContent>
    </Popover>
  );
}
