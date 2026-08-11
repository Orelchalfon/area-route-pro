import { splitJobNotes } from "@/lib/jobNotes";
import { Customer, Job } from "@/types";

// Rows of the printed "דף משימות" — the paper sheet the manager hands the technician
// for the day. One row per stop, in route order.
//
// Route order is stored implicitly as `scheduledTime` (10:00 + cumulative durations —
// see handleSaveRouteOrder in MonthlyScheduleBoard), so sorting by it reproduces the
// approved order. Callers that render a live, not-yet-saved arrangement should pass the
// on-screen start times (calculateTimeRanges) rather than the persisted ones, so the
// numbers on paper can never disagree with the numbers on screen.
export interface RouteSheetRow {
  /** 1-based position, printed in the sheet's narrow leading column. */
  order: number;
  name: string;
  address: string;
  /** Rendered dir='ltr' — Hebrew RTL context would otherwise mangle the digits. */
  phone: string;
  /** The "what to do" half of `notes` only — the free-text half stays off the sheet. */
  task: string;
}

/** Printed when no customer record resolves, so the cell is never blank on paper. */
const NO_NAME = "—";

export function buildRouteSheetRows(
  jobs: Job[],
  customers: Customer[],
): RouteSheetRow[] {
  // Stops with no time at all sort last rather than first — an empty string would
  // otherwise win every comparison and push unscheduled work to the top of the sheet.
  const ordered = jobs
    .map((job, index) => ({ job, index }))
    .sort((a, b) => {
      const aTime = a.job.scheduledTime || "";
      const bTime = b.job.scheduledTime || "";
      if (aTime !== bTime) {
        if (!aTime) return 1;
        if (!bTime) return -1;
        return aTime.localeCompare(bTime);
      }
      return a.index - b.index;
    })
    .map(({ job }) => job);

  return ordered.map((job, i) => {
    const customer = customers.find((c) => c.id === job.customerId);
    // Ongoing-service rows carry the same value in both fields (location = city),
    // which would print as "צורן, צורן".
    const addressParts =
      job.location && job.city && job.location !== job.city
        ? [job.location, job.city]
        : [job.location || job.city];
    return {
      order: i + 1,
      name: customer?.name || NO_NAME,
      address: addressParts.filter(Boolean).join(", "),
      phone: job.phone || customer?.phone || "",
      task: splitJobNotes(job.notes).description.trim(),
    };
  });
}
