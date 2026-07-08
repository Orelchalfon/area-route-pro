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
});
