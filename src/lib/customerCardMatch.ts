import { customerImportKey } from '@/hooks/useCustomers';
import { isDbCustomer, isOngoingCustomer } from '@/lib/idConventions';
import type { Customer } from '@/types';

// Exported because the customer-history lookup needs the SAME rule in reverse
// (customer -> their job rows) as resolveCustomerCard uses (job -> customer card);
// two subtly different rules would make a visit visible in one direction only.
// NOT the same as phoneKey9 in scripts/customerMatch.mjs (last 9 digits) — see
// scripts/customerMatch.mjs:44-60 for why those two must stay separate.
//
// Only digits matter when comparing phone numbers — the same line is written
// "052-123-4567", "0521234567" and "052 1234567" across the imported data.
export function phoneKey(phone: string | undefined | null): string {
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

/** A phone key is only trustworthy as an identity above this length. */
export const MIN_PHONE_KEY_LENGTH = 7;

/**
 * Real customer cards indexed by phone, keeping ONLY phones that identify exactly one card.
 *
 * A phone shared by several customers (spouses at one address are common in this data) is
 * dropped rather than resolved to whichever row happened to come first — showing a
 * confidently wrong name is worse than showing the row's own description.
 *
 * Only `db-cust-*` cards are indexed: job-derived customers carry the free-text name off a
 * job row, so matching against them would just move the guess one step back.
 *
 * Lives here rather than beside the picker because useJobs needs the same index when it
 * names an ongoing_services row at scheduling time — one rule, one implementation.
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
 * The stored-string spellings of one phone number, for an equality filter against a
 * column holding raw human-entered text.
 *
 * Needed because malfunctions/installations have no customer_id to join on (until the
 * backfill runs) and Postgres cannot apply `phoneKey` inside a PostgREST filter — so
 * the query guesses the spellings and the caller re-filters with `phoneKey` after.
 * Covers the formats actually present in the imported Israeli data.
 */
export function phoneVariants(phone: string | undefined | null): string[] {
  const d = phoneKey(phone);
  if (d.length < MIN_PHONE_KEY_LENGTH) return [];

  // Normalise +972 / 972 international forms back to a local 0-prefixed number.
  const local = d.startsWith('972') ? `0${d.slice(3)}` : d;
  const out = new Set<string>([d, local]);
  const trimmed = (phone || '').trim();
  if (trimmed) out.add(trimmed);

  if (local.length === 10) {
    out.add(`${local.slice(0, 3)}-${local.slice(3)}`);
    out.add(`${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`);
    out.add(`${local.slice(0, 3)} ${local.slice(3)}`);
    out.add(`+972${local.slice(1)}`);
  } else if (local.length === 9) {
    out.add(`${local.slice(0, 2)}-${local.slice(2)}`);
    out.add(`${local.slice(0, 2)}-${local.slice(2, 5)}-${local.slice(5)}`);
    out.add(`+972${local.slice(1)}`);
  }
  return [...out].filter(Boolean);
}

/**
 * True when a job row (which carries only a free-text name + phone) belongs to this
 * customer. The phone is authoritative; the name is only accepted as a tiebreak when
 * the row has no usable phone at all, since `customerImportKey` is just a normalised
 * name and two people can share one.
 */
export function jobRowMatchesCustomer(
  row: { customer_name?: string | null; phone?: string | null },
  customer: Pick<Customer, 'name' | 'phone'>,
): boolean {
  const rowPhone = phoneKey(row.phone);
  const custPhone = phoneKey(customer.phone);
  if (rowPhone.length >= MIN_PHONE_KEY_LENGTH && custPhone.length >= MIN_PHONE_KEY_LENGTH) {
    return rowPhone === custPhone;
  }
  if (!row.customer_name?.trim() || !customer.name?.trim()) return false;
  return customerImportKey(row.customer_name) === customerImportKey(customer.name);
}
