# OpenNERIS

Open source fire incident reporting for departments that can't justify a monthly RMS subscription. Submits directly to NERIS, the system that replaced NFIRS in February 2026.

This is an independent community project. It is not built, endorsed, or supported by the U.S. Fire Administration, DHS, or the Fire Safety Research Institute.

## Stack

Next.js 16 (App Router, Turbopack) and TypeScript. Prisma 7.9.1 against PostgreSQL on Neon. Clerk for auth, Resend for notification email, Vercel for hosting and the nightly cron sweep.

NERIS submission goes through a small hand-written `fetch` client at `lib/neris/api-client.ts`. The official `ulfsri/neris-nodejs-client` is not published as an installable package; it expects you to generate a client from the OpenAPI spec and vendor the result, which was more machinery than three endpoints justified.

NERIS field definitions come from `vendor/neris-framework`, a git submodule rather than a static copy, because NERIS is still in beta and its schema is expected to change. `npm run generate:neris` regenerates the TypeScript value sets from its CSVs.

## What works

Create an incident and fill it in tab by tab: Dispatch, Location, People & Displacement, Mutual Aid, Narrative, Actions Taken. Add whichever repeatable sections apply to the call (Exposures, Fire, Medical, HazSit, Rescues, Responding Units). Sections that don't apply to the incident type stay hidden. Date and time fields carry between tabs by quick-select so nothing has to be typed twice.

A validation gate blocks the Open to Submitted transition until every NERIS-required field is populated for that incident's relevant modules. Required-but-empty fields get a red asterisk and an inline hint on the tab itself while the user works, instead of a wall of errors at the end.

Departments have a self-referential hierarchy, so a district sees its own data plus every child department's. Stations and Units are local reference tables, since NERIS's own station and unit endpoints are write-only and can't be read back. An Admin manages all of it, plus NERIS credentials, at `/admin/settings`. The vendor client secret is AES-256-GCM encrypted at rest and write-only in the UI.

Access control lives at `/admin/users`: self-serve signup where the first user in a new department becomes its Admin, Admin invite by email and role, role changes, and deactivation. Roles are Member, Officer, Chief, and Admin. None of this is modeled by NERIS, whose entity module has no user concept at all.

Review and approve runs through a queue at `/incidents/review`. An Officer or Chief can send a record back to Open with a required note, which the submitter sees on the incident page. Email and in-app notifications fire on every status change that needs someone's attention, and are skipped entirely for a department with one active user, since there is nobody to notify. A single person can carry a record from creation to Sent without extra clicks.

Approving an incident submits it to NERIS. A 201 stores the returned NERIS incident ID and moves the record to Sent. Anything else moves it to Error with a readable failure reason and a Resend button for a Chief or Admin. A nightly Vercel cron job sweeps for anything stuck at Approved.

## What's missing

`Department.nerisFdId` has no admin UI. NERIS requires it on every submission and nothing in the app sets it today, so real submission cannot succeed for a real department until this exists. It is the highest-priority gap.

No submission has ever run against real NERIS. The client, the payload mapper, and the trigger wiring are covered by tests against a stubbed `fetch` and a direct reading of the live OpenAPI spec, but nobody has held sandbox credentials yet. `npm run neris:smoke-test -- --department <id>` exists for whoever gets them first.

The production NERIS base URL is unconfirmed. The published spec declares only the sandbox server, so `lib/neris/api-client.ts` falls back to a best guess that `NERIS_PRODUCTION_BASE_URL` can override.

The `/validate` dry-run call against NERIS's own validation endpoint is not built. It is gated on the same sandbox credentials (`FUTURE-PLAN.md` Session 16).

Three dispatch call timestamps (`call_arrival`, `call_answered`, `call_create`) are optional in this app and required by the NERIS API, so an incident missing them lands in Error. Whether to tighten the local gate or accept the failure is an open product decision (`FUTURE-PLAN.md` Session 14).

Offline entry is planned and not started. There is no manifest, no service worker, and no write queue yet.

Named-individual personnel tracking (rank, certifications, fit tests, physicals, apparatus assignment) is a separate later epic. NERIS's incident schema has no named-individual field anywhere, which is why it was split apart from access control. Certification, fit-test, physical, and SCBA compliance tracking are planned on top of it once it exists.

Attachments, reporting, and dashboards are untouched.

See `CONTEXT.md` for the architecture decisions behind all of this, `FUTURE.md` for the epic-level plan, and `FUTURE-PLAN.md` for the session-by-session build log and its open findings.

## Getting started

```bash
git clone --recurse-submodules https://github.com/jamesmyers4/open-neris.git
cd open-neris
npm install
cp .env.example .env
npm run generate:neris
npx prisma migrate dev
npm run dev
```

`--recurse-submodules` matters. Without it `vendor/neris-framework` is empty and `npm run generate:neris` has nothing to read.

`.env.example` documents every variable. The ones without a sensible default are `DATABASE_URL`, the two Clerk keys, and `ENCRYPTION_KEY` (base64, 32 bytes, generate with `openssl rand -base64 32`). Resend, cron, and Playwright variables are only needed for the features that use them.

## Testing

```bash
npm run test       # 524 tests across 61 files, no external dependencies
npm run test:db    # 18 Testcontainers-backed files, needs Docker running
npm run test:e2e   # Playwright, needs a real Clerk test user
```

The fast suite runs on every PR. The DB suite runs nightly. The E2E suite is local-only for now, since it is the first one that needs real Clerk secrets in CI. Details and gotchas in `TESTING.md`.

## Contributing

Not yet formalized. Open an issue if you want to help.

## License

MIT, see `LICENSE`.
