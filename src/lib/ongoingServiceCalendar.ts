import { Customer, Job, JOB_TYPE_CONFIG } from '@/types';
import {
  detectProduct,
  detectServiceTrack,
  extractCustomerName,
  isInstallation,
} from '@/lib/icsParser';
import type { OngoingService } from '@/hooks/useOngoingServices';

// Mirrors parseICS(text, serviceOnly = true) but sources events from the DB
// `ongoing_services` calendar-derived rows (the backfilled calendar) instead of
// re-fetching and parsing the 3 MB .ics on every load. Only rows without a
// customer_id are calendar-derived; app-request rows (customer_id present) are
// turned into jobs by useOngoingServices itself.
export function buildCalendarServiceData(
  services: OngoingService[],
): { customers: Customer[]; jobs: Job[] } {
  const todayStr = new Date().toISOString().slice(0, 10);
  const customerMap = new Map<string, Customer>();
  const jobs: Job[] = [];
  let customerIdx = 0;

  for (const s of services) {
    if (s.customer_id) continue;

    const summary = (s.task_description || '').trim();
    if (!summary) continue;

    const date = (s.service_date || '').slice(0, 10);
    if (!date) continue;
    if (date < todayStr) continue; // future-only (matches the ICS importer)
    if (isInstallation(summary)) continue; // serviceOnly skips installations
    if (/^בוצע\b|100%|completed/i.test(summary)) continue; // skip completed

    const customerName = extractCustomerName(summary);
    const city = (s.location || '').trim();
    const serviceTrack = detectServiceTrack(summary);
    const month = parseInt(date.split('-')[1], 10);

    const customerKey = customerName.toLowerCase().trim();
    if (customerName && !customerMap.has(customerKey)) {
      customerIdx++;
      customerMap.set(customerKey, {
        id: `ics-c${customerIdx}`,
        name: customerName,
        phone: '',
        address: city,
        city,
        email: '',
        product: detectProduct(summary),
        filterReplacementMonth: month,
        serviceTrack,
      });
    }

    const customer = customerMap.get(customerKey);
    const customerId = customer?.id || `ics-c-unknown-${s.id}`;

    jobs.push({
      id: `ics-${s.id}`,
      type: 'filter_replacement',
      status: 'draft',
      priority: 'low',
      customerId,
      estimatedDuration: JOB_TYPE_CONFIG.filter_replacement.duration,
      location: city,
      city,
      notes: summary,
      createdAt: date,
      scheduledDate: date,
    });
  }

  return { customers: Array.from(customerMap.values()), jobs };
}
