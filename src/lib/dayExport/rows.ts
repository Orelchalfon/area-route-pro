import { splitJobNotes } from "@/lib/jobNotes";
import {
  COMPLETION_STATUS_CONFIG,
  Customer,
  JOB_TYPE_CONFIG,
  Job,
} from "@/types";

// One line of the downloadable day table (PDF / Word). Deliberately NOT RouteSheetRow:
// that one describes the printed paper form the technician fills in by hand, and carries
// only what fits a hand-fill sheet. This is the data export — everything the manager sees
// on the stop card, including the times, the outcome and the technician's report.
export interface DayExportRow {
  /** 1-based position in the route, matching the badge on the card. */
  order: number;
  /**
   * "10:00-10:20". An ASCII hyphen, deliberately not the en-dash the screen uses: under
   * the bidi algorithm a hyphen between two numbers is a number separator, so the range
   * stays one left-to-right unit, while an en-dash is a neutral and flips the two clock
   * times around each other in an RTL line.
   */
  time: string;
  name: string;
  phone: string;
  address: string;
  /** JOB_TYPE_CONFIG label — החלפת פילטר / תקלה / התקנה חדשה. */
  type: string;
  /** The office's description + free-text notes, the two halves of `Job.notes`. */
  notes: string;
  /** The technician's reported outcome, empty until reported. */
  status: string;
  /** `Job.completionNotes` — what the technician wrote when reporting. */
  technicianNotes: string;
}

/** Header block above the table. */
export interface DayExportMeta {
  /** "יום ראשון 30/08" — the same label the dialog title shows. */
  dayLabel: string;
  /** "30/08/2026". */
  dateText: string;
  technicianName: string;
  areas: string[];
}

/** Shown when no customer record resolves, so a cell is never blank in the file. */
const NO_NAME = "—";

/** The dialog's own timeline entry — `{ job, startTime, endTime }` from calculateTimeRanges. */
export interface DayExportEntry {
  job: Job;
  startTime: string;
  endTime: string;
}

// Built from the on-screen entries rather than from the persisted scheduledTime, exactly
// like buildRouteSheetRows' caller does: the file can then never disagree with the route
// the manager is looking at, even mid-reorder.
export function buildDayExportRows(
  entries: DayExportEntry[],
  customers: Customer[],
): DayExportRow[] {
  return entries.map(({ job, startTime, endTime }, i) => {
    const customer = customers.find((c) => c.id === job.customerId);
    // Ongoing-service rows carry the same value in both fields (location = city), which
    // would otherwise read "צורן, צורן" — same de-dup as the printed sheet.
    const addressParts =
      job.location && job.city && job.location !== job.city
        ? [job.location, job.city]
        : [job.location || job.city];
    const { description, notes } = splitJobNotes(job.notes);
    return {
      order: i + 1,
      time: [startTime, endTime].filter(Boolean).join("-"),
      name: (customer?.name || job.customerName || "").trim() || NO_NAME,
      phone: (job.phone || customer?.phone || "").trim(),
      address: addressParts.filter(Boolean).join(", "),
      type: JOB_TYPE_CONFIG[job.type]?.label ?? "",
      notes: [description.trim(), notes.trim()].filter(Boolean).join(" — "),
      // The dialog's own DOCUMENTED_OUTCOME prefixes these with ✓/✗/↻, which the bundled
      // Hebrew font has no glyph for — the plain labels are the shared source of truth.
      status: job.completionStatus
        ? COMPLETION_STATUS_CONFIG[job.completionStatus].label
        : "",
      technicianNotes: (job.completionNotes ?? "").trim(),
    };
  });
}
