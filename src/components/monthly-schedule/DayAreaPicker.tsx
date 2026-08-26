import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MapPin } from "lucide-react";
import { REGIONS, UNASSIGNED_REGION } from "./regions";

/**
 * The day's area view-filter. Non-destructive: it only hides jobs that don't
 * match, it never moves or unassigns anything.
 *
 * Shared verbatim between the desktop grid cell and the mobile agenda card, so
 * the two surfaces can never drift on what "בחר אזור" does.
 */
export function DayAreaPicker({
  dayAreas,
  onAreaChange,
  size = "compact",
}: {
  dayAreas: string[];
  onAreaChange: (areas: string[]) => void;
  size?: "compact" | "touch";
}) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}>
      <Popover modal={false}>
        <PopoverTrigger asChild>
          <button
            className={`border-0 rounded w-full text-start flex items-center gap-0.5 flex-wrap ${
              size === "touch"
                ? "h-9 px-2 text-sm gap-1.5"
                : "h-auto min-h-[20px] px-1.5 py-0.5 text-xs"
            } ${
              dayAreas.length > 0
                ? "bg-info/10 text-info hover:bg-info/20"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            }`}
            onClick={(e) => e.stopPropagation()}>
            <MapPin
              className={`shrink-0 ${size === "touch" ? "w-3.5 h-3.5" : "w-2.5 h-2.5"}`}
            />
            <span className='truncate'>
              {dayAreas.length > 0 ? dayAreas.join(", ") : "בחר אזור"}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          dir='rtl'
          className='w-56 p-2'
          align='start'
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            if (
              (e.target as HTMLElement)?.closest?.("[data-radix-popover-content]")
            )
              e.preventDefault();
          }}>
          <p className='text-xs font-semibold mb-2 text-muted-foreground'>
            בחר אזורים ליום:
          </p>
          <div className='space-y-1 max-h-[200px] overflow-y-auto'>
            {[...REGIONS, UNASSIGNED_REGION].map((r) => (
              <label
                key={r}
                className='flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-xs'>
                <Checkbox
                  checked={dayAreas.includes(r)}
                  onCheckedChange={(checked) =>
                    onAreaChange(
                      checked
                        ? [...dayAreas, r]
                        : dayAreas.filter((a) => a !== r),
                    )
                  }
                />
                <span>{r}</span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
