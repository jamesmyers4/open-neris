# OpenNERIS

Open source fire incident reporting for departments who can't justify a monthly RMS subscription. Submits directly to NERIS, the system that replaced NFIRS in February 2026.

This is an independent, community project. It is not built, endorsed, or supported by the U.S. Fire Administration, DHS, or the Fire Safety Research Institute.

## Status

Early. Schema and validation are in place; the app itself is not built yet. See `CONTEXT.md` for architecture decisions and open questions.

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

## Contributing

Not yet formalized. Open an issue if you want to help.

## License

MIT, see `LICENSE`.
