import { describe, expect, it } from "vitest";
import {
  closesOnFollowUp,
  FOLLOW_UP_OPTIONS,
  followUpDueDate,
  monthsLabel,
} from "./followUpOptions";

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

describe("followUpDueDate", () => {
  // The manager adds follow-ups at day approval, days after the visit.
  const approvalDay = new Date("2026-09-15T12:00:00");

  it("counts from the visit date, not from the day the follow-ups are created", () => {
    // Real case: visit 10/09, follow-ups added 15/09 were dated 15/03 instead of 10/03.
    expect(followUpDueDate("2026-09-10", 6, approvalDay)).toBe("2027-03-10");
  });

  // The reported case: עידו פדלון, installation done 15/09, follow-ups added 17/09.
  // 17/09/2027 is a Friday, so the old behavior even pushed it on to 19/09/2027.
  it("dates the reported case from 15/09, not from the approval day", () => {
    const approvedOn = new Date("2026-09-17T20:19:00");
    expect(followUpDueDate("2026-09-15", 12, approvedOn)).toBe("2027-09-15");
    expect(followUpDueDate("2026-09-15", 6, approvedOn)).toBe("2027-03-15");
  });

  it("stays on the visit date when the job was reported or approved late", () => {
    expect(followUpDueDate("2026-09-07", 12, new Date("2026-10-01T09:00:00"))).toBe("2027-09-07");
  });

  it("follows the board date of a rescheduled job, never the day the request was opened", () => {
    // Request opened 20/08, scheduled on the board for 25/08 — only the board date is passed in.
    expect(followUpDueDate("2026-08-25", 12, approvalDay)).toBe("2027-08-25");
  });

  it("moves a Friday/Saturday due date to Sunday", () => {
    // 2027-03-12 is a Friday.
    expect(followUpDueDate("2026-09-12", 6, approvalDay)).toBe("2027-03-14");
  });

  it("clamps to the end of a shorter month instead of rolling over", () => {
    // 2027-02-28 is a Sunday.
    expect(followUpDueDate("2026-08-31", 6, approvalDay)).toBe("2027-02-28");
  });

  it("falls back to today when the job has no valid visit date", () => {
    expect(followUpDueDate(undefined, 2, approvalDay)).toBe("2026-11-15");
    expect(followUpDueDate("not-a-date", 2, approvalDay)).toBe("2026-11-15");
  });
});
