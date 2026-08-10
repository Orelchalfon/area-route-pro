import { describe, expect, it } from "vitest";
import {
  hasBoardAssignment,
  isReturnedForReschedule,
  isWaitingForAssignment,
} from "./assignmentBuckets";

describe("job category assignment buckets", () => {
  it("treats a non-draft job without scheduling as waiting for assignment", () => {
    const job = {
      status: "confirmed",
      technicianId: undefined,
      scheduledDate: undefined,
    };

    expect(isWaitingForAssignment(job)).toBe(true);
    expect(hasBoardAssignment(job)).toBe(false);
  });

  it("treats a draft job with scheduling as assigned to the board", () => {
    const job = {
      status: "draft",
      technicianId: "tech-1",
      scheduledDate: "2026-07-08",
    };

    expect(hasBoardAssignment(job)).toBe(true);
    expect(isWaitingForAssignment(job)).toBe(false);
  });

  // "החזר קריאה" keeps the day/technician/outcome on the row so the board can still
  // document the visit — so the job must NOT read as scheduled work just because it
  // still carries a date.
  it("treats a returned call as waiting, even though it kept its visit stamp", () => {
    const job = {
      status: "draft" as const,
      technicianId: "tech-1",
      scheduledDate: "2026-07-08",
      completionStatus: "need_return" as const,
    };

    expect(isReturnedForReschedule(job)).toBe(true);
    expect(isWaitingForAssignment(job)).toBe(true);
    expect(hasBoardAssignment(job)).toBe(false);
  });

  it("does not treat a reported job still on its day as returned", () => {
    const job = {
      status: "confirmed" as const,
      technicianId: "tech-1",
      scheduledDate: "2026-07-08",
      completionStatus: "done" as const,
    };

    expect(isReturnedForReschedule(job)).toBe(false);
    expect(hasBoardAssignment(job)).toBe(true);
  });
});
