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
    job.notes,
    job.city,
    job.location,
    job.phone,
  ].some((field) => field && field.toLowerCase().includes(q));
}
