import { describe, expect, it } from "vitest";
import { Job } from "@/types";
import { getPickerAssignment } from "./pickerAssignment";

const makeJob = (overrides: Partial<Job> = {}): Job => ({
  id: "db-malf-1",
  type: "malfunction",
  status: "confirmed",
  priority: "high",
  customerId: "db-cust-1",
  estimatedDuration: 60,
  location: "רחוב הרצל 5",
  city: "קדומים",
  notes: "",
  createdAt: "2026-08-01",
  ...overrides,
});

describe("getPickerAssignment", () => {
  it("labels a job with both technician and date", () => {
    const assignment = getPickerAssignment(
      makeJob({ technicianId: "t1", scheduledDate: "2026-08-12" }),
    );

    expect(assignment?.technicianName).toBe("שילה");
    expect(assignment?.dateLabel).toBe("12.8.2026");
    expect(assignment?.label).toBe("משובץ: שילה · 12.8.2026");
  });

  it("labels a job assigned to a technician with no date", () => {
    const assignment = getPickerAssignment(makeJob({ technicianId: "t2" }));

    expect(assignment?.label).toBe("משובץ: נריה");
  });

  it("labels a job that only holds a date", () => {
    const assignment = getPickerAssignment(
      makeJob({ scheduledDate: "2026-08-12" }),
    );

    expect(assignment?.technicianName).toBe("");
    expect(assignment?.label).toBe("משובץ לתאריך 12.8.2026");
  });

  it("returns null for work that is not on the board", () => {
    expect(getPickerAssignment(makeJob({ status: "draft" }))).toBeNull();
  });

  it("returns null for a returned-for-reschedule call, which is back in the pool", () => {
    // It keeps its technician and date as documentation of the visit that happened,
    // so a plain field check would wrongly mark it as taken.
    const returned = makeJob({
      status: "draft",
      completionStatus: "need_return",
      technicianId: "t1",
      scheduledDate: "2026-08-12",
    });

    expect(getPickerAssignment(returned)).toBeNull();
  });

  it("returns null when the technician id is unknown and there is no date", () => {
    expect(getPickerAssignment(makeJob({ technicianId: "ghost" }))).toBeNull();
  });
});
