import { Job } from "@/types";

export const hasBoardAssignment = (
  job: Pick<Job, "technicianId" | "scheduledDate">,
) => Boolean(job.technicianId || job.scheduledDate);

export const isWaitingForAssignment = (
  job: Pick<Job, "technicianId" | "scheduledDate">,
) => !hasBoardAssignment(job);
