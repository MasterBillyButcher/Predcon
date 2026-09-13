import { describe, expect, it, vi } from "vitest";
import { requireRole } from "../src/middleware/auth.js";
import type { Request, Response } from "express";

function mockReqRes(role: string | null) {
  const req = { user: role ? { id: "u1", role } : undefined } as unknown as Request;
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const res = { status } as unknown as Response;
  const next = vi.fn();
  return { req, res, next, status, json };
}

describe("requireRole middleware", () => {
  it("calls next() when the user has an allowed role", () => {
    const { req, res, next } = mockReqRes("ADMIN");
    requireRole("ADMIN", "SUPER_ADMIN")(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("rejects with 403 when the user's role isn't allowed", () => {
    const { req, res, next, status, json } = mockReqRes("USER");
    requireRole("ADMIN", "SUPER_ADMIN")(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it("rejects with 401 when there's no user at all", () => {
    const { req, res, next, status } = mockReqRes(null);
    requireRole("ADMIN")(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(401);
  });

  it("allows SUPER_ADMIN through a USER-or-ADMIN gate only if explicitly listed", () => {
    const { req, res, next } = mockReqRes("SUPER_ADMIN");
    requireRole("USER")(req, res, next); // SUPER_ADMIN is not automatically "any role" — must be listed
    expect(next).not.toHaveBeenCalled();
  });
});
