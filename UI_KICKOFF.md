# UI_KICKOFF.md

Read this and CONTEXT.md before writing any code. CONTEXT.md has the full architecture rationale, infrastructure lessons, and the field-verification discipline section — read that one specifically before touching any validation logic or field label, given how much today cost from assuming NERIS field semantics instead of checking them.

**This file has changed shape since Section 2 (Exposures) was built.** Section 1 (Incident Core) was originally built as a single monolithic create form — that was a mistake, corrected after direct evidence from the old FIR system's own test automation showed a two-phase pattern (minimal create, then fill in the rest section by section) was what actually worked for real users. If a fresh planning session already updated this file further after a `/grill-with-docs` pass, that version supersedes this one — check git history / the live GitHub copy of this file before proceeding.

## Confirmed working right now

- Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind.
- Prisma 7.9.1 against a live Neon Postgres database via `@prisma/adapter-pg` (not `@prisma/adapter-neon` — see CONTEXT.md, the WebSocket adapter hangs inside Next.js request handling). Connection config lives in `prisma.config.ts`, not `schema.prisma`.
- `lib/prisma.ts` is the single Prisma Client instantiation point. Always import `prisma` from there.
- Clerk auth: `proxy.ts` (Next 16 naming, not `middleware.ts`), `ClerkProvider` in `app/layout.tsx`, custom pages at `app/sign-in/[[...sign-in]]` and `app/sign-up/[[...sign-up]]`.
- `lib/auth/current-user.ts` — `getCurrentAppUser()`, called at the point of every server action/route handler that touches incident data, not relied on via `proxy.ts` alone.
- `lib/neris/generated/enums.ts` — 141 generated TS enums. Regenerate with `npm run generate:neris` if `vendor/neris-framework` has moved. Never hand-edit.
- Section 1 (Incident Core) exists as a single-form implementation with two real, fixed bugs behind it: an inverted dispatch-time chronology check, and a form-reset-on-validation-error bug (React resets uncontrolled form fields whenever a server action completes, success or not — every form input must be a controlled component bound to state, not left uncontrolled). Both fixes are already applied. **This single-form implementation is being replaced per the lifecycle change below — treat it as a field-name and Zod-schema reference, not as the UI pattern to copy forward.**
- Section 2 (Exposures) was built copying Section 1's now-superseded single-form pattern. Needs revisiting once the two-phase pattern is finalized.

## The incident lifecycle — two-phase, this is the actual task

Full reasoning in CONTEXT.md's "Incident lifecycle" section. Summary:

1. **Create step, minimal manual entry:** primary incident type (1-3 rows, one marked primary) and alarm time only. `internalId` auto-generated, not user-typed. `incidentDate` derived from `alarmTime`.
2. **Everything else fills in from the incident's detail page**, broken into tabs, each independently saved: Dispatch times, Location, People & Displacement, Mutual Aid, Narrative. Re-verify every label against the real `vendor/neris-framework` CSV definitions while rebuilding — don't carry forward assumed labels from the old single-form version.
3. **Conditional field:** `incidentNoActionReason` only renders when the primary type resolves to `NOEMERG > GOOD_INTENT > NO_INCIDENT_FOUND_LOCATION_ERROR` (confirmed real value from `type_incident.csv`).
4. **Final validation gate before Submit:** one reusable function checks the real Zod schemas for whichever modules apply to this incident, returns exactly what's missing, blocks the `Open -> Submitted` transition until clear.

If a `/grill-with-docs` session has resolved the open question of whether Sections 2-7 also get this two-phase treatment, that answer overrides the per-section task list below — check CONTEXT.md and this file's own git history for the resolution before assuming Incident Core's pattern is unique.

## Auth pattern — non-negotiable

Every server action and route handler that touches incident data calls `auth()`/`getCurrentAppUser()` itself and checks the result, in addition to whatever `proxy.ts` filtered. Not optional, not a style preference — CVE-2025-29927 is why.

## Role model

`MEMBER` creates/edits own drafts, submits. `OFFICER` reviews, can kick back to `Open` with a note. `CHIEF` approves, eventually triggers the NERIS send (not built). `ADMIN` manages department config and users. Entirely the app's own `User.role` field — NERIS has no user concept at all.

## Stop-after-each-section rule

Do not proceed to the next section, or the next phase of the lifecycle rebuild, until the human has manually verified the current one in a browser — actually clicking through the form, not just a passing type-check or an isolated database smoke test. Two real bugs today shipped past `tsc --noEmit` and `eslint` clean, and past a direct Prisma write/read/delete test, because neither of those exercises the actual rendered form or the real Zod validation path a user hits. Report clearly which of these you actually did versus which you're inferring from code review — "I ran X and saw Y" is different from "this should work," and both matter, but they're not the same claim.

## Explicitly out of scope for this pass

- Actual NERIS submission (the `Sent`/`Confirmed` transition and the API call).
- Attachments — no home in NERIS's data schema, undecided.
- Address geocoding for the full civic-location decomposition.
- Reporting/dashboard views.
- Personnel/User Management, Review & Approve UI with return-for-info, resend queue, email notifications — real, wanted, explicitly sequenced for later. Don't build toward them yet, but don't build anything that forecloses them either (e.g., don't hardcode "no notifications ever" — see CONTEXT.md's Roadmap section for the actual constraints).

## Style

No code comments. Minimal blank lines inside functions; a blank line after a function or major block ends. Match the formatting already in `scripts/generate-neris-value-sets.ts` and `lib/validation/incident-core.schema.ts`.
