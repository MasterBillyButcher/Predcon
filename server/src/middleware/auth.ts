import type { NextFunction, Request, Response } from "express";
import { resolveSession, sessionCookieName } from "../services/authService.js";
import { fail } from "../lib/apiResponse.js";

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
