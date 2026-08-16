# UI_KICKOFF.md

Read this and CONTEXT.md before writing any code. CONTEXT.md has the full architecture rationale, judgment calls, and NERIS module mapping — this file is just the current state and the immediate task.

## Confirmed working right now

- Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind.
- Prisma 7.9.1 against a live Neon Postgres database. Schema at `prisma/schema.prisma`, 20 models, migrated and verified — including array fields, which is why the datasource has no `url`/`directUrl` (Prisma 7 moved those to `prisma.config.ts`).
- Prisma Client is instantiated once, in `lib/prisma.ts`, using the Neon driver adapter against the pooled `DATABASE_URL`. Always import `prisma` from there. Never instantiate `PrismaClient` directly anywhere else — that breaks the connection-pooling protection during dev hot-reload.
- Clerk auth wired: `proxy.ts` (not `middleware.ts` — this is Next 16's naming), `ClerkProvider` in `app/layout.tsx`, custom pages at `app/sign-in/[[...sign-in]]` and `app/sign-up/[[...sign-up]]`.
- One seeded `Department` and one `User` with `role: ADMIN`, linked correctly.
- `lib/validation/incident-core.schema.ts` — Zod validator for the top-level incident fields, tested, working.
- `lib/neris/generated/enums.ts` — 141 generated TS enums from the real NERIS value sets. Regenerate with `npm run generate:neris` if `vendor/neris-framework` (git submodule) has moved. Never hand-edit this file.

## Auth pattern — follow this, don't shortcut it

Clerk's current guidance is to not rely on `proxy.ts` alone for access control (there was a real Next.js middleware-bypass CVE last year). Every server action and route handler that touches incident data calls `auth()` or `currentUser()` itself and checks the result, in addition to whatever `proxy.ts` already filtered. Treat this as non-negotiable for anything touching the `Incident` model or its children.

## Role model

`MEMBER` creates and edits their own drafts, can submit. `OFFICER` reviews, can kick a record back to `Open` with a note. `CHIEF` approves, which is what will eventually trigger the NERIS send (not built yet — out of scope for this pass). `ADMIN` manages department config and users. None of this is Clerk's concern — it's entirely the app's own `User.role` field, checked at each server action.

## The task: incident-entry UI, section by section

Section order matches the old FIR system's validated navigation (real captains used this structure successfully) mapped onto the actual current NERIS modules — see CONTEXT.md's mapping table for the full reasoning:

1. Incident Core (dispatch times, location, incident type, alarm time) — build this one first, completely, as the reference pattern for the rest: form → Zod validation → Prisma write → list/detail view. Get this loop fully working before touching section 2.
2. Exposures
3. Fire
4. Medicals
5. HazSit
6. Rescues (Firefighter / Non-Firefighter — two related sections)
7. Responding Units

Only section 1 has a written Zod schema right now. Each later section needs its own, following the exact pattern in `incident-core.schema.ts` — pull field names directly from the corresponding Prisma model, don't invent field names.

## Explicitly out of scope for this pass

- Actual NERIS submission (the `Sent`/`Confirmed` transition and the API call itself) — the workflow states exist in the schema, the submission logic doesn't yet.
- Attachments — no home in NERIS's data schema, undecided whether it's local-only storage or cut. Don't build it, don't decide it, flag it if it comes up.
- Address geocoding for the full NERIS civic-location decomposition — `IncidentLocation` currently stores a practical simplified subset; the geocoding step to compute the full decomposition at submission time doesn't exist yet.
- Reporting/dashboard views — phase 2 per CONTEXT.md.

## Style

No code comments. Minimal blank lines inside functions; a blank line after a function or major block ends. Match the formatting already in `scripts/generate-neris-value-sets.ts` and `lib/validation/incident-core.schema.ts` — that's the established convention for this repo, not a one-off.
