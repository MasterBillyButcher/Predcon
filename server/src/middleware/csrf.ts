import type { NextFunction, Request, Response } from "express";
import { csrfCookieName } from "../services/authService.js";
import { fail } from "../lib/apiResponse.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Double-submit-cookie CSRF check. Applied globally after attachUser; the
 * few routes that establish a session before a CSRF cookie exists
 * (demo-login, the Twitch OAuth start/callback pair) are mounted before
 * this middleware so they're exempt — there's no session to forge yet at
 * that point. Every other state-changing request under /api must echo the
 * CSRF cookie's value back in the X-CSRF-Token header.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();

  const cookieToken = req.cookies?.[csrfCookieName] as string | undefined;
  const headerToken = req.header("x-csrf-token");

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return fail(res, 403, "CSRF_VALIDATION_FAILED", "This request could not be verified. Please refresh and try again.");
  }
  next();
}
