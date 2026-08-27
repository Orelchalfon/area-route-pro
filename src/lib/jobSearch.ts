import { phoneKey } from "@/lib/customerCardMatch";
import type { Customer, Job } from "@/types";

/**
 * A phone search needs enough digits to be a deliberate phone search. With one or
 * two digits almost every number in the day matches, which makes the results look
 * broken rather than filtered.
 */
const MIN_PHONE_QUERY_DIGITS = 3;

/**
 * Does this job match what the technician typed?
 *
 * Matches on what the technician can actually SEE on the card — customer name, the
 * address and city, and the phone behind the "התקשר" button. `job.location`/`job.city`
 * are checked alongside the customer's own address because JobCard renders the job's
 * copy (JobCard.tsx:63), and for malfunctions/installations the customer record is
 * synthesized from the job row anyway.
 *
 * Deliberately does NOT match job notes or the Hebrew type label: this is "find the
 * customer I'm looking for", not a full-text search over the day.
 *
 * Separate from `jobMatchesPickerSearch` (monthly-schedule/dialogs/jobPickerSearch.ts),
 * which searches task descriptions because the manager picks tasks by what they are.
 */
export function jobMatchesSearch(
  job: Job,
  customer: Customer | undefined,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const textMatch = [
    customer?.name,
    customer?.address,
    customer?.city,
    job.location,
    job.city,
  ].some((field) => field && field.toLowerCase().includes(q));
  if (textMatch) return true;

  // Only digits matter when comparing phone numbers — the same line is written
  // "052-123-4567", "0521234567" and "052 1234567" across the imported data.
  const digits = phoneKey(q);
  if (digits.length < MIN_PHONE_QUERY_DIGITS) return false;

  return [customer?.phone, job.phone].some((phone) => {
    const key = phoneKey(phone);
    return key.length > 0 && key.includes(digits);
  });
}
