# HANDOFF.md

For a fresh Claude session. Read this first, then pull the live current versions of the files below from GitHub before doing anything else — don't trust this document's own summaries as ground truth for anything that's actual code or committed docs, only for narrative context about how today's decisions got made.

Repo: `github.com/jamesmyers4/open-neris` (main branch).

Fetch and read, in this order: `CONTEXT.md`, `UI_KICKOFF.md`, `prisma/schema.prisma`, `lib/validation/incident-core.schema.ts`, `app/incidents/new/incident-form.tsx`, `app/incidents/actions.ts`, `lib/auth/current-user.ts`. If any of those paths have moved or don't exist, that itself is information — something changed since this handoff was written, treat the live repo as correct over this document.

## What this session is for

Run a `/grill-with-docs` session with Jimmy to finalize the plan for reworking the incident-entry UI around a two-phase lifecycle (minimal create, then fill-in-later by section), and to produce a final updated `CONTEXT.md` and `UI_KICKOFF.md` that Claude Code will then implement against. This session's job is to reach genuine shared clarity on the open questions below and produce those two updated files — not to write application code itself.

## How today got here, briefly

Database (Neon/Prisma 7) and auth (Clerk) were built and independently verified working — real migration, real signed-in user, real linked database row, not just configured. Claude Code then built Section 1 (Incident Core) and Section 2 (Exposures) of the incident-entry form as single monolithic forms, following the pattern `UI_KICKOFF.md` specified at the time.

Manual testing of Section 1 surfaced two real bugs: an inverted time-chronology validation check, and a React behavior where uncontrolled form inputs get wiped on any server action completion (success or returned error) — both are already fixed and confirmed working in the browser.

While debugging the chronology check, Jimmy pulled up his own old FIR system's Playwright test automation (a different, earlier project — a full LLM-driven agentic form-filler he'd built years ago for a previous employer's incident-reporting module) to check what the real field ordering should be. That surfaced something bigger than the bug: the old system's actual create flow only ever asked for two fields — alarm time and primary incident type — with everything else (department, station, date) auto-populated, and the rest of the incident filled in afterward, section by section, from a persistent record, with a final validation pass before completion. That's a real, user-tested pattern from years of prior use, not a preference — and it's a different shape than the single-form approach currently built. `CONTEXT.md`'s "Incident lifecycle" section has the full reasoning; both updated docs already reflect this decision at a summary level, but the concrete implementation details still need resolving.

Separately, Jimmy raised context that affects this planning session's scope even though none of it gets built now: a Personnel/User Management system (auto-populated employee data — name, rank, station, shift, apparatus assignment), a Review & Approve workflow with a return-for-additional-info path, a resend queue for failed NERIS submissions, and conditional email notifications (only relevant once more than one person is involved in a department's workflow). `CONTEXT.md`'s "Roadmap" section captures the stated goals for each. None of this should be built in this pass, but the tab/lifecycle design decided here shouldn't foreclose any of it either.

## Open questions for this grill session

Resolve these with Jimmy, one at a time, recommended-answer-first per how these sessions normally run:

1. **Exact shape of the minimal create screen.** Confirm: primary incident type + alarm time only, auto-generated `internalId` (what format?), `incidentDate` derived from `alarmTime`. Also resolve how this screen should anticipate Personnel Management's eventual arrival — should it be built now with a placeholder/static "created by" display, or left genuinely minimal until that system exists?

2. **Exact Incident Core tab boundaries and verified labels.** Proposed split: Dispatch, Location, People & Displacement, Mutual Aid, Narrative — confirm or adjust, and get real labels checked against `vendor/neris-framework`'s CSV definitions before finalizing, not assumed. The `dispatch_time_call_arrival` mislabeling (assumed "arrived on scene," actually means "call reached the dispatch center") is the cautionary example — check every label this touches, not just the ones that already broke.

3. **Do Sections 2 through 7 (Exposures onward) get the same two-phase treatment, or is it Incident-Core-specific?** Incident Core is large and applies to every incident; the other sections are smaller and only conditionally relevant (an incident without exposures doesn't need that section at all). This is a genuine open design question, not a decided one — don't assume either direction going in.

4. **Implementation approach for the final-validation-before-submit gate.** One reusable function, checking real Zod schemas per relevant module, blocking the Open-to-Submitted transition. Resolve where this lives in the codebase and how "relevant modules" gets determined for a given incident (e.g., does an incident with no hazmat component need HazSit's required fields checked at all?).

5. **What Section 2 (Exposures) needs, given it already exists but was built against the old single-form pattern.** Rebuild from scratch against whatever gets decided in question 3, or is there anything worth keeping?

6. **Sequencing confirmation.** Jimmy's stated plan: finish Sections 1-7 of incident entry, then run his personal test-automation-planner Claude Skill against the repo to get a recommended test suite, review and implement that, fix whatever it surfaces, and only then move into Personnel Management / Review & Approve / Email. Confirm this session's output doesn't get ahead of that sequencing — no Personnel/Review/Email implementation work belongs in the docs this session produces, only enough forward-compatibility to not block them later.

## What this session should produce

Updated `CONTEXT.md` and `UI_KICKOFF.md`, following the existing `/grill-with-docs` convention already established in this project — genuine shared clarity reached on each open question above, with a recommended answer offered for each before Jimmy confirms or redirects it, and the final files written back in full so Jimmy can commit them directly. Once those are committed, Claude Code picks up `UI_KICKOFF.md` and implements against it.
