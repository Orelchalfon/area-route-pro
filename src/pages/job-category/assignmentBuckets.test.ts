import { describe, expect, it } from "vitest";
import { hasBoardAssignment, isWaitingForAssignment } from "./assignmentBuckets";

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
});
