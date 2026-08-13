import { Job } from "@/types";
import { minutesToTime, nextFreeMinutes } from "./utils";

export type DayAssignment = {
  jobId: string;
  technicianId: string;
  scheduledDate: string;
  scheduledTime: string;
};

export type MoveDayPlan = {
  /** The jobs that actually change hands, in the order they were given. */
  movedJobs: Job[];
  /** What to hand to approveDaySchedule — one entry per moved job. */
  assignments: DayAssignment[];
  /** Stops left behind because the technician already reported them. */
  skippedJobs: Job[];
};

/**
 * Plan handing a whole day over to the other technician (e.g. the assigned one is sick).
 *
 * Kept pure so the two rules that matter can be pinned by tests:
 *
 * 1. A stop the technician already reported (`completionStatus`) never moves — it is the
 *    record of a visit that happened, and approveDaySchedule would force it back to
 *    'confirmed' while keeping the report, an inconsistent row.
 * 2. Times only change when they have to. An empty target day keeps every stop's exact
 *    scheduledTime, which preserves the saved route order and — since arrivalStateFor
 *    compares date+time only — keeps the customers' arrival confirmations valid. A target
 *    day that already holds work gets the moved stops appended after its last one, using
 *    the same nextFreeMinutes + cumulative-duration arithmetic as appending to an approved
 *    day (see scheduleTimes.test.ts for the invariant that makes that a single safe write).
 */
export function buildMoveDayAssignments(
  dayJobs: Job[],
  targetExistingJobs: Job[],
  targetTechId: string,
  dateStr: string,
): MoveDayPlan {
  // Sorted by their current times so that when the stops have to be re-timed onto a busy
  // day they keep the sequence the manager planned. The board hands them over grouped
  // (filter jobs first, then manual), which is not the route order. Untimed stops sort
  // last. A no-op for the keep-times branch, where each job carries its own time.
  const movedJobs = dayJobs
    .filter((j) => !j.completionStatus)
    .slice()
    .sort((a, b) =>
      (a.scheduledTime || "99:99").localeCompare(b.scheduledTime || "99:99"),
    );
  const skippedJobs = dayJobs.filter((j) => j.completionStatus);

  const keepTimes = targetExistingJobs.length === 0;
  let currentMinutes = keepTimes ? 0 : nextFreeMinutes(targetExistingJobs);

  const assignments = movedJobs.map((job) => {
    let scheduledTime: string;
    if (keepTimes) {
      scheduledTime = job.scheduledTime || "";
    } else {
      scheduledTime = minutesToTime(currentMinutes);
      currentMinutes += job.estimatedDuration;
    }
    return {
      jobId: job.id,
      technicianId: targetTechId,
      scheduledDate: dateStr,
      scheduledTime,
    };
  });

  return { movedJobs, assignments, skippedJobs };
}
