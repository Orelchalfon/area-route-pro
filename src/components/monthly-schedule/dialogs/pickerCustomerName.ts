import { MIN_PHONE_KEY_LENGTH, phoneKey } from "@/lib/customerCardMatch";
import { isDbCustomer } from "@/lib/idConventions";
import type { Customer, Job } from "@/types";

/**
 * Real customer cards indexed by phone, keeping ONLY phones that identify exactly one card.
 *
 * A phone shared by several customers (spouses at one address are common in this data) is
 * dropped rather than resolved to whichever row happened to come first — showing a
 * confidently wrong name is worse than showing the row's own description.
 *
 * Only `db-cust-*` cards are indexed: job-derived customers carry the free-text name off a
 * job row, so matching against them would just move the guess one step back.
 */
export function buildUniquePhoneCardIndex(
  customersList: Customer[],
): Map<string, Customer> {
  const byPhone = new Map<string, Customer | null>();
  for (const customer of customersList) {
    if (!isDbCustomer(customer.id)) continue;
    const key = phoneKey(customer.phone);
    if (key.length < MIN_PHONE_KEY_LENGTH) continue;
    // null marks "ambiguous" — seen more than once, so it can never resolve.
    byPhone.set(key, byPhone.has(key) ? null : customer);
  }

  const unique = new Map<string, Customer>();
  for (const [key, customer] of byPhone) {
    if (customer) unique.set(key, customer);
  }
  return unique;
}

/**
 * The name to show as a picker row's title.
 *
 * Three sources, in descending order of confidence:
 *  1. the job's own customer record — the only one that is an actual link;
 *  2. a customer card whose phone matches this row's, and only when that phone belongs to
 *     exactly one card (display-time only — nothing is written back, because a phone match
 *     is not strong enough to persist as a customer link);
 *  3. the name carried on the job itself, which for a calendar row is its task description.
 *
 * Returns undefined only when the row genuinely has no name anywhere, so the caller still
 * owns what to render in that case.
 */
export function resolvePickerCustomerName(
  job: Job,
  customer: Customer | undefined,
  uniquePhoneCards: Map<string, Customer>,
): string | undefined {
  if (customer?.name) return customer.name;

  const key = phoneKey(job.phone);
  if (key.length >= MIN_PHONE_KEY_LENGTH) {
    const byPhone = uniquePhoneCards.get(key);
    if (byPhone?.name) return byPhone.name;
  }

  return job.customerName || undefined;
}
