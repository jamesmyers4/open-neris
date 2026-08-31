# TEST-PLAN.md

Planning session output for `open-neris-app`, produced by walking the `test-plan` process documented in `TEST-PLAN-CONTEXT.md` (no packaged `test-plan`/`test-implement` skill exists yet in this repo — this session performed the process directly).

## Status

**Phases 0–6 are complete** (commits `e04d125`..`34f4a19`, one commit per phase). Verified 2026-08-18: `npm run test` (301 tests, 38 files) and `npm run test:db` (35 tests, 6 files, Testcontainers-backed) both pass in full. Phase-by-phase conventions, helpers, findings, and known gotchas live in `TESTING.md` — that's the living doc for suite mechanics going forward.

**This file is reactivated, not closed out.** The original Phases 0–6 pass left a "Deferred / flagged" backlog and two characterized-not-fixed bugs. This revision (2026-08-18, same day) turns that backlog into **Phases 7–12** below — one actionable now, five blocked on external conditions named explicitly per phase. Per `TEST-PLAN-CONTEXT.md` v0.7's "resuming deferred or blocked work" guidance: this doc is not a delete-when-Phase-6-lands artifact — expect it to gain further phase blocks like this one whenever a blocked item's gating condition changes. Don't delete it; update its Status section instead when a new wave completes.

**Phase 7 complete** (commit `92c3afa`, 2026-08-18 — see its Result subsection below): both known bugs fixed, suites green.

**Phase 8 complete** (2026-08-18 — see its Result subsection below). Sections 2–7's tab shell was re-checked against `app/incidents/[id]/layout.tsx` and confirmed stable (no `(not built yet)` labels remaining) before starting, per the pause note's own instructions.

**Paused here as of 2026-08-18 (superseded for Phase 8 by the Result below).** Phases 9–12 remain blocked/optional per their individually named gating conditions. **When resuming:**
1. Phase 9 (accessibility) rides on Phase 8's now-existing Playwright suite — see its subsection below for shape.
2. Phase 10 (visual regression) and Phase 11 (cross-browser) share the UI-stability gate (now cleared) **plus** a live re-ask of their opt-in decision at pickup time — don't assume the earlier "no" still holds.
3. Phase 12 (AI/LLM grading) is on an unrelated gate (the AI-assisted entry feature existing) — check separately, independent of the UI work.

**Update, 2026-08-31 — suite has grown a lot since this file's numbers were written.** `FUTURE-PLAN.md`'s Sessions 1-15 (five epics: validation gate, Organization structure, access control, Review & Approve, NERIS feed) each added their own coverage as they went, per that plan's own step-4 rule. Current counts: `npm run test` is **524 tests across 61 files** (verified 2026-08-31), and `test/db/` now holds **18 Testcontainers files** rather than the 6 this Status section originally recorded. The 301/38 and 35/6 figures above describe the Phase 0-6 pass only; treat them as history, not current state.

**`npm run test:db` has not been run since Session 12.** Sessions 13-15 ran in an environment with no working container runtime, so three pieces of real-Postgres coverage exist but have never executed: `test/db/neris-sweep.db.test.ts` (new), the corrected assertions in `test/db/review-queue.db.test.ts` (a real and intended consequence of Session 15's submit-on-Approve change, which now moves a credential-less department's incident to `ERROR`), and the encryption round-trip case in `test/db/admin-settings-happy-path.db.test.ts`. Run it locally with Docker before trusting any of the three.

**Phases 9-11's UI-stability gate has been cleared for a while** — the UI stopped moving after Section 2-7's rebuild, and Sessions 1-15 only added screens (`/admin/settings`, `/admin/users`, `/incidents/review`) rather than reshaping existing ones. Phase 9 (accessibility) is actionable now with no further gating. Phases 10 and 11 still need the opt-in re-ask noted below, not just the gate.

## App shape, for context

- **No API route handlers.** Every mutation is a Next.js Server Action, called directly from a form. No HTTP surface — this is why supertest was never used (see `TESTING.md`'s "Why no supertest").
- **DB layer directly reachable** — real Postgres (Neon in prod, Testcontainers in tests) via `lib/prisma.ts`'s singleton `PrismaClient`.
- **UI surface is still thin and mid-rebuild.** Sections 2–7 rebuild is an open roadmap item per `CONTEXT.md` — this is the specific condition Phases 9–11 below are gated on. **Re-check `CONTEXT.md`'s Roadmap section before starting any of Phases 9–11** — don't assume the UI has stabilized without checking, and don't assume it hasn't just because this doc still lists them as blocked.

## Decisions from the original planning session still relevant here

- **Doc-touching policy** — `CONTEXT.md` and `CLAUDE.md` are left untouched unless the user explicitly confirms otherwise; holds for every phase below.
- **Session/commit discipline** — one implementation category per session, manual review per commit, single-sitting phase sizing. Each phase below is scoped to fit that discipline; do not chain more than one phase into a single session.
- **Stack already in place** — Vitest (`npm run test` / `npm run test:db`), Testcontainers Postgres, GitHub Actions (PR-gated fast job + nightly DB job). Any phase needing new tooling (Playwright, an accessibility checker) is a net-new addition on top of this, not a replacement.

## Phase 7 — Fix the two known bugs (actionable now)

**Decision made 2026-08-18: fix both.** Not deferred further. Small, well-understood, low-risk; tests already exist to update rather than write from scratch.

### 7a — `alarmTime` / `timestamp` epoch-default fix

Root cause (full detail in `TESTING.md`'s "Findings flagged, not fixed, in this pass"): `z.coerce.date()` coerces `null` to `1970-01-01T00:00:00.000Z` instead of failing, and two call sites read a `FormData` value with no `|| undefined` fallback — every other date field in the codebase already has this guard.

- `app/incidents/actions.ts:28` — `alarmTime: formData.get('alarmTime')` → `alarmTime: formData.get('alarmTime') || undefined`.
- `app/incidents/[id]/dispatch/actions.ts:68` — `timestamp: formData.get('timestamp')` → `timestamp: formData.get('timestamp') || undefined`.
- Update both characterization tests (currently `it('silently defaults to the Unix epoch ... — see TESTING.md')` in each file's `*.formdata-edge.test.ts`) to assert the corrected behavior: a missing field now fails validation (`invalid_type`/`required`, matching the existing "field entirely absent" pattern already used for other required fields in the same files) instead of silently succeeding with epoch `1970-01-01`.
- Update `TESTING.md`'s "Findings flagged, not fixed" section — this finding is now fixed; either remove the bullet or convert it into a one-line "fixed in Phase 7" note so the history isn't lost.

### 7b — `submitIncident` optimistic-locking guard

Root cause: `submitIncident` (`app/incidents/[id]/actions.ts`) reads the incident, checks `reviewStatus === 'OPEN'` in application code, then writes unconditionally inside a `$transaction([...])` **batch array**. Under a genuine race, both calls can read `OPEN` before either writes, producing more than one `ReviewEvent` row.

- No schema migration needed — `reviewStatus` itself is the natural guard column. Fix by switching from the batch-array transaction form to the **interactive callback form** (`prisma.$transaction(async tx => {...})`, already used elsewhere in this codebase, e.g. `createIncident`) and replacing the unconditional `prisma.incident.update(...)` with a conditional `prisma.incident.updateMany({ where: { id: incidentId, reviewStatus: 'OPEN' }, data: { reviewStatus: 'SUBMITTED' } })`. Check the returned `count`: if `0`, another request already won the race — bail out of the transaction without creating a `ReviewEvent` row (mirrors the existing early-return pattern already in this function for the non-`OPEN` and incomplete-completeness cases).
- Update `test/db/concurrent-writes.db.test.ts`'s double-submit race test: it currently asserts only the safe invariants (ends `SUBMITTED`, every written event is well-formed) because exactly-one-`ReviewEvent` wasn't guaranteed before this fix. After the fix, tighten the assertion to exactly one `ReviewEvent` row for the race.
- Update `TESTING.md`'s "Findings flagged, not fixed" section the same way as 7a.

**Scope note:** this phase touches application code, not just tests — flag that plainly in the commit message/PR description rather than letting it read as a test-only change.

### Result (2026-08-18) — complete

Both bugs fixed as scoped, nothing deferred further:

- **7a** — `app/incidents/actions.ts:28` and `app/incidents/[id]/dispatch/actions.ts:68` both now read `formData.get(...) || undefined`. The two `*.formdata-edge.test.ts` characterization tests ("silently defaults to the Unix epoch...") were rewritten to assert the fixed behavior: `result.errors` defined, no DB write attempted, no `redirect`.
- **7b** — `submitIncident` (`app/incidents/[id]/actions.ts`) switched from the `$transaction([...])` batch-array form to the interactive-callback form, replacing the unconditional `incident.update` with a conditional `incident.updateMany({ where: { id, reviewStatus: 'OPEN' }, ... })`; a `count === 0` result bails out of the transaction (no `ReviewEvent`, no `revalidatePath`), mirroring the function's existing early-return style. `test/helpers/prisma-mock.ts` gained an `incident.updateMany` mock (both `$transaction` call shapes it already supported still work unchanged). `test/app/incidents/id/actions.test.ts` updated its success-path assertions to `updateMany` and gained a new test for the losing-race branch. `test/db/concurrent-writes.db.test.ts`'s double-submit race test was tightened from "at least one well-formed `ReviewEvent`" to "exactly one" — now a guaranteed invariant instead of a characterized gap.
- `TESTING.md`'s "Findings flagged, not fixed" section was rewritten to "Findings flagged in Phase 5, fixed in Phase 7," with the fix detail for each.
- Verified: `npm run test` (302 tests, 38 files — one net-new test), `npm run test:db` (35 tests, 6 files, Testcontainers/Docker-backed), `npx tsc --noEmit` all clean. `npm run lint` has 2 pre-existing `prefer-const` errors in `scripts/generate-neris-value-sets.ts`, unrelated to this phase and not touched.
- Not yet committed — manual review per this repo's recorded commit mode; user will commit directly.

## Phase 8 — Playwright browser-driven E2E

**Gating condition (cleared 2026-08-18):** `CONTEXT.md`'s Roadmap said to run real browser E2E once Sections 2–7 are stable. Re-checked the live tab shell (`app/incidents/[id]/layout.tsx`'s `sectionLinks`) directly before starting: Fire, Medical, HazSit, Rescues, and Responding Units all render as real links now, no `(not built yet)` labels remaining.

**Shape:** `@playwright/test`, happy-path incident lifecycle (create → dispatch → type-gate → submit) — the same journey Phase 4's `test/db/incident-journey.db.test.ts` already exercises at the server-action level, now driven through real forms in a real browser. Reused Phase 4's journey semantics as the spec for what "happy path" means (same field values, same FIRE/STRUCTURE_FIRE type, same dispatch times) rather than re-deriving it. "Review" in the original phase description is folded into the final assertion (the Overview tab's status badge reading `SUBMITTED`) rather than a separate reviewer-role UI step — that UI doesn't exist yet per `CONTEXT.md`'s Roadmap.

### Result (2026-08-18) — complete, local-only

- `test/e2e/incident-lifecycle.spec.ts` — one spec, signs in as a real Clerk test user (via `@clerk/testing/playwright`'s ticket-based `clerk.signIn({ emailAddress })`, not the password strategy — see `TESTING.md`'s "E2E suite" section for why that mattered, not just style), creates a FIRE/STRUCTURE_FIRE incident through the real `/incidents/new` form, fills Dispatch/Location/Narrative/Actions-Taken through their real tabs, asserts the Overview tab's completeness gate blocks submission on the missing Fire module (`Fire: investigation need` visible, no Submit button rendered — the UI's own gate, not a rejected click), fills the Fire tab, then submits and asserts the status badge reads `SUBMITTED`. Passed twice in a row locally, not flaky.
- `test/e2e/global-setup.ts` owns the whole server/DB lifecycle itself (Playwright's `webServer` option starts before `globalSetup` runs, confirmed against the installed package — too late to point a fresh container's `DATABASE_URL` at). Full mechanics, the `distDir` isolation fix (`next dev` refused to start a second instance against the developer's own running `.next` dir), and the Clerk-auth gotcha are all documented in `TESTING.md`'s new "E2E suite" section rather than duplicated here.
- `test/helpers/testcontainers-db.ts` — extracted the vitest-independent half of `test/helpers/db.ts`'s container start/stop, so Playwright's global setup doesn't pull `vitest` in as a dependency. `test/helpers/db.ts` re-exports it; existing DB tests unaffected (`npm run test:db` re-verified green after the extraction).
- **Decision made 2026-08-18, mid-phase: local-only for this pass, not wired into CI.** Real browser E2E is the first suite needing real Clerk secrets (`CLERK_SECRET_KEY`, a test user's password, a Clerk user ID) — `TESTING.md`'s CI section previously stated neither workflow needs real secrets; wiring this into GitHub Actions would break that invariant deliberately, not by accident, so it's deferred to an explicit follow-up rather than bundled into this phase. `npm run test:e2e` runs locally now; `.github/workflows/test-e2e.yml` (or an addition to an existing workflow) plus the actual GitHub Actions secrets are the follow-up's scope.
- Verified: `npm run test:e2e` passes (2/2 runs). `npm run test` (309 tests, 38 files) and `npm run test:db` (36 tests, 6 files) both re-verified green after this phase's changes. `npx tsc --noEmit` clean.
- Not yet committed — manual review per this repo's recorded commit mode; user will commit directly.

## Phase 9 (BLOCKED — pending UI stabilization, same gate as Phase 8) — Accessibility (WCAG/508)

**Gating condition:** same as Phase 8 — re-check `CONTEXT.md`'s Roadmap.

**Shape once unblocked:** axe-core integrated into Phase 8's Playwright suite (`@axe-core/playwright`) rather than a separate tool — sequence this after Phase 8, not before, since it rides on the same page interactions. Sweep the shared tab shell plus each stabilized per-tab form. Not optional/flagged-off — this is a default-on taxonomy category that was deferred for UI-churn reasons only, unlike Phases 10–11 below.

## Phase 10 (BLOCKED — pending UI stabilization; also optional/opt-in) — Visual regression

**Gating condition:** same UI-stability gate as Phase 8, **plus** a live re-ask of the opt-in decision at pickup time — this was off-by-default in the original pass specifically because baseline-maintenance cost wasn't worth it against a thin, still-changing UI. Don't assume the opt-in answer is still "no" just because it was "no" before, and don't assume it's now "yes" just because the UI has stabilized — ask.

**Shape if opted in:** Playwright snapshot testing, layered onto Phase 8's suite once it exists.

## Phase 11 (BLOCKED — pending UI stabilization; also optional/opt-in) — Cross-browser / responsive

**Gating condition:** identical to Phase 10 — re-check UI stability and re-ask the opt-in decision, don't assume either answer carried forward.

**Shape if opted in:** Playwright's multi-browser project config (Chromium/WebKit/Firefox) plus a small responsive-viewport matrix, layered onto Phase 8's suite.

## Phase 12 (BLOCKED — pending the AI-assisted entry feature existing at all) — AI/LLM pipeline output testing

**Gating condition:** independent of the UI-stability gate above. The AI-assisted entry feature described in `CONTEXT.md`'s Roadmap (rebuilt from the old Playwright repo's `fir.ai.e2e.test.ts`) isn't built yet — there is nothing to grade. Re-check `CONTEXT.md`'s Roadmap for this feature's status specifically, separate from the Sections 2–7 UI check.

**Shape once unblocked:** LLM-as-judge over `{input, output, rubric}` triples per `TEST-PLAN-CONTEXT.md`'s taxonomy entry — an adapter/fixture supplies input/output pairs, grading is a pure function over them, more than one judge model/family per check, opt-in or scheduled rather than blocking on every push, hosted-judge escalation gated behind a data-sensitivity flag if graded content could be sensitive.

## Not planned as phases — stays off, re-evaluate only if the trigger below fires

- **Performance / load (k6)** — off by default; pre-launch, single-tenant-scale usage. Re-evaluate if usage patterns change (multiple departments, sustained concurrent load) — not a UI or feature gate, a scale gate.
- **BDD/Cucumber layer** — skipped by default; solo dev, no non-technical stakeholder needing a shared-language spec layer. Re-ask only if that changes.
- **Golden master / characterization** — not used as its own category; the one candidate (module-relevance) was verified against vendor CSVs instead of frozen unverified. No open item unless a new candidate surfaces.

## Pre-existing doc handling

- **CONTEXT.md** — left untouched, per explicit confirmation in the original planning session. Still the source of truth for current UI/roadmap/feature status — check it before starting Phases 8–12, every time, not just once.
- **CLAUDE.md** — not touched; it's the auto-regenerated `@AGENTS.md` pointer written by `next dev`, not a doc owned for extension.
- **TESTING.md** — the living doc for suite conventions, helpers, and phase findings. Update it, not this file, as each phase above gets implemented — including converting the two Phase 7 "flagged, not fixed" entries into "fixed" notes.
- **TEST-MAINTAIN-CONTEXT.md** — new companion doc (v0.1, drafted 2026-08-18) for the still-unbuilt `test-maintain` skill. Not relevant to executing the phases above; relevant if/when `test-maintain` exists and this repo becomes a validation target for it.
