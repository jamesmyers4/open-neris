# OpenNERIS

Open source fire incident reporting for departments who can't justify a monthly RMS subscription. Submits directly to NERIS, the system that replaced NFIRS in February 2026.

This is an independent, community project. It is not built, endorsed, or supported by the U.S. Fire Administration, DHS, or the Fire Safety Research Institute.

## Stack

Next.js 16 (App Router, Turbopack) + TypeScript, Prisma 7.9.1 + PostgreSQL (Neon), Clerk auth, Vercel hosting. PWA-enabled for the incident-entry flow specifically (installable, offline-capable via IndexedDB write queue) — review/approval/reporting assume connectivity. ulfsri/neris-nodejs-client (MIT licensed, official) as the NERIS submission layer, not yet wired up.

## Status

The core incident workflow is built and working end to end: create an incident, work through it tab by tab (Dispatch, Location, People & Displacement, Mutual Aid, Narrative, Actions Taken), add the repeatable sections that apply to it (Exposures, Fire, Medical, HazSit, Rescues, Responding Units), pass the final validation gate, and submit. Type-gating already hides sections that don't apply to a given incident type, and date/time fields carry over between tabs via quick-select rather than needing re-entry.

This build pass is done, as is access control and Review & Approve (see "What's next" below). Next up is the NERIS API feed itself — see `FUTURE.md`.

Not done yet:
- `/validate` dry-run hardening (an extra authoritative pre-check against NERIS's own validation, gated on real sandbox credentials — `FUTURE-PLAN.md` Session 16) and a confirmed production NERIS API base URL. Actual submission itself (Approve → real NERIS `POST`, tracked per-attempt, retried on failure) is done — see "What's next" below.
- Named-individual personnel/roster tracking. Rank, certs, fit-test, physicals, apparatus assignment — a separate, later epic. Access control (signup, invites, roles, deactivation) is done; this is not the same thing (see `CONTEXT.md`'s Field-verification discipline #5 for why they were split apart).
- Attachments, reporting/dashboard views.

See `CONTEXT.md` for the architecture decisions and reasoning behind all of this, and `FUTURE.md` for what's planned next.

## What's next

**Access control is done**: self-serve signup, Admin-invite by email, role changes, and deactivation, scoped per-department with district-level oversight for a parent organization's Admin. See `CONTEXT.md`'s Roadmap for the Epic 3 build detail.

**Review & Approve is done**: the Officer/Chief review queue, kickback-with-notes, and email + in-app status-change notifications (Resend) are all built and wired into the existing status chain — see `CONTEXT.md`'s Roadmap for the Epic 4 build detail.

**NERIS submission itself is done, core**: a hand-written API client, a full incident→NERIS payload mapper, and automatic submission on Approve — tracked per-attempt, retried by a nightly sweep or a manual resend button on failure. See `CONTEXT.md`'s Workflow section for the build detail. `/validate` dry-run hardening (Session 16) is the one remaining, real-sandbox-credential-gated piece.

**Named-individual personnel/roster tracking** (rank, certs, fit-test, physicals, apparatus assignment, auto-populating crew context on an incident) is a separate, later epic — not gated on anything above, deliberately not scoped into the current build pass. Once it exists, other department services are planned on top of it: certifications, fit-test tracking, annual physicals, SCBA/breathing-apparatus compliance — the kind of federal/departmental recordkeeping that runs alongside NERIS rather than through it.

Test coverage is solid for what's built — 300+ unit/integration tests, a Testcontainers-backed DB suite, and a Playwright browser E2E suite (local only for now, not yet wired into CI). See `TESTING.md`.

## Stack

Next.js (App Router) + TypeScript, Prisma + PostgreSQL, Clerk, Vercel. NERIS integration via `ulfsri/neris-nodejs-client`.

## Getting started

```bash
git clone --recurse-submodules https://github.com/jamesmyers4/open-neris.git
cd open-neris-app
npm install
cp .env.example .env
npm run generate:neris
npx prisma migrate dev
npm run dev
```

`--recurse-submodules` matters — the NERIS field definitions live in `vendor/neris-framework` as a submodule, not a static copy, since NERIS is still in beta and its schema is expected to change.

## Testing

```bash
npm run test       # fast suite, no external dependencies
npm run test:db    # Testcontainers-backed, needs Docker running
npm run test:e2e   # Playwright, browser-driven, needs a real Clerk test user
```

Details and gotchas in `TESTING.md`.

## Contributing

Not yet formalized. Open an issue if you want to help.

## License

MIT, see `LICENSE`.
