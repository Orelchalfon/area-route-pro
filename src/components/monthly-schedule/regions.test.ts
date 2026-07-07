import { describe, it, expect } from "vitest";
import { Job } from "@/types";
import { jobMatchesAreas, UNASSIGNED_REGION } from "./regions";

// Minimal Job factory — jobMatchesAreas only reads `city`.
const jobIn = (city: string): Job =>
  ({
    id: "test",
    type: "malfunction",
    status: "draft",
    priority: "low",
    customerId: "c1",
    estimatedDuration: 60,
    location: "",
    city,
    notes: "",
    createdAt: "2026-07-07",
  }) as Job;

describe("jobMatchesAreas", () => {
  it("matches everything when no areas are selected", () => {
    expect(jobMatchesAreas(jobIn("אבני חפץ"), [])).toBe(true);
    expect(jobMatchesAreas(jobIn("עיר דמיונית"), [])).toBe(true);
  });

  it("matches a mapped city to its region", () => {
    expect(jobMatchesAreas(jobIn("אבני חפץ"), ["שומרון"])).toBe(true);
    expect(jobMatchesAreas(jobIn("חיפה"), ["צפון רחוק"])).toBe(true);
  });

  it("does not match a mapped city against a different region", () => {
    expect(jobMatchesAreas(jobIn("אבני חפץ"), ["דרום רחוק"])).toBe(false);
  });

  it("surfaces an unmapped city only under the unassigned bucket", () => {
    expect(jobMatchesAreas(jobIn("עיר דמיונית"), [UNASSIGNED_REGION])).toBe(
      true,
    );
    expect(jobMatchesAreas(jobIn("עיר דמיונית"), ["שומרון"])).toBe(false);
  });

  it("does not leak a mapped city into the unassigned bucket", () => {
    expect(jobMatchesAreas(jobIn("אבני חפץ"), [UNASSIGNED_REGION])).toBe(false);
  });
});
