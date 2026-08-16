import { describe, expect, it } from "vitest";
import { closesOnFollowUp, FOLLOW_UP_OPTIONS, monthsLabel } from "./followUpOptions";

describe("closesOnFollowUp", () => {
  it("closes a תקלה — the visit is over and the next services are booked", () => {
    expect(closesOnFollowUp("malfunction")).toBe(true);
  });

  it("closes an התקנה", () => {
    expect(closesOnFollowUp("installation")).toBe(true);
  });

  // closeJob's filter_replacement branch archives the scheduled_filter_services row and
  // spawns next year's job, which would pull the row out of the service cycle.
  it("leaves a שירות שוטף job open", () => {
    expect(closesOnFollowUp("filter_replacement")).toBe(false);
  });
});

describe("FOLLOW_UP_OPTIONS", () => {
  it("has unique ids, so a ticked option maps to exactly one created request", () => {
    const ids = FOLLOW_UP_OPTIONS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("labels every interval it actually uses", () => {
    FOLLOW_UP_OPTIONS.forEach((option) => {
      expect(monthsLabel(option.monthsFromNow)).not.toMatch(/^\d+ חודשים$/);
    });
  });
});
