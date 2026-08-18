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
