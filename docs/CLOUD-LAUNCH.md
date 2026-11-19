# MastaApp cloud launch plan — NOT APPROVED FOR LIVE INVENTORY

## Current safety state
The current UI reads/writes only browser localStorage, with unverified employee names and fictional `TEST-` pails. It is **not a shared inventory database**. Production-mode requests are intentionally blocked with HTTP 503; `/api/health` only reports liveness and `productionReady:false`. Do not bypass the block to expose the demo to staff.

## Proposed architecture
- Managed Node.js Next.js application over HTTPS, with separate staging and production environments.
- Managed PostgreSQL (private network, TLS, backups, point-in-time recovery where available).
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

After a real PostgreSQL `DATABASE_URL` has been securely configured and the Prisma schema migrated, run `PILOT_DATA_CONFIRM=YES_TEST_DATA_ONLY npm run db:pilot:seed` in a secure environment. This inserts six fictional `TEST-PILOT-` pails, receipt movements, and a clearly labeled test employee. It refuses to overwrite occupied positions or seed twice.

Before importing actual inventory, run `PILOT_DATA_CONFIRM=YES_TEST_DATA_ONLY npm run db:pilot:clear`. It deletes **only** `TEST-PILOT-` pails and their linked transactions. It never clears real stock, ink master names, or users. The script is not an inventory import or a substitute for a transactional server API.

**Database connection is not yet configured.** Never paste the PostgreSQL connection URL into a chat or commit it to GitHub; configure it as a Hostinger secret/environment variable. The current browser demo remains isolated from the database until a shared server API and employee identification are implemented.
