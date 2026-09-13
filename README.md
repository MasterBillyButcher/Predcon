# PredCon

Create and manage interactive predictions for your stream. Inspired by the
public PredCon product (Twitch-style viewer predictions), rebuilt end-to-end
as a real, working full-stack app — not a mockup.

This README explains exactly what you need to install, configure, run,
build, test, and deploy the project, plus the handful of engineering
assumptions made where the reference product's internals weren't inspectable.

---

## 1. Project structure

```
predcon/
├── client/                      # React + TypeScript + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/          # AppShell, Sidebar, Topbar, MobileNav
│   │   │   ├── prediction/      # PredictionCard, Option, Timer, Controls, JoinPanel
│   │   │   └── ui/              # Button, Badge, Modal, Toast, Empty/Error/Loading states
│   │   ├── pages/                # One file per route (see §4)
│   │   ├── lib/                  # api client, socket hook, countdown hook, color tokens
│   │   ├── store/                 # zustand: auth, toasts
│   │   ├── types.ts
│   │   └── index.css              # Tailwind v4 + design tokens
│   └── vite.config.ts             # dev proxy to the API + websocket
│
├── server/                      # Node + TypeScript API
│   ├── src/
│   │   ├── routes/                # auth, predictions, overlay, me
│   │   ├── services/              # predictionService (state machine + lifecycle), authService, twitchService
│   │   ├── middleware/             # auth guard, centralized error handler
│   │   ├── websocket/               # Socket.IO wiring
│   │   ├── lib/                     # db, repositories, validation (zod), state machine, event bus
│   │   └── index.ts                 # app entry
│   ├── prisma/
│   │   ├── schema.prisma            # documented production schema (see §8)
│   │   ├── migrate.ts               # creates the local SQLite schema
│   │   └── seed.ts                  # demo data
│   └── tests/                       # vitest: state machine, validation, full lifecycle
│
├── package.json                  # root convenience scripts (dev/build/lint/test/db:*)
└── vercel.json                   # frontend deployment config
```

---

## 2. Technologies used

**Frontend:** React 19, TypeScript, Vite, React Router, Zustand, Tailwind CSS v4,
Socket.IO client, Lucide icons.

**Backend:** Node.js, TypeScript, Express, Socket.IO, Zod validation, JWT session
cookies, `better-sqlite3` as the runtime data layer (see §8 for why, and how to
swap to Prisma + Postgres for production).

**Fonts:** Montserrat (display/headlines), Roboto (body), Nunito (UI/controls) —
matching the reference product's typography.

---

## 3. Quick start

```bash
# from the repo root
npm run install:all      # installs server + client deps

cp server/.env.example server/.env
cp client/.env.example client/.env

npm run db:migrate       # creates the local SQLite schema
npm run db:seed          # seeds a demo account + sample predictions

npm run dev              # runs API (port 4000) + client (port 5173) together
```

Open http://localhost:5173, click **Try the demo**, and you're in — the demo
account already has one active prediction and some history. Everything in
the product (create, start, join, lock, resolve, history, overlay) works
without any external credentials.

Individual commands, if you'd rather run things separately:

```bash
npm install               # root dev deps (concurrently)
npm run install:all       # server + client deps
npm run dev                # both, concurrently
npm run build               # both, production build
npm run start                 # runs the built server (client is served separately, see §9)
npm run lint                   # server (eslint) + client (oxlint)
npm run test                    # server test suite (vitest)
npm run db:migrate                # create/update the SQLite schema
npm run db:seed                     # seed demo data
```

---

## 4. Routes

| Route | Description | Access |
|---|---|---|
| `/` | Dashboard — live prediction, stats, recent activity | Public |
| `/predict` | Main prediction console | Public |
| `/predict/create` | Prediction creation flow | Admin / Super Admin |
| `/predict/active` | Manage the currently running prediction | Public to view; controls only for Admin+ |
| `/predict/history` | Search/filter/sort past predictions | Public |
| `/predict/:id` | Prediction detail | Public |
| `/predict/:id/edit` | Edit a DRAFT prediction before it goes live | Admin / Super Admin |
| `/settings` | Account info, Twitch connection, overlay link builder, and (Super Admin only) user management | Signed in |
| `/login` | Twitch OAuth, demo sign-in, or Super Admin password | Public |
| `/callback/twitch` | Twitch OAuth callback landing page | Public |
| `/overlay/:id` | Unauthenticated OBS browser-source view | Public |
| `/404` | Not found | Public |

---

## 5. Environment variables

### `server/.env`

```bash
DATABASE_URL="file:./dev.db"          # SQLite locally; see §8 to swap to Postgres
SESSION_SECRET="replace-with-a-long-random-string"
SUPER_ADMIN_PASSWORD=                  # required for the Super Admin login button to work at all

TWITCH_CLIENT_ID=                      # leave blank to run in demo mode
TWITCH_CLIENT_SECRET=
TWITCH_REDIRECT_URI="http://localhost:4000/api/auth/twitch/callback"

PORT=4000
APP_URL="http://localhost:5173"
DEMO_MODE=true
NODE_ENV=development
COOKIE_CROSS_SITE=false                # "true" only for a two-origin deployment, see §9
```

### `client/.env`

The client needs **no environment variables at all** — it talks to the API
through Vite's dev proxy locally, and through whatever reverse proxy/rewrite
serves both under one origin in production (see §9). `client/.env.example`
exists as a placeholder for the day it does need one.

---

## 6. Access model: public viewing, roles, and Super Admin

PredCon is a shared, site-wide platform, not a personal dashboard per
account. Access is role-based:

| Who | Can view predictions | Can join/vote | Can create/start/lock/resolve/cancel/edit | Can promote/demote users |
|---|---|---|---|---|
| **Logged out (public)** | ✅ | ❌ | ❌ | ❌ |
| **USER** (Twitch or demo login) | ✅ | ✅ | ❌ | ❌ |
| **ADMIN** | ✅ | ✅ | ✅ | ❌ |
| **SUPER_ADMIN** | ✅ | ✅ | ✅ | ✅ |

Anyone can load the site and watch predictions update live — no account
needed. Joining a prediction requires signing in (Twitch or the demo
account) as a **USER**. Creating and managing predictions requires **ADMIN**
or higher. There is exactly one **SUPER_ADMIN** account, reached via a
fixed password (`SUPER_ADMIN_PASSWORD` — see §5), not Twitch OAuth, and it's
the only role that can promote another signed-in account to Admin or demote
it back, from Settings → User management.

This is enforced twice, independently: the UI hides actions a role can't
perform (`RequireRole`, `PredictionControls`, `JoinPanel`), and the API
rejects them again server-side regardless of what the UI shows
(`requireRole` middleware on every write route) — the UI hiding a button is
a convenience, not the actual security boundary. Verified end-to-end with
live HTTP calls: a public GET succeeds with no session at all; a signed-in
USER gets `403 FORBIDDEN` attempting to create a prediction; the Super
Admin can promote that same account to Admin, after which it can manage
*any* prediction on the platform (not just ones it created); demoting it
immediately blocks management actions again.

---

## 7. Demo mode

`DEMO_MODE=true` (the default) lets the whole product run without Twitch
credentials. `/login` shows a **Try the demo** button that signs the visitor
into a seeded `demo_streamer` account. Every feature works from there:
create, start, join (as the same account, standing in for a viewer), lock,
resolve, history, and the OBS overlay.

Once `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, and `TWITCH_REDIRECT_URI`
are set, `/login` also offers **Continue with Twitch**, which runs the real
OAuth flow (`server/src/services/twitchService.ts`) and links the streamer's
actual Twitch identity.

**A note on demo data durability:** on a free-tier host with no persistent
disk (the default `render.yaml` config — see §9), the SQLite file is wiped
and re-seeded on every redeploy. Anything created live in a demo session
(an entry, a resolved prediction) does not survive that. Rather than hide
this, the app surfaces it directly — any signed-in demo account sees a
dismissible banner (`DemoDataBanner`) saying so. `render.yaml` documents,
in comments, exactly what to change (plan + a mounted disk) if you want
data to actually persist instead.

---

## 8. Database — an implementation note worth reading

The spec calls for Prisma + Postgres, and that's exactly what's documented
in `server/prisma/schema.prisma` — every model (`User`, `Prediction`,
`PredictionOutcome`, `PredictionParticipant`, `PredictionEvent`, `Session`),
relationship, and index is defined there as the intended production schema.

**What actually runs in this delivery** is a small hand-written repository
layer over `better-sqlite3` (`server/src/lib/db.ts` + `repositories.ts`),
mirroring that schema table-for-table and field-for-field. This was a
deliberate substitution made during development: Prisma's CLI needs to
download a native query-engine binary from `binaries.prisma.sh` on first
`generate`/`migrate`, and the sandboxed environment this project was built
in blocks that specific domain — a constraint of that build environment,
not of Prisma or of your machine. On a normal developer machine, CI runner,
or production host with standard outbound internet access, real Prisma
works exactly as expected.

**To swap back to Prisma + Postgres:**

1. `npm install @prisma/client && npm install -D prisma` in `server/`.
2. In `server/prisma/schema.prisma`, change the datasource `provider` from
   `"sqlite"` to `"postgresql"` and point `DATABASE_URL` at your Postgres
   instance.
3. Run `npx prisma generate && npx prisma migrate dev`.
4. Replace the imports in `services/predictionService.ts`,
   `services/authService.ts`, and `services/twitchService.ts` from
   `../lib/repositories.js` to calls on a generated `PrismaClient` — the
   function names and shapes in `repositories.ts` were written to mirror
   what Prisma's generated client looks like, so this is a mechanical
   swap, not a redesign.

Everything else — routes, state machine, validation, realtime, tests — is
unaffected by which data layer is underneath.

---

## 9. Deployment

**Vercel alone cannot host this whole app.** The frontend (static Vite
build) deploys to Vercel fine. The backend cannot: Vercel's backend runtime
is stateless serverless functions, and this API relies on a local SQLite
file, in-memory lock/expire timers, and a persistent Socket.IO connection —
none of which survive a serverless function being recycled between
requests. The backend needs a real, always-on Node process (Render, Fly.io,
Railway, or a VPS all work unchanged — `npm run build && npm run start` in
`server/`).

That means frontend and backend end up on two different hosts/domains,
which has one consequence worth being explicit about: **session cookies
don't cross origins by default.** The API's session cookie is
`SameSite=Lax`, which browsers refuse to send on a cross-site `fetch()` —
fine when frontend and API share an origin, silently broken otherwise (login
would appear to just not work). Pick one of these two deployment shapes:

### Option A — same-origin via rewrite (recommended, no cookie config needed)
Keep `vercel.json`'s `/api/*` rewrite pointed at your deployed API. From the
browser's perspective, `predcon.vercel.app/api/...` is same-origin even
though Vercel is proxying it to a different host behind the scenes, so the
default `SameSite=Lax` cookie works unchanged. The one thing I have **not**
been able to verify in this environment is whether Vercel's rewrite
proxying carries a WebSocket upgrade (`/socket.io`) the same way it carries
plain HTTP — test this after deploying; if realtime updates don't arrive
through the rewritten path, fall back to Option B or point
`client/src/lib/socket.ts` at the API's direct URL instead of a relative
path.

### Option B — two separate origins, no rewrite
Point the client directly at the API's own URL (no `/api` rewrite) and set
**`COOKIE_CROSS_SITE=true`** in the API's environment. This switches both
the session and CSRF cookies to `SameSite=None; Secure` (verified: tested
both modes locally and confirmed the `Set-Cookie` headers switch correctly).
`Secure` is required by browsers for `SameSite=None` and is forced on
automatically in this mode, so it works over HTTPS regardless of
`NODE_ENV`.

**Steps (Option A, the simpler path):**
1. Deploy `server/` to your Node host. Set the env vars from §5 there
   (including production `TWITCH_*` values, a strong `SESSION_SECRET`, and
   `SUPER_ADMIN_PASSWORD` — without it, the Super Admin login always fails).
   Leave `COOKIE_CROSS_SITE` unset/`false`.
2. Point `APP_URL` at your deployed frontend origin (for CORS + OAuth
   redirect).
3. Update `vercel.json`'s rewrite destination to your API's real URL, then
   deploy `client/` to Vercel.
4. In the Twitch Developer Console, set your app's OAuth redirect URL to
   `https://your-api-domain/api/auth/twitch/callback`, matching
   `TWITCH_REDIRECT_URI`.
5. Open `/overlay/:id?theme=dark&transparent=true` as a Browser Source in
   OBS for any prediction ID (find it on a prediction's detail page or via
   Settings → OBS overlay).

A multi-instance backend deployment would additionally need to move the
in-memory timers in `predictionService.ts` to a durable job queue; that's
flagged in a comment at the top of that file and not implemented here.

---

## 10. Testing

```bash
npm run test
```

Runs both suites:
- **Server** (vitest): state-machine transition rules, Zod validation edge
  cases, a full integration pass (create → start → join → lock → resolve,
  plus rejected duplicate/out-of-bounds cases, and the PATCH-based draft
  edit flow) against a real temporary SQLite database, the `requireRole`
  middleware's role-gating logic, and the Super Admin password check
  (correct/incorrect/unset, and safe handling of mismatched lengths). 33
  tests.
- **Client** (vitest + React Testing Library + jest-axe): the creation
  form's validation UI, `PredictionCard` across every role × status
  combination (logged-out, USER, ADMIN, SUPER_ADMIN — confirming who does
  and doesn't see join/management controls), `RequireRole`'s three states
  (loading, sign-in-required, wrong-role), the login page's demo/Twitch/
  Super-Admin states, and an automated accessibility pass (axe-core, run
  against jsdom) on the login page, creation form, prediction card, and
  confirm modal. 33 tests.

66 tests total, all passing as delivered. Beyond the automated suite, the
entire role/permission model was also verified with live HTTP calls against
a running server — public read access with no session, a USER blocked
(403) from management routes, Super Admin login (and rejection of a wrong
password), promoting a user to Admin and confirming it can then manage
*any* prediction on the platform (not just its own), and demotion
immediately revoking that access again.

The accessibility pass is structural (unlabeled controls, invalid ARIA,
missing landmarks) — it doesn't replace a real screen-reader or
contrast-rendering pass, since that needs an actual browser, which this
build environment couldn't provision (see §12).

---

## 11. Security notes

- Sessions are httpOnly cookies, `SameSite=Lax` by default (`SameSite=None`
  when `COOKIE_CROSS_SITE=true`, for a two-origin deployment — see §9) —
  not readable from JS, not sent on cross-site requests in the default mode.
- CSRF: double-submit cookie pattern. `server/src/middleware/csrf.ts`
  requires an `X-CSRF-Token` header matching a non-httpOnly `predcon_csrf`
  cookie on every mutating request; the client (`lib/api.ts`) attaches it
  automatically. The routes that establish a session in the first place
  (demo-login, Twitch OAuth start/callback) are mounted before this
  middleware, since there's no CSRF cookie to check until a session exists.
- Rate limiting is applied to all of `/api` (120 req/min/IP by default —
  tune `server/src/index.ts` for your traffic). `/api/auth/super-admin-login`
  has its own stricter limit (10 attempts/15min/IP) since it's a
  password-guessing surface, separate from the general limiter.
- Role checks (`requireRole` in `server/src/middleware/auth.js`) gate every
  write route independently of the client — the UI hiding a button (e.g.
  a viewer never seeing "Lock now") is a convenience, not the actual
  security boundary. Verified live: a signed-in USER hitting a management
  endpoint directly gets `403 FORBIDDEN` regardless of what the UI shows.
- `SUPER_ADMIN_PASSWORD` is compared with a timing-safe comparison
  (`crypto.timingSafeEqual`) and fails closed (always rejects) if the env
  var isn't set — there is no default or blank password, ever.
- `TWITCH_CLIENT_SECRET` and access/refresh tokens never leave
  `twitchService.ts` — nothing that touches them is imported by anything
  shipped to the browser.

---

## 12. Known assumptions

The reference deployment (`twitch-predcon-frntend-v2.vercel.app`) is a
built, minified CRA SPA — its rendered UI, exact copy, and pixel-level
layout weren't inspectable through automated fetching in the environment
this was built in (it serves a JS-only shell; static asset paths mentioned
in the brief weren't independently fetchable either, and this build
environment also couldn't provision a real headless browser — Playwright's
browser download and the apt packages it depends on are both blocked by
this sandbox's network policy, which is why the accessibility pass in §10 is
axe-on-jsdom rather than a full browser-based pass, and why there's been no
visual/responsive QA against real rendered screenshots at any breakpoint).
What was confirmed directly: the site is a Create React App production
build, its theme color is black, and it uses Roboto/Montserrat/Nunito.
Everything else — layout, component boundaries, the two-outcome color
language, the broadcast-tool visual direction — follows standard
Twitch-prediction UX patterns and the detailed functional spec provided,
rather than a pixel copy of an unreachable design. If you can share
screenshots or exported CSS from the reference site, the design tokens in
`client/src/index.css` and the component layer in `client/src/components/`
are centralized enough to retarget quickly.

Other assumptions:
- **One entry per user per prediction**, matching standard Twitch
  Prediction behavior — no changing your pick after joining.
- **Auto-lock** fires when the countdown reaches zero; a **LOCKED**
  prediction left unresolved for 10 minutes **auto-expires**, so a forgotten
  prediction can't block a creator's history/active view forever.
- The **demo account also acts as the "viewer"** joining its own
  predictions, since demo mode has no separate viewer identities. Real
  Twitch-authenticated viewers would each get their own session.
- `qs`/`express` currently has a known moderate advisory upstream
  (see `npm audit` in `server/`) with no non-breaking fix published yet at
  time of writing — worth re-running `npm audit fix` before going to
  production.
