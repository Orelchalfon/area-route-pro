import { Customer, Job } from "@/types";
import { format } from "date-fns";

// Generate filter replacement jobs for a given month based on customer data
export function generateFilterJobs(
  month: number,
  year: number,
  allCustomers: Customer[],
): Job[] {
  const monthCustomers = allCustomers.filter(
    (c) => c.filterReplacementMonth === month,
  );
  return monthCustomers.map((customer, i) => ({
    id: `filter-${year}-${month}-${customer.id}`,
    type: "filter_replacement" as const,
    status: "draft" as const,
    priority: "low" as const,
    customerId: customer.id,
    estimatedDuration: 20,
    location: customer.address,
    city: customer.city,
    notes: "החלפת פילטר שנתית",
    createdAt: `${year}-${String(month).padStart(2, "0")}-01`,
  }));
}

// Distribute filter jobs across working days — pack up to 15 per day, mixing areas when needed
export function distributeFilterJobs(
  filterJobs: Job[],
  workingDays: Date[],
): Map<string, Job[]> {
  const distribution = new Map<string, Job[]>();
  workingDays.forEach((d) => distribution.set(format(d, "yyyy-MM-dd"), []));

  // Group jobs by city/area
  const jobsByCity: Record<string, Job[]> = {};
  filterJobs.forEach((job) => {
    if (!jobsByCity[job.city]) jobsByCity[job.city] = [];
    jobsByCity[job.city].push(job);
  });

  const dayKeys = workingDays.map((d) => format(d, "yyyy-MM-dd"));
  const perDay = 3;
  let dayIdx = 0;

  // Pack areas into days: fill each day up to perDay before moving to the next
  for (const cityJobs of Object.values(jobsByCity)) {
    const remaining = [...cityJobs];
    while (remaining.length > 0 && dayIdx < dayKeys.length) {
      const dateStr = dayKeys[dayIdx];
      const existing = distribution.get(dateStr) || [];
      const available = perDay - existing.length;
      if (available <= 0) {
        dayIdx++;
        continue;
      }
      const chunk = remaining.splice(0, available);
      distribution.set(dateStr, [...existing, ...chunk]);
      // Only advance day if this day is now full
      if (existing.length + chunk.length >= perDay) {
        dayIdx++;
      }
    }
  }

  return distribution;
}

export function calculateTimeRanges(
  allJobs: Job[],
): { job: Job; startTime: string; endTime: string }[] {
  let currentMinutes = 10 * 60; // Start at 10:00
  return allJobs.map((job) => {
    const startHour = Math.floor(currentMinutes / 60);
    const startMin = currentMinutes % 60;
    const endMinutes = currentMinutes + job.estimatedDuration;
    const endHour = Math.floor(endMinutes / 60);
    const endMin = endMinutes % 60;
    const startTime = `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}`;
    const endTime = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;
    currentMinutes = endMinutes;
    return { job, startTime, endTime };
  });
}
