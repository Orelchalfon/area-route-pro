import { describe, expect, it } from "vitest";
import { filterEligibleCustomers } from "./utils";
import { makeFilterJobId } from "@/lib/idConventions";
import type { Customer, Job } from "@/types";

const customer = (id: string, over: Partial<Customer> = {}): Customer => ({
  id,
  name: "לקוח",
  phone: "",
  address: "",
  city: "נתניה",
  email: "",
  product: "",
  filterReplacementMonth: 8,
  ...over,
});

const filterJob = (customerId: string): Job =>
  ({
    id: makeFilterJobId(2026, 8, customerId),
    type: "filter_replacement",
    status: "confirmed",
    priority: "low",
    customerId,
    estimatedDuration: 20,
    location: "",
    city: "נתניה",
    notes: "",
    createdAt: "2026-08-01",
    technicianId: "t1",
    scheduledDate: "2026-08-20",
  }) as Job;

const active = customer("db-cust-active", { isActive: true });
const deleted = customer("db-cust-deleted", { isActive: false });

describe("filterEligibleCustomers", () => {
  it("returns the list untouched when nobody is soft-deleted", () => {
    const all = [active, customer("db-cust-2")];
    // Same array identity, so the caller's useMemo does no work in the common case.
    expect(filterEligibleCustomers(all, [])).toBe(all);
  });

  it("stops generating new filter reminders for a soft-deleted customer", () => {
    const out = filterEligibleCustomers([active, deleted], []);
    expect(out.map(c => c.id)).toEqual(["db-cust-active"]);
  });

  // The regression this guards: filter jobs are persisted in scheduled_filter_services
  // keyed by job_key === the synthetic filter-{year}-{month}-{customerId} id, and they only
  // render while generateFilterJobs still emits that id. Dropping a soft-deleted customer
  // outright would erase an already-planned stop from a technician's day.
  it("keeps a soft-deleted customer whose filter job is already scheduled", () => {
    const out = filterEligibleCustomers([active, deleted], [filterJob(deleted.id)]);
    expect(out.map(c => c.id)).toEqual(["db-cust-active", "db-cust-deleted"]);
  });

  it("ignores non-filter jobs when deciding what to keep", () => {
    const malfunction = { ...filterJob(deleted.id), id: "db-malf-abc" } as Job;
    const out = filterEligibleCustomers([active, deleted], [malfunction]);
    expect(out.map(c => c.id)).toEqual(["db-cust-active"]);
  });

  // Job-derived customers carry no flag at all and must never be dropped.
  it("keeps customers that carry no active flag", () => {
    const derived = customer("db-malf-cust-abc");
    const out = filterEligibleCustomers([derived, deleted], []);
    expect(out.map(c => c.id)).toEqual(["db-malf-cust-abc"]);
  });
});
