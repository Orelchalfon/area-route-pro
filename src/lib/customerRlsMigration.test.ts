import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260708120000_restrict_employee_customer_reads.sql"),
  "utf8",
);

describe("employee customer RLS migration", () => {
  it("removes unrestricted employee customer reads", () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "customers employee read"');
    expect(migration).not.toContain("USING (true)");
  });

  it("limits employee customer reads to assigned service references", () => {
    expect(migration).toContain("public.ongoing_services");
    expect(migration).toContain("public.scheduled_filter_services");
    expect(migration).toContain("public.current_technician_id()");
    expect(migration).toContain("replace(os.customer_id, 'db-cust-', '') = customers.id::text");
    expect(migration).toContain("replace(sfs.customer_id, 'db-cust-', '') = customers.id::text");
  });
});
