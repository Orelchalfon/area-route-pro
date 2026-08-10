import { Job } from "@/types";

/**
 * A call the technician reported on and the manager then sent back for rescheduling
 * ("החזר קריאה"). It deliberately KEEPS its visit stamp — the day it happened, who was
 * there, and the outcome — so the monthly board can still document that the visit took
 * place. That means a technician/date alone no longer proves a job is scheduled work,
 * and every "is this on the board?" check has to discount these.
 */
export const isReturnedForReschedule = (
  job: Pick<Job, "status" | "completionStatus">,
) => job.status === "draft" && Boolean(job.completionStatus);

export const hasBoardAssignment = (
  job: Pick<Job, "technicianId" | "scheduledDate" | "status" | "completionStatus">,
) =>
  Boolean(job.technicianId || job.scheduledDate) && !isReturnedForReschedule(job);

export const isWaitingForAssignment = (
  job: Pick<Job, "technicianId" | "scheduledDate" | "status" | "completionStatus">,
) => !hasBoardAssignment(job);
