# TEST-PLAN.md

Planning session output for `open-neris-app`, produced by walking the `test-plan` process documented in `TEST-PLAN-CONTEXT.md` (no packaged `test-plan`/`test-implement` skill exists yet in this repo — this session performed the process directly).

## Status

**Phases 0–6 are complete** (commits `e04d125`..`34f4a19`, one commit per phase). Verified 2026-08-18: `npm run test` (301 tests, 38 files) and `npm run test:db` (35 tests, 6 files, Testcontainers-backed) both pass in full. Phase-by-phase conventions, helpers, findings, and known gotchas now live in `TESTING.md` — that's the living doc going forward, and it already reflects everything Phases 0–6 produced. This file no longer duplicates that content.

What remains below is background context — not a checklist — for whoever picks up the **Deferred / flagged** items next. Once those are worked through (or explicitly declined), this file can be deleted.

## App shape, for context

- **No API route handlers.** Every mutation is a Next.js Server Action, called directly from a form. No HTTP surface — this is why supertest was never used (see `TESTING.md`'s "Why no supertest").
- **DB layer directly reachable** — real Postgres (Neon in prod, Testcontainers in tests) via `lib/prisma.ts`'s singleton `PrismaClient`.
- **UI surface is still thin and mid-rebuild.** Sections 2–7 rebuild is an open roadmap item per `CONTEXT.md` — this is the specific condition the two deferred UI-testing items below (Accessibility, Playwright E2E) are waiting on. Re-check `CONTEXT.md`'s Roadmap section before pulling either forward; don't assume the UI has stabilized without checking.

## Decisions from the original planning session still relevant to deferred work

- **Doc-touching policy** — `CONTEXT.md` and `CLAUDE.md` are left untouched unless the user explicitly confirms otherwise; this held throughout Phases 0–6 and should continue to hold for deferred-item work.
- **Session/commit discipline** — one implementation category per session, manual review per commit, single-sitting phase sizing. Applied throughout Phases 0–6; apply the same discipline when picking up a deferred item.
- **Stack already in place** — Vitest (`npm run test` / `npm run test:db`), Testcontainers Postgres, GitHub Actions (PR-gated fast job + nightly DB job). Any deferred item that needs new tooling (e.g. Playwright, an accessibility checker) is a net-new addition on top of this, not a replacement.

## Deferred / flagged, not default-on the original pass

- **Accessibility (WCAG/508)** — UI surface is one shared component plus inline per-tab forms, still mid-rebuild (Sections 2–7). Recommend deferring to its own targeted phase once the tab shell stabilizes, rather than auditing forms that are still likely to change shape. Check `CONTEXT.md`'s Roadmap for current UI status before starting.
- **Visual regression** — off by default; UI too early/thin to be worth establishing baselines against yet. Same UI-stability gate as above.
- **Cross-browser / responsive** — off by default, same reasoning as visual regression.
- **Performance / load** — off by default; pre-launch, single-tenant-scale usage so far. Re-evaluate if usage patterns change.
- **AI/LLM pipeline output testing** — N/A. The AI-assisted entry feature described in `CONTEXT.md`'s Roadmap (rebuilt from the old Playwright repo's `fir.ai.e2e.test.ts`) isn't built yet — nothing to grade. Revisit once that feature exists; `TEST-PLAN-CONTEXT.md`'s taxonomy entry on AI/LLM output has the grading pattern to use (LLM-as-judge over `{input, output, rubric}` triples, multiple judge models, opt-in/scheduled not blocking).
- **BDD/Cucumber layer** — skipped by default; solo dev, no non-technical stakeholders needing a shared-language spec layer. Re-ask only if that changes (e.g. a non-technical stakeholder joins).
- **Real browser-driven E2E (Playwright)** — deliberately not part of the original pass. `CONTEXT.md`'s roadmap says to run the full test-planning process "once the UI sections are stable," and Sections 2–7 were mid-rebuild at the time. Phase 4's server-action-level multi-action journeys (`test/db/incident-journey.db.test.ts`) cover the same user journeys in the meantime. Revisit as its own phase once the tab shell and forms settle — check `CONTEXT.md`'s Roadmap first.
- **Golden master / characterization** — not used as its own category in the original pass; the one candidate (module-relevance) was verified against vendor CSVs instead of frozen unverified. No open item here unless a new candidate for this treatment surfaces.

## Known gotcha still open (not a Phase 0–6 gap — a real, flagged application behavior)

Two related findings from Phase 5, documented in full in `TESTING.md`'s "Findings flagged, not fixed, in this pass" section, are real bugs characterized as tests rather than fixed:

- `createIncident`'s `alarmTime` and `addDispatchComment`'s `timestamp` silently default to the Unix epoch (1970-01-01) when the field is entirely absent from `FormData`, instead of being rejected — a `z.coerce.date()` + missing `|| undefined` guard issue. One-line fix available (`|| undefined`, matching every other date field in the codebase) but not applied since Phase 5's scope was characterization, not fixes.
- `submitIncident` has no optimistic-locking guard — a genuine race can produce more than one `ReviewEvent` row for a single logical submission.

Neither was in the original Deferred/flagged list — flagging here so a future session doesn't miss them. Decide whether to fix, and if so, do it as its own small session per the commit discipline above, not folded into deferred-item work.

## Pre-existing doc handling

- **CONTEXT.md** — left untouched, per explicit confirmation in the original planning session. Still the source of truth for current UI/roadmap status — check it before starting any deferred item gated on UI stability.
- **CLAUDE.md** — not touched; it's the auto-regenerated `@AGENTS.md` pointer written by `next dev`, not a doc owned for extension.
- **TESTING.md** — the living doc for suite conventions, helpers, and phase findings. Update it, not this file, as deferred items get implemented.
