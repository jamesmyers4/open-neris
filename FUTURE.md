# FUTURE.md

Plan for the next build epics, produced by a `/grill-with-docs` session (2026-08-22) against this file's earlier notes, `CONTEXT.md`'s Roadmap, the live codebase, and `vendor/neris-framework`'s actual CSVs. Supersedes the informal bullet list this file used to be — that list's still-open items are preserved at the bottom under "Retained from earlier notes."

**Read this alongside `CONTEXT.md`'s Roadmap section before starting any epic below.** Each epic is its own multi-session build — follow the Session/commit discipline in `CLAUDE.md` (one category per session, human verifies in-browser before the next). Don't chain epics into one session either; each is sized to be its own several-session pass.

## Status as of 2026-08-31

All five epics below were built out through `FUTURE-PLAN.md`'s 17-session plan. **Epics 1-4 are complete in full** (Sessions 1-12). **Epic 5's core is complete** (Sessions 13-15): credentials screen, hand-written API client, payload mapper, submit-on-Approve trigger, nightly sweep, and manual resend. The one remaining planned piece is the `/validate` dry-run hardening at the bottom of Epic 5, which is `FUTURE-PLAN.md` Session 16 and is **blocked on real NERIS sandbox credentials existing** — nothing in this codebase has ever called real NERIS.

Each epic's body below is preserved as the reasoning record, not rewritten after the fact. Where a build session found something the plan got wrong or left a gap open on purpose, the correction lives in that session's "Findings" subsection in `FUTURE-PLAN.md`, and the ones that still matter are summarized in `CONTEXT.md`'s Roadmap. The single most important one: `Department.nerisFdId` is required on every NERIS submission and no screen in the app sets it, so no real department can submit yet.

Still open and not part of the five epics: the named-individual personnel/roster epic, attachments, reporting and dashboards, field-level audit history, and a UI polish pass. See "Retained from earlier notes" at the bottom.

---

## Sequencing — decided

1. **Validation/completeness gate rebuild** — no dependency on anything else, pure incident-side work, do first.
2. **Organization structure** — app-only schema (Department hierarchy, Station/Unit reference tables).
3. **Access control / User accounts** ("Personnel Lite") — needs Epic 2's org structure to scope Admin invite permissions correctly.
4. **Review & Approve workflow** — needs Epic 3's roles to exist (Officer/Chief are real assignable roles by this point).
5. **NERIS feed finalization** — needs Epic 2's Station/Unit tables for the submission payload, and ideally Epic 4 done so "Approved" is a meaningful trigger.

Individual named-firefighter roster tracking (rank, certs, fit-test, physicals, SCBA compliance) is **not** one of these five — confirmed during this session that NERIS's own incident schema has no named-individual field anywhere (see Epic 1's note). It stays exactly where it already was, a separate future epic, after all five above.

---

## Epic 1 — Validation/completeness gate rebuild ✅ done (Sessions 1-3)

**Goal, in the user's words:** "find a way to QA the record... to ensure without a doubt that the record has all of the required fields populated... only when everything is successfully populated will they even have the option to move to the next status." Checks need to happen as early as possible, since Members do the bulk of data entry and senior leaders mostly read/approve.

- **Fix the required-field flag `incident-completeness.ts` keys off.** It currently checks `neris_core` (per `CONTEXT.md`'s existing note: "`neris_core=true` means part of core federal reporting"). The vendored CSVs actually carry finer-grained columns — `neris_core_app`, `neris_core_cad`, `neris_core_aid`, `neris_core_if` (conditional) — because a field required from a CAD integration isn't necessarily required from an app like this one, and vice versa. **This app is a firefighter-facing entry tool, not a CAD feed, so `neris_core_app` is almost certainly the correct flag** — verify this module-by-module against the real CSVs before hardcoding it (per `CONTEXT.md`'s field-verification discipline — don't assume from the column name alone).
- **Close the known type-gating gap.** Per `TESTING.md`'s own tripwire note, `getSubmitCompleteness` currently tags every check `'core'` — Sections 2-7's required schemas (Fire/Medical/HazSit/Rescue/Unit Response) were never actually wired into the gate by incident type. Every module `lib/neris/module-relevance.ts` marks relevant for a given incident needs its required fields genuinely checked, not just the always-present core fields.
- **UX: red-asterisk + inline guidance, not a wall of errors at the end.** Required-but-empty fields need to be visually flagged on the tab/form itself as the user works through it, with smart contextual guidance nudging them to what's missing — not a single "here's everything wrong" list that only appears at Submit. This needs to be woven into each tab, not bolted on afterward.
- **The gate blocks the `Open -> Submitted` transition, full stop** — already the existing design (`CONTEXT.md`'s "Final validation gate before Submit"), this epic just makes it actually correct and complete rather than partially wired.
- **Explicitly not this pass:** warning-only (non-blocking) surfacing of `neris_core_app=false`-but-recommended fields. Don't build that speculatively — revisit only if real-world NERIS rejections show core-required fields alone aren't enough.
- **Explicitly not this pass, sequence after Epic 5 instead:** calling NERIS's own live `POST /incident/{neris_id_entity}/validate` dry-run endpoint (confirmed to exist, 204 valid / 422 with errors, no record created) as an extra authoritative check at the Approved→Sent boundary. That needs real sandbox credentials to test against, which don't exist until Epic 5. Build the local gate first — it also has to work fully offline, since incident entry is this app's PWA/offline-capable surface.

## Epic 2 — Organization structure ✅ done (Sessions 4-6)

- **Self-referential `Department` hierarchy**: add a nullable `parentDepartmentId` (self-relation) to `Department`. A district sees itself plus every descendant department's data; a leaf department's Admin sees only their own. **This is a purely app-side concept, not synced to NERIS** — confirmed via the live OpenAPI spec that no parent/child relationship endpoint exists on NERIS's Entity resource at all (entity→station→unit nesting only). Whatever `fd_parent_name`/`fd_child_name` in the vendored CSVs represents, it isn't reachable through the vendor API surface this app would use — build our own hierarchy independent of it.
- **Naming**: keep the Prisma model named `Department` (renaming is a real refactor with no functional payoff) — "Organization" is fine as product-facing copy in the UI if that's the term departments already know, but the schema/codebase keeps calling it `Department`.
- **New `Station` and `Unit` tables, local reference data only — not synced to NERIS.** NERIS's Station/Unit API endpoints are confirmed **write-only** (`POST`/`PATCH`/`DELETE`, no `GET` on either resource) — a department's already-registered stations/apparatus can't be pulled back via API, so there's no safe way to keep a two-way sync anyway. Building this app as a second writer against an API with confirmed no-read-back and an unconfirmed parent/child gap is real risk against a surface that already has a working front door (the NERIS portal, which is how departments already get their FDID and credentials). Instead:
  - `Station` (id, departmentId, label, address, optional `nerisStationId` free-text reference) and `Unit` (id, stationId, designation/label, capability type, optional `nerisUnitId` free-text reference) — an Admin manually enters the NERIS-assigned IDs their department already has from the portal.
  - `IncidentUnitResponse.unitIdLinked` (currently a plain `String`, no relation at all) becomes a real FK into `Unit`, so the Unit Response tab gets an actual picker instead of freeform text — with a "quick-add a unit" affordance inline for a department that hasn't finished setting theirs up yet. Never hard-block incident entry on this being complete.
  - **One confirmed exception**: `GET /entity/{neris_id_entity}` (singular) does exist and works, unlike station/unit. A low-priority, genuinely optional nice-to-have: a one-time "pull our department's info from NERIS" import to prefill the Department settings screen's name/address/FDID from NERIS directly. Not blocking — this data is also collected at signup anyway.
- **Department-level fields worth adding regardless of any future NERIS push**: address, city, state, zip, mailing address, `fd_type` (career/volunteer/combination), and aggregate staffing counts by category (full-time/part-time career, volunteer, EMS-only, civilian — NERIS wants counts here, not names, confirmed against `core_mod_entity_fd.csv`). These live on the same Admin-only Department/Organization settings screen as the Station/Unit reference tables and (Epic 5) the NERIS credentials fields — one settings area, not three.

## Epic 3 — Access control / User accounts ("Personnel Lite") ✅ done (Sessions 7-9)

Confirmed this session: **individual personnel data is not a NERIS requirement anywhere in the incident schema** — the only per-incident "who responded" field is an aggregate staffing integer on `mod_unit_response`, not a roster. So this epic is purely this app's own authorization model, not NERIS data collection. Full roster tracking (rank, certs, fit-test, physicals) stays deferred to a later, separate epic exactly as FUTURE.md originally sketched it.

- **Onboarding, hybrid model:**
  - **Self-serve signup**: a new user creates an account and provides their department name + city/state. The app checks whether that `Department` already exists.
    - Doesn't exist yet → this signup creates it; the signer becomes that department's Admin.
    - Exists, has an Admin → the signup flow shows that Admin's name/email and tells the new user to contact them for an invite. No in-app request/approval queue for this pass — that's a reasonable later enhancement, not needed now.
    - Exists, has no Admin (e.g. a pre-seeded department, or an orphaned one) → the new signer can claim Admin ownership.
  - **Admin-invite**: an existing Admin enters a new user's email + role inside the app, creating a pending `User` row and a Clerk invite; `clerkId` links on first sign-in (mirrors the pattern `TEST-PLAN.md`'s E2E suite already uses for its seeded test user). A department Admin can only invite into their own department; a district-level Admin (Epic 2's hierarchy) can invite into any department under their district.
  - **Solo-admin fast path is fully allowed, by default, always** — one person creating, submitting, reviewing, approving, and sending is the default assumption, matching `CONTEXT.md`'s existing "two real usage shapes" design. **No system-wide mandatory second-reviewer/separation-of-duties rule** — a genuinely one-person department must be able to complete a record start to finish alone. If a department wants to require a second sign-off once they have enough people, that's a future per-department opt-in setting, not a hard rule baked into this pass.
- **The actual screen**: an Admin-only "Users" page — list department (or district) users, invite new ones, change roles, deactivate. That's the entirety of "Personnel Lite." No rank, no shift, no apparatus assignment, no certs — those stay in the separate, later, full Personnel epic.

## Epic 4 — Review & Approve workflow ✅ done (Sessions 10-12)

UI for the `Open → Submitted → Reviewed → Approved → Sent → Confirmed` chain the schema and `ReviewEvent` audit log already support (per `CONTEXT.md`'s Roadmap — none of this UI exists yet).

- **Officer/Chief queue**: a list of Submitted/Reviewed incidents awaiting action, scoped to the reviewer's department. (Open question, low-stakes, decide during the build: does a district-level role ever review incidents directly, or is district-level access oversight/reporting only? Default assumption is oversight-only — a district admin isn't in every child department's day-to-day review loop — revisit only if a real use case demands otherwise.)
- **Kickback-with-notes**: Officer/Chief sends a record from Reviewed/Approved back to Open with a required note (`ReviewEvent.note` already exists); the submitter sees why on their end. Needs UI on both sides — writing the note, and surfacing it after kickback.
- **Notifications, conditional on department size**: email + in-app alert on any status change needing someone's action — explicitly skipped when there's nobody else to notify (a genuinely solo department). Email provider isn't decided (Resend is a reasonable default for a Next.js/Vercel stack, but that's an implementation detail, not a planning blocker). In-app alerts don't need anything fancier than a `Notification` table plus an unread-count badge — no real-time/websocket infrastructure needed at this scale.
- **Solo-department fast path stays untouched**: nothing in this epic should add extra clicks/screens for a one-person department; the chain collapsing to one action in practice is the existing design, not something this epic changes.

## Epic 5 — NERIS feed finalization ✅ core done (Sessions 13-15); `/validate` hardening blocked

- **Admin-only NERIS credentials screen**: `nerisVendorClientId` / `nerisVendorSecretCipher` entry, `nerisEnvironment` (SANDBOX/PRODUCTION) toggle. This is the one real piece of the still-unbuilt Admin department-settings page (`CONTEXT.md` Roadmap) this pass needs — build it alongside Epic 2's Organization/Station/Unit settings screen, since both are Admin-only, rarely-touched department configuration.
- **API client — hand-written, not code-generated.** `ulfsri/neris-nodejs-client` isn't published as an installable package at all (confirmed) — it expects you to generate a client yourself from NERIS's OpenAPI spec and vendor the result. For the ~3 endpoints this app actually needs (token exchange, submit, and Epic 1's later `/validate` call), a small hand-written `fetch` client is the better call than standing up a second codegen pipeline alongside the existing CSV one — same "boring and well-established" instinct already applied elsewhere in this codebase (`pg` over the Neon WebSocket adapter). Reference the real OpenAPI spec (`api-test.neris.fsri.org/v1/openapi.json`) by hand for exact request/response shapes.
- **Auth**: confirmed OAuth2 client-credentials — `POST /token` with HTTP Basic `client_id:client_secret`, returns a bearer token. Matches the credential fields already in the schema.
- **Submission**: `POST /incident/{neris_id_entity}` — one incident per call, no batch endpoint exists. Returns 201 synchronously, then the record sits `SUBMITTED`-pending-async-validation on NERIS's own side (weather/census enrichment etc.) — this app's job ends at getting a successful 201 and recording it.
- **Trigger: fires automatically the instant a record hits `Approved`** — the original decision in `CONTEXT.md` stands, and is actually reinforced by what this session confirmed: NERIS's API has no batch endpoint at all, so a "weekly batch" would just mean this app self-imposing a week of latency for no technical reason, when real-time-per-record is not only feasible but the only shape NERIS's API really offers anyway. A scheduled sweep (e.g. nightly) remains the safety net for anything stuck `Approved`-but-not-`Sent`. `NerisSubmission.trigger`'s existing enum (`APPROVAL_AUTO` / `SCHEDULED_SWEEP` / `MANUAL_RESEND`) already models exactly this — no schema change needed.
- **`NerisSubmission` already tracks per-attempt `requestPayload`/`responseStatus`/`responseBody`/`succeeded`** — this epic wires real API calls into it, no schema change needed there either.
- **Later hardening, explicitly not this pass**: call NERIS's own `/validate` dry-run endpoint as an extra authoritative check at Approve time, once real sandbox credentials exist to test against (see Epic 1).

---

## Facts worth re-verifying before Epic 5 starts — resolved, Session 14

All three were checked directly against the real, downloaded `api-test.neris.fsri.org/v1/openapi.json` (763KB, OpenAPI 3.1, NERIS v1.4.78) rather than a summarized pass, which is what this section asked for. Answers, with full detail in Session 14's "Findings":

- **The raw spec was pulled and read directly.** It overturned several of this file's summarized-pass assumptions, including the production base URL (the spec declares no production server at all) and the exact `value1||value2||value3` incident-type join format.
- **`unit_id_linked` is genuinely optional at the API level.** Neither unit-response payload requires `unit_neris_id`; free-text `reported_unit_id` is an equally valid alternative. So Epic 2's local Unit table never needed to enforce real NERIS IDs, and a department that hasn't registered its apparatus can still submit.
- **`fd_parent_name`/`fd_child_name` still has no confirmed API path**, which changes nothing — Epic 2 built the hierarchy as app-only regardless, as planned.

The original text of this section is below for reference.

### Original (pre-Session-14)

This session's NERIS API research came from `WebFetch`-summarized passes over a large OpenAPI spec, not a byte-for-byte read — good enough to plan against, not to build blind against. Before writing the actual API client:

- Pull the raw `api-test.neris.fsri.org/v1/openapi.json` locally and grep/read it directly, rather than relying on the summarized passes this planning session used.
- Confirm whether an incident submission is actually rejected if `unit_id_linked` references a unit never created via NERIS's own `POST /entity/.../unit` — inferred from the ID's structural naming pattern (`FD########S###U###`), never directly confirmed. This affects how hard Epic 2's local Unit reference table needs to enforce real NERIS IDs vs. accepting a department's internal-only designation.
- Confirm `fd_parent_name`/`fd_child_name` genuinely has no API path (only absence-from-the-enumerated-paths was confirmed, not an explicit "this doesn't exist" statement from FSRI) — doesn't block Epic 2 either way, since that epic already treats the hierarchy as app-only regardless.

## Open items to resolve during the build sessions, not now

- District-level role reviewing incidents directly vs. oversight-only access (Epic 4).
- Email delivery provider (Epic 4) — Resend is a reasonable default, not locked in.
- "Organization" vs "Department" product copy in the UI (Epic 2) — schema keeps the `Department` name regardless.

---

## Retained from earlier notes — still valid, not part of this planning pass

- **Audit Protection** — similar to Shenny, an audit-proof change-log entry process showing every change, strategically placed and/or saved server-side for audit protection. Not scoped into any epic above; worth its own future grill session once the epics above land, since `ReviewEvent` already covers status-transition auditing but not field-level edit history.
- **Self-hosting under its own domain** — `www.openneris.com` was available as of the last check; revisit free/cheap hosting alternatives if this gets pursued. Per `CONTEXT.md`'s Deployment model, self-hosting stays a paid-service offering, not the primary path — this note is about the primary hosted instance's own domain, not a new deployment model.
- **Overall UX ethos**: "IT NEEDS TO BE AS EASY TO USE AS POSSIBLE for the end user (firefighters and chiefs) — even if it means more code under the hood." This is the standard every epic above is held to, not a task of its own — see `CLAUDE.md`'s UX conventions section for the concrete rules this has already produced.
- **Dashboard / reports** — useful canned reports and statistics, researched against what departments are already used to seeing. Still phase 2 per `CONTEXT.md`'s "Not yet decided" section; not touched by this session.
- **UI colors/layout pass** — still open, low priority, revisit whenever a dedicated visual-polish pass happens.
- ~~FDID/report-number standardization~~ — resolved by work already shipped: `Department.nerisFdId` plus the `internalId`/`internalIdMode` auto-generation system (see `CONTEXT.md`'s "Department-configurable internal ID") already gives every record a standardized FDID + sequential-report-number pairing.
