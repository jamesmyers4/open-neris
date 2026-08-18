# TEST-MAINTAIN-CONTEXT.md — Test Suite Maintenance Companion (working title)

## Status

v0.2. Resolved the v0.1 open question about gate-flip detection — `test-maintain` detects and surfaces, `test-plan`'s resume mode executes. Still zero validation runs; this remains design, not confirmed behavior.

## Revision log

- **v0.2 (this revision).** Resolved the "whether gate-flip detection belongs here" open question from v0.1, rather than leaving it open indefinitely. Added a fifth candidate trigger: a named blocking condition (a specific `CONTEXT.md` Roadmap item, a feature's existence) appears to have changed. `test-maintain`'s job here is narrow and cheap — notice and surface, in the same advisory, non-blocking way as its other triggers — not to re-verify the condition thoroughly or execute the resume itself. That stays a deliberate, person-invoked `test-plan` resume session, per `TEST-PLAN-CONTEXT.md`'s own "resuming deferred or blocked work" mode. Reasoning: a resume is planning-grade judgment (three-tier resolution, sequencing, real tooling decisions) applied to a known backlog — squeezing that into `test-maintain`'s "obvious test alongside a diff" model would blur a boundary that was drawn on purpose, even though leaving gate flips undetected indefinitely was a real, live risk worth solving some other way.
- **v0.1.** Initial draft, written during `open-neris-app`'s deferred-items planning follow-up rather than a dedicated design session for this doc — candidate triggers grounded in that project's own `TESTING.md`/`TEST-PLAN.md` artifacts rather than invented from scratch, but nothing run against real code changes yet.

## What this is

A model-invoked companion to `test-plan`/`test-implement` (see `TEST-PLAN-CONTEXT.md`) that keeps a repo's test suite honest as the surrounding application code changes, without requiring the developer to remember to run anything. `test-plan`/`test-implement` are user-invoked, deliberate sessions that produce new coverage in phases; `test-maintain` is meant to fire quietly, inline with ordinary feature work, whenever a change to application code plausibly needs a corresponding test change.

## What this isn't

Not `test-implement` running unattended in the background — it doesn't plan new coverage categories or add phases on its own; it responds to a specific code change already happening in the current turn, the same way a careful human reviewer would notice "this new function has no test" while looking at a diff for an unrelated reason. Not a CI gate or a coverage-percentage enforcer — it's advisory, shaping what Claude does in the moment, never blocking a commit or failing a build on its own. **Not the thing that resumes deferred or blocked work either, even though it's the thing most likely to notice a gate has flipped** — see the fifth trigger condition below and the reasoning in the v0.2 revision-log entry.

## The core problem: trigger reliability

Model-invoked skills undertrigger by default per skill-creator guidance — a description alone, competing against the ordinary momentum of "just make the change and move on," is likely to lose most of the time unless the trigger conditions are concrete and tied to real code shapes rather than abstract principles like "keep tests in sync." This needs real trigger evals — a set of `{code diff, expected trigger: yes/no}` pairs — once a first draft description exists, not just a description that sounds plausible in isolation.

## Candidate trigger conditions (untested)

- **A new exported server action / route handler / public function is added to a file whose sibling functions already have `*.test.ts` coverage in the same area.** The asymmetry — some actions tested, this one not — is a sharper, more concrete signal than "any new function anywhere," and is checkable mechanically (does a test file reference this export's name) rather than requiring judgment about what's "important enough" to test.
- **An existing characterization test's flagged, current-but-possibly-wrong behavior is the exact code path being changed.** A deliberately-designed real example: a test asserting today's behavior specifically so that touching the underlying function trips it, where the correct response is "update the assertion to the new, correct behavior," not "make the test pass again by reverting the change."
- **A schema change (new required field, new constraint, new enum value) lands with no corresponding DB-layer test change in the same diff.** Schema/DB-test drift is exactly the kind of gap a solo developer moving fast is likely to introduce without something watching for it specifically — the DB-reachability finding from `TEST-PLAN-CONTEXT.md`, applied to ongoing maintenance instead of an initial planning pass.
- **A bug gets fixed in application code with no new regression test in the same change.** Likely the single highest-value trigger for the actual target audience (developers who don't already test) — it converts "a bug happened and got fixed" into "the same bug can't silently come back," without requiring the developer to think of that step themselves, which is the entire premise of this project.
- **A named blocking condition appears to have changed — new in v0.2.** A `TEST-PLAN.md` blocked phase names an exact, re-checkable condition (a specific `CONTEXT.md` Roadmap section, a feature's existence). If code changes in the current turn suggest that condition may have flipped (the gated UI section just landed, the gated feature just got built), surface a nudge — "this looks like it might unblock Phase N — worth running `test-plan`'s resume mode?" — rather than silently doing nothing and leaving a resolved gate sitting forgotten indefinitely, or overreaching into actually executing the resume. Detection only; thorough re-verification and any actual planning judgment stays with the person-invoked resume session.

## Relationship to TESTING.md and CONTEXT.md

- Reads `TESTING.md`'s conventions before writing any test code.
- Any new gotcha or convention it introduces should get recorded back into `TESTING.md` in the same shape a phase-produced entry would take — a future reader shouldn't be able to tell, from structure alone, whether a given paragraph came from a planned phase or a maintenance-triggered fix.
- Does not touch `TEST-PLAN.md` directly, even for the gate-flip trigger. That document's phases — including a reactivated, deferred-items phase block — are opened deliberately by a person running `test-plan`'s resume mode, not silently appended to by a background trigger. `test-maintain`'s gate-flip role is limited to surfacing the suggestion in chat.

## Open questions

- **Trigger reliability, as above — entirely unvalidated.** No run of any kind yet, for any of the five candidate triggers.
- **Interruption cost versus silent action, for the first four triggers.** Should `test-maintain` ever ask a clarifying question mid-feature-work, or should it default to "add the obvious test silently, flag anything genuinely ambiguous lightly for later review" and never interrupt? The cost of interrupting is much higher here than inside a dedicated `test-plan`/`test-implement` session — the developer's actual attention is on the feature, not the test suite, and a wrong guess about which cost matters more could make this feel like nagging rather than help for exactly the audience (non-testers) it's meant to serve. The fifth trigger (gate-flip) is deliberately exempted from this question — it always surfaces, never silently acts, since a resume decision was already established as something that needs a person regardless.
- **No validation runs yet at all.** This is the equivalent of `TEST-PLAN-CONTEXT.md`'s v0. state, before the Shenny run gave it its first real data.
