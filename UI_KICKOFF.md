# UI_KICKOFF.md

Read this and CONTEXT.md before writing any code. CONTEXT.md has the full architecture rationale, infrastructure lessons, and the field-verification discipline section — read that one specifically before touching any validation logic or field label, given how much time a wrong assumption there has already cost (four separate instances, see CONTEXT.md's list — one didn't fully resolve until an official NERIS reference doc got pulled).

**This file reflects the finalized `/grill-with-docs` session output.** It supersedes any earlier version. If you're starting a fresh session against this file and something here conflicts with the live repo state, the live repo is ground truth for what's built; this file is ground truth for what to build next.

## Session/commit discipline — non-negotiable

**One category of changes per Claude Code session.** Do not chain multiple categories (see the list below) into one continuous session. When a category is done — code compiles, the human has manually verified it in a browser per the Stop-after-each-section rule below — stop, report clearly what's done, and let the human commit before continuing. This keeps sessions restartable when they run long, and keeps commits reviewable in isolated chunks. Do not treat this file's category list as a mandate to work through it end-to-end unattended.

## Confirmed working right now

- Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind.
- Prisma 7.9.1 against a live Neon Postgres database via `@prisma/adapter-pg` (not `@prisma/adapter-neon` — see CONTEXT.md, the WebSocket adapter hangs inside Next.js request handling). Connection config lives in `prisma.config.ts`, not `schema.prisma`.
- `lib/prisma.ts` is the single Prisma Client instantiation point. Always import `prisma` from there.
- Clerk auth: `proxy.ts` (Next 16 naming, not `middleware.ts`), `ClerkProvider` in `app/layout.tsx`, custom pages at `app/sign-in/[[...sign-in]]` and `app/sign-up/[[...sign-up]]`.
- `lib/auth/current-user.ts` — `getCurrentAppUser()`, called at the point of every server action/route handler that touches incident data, not relied on via `proxy.ts` alone.
- `lib/neris/generated/enums.ts` — 141 generated TS enums, including `TypeNoaction` and `TypeSpecialModifier`, both currently unused pending this rebuild. Regenerate with `npm run generate:neris` if `vendor/neris-framework` has moved. Never hand-edit.
- Section 1 (Incident Core) exists as a single-form implementation. Treat it purely as a field-name and Zod-schema reference — it's being fully replaced by the tabbed structure below, including its create form, its chronology validation (still wrong post-877b4f5, see CONTEXT.md #4), and its `incidentNoActionReason` handling (wrong conditional + wrong type, see CONTEXT.md #3).
- Section 2 (Exposures) was built copying Section 1's superseded single-form pattern. Rebuild as a repeatable child-record list (see "Sections 2-7" below), not as a tab.

## The incident lifecycle — finalized shape

Full reasoning in CONTEXT.md's "Incident lifecycle" section.

1. **Create step, minimal:** primary/secondary incident type (1-3 rows, one marked primary — existing `TypePicker` component/pattern) and alarm time only, plus Special Modifiers (`specialModifiers`, `TypeSpecialModifier` enum) alongside type selection. `internalId` auto-generated per `Department.internalIdMode` (see "Data model changes" below) — never typed by the user. `incidentDate` derives from `alarmTime`.
2. **Incident Core is the incident's main page**, tabs: **Dispatch, Location, People & Displacement, Mutual Aid, Narrative, Actions Taken**. Tabs are nested App Router segments (`/incidents/[id]/dispatch`, `/incidents/[id]/location`, etc.) sharing one layout with the tab nav — clicking a tab loads that section in place via ordinary client-side transitions, not a scrolling single page. Each tab independently saved.
3. **Actions Taken tab** holds the mutually-exclusive pair: `IncidentActionTaken` (multi-entry, `type_action_tactic` value set) vs. `incidentNoActionReason` (single select against `TypeNoaction`: `CANCELLED`, `STAGED_STANDBY`, `NO_INCIDENT_FOUND`). Exactly one applies — UI should make the exclusivity obvious (e.g. picking one clears/disables the other), not just validate it server-side.
4. **Sections 2-7 (Exposures, Fire, Medical, HazSit, Rescues, Unit Response) are NOT two-phase tabs.** Each is a repeatable-child-record list on the incident detail page — "Add exposure" / "Add casualty" / "Add unit" opens one small, independently-saved form per record. This is a deliberate, considered difference from Incident Core, not an oversight: Incident Core is one large form that applies to every incident; these are zero-to-many child records, each small enough to fill in one shot.
5. **Type-gated module relevance:** the moment type(s) are set at create time, determine which of Sections 2-7 apply from the full `types` array (all rows, not just primary) via `lib/neris/module-relevance.ts` (new file — hand-maintained mapping, not generated). Grey out or hide inapplicable section tabs/links; applicable ones unlock immediately — do not wait on the rest of Incident Core being filled in first.
6. **Never hard-block data entry.** A user can fill in a tab/field NERIS wouldn't accept for the incident's determined type — let them track it locally. The thing that changes is what the final-validation-gate/NERIS-payload-builder includes, not what the UI allows typing into.
7. **Carry-over via quick-select, not silent auto-fill.** Section 2-7 forms with their own date/time or location fields (e.g. a unit's `timeOnScene`) should offer a quick-select affordance pulling from values already captured on Incident Core (e.g. "use dispatch's alarm time") rather than pre-filling silently.
8. **Final validation gate before Submit:** one reusable function, `lib/validation/incident-completeness.ts`, checks the real Zod schemas for whichever modules are relevant (per `lib/neris/module-relevance.ts`) and returns exactly what's missing. Right-sized for both a solo-department fast path and a future multi-role review chain — this function doesn't need to know which one it's running under.

## Auth pattern — non-negotiable

Every server action and route handler that touches incident data calls `auth()`/`getCurrentAppUser()` itself and checks the result, in addition to whatever `proxy.ts` filtered. Not optional, not a style preference — CVE-2025-29927 is why.

## Role model

`MEMBER` creates/edits own drafts, submits. `OFFICER` reviews, can kick back to `Open` with a note. `CHIEF` approves, eventually triggers the NERIS send (not built). `ADMIN` manages department config and users. Entirely the app's own `User.role` field — NERIS has no user concept at all. The multi-role review chain (Officer review → Chief approve/send, with kickback notes and email/in-app alerts) is real, wanted, and documented in CONTEXT.md's Roadmap — **not built in this pass.**

## Data model changes needed before UI work starts

These are schema/migration work, not yet applied — do first, as their own category:

- **`Department`:** add `internalIdMode` (enum-as-string: `YEAR_SEQUENTIAL` default, `SEQUENTIAL`, `CUSTOM_TEMPLATE`, `MANUAL`), `internalIdTemplate` (nullable, used only for `CUSTOM_TEMPLATE`), and an atomic per-department-per-year counter mechanism (a dedicated counter table or a transactional increment — must not race under concurrent creates from the same department). No settings UI to configure this yet — default (`YEAR_SEQUENTIAL`) is what ships; the Admin department-settings screen that would let a department change it is out of scope for this pass (see CONTEXT.md Roadmap).
- **New `IncidentDisplacement` table:** one row per displaced person, `causes: String[]`. Replaces the flat `Incident.incidentDisplacedCauses` array. `incidentDisplacedNumber` becomes a derived count of rows rather than a stored, independently-typed field.
- **`Incident`:** add `timeIncidentClear` (nullable DateTime) — real NERIS field (`core_mod_dispatch.csv`), currently has no Prisma column at all.
- **`Incident`:** wire up the already-existing but unused columns: `dispatchAutomaticAlarm`, `dispatchDeterminateCode`, `dispatchIncidentCode`, `dispatchFinalDisposition`, and the `IncidentDispatchComment` model — none currently appear in any form.
- **`incidentNoActionReason`:** stays `String?` in Prisma (per the app's no-native-enums convention), but the Zod schema must validate it against `TypeNoaction`, not free text, and its `superRefine` mutual-exclusivity rule with `incidentActionsTaken` needs to actually exist.
- **Dispatch chronology `superRefine`:** fix to `arrival ≤ answered ≤ create` (currently enforces `arrival ≤ create ≤ answer` — still wrong on the create/answer relative order, see CONTEXT.md #4 and `docs/research/neris-dispatch-timestamp-order.md`).

## Suggested implementation categories

Not a mandatory sequence — split differently if a better boundary presents itself — but this is the natural grain given the dependencies above, and each one should be its own session per the discipline at the top of this file:

1. Data model changes (above) — migration, regenerate Prisma client, no UI yet.
2. Zod/validation fixes — `TypeNoaction` enum + mutual-exclusivity `superRefine`, chronology fix, `lib/neris/module-relevance.ts` skeleton, `lib/validation/incident-completeness.ts` skeleton.
3. Create screen rebuild — minimal 2-field form, type + special-modifier picker, `internalId` auto-generation service.
4. Incident Core tab shell — nested routes/layout, tab nav, type-gating (grey/hide Section 2-7 links per `module-relevance.ts`).
5. Dispatch tab — times (24-hour, simplified entry, carry-over quick-select), automatic alarm, codes, disposition, comments, `timeIncidentClear`.
6. Location tab.
7. People & Displacement tab — including the new `IncidentDisplacement` per-person UI.
8. Mutual Aid tab — including the N/A/None option (see UX notes below).
9. Narrative tab.
10. Actions Taken / No-Action tab — the mutually-exclusive pair.
11. Final-validation-gate wiring to the Submit transition.
12. Sections 2-7 rebuild as repeatable child-record lists — start with Exposures, since it already exists and needs redoing against the new pattern.

## UX requirements, from manual-testing notes (BUGS.md, now folded in)

- **24-hour clock** on every time field, app-wide.
- **Simplified time entry** — no calendar popup for pure time selection; default to whatever time was chosen immediately above it (less re-navigating); grey out or otherwise prevent selecting an invalid time rather than allowing entry and rejecting on submit.
- **Mutual Aid needs an explicit N/A/None option**, not just an empty default.
- **Narrative fields:** no NERIS-mandated minimum length exists (checked — 100,000-char max only, no minimum). Required-for-Submit (via the completeness gate, since `neris_core=TRUE`), no minimum character count enforced.
- **Never clear the whole form on a validation error** — already fixed for Section 1 (controlled components bound to state), must hold for every new tab/form built in this pass. This was the single costliest UX bug so far; don't reintroduce it.

## Explicitly out of scope for this pass

- Actual NERIS submission (the `Sent`/`Confirmed` transition and the API call).
- Attachments — no home in NERIS's data schema, undecided.
- Address geocoding for the full civic-location decomposition.
- Reporting/dashboard views.
- Personnel/User Management, the multi-role Review & Approve UI (kickback notes, email + in-app status-change alerts), resend queue — real, wanted, sequenced for after the test-plan skill run (see CONTEXT.md Roadmap). Don't build toward them, but don't foreclose them either — the create screen and Workflow model already accommodate both without change.
- Full Admin department-settings page — this pass only adds the underlying `internalIdMode`/`internalIdTemplate` fields, not a screen to edit them.

## Stop-after-each-section rule

Do not proceed to the next tab, section, or implementation category until the human has manually verified the current one in a browser — actually clicking through the form, not just a passing type-check or an isolated database smoke test. Two real bugs already shipped past `tsc --noEmit` and `eslint` clean, and past a direct Prisma write/read/delete test, because neither of those exercises the actual rendered form or the real Zod validation path a user hits. Report clearly which of these you actually did versus which you're inferring from code review — "I ran X and saw Y" is different from "this should work," and both matter, but they're not the same claim.

## Style

No code comments. Minimal blank lines inside functions; a blank line after a function or major block ends. Match the formatting already in `scripts/generate-neris-value-sets.ts` and `lib/validation/incident-core.schema.ts`.
