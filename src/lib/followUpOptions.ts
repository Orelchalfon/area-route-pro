// The service tasks the company schedules ahead for a customer. Shared by the two flows
// that create ongoing_services rows from the app:
//   - FollowUpTasksPopover ("משימות להמשך") — ticks tasks off an installation, each dated
//     `monthsFromNow` ahead.
//   - OpenServiceCallDialog ("פתח קריאת שירות") — opens service calls from the service
//     cycle page on one manager-chosen date; `monthsFromNow` is only a display hint there.
// Kept at module scope (it used to be rebuilt inside the popover's render) so both call
// sites share one list — adding a task type here surfaces it in both.

import { JobType } from "@/types";

export interface FollowUpOption {
  id: string;
  label: string;
  /** Default interval from today, in months. Drives the follow-up flow's dates. */
  monthsFromNow: number;
}

export const FOLLOW_UP_OPTIONS: readonly FollowUpOption[] = [
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

/**
 * Does assigning follow-up tasks finish the original request?
 *
 * For a תקלה/התקנה it does: the visit happened and the next services are on the books, so the
 * source call leaves its table ("ממתינים לשיבוץ" / תקלות / התקנות) and lives on as documentation
 * on the monthly board.
 *
 * A שירות שוטף job is excluded on purpose. closeJob's filter_replacement branch archives the
 * scheduled_filter_services row AND spawns next year's job — that would pull the row out of the
 * service cycle, the opposite of what this flow is for.
 */
export function closesOnFollowUp(type: JobType): boolean {
  return type === "malfunction" || type === "installation";
}

export function monthsLabel(months: number): string {
  if (months === 2) return "חודשיים";
  if (months === 6) return "חצי שנה";
  if (months === 12) return "שנה";
  if (months === 48) return "4 שנים";
  return `${months} חודשים`;
}
