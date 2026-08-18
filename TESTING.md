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

## Known gotcha: `redirect()` in server actions

Every mutating action calls `redirect()` from `next/navigation` on success, which throws a `NEXT_REDIRECT` signal outside a real Next.js request context. Tests need to mock `next/navigation`'s `redirect` or catch-and-assert the thrown redirect target — a thrown error on the happy path here is expected framework behavior, not a test failure.

## CI

- `.github/workflows/test.yml` — PR-triggered and on push to `main`. Fast suite only.
- `.github/workflows/test-db.yml` — nightly (09:00 UTC) plus manual `workflow_dispatch`. DB + journey suite. `ubuntu-latest` ships Docker preinstalled, so no extra service container setup is needed — Testcontainers manages its own.

Both jobs use Node 24 (matches this environment's verified runtime) and rely on `npm ci`'s `postinstall` to run `prisma generate`. Neither job needs real secrets (`DATABASE_URL`, Clerk keys): the fast suite mocks auth/DB directly, and `test:db` provisions its own throwaway Postgres rather than touching the real Neon dev database.
