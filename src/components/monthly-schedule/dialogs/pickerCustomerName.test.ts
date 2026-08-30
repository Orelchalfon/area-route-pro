import { describe, expect, it } from "vitest";
import {
  buildUniquePhoneCardIndex,
  resolvePickerCustomerName,
} from "./pickerCustomerName";
import { ongoingCustomerName } from "@/hooks/useOngoingServices";
import type { Customer, Job } from "@/types";

const customer = (over: Partial<Customer> & Pick<Customer, "id">): Customer => ({
  name: "ישראל ישראלי",
  phone: "",
  address: "",
  city: "",
  email: "",
  product: "",
  filterReplacementMonth: 1,
  ...over,
});

const job = (over: Partial<Job> = {}): Job =>
  ({
    id: "db-ongoing-abc",
    type: "filter_replacement",
    status: "draft",
    priority: "low",
    customerId: "db-ongoing-cust-abc",
    estimatedDuration: 20,
    location: "",
    city: "",
    notes: "",
    createdAt: "2026-09-13",
    ...over,
  }) as Job;

const card = customer({
  id: "db-cust-11111111-1111-1111-1111-111111111111",
  name: "אלי גרוסמן",
  phone: "0505264264",
});

describe("buildUniquePhoneCardIndex", () => {
  it("indexes a real card by its normalised phone", () => {
    const index = buildUniquePhoneCardIndex([card]);
    expect(index.get("0505264264")).toBe(card);
  });

  it("collapses the spellings the imported data uses", () => {
    const dashed = customer({ id: "db-cust-2", name: "רוני", phone: "050-700-2700" });
    expect(buildUniquePhoneCardIndex([dashed]).get("0507002700")).toBe(dashed);
  });

  // Spouses sharing one line are common in this data. Resolving to whichever row came
  // first would put a confidently wrong name on the row, which is worse than no name.
  it("drops a phone shared by more than one customer", () => {
    const a = customer({ id: "db-cust-a", name: "דן", phone: "0521234567" });
    const b = customer({ id: "db-cust-b", name: "רותי", phone: "052-123-4567" });
    expect(buildUniquePhoneCardIndex([a, b]).has("0521234567")).toBe(false);
  });

  it("ignores job-derived customers, which carry free-text names", () => {
    const derived = customer({ id: "db-malf-cust-x", name: "לקוח", phone: "0509999999" });
    expect(buildUniquePhoneCardIndex([derived]).size).toBe(0);
  });

  it("ignores a phone too short to be an identity", () => {
    const short = customer({ id: "db-cust-3", name: "מישהו", phone: "1234" });
    expect(buildUniquePhoneCardIndex([short]).size).toBe(0);
  });
});

describe("resolvePickerCustomerName", () => {
  const index = buildUniquePhoneCardIndex([card]);

  it("prefers the job's own customer record", () => {
    const linked = customer({ id: "db-cust-9", name: "שם מהכרטיס" });
    expect(resolvePickerCustomerName(job(), linked, index)).toBe("שם מהכרטיס");
  });

  // The regression: a calendar row has no customer record at all, so customers.find()
  // returned undefined and the picker rendered "—" for 716 of 725 rows in the שירות tab.
  it("falls back to a card whose phone uniquely matches", () => {
    const row = job({ phone: "0505264264", customerName: "אלי גרוסמן תלת" });
    expect(resolvePickerCustomerName(row, undefined, index)).toBe("אלי גרוסמן");
  });

  it("uses the name carried on the job when no phone matches", () => {
    const row = job({ phone: "0500000000", customerName: "יורם הראל -תלת" });
    expect(resolvePickerCustomerName(row, undefined, index)).toBe("יורם הראל -תלת");
  });

  it("uses the carried name when the row has no phone at all", () => {
    const row = job({ customerName: "יערה גייסמר חוץ" });
    expect(resolvePickerCustomerName(row, undefined, index)).toBe("יערה גייסמר חוץ");
  });

  it("never guesses from an ambiguous phone", () => {
    const a = customer({ id: "db-cust-a", name: "דן", phone: "0521234567" });
    const b = customer({ id: "db-cust-b", name: "רותי", phone: "0521234567" });
    const ambiguous = buildUniquePhoneCardIndex([a, b]);
    const row = job({ phone: "0521234567", customerName: "תיאור המשימה" });
    expect(resolvePickerCustomerName(row, undefined, ambiguous)).toBe("תיאור המשימה");
  });

  it("returns undefined only when there is no name anywhere", () => {
    expect(resolvePickerCustomerName(job(), undefined, index)).toBeUndefined();
  });
});

describe("ongoingCustomerName", () => {
  it("prefers a real customer_name", () => {
    expect(
      ongoingCustomerName({ customer_name: "אלי גרוסמן", task_description: "תלת מהדר" }),
    ).toBe("אלי גרוסמן");
  });

  // Calendar rows have no customer_name — the client is embedded in the description.
  it("falls back to the task description", () => {
    expect(
      ongoingCustomerName({ customer_name: null, task_description: "אלי גרוסמן תלת" }),
    ).toBe("אלי גרוסמן תלת");
  });

  it("has a last-resort label so a row is never nameless", () => {
    expect(ongoingCustomerName({ customer_name: null, task_description: null })).toBe(
      "ללא שם",
    );
  });
});
