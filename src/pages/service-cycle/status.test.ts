import { describe, expect, it } from "vitest";
import { isServiceDone, statusClass, statusText } from "./status";

describe("service-cycle status", () => {
  it("prefers technician completion_status over calendar is_done", () => {
    // A technician "בוצע" shows done even if the calendar column is still null.
    expect(statusText({ completion_status: "done", is_done: null })).toBe("בוצע");
    expect(statusText({ completion_status: "not_done", is_done: null })).toBe(
      "לא בוצע",
    );
    expect(statusText({ completion_status: "need_return", is_done: null })).toBe(
      "צריך לחזור",
    );
  });

  it("maps each completion_status to its color family", () => {
    expect(statusClass({ completion_status: "done", is_done: null })).toContain(
      "green",
    );
    expect(
      statusClass({ completion_status: "need_return", is_done: null }),
    ).toContain("amber");
    expect(
      statusClass({ completion_status: "not_done", is_done: null }),
    ).toContain("red");
  });

  it("falls back to calendar-synced is_done / status_label when no completion_status", () => {
    expect(statusText({ completion_status: null, is_done: true })).toBe("בוצע");
    expect(statusText({ completion_status: null, is_done: false })).toBe(
      "לא בוצע",
    );
    expect(
      statusText({ completion_status: null, is_done: false, status_label: "בוטל" }),
    ).toBe("בוטל");
    expect(statusClass({ completion_status: null, is_done: true })).toContain(
      "green",
    );
    expect(statusClass({ completion_status: null, is_done: false })).toContain(
      "red",
    );
  });

  it("isServiceDone counts technician-done and calendar-done, not need_return/not_done", () => {
    expect(isServiceDone({ completion_status: "done", is_done: null })).toBe(true);
    expect(isServiceDone({ completion_status: null, is_done: true })).toBe(true);
    expect(isServiceDone({ completion_status: "need_return", is_done: null })).toBe(
      false,
    );
    expect(isServiceDone({ completion_status: "not_done", is_done: false })).toBe(
      false,
    );
    expect(isServiceDone({ completion_status: null, is_done: null })).toBe(false);
  });
});
