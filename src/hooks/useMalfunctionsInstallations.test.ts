import { describe, expect, it } from "vitest";
import { InstRow, instToJobAndCustomer } from "./useMalfunctionsInstallations";

const baseInstallationRow: InstRow = {
  id: "11111111-1111-1111-1111-111111111111",
  customer_name: "לקוח התקנה",
  phone: "0501234567",
  city: "ירושלים",
  address: "רחוב 1",
  region: "ירושלים",
  product_type: "מערכת מים",
  installation_date: "2026-07-08",
  installation_time: "09:30",
  status: "draft",
  priority: "medium",
  notes: "הערה",
  sheet_row_id: "installations:1:center",
  source: "sheets",
  technician_id: null,
  scheduled_date: null,
  scheduled_time: null,
  estimated_duration: null,
  completion_status: null,
  completion_notes: null,
  created_at: "2026-07-01T08:00:00.000Z",
  updated_at: "2026-07-01T08:00:00.000Z",
};

describe("installation DB job mapping", () => {
  it("keeps installation_date as source metadata, not board assignment", () => {
    const { job } = instToJobAndCustomer(baseInstallationRow);

    expect(job.createdAt).toBe("2026-07-08");
    expect(job.scheduledDate).toBeUndefined();
    expect(job.scheduledTime).toBeUndefined();
  });

  it("maps scheduled_date as the actual board assignment", () => {
    const { job } = instToJobAndCustomer({
      ...baseInstallationRow,
      scheduled_date: "2026-07-15",
      scheduled_time: "11:00",
      technician_id: "tech-1",
    });

    expect(job.technicianId).toBe("tech-1");
    expect(job.scheduledDate).toBe("2026-07-15");
    expect(job.scheduledTime).toBe("11:00");
  });
});
