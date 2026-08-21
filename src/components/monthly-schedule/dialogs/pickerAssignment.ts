import { technicians } from "@/data/technicians";
import { formatHebrewDate } from "@/lib/dates";
import { hasBoardAssignment } from "@/pages/job-category/assignmentBuckets";
import { Job } from "@/types";

export type PickerAssignment = {
  technicianName: string;
  dateLabel: string;
  /** Ready-to-render Hebrew badge text, e.g. "משובץ: שילה · 12.8.2026". */
  label: string;
};

/**
 * Describes an existing board assignment so the picker can mark a job as taken
 * ("already on שילה's day") instead of silently hiding it from the other manager.
 *
 * Returns null when the job is not board-assigned. Crucially that includes a
 * returned-for-reschedule call: it keeps its technician/date as documentation of
 * the visit, but it is genuinely back in the pool and must stay selectable —
 * hence the shared `hasBoardAssignment` predicate rather than a field check.
 */
export function getPickerAssignment(job: Job): PickerAssignment | null {
  if (!hasBoardAssignment(job)) return null;

  const technicianName =
    technicians.find((t) => t.id === job.technicianId)?.name ?? "";
  const dateLabel = formatHebrewDate(job.scheduledDate);
  // An unknown technician id with no date leaves nothing to tell the manager.
  if (!technicianName && !dateLabel) return null;

  const label = technicianName
    ? dateLabel
      ? `משובץ: ${technicianName} · ${dateLabel}`
      : `משובץ: ${technicianName}`
    : `משובץ לתאריך ${dateLabel}`;

  return { technicianName, dateLabel, label };
}
