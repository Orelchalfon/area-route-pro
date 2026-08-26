import type { DayDocumentationRecord } from "@/hooks/useCompletedDayRecords";
import type { Job } from "@/types";

/**
 * Everything one day of the board needs, already derived by the board itself.
 *
 * The board owns every context read and every filter decision; the cell and the
 * mobile agenda are pure renderers of this shape, which is what lets the same
 * day be drawn as a 100px grid cell on desktop and as a full-width card on a
 * phone without duplicating a single business rule.
 */
export interface DayCellData {
  day: Date;
  dateStr: string;
  isWeekend: boolean;
  isToday: boolean;
  inCurrentMonth: boolean;
  /** `יום ראשון 3/8` — empty for weekend cells, which carry no label. */
  dayLabel: string;
  /** The day's area view-filter (already resolved from override or derivation). */
  dayAreas: string[];
  /** Auto-scheduled filter-service jobs, after the area view-filter. */
  filterJobs: Job[];
  /** Manually assigned jobs, after the area view-filter. */
  manualJobs: Job[];
  /** Finished visits kept as documentation, after the area view-filter. */
  documentation: DayDocumentationRecord[];
  /** Sum of estimatedDuration over the visible jobs. */
  totalMinutes: number;
  /** The day's real job count, BEFORE the area view-filter — gates every action. */
  totalDayJobs: number;
  /** Whether the day holds documentation before the area view-filter. */
  hasDocumentation: boolean;
  isOpenable: boolean;
  isApproved: boolean;
  isLocked: boolean;
  /** How many of the day's customers confirmed the visit. */
  confirmedCount: number;
}

/** Callbacks out. Every one of these is an existing board handler. */
export interface DayCellActions {
  onOpenDay: (dateStr: string) => void;
  /** Empty array means "clear the override". */
  onAreaChange: (dateStr: string, areas: string[]) => void;
  onAddTask: (dateStr: string, dayLabel: string) => void;
  onSwapDay: (dateStr: string) => void;
  onResetDay: (dateStr: string) => void;
  onRemoveJob: (jobId: string, dateStr: string, isFilter: boolean) => void;
  onMoveJobNext: (jobId: string, dateStr: string, isFilter: boolean) => void;
}
