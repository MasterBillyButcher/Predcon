import type { NextFunction, Request, Response } from "express";
import { resolveSession, sessionCookieName } from "../services/authService.js";
import { fail } from "../lib/apiResponse.js";
import type { UserRole } from "../types/index.js";

export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[sessionCookieName] as string | undefined;
  const user = await resolveSession(token);
  if (user) req.user = user;
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return fail(res, 401, "UNAUTHENTICATED", "Sign in to continue.");
  }
  next();
}

// Gate a route to specific roles. Always pair with requireAuth (or put it
// after requireAuth in the chain) — this only checks the role of a user
// that's already been attached; it does not itself verify a session exists.
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return fail(res, 401, "UNAUTHENTICATED", "Sign in to continue.");
    }
    if (!roles.includes(req.user.role)) {
      return fail(res, 403, "FORBIDDEN", "You don't have permission to do that.");
    }
    next();
  };
}
