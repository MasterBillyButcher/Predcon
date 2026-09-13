import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import { timingSafeEqual } from "node:crypto";
import { usersRepo, sessionsRepo, type UserRow } from "../lib/repositories.js";
import type { AuthedUser } from "../types/index.js";

const SESSION_SECRET = process.env.SESSION_SECRET ?? "dev-only-insecure-secret-change-me";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const COOKIE_NAME = "predcon_session";
const CSRF_COOKIE_NAME = "predcon_csrf";

export const sessionCookieName = COOKIE_NAME;
export const csrfCookieName = CSRF_COOKIE_NAME;

// COOKIE_CROSS_SITE=true is required when the frontend and API are
// deployed on two different origins (e.g. a Vercel-hosted client calling a
// Render/Fly-hosted API directly, with no same-domain rewrite in front of
// it) — browsers never send a SameSite=Lax cookie on a cross-site fetch(),
// which would otherwise make login appear to silently fail in production.
// SameSite=None requires Secure, so this only ever applies over HTTPS.
const crossSite = process.env.COOKIE_CROSS_SITE === "true";
const sameSite = crossSite ? ("none" as const) : ("lax" as const);

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite,
    secure: crossSite || process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS,
    path: "/",
  };
}

// The CSRF cookie is deliberately NOT httpOnly — the client needs to read
// it (document.cookie) and echo it back as the X-CSRF-Token header. This is
// the standard double-submit-cookie pattern: a cross-site attacker can
// trigger our cookie to be sent automatically, but can't read its value to
// put in the header, so the header+cookie match proves the request came
// from our own frontend JS, not a forged cross-site form/fetch.
export function csrfCookieOptions() {
  return {
    httpOnly: false,
    sameSite,
    secure: crossSite || process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS,
    path: "/",
  };
}

export function generateCsrfToken(): string {
  return nanoid(32);
}

// Ensures a demo account exists and returns it. Demo mode lets the whole
// product be exercised — create, join, lock, resolve, overlay — with zero
// external credentials, per DEMO_MODE=true in .env. It's a regular USER by
// default; a Super Admin can still promote it like any other account.
export async function getOrCreateDemoUser(): Promise<AuthedUser> {
  const existing = usersRepo.findByUsername("demo_streamer");
  const user =
    existing ??
    usersRepo.create({
      username: "demo_streamer",
      displayName: "Demo Streamer",
      profileImageUrl: null,
      isDemo: true,
      role: "USER",
    });
  return toAuthedUser(user);
}

const SUPER_ADMIN_USERNAME = "super_admin";

// Verifies the fixed Super Admin password (SUPER_ADMIN_PASSWORD env var)
// with a timing-safe comparison, so response time can't be used to guess
// the password character-by-character. If the env var isn't set, this
// fails closed — there is no default password, ever.
export function verifySuperAdminPassword(candidate: string): boolean {
  const expected = process.env.SUPER_ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false; // timingSafeEqual requires equal-length buffers
  return timingSafeEqual(a, b);
}

// The Super Admin is a single, implicit account — there's exactly one,
// identified by a fixed username, created on first successful password
// login. Its role is force-set to SUPER_ADMIN on every login (not just
// creation) so it can never accidentally be left in a lesser role.
export async function getOrCreateSuperAdmin(): Promise<AuthedUser> {
  const existing = usersRepo.findByUsername(SUPER_ADMIN_USERNAME);
  const user =
    existing ??
    usersRepo.create({
      username: SUPER_ADMIN_USERNAME,
      displayName: "Super Admin",
      role: "SUPER_ADMIN",
    });
  if (user.role !== "SUPER_ADMIN") {
    usersRepo.updateRole(user.id, "SUPER_ADMIN");
  }
  return toAuthedUser({ ...user, role: "SUPER_ADMIN" });
}

export async function createSession(userId: string): Promise<string> {
  const token = nanoid(32);
  sessionsRepo.create(userId, token, new Date(Date.now() + SESSION_TTL_MS));
  return jwt.sign({ token }, SESSION_SECRET, { expiresIn: "7d" });
}

export async function resolveSession(jwtToken: string | undefined): Promise<AuthedUser | null> {
  if (!jwtToken) return null;
  try {
    const decoded = jwt.verify(jwtToken, SESSION_SECRET) as { token: string };
    const session = sessionsRepo.findByToken(decoded.token);
    if (!session || new Date(session.expiresAt) < new Date()) return null;
    const user = usersRepo.findById(session.userId);
    return user ? toAuthedUser(user) : null;
  } catch {
    return null;
  }
}

export async function destroySession(jwtToken: string | undefined): Promise<void> {
  if (!jwtToken) return;
  try {
    const decoded = jwt.verify(jwtToken, SESSION_SECRET) as { token: string };
    sessionsRepo.deleteByToken(decoded.token);
  } catch {
    // already invalid — nothing to clean up
  }
}

function toAuthedUser(user: UserRow): AuthedUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    profileImageUrl: user.profileImageUrl,
    isDemo: Boolean(user.isDemo),
    role: user.role,
  };
}
