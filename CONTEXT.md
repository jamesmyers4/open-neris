# CONTEXT.md

## What this is

Open source Fire Incident Report app for the volunteer/small-department fire service. Replaces the paid Responserack/Station Boss/Fire Station Software tier for departments who can't justify a monthly SaaS bill. Submits directly to NERIS (the system that replaced NFIRS in Feb 2026), not the retired legacy system.

Working title: OpenNERIS. Repo slug is lowercase (`open-neris`) — npm forbids capitals in package names, the product name and repo name are allowed to differ.

## Stack

Next.js 16 (App Router, Turbopack) + TypeScript, Prisma 7.9.1 + PostgreSQL (Neon), Clerk auth, Vercel hosting. PWA-enabled for the incident-entry flow specifically (installable, offline-capable via IndexedDB write queue) — review/approval/reporting assume connectivity. `ulfsri/neris-nodejs-client` (MIT licensed, official) as the NERIS submission layer, not yet wired up.

## Database & auth infrastructure — hard-won, don't relitigate

All of the following is independently verified against a live Neon database and a real Clerk sign-in, not just configured:

- **Prisma 7 moved connection config out of `schema.prisma` entirely.** No `url`/`directUrl` in the `datasource` block anymore — that's a validation error in 7.x. Connection URL lives in `prisma.config.ts` at the project root, read by Migrate. The generator block explicitly pins `provider = "prisma-client-js"` with `output = "../node_modules/.prisma/client"` — Prisma 7's new default generator produces ESM output outside `node_modules` that has a documented, currently-unresolved conflict with Turbopack (Next.js 16's default bundler) inside server components. Staying on the traditional generator and output path avoids that entirely.
- **Two Neon connection strings matter, for different tools.** Pooled (`-pooler` in hostname) is `DATABASE_URL`, used by the running app. Direct (no `-pooler`) is `DIRECT_URL`, used by `prisma.config.ts` for Migrate — PgBouncer's transaction mode can't run the prepared statements migrations need.
- **The app talks to Postgres via `@prisma/adapter-pg` (plain `pg`/TCP), not `@prisma/adapter-neon` (WebSocket).** The Neon serverless driver's WebSocket connection has a real, currently-documented pattern of hanging indefinitely specifically when invoked from inside Next.js's server-component request handling — works fine as a standalone script, hangs on a live page. This app has no actual need for WebSocket-specific benefits (no edge runtime), so the plain, boring, well-established `pg` adapter avoided the whole problem. `lib/prisma.ts` is the single instantiation point, using `DATABASE_URL` and the `globalForPrisma` singleton pattern to survive Next.js dev-mode hot reload without exhausting Neon's connection limit. Every file that touches the database imports `prisma` from there — nothing instantiates `PrismaClient` directly.
- **Clerk on Next.js 16 uses `proxy.ts` at the project root, not `middleware.ts`.** Same `clerkMiddleware()` code, renamed file, specific to this Next.js version.
- **Custom sign-in/sign-up pages require actual route files** — `app/sign-in/[[...sign-in]]/page.tsx` and `app/sign-up/[[...sign-up]]/page.tsx`, rendering `<SignIn />`/`<SignUp />`. Nothing renders at `/sign-in` automatically just because Clerk is installed.
- **`getCurrentAppUser()` in `lib/auth/current-user.ts`** bridges Clerk's `auth()` to the app's own `User` table via `clerkId`. Returns `null` for both "not signed in" and "signed in but no app User row exists yet" — fine while there's one manually-seeded admin, worth distinguishing once real onboarding exists.
- **Auth pattern: check `auth()`/`currentUser()` at the point of each server action or route handler, don't rely on `proxy.ts` alone.** There was a real Next.js middleware-bypass CVE (2025-29927); Clerk's current guidance is defense in depth, not middleware-only gating.

## Field-verification discipline — the two mistakes that cost the most time

Both real bugs from the Incident Core build came from writing validation logic based on assumed field semantics instead of checking `vendor/neris-framework`'s actual CSV definitions first:

1. A dispatch-time chronology check had the create/answer/arrival relationship backwards, rejecting every correctly-sequenced incident.
2. `dispatch_time_call_arrival` was assumed to mean "units arrived on scene." The real definition: **"Timestamp at which call arrives at PSAP or department dispatch center"** — the 911 call reaching dispatch, not units reaching the incident. On-scene arrival, if NERIS tracks it at all, is very likely a per-unit field under Responding Units (`unit_response.time_on_scene`), not built yet.

Rule going forward, for this session and any future one: before writing a validation rule, a label, or an ordering assumption about any NERIS-sourced field, `grep` the actual definition out of `vendor/neris-framework`'s CSVs. Don't reason from the field name or from general fire-service knowledge alone — both looked reasonable and were wrong.

## Data model rationale

Schema and generated enums are pulled directly from `ulfsri/neris-framework`, not hand-guessed. `scripts/generate-neris-value-sets.ts` classifies each value-set CSV as a small flat enum (<=20 values) or a large/hierarchical lookup table: 141 enums, 20 lookup tables (post-dedup, since core and secondary schemas share some value sets), 0 skipped, tested against the real submodule.

No NERIS value set becomes a native Prisma `enum` — all stored as validated `String`, checked at the Zod layer against the generated enums, so a NERIS taxonomy revision means regenerating a TS file, not a database migration.

NERIS "Module" fields are separate tables, not JSON blobs — Fire, Medical, Hazsit, Risk Reduction, Tactic Timestamps are conditionally relevant, so ~9 separate optional tables keep the core `Incident` table from carrying 150+ mostly-null columns.

Hierarchical chemical arrays (`mod_hazard`'s eight parallel arrays) are normalized into `IncidentHazardChemical`, one row per chemical.

Address entry is simplified from NERIS's 38-field civic-location decomposition down to a practical subset (`IncidentLocation`), with the full decomposition intended to be computed by geocoding at submission time, not typed by a firefighter. Not built yet.

Multi-tenant from day one — every table hangs off `departmentId`.

`Department.nerisVendorSecretCipher` stores the NERIS API client secret encrypted, never plaintext, using an application-layer key from `ENCRYPTION_KEY`.

Field-level required/optional in Prisma was set conservatively — `neris_core=true` means "part of core federal reporting," not "always collectible at the moment a firefighter starts a draft."

**Known imperfection, not yet fixed:** `IncidentExposure.exposureItem` is required in Prisma, but NERIS's own spec only requires it when `exposureType === EXTERNAL_EXPOSURE`. Should become nullable with the real rule enforced in Zod via `superRefine`, matching the pattern already used for time chronology. Cheap to fix now, before real data exists; gets more expensive later.

## Section structure (validated against the old FIR test automation)

| Section (form)                 | NERIS module                                |
| ------------------------------ | ------------------------------------------- |
| Incident Core (Dispatch tab)   | `core_mod_incident` + `core_mod_dispatch`   |
| Exposures                      | `mod_exposure`                              |
| Fire                           | `mod_fire`                                  |
| Medicals                       | `mod_medical`                               |
| HazSit                         | `mod_hazard`                                |
| Civilian / Firefighter Rescues | `mod_rescue_nonff` / `mod_rescue_ff`        |
| Responding Units               | `mod_unit_response`                         |
| — (net new, no old equivalent) | `mod_emerging_hazard`, `mod_risk_reduction` |

Attachments has no NERIS data-schema home — undecided whether local-only storage or cut from scope.

## Incident lifecycle — two-phase, not a single form

Original build put every Incident Core field into one form submitted at creation. Wrong call, corrected based on direct evidence from the old FIR system's own Playwright automation: its create step only ever filled two fields — alarm time and primary incident type — with department, station, and date explicitly marked "already populated, do not touch" or "auto-populates." Everything else was filled in afterward, section by section, from a persistent incident record, with a final pass checking for any remaining required field before the record could be considered complete. That's a proven pattern from real use, not a guess.

Revised model:

- **Create step, minimal:** primary incident type (at least one, one marked primary) and alarm time. `internalId` auto-generated rather than user-typed — the old system never asked for one either, and a required unique field in the fast-entry path is a plausible source of exactly the duplicate-key friction hit during testing. `incidentDate` derives from `alarmTime`, not asked separately.
- **Everything else fills in afterward**, from the incident's detail page, broken into tabs roughly matching the form's existing section boundaries (Dispatch, Location, People & Displacement, Mutual Aid, Narrative) — each independently saved rather than one giant submit. Labels get re-verified against real NERIS definitions during this rebuild, not assumed (see the `dispatch_time_call_arrival` mistake above).
- **Conditional field, real value confirmed:** `incidentNoActionReason` only applies when the primary incident type is `NOEMERG > GOOD_INTENT > NO_INCIDENT_FOUND_LOCATION_ERROR`. Hidden otherwise — this was previously buried in every incident's form regardless of relevance.
- **Final validation gate before Submit:** a single reusable function checks the real Zod schemas for whichever modules are relevant to the incident and returns exactly what's missing, surfaced to the user as a clear list. Same UX the old system already validated (`gatherRemainingRequiredFields`), built against real schemas instead of DOM-scraping, since this app owns its own form markup.

**Open, not yet decided:** whether Sections 2 through 7 (Exposures onward) should also get this two-phase create-then-fill treatment, or whether it's specific to Incident Core because every incident has one and it's large, while the others are smaller and only conditionally relevant. Needs its own decision, not an assumption either way.

## Workflow

`Open -> Submitted -> Reviewed -> Approved -> Sent -> Confirmed`, with an `Error` state for failed NERIS submissions and a kickback path from Reviewed or Approved back to Open. NERIS submission fires once, automatically, on the transition to Approved. A scheduled sweep catches anything stuck Approved-but-not-Sent; manual resend handles Error-state records. `ReviewEvent` is an append-only audit log of every status transition.

Roles: Member (drafts, submits), Officer (reviews, can kick back), Chief (approves, triggers the NERIS send), Admin (department config, NERIS credentials, user management). None of this is modeled by NERIS — its entity module is department-only, no user concept — so this tier structure is entirely the app's own business logic, deliberately named `reviewStatus` to avoid colliding with NERIS's own API status field.

## Roadmap — goals captured, not yet designed

These need their own grill sessions before implementation. Capturing the actual stated goals here so nothing gets lost or contradicted while Sections 2 through 7 are being built.

**Personnel / User Management.** Employee data — name, rank, station/work location, shift assignment, apparatus/truck assignment — should auto-populate from personnel records rather than being manually entered per incident. Once this exists, it likely changes the create screen: not by adding manual fields, but by letting it _display_ auto-populated crew/unit context (who's creating this, what unit, what shift) without adding typing burden. Revisit the create-screen field set once this is real, specifically distinguishing "required manual input" (should stay minimal) from "auto-populated display context" (can grow freely).

**Review & Approve workflow, with return-for-info.** The `Reviewed`/`Approved` kickback-to-`Open` path exists structurally in the schema and `ReviewEvent` audit table already, but the actual UI — a reviewer or chief sending a record back with a note, the submitter seeing why — isn't built.

**Resend queue.** Tied to the above and to `NerisSubmission`'s existing retry tracking — handling repeated submission attempts after corrections. Schema supports it; the actual queue/UI doesn't exist yet.

**Email notifications, conditional.** Needed once more than one person is involved — a reviewer needs to know something's waiting, a submitter needs to know something got kicked back. Explicitly _not_ wanted for a single-person department running this solo, since there's nobody else to notify. Needs a design decision on how "who gets notified for what" gets configured, almost certainly tied to Personnel Management's roster once that exists.

**Personal test-automation-planner skill run.** A Claude Skill (scan-first QA intake, produces a governing test plan document) gets run against this repo once the UI sections are stable — review its recommended suite, then have Claude Code implement full-stack coverage. First real use of this skill on an original project (previously run against others' repos, and against Shenny which already had tests). Good at catching exactly the kind of time-discrepancy bug the chronology check produced — sequence this after the UI sections are done and before diving into Personnel/Review/Email, so those get built against a codebase with real regression protection already in place.

## From the old AI-assisted test automation (Playwright-Typescript repo)

`fir.ai.e2e.test.ts` used an LLM in a turn-capped agentic loop, constrained to a small allowlisted action vocabulary with a URL allowlist and a blocked-destructive-text regex. Built as a QA regression bot. Worth carrying forward as a real product feature — a firefighter enters minimal facts, the model proposes values for the rest, surfaced for human review — rebuilt on Claude's native tool-use rather than the hand-rolled JSON-plan parsing the original needed.

The same test suite's `FirCreatePage`/`FirIncidentPage` page objects and its ten-step serial test chain are also the direct evidence behind the two-phase lifecycle decision above — worth re-reading that file's full structure (in `jamesmyers4/Playwright-Typescript`, `tests/e2e/fir.ai.e2e.test.ts` and its page objects) when designing the tab boundaries and the final-validation gate, not just this summary of it.

## Deployment model

Self-hosting is not the primary path for real departments — every competitor in this market is SaaS, and a volunteer department managing their own server and backups isn't realistic. Primary path is one hosted, multi-tenant instance (Vercel + Neon) departments sign up for directly. Self-hosting stays technically possible, offered as a paid setup service for departments with specific data-sovereignty needs, not a self-serve README path.

## Repo setup note

`neris-framework` is a git submodule (`vendor/neris-framework`), not a static copy — `npm run generate:neris` regenerates against the current beta schema.

## Not yet decided

- Attachments (see Section structure above).
- Whether the hosted version is free-for-all or department-verified-only.
- Reporting dashboard scope — phase 2.
- Whether Sections 2-7 get the two-phase treatment (see Incident lifecycle above).
