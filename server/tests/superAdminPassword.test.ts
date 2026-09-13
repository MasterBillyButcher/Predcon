import { afterEach, describe, expect, it } from "vitest";
import { verifySuperAdminPassword } from "../src/services/authService.js";

describe("verifySuperAdminPassword", () => {
  const original = process.env.SUPER_ADMIN_PASSWORD;

  afterEach(() => {
    if (original === undefined) delete process.env.SUPER_ADMIN_PASSWORD;
    else process.env.SUPER_ADMIN_PASSWORD = original;
  });

  it("fails closed when SUPER_ADMIN_PASSWORD is not set", () => {
    delete process.env.SUPER_ADMIN_PASSWORD;
    expect(verifySuperAdminPassword("anything")).toBe(false);
    expect(verifySuperAdminPassword("")).toBe(false);
  });

  it("accepts the exact configured password", () => {
    process.env.SUPER_ADMIN_PASSWORD = "correct-horse-battery-staple";
    expect(verifySuperAdminPassword("correct-horse-battery-staple")).toBe(true);
  });

  it("rejects an incorrect password", () => {
    process.env.SUPER_ADMIN_PASSWORD = "correct-horse-battery-staple";
    expect(verifySuperAdminPassword("wrong-password")).toBe(false);
  });

  it("rejects a password differing only in length safely (no crash)", () => {
    process.env.SUPER_ADMIN_PASSWORD = "short";
    expect(verifySuperAdminPassword("a-much-longer-guess-entirely")).toBe(false);
    expect(verifySuperAdminPassword("")).toBe(false);
  });
});
