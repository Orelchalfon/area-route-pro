import { describe, expect, it } from "vitest";
import {
  ADMIN_USER_MIN_PASSWORD_LENGTH,
  validateAdminUserPassword,
} from "@/lib/adminUserValidation";

describe("admin user validation", () => {
  it("rejects passwords shorter than the admin minimum", () => {
    expect(validateAdminUserPassword("123456789")).toContain(
      String(ADMIN_USER_MIN_PASSWORD_LENGTH),
    );
  });

  it("accepts passwords that meet the admin minimum", () => {
    expect(validateAdminUserPassword("1234567890")).toBeNull();
  });
});
