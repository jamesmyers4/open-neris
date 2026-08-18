# TEST-PLAN.md

Planning session output for `open-neris-app`, produced by walking the `test-plan` process documented in `TEST-PLAN-CONTEXT.md` (no packaged `test-plan`/`test-implement` skill exists yet in this repo — this session performed the process directly). Written once; revised occasionally, not continuously updated. `TESTING.md` is the living doc — created during Phase 0 of implementation, not here.

## 0. Runtime viability check — skipped, already documented

Not re-verified this session. `CONTEXT.md`'s "Database & auth infrastructure" section already states the app is independently verified against a live Neon database and a real Clerk sign-in — an already-documented answer per the three-tier discipline's carve-out, cited rather than re-asked. `test-implement` should still confirm `npm run dev` / `npm run build` succeed as a cheap sanity check at the start of Phase 0, but this is not expected to surface anything new.

## What this app actually looks like, layer by layer

This matters more than usual here because the scan surfaced a real mismatch between the tooling you'd used before (vitest + supertest) and this app's actual shape — resolved in this session's interview, recorded below.

- **No API route handlers exist.** `find app -iname route.ts` returns nothing. Every mutation is a Next.js **Server Action** — a `'use server'` async function taking `(incidentId, prevState, FormData)` or similar, called directly from a form, not over HTTP. There is no HTTP server for supertest to attach to.
- **DB layer is directly reachable.** Real Postgres (Neon in prod; a local Testcontainers instance for tests, per this session's decision below), accessed exclusively through `lib/prisma.ts`'s singleton `PrismaClient`. Nothing bypasses it except one deliberate raw-SQL block (see Phase 2).
- **UI surface is currently thin.** One shared component under `components/`; forms are written inline inside each tab's `page.tsx`. Sections 2–7 are mid-rebuild per the latest commits (`Sections 2-7 rebuild, starting with Exposures`). Real browser-driven E2E is deliberately **not** in this pass — see the E2E note under Phase 4.

So "API layer" in this plan means **server actions called directly**, and "integration test" means calling an exported action function with a constructed `FormData` and a real (or mocked, per test) auth/DB context — not an HTTP round-trip.

## Decisions from this session (interview + confirmed findings)

| # | Question | Resolution |
| - | -------- | ---------- |
| 1 | `generateInternalId`'s SEQUENTIAL/MANUAL modes bucket the atomic counter under `year=0` instead of the incident's real year | **Intentional** — one continuous department-wide counter for those two modes, not yearly. Pinned as current spec in Phase 2. |
| 2 | `module-relevance.ts`'s "always relevant" baseline (`exposures`, `unitResponse`, `rescuesFf`, `rescuesNonFf`, `emergingHazard`) — lock in as spec or verify against vendor CSVs first? | **Verify against vendor CSVs first.** See Action Item before Phase 1, below — this project has a documented history (`CONTEXT.md` §Field-verification discipline) of getting NERIS field-gating wrong on first read. |
| 3 | How to test server actions given no HTTP layer / supertest has nothing to hit | **Call server actions directly in Vitest** — import the exported function, construct `FormData`, mock `getCurrentAppUser`/auth as needed. Standard pattern for Next.js Server Actions. supertest is not used anywhere in this plan. |
| 4 | Test DB strategy | **Ephemeral local Postgres via Testcontainers**, migrated fresh per run with `prisma migrate deploy`. Not the real Neon dev DB — avoids any risk of test data polluting or colliding with real department/incident data. |
| 5 | Commit/review mode | **Manual review per commit** — this is the first `test-plan` run on an original, actively-developed project rather than a disposable fork; matches your existing one-implementation-category-per-session discipline. |
| 6 | Coverage depth / risk tolerance | **Thorough everywhere.** No tab or module gets smoke-only treatment, including the simpler ones (Narrative, Mutual Aid). This makes Phase 5 (edge/negative/boundary) a fully-scoped, must-complete phase, not a time-permitting tail. |
| 7 | Session/runway budget | **Single-sitting phases** — the validated default from prior `test-plan` runs. |
| 8 | CI schedule | **Set up now.** PR-gated job: unit + server-action tests (fast, no container). Separate nightly job: the Testcontainers-backed DB suite and the multi-action journey suite (Phase 2 and Phase 4), since spinning up a real Postgres container on every push is unnecessary overhead for a solo-dev repo at this stage. |
| 9 | Touch `CONTEXT.md`? | **No** — left untouched per explicit confirmation (collision policy). `CLAUDE.md` also untouched — it's the auto-regenerated `@AGENTS.md` pointer, not a doc you own to extend. |

**BDD/Cucumber layer, visual regression, existing test-doc filename** — not asked this session; conditions for asking didn't hold (solo dev/no non-technical stakeholders; UI surface too thin/early to be worth baselining; no existing TESTING.md-equivalent to rename). See "Deferred, not default-on" below for the reasoning on each.

## Action item before Phase 1's module-relevance tests

`lib/neris/module-relevance.ts`'s baseline "always relevant" module set needs to be checked against `vendor/neris-framework`'s `mod_*.csv` `possible_if`/`neris_core_if` hints — the same discipline already applied elsewhere in this project (`CONTEXT.md` §Field-verification discipline, 4 logged mistakes from skipping exactly this step). If verification surfaces a mismatch between the code and the real gating rule, fix the mapping (or characterize it explicitly as a known issue, xfail-style, per the infer-but-confirm discipline) **before** Phase 1 writes tests that lock the current behavior in as correct. This is a `test-implement`-time task, not resolved in this planning session — flagged here so it isn't silently skipped.

## Coverage sweep

| Taxonomy category | Layer(s) | Current coverage | Plan |
| --- | --- | --- | --- |
| Unit tests | pure functions, Zod schemas | None (no test files in repo) | Phase 1 |
| Integration / API contract | server actions (DB-backed) | None | Phase 3 |
| DB-direct tests | Postgres constraints, raw SQL, cascades | None | Phase 2 |
| E2E happy path | multi-action journey, server-action level | None | Phase 4 (reinterpreted — see note) |
| Edge, negative, boundary | all of the above | None | Phase 5 |
| Authorization / boundary (tenant isolation) | server actions | None — but code inspection shows a *consistent* `departmentId`-scoped `findFirst` guard across all 9 actions files, which is a good sign, not a bad one | Phase 3 (sequenced early within that phase per the discipline's own priority rule) |
| Accessibility (WCAG/508) | UI | None | Deferred — see below |
| Golden master / characterization | — | N/A this pass | Not used as a distinct category; module-relevance is being verified rather than frozen unverified (see Action Item) |
| Cross-browser / responsive | UI | None | Deferred, off by default |
| AI/LLM pipeline output | — | N/A | Feature not built yet (Roadmap only) |
| Visual regression | UI | None | Deferred, off by default |
| Performance / load | — | None | Deferred, off by default |

## Sequencing — bootstrap mode

Sweep came back entirely Gap (zero existing tests), so this follows bootstrap ordering: fast/isolated/deterministic layers first (they become fixtures later layers reuse), then integration, then the reinterpreted E2E layer, then edge cases, then the self-review close-out. "Thorough everywhere" changes how much scrutiny each phase gets once reached, not this order — confirmed as an independent axis in `TEST-PLAN-CONTEXT.md`'s own sequencing philosophy.

### Phase 0 — Test infrastructure bootstrap

- Install and configure Vitest for this Next.js 16/TypeScript project.
- Install `@testcontainers/postgresql` (or equivalent). Build a shared test helper: spin up a throwaway Postgres container, run `prisma migrate deploy` against it, expose a scoped `PrismaClient` pointed at the container, tear down after the run.
- Build a reusable auth-mocking helper for `getCurrentAppUser()` — a fake signed-in user (with `id`, `departmentId`, `role`) and a fake signed-out state, since almost every server action's first line depends on it.
- `npm run test` (unit + server-action, no container), `npm run test:db` (DB + journey suite, container-backed) as separate scripts — mirrors the CI split from decision #8.
- GitHub Actions workflow: PR-triggered `test` job; nightly-scheduled `test:db` job. Reuses whatever Node version this environment already runs (confirm via `node -v` at implementation time — not guessed here) rather than reimplementing its own setup, per this project's own CI-reuse discipline (`TEST-PLAN-CONTEXT.md` step 0).
- Sanity-check `npm run dev` / `npm run build` still succeed (the deferred runtime-viability spot-check from step 0 above).

### Phase 1 — Unit tests: pure logic

Run the Action Item (module-relevance CSV verification) first, then:

- **All 8 Zod schema files** (`incident-actions-taken`, `incident-core`, `incident-create`, `incident-dispatch`, `incident-exposure`, `incident-location`, `incident-mutual-aid`, plus the simpler `incident-narrative`/`incident-people-displacement`): valid input, missing-required-field, wrong-enum-value cases, and every `superRefine`/`refine` conditional rule found in the scan — e.g. `incident-exposure`'s "exposureItem required only when exposureType is EXTERNAL_EXPOSURE", `incident-actions-taken`'s two `superRefine` blocks, `incident-core`/`incident-create`'s `types` array refine (1–3 rows, exactly one primary).
- `lib/incidents/generate-internal-id.ts`'s `applyTemplate()` — placeholder substitution (`{year}`, `{seq}`, `{seq:N}` zero-padding), template with no placeholders, template with unknown placeholder text left untouched.
- `lib/neris/module-relevance.ts` — `getRelevantModules`/`isModuleRelevant` across representative type combinations (empty types, FIRE only, MEDICAL only, HAZSIT only, FIRE+STRUCTURE_FIRE as value2, combinations that shouldn't trigger anything extra) — written against whatever the Action Item above confirms as correct.
- `lib/validation/incident-completeness.ts`'s `checkIncidentCompleteness` — module-gating × per-check pass/fail combinations, using constructed `ModuleCheck[]` fixtures rather than a real DB row.
- `lib/incidents/get-submit-completeness.ts` — same, but through the real shape it assembles from an `IncidentDetail`-like fixture.

### Phase 2 — DB-direct tests (Testcontainers Postgres)

Direct-DB coverage per the layer-reachability assessment — Postgres is reachable, so these are real DB tests, not merely implied through the server-action layer above.

- **Constraints:** `@@unique([departmentId, internalId])` on `Incident`, `@@unique([departmentId, year])` on `DepartmentIdCounter`, global uniqueness on `Department.nerisFdId`, `User.clerkId`, `Incident.nerisIncidentId`.
- **Cascade deletes:** deleting an `Incident` cascades to every child module table (`IncidentType`, `IncidentActionTaken`, `IncidentDispatchComment`, `IncidentDisplacement`, `IncidentLocation`, `IncidentExposure`, `IncidentFire`, `IncidentMedical`, `IncidentHazsit` — and its own child `IncidentHazardChemical` — `IncidentRescueFf`, `IncidentRescueNonFf`, `IncidentUnitResponse`, `IncidentRiskReduction`, `IncidentEmergingHazard`, `IncidentTacticTimestamps`, `ReviewEvent`, `NerisSubmission`). Deleting a `Department` cascades to `DepartmentIdCounter`.
- **`generateInternalId`'s atomic counter** — this is the one place in the codebase using raw `$queryRaw` SQL instead of Prisma's query builder, and it's exactly the kind of thing an API-level test can route around without noticing a bug:
  - `ON CONFLICT ... DO UPDATE` correctness — first call for a `(departmentId, year)` pair inserts at `counter=1`, subsequent calls increment.
  - **Concurrency:** fire N calls in parallel for the same department/year and assert N distinct, gapless-or-at-least-unique sequence values — the actual reason this needs a real DB, not a mock.
  - Year-bucketing per mode: `YEAR_SEQUENTIAL`/`CUSTOM_TEMPLATE` bucket by the incident's real alarm-time year; `SEQUENTIAL`/`MANUAL` both bucket under `year=0` and therefore **share one counter** — assert they actually do share it (confirmed intentional, decision #1).
  - `CUSTOM_TEMPLATE` end-to-end: real template stored on `Department.internalIdTemplate` → real generated ID.

### Phase 3 — Server-action tests (direct-call-in-Vitest)

Per the 9 `actions.ts` files / 13 exported functions (`createIncident`; `submitIncident`; `setNoActionReason`, `addActionTaken`, `removeActionTaken`; `updateDispatch`, `addDispatchComment`; `updateLocation`; `updateMutualAid`; `updateNarrative`; `updatePeople`, `addDisplacement`; `createExposure`), for **each**:

- Unauthenticated call → early-return message, **no DB write attempted** (assert via a spy on the relevant `prisma.*` call, not just the return value).
- Invalid `FormData` → `fieldErrors` populated, no DB write.
- Happy path → correct row created/updated with the correct shape, correct `redirect()`/`revalidatePath()` call.
- **Tenant-isolation boundary test** — call the action against an incident (or nested row, for `removeActionTaken`) belonging to a *different* department than the calling user → "not found"-style rejection, confirming the `findFirst({ where: { ..., departmentId } })` guard actually holds under a real cross-tenant attempt, not just by inspection. Sequenced early within this phase, not left to Phase 5, per the discipline's explicit priority note on authorization/boundary testing.

Plus the business rules the scan surfaced directly in the code, which deserve dedicated tests rather than incidental coverage:

- **Actions-taken / no-action mutual exclusivity**, both directions: `setNoActionReason` rejects when `actionsTaken` rows already exist; `addActionTaken` rejects when `incidentNoActionReason` is already set.
- **`submitIncident`'s gate:** rejects when `reviewStatus !== 'OPEN'`; rejects when `getSubmitCompleteness(...).complete` is false; on success, transitions `reviewStatus` **and** writes a `ReviewEvent` atomically (assert both happen, and that a failure partway doesn't leave one without the other).

**Known gotcha to hand to `test-implement`, not treat as a bug:** every mutating action calls `redirect()` from `next/navigation` on success, which throws a `NEXT_REDIRECT` signal outside a real Next.js request context. Tests need to either mock `next/navigation`'s `redirect` or catch-and-assert the thrown redirect target — a thrown error here on the happy path is expected framework behavior, not a failure.

### Phase 4 — Multi-action journeys (E2E happy path, reinterpreted)

Chained real server-action calls against the Testcontainers DB, not a browser:

- Full lifecycle: `createIncident` → fill each applicable tab's action in turn → attempt `submitIncident` while a required field is still missing (rejected, per Phase 3's gate test) → complete the remaining field → `submitIncident` succeeds → `reviewStatus` transitions → `ReviewEvent` recorded.
- Type-gating path: run the same journey for at least two distinct type combinations (e.g. FIRE-primary vs. MEDICAL-primary) and confirm the module-relevance-driven completeness gate actually differs between them, using whatever the Action Item confirms as the correct mapping.

**Real browser-driven E2E (Playwright) is deliberately not part of this pass.** Not asked as a live interview question this session — called out here as a flagged default rather than silently decided. This app's own `CONTEXT.md` roadmap explicitly says to run this planning process "once the UI sections are stable," and Sections 2–7 are mid-rebuild as of the latest commit. This phase covers the same user journeys at the server-action level in the meantime, so behavior isn't left completely uncovered until a browser-level phase becomes worth the tooling/baseline cost. Revisit as its own phase once the tab shell and forms settle.

### Phase 5 — Edge, negative, and boundary cases

Full phase, not a time-permitting tail, per the "thorough everywhere" decision:

- Zod boundary values beyond Phase 1's core cases: empty-but-required arrays, whitespace-only strings, `exposureDisplacedNumber` negative/zero/non-integer, unrecognized enum values, malformed/partial `FormData` (a key entirely absent vs. present-but-empty vs. explicit `null`) for every action.
- Concurrent-write races beyond the internalId counter (already in Phase 2): two simultaneous `updateDispatch` calls on the same incident; a double-submit race on `submitIncident`.
- Cross-department id-guessing deepened beyond Phase 3's one boundary test per action — adjacent-but-wrong incident IDs, IDs from a soft-deleted-equivalent state if one exists, nested-row IDs (e.g. `actionTakenId`) that exist but under a different incident within the *same* department.

### Phase 6 — Self-review pass (bounded, 2–3 iterations)

Closing step, per `TEST-PLAN-CONTEXT.md`'s own process — review of what Phases 0–5 already wrote, not new coverage:

- Redundancy across phases (e.g. tenant-isolation logic tested once thoroughly in Phase 3 rather than re-derived per action in Phase 5).
- Naming consistency across the suite (`describe`/`it` conventions, fixture-builder naming).
- Gaps *within* already-covered areas — re-read Phase 1–5 output the same way a route-list cross-reference caught a missed endpoint in a prior `test-plan` run, but for this app's action/schema inventory instead of a route list.

## Deferred / flagged, not default-on this pass

- **Accessibility (WCAG/508)** — UI surface is one shared component plus inline per-tab forms, still mid-rebuild. Recommend deferring to its own targeted phase once the tab shell stabilizes, rather than auditing forms that are still likely to change shape. Not asked as a live question this session — flag before implementation if you want it pulled forward.
- **Visual regression** — off by default; UI too early/thin to be worth establishing baselines against yet.
- **Cross-browser / responsive** — off by default, same reasoning as visual regression.
- **Performance / load** — off by default; pre-launch, single-tenant-scale usage so far.
- **AI/LLM pipeline output testing** — N/A. The AI-assisted entry feature described in `CONTEXT.md`'s Roadmap (rebuilt from the old Playwright repo's `fir.ai.e2e.test.ts`) isn't built yet — nothing to grade.
- **BDD/Cucumber layer** — skipped by default; solo dev, no non-technical stakeholders needing a shared-language spec layer.
- **Golden master / characterization** — not used as its own category. The one candidate (module-relevance's current behavior) is being verified against the vendor CSVs instead of frozen unverified — see Action Item.

## Pre-existing doc handling

- **TESTING.md** — doesn't exist yet. Created during Phase 0 of implementation, not this planning session.
- **CONTEXT.md** — left untouched, per explicit confirmation this session (decision #9).
- **CLAUDE.md** — not touched; it's the auto-regenerated `@AGENTS.md` pointer written by `next dev`, not a doc owned for extension.

## Stack/tooling actually chosen (from the reference matrix, resolved against this repo)

- **Unit/integration runner:** Vitest.
- **DB tests:** Testcontainers (`@testcontainers/postgresql`) + `prisma migrate deploy` against the container, not the real Neon dev database.
- **Server-action "API" layer:** direct function calls in Vitest. **supertest is not used anywhere in this plan** — there's no HTTP surface for it to attach to (see decision #3). If a real `route.ts` handler is ever added (a NERIS webhook receiver, a health check), that's the point to reconsider supertest, not before.
- **E2E:** reinterpreted as server-action-level multi-action journeys (Phase 4) for this pass; Playwright deferred (see Phase 4 note).
- **CI:** GitHub Actions — PR-gated fast job (Phase 0/1/3 tests), nightly job (Phase 2/4 tests), reusing this environment's verified Node runtime rather than reimplementing its own.
