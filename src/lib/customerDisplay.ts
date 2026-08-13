import { MONTH_NAMES } from '@/components/monthly-schedule/constants';
import { Customer } from '@/types';

// Display helpers for customer record fields that need interpretation before they can be
// shown — kept out of the components so the data quirks below are pinned by tests.

/** Shown wherever a record field has no usable value, so an empty cell is never ambiguous. */
export const NOT_SET = 'לא הוגדר';

/**
 * Hebrew name of the annual filter-replacement month.
 *
 * `rowToCustomer` maps a null `filter_replacement_month` to 0 (useCustomers.ts), so "no month
 * set" arrives as a number, not as undefined — a naive MONTH_NAMES[month - 1] would index -1
 * and render "undefined". Anything outside 1–12 is treated as unset.
 */
export function filterMonthLabel(month?: number): string {
  if (!Number.isInteger(month) || month! < 1 || month! > 12) return NOT_SET;
  return MONTH_NAMES[month! - 1];
}

/**
 * Whether the customer carries real geocoded coordinates. Without them the route planner falls
 * back to a city-centre estimate (`getCustomerCoords`), so this is worth surfacing.
 */
export function hasExactLocation(customer: Pick<Customer, 'lat' | 'lng'>): boolean {
  return Number.isFinite(customer.lat) && Number.isFinite(customer.lng);
}
