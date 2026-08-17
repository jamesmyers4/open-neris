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

## Field-verification discipline — the mistakes that cost the most time

Every one of these came from writing validation logic, a label, or a conditional rule based on assumed NERIS field semantics instead of checking `vendor/neris-framework`'s actual CSV definitions (or, when the CSV itself was ambiguous, an authoritative outside source) first. Rule going forward, for this session and any future one: before writing a validation rule, a label, or an ordering assumption about any NERIS-sourced field, verify it against the real definition. Don't reason from the field name, a similarly-named value in a different value set, or general fire-service knowledge alone — all four of these looked reasonable and were wrong:

1. **Dispatch-time chronology, first pass.** Had the create/answer/arrival relationship backwards, rejecting every correctly-sequenced incident. Fixed in commit `877b4f5`.
2. **`dispatch_time_call_arrival` semantics.** Assumed to mean "units arrived on scene." The real definition: **"Timestamp at which call arrives at PSAP or department dispatch center"** — the 911 call reaching dispatch, not units reaching the incident. On-scene arrival is a per-unit field under Responding Units (`unit_response.time_on_scene`), not built yet. The current UI label ("Call arrival") still invites this exact misreading even though the underlying field and validation are correct — label needs to say something like "Call received at dispatch center."
3. **`incidentNoActionReason`'s conditional trigger.** Assumed gated on primary incident type resolving to `NOEMERG > GOOD_INTENT > NO_INCIDENT_FOUND_LOCATION_ERROR` — a real value in `type_incident.csv`, but the wrong field. The real gating, from `core_mod_incident.csv`, is structural: `incident_noaction`'s `possible_if` is `incident_actions_taken is null`, mutually exclusive with Actions Taken and unrelated to incident type. Likely origin of the mistake: pattern-matching the incident-type value's name against `type_noaction.csv`'s similarly-worded `NO_INCIDENT_FOUND` value — a different value set for a different field. `incidentNoActionReason` is also a 3-value enum (`TypeNoaction`: `CANCELLED`, `STAGED_STANDBY`, `NO_INCIDENT_FOUND`, already generated in `lib/neris/generated/enums.ts`), not free text.
4. **Dispatch-time chronology, second pass.** Commit `877b4f5`'s fix corrected the check from fully backwards to still-partially-backwards: it enforced `arrival ≤ create ≤ answer`. NERIS's own Technical Reference Guide (FSRI, March 2025 draft — see `docs/research/neris-dispatch-timestamp-order.md` for the full citation) states three explicit API validator rules that resolve to **`arrival ≤ answered ≤ create`** — `create` and `answered` were still swapped relative to each other. This one needed an authoritative source beyond the vendor CSV to actually resolve, since the CSV's own "computed duration" fields referencing these three timestamps have internally inconsistent wording that doesn't settle the order either way.

## Data model rationale

Schema and generated enums are pulled directly from `ulfsri/neris-framework`, not hand-guessed. `scripts/generate-neris-value-sets.ts` classifies each value-set CSV as a small flat enum (<=20 values) or a large/hierarchical lookup table: 141 enums, 20 lookup tables (post-dedup, since core and secondary schemas share some value sets), 0 skipped, tested against the real submodule.

No NERIS value set becomes a native Prisma `enum` — all stored as validated `String`, checked at the Zod layer against the generated enums, so a NERIS taxonomy revision means regenerating a TS file, not a database migration.

NERIS "Module" fields are separate tables, not JSON blobs — Fire, Medical, Hazsit, Risk Reduction, Tactic Timestamps are conditionally relevant, so ~9 separate optional tables keep the core `Incident` table from carrying 150+ mostly-null columns.

Hierarchical chemical arrays (`mod_hazard`'s eight parallel arrays) are normalized into `IncidentHazardChemical`, one row per chemical.

Address entry is simplified from NERIS's 38-field civic-location decomposition down to a practical subset (`IncidentLocation`), with the full decomposition intended to be computed by geocoding at submission time, not typed by a firefighter. Not built yet. Verified reasonable against `mod_civic_location.csv`/`mod_location_use.csv` directly — the simplified subset covers the fields a department would realistically type, the rest is either geocoding-derived or not worth the data-entry cost.

Multi-tenant from day one — every table hangs off `departmentId`.

`Department.nerisVendorSecretCipher` stores the NERIS API client secret encrypted, never plaintext, using an application-layer key from `ENCRYPTION_KEY`.

Field-level required/optional in Prisma was set conservatively — `neris_core=true` means "part of core federal reporting," not "always collectible at the moment a firefighter starts a draft."

**Fixed as of this pass:** `IncidentExposure.exposureItem`'s nullability now matches NERIS's real rule (required only when `exposureType === EXTERNAL_EXPOSURE`), enforced in Zod via `superRefine`.

**Displacement is normalized, not a flat array.** NERIS's own canonical model backs `incident_displaced_cause` with a real child table (`displace joined via displace_sub_incident.nuid_incident`), and marks `incident_displaced_number` as **computed** (`count of core_mod_incident.incident_displaced_cause`) rather than directly submitted. The app now matches this: `IncidentDisplacement` is its own table, one row per displaced person, each row holding `causes: String[]` (a person can have more than one contributing cause). `incidentDisplacedNumber` is derived as a count of those rows rather than stored as an independently-typed number — resolves the earlier mismatch where the app treated it as a manually-typed field with no structural link to the causes being recorded.

**Department-configurable internal ID.** `internalId` is never typed by a firefighter — auto-generated per an admin-configurable `Department.internalIdMode` (`YEAR_SEQUENTIAL` default, `SEQUENTIAL`, `CUSTOM_TEMPLATE`, or `MANUAL`), backed by an atomic per-department counter. Defaults to `YEAR_SEQUENTIAL` (`2026-000123`) if an Admin never configures it, so a first-time or solo department gets a sane result with zero setup. Configuring it is one field on the (not-yet-built) Admin department-settings page — only that one setting is in scope for this build pass, not the full settings screen.

**Actions Taken and No-Action are a linked, mutually-exclusive pair.** `IncidentActionTaken` (Prisma model already existed, unused until this pass) and `incidentNoActionReason` are structurally either/or per NERIS (see Field-verification discipline #3) — exactly one of "what actions were taken" or "why none were" applies to a given incident.

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

Incident Core is one row here but multiple tabs in the UI — see "Incident lifecycle" below for the actual tab breakdown, including Actions Taken/No-Action, which is part of `core_mod_incident` (group `actions_taken`) rather than its own NERIS module.

Attachments has no NERIS data-schema home — undecided whether local-only storage or cut from scope.

## Incident lifecycle — two-phase, finalized

Original build put every Incident Core field into one form submitted at creation. Wrong call, corrected based on direct evidence from the old FIR system's own Playwright automation: its create step only ever filled two fields — alarm time and primary incident type — with department, station, and date explicitly marked "already populated, do not touch" or "auto-populates." Everything else was filled in afterward, section by section, from a persistent incident record, with a final pass checking for any remaining required field before the record could be considered complete. That's a proven pattern from real use, not a guess. Finalized in a `/grill-with-docs` session — see below for the settled shape.

**Create step, minimal:** primary/secondary incident type (1-3 rows, one marked primary — same NERIS-sourced picker with description1/2/3 already built) and alarm time only. `internalId` auto-generated per `Department.internalIdMode` (see Data model rationale). `incidentDate` derives from `alarmTime`, not asked separately. Special Modifiers (`specialModifiers`, e.g. Mass Casualty Incident, Active Assailant) is set alongside type selection here — NERIS groups it under the same `type_identifiers` group as the type array itself, not with any of the fill-in-later tabs.

**Incident Core becomes the incident's main page, with tabs:** Dispatch, Location, People & Displacement, Mutual Aid, Narrative, and Actions Taken/No-Action — each independently saved. Tabs are nested Next.js App Router segments under `/incidents/[id]/...` sharing one layout, so clicking a tab loads that section in place (fast client-side transition, bookmarkable URL, no scroll-hunting), not a giant single scrolling page.

**Sections 2-7 (Exposures, Fire, Medical, HazSit, Rescues, Unit Response) are not two-phase.** They're structurally different from Incident Core — repeatable child records (an incident has zero-to-many exposures, casualties, units), not one large flat form. Each is a list on the incident detail page with an "Add [exposure/casualty/unit]" action opening one small, independently-saved form per record — the pattern the one existing instance (`/incidents/{id}/exposures/new`) already follows. Rebuild Exposures against this once the tab shell exists; nothing in its current single-form implementation needs preserving beyond the field/Zod reference.

**Type-gated module relevance, not Incident-Core-gated.** The moment type(s) are set (at create — before any Incident Core tab is filled in), the app determines which of Sections 2-7 apply, derived from the full `types` array (all up to 3 rows, not just primary) against a hand-maintained mapping (`lib/neris/module-relevance.ts`), mirroring the `possible_if`/`neris_core_if` hints already present in the CSVs (e.g. "final incident type includes fire"). Tabs for inapplicable sections are greyed out or hidden; applicable ones unlock immediately, independent of whether the rest of Incident Core is done yet. A crew mid-structure-fire isn't blocked from logging Fire-module details just because Mutual Aid or Narrative aren't filled in yet.

**Data integrity without hard-locking.** Never hard-block a user from filling in a tab/field NERIS wouldn't accept for the incident's determined type — let them track whatever they want locally. The final-validation-gate/NERIS-submission-payload builder excludes data outside the determined-relevant set from what actually gets sent, so local tracking and federal-feed correctness are both satisfied without a punitive UI lock.

**Carry-over, not blind auto-fill.** Dates/times and location already captured on Incident Core (e.g. alarm time, dispatch times, the incident address) surface as quick-select affordances in Section 2-7 forms that have their own time/location fields (e.g. a unit's `timeOnScene`) — "use dispatch's alarm time" rather than a pre-filled, silently-editable value. Saves re-entry and is part of what makes the earlier chronology bugs less likely to recur, since a crew choosing from already-recorded times is less error-prone than re-typing them.

**Conditional field, real value confirmed:** `incidentNoActionReason` is a 3-value enum (`TypeNoaction`), mutually exclusive with Actions Taken (`incidentActionsTaken`) per NERIS's real `possible_if` rule — see Field-verification discipline #3. Not primary-type-gated as previously assumed.

**Final validation gate before Submit:** a single reusable function (`lib/validation/incident-completeness.ts`) checks the real Zod schemas for whichever modules are relevant to the incident (per `lib/neris/module-relevance.ts`) and returns exactly what's missing, surfaced to the user as a clear list. Same UX the old system already validated (`gatherRemainingRequiredFields`), built against real schemas instead of DOM-scraping, since this app owns its own form markup. Right-sized regardless of department size — a solo-operator department still just hits one validation check before the record closes and sends; the multi-role review chain below is a separate layer on top, not a change to this function.

## Workflow

`Open -> Submitted -> Reviewed -> Approved -> Sent -> Confirmed`, with an `Error` state for failed NERIS submissions and a kickback path from Reviewed or Approved back to Open. NERIS submission fires once, automatically, on the transition to Approved. A scheduled sweep catches anything stuck Approved-but-not-Sent; manual resend handles Error-state records. `ReviewEvent` is an append-only audit log of every status transition.

Roles: Member (drafts, submits), Officer (reviews, can kick back), Chief (approves, triggers the NERIS send), Admin (department config, NERIS credentials, user management). None of this is modeled by NERIS — its entity module is department-only, no user concept — so this tier structure is entirely the app's own business logic, deliberately named `reviewStatus` to avoid colliding with NERIS's own API status field.

**Two real usage shapes, same schema.** A solo/single-person department's path is short: fill the record, pass the one validation check, close and send — nobody else is in the loop, so `Submitted`/`Reviewed`/`Approved` collapse to one action in practice. A multi-person department's path uses the full chain: Members submit and record no-action calls, Officers/Captains review and can adjust before forwarding, Chiefs finalize and release to NERIS — with a kickback-and-note path at Reviewed or Approved sending the record back to Open, and a status-change notification (email, and an in-app alert, "clicking this button closes this report and sends it to the NERIS national system") whenever a record needs someone's attention. The schema already supports both shapes identically; only the UI/notification layer differs. See Roadmap — none of the multi-role UI is built yet.

## Roadmap — goals captured, not yet designed

These need their own grill sessions before implementation. Capturing the actual stated goals here so nothing gets lost or contradicted while Sections 2 through 7 are being built.

**Personnel / User Management.** Employee data — name, rank, station/work location, shift assignment, apparatus/truck assignment — should auto-populate from personnel records rather than being manually entered per incident. Once this exists, it likely changes the create screen: not by adding manual fields, but by letting it _display_ auto-populated crew/unit context (who's creating this, what unit, what shift) without adding typing burden. The create screen deliberately stays minimal in this pass rather than adding a placeholder for this — `createdById` already comes from the session and already displays on the incident detail page, so Personnel Management just adds richer attributes to that existing relation later with zero change to the create form itself.

**Review & Approve workflow, with return-for-info.** The `Reviewed`/`Approved` kickback-to-`Open` path exists structurally in the schema and `ReviewEvent` audit table already, but the actual UI — a reviewer or chief sending a record back with a note, the submitter seeing why — isn't built. See Workflow above for the fuller shape (solo fast-path vs. multi-role chain) captured during this pass.

**Resend queue.** Tied to the above and to `NerisSubmission`'s existing retry tracking — handling repeated submission attempts after corrections. Schema supports it; the actual queue/UI doesn't exist yet.

**Email notifications, conditional.** Needed once more than one person is involved — a reviewer needs to know something's waiting, a submitter needs to know something got kicked back, and every status change that requires action from someone should trigger both an email and an in-app alert. Explicitly _not_ wanted for a single-person department running this solo, since there's nobody else to notify. Needs a design decision on how "who gets notified for what" gets configured, almost certainly tied to Personnel Management's roster once that exists.

**Admin department-settings page.** Doesn't exist yet at all. This pass adds exactly one field to it in spirit (`internalIdMode`/`internalIdTemplate` on `Department`) without building the actual settings screen — that's a real, still-open piece of scope, likely bundled with Personnel Management or NERIS-credentials UI whenever either gets built.

**Personal test-automation-planner skill run.** A Claude Skill (scan-first QA intake, produces a governing test plan document, documented in `TEST-PLAN-CONTEXT.md`) gets run against this repo once the UI sections are stable — review its recommended suite, then have Claude Code implement full-stack coverage. First real use of this skill on an original project (previously run against others' repos, and against Shenny which already had tests) — and, per `TEST-PLAN-CONTEXT.md`'s own open questions, the first real target for its not-yet-designed greenfield/spec-first mode, since Sections 1-7 will be genuinely new application behavior rather than an existing codebase to scan. Good at catching exactly the kind of time-discrepancy bug the chronology check produced — sequence this after the UI sections are done and before diving into Personnel/Review/Email, so those get built against a codebase with real regression protection already in place.

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
- Full Admin department-settings page scope (see Roadmap) — this pass only adds the one internal-ID setting.
