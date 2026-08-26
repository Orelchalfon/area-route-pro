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
 *    day that still holds work gets the moved stops appended after its last one, using
 *    the same nextFreeMinutes + cumulative-duration arithmetic as appending to an approved
 *    day (see scheduleTimes.test.ts for the invariant that makes that a single safe write).
 *
 * `targetExistingJobs` is what will *still* be on the receiving day once the move lands, not
 * what is on it right now — in a swap (buildSwapDayPlan) the receiving technician's own live
 * stops all leave, so only their reported stay-behinds occupy time there.
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

export type SwapDayPlan = {
  /** What the selected technician hands to the other one. */
  toOther: MoveDayPlan;
  /** What comes back the other way. */
  toSource: MoveDayPlan;
  /** Both directions in one list — safe to write in a single pass, the id sets are disjoint. */
  assignments: DayAssignment[];
};

/**
 * Plan swapping a date between the two technicians: each one's live stops become the other's.
 *
 * The swap is two mirrored moves, and the mirroring is what makes it cheap: because every live
 * stop leaves its day, each incoming block is timed against nothing but the receiving
 * technician's *reported* stay-behinds. With none — the usual case — both sides keep their exact
 * scheduledTimes, so the routes stay in order and every customer arrival confirmation survives.
 */
export function buildSwapDayPlan(
  sourceDayJobs: Job[],
  otherDayJobs: Job[],
  sourceTechId: string,
  otherTechId: string,
  dateStr: string,
): SwapDayPlan {
  const sourceSkipped = sourceDayJobs.filter((j) => j.completionStatus);
  const otherSkipped = otherDayJobs.filter((j) => j.completionStatus);

  const toOther = buildMoveDayAssignments(
    sourceDayJobs,
    otherSkipped,
    otherTechId,
    dateStr,
  );
  const toSource = buildMoveDayAssignments(
    otherDayJobs,
    sourceSkipped,
    sourceTechId,
    dateStr,
  );

  return {
    toOther,
    toSource,
    assignments: [...toOther.assignments, ...toSource.assignments],
  };
}

/**
 * Where each technician's day approval lands after a swap.
 *
 * A day is approved when the technician has work on it the manager has signed off on —
 * TechnicianView only shows days approved for that technician, so the approval has to follow the
 * work. Two ways to end up approved: you receive stops that came off an approved day, or you keep
 * reported stops from your own approved day (they still need their day visible to you).
 *
 * Both incoming terms are gated on that direction actually moving something. Without the gate a
 * day whose stops were all already reported — nothing to send — would still approve the other
 * technician on a day where they have nothing.
 */
export function resolveSwapApprovals(input: {
  sourceApproved: boolean;
  otherApproved: boolean;
  sourceMoved: number;
  otherMoved: number;
  sourceSkipped: number;
  otherSkipped: number;
}): { source: boolean; other: boolean } {
  return {
    source:
      (input.otherApproved && input.otherMoved > 0) ||
      (input.sourceApproved && input.sourceSkipped > 0),
    other:
      (input.sourceApproved && input.sourceMoved > 0) ||
      (input.otherApproved && input.otherSkipped > 0),
  };
}
