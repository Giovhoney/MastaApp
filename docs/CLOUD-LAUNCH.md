# MastaApp cloud launch plan — NOT APPROVED FOR LIVE INVENTORY

## Current safety state
The current UI reads/writes only browser localStorage, with unverified employee names and fictional `TEST-` pails. It is **not a shared inventory database**. Production-mode requests are intentionally blocked with HTTP 503; `/api/health` only reports liveness and `productionReady:false`. Do not bypass the block to expose the demo to staff.

## Proposed architecture
- Managed Node.js Next.js application over HTTPS, with separate staging and production environments.
- Hostinger-managed MySQL/MariaDB (TLS where supported, least-privilege credentials, independent verified backups).
- Server-side session authentication for employee IDs plus a secure credential, or approved company SSO. Password/PIN hashes only, never plaintext.
- Database-enforced uniqueness for physical pail IDs; supplier batch/lot tracked separately if shared by multiple pails.
- Server-side permissions for receiving, ink master approvals, checkout/return, relocation, purge, stock adjustment and user administration. Never trust role or employee ID sent by the browser.
- Immutable, attributable transaction log; explicit stock reconciliation and adjustment approvals.
- CSV/XLSX opening-stock import: validate, deduplicate, dry-run, preview rack assignments, sign off physical placement, then atomically commit. Retain import source and exception report.
- Rate limiting, secure cookies, CSRF protections, encrypted transport, audit logs, monitoring, alerts, tested restore process.

## Cloud deployment gates
1. Shipmaster IT approves provider, data region, retention policy, account ownership, network access, domain and backup policy.
2. Confirm physical pail ID vs supplier lot ID, rack capacity/overflow locations, gross-weight method and disposal procedure.
3. Provision managed database, secrets and staging environment; never commit credentials or employee records.
4. Implement and test authenticated server APIs and transactional persistence; remove browser localStorage as source of truth.
5. Implement role enforcement and first-admin bootstrap through a secure one-time process.
6. Test multi-user concurrency, duplicate scans, checkout/return, history, purging, physical count and spreadsheet import on staging.
7. Run security/dependency review, backup restoration drill and user acceptance test.
8. Only after sign-off, replace the fail-closed production guard with authenticated access, migrate opening inventory and go live.

## Deployment checks
`npm ci && npm run lint && npx tsc --noEmit && npm run test && npm run build`

Health endpoint: `GET /api/health` (liveness only; not database readiness).

## Temporary database inventory for testing

After a real MySQL/MariaDB `DATABASE_URL` has been securely configured and the Prisma schema migrated, run `PILOT_DATA_CONFIRM=YES_TEST_DATA_ONLY npm run db:pilot:seed` in a secure environment. This inserts six fictional `TEST-PILOT-` pails, receipt movements, and a clearly labeled test employee. It refuses to overwrite occupied positions or seed twice.

Before importing actual inventory, run `PILOT_DATA_CONFIRM=YES_TEST_DATA_ONLY npm run db:pilot:clear`. It deletes **only** `TEST-PILOT-` pails and their linked transactions. It never clears real stock, ink master names, or users. The script is not an inventory import or a substitute for a transactional server API.

**Database connection is not yet configured.** Never paste the PostgreSQL connection URL into a chat or commit it to GitHub; configure it as a Hostinger secret/environment variable. The current browser demo remains isolated from the database until a shared server API and employee identification are implemented.

## Hostinger Business Web Hosting database choice
The Prisma provider is now `mysql` for Hostinger MySQL/MariaDB. Provision a database in hPanel and configure `DATABASE_URL` as a secret in the Node.js app environment. **Do not enter credentials in GitHub or chat.** Schema creation requires an actual connection and the appropriate migration command; this repository does not imply the cloud database exists. Hostinger must allow the deployed Node.js runtime to connect to the chosen database host. Test connectivity before migration.

## Shared MySQL pilot (implemented; deployment gated)

The dedicated `/pilot` interface reads and writes `/api/pilot` using MySQL, and refreshes every five seconds. It supports TEST-prefixed pail receiving, checkout, return by weight, relocation, purge, and transaction history. Operations run in serializable Prisma transactions. It uses Employee ID + Name for attribution **only**; it does not provide authentication, and must not be used for real stock. The main demo `/` remains blocked in production.

**To activate after the actual MySQL database exists:** configure the secret `DATABASE_URL`, apply the schema to the empty pilot database (`npx prisma db push` using an authorized database connection), then run `PILOT_DATA_CONFIRM=YES_TEST_DATA_ONLY npm run db:pilot:seed`. Only after checking DB connectivity and pilot data, set `ENABLE_PILOT=true` in the Hostinger Node.js environment and redeploy. The URL will be `/pilot`, not `/`. Never expose the full connection URL in chat, source code, or logs.

Before real stock, disable the pilot, back up and clear the TEST-prefixed records, add proper access controls and production-grade stock identification, and implement the remaining production workflows. The pilot intentionally does not expose a public reset endpoint.
