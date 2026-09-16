import { describe, expect, it } from "vitest";
import { Customer, Job } from "@/types";
import { jobMatchesPickerSearch } from "./jobPickerSearch";

const customer: Customer = {
  id: "customer-1",
  name: "ישראל ישראלי",
  phone: "0501234567",
  address: "הרצל 10",
  city: "חיפה",
  email: "",
  product: "",
  filterReplacementMonth: 1,
};

const baseJob: Job = {
  id: "job-1",
  type: "malfunction",
  status: "draft",
  priority: "medium",
  customerId: customer.id,
  estimatedDuration: 60,
  location: "הרצל 10",
  city: "חיפה",
  notes: "נזילה מתחת לכיור",
  createdAt: "2026-07-08",
};

describe("job picker search", () => {
  it("matches malfunctions by customer and job fields", () => {
    expect(jobMatchesPickerSearch(baseJob, customer, "ישראל")).toBe(true);
    expect(jobMatchesPickerSearch(baseJob, customer, "050123")).toBe(true);
    expect(jobMatchesPickerSearch(baseJob, customer, "חיפה")).toBe(true);
    expect(jobMatchesPickerSearch(baseJob, customer, "נזילה")).toBe(true);
  });

  it("matches installations by customer fields, location, and notes", () => {
    const installation: Job = {
      ...baseJob,
      id: "job-2",
      type: "installation",
      location: "בן יהודה 4",
      notes: "התקנת מערכת חדשה",
    };

    expect(jobMatchesPickerSearch(installation, customer, "הרצל")).toBe(true);
    expect(jobMatchesPickerSearch(installation, customer, "בן יהודה")).toBe(true);
    expect(jobMatchesPickerSearch(installation, customer, "מערכת")).toBe(true);
  });

  it("matches service jobs by customer name, task description, and city", () => {
    const service: Job = {
      ...baseJob,
      id: "job-3",
      type: "filter_replacement",
      city: "ירושלים",
      notes: "ביקור שירות | לא בוצע",
    };

    expect(jobMatchesPickerSearch(service, customer, "ישראל")).toBe(true);
    expect(jobMatchesPickerSearch(service, customer, "ביקור שירות")).toBe(true);
    expect(jobMatchesPickerSearch(service, customer, "ירושלים")).toBe(true);
  });

  it("excludes jobs that do not match the query", () => {
    expect(jobMatchesPickerSearch(baseJob, customer, "אשדוד")).toBe(false);
  });

  // The same person is stored under both word orders — see nameSearch.ts.
  describe("multi-word name queries", () => {
    const reversed: Customer = { ...customer, name: "אגסי נילי" };

    it("matches a customer name stored in the opposite word order", () => {
      expect(jobMatchesPickerSearch(baseJob, reversed, "נילי אגסי")).toBe(true);
    });

    it("matches the name carried on a calendar row with no customer record", () => {
      const calendarRow: Job = {
        ...baseJob,
        id: "job-4",
        type: "filter_replacement",
        customerName: "אגסי נילי",
      };

      expect(jobMatchesPickerSearch(calendarRow, undefined, "נילי אגסי")).toBe(true);
    });

    it("does not match when only one of the words is in the name", () => {
      const other: Customer = { ...customer, name: "נילי כהן" };
      expect(jobMatchesPickerSearch(baseJob, other, "נילי אגסי")).toBe(false);
    });

    it("does not combine a word from the name with a word from another field", () => {
      // "ישראל" is the name, "חיפה" the city — cross-field AND stays off.
      expect(jobMatchesPickerSearch(baseJob, customer, "ישראל חיפה")).toBe(false);
    });
  });
});
