import { customerImportKey } from '@/hooks/useCustomers';
import { isDbCustomer, isOngoingCustomer } from '@/lib/idConventions';
import type { Customer } from '@/types';

// Only digits matter when comparing phone numbers — the same line is written
// "052-123-4567", "0521234567" and "052 1234567" across the imported data.
function phoneKey(phone: string | undefined | null): string {
  return (phone || '').replace(/\D/g, '');
}

/**
 * Find the real `customers` row behind a job's customer.
 *
 * Malfunctions and installations have no `customer_id` column, so their "customer" is
 * synthesized from the job row itself (`db-malf-cust-*` / `db-inst-cust-*`) and points at
 * nothing. To offer "update the customer card too?" for those jobs we have to identify
 * the card ourselves:
 *
 *  - a real `db-cust-*` customer is already the card;
 *  - a job-derived one carries the true customer name, so it matches on
 *    `customerImportKey` — the same natural key the customers table is unique on;
 *  - `db-ongoing-cust-*` is the exception: its "name" is the task description of a
 *    calendar row, so matching by name would attach the edit to a nonsense card. Those
 *    only ever match on phone.
 *
 * Returns null when nothing matches — the caller then falls back to an upsert by name.
 */
export function resolveCustomerCard(
  jobCustomer: Customer | undefined,
  customersList: Customer[],
): Customer | null {
  if (!jobCustomer) return null;
  if (isDbCustomer(jobCustomer.id)) return jobCustomer;

  const cards = customersList.filter((c) => isDbCustomer(c.id));

  if (!isOngoingCustomer(jobCustomer.id)) {
    const nameKey = customerImportKey(jobCustomer.name || '');
    if (jobCustomer.name?.trim()) {
      const byName = cards.find((c) => customerImportKey(c.name) === nameKey);
      if (byName) return byName;
    }
  }

  const phone = phoneKey(jobCustomer.phone);
  if (phone.length >= 7) {
    const byPhone = cards.find((c) => phoneKey(c.phone) === phone);
    if (byPhone) return byPhone;
  }

  return null;
}
