import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// The live-location feature shipped with no table behind it: its SQL lived in the gitignored
// `sql/` folder and was never applied, so every manager load failed with PGRST205. This guards
// the replacement migration — location data about a real person, so the grants matter.
const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260826120000_add_technician_locations.sql"),
  "utf8",
);

describe("technician_locations migration", () => {
  it("creates the table the location hooks read and write", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.technician_locations");
    expect(migration).toContain("technician_id text PRIMARY KEY");
  });

  it("never leaves the table world-readable", () => {
    expect(migration).toContain("ALTER TABLE public.technician_locations ENABLE ROW LEVEL SECURITY");
    expect(migration).not.toContain("USING (true)");
    expect(migration).not.toContain("TO anon");
  });

  it("restricts reads to admins", () => {
    expect(migration).toMatch(/FOR SELECT TO authenticated\s+USING \(public\.is_admin\(\)\)/);
  });

  it("lets a technician write only their own row", () => {
    for (const verb of ["INSERT", "UPDATE", "DELETE"]) {
      expect(migration).toContain(`FOR ${verb} TO authenticated`);
    }
    // WITH CHECK is what stops one technician publishing a position under another's id.
    const withChecks = migration.match(/WITH CHECK \(technician_id = public\.current_technician_id\(\)\)/g);
    expect(withChecks).toHaveLength(2); // insert + update
  });

  it("publishes changes so the manager map reacts to 'stopped sharing'", () => {
    expect(migration).toContain("REPLICA IDENTITY FULL");
    expect(migration).toContain("ALTER PUBLICATION supabase_realtime ADD TABLE public.technician_locations");
  });
});
