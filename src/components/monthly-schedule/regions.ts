import { Job } from "@/types";
import { getSubArea } from "@/lib/areas";
import { SUB_AREAS } from "@/lib/generated/settlementAreas";

// The monthly board's day-area filter is driven by the CBS-derived sub-area
// taxonomy (`SUB_AREAS`) — a finer breakdown than the 5 coarse areas in
// `@/lib/areas.ts`, resolved per city via `getSubArea`. Formerly this module kept
// its own hand-maintained region list + city map; that was replaced by the
// generated sub-areas so all ~1,300 settlements are covered from one source.
export const REGIONS: readonly string[] = SUB_AREAS;

// Bucket for jobs whose city resolves to no sub-area (e.g. a freshly added
// customer in an out-of-list town, or Judea/Samaria rows CBS leaves unmapped).
// Lets the manager still filter/schedule them. Kept out of REGIONS so it stays a
// real-region list; the picker appends it and jobMatchesAreas handles it explicitly.
export const UNASSIGNED_REGION = "לא משויך";

/** Check if a city belongs to any of the selected sub-areas. */
export function cityMatchesAreas(city: string, areas: string[]): boolean {
  if (areas.length === 0) return true;
  const sub = getSubArea(city || "");
  if (sub && areas.includes(sub)) return true;
  // Unassigned bucket: surface jobs no sub-area claims.
  if (areas.includes(UNASSIGNED_REGION) && !sub) return true;
  return false;
}

/** Check if a job's city belongs to any of the selected sub-areas. */
export function jobMatchesAreas(job: Job, areas: string[]): boolean {
  return cityMatchesAreas(job.city || "", areas);
}
