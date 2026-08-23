@AGENTS.md

# Working conventions for this repo — durable, applies to every future session

These came out of the UI_KICKOFF.md build pass (Sections 1-7, complete as of commit `a217300`) and apply going forward to Personnel, Review & Approve, the NERIS feed work, and anything else — not just that pass.

## Session/commit discipline — non-negotiable

**One category of changes per Claude Code session.** Do not chain multiple unrelated categories of work into one continuous session. When a category is done — code compiles, the human has manually verified it per the Stop-after-each-section rule below — stop, report clearly what's done, and let the human commit before continuing. This keeps sessions restartable when they run long, and keeps commits reviewable in isolated chunks. A future session's own plan/task doc may list several categories; that list is the natural session boundaries, not a mandate to work through it end-to-end unattended.

## Stop-after-each-section rule

Do not proceed to the next tab, section, or implementation category until the human has manually verified the current one in a browser — actually clicking through the form, not just a passing type-check or an isolated database smoke test. Two real bugs shipped past `tsc --noEmit` and `eslint` clean, and past a direct Prisma write/read/delete test, because neither exercises the actual rendered form or the real Zod validation path a user hits. Report clearly which of these you actually did versus which you're inferring from code review — "I ran X and saw Y" is different from "this should work," and both matter, but they're not the same claim.

## Style

No code comments. Minimal blank lines inside functions; a blank line after a function or major block ends. Match the formatting already established in `scripts/generate-neris-value-sets.ts` and `lib/validation/incident-core.schema.ts`.

## UX conventions — established, don't relitigate

See CONTEXT.md's "UX conventions" section for the substantive rules (24-hour clock, simplified time entry, mutual aid N/A option, narrative length, never-clear-the-form). These are settled product decisions from real manual-testing feedback, not defaults to reconsider per-feature.
