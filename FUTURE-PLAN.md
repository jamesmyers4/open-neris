# FUTURE-PLAN.md

Session-by-session implementation plan for the five epics `FUTURE.md` scoped out (2026-08-22 `/grill-with-docs` session). This doc turns those epics into **17 numbered sessions**, each sized to fit `CLAUDE.md`'s Session/commit discipline: one category of changes, human verifies in-browser, human commits, then (and only then) the next session starts. A future Claude Code session should read this file top-to-bottom, find the first unchecked session, and do only that one.

**Do not chain sessions.** Even two sessions that feel small and related (e.g. Session 4's schema and Session 5's picker UI) are separate commits on purpose — `FUTURE.md` and `CLAUDE.md` both call this out as the thing that broke last time it wasn't followed.

## How to use this doc, every session

1. Re-read `CONTEXT.md` and `FUTURE.md` first — both may have been updated by a prior session per step 6 below. Confirm the session you're about to start is actually still the next unchecked one; sequencing across epics matters (see `FUTURE.md`'s "Sequencing — decided").
2. Read this session's section in full before writing code. Each one names the files it touches and the specific vendor CSVs or existing patterns to verify against — don't skip the verification steps for a shortcut. Every hardcoded assumption about a NERIS field in this repo's history so far came from skipping exactly this (`CONTEXT.md`'s "Field-verification discipline").
3. Implement the session's scope only. If you discover adjacent work that seems necessary, note it in this file under that session's "Discovered during implementation" line (add the heading if it's the first note) rather than doing it — a future session picks it up.
4. Add or update the test automation named in the session's "Tests" subsection as you go, not as an afterthought — per this repo's actual convention (`TESTING.md`): fast Vitest for pure functions/schemas/mocked server actions, `*.db.test.ts` (Testcontainers) for real-DB behavior (constraints, races, cross-tenant isolation), Playwright E2E only where the session explicitly calls it out. Run the fast suite (`npm run test`) before ending the session; run `npm run test:db` too if the session touched schema, migrations, or DB-direct logic. A full combined run (`npm run test`, `npm run test:db`, `npx tsc --noEmit`, `npm run lint`) only needs to happen at Session 17, not every session — targeted runs are fine while working through 1–16.
5. Stop for manual browser verification per `CLAUDE.md`'s Stop-after-each-section rule before declaring the session done. State plainly what you actually clicked through versus what you're inferring from code/tests — those are different claims.
6. At the end of the session, update the doc(s) named in that session's "Docs to update" line, then stop and let the human commit. Do not commit yourself.

## Epic → session map

| Epic (`FUTURE.md`)                    | Sessions |
| -------------------------------------- | -------- |
| 1 — Validation/completeness gate rebuild | 1–3 |
| 2 — Organization structure              | 4–6 |
| 3 — Access control / User accounts      | 7–9 |
| 4 — Review & Approve workflow           | 10–12 |
| 5 — NERIS feed finalization             | 13–16 |
| Wrap-up                                 | 17 |

Sessions within an epic are ordered dependencies (4 before 5 before 6, etc.) — the table above is not a menu.

---

## Session 1 — Verify and correct the core-required flag

**Category:** field-verification / schema correction, no new UI.

**Goal:** `lib/validation/incident-completeness.ts` and every `*RequiredSchema` in `lib/validation/` currently encode requiredness by whatever each schema's author assumed at the time — some fields were driven by `neris_core` (the FUTURE.md-flagged wrong column for an app-only entry tool). Go module-by-module and pin every currently-required field to the correct vendor CSV column.

**Do this:**

- For each existing `*RequiredSchema` (`incident-dispatch`, `incident-location`, `incident-narrative`, `incident-actions-taken`, `incident-fire`, `incident-medical`, `incident-hazsit`), open the backing CSV in `vendor/neris-framework` (e.g. `core_schemas/modules/csv/incident/core_mod_incident.csv`, `core_schemas/modules/csv/dispatch/core_mod_dispatch.csv`, and the `mod_*.csv` under `secondary_schemas` or `core_schemas` for Fire/Medical/HazSit) and check the real value of `neris_core_app` (not `neris_core`) for every field the schema currently marks required. The CSV's columns are, in order: `neris_core`, `neris_core_if`, `neris_core_app`, `neris_core_cad`, `neris_core_aid` — confirmed present via `awk` against the header row, don't re-derive this from scratch.
- **This app is firefighter-facing entry, not a CAD feed** — `neris_core_app=TRUE` (or a satisfied `neris_core_if` conditional, evaluated against this app's own data shape) is the correct requiredness signal, per `FUTURE.md`. Where a field is `neris_core_app=FALSE` but the schema currently requires it, decide per-field whether to relax it — don't blanket-relax without checking `neris_core_if` first, since a field can be conditionally required in a way that still applies here.
- Cross-check this against `CONTEXT.md`'s "Field-verification discipline" list (5 entries) — confirm none of those five are re-broken by whatever change you make here, since some already have hand-verified `superRefine` conditional logic (e.g. `IncidentExposure.exposureItem`) that must survive untouched.
- Where a field's requiredness changes (required → optional or vice versa), update the corresponding Zod schema and, if the change affects what a form currently marks with a required-field affordance, leave the UI alone for this session — Session 3 owns UI. This session is schema/logic only.
- Write up, inline as a short comment-free changelog in this file (append under this session's heading, "Findings" subsection) or directly in `CONTEXT.md`'s Field-verification discipline list if a genuinely new wrong-assumption case turns up — that list exists exactly to capture this kind of finding.

**Tests:** Update `test/lib/validation/*.edge.test.ts` for every schema whose required/optional set changed. If a field flips from required to optional, the corresponding "missing required field" test case moves to a "field genuinely optional" case, not just deleted — assert the new behavior, don't just remove coverage. Re-run `npm run test`.

**Docs to update:** `CONTEXT.md`'s "Field-verification discipline" section only if a new wrong-assumption case was found (append entry #6+, following the existing five's format). Don't touch `README.md` or `CLAUDE.md` this session.

**Manual verification:** Open each incident tab whose schema changed in this session (Dispatch, Location, Narrative, Actions Taken, Fire, Medical, HazSit) in a real browser against a test incident, confirm the tab still saves correctly and no previously-working save now rejects.

**Findings:**

- **The premise of this session's own instructions was partly wrong.** `neris_core_app` does not apply to every module — per `core_schemas/modules/README.md`'s own column docs, it "only applies to `core_mod_disp`" (Dispatch). Every other module CSV (`core_mod_incident.csv` and its child module CSVs) has this column blank throughout; the real signal there is plain `neris_core` (+ `neris_core_if` for conditionals). Recorded as `CONTEXT.md` Field-verification discipline entry #6, since this is exactly the kind of wrong-column mistake that list exists to capture.
- **Dispatch bug, fixed:** `incidentDispatchRequiredSchema` required `dispatchTimeCallArrival`/`Answer`/`Create` — all `neris_core_app=FALSE` (CAD-populated, not app-required) — while omitting `timeIncidentClear` (`neris_core_app=TRUE`, the actual app-required field). Schema now requires `timeIncidentClear` only. `get-submit-completeness.ts` and both test files updated to match.
- **Location, Narrative, Actions Taken, Fire's `fireInvestigationNeed`, Medical's `hasPatientRecord`, HazSit's `hazsitDisposition`/`hazsitEvacuated`:** checked against `neris_core` (+ `neris_core_if`), all already correct. No changes.

**Discovered during implementation — genuine gaps found, not fixed this session (out of scope: these are currently-*unrequired* fields that arguably should become required, not currently-required fields that are wrong; several also need incident-type-array or child-row data threaded into the completeness check, which is more wiring than this session's stated scope):**

- **Fire (`mod_fire.csv`):** `fire_suppression_appliance` is `neris_core=TRUE` unconditionally but isn't required today. `fire_water_supply` is conditionally required "if suppression_appliance is none." `fire_investigation_type` is conditionally required "if formal cause and origin investigation was completed." `structure_arrival_conditions`/`structure_damage`/`structure_floor_of_origin`/`structure_room_of_origin`/`structure_fire_cause` are all conditionally required when the incident's type array includes `STRUCTURE_FIRE` — this needs the type array threaded into the Fire completeness check's `data`, the same wiring Session 2 will need for `riskReduction` (also `STRUCTURE_FIRE`-gated). Worth doing together. (`outside_fire_cause` is *not* a gap — `neris_core=FALSE` there despite `db_required=TRUE`, so it's a NERIS-DB-only requirement, not a federal-minimal-completeness one.)
- **Location (`mod_location_use.csv`):** `use_type`, `use_subtype`, `use_status`, `use_vacancy`, `use_type_secondary`, `use_subtype_secondary` are all `neris_core=TRUE`, but the completeness gate checks none of them (and `use_status` doesn't even exist as a field in `incidentLocationTabSchema` yet). Requiring these would be a real UX-visible behavior change (blocking Submit on location-use data that's currently fully optional) — needs a deliberate decision, not a drive-by fix.
- **HazSit (`mod_hazard.csv`):** `chemical_dot_class`/`chemical_name`/`chemical_release_occurred` are `neris_core=TRUE` per chemical row, but `incidentHazsitRequiredSchema` only checks the flat `hazsitDisposition`/`hazsitEvacuated` fields — no "at least one hazard chemical row, with its own required fields" check exists, unlike Medical's `hasPatientRecord` pattern. Same repeatable-child-record shape as Session 2's Exposures/Rescues/Unit Response work; natural to fold in there for consistency.
- **Dispatch's `dispatch_point` (lat/long) and `dispatch_location`/`dispatch_unit_response`:** all `neris_core_app=TRUE` per the CSV, but not implementable as schema requirements yet — `dispatch_point` needs the not-yet-built geocoding step (already tracked in `CONTEXT.md`'s Data model rationale), and `dispatch_unit_response`/location are already covered by the Location tab's existing requirement / Session 2's Unit Response wiring respectively. No new gap, just confirming consistency.

---

## Session 2 — Wire every relevant module into the completeness gate

**Category:** completeness gate — full module wiring, no new UI beyond what the gate already surfaces.

**Goal:** `lib/incidents/get-submit-completeness.ts` currently only checks `dispatch`, `location`, `narrative`, `actionsTaken`, `fire`, `medical`, `hazsit`. `lib/neris/module-relevance.ts`'s `getRelevantModules` can also return `exposures`, `unitResponse`, `rescuesFf`, `rescuesNonFf`, `riskReduction`, `emergingHazard`, `tacticTimestamps` — none of these currently have a `ModuleCheck` in the gate at all, so an incident can hit Submit with e.g. a HAZSIT type and zero exposures/unit-response data and nothing blocks it. (Note: by the time you read this, `get-submit-completeness.ts` may already tag fire/medical/hazsit correctly rather than everything `'core'` — confirmed already-fixed as of this planning session, contradicting `TESTING.md`'s Phase-4 tripwire note. Re-check the file directly; don't trust either doc blindly, per this repo's own field-verification discipline applied to its own code this time.)

**Do this:**

- For each of the seven currently-unwired modules, check whether a `*RequiredSchema` already exists in `lib/validation/` (as of this planning session, none do — `incident-exposure.schema.ts`, `incident-unit-response.schema.ts`, `incident-rescue.schema.ts`, `incident-risk-reduction.schema.ts` (doesn't exist yet as a file — check), `incident-emerging-hazard.schema.ts` (same), and tactic-timestamps have no required-schema file). Build one per module, following the exact pattern of the existing ones (e.g. `incidentFireRequiredSchema` in `incident-fire.schema.ts`) — a minimal Zod object over just the fields that are actually `neris_core_app=TRUE` for that module, verified against the vendor CSV the same way Session 1 did, not assumed.
- Exposures, rescues (Ff/NonFf), and Unit Response are repeatable child records (per `CONTEXT.md`'s Section structure) — their completeness check is likely "at least one row exists with its own required fields satisfied," not a flat object check like Fire/Medical. Follow the existing `hasPatientRecord: incident.medicals.length > 0` pattern in `get-submit-completeness.ts` as the template for "at least one row" modules, but check per-row field completeness too, not just row-count — a medical record with zero required medical fields filled in should still block Submit.
- Wire each new schema into `getSubmitCompleteness`'s `checks` array with the correct `ModuleKey` tag (matching `lib/neris/module-relevance.ts`'s `ModuleKey` union exactly) so `checkIncidentCompleteness`'s existing relevance filtering (`lib/validation/incident-completeness.ts`) does the type-gating for free — no new gating logic needed there, this session is purely about the missing `ModuleCheck` entries.
- `tacticTimestamps` is unconditionally relevant per the existing code comment in `module-relevance.ts` (`possible_if` is unconditional; only `neris_core_if`, governing federal-reporting-requiredness not tab-availability, is FIRE-gated) — its required-schema, if any fields are genuinely `neris_core_app=TRUE`, applies regardless of incident type. Verify whether it has any required fields at all before assuming it needs a check — it may legitimately have none.

**Tests:** New `test/lib/validation/incident-*-required.test.ts` (or fold into existing per-module edge test files) for each new required schema. Update `test/lib/incidents/get-submit-completeness.test.ts` (create if it doesn't exist yet) to cover: a HAZSIT-typed incident blocked on missing hazsit-relevant exposure/unit-response data, a FIRE-typed incident unaffected by missing medical data (relevance filtering still works), and the existing fire/medical/hazsit cases still pass. If `test/db/incident-journey.db.test.ts`'s `TODO_pending_sections_2_7_completeness_gate` tripwire test (see `TESTING.md`) still exists, this is the session where it's expected to start failing — update it to assert the new, genuinely-differing-by-type behavior per that test's own documented instructions, don't revert the gate to make it pass.

**Docs to update:** `TESTING.md` — if the tripwire test changes, note it the same way Phase 7's findings were converted from "flagged" to "fixed." `CONTEXT.md`'s "Final validation gate before Submit" paragraph if its description of the gate's scope is now stale.

**Manual verification:** Create one incident per newly-gated module's triggering type (at minimum: a HAZSIT incident, a RESCUE-triggering incident, and a plain FIRE incident with no secondary STRUCTURE_FIRE type to confirm Risk Reduction correctly stays ungated) and confirm Submit is blocked/unblocked correctly as data is filled in.

---

## Session 3 — Inline completeness UX (red-asterisk + contextual guidance)

**Category:** UI — completeness surfacing, no schema/logic changes.

**Goal:** Required-but-empty fields need to be visually flagged on the tab/form itself as the user works through it — not only a list that appears at Submit time. Per `FUTURE.md`: "This needs to be woven into each tab, not bolted on afterward."

**Do this:**

- Build one shared component (e.g. `components/incidents/required-field-indicator.tsx` — check `components/` for the actual existing naming convention before inventing a new one) that renders a red asterisk or equivalent marker next to a field's label when that field is required for the incident's determined-relevant module set and currently empty. Drive it from the same `checkIncidentCompleteness`/`getSubmitCompleteness` machinery Session 2 finished wiring — don't build a second, separate notion of "required" in the UI layer.
- Each tab (Dispatch, Location, People & Displacement, Mutual Aid, Narrative, Actions Taken/No-Action, plus Fire/Medical/HazSit/Exposures/Rescues/Unit Response where relevant) needs this wired in, not just a subset — this is the "not bolted on afterward" instruction. Since this touches every existing tab, this session is legitimately larger than most — if it doesn't fit in one sitting, it's still one category (don't split "half the tabs now, half later" into two sessions; finish all tabs or explicitly note in this file's "Discovered during implementation" which tabs are done vs. deferred and why).
- "Smart contextual guidance" — a short inline hint near an empty required field pointing at what's missing (not a generic "required" label with no context) is part of this session's scope, not a nice-to-have deferred later. Keep hint copy short; this is a firefighter filling out a form in the field, not reading documentation (per `CONTEXT.md`'s Overall UX ethos).
- Keep the existing end-of-flow Submit-blocked list (`CONTEXT.md`'s "Final validation gate" — "surfaced to the user as a clear list") — this session adds the inline layer on top, it doesn't replace the final gate's own summary.
- This is explicitly **not** the session to add non-blocking warnings for `neris_core_app=false`-but-recommended fields — `FUTURE.md` calls that out of scope for this whole epic.

**Tests:** Component-level tests for the new indicator component (does it show/hide correctly given a mock completeness result). If any existing Playwright E2E spec (`test/e2e/incident-lifecycle.spec.ts`) asserts on the DOM around a required field, check it still passes — it may need an update if the DOM structure around required fields changed enough to affect its selectors.

**Docs to update:** None required unless a genuinely new UX convention was established beyond what `CONTEXT.md`'s "UX conventions" section already lists — if so, append it there (not `CLAUDE.md`, which just points at that section).

**Manual verification:** Walk through creating an incident end-to-end as a human would, watching the red-asterisk/hint behavior update live as fields are filled in on at least two different tabs, including one repeatable-record tab (e.g. Exposures) and one flat-form tab (e.g. Dispatch).

**Epic 1 complete after this session** — this closes out `FUTURE.md`'s Epic 1 in full. Confirm all three of Epic 1's checkboxes above are actually done (not just this session's) before moving to Epic 2.

---

## Session 4 — Organization schema (Department hierarchy, Station, Unit)

**Category:** schema + migration, no UI yet.

**Goal:** Build the app-only Department hierarchy and the local Station/Unit reference tables per `FUTURE.md` Epic 2's first four bullets.

**Do this:**

- Add `parentDepartmentId String?` (self-relation, nullable) to `Department` in `prisma/schema.prisma`, with the Prisma self-relation pattern (`parent Department? @relation("DepartmentHierarchy", fields: [parentDepartmentId], references: [id])`, `children Department[] @relation("DepartmentHierarchy")`). Keep the model named `Department` — no rename, per `FUTURE.md`'s explicit naming decision.
- Add the Department-level fields `FUTURE.md` calls out regardless of NERIS: `address`, `city`, `state`, `zip`, `mailingAddress` (or a structured mailing-address set if that's more consistent with `IncidentLocation`'s existing pattern — check that model first), `fdType` (career/volunteer/combination — confirm the exact enum values against `core_mod_entity_fd.csv` rather than guessing career/volunteer/combination verbatim), and aggregate staffing counts by category (full-time/part-time career, volunteer, EMS-only, civilian — confirmed against `core_mod_entity_fd.csv`, field names TBD from the actual CSV, not invented here).
- New `Station` model: `id`, `departmentId` (FK), `label`, `address`, `nerisStationId String?` (free-text, admin-entered, not validated against a live NERIS lookup — confirmed no `GET` exists on that resource).
- New `Unit` model: `id`, `stationId` (FK), `designation`/`label`, `capabilityType` (verify the real NERIS unit-capability value set/enum name in `lib/neris/generated/enums.ts` or the vendor CSVs before inventing a string), `nerisUnitId String?` (same free-text pattern as Station).
- Change `IncidentUnitResponse.unitIdLinked` from a plain `String` to a real FK: `unitIdLinked String`, `unit Unit @relation(fields: [unitIdLinked], references: [id])` — check whether this needs to stay nullable/optional for incidents created before Units exist (almost certainly yes, given "never hard-block incident entry on this being complete" — see Session 5).
- One migration for all of the above (`npx prisma migrate dev`). This is a genuinely additive migration — no existing column is dropped or retyped except `unitIdLinked`'s referential-integrity addition, which needs a data-backfill plan if any real `IncidentUnitResponse` rows already exist with free-text values that don't match a `Unit.id`. In dev/test data this is a non-issue; note in this file if production data exists by the time this session runs (it currently doesn't, per the app's status).

**Tests:** `test/db/*.db.test.ts` coverage for the new hierarchy (a district department's query scope includes descendants; a leaf department's doesn't include siblings/parent), and for the new FK constraint on `unitIdLinked` (cascade/restrict behavior on Unit deletion — decide and test the intended behavior, e.g. does deleting a Unit that's referenced by historical incidents get blocked or nulled). Follow the existing `cross-department-boundary.db.test.ts` pattern for tenant-isolation-style assertions.

**Docs to update:** None yet — Session 6 updates `CONTEXT.md`'s Data model rationale section once the full Organization feature (schema + UI) is done, not split across sessions.

**Manual verification:** This session has no UI — verify via `npx prisma studio` or a direct script that the migration applied cleanly against a real dev database and the hierarchy/FK relationships behave as expected (create a parent/child department pair, a station, a unit, confirm queries traverse correctly).

---

## Session 5 — Unit Response FK picker + quick-add

**Category:** UI — one form (Unit Response tab), depends on Session 4's schema.

**Goal:** Replace the Unit Response tab's freeform `unitIdLinked` text entry with a real picker against `Unit` rows, with an inline "quick-add a unit" affordance for departments that haven't finished setting theirs up.

**Do this:**

- `app/incidents/[id]/unit-response/new` (and the edit path, if one exists) — swap the current text input for a `<select>`/combobox sourced from the department's `Unit` rows (via `Station`, scoped to the department).
- "Quick-add a unit" — an inline mini-form or modal that creates a `Station` (if none exists yet) and `Unit` without leaving the Unit Response form, then immediately selects the newly created unit. Keep this genuinely quick — a crew mid-incident-entry shouldn't have to navigate to a separate admin screen.
- **Never hard-block incident entry on Unit setup being complete** — per `FUTURE.md`, this is a hard requirement, not a suggestion. If a department has zero Units, the picker should still let the tab be filled with a clear path to quick-add, not a dead end.

**Tests:** `test/app/incidents/id/unit-response/*.test.ts` (mocked-DB, fast suite) covering the picker's data source and the quick-add path's server action. One `*.db.test.ts` case for a department with zero pre-existing units successfully completing a Unit Response entry via quick-add end to end.

**Docs to update:** None this session.

**Manual verification:** As a department with no Units set up yet, open a real incident's Unit Response tab, quick-add a unit inline, confirm it's selected and the form saves. Then, as a department with existing Units, confirm the picker lists and selects them correctly.

---

## Session 6 — Admin Organization/Station/Unit settings screen

**Category:** UI — new Admin-only settings area, depends on Session 4's schema.

**Goal:** The Admin-only department settings screen `CONTEXT.md`'s Roadmap has called "not built yet" since before this planning pass. This session builds the Organization/Station/Unit portion of it (Epic 5's NERIS-credentials portion is a later session on the *same* screen — see Session 13).

**Do this:**

- New route, e.g. `app/admin/settings/page.tsx` (check for any existing `app/admin` convention before choosing the path — none exists yet as of this plan). Gate it on `role === 'ADMIN'` server-side (per `CONTEXT.md`'s auth pattern — check at the point of the server action/route, not just via a layout-level redirect).
- Department fields form: name, address/city/state/zip, mailing address, `fdType`, staffing counts by category, plus the already-existing-but-unsurfaced `internalIdMode`/`internalIdTemplate` fields (`CONTEXT.md` notes `internalIdMode` "is one field on the not-yet-built Admin department-settings page" — this is that page).
- Station/Unit CRUD tables — list, add, edit, (soft- or hard-) remove, scoped to the admin's own department (or department + descendants, for a district-level admin — depends on Session 4's hierarchy existing and Session 8/9's role scoping; if district-level admin roles aren't built yet by the time this session runs, scope this to single-department only and note the district case as a follow-up in this file).
- The low-priority `GET /entity/{neris_id_entity}` prefill nice-to-have from `FUTURE.md` is optional for this session — include it only if it fits without expanding scope; otherwise note it as deferred in this file, don't silently drop it.

**Tests:** Fast-suite tests for the new server actions (create/update Department fields, create/update/delete Station and Unit) following the existing `actions.test.ts` mocked-Prisma pattern. A `*.db.test.ts` case confirming an Admin from department A cannot edit department B's settings (tenant-isolation, same pattern as `cross-department-boundary.db.test.ts`).

**Docs to update:** `CONTEXT.md`'s "Data model rationale" (document the hierarchy/Station/Unit additions the way existing entries there are documented) and Roadmap section (Organization structure epic done); `README.md`'s "Not done yet" list (remove "Admin department settings screen" only once Session 13 also lands — note partial completion here if Session 13 hasn't run yet, since the screen isn't fully done until NERIS credentials are on it too).

**Manual verification:** As an Admin, walk through editing department fields, adding a Station, adding a Unit under it, and confirm a non-Admin user cannot reach `/admin/settings` at all (redirect or 403, not just a hidden nav link).

**Epic 2 complete after this session.**

---

## Session 7 — Self-serve signup flow

**Category:** onboarding — schema + signup UI, no admin-invite yet.

**Goal:** `FUTURE.md` Epic 3's self-serve signup path: new user provides department name + city/state; app checks whether that `Department` exists and routes to create/claim/contact-admin accordingly.

**Do this:**

- Schema: decide and add whatever `User` state is needed to represent "invited but not yet linked to Clerk" vs. "active" (`FUTURE.md` mentions a "pending `User` row" for the admin-invite path in Session 8 — if this session's self-serve path needs the same concept, e.g. a `status` field or reusing `clerkId` nullability, design both paths' state together now even though invite UI itself is Session 8's scope, so the schema doesn't need a second migration next session for the same concern).
- Signup flow, after Clerk account creation: collect department name + city/state, look up `Department`:
  - Not found → create it, new user becomes Admin (`role: 'ADMIN'`).
  - Found, has an Admin → show that Admin's name/email, instruct the user to request an invite. No in-app request queue this pass, per `FUTURE.md`.
  - Found, no Admin → let the new user claim Admin ownership.
- "Has an Admin" check: query `User` rows for that department with `role: 'ADMIN'` — confirm whether more than one Admin can exist per department already (schema allows it, `UserRole` has no uniqueness constraint) and handle the "show that Admin's contact info" case sensibly if there's more than one (e.g. show all, or the earliest-created — decide and note the decision here).

**Tests:** Fast-suite tests for the department-lookup/create/claim logic as a pure function plus a thin server-action wrapper. `*.db.test.ts` for the three real branches (create-new, contact-existing-admin, claim-orphaned) against a real database, including a race case if two users try to claim the same orphaned department simultaneously (optimistic-locking pattern, same style as `submitIncident`'s Phase 7 fix in `TEST-PLAN.md` — reuse that pattern, don't reinvent it).

**Docs to update:** None yet — Session 9 covers the doc update for the whole epic.

**Manual verification:** Sign up as three different test users covering all three branches (brand-new department, existing-with-admin department, existing-orphaned department) and confirm each routes correctly.

---

## Session 8 — Admin-invite flow

**Category:** onboarding — invite UI + Clerk integration, depends on Session 7's schema decisions.

**Goal:** An existing Admin invites a new user by email + role; `clerkId` links on first sign-in.

**Do this:**

- Server action: Admin enters email + role, creates the pending `User` row (department-scoped) and a Clerk invite (via Clerk's backend SDK — check what's already imported/configured for Clerk server-side calls elsewhere in this codebase before adding a new dependency).
- Linking: on first sign-in, resolve the pending `User` row by email (or Clerk's invite metadata, whichever Clerk's API makes more reliable) and set its `clerkId`. `TEST-PLAN.md` references "the pattern `TEST-PLAN.md`'s E2E suite already uses for its seeded test user" — check `test/e2e/global-setup.ts`'s seeding approach for the existing clerkId-linking convention this should mirror rather than diverge from.
- Scoping: a department Admin invites only into their own department; a district-level Admin (if Session 4's hierarchy + a district-admin role concept exist by now — check `UserRole` enum, it currently has no district-level distinction, so this session may need to add one, e.g. `DISTRICT_ADMIN`, or represent "district admin" as `ADMIN` on a non-leaf `Department` — decide based on what's actually simplest given Session 4's schema, note the decision here) can invite into any department under their district.
- Solo-admin fast path stays fully intact — inviting nobody is a completely valid, default, unremarked-on state. Don't add any UI nudging a solo admin to invite others.

**Tests:** Fast-suite tests for the invite-creation server action (mocked Clerk SDK call). `*.db.test.ts` for the clerkId-linking-on-first-sign-in path and for the department-scoping restriction (an Admin from department A cannot invite into department B; a district Admin can invite into a child but not a sibling district's department).

**Docs to update:** None yet.

**Manual verification:** As an Admin, invite a real test email, confirm the Clerk invite fires, sign in as that invited user via the real invite link, confirm the `User` row links correctly and the role/department are as set.

---

## Session 9 — Users admin page ("Personnel Lite")

**Category:** UI — the actual screen, depends on Sessions 7 and 8.

**Goal:** Admin-only Users page: list department (or district) users, invite new ones (Session 8's action), change roles, deactivate.

**Do this:**

- New route, e.g. `app/admin/users/page.tsx`, same Admin gating pattern as Session 6.
- List: department's users (or district + all descendant departments' users, for a district Admin), with role and status (active/pending-invite) visible.
- Change role: server action updating `User.role`, scoped the same way invites are.
- Deactivate: decide the mechanism — no `deletedAt`/soft-delete pattern exists anywhere in this schema currently (confirmed by grep in `TESTING.md`'s Phase 5 notes), so either add a `status`/`active` field on `User` (if Session 7 didn't already add one covering this) or clarify that "deactivate" means something else in this app's model (e.g. Clerk-side account suspension without a local flag). Don't introduce a bespoke soft-delete pattern inconsistent with the rest of the schema without a clear reason.
- Explicitly out of scope, per `FUTURE.md`: rank, shift, apparatus assignment, certs. Don't add fields "while you're in there."

**Tests:** Fast-suite tests for list/role-change/deactivate server actions. `*.db.test.ts` for department/district scoping on the list view itself (a leaf-department Admin's list never includes another department's users; a district Admin's does include descendants).

**Docs to update:** `CONTEXT.md`'s "Roadmap" section (Personnel/access-control epic done) and its "Not yet decided" section if the district-admin role question from Session 8 resolved something listed there. `README.md`'s "What's next" section — Personnel tracking's access-control piece is done; named-individual roster tracking (the separate later epic) is still not.

**Manual verification:** As an Admin, view the Users list, invite a new user (exercises Session 8's flow through this UI), change an existing user's role, deactivate one, and confirm a Member/Officer/Chief cannot reach `/admin/users` at all.

**Epic 3 complete after this session.**

---

## Session 10 — Notification schema + Officer/Chief review queue

**Category:** schema + core review UI.

**Goal:** The list of Submitted/Reviewed incidents awaiting action, scoped to the reviewer's department, per `FUTURE.md` Epic 4's first bullet — plus the `Notification` table Session 12 will need, added now so it's not a second migration for the same epic.

**Do this:**

- Add a `Notification` model: `id`, `userId` (FK), `incidentId` (FK, nullable if a notification type ever isn't incident-specific), `type` (enum — status-change categories), `read Boolean @default(false)`, `createdAt`. Keep it minimal — this session doesn't need to send anything yet, just have somewhere to write rows Session 12 will populate and read.
- Review queue: `app/admin/review` or `app/incidents` with a filtered view (check existing routing conventions before picking a path) listing `reviewStatus IN (SUBMITTED, REVIEWED)` incidents scoped to the current user's department (Officer/Chief role check, same auth pattern as elsewhere).
- Wire the existing `Open -> Submitted -> Reviewed -> Approved` transitions (the schema/actions already support this per `CONTEXT.md`'s Workflow section — check `app/incidents/[id]/actions.ts` for what's already there vs. what this session adds) to real buttons on this queue/detail view.
- **Open item to resolve here, not deferred further:** does a district-level role ever review incidents directly, or is district access oversight-only? `FUTURE.md` defaults to oversight-only. Decide during this session (the default stands unless a concrete reason surfaces to revisit) and note the decision in this file.
- Solo-department fast path: confirm this session adds zero extra clicks/screens when there's no one else to route to — the existing collapse-to-one-action behavior must stay intact.

**Tests:** Fast-suite tests for the queue's filtering/scoping logic and the new transition-triggering actions. `*.db.test.ts` for department-scoping (an Officer never sees another department's Submitted incidents) and for the solo-department collapse behavior remaining unaffected by the new queue existing.

**Docs to update:** None yet.

**Manual verification:** As an Officer, view the review queue with a mix of Submitted/Reviewed/Open incidents across two departments, confirm only the correct department's Submitted/Reviewed ones show, and walk one incident through Reviewed → Approved via the real UI.

---

## Session 11 — Kickback-with-notes

**Category:** UI — one workflow path, depends on Session 10's queue existing.

**Goal:** Officer/Chief sends a record from Reviewed/Approved back to Open with a required note; the submitter sees why.

**Do this:**

- `ReviewEvent.note` already exists in the schema (per `FUTURE.md`) — confirm the field and its current usage in `app/incidents/[id]/actions.ts` before adding new schema.
- UI side one: a kickback action on the review queue/incident-detail view requiring a note (client-side required-field validation plus server-side rejection of an empty note — don't trust the client alone).
- UI side two: surfacing the kickback note to the submitter — on the incident's detail page (an Open-status incident that was kicked back should visibly show the most recent kickback note, not bury it in an audit-log-only view nobody checks unprompted).

**Tests:** Fast-suite test for the kickback action (note required, transition correctness — Reviewed/Approved → Open). `*.db.test.ts` confirming the `ReviewEvent` audit row is written correctly and the note round-trips to the submitter-facing view.

**Docs to update:** None yet.

**Manual verification:** As an Officer, kick back a Reviewed incident with a note, then as the original submitter (or by switching roles/users), confirm the note is visibly surfaced on that incident.

---

## Session 12 — Notifications (email + in-app)

**Category:** notifications, depends on Session 10's `Notification` table.

**Goal:** Email + in-app alert on any status change needing someone's action, explicitly skipped for a genuinely solo department.

**Do this:**

- Pick an email provider — `FUTURE.md` suggests Resend as a reasonable default for Next.js/Vercel but leaves it undecided; make the call this session (Resend unless something concrete argues otherwise) and note it here and in the doc update below, since `CONTEXT.md`'s "Not yet decided" list currently carries this as open.
- Wire `Notification` row creation into every status transition needing someone's action (Submitted needing Officer review, Reviewed needing Chief approval, kickback needing the submitter's attention) — skip notification creation entirely when the department has only one user (the "explicitly skipped when there's nobody else to notify" rule), not just skip sending, since even an unread in-app badge is noise for a solo operator.
- In-app: unread-count badge, sourced from `Notification.read = false` rows for the current user. No real-time/websocket infra — a page-load or periodic-refetch count is sufficient per `FUTURE.md`.
- Email: send on the same trigger points, using whatever the chosen provider's Node SDK requires (API key in env, following this repo's existing env-var conventions — check `.env.example`).

**Tests:** Fast-suite tests for the notification-creation logic (mocked email provider, mocked Prisma) covering both the "sends" and "correctly skipped for solo department" branches explicitly — the skip branch is a real requirement, not an edge case to leave untested. `*.db.test.ts` for a genuinely multi-user department's full notify-on-transition path.

**Docs to update:** `.env.example` (new email-provider env vars); `CONTEXT.md`'s "Not yet decided" section (remove the email-provider line, since it's now decided); `README.md`'s "Not done yet" (Review & Approve line).

**Manual verification:** With a real (or provider-sandboxed) email address, trigger a Submitted→needs-review transition in a two-user test department and confirm both the email and the in-app badge fire; then confirm a solo-user department's equivalent transition produces neither.

**Epic 4 complete after this session.**

---

## Session 13 — NERIS credentials admin screen

**Category:** UI — one form, on the same settings area Session 6 built.

**Goal:** Admin-only entry for `nerisVendorClientId`/`nerisVendorSecretCipher` and the `nerisEnvironment` toggle — these fields already exist on `Department` in the schema (confirmed in `prisma/schema.prisma`), this session just builds the form.

**Do this:**

- Add this to the same `app/admin/settings` screen Session 6 built (per `FUTURE.md`: "both Admin-only, rarely-touched department configuration" belong in one settings area, not three).
- Client secret entry: never round-trip the plaintext secret back to the client after initial save — write-only field in the UI (show a masked placeholder like "•••• set" once configured, not the real value), encrypted at rest via the existing `ENCRYPTION_KEY`-based application-layer encryption `CONTEXT.md` documents for `nerisVendorSecretCipher`. Confirm that encryption helper already exists somewhere in `lib/` (check before writing a new one) — the schema comment implies it's expected to exist, verify it does.
- `nerisEnvironment` toggle: `SANDBOX`/`PRODUCTION`, already a Prisma enum (`NerisEnvironment`).

**Tests:** Fast-suite test for the credentials-save action (secret is encrypted before storage, never returned in plaintext from a read action). `*.db.test.ts` confirming a stored-then-reloaded secret round-trips through the real encryption path correctly.

**Docs to update:** `README.md`'s "Not done yet" — this closes out the full Admin department-settings page item (combined with Session 6).

**Manual verification:** As an Admin, enter test (non-real) credentials, save, reload the page, confirm the secret shows masked (not plaintext) and the environment toggle persisted.

---

## Session 14 — NERIS API client (auth + submit)

**Category:** new integration code, no UI.

**Goal:** Hand-written `fetch`-based client for the ~3 endpoints this app needs, per `FUTURE.md`'s explicit decision not to stand up a second codegen pipeline.

**Do this:**

- **First**, per `FUTURE.md`'s "Facts worth re-verifying before Epic 5 starts": pull the raw `api-test.neris.fsri.org/v1/openapi.json` locally (save it under e.g. `docs/research/` or a scratch location — don't commit a large generated spec file into the main tree without a reason) and read it directly for the token/submit endpoints' exact request/response shapes, rather than trusting the summarized description in `FUTURE.md` itself.
- Auth: `POST /token`, HTTP Basic `client_id:client_secret`, returns a bearer token. Handle token caching/expiry sensibly (don't re-auth on every single call if the token has a meaningful TTL — check the spec for the actual TTL).
- Submit: `POST /incident/{neris_id_entity}` — one incident per call, 201 on success. Build the request-payload mapping from this app's `IncidentDetail` shape (see `lib/incidents/get-incident-detail.ts` or equivalent) to NERIS's expected submission JSON — this is likely the largest single piece of code in this session, and needs the same field-by-field CSV verification discipline as every other NERIS-facing piece of this codebase. Exclude data outside the incident's determined-relevant module set from the payload, per `CONTEXT.md`'s "Data integrity without hard-locking" rule — this is where that exclusion actually gets enforced, not at data-entry time.
- Client lives somewhere like `lib/neris/api-client.ts`, credentials read from the encrypted `Department` fields (Session 13), decrypted only at call time, never logged.
- This session does **not** wire the client into any trigger yet (Session 15's scope) — build and unit-test the client in isolation first.

**Tests:** Fast-suite tests mocking `fetch` (or whatever HTTP layer is chosen) for both auth and submit calls — success paths, 422 validation-error response shape, network-failure handling. No live sandbox calls in the automated suite (no committed real credentials) — if a smoke-test-against-real-sandbox is wanted, it's a manual, human-run script, not part of `npm run test`.

**Docs to update:** `CONTEXT.md`'s Stack line ("`ulfsri/neris-nodejs-client`... not yet wired up") — correct it to describe the hand-written client actually built, per `FUTURE.md`'s explicit decision that the vendor package isn't installable as-is.

**Manual verification:** No UI to click through this session — instead, run a manual one-off script (not part of the test suite) against real NERIS sandbox credentials (if available by this point) confirming a token exchange succeeds and one real test submission returns 201. If sandbox credentials aren't available yet, say so plainly rather than claiming this was verified — this is exactly the kind of claim `CLAUDE.md`'s Stop-after-each-section rule asks to be honest about.

---

## Session 15 — Submission trigger wiring

**Category:** integration wiring, depends on Session 14's client.

**Goal:** Fire the real submission automatically on the `Approved` transition; track every attempt in `NerisSubmission`; scheduled sweep + manual resend for anything stuck.

**Do this:**

- Hook Session 14's `submit` call into whatever code currently handles the transition to `Approved` (check `app/incidents/[id]/actions.ts` / Session 10-11's review-workflow code for the exact transition point).
- Write a `NerisSubmission` row per attempt — `requestPayload`/`responseStatus`/`responseBody`/`succeeded` already exist on that model per `CONTEXT.md`, no schema change needed. `trigger: 'APPROVAL_AUTO'` for this path.
- On success: mark the incident `Sent`, store `nerisIncidentId` (already a field on `Incident`, unique).
- On failure: mark the incident's `reviewStatus` `Error` (already in the `ReviewStatus` enum), keep the `NerisSubmission` row as the failure record.
- Scheduled sweep: a nightly job (check whether this app already has any scheduled-job infra — Vercel Cron is the natural fit given the Vercel hosting model; if nothing exists yet, this is new infra, flag it as such) that finds `Approved`-but-not-`Sent` incidents and retries with `trigger: 'SCHEDULED_SWEEP'`.
- Manual resend: an Admin/Chief-facing action (likely on the incident detail page, for an `Error`-status incident) with `trigger: 'MANUAL_RESEND'`.

**Tests:** Fast-suite tests for the trigger-on-Approved wiring (mocked API client) covering success, 422-style rejection, and network-failure branches, each asserting the correct `Incident.reviewStatus` and `NerisSubmission` row. `*.db.test.ts` for the scheduled-sweep query logic (finds exactly the stuck `Approved` incidents, ignores everything else) against a real database.

**Docs to update:** `CONTEXT.md`'s Workflow section (this closes the loop the section already describes prospectively — "NERIS submission fires once, automatically, on the transition to Approved" — confirm the prose still matches reality once built, adjust if the real implementation diverged in some noted way). `README.md`'s "Not done yet" — remove "Actual submission to NERIS."

**Manual verification:** Approve a real (test/sandbox) incident through the actual UI and confirm it ends up `Sent` with a real `nerisIncidentId`, or `Error` with a legible failure reason if sandbox rejects it. If sandbox credentials still aren't available, say so explicitly and describe what was verified against a mocked client instead — don't claim the real integration was exercised if it wasn't.

**Epic 5's core is functionally done after this session** — Session 16 is explicitly later hardening, not required for Epic 5 to be considered shippable.

---

## Session 16 — `/validate` dry-run hardening (needs real sandbox credentials)

**Category:** hardening, gated on external condition.

**Goal:** Call NERIS's own `POST /incident/{neris_id_entity}/validate` dry-run endpoint (204 valid / 422 with errors, no record created) as an extra authoritative check, per `FUTURE.md`'s explicit sequencing of this after the rest of Epic 5.

**Gating condition — check before starting:** this needs real NERIS sandbox credentials to test against meaningfully. If Session 13-15 ran without real credentials (a real possibility per those sessions' honesty requirement above), this session is blocked — say so, don't attempt it against a mock alone, since the entire point is validating against NERIS's real behavior.

**Do this once unblocked:**

- Add a `validate` method to Session 14's API client, same auth/error-handling pattern as `submit`.
- Call it at the Approve action's boundary (before or alongside the real `Approved` transition — decide whether a failed dry-run should block the transition entirely or just warn, and note that decision here) — and, per `FUTURE.md`'s Epic 1 note, this is also where Epic 1's local completeness gate gets its authoritative real-world cross-check: a case where the local gate says "complete" but NERIS's `/validate` still 422s is a signal the local gate itself has a gap worth fixing, not just a per-incident problem to route around.
- If real `/validate` rejections surface local-gate gaps, this is also the trigger `FUTURE.md`'s Epic 1 named for finally considering the "warning-only surfacing of `neris_core_app=false`-but-recommended fields" idea it explicitly deferred — still don't build that speculatively; only if a real rejection pattern demonstrates the local gate needs it.

**Tests:** Fast-suite tests for the `validate` client method (mocked). `*.db.test.ts`/manual coverage for the Approve-boundary wiring's chosen block-vs-warn behavior.

**Docs to update:** `CONTEXT.md`'s Roadmap/Epic-1-related notes if any real gap between the local gate and NERIS's authoritative validation was found and fixed — this is exactly the kind of finding that section exists to capture.

**Manual verification:** Approve a real sandbox incident, confirm the `/validate` call fires and its result is handled as decided above, including at least one deliberately-incomplete test incident that should genuinely fail dry-run validation.

---

## Session 17 — Full suite run + final documentation pass

**Category:** wrap-up, no new features.

**Goal:** Everything above is implemented; this session verifies the whole thing together and brings `README.md`, `CONTEXT.md`, and `CLAUDE.md` up to date as the user's original instruction required, plus retires completed items from `FUTURE.md`.

**Do this:**

- Run the full suite: `npm run test`, `npm run test:db` (Docker required), `npm run test:e2e` if Playwright specs exist and cover any of the new flows meaningfully (extend `test/e2e/incident-lifecycle.spec.ts` or add a new spec for the review/approve/NERIS-send journey if none exists — this is the natural session for a new end-to-end "create → submit → review → approve → sent" spec, since all the pieces now exist for the first time), `npx tsc --noEmit`, `npm run lint`. Fix anything red — don't leave it for a future session.
- `README.md`: rewrite "Status" and "Not done yet"/"What's next" sections to reflect reality — almost everything currently listed as not-done should now be done; Personnel roster tracking (the separate, later, explicitly-deferred epic) is the one big remaining item, plus Attachments and reporting/dashboards (still phase 2, untouched by this whole plan).
- `CONTEXT.md`: update the Roadmap section (all five epics done, point at what's actually next — the separate Personnel-roster epic, Attachments, reporting/dashboards, per `FUTURE.md`'s "Retained from earlier notes"), the Stack section if the NERIS client description needs another pass beyond Session 14's update, and "Not yet decided" (should be mostly empty now — district-review-scope and email-provider were both resolved in Sessions 10/12; Attachments and hosted-vs-verified signup remain).
- `CLAUDE.md`: only touch this if a genuinely new durable working-convention was discovered across these 16 sessions that future work should follow (the existing Session/commit discipline and Stop-after-each-section rules almost certainly don't need edits — they're what made this plan's structure work in the first place). Don't edit it just to have touched it.
- `FUTURE.md`: mark all five epics complete (or, for any that ended up genuinely partial per a session's "Discovered during implementation" note, say so precisely rather than blanket-closing). Move any newly-surfaced future work (Personnel roster epic refinements, anything flagged mid-plan) into its own section, following the file's existing "Retained from earlier notes" pattern rather than inventing a new structure.
- This plan document (`FUTURE-PLAN.md`) itself: once every session above is genuinely done and docs are updated, it can be deleted or kept as a historical record — ask the user which they'd prefer rather than assuming.

**Docs to update:** `README.md`, `CONTEXT.md`, `CLAUDE.md` (conditionally), `FUTURE.md` — all in this one session, as the user's original instruction specified.

**Manual verification:** A full click-through of the "two real usage shapes" `CONTEXT.md` describes — once as a solo-department user taking one incident from creation through NERIS-sent, once as a multi-role department exercising the full Member→Officer→Chief chain including a kickback — confirming nothing regressed across all 16 prior sessions' combined changes.
