import { Customer, Job } from "@/types";

export function jobMatchesPickerSearch(
  job: Job,
  customer: Customer | undefined,
  query: string,
) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  return [
    customer?.name,
    customer?.phone,
    customer?.address,
    customer?.city,
    // Calendar rows have no customer record — their name rides on the job (see
    // ongoingCustomerName), so without this a name search would miss all of them.
    job.customerName,
    job.notes,
    job.city,
    job.location,
    job.phone,
  ].some((field) => field && field.toLowerCase().includes(q));
}
