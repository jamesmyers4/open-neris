# CONTEXT.md

## What this is

Open source Fire Incident Report app for the volunteer/small-department fire service. Replaces the paid Responserack/Station Boss/Fire Station Software tier for departments who can't justify a monthly SaaS bill. Submits directly to NERIS (the system that replaced NFIRS in Feb 2026), not the retired legacy system.

Working title: OpenSourceNERIS. Placeholder, same as Shenny was — rename whenever something better lands.

## Stack

Next.js (App Router) + TypeScript, Prisma + PostgreSQL (Neon), Clerk auth, Vercel hosting. Same stack as Shenny and the Horse Haven platform, chosen for consistency over novelty. PWA-enabled for the incident-entry flow specifically (installable, offline-capable via IndexedDB write queue) — review/approval/reporting assume connectivity. `ulfsri/neris-nodejs-client` (MIT licensed, official) as the NERIS submission layer instead of hand-rolled OAuth.

## Data model rationale

Schema and generated enums are pulled directly from `ulfsri/neris-framework` (github.com/ulfsri/neris-framework), not hand-guessed. Two artifacts do this:

- `scripts/generate-neris-value-sets.ts` — reads every CSV in `core_schemas/value_sets` and `secondary_schemas/value_sets`, classifies each as a small flat enum (<=20 values) or a large/hierarchical lookup table, and generates `lib/neris/generated/enums.ts` plus one JSON file per lookup table. Tested against the real framework repo: 141 enums, 20 lookup tables (up to 800 rows for `type_consumer_product`), 0 skipped, 20 files deduped where core and secondary schemas share a value set.
- `lib/validation/incident-core.schema.ts` — Zod validators for the MVP incident-core fields, importing the generated enums. Includes a chronology check (call create -> call answered -> call arrival -> alarm time) and a check that exactly one incident type is marked primary. Both tested against real sample data.

**Design decision: no NERIS value set becomes a native Prisma `enum`.** Every NERIS-sourced choice list is a validated `String` column, checked at the Zod layer against the generated enums. A Prisma enum requires a schema migration every time NERIS revises its taxonomy (already in beta and evolving); a regenerated TS file does not. Only the app's own internal, stable concepts (`ReviewStatus`, `UserRole`, `NerisEnvironment`, `SubmissionTrigger`) are native Prisma enums.

**Design decision: NERIS "Module" fields become separate tables, not JSON blobs.** Fire, Medical, Hazsit, Risk Reduction, and Tactic Timestamps are all conditionally relevant (fire fields only matter for fire-type incidents) — modeling them as ~9 separate optional 1:1 or 1:many tables keeps the core `Incident` table from carrying 150+ mostly-null columns, and keeps everything queryable. The alternative (embed as `Json` columns) is lighter-weight but trades away relational queries and Prisma type safety. Went relational since the schema will get hit with real reporting queries eventually.

**Design decision: hierarchical chemical arrays become a child table.** `mod_hazard`'s eight parallel arrays (`chemical_dot_class`, `chemical_name`, `chemical_release_occurred`, etc.) describe N chemicals per hazmat incident as N independent arrays that have to stay index-aligned. Normalized into `IncidentHazardChemical`, one row per chemical, instead of trying to keep eight Postgres arrays in sync by index.

**Design decision: address collection is simplified from NERIS's native shape.** `mod_civic_location` is a full NG9-1-1-style decomposition — 38 fields (street name pre-type, pre-directional, post-type, direction of travel, unit type, floor, section/row/seat, etc.). Making a firefighter fill that out by hand after a 2am call is a bad idea. `IncidentLocation` stores the practical subset (complete street address, city, county, state, postal code, place) plus a `civicLocationCipher Json?` field to cache the full NERIS decomposition once a geocoding step computes it at submission time. Recommend a geocoding call (Google Places, or a free option like the US Census geocoder) rather than manual entry into 38 fields.

**Design decision: multi-tenant from day one.** Every table hangs off `departmentId`. A single small department can run one instance with one `Department` row and never notice the extra column; retrofitting tenancy into a single-tenant schema later is expensive. Given the ambition here ("free tool for the firefighting community," not just a personal project), this keeps the door open to one hosted instance serving many departments without a rewrite.

**Judgment call — flagging explicitly per your ask:** `Department.nerisVendorSecretCipher` stores the NERIS API client secret encrypted, never plaintext, using an application-layer key from an `ENCRYPTION_KEY` env var (AES-256-GCM or similar). This is the same category of rule as the existing Shenny `CLAUDE.md` hard rule against printing `.env` contents — worth carrying forward as a hard rule here too, not a suggestion.

**Judgment call:** field-level required/optional in the Prisma schema was set conservatively (nullable unless it's foundational and always known at creation time — alarm time, primary type, department, internal ID). `neris_core=true` in the source data means "part of core federal reporting," not "always collectible at the moment a firefighter starts a draft." Tightening this needs real usage experience, not a first pass — didn't want to fake precision here.

**Open question, not yet decided:** `incident_actions_taken` (Attachments in your old system) has no NERIS data-schema home. Either it's local-only (photos/PDFs stored in your own DB, never submitted to the federal system) or it's dropped from MVP entirely. Not urgent, flagging so it doesn't get forgotten.

## Section structure (validated against your old test automation)

Your old FIR test's section navigation maps closely to the real NERIS incident modules — good evidence the section-by-section UX pattern works for actual captains filling actual incidents, so the new form keeps the same navigation, backed by the correct current field set:

| Section (old FIR / new form) | NERIS module |
|---|---|
| Incident Core (Dispatch tab) | `core_mod_incident` + `core_mod_dispatch` |
| Exposures | `mod_exposure` |
| Fire | `mod_fire` |
| Medicals | `mod_medical` |
| HazSit | `mod_hazard` |
| Civilian / Firefighter Rescues | `mod_rescue_nonff` / `mod_rescue_ff` |
| Responding Units | `mod_unit_response` |
| — (net new, no old equivalent) | `mod_emerging_hazard`, `mod_risk_reduction` |

## Workflow

`Open -> Submitted -> Reviewed -> Approved -> Sent -> Confirmed`, with an `Error` state for failed NERIS submissions and a kickback path from Reviewed or Approved back to Open. NERIS submission fires once, automatically, on the transition to Approved — never on every save, since drafts are incomplete. A scheduled sweep (GitHub Actions, same pattern as `jobSearch`) catches anything stuck Approved-but-not-Sent; a manual resend handles Error-state records. `ReviewEvent` is an append-only audit log of every status transition (actor, from, to, note) — the kind of trail a department would actually want for compliance, and it's what makes the kickback flow legible later.

Roles: Member (drafts, submits), Officer (reviews, can kick back), Chief (approves, triggers the NERIS send), Admin (department config, NERIS credentials, user management). None of this is modeled by NERIS itself — its entity module is department-only (address, jurisdiction, shifts), no user concept at all — so this tier structure is entirely the app's own business logic, deliberately named `reviewStatus` rather than `status` to avoid colliding with NERIS's own API status field (which uses `APPROVED` to mean something unrelated — a CAD-linked record awaiting completion).

## From the old AI-assisted test automation (Playwright-Typescript repo)

`fir.ai.e2e.test.ts` used an LLM in a turn-capped agentic loop (6-8 turns per section) to fill an existing FIR form, constrained to a small allowlisted action vocabulary (`click`/`fill`/`select`/`chooseFromList`/`expectText`/`done`, plus safety-guarded `maybeSubmit`) with a URL allowlist and a blocked-destructive-text regex. Built as a QA regression bot. The pattern is worth carrying forward as a real product feature instead: an "AI assist" step where a firefighter enters the minimal facts (alarm time, primary type) and the model proposes values for the remaining ~28 required core fields from incident context, surfaced for human review before Submit — not the bot filling the form for a test run, but assisting a real user filling it for real. Worth rebuilding on Claude's native tool-use/structured output rather than the hand-rolled JSON-plan parsing the old version needed, since tool-use didn't exist in its current form when that was written.

## Repo setup note

`neris-framework` isn't vendored into this repo yet — recommend a git submodule pointing at `ulfsri/neris-framework` so `npm run generate:neris` always pulls the current beta schema rather than a stale copy. It's still in beta and will keep changing.

## Not yet decided

- Attachments (see above).
- Whether the hosted version (if one exists) is free-for-all or department-verified-only, given NERIS submission requires a real department entity per integration.
- Reporting dashboard scope — deferred to phase 2, schema already supports the basics (counts by type/month, time-to-approval, submission compliance).

## Deployment model

Self-hosting is not the primary path for real departments — every competitor in this market (Responserack, Station Boss, Fire Station Software, ResponseMaster) is SaaS, and there's no reason to believe a volunteer department wants to run their own server and manage their own backups for their system of record. The primary path is one hosted, multi-tenant instance (Vercel + Neon) that departments sign up for directly — this is exactly why the schema went multi-tenant from day one.

`prisma dev` stays as the local development tool for contributors, decoupled from this decision — it's not what departments would ever touch.

Self-hosting remains technically possible (the code doesn't prevent it) for departments with specific data-sovereignty requirements, offered as a paid setup/support service rather than a self-serve README path. Not a priority now — revisit if a real department asks for it specifically.
