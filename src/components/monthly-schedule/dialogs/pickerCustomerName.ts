import { MIN_PHONE_KEY_LENGTH, phoneKey } from "@/lib/customerCardMatch";
import type { Customer, Job } from "@/types";

/**
 * The name to show as a picker row's title.
 *
 * Three sources, in descending order of confidence:
 *  1. the job's own customer record — the only one that is an actual link;
 *  2. a customer card whose phone matches this row's, and only when that phone belongs to
 *     exactly one card (see buildUniquePhoneCardIndex);
 *  3. the name carried on the job itself, which for a calendar row is its task description.
 *
 * The phone match resolves a NAME, never a customer link: `ongoing_services.customer_id`
 * stays untouched, so nothing here claims two records are the same customer. useJobs
 * persists the same resolved name into `ongoing_services.customer_name` when a row is
 * scheduled, so the board, the exports and this picker all agree on it.
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
