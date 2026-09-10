import type { Response } from "express";
import { Router } from "express";
import { nanoid } from "nanoid";
import { asyncHandler } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { ok, fail } from "../lib/apiResponse.js";
import {
  cookieOptions,
  createSession,
  csrfCookieName,
  csrfCookieOptions,
  destroySession,
  generateCsrfToken,
  getOrCreateDemoUser,
  sessionCookieName,
} from "../services/authService.js";
import { TwitchService } from "../services/twitchService.js";

// Routes that establish a session (there's no CSRF cookie to check yet, so
// these are mounted before the csrfProtection middleware in index.ts).
export const authPublicRouter = Router();

// Routes that require an existing, already-CSRF-protected session. Mounted
// after csrfProtection in index.ts.
export const authProtectedRouter = Router();

function establishSession(res: Response, userId: string) {
  return (async () => {
    const token = await createSession(userId);
    res.cookie(sessionCookieName, token, cookieOptions());
    res.cookie(csrfCookieName, generateCsrfToken(), csrfCookieOptions());
  })();
}

// GET /api/auth/status — tells the login page whether real Twitch OAuth or
// demo mode is available, so the client never has to guess.
authPublicRouter.get(
  "/status",
  asyncHandler(async (_req, res) => {
    ok(res, {
      twitchConfigured: TwitchService.isConfigured(),
      demoModeEnabled: process.env.DEMO_MODE !== "false",
    });
  }),
);

authPublicRouter.get(
  "/twitch",
  asyncHandler(async (req, res) => {
    const state = nanoid(16);
    res.cookie("predcon_oauth_state", state, { httpOnly: true, maxAge: 1000 * 60 * 10 });
    const url = TwitchService.getAuthorizeUrl(state);
    res.redirect(url);
  }),
);

authPublicRouter.get(
  "/twitch/callback",
  asyncHandler(async (req, res) => {
    const { code, state } = req.query as { code?: string; state?: string };
    const expectedState = req.cookies?.predcon_oauth_state as string | undefined;
    if (!code || !state || state !== expectedState) {
      return fail(res, 400, "OAUTH_STATE_MISMATCH", "Twitch login could not be verified.");
    }
    const user = await TwitchService.exchangeCode(code);
    await establishSession(res, user.id);
    res.redirect(process.env.APP_URL ?? "/");
  }),
);

// POST /api/auth/demo-login — used when Twitch credentials aren't
// configured (or the visitor picks "Try the demo") so every feature can be
// exercised without external auth.
authPublicRouter.post(
  "/demo-login",
  asyncHandler(async (_req, res) => {
    const user = await getOrCreateDemoUser();
    await establishSession(res, user.id);
    ok(res, user);
  }),
);

authProtectedRouter.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[sessionCookieName] as string | undefined;
    await destroySession(token);
    res.clearCookie(sessionCookieName, { path: "/" });
    res.clearCookie(csrfCookieName, { path: "/" });
    ok(res, { loggedOut: true });
  }),
);

export const meRouter = Router();

meRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, req.user);
  }),
);
