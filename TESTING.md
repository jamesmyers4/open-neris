# Testing

Living doc for how this repo's test suite actually works. For the phased plan this suite is being built against, see `TEST-PLAN.md`; for the process that produced that plan, see `TEST-PLAN-CONTEXT.md`.

## Two suites

- **`npm run test`** — Vitest, fast, no external dependencies. Pure functions, Zod schemas, and server actions called directly with mocked auth/DB. Runs on every PR (`.github/workflows/test.yml`).
- **`npm run test:db`** — Vitest, real Postgres via Testcontainers. DB-direct tests (constraints, cascades, the raw-SQL internal-ID counter) and multi-action journeys chained through a real migrated database. Requires **Docker running locally**. Runs nightly, not per-PR (`.github/workflows/test-db.yml`) — spinning up a container on every push is unnecessary overhead for a solo-dev repo at this stage.

`npm run test:watch` runs the fast suite in watch mode.

File convention: DB-backed tests end in `*.db.test.ts` (matched only by `vitest.db.config.ts`); everything else ending in `*.test.ts` runs in the fast suite.

## Why no supertest

There are no `route.ts` API handlers in this app — every mutation is a Next.js Server Action, called directly from a form, not over HTTP. "Integration test" here means importing the exported action function and calling it with a constructed `FormData`, not an HTTP round-trip. If a real HTTP handler is ever added (a NERIS webhook receiver, a health check), that's the point to reconsider supertest.

## Test helpers (`test/helpers/`)

- **`db.ts`** — `startTestDatabase()` / `stopTestDatabase()`. Spins up a throwaway `postgres:17-alpine` container, runs `prisma migrate deploy` against it (invoking the Prisma CLI's JS entrypoint directly via `node`, not the `npx`/`prisma` shell shim — sidesteps a Windows `.cmd`-spawning issue), and returns a `PrismaClient` wired to it via `@prisma/adapter-pg`. This is a fresh client, not the app's `lib/prisma.ts` singleton (which binds to `DATABASE_URL` at import time, before a container exists). `vitest.db.config.ts` disables file parallelism, since each file spinning up its own container isn't meant to run concurrently against a single shared one.

- **`auth.ts`** — `buildFakeUser()`, `mockSignedInAs()`, `mockSignedOut()` for `getCurrentAppUser()`, which almost every server action checks as its first line. **Caller must `vi.mock('@/lib/auth/current-user')` in the test file itself before importing these** — `vi.mock` is hoisted per-file, so it can't be done inside a shared helper:

  ```ts
  import { vi, describe, it, expect, beforeEach } from 'vitest'
  vi.mock('@/lib/auth/current-user')
  import { mockSignedInAs, mockSignedOut, buildFakeUser } from '@/test/helpers/auth'
  ```

- **`prisma-mock.ts`** — `createPrismaMock()` builds a hand-rolled mock (not a deep-mock library) covering exactly the `prisma.*` calls the 9 `actions.ts` files make, including a `$transaction` that handles both call shapes used in this codebase: the batch array form (`submitIncident`) and the interactive callback form (`createIncident`, where the callback receives the same mock as `tx`). Used for Phase 3's fast, no-container server-action tests.

- **`fixtures.ts`** — `buildIncidentDetail()`, typed directly against `IncidentDetail`. Doubles as the mocked return value for `prisma.incident.findFirst` in server-action tests that go through `getIncidentDetail` (e.g. `submitIncident`), not just Phase 1's pure-function tests.

- **`journey.ts`** — `setupCallerContext(prisma)`, `createAndGetIncidentId(createIncident, formData)`, `typesFormData(value1, value2?)`. Shared by every DB-backed test file that drives real server actions end to end through a Testcontainers Postgres instance (`incident-journey.db.test.ts`, `concurrent-writes.db.test.ts`). Extracted during Phase 6's self-review after the same two helpers turned up independently, near-identically, in both files — see "Phase 6" below. Takes `prisma`/the action function as parameters rather than importing them itself, since each caller's own `beforeAll` still has to do the `DATABASE_URL`-then-dynamic-import dance below before either is available.

## Multi-action journey tests (Phase 4, `test/db/incident-journey.db.test.ts`)

These chain several *real* server actions against a real Testcontainers-backed Postgres — no mocked `prisma` — to exercise a full incident lifecycle the way Phase 3's per-action tests can't. Getting a real DB into a real action required extra care beyond Phase 2's DB tests:

- **`getCurrentAppUser` must be mocked with an explicit factory, not the bare auto-mock form.** `vi.mock('@/lib/auth/current-user')` (no factory) needs to import the *real* module once to derive its shape for auto-mocking — which also evaluates the real `lib/prisma.ts` singleton, binding it to whatever `DATABASE_URL` happens to be set at that early point (before the container exists). Confirmed empirically. Use `vi.mock('@/lib/auth/current-user', () => ({ getCurrentAppUser: vi.fn() }))` instead — a full replacement that never touches the real module — and `test/helpers/auth.ts`'s `mockSignedInAs`/`mockSignedOut` work unchanged against it.
- **Every action module must be imported dynamically, inside `beforeAll`, after setting `process.env.DATABASE_URL` to the container's connection string** — not as a static top-level `import`. `lib/prisma.ts` reads `DATABASE_URL` once, at its own first import, and Node's module cache means the first import wins for the lifetime of that test file's module registry. Confirmed working end-to-end (a dynamically-imported `lib/prisma` singleton querying rows created by the separate `test/helpers/db.ts` client, same container) before writing the full journey test.
- `beforeAll` also clears `globalThis.prisma` before setting `DATABASE_URL` — defensive, since `lib/prisma.ts`'s dev-mode hot-reload cache keys off `globalThis`, not a module-local variable.
- The real `redirect()`/`revalidatePath()` gotcha above still applies here (`vitest.db.config.ts` now also loads `test/setup.ts`), so a created incident's ID is recovered from the mocked `redirect` call's path argument, not a thrown signal.
- **`getSubmitCompleteness` is not mocked here** (unlike Phase 3) — the journey test needs the real completeness gate to reject a genuinely-incomplete real incident and accept a genuinely-complete one, which is the actual thing this phase is testing.
- One test (`TODO_pending_sections_2_7_completeness_gate` in the `type-gating path` describe block) is a **deliberate tripwire, not documentation**: `getSubmitCompleteness` currently tags every check `'core'`, so the submit gate doesn't yet differ by incident type at all — Sections 2-7's required-schemas (Fire/Medical/HazSit/etc.) were never wired in. The test asserts today's actual (identical) behavior. When Sections 2-7 required fields do get wired into the gate, this test **should** start failing — that's a signal the gate genuinely changed, not a regression — and it should be updated to assert the new differing behavior, not "fixed" by reverting the gate.

## Phase 5 — edge, negative, and boundary cases

Three sub-areas per `TEST-PLAN.md`, each in its own new files rather than appended to earlier phases' files, to keep phase boundaries legible in git history:

- **Schema boundary values** (`test/lib/validation/*.edge.test.ts`) — whitespace-only required strings, exact length/count boundaries, duplicate-entry/no-max-enforced characterizations, non-string inputs. Several of these document current *permissive* behavior (e.g. `min(1)` fields accept `"   "` since nothing trims) rather than assuming a stricter rule the schema doesn't actually implement — confirmed by running each assertion, not inferred from the field name.
- **Malformed/partial FormData per action** (`test/app/**/actions.formdata-edge.test.ts`, one new file per existing `actions.test.ts`) — the three-way split from the phase plan (key entirely absent / present-but-empty / explicit `null`) collapses to two distinct states for FormData-backed fields in practice: `FormData.get(key)` returns `null` for an absent key (indistinguishable from an explicit JS `null`), and `''` for present-but-empty. Tests target where the action's own parsing (`|| undefined`, `? x : undefined`, `getAll`, raw pass-through) makes these states diverge in a way worth locking in.
- **Concurrent-write races beyond the internalId counter** (`test/db/concurrent-writes.db.test.ts`) — two simultaneous `updateDispatch` calls, and a double-submit race on `submitIncident`, run against a real Testcontainers Postgres (not mocks), since real interleaving is the actual thing being tested.
- **Cross-department id-guessing, deepened** (`test/db/cross-department-boundary.db.test.ts`) — re-runs Phase 3's per-action tenant-isolation intent against **real** rows in two real departments (Phase 3 proved the *shape* of the guard against a mock; this proves the *effect* holds against genuine adjacent data), plus a same-department, different-incident nested-row case for `removeActionTaken`'s `actionTakenId`. No soft-deleted-equivalent state exists anywhere in `prisma/schema.prisma` (no `deletedAt`/`isDeleted`/`archivedAt` on any model) — confirmed by grep, not assumed — so that sub-case from the phase plan doesn't apply to this app.

### Findings flagged in Phase 5, fixed in Phase 7

Two real instances of the same root cause, found empirically (not assumed) while writing the malformed-FormData tests — both were characterized-not-fixed in Phase 5, then fixed in Phase 7 per `TEST-PLAN.md`'s explicit "fix both" decision:

- **`z.coerce.date()` coerces `null` to the Unix epoch instead of failing.** Confirmed empirically: Zod's coercion calls `new Date(x)`, and `new Date(null)` evaluates to `1970-01-01T00:00:00.000Z` (via `ToNumber(null) === 0`), not an `Invalid Date`. Every other date field in this codebase is read as `formData.get(...) || undefined`, which converts the absent-key `null` to `undefined` before it reaches the schema — sidestepping this entirely. Two call sites didn't have that guard:
  - `app/incidents/actions.ts`'s `createIncident` — `alarmTime: formData.get('alarmTime')`. **Fixed**: now `alarmTime: formData.get('alarmTime') || undefined`.
  - `app/incidents/[id]/dispatch/actions.ts`'s `addDispatchComment` — `timestamp: formData.get('timestamp')`. **Fixed**: now `timestamp: formData.get('timestamp') || undefined`.

  Both `actions.formdata-edge.test.ts` files' characterization tests (`it('silently defaults to the Unix epoch ...')`) were updated to assert the corrected behavior — an entirely-absent field now returns `fieldErrors` and makes no DB write, instead of silently succeeding with a 1970-01-01 date.

- **`submitIncident` had no optimistic-locking guard.** It read the incident, checked `reviewStatus === 'OPEN'` in application code, then wrote unconditionally inside a `$transaction([...])` batch array — no version column, no conditional `WHERE reviewStatus = 'OPEN'` at write time. Under a genuine race (`test/db/concurrent-writes.db.test.ts`), both calls could read `OPEN` before either wrote, so more than one `ReviewEvent` row could be created for a single logical submission. **Fixed**: switched to the interactive callback transaction form and a conditional `prisma.incident.updateMany({ where: { id: incidentId, reviewStatus: 'OPEN' }, data: { reviewStatus: 'SUBMITTED' } })`; if the returned `count` is `0`, another request already won the race, so the transaction bails without creating a `ReviewEvent` row (and `revalidatePath` is skipped for that call, mirroring the function's other early-return branches). The DB test's assertion was tightened from "at least one well-formed event" to exactly one `ReviewEvent` row, now that the guarantee actually holds. A new fast-suite test (`test/app/incidents/id/actions.test.ts`) characterizes the losing side of the race directly against the mock (`updateMany` resolving `{ count: 0 }` → no `ReviewEvent`, no `revalidatePath`).

## Phase 6 — self-review pass

Closing step per `TEST-PLAN-CONTEXT.md`: reviewed what Phases 0-5 already wrote, not new coverage, bounded to what surfaced in one pass rather than an open-ended audit.

- **Redundancy fixed:** `setupCallerContext()` and `createAndGetIncidentId()` had turned up independently, near-identically, in `incident-journey.db.test.ts` (Phase 4) and `concurrent-writes.db.test.ts` (Phase 5) — extracted into `test/helpers/journey.ts` (see above), both call sites updated to use the shared version. Also dropped one Phase 5 test (`updateMutualAid`'s "single department name with no trailing newline") that didn't exercise any code path Phase 3's existing multi-line parsing test hadn't already covered — noise, not signal.
- **Redundancy checked and kept:** Phase 5's per-action FormData tests that assert similar-looking outcomes to Phase 3 (e.g. `addDispatchComment`'s "comment entirely absent" alongside Phase 3's "comment present-but-empty") were kept — the phase plan explicitly asks for the absent/empty/null FormData states to be distinguished, and here they resolve through genuinely different Zod issue paths (`invalid_type` vs `too_small`), not duplicate assertions of the same thing.
- **Naming consistency reviewed, no changes needed:** `describe` titles are consistent within each phase's convention — Phase 1/3 use the bare schema or function name, Phase 5 appends `— boundary` (schema files) or `— malformed/partial FormData` (action files), and every DB-backed file names its concern in prose plus a `(Testcontainers Postgres)` parenthetical. The two different Phase 5 suffixes are a deliberate distinction (schema-level vs action-level), not an inconsistency, reflected in the two different file-name suffixes (`.edge.test.ts` vs `.formdata-edge.test.ts`).
- **Gap found and filled:** Phase 5's cross-department boundary suite had a real cross-department case for every departmentId-scoped action except `removeActionTaken`, which only got the same-department nested-row case. Added the missing real-cross-department test for `removeActionTaken` to `cross-department-boundary.db.test.ts`.
- **Gaps checked and not filled:** `incident-exposure.schema.ts` got no new Phase 5 edge file — reviewed and confirmed already thorough in Phase 1 (zero/negative/non-integer boundaries on `exposureDisplacedNumber`, unrecognized-enum cases on every enum field), and every other field is a `z.enum` with no whitespace-trimming surface to probe. `module-relevance.ts`/`incident-completeness.ts`/`get-submit-completeness.ts` likewise got no additional Phase 5 files — the phase plan's three named sub-areas (Zod boundaries, concurrency, cross-department) don't apply to this pure-logic layer beyond what Phase 1 already covers there.

## Known gotchas: framework calls that throw/memoize outside a request context

- **`redirect()`** (`next/navigation`) and **`revalidatePath()`** (`next/cache`) both throw an "Invariant: static generation store missing" error outside a real Next.js request context — confirmed empirically for both, not just documented for `redirect()`. Both are mocked globally as plain spies in `test/setup.ts` (wired into `vitest.config.ts` via `setupFiles`), so every action test gets a safe, assertable stand-in — `expect(redirect).toHaveBeenCalledWith(path)` — without needing to catch a thrown signal on every happy-path test.
- **React's `cache()`** (wraps `getIncidentDetail`) does **not** memoize outside an actual render — confirmed empirically (two calls with identical args each invoke the wrapped function). No cross-test cache-pollution risk, but tests still use a unique incident ID per test as cheap insurance.
- **`vi.mock('@/lib/prisma', factory)` cannot reference a top-level imported helper directly** — Vitest hoists `vi.mock` calls above imports, so `createPrismaMock` would be accessed before its import initializes (`ReferenceError`, confirmed empirically). Use a dynamic import inside the factory instead:

  ```ts
  vi.mock('@/lib/prisma', async () => {
    const { createPrismaMock } = await import('@/test/helpers/prisma-mock')
    return { prisma: createPrismaMock() }
  })
  ```

- **`vi.clearAllMocks()` does not clear a standing `mockResolvedValue`/`mockReturnValue`** — confirmed empirically, it only clears call history. A value set in one test leaks into the next unless every test file uses `beforeEach(() => vi.resetAllMocks())`, which does clear implementations. This is safe for the global `redirect`/`revalidatePath` mocks too, since their reset state (a bare stub returning `undefined`) is identical to their intended default behavior.

## CI

- `.github/workflows/test.yml` — PR-triggered and on push to `main`. Fast suite only.
- `.github/workflows/test-db.yml` — nightly (09:00 UTC) plus manual `workflow_dispatch`. DB + journey suite. `ubuntu-latest` ships Docker preinstalled, so no extra service container setup is needed — Testcontainers manages its own.

Both jobs use Node 24 (matches this environment's verified runtime) and rely on `npm ci`'s `postinstall` to run `prisma generate`. Neither job needs real secrets (`DATABASE_URL`, Clerk keys): the fast suite mocks auth/DB directly, and `test:db` provisions its own throwaway Postgres rather than touching the real Neon dev database.

`npm run test:e2e` (Playwright, see below) is **not** wired into either workflow yet — deliberately deferred to a follow-up per `TEST-PLAN.md`'s Phase 8, since it's the first suite that needs real Clerk secrets in CI, breaking the "no real secrets needed" invariant above on purpose. Local-only for now.

## E2E suite (Phase 8, `test/e2e/`)

Real-browser Playwright tests driving the actual forms, not server actions called directly — the one suite in this repo where the request genuinely goes through Clerk's middleware (`proxy.ts`) end to end. `npm run test:e2e` runs it; `npx playwright show-trace <path>` opens a failed run's trace (auto-captured via `trace: 'retain-on-failure'`).

### Why this suite owns its own server lifecycle

Playwright's built-in `webServer` config option starts **before** `globalSetup` runs (confirmed against the installed `playwright` package's task ordering — `createPluginSetupTasks` precedes `globalSetups` in `createGlobalSetupTasks`). That's too late here: the dev server needs `DATABASE_URL` pointed at a Testcontainers Postgres that doesn't exist yet at that point. So `test/e2e/global-setup.ts` skips `webServer` entirely and owns the whole lifecycle itself, in order:

1. Start a throwaway Postgres container and migrate it (`test/helpers/testcontainers-db.ts` — the vitest-independent half of what `test/helpers/db.ts` already did; extracted so Playwright's global setup doesn't pull `vitest` in as a dependency, `test/helpers/db.ts` now re-exports it and keeps only its vitest-`expect`-based `expectUniqueConstraintViolation`).
2. Seed one `Department` and one `User` row whose `clerkId` matches a real Clerk test user (see "The Clerk test user" below) — the app's own `getCurrentAppUser()` bridges Clerk's `auth()` to this row, same as production.
3. Call `@clerk/testing/playwright`'s `clerkSetup()` to fetch a testing token from Clerk's Backend API.
4. Spawn `next dev -p 3100` (the CLI's JS entrypoint directly via `node`, same Windows `.cmd`-shim-avoidance reasoning as the Prisma CLI invocation above) against the container's `DATABASE_URL`, and poll until it responds.
5. Return an async teardown function — Playwright's documented pattern (`globalSetup`'s return value is called automatically after the run) — that kills the server and stops the container.

Runs serially (`fullyParallel: false`, `workers: 1` in `playwright.config.ts`): one shared server and DB for the whole run, same reasoning as `vitest.db.config.ts`'s `fileParallelism: false`.

### Isolated `distDir`

`next dev` refuses to start a second instance against the same `.next` directory even on a different port — it detected the developer's own `npm run dev` running locally and exited before serving anything. Fixed by giving the E2E server its own build directory: `next.config.ts` reads `NEXT_E2E_DIST_DIR` (only `global-setup.ts` sets it, to `.next-e2e`) and passes it as Next's `distDir`. `next dev` also auto-rewrites `tsconfig.json`'s `include` to add `.next-e2e/types/**/*.ts` the first time it runs against that dir — expected, harmless, same mechanism that already added the `.next/types/**/*.ts` entry.

### The Clerk test user

A dedicated user in the Clerk **dev** instance, password-enabled, separate from any real account — never a real user's credentials. Create one via the Clerk dashboard (Users → Create user, set email + password), then add three values to `.env` (never committed — see `.env.example` for the placeholders):

```
E2E_CLERK_USER_EMAIL=
E2E_CLERK_USER_PASSWORD=
E2E_CLERK_USER_ID=
```

The spec itself signs in via `clerk.signIn({ page, emailAddress: ... })` — the **ticket-based** strategy, not `signInParams: { strategy: 'password', ... }`. The password strategy was tried first and produced a genuine bug, not a flake: Clerk's client-side password verification triggers a real session-token-refresh network round-trip through the hosted Frontend API, which threw `Clerk: Refreshing the session token resulted in an infinite redirect loop` in this environment and never actually established a session (confirmed the keys themselves were correct via a direct Backend API call to `GET /v1/users/{id}` before concluding it was the strategy, not the credentials). The ticket-based `emailAddress` form sidesteps that path entirely — it mints a sign-in token server-side via the Backend API and applies it client-side, no password round-trip. `E2E_CLERK_USER_PASSWORD` is kept in `.env` regardless, since the user needs a password set for `password_enabled: true` on the Clerk side even though the spec's sign-in call doesn't use it directly.

### One real gotcha worth flagging for future specs

A URL regex used to confirm "we've landed on the new incident's detail page" — `/\/incidents\/[^/]+$/` — also matches `/incidents/new` itself (`new` satisfies `[^/]+` too). `await expect(page).toHaveURL(...)` polls and resolves the instant *any* URL satisfies the pattern, so on a fast redirect this could resolve against the pre-redirect URL rather than waiting for the real one, silently capturing the wrong page. Fixed by waiting for something that only exists on the actual destination (the tab nav's "Dispatch" link) before trusting the URL, with the regex itself tightened to `/\/incidents\/(?!new$)[^/]+$/` as a backstop. Worth the same care in any future spec that captures a created-record's URL from a redirect.
