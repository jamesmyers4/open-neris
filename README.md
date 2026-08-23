# OpenNERIS

Open source fire incident reporting for departments who can't justify a monthly RMS subscription. Submits directly to NERIS, the system that replaced NFIRS in February 2026.

This is an independent, community project. It is not built, endorsed, or supported by the U.S. Fire Administration, DHS, or the Fire Safety Research Institute.

## Status

The core incident workflow is built and working end to end: create an incident, work through it tab by tab (Dispatch, Location, People & Displacement, Mutual Aid, Narrative, Actions Taken), add the repeatable sections that apply to it (Exposures, Fire, Medical, HazSit, Rescues, Responding Units), pass the final validation gate, and submit. Type-gating already hides sections that don't apply to a given incident type, and date/time fields carry over between tabs via quick-select rather than needing re-entry.

This build pass is done. Next up is Personnel tracking, then the NERIS API feed itself — see `FUTURE.md`.

Not done yet:
- Actual submission to NERIS. The workflow ends at `Submitted` today; the API call to NERIS itself isn't wired up.
- Personnel tracking. Employee/roster data, shift and apparatus assignment, and department-level access control all depend on this. It's next after the current UI is settled.
- Review & Approve. The status chain and audit log exist in the schema; the reviewer/chief UI (kickback notes, email and in-app alerts) doesn't.
- Admin department settings screen.
- Attachments, reporting/dashboard views.

See `CONTEXT.md` for the architecture decisions and reasoning behind all of this, and `FUTURE.md` for what's planned next.

## What's next

**Personnel tracking** is the next real feature, once the current UI stops moving. It's the gating dependency for a few other things:

- Access control inside the app — who can see and do what.
- Multi-department support — a firehouse only sees its own data, with room for a parent organization (district/region) to see across the departments under it.
- Auto-populating crew, shift, and apparatus context on an incident instead of typing it by hand.

Once personnel exists as a concept, other department services planned on top of it: certifications, fit-test tracking, annual physicals, SCBA/breathing-apparatus compliance — the kind of federal/departmental recordkeeping that runs alongside NERIS rather than through it.

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
