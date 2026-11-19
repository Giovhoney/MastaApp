# MastaApp — Shipmaster Ink Inventory (development prototype)

A local Next.js prototype for flexographic ink inventory. **Not production-ready. Do not enter real company inventory or personal employee information.**

## Start

```bash
npm install
npm run dev
```

Open http://localhost:3000 on this Mac. Run `npm run lint`, `npm run test`, `npx tsc --noEmit`, and `npm run build` to check the code.

## What works today

- 110 supplied Ink Master descriptions (reference catalogue, not stock quantities)
- Two racks (A/B), three levels (LL/ML/UL), 10 partitions per level, 3 pails per partition = **180 positions**
- Fictional `TEST-BATCH-...` pails for UI testing
- Demo receiving, checkout, return, movement history, ink lookup, location suggestions, and reset
- Required production order number at checkout; order number is carried into the return record, searchable in movement history and exported to CSV. Earlier demo records may have no order number.
- Rack inventory register with search/status filters, CSV exports for inventory and movements
- Demo transactions are stored **only in this browser's localStorage**, not in PostgreSQL and not shared with other users
- Checkout reserves the home position; returns require a non-increasing remaining percentage

## PostgreSQL backend preparation (not connected yet)

`prisma/schema.prisma` describes the planned relational database. `prisma/seed.ts` will seed **only** Ink Master descriptions, rack positions and low-ink threshold; it will never seed fictional pails into the real database.

Docker Desktop is not currently installed on this Mac. Once installed:

```bash
cp .env.example .env
# Confirm that the local-only credentials in .env are appropriate
# Start Docker Desktop, then:
docker compose up -d
npm run db:generate
npm run db:migrate
npm run db:seed
```

**Do not run migrations against any real company database.** The above setup is for a local development database only. Server-side inventory transaction functions are drafted in `src/server/inventory.ts` with serializable transactions and audit movements, but they are intentionally **not exposed as API endpoints** until secure user authentication, authorization, and database integration are complete. The UI still uses browser-only demo data.

## Business decisions required before production

1. Confirm whether the supplier Batch ID identifies **one physical pail**. If multiple pails share a production batch number, the schema must distinguish production lot from a unique pail identifier.
2. Confirm the low-ink threshold (currently 25% in the demo).
3. Confirm the future authentication method, permissions, and approved company hosting/security arrangements.
4. Confirm the method for measuring remaining ink percentage and whether increases can occur through refilling or correction.

## Data safety

Demo pails are distinct from Ink Master data. The Administration page resets the browser demo without changing the Ink Master List. Clearing browser storage also removes local demo transactions. No real records are currently saved to a shared database.

## Security and dependency status

`npm audit` currently reports 4 high-severity advisories in the Prisma 6 CLI/tooling dependency chain. They must be resolved before any production deployment. Do not use `npm audit fix --force` blindly because Prisma major upgrades require schema and runtime changes.

## Cloud-hosted rollout status (November 2026)

Cloud hosting has been selected, but no hosting account, database or production domain has been provisioned. See [docs/CLOUD-LAUNCH.md](docs/CLOUD-LAUNCH.md) for the production readiness gates. A production-mode access guard intentionally returns HTTP 503 instead of exposing the unauthenticated browser-only demo. Automated checks are configured in `.github/workflows/checks.yml` for when the repository is connected to GitHub.

## Local MySQL pilot on the configured Mac

Start after a reboot with `./scripts/start-local-pilot.sh` from the project folder, then open `http://localhost:3000/pilot`. MySQL 8.4.7 is installed without administrator access in `~/.local/mysql`, and its data lives at `~/.local/mysql-data`, bound only to `127.0.0.1:3307`. The private `.env.local` contains the local application credentials and is gitignored. This setup is specific to the configured Mac and does not automatically configure another machine or Hostinger. The original demo is at `/`; the MySQL-backed shared pilot is at `/pilot`. Never use pilot records as real stock.
