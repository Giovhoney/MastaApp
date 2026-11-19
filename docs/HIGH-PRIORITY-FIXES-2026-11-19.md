# High-priority local pilot fixes — 2026-11-19

## 1. Atomic bulk receiving
`POST /api/pilot` now accepts `RECEIVE_BULK` with 1–180 pails. All lines are validated and committed inside one Prisma serializable transaction. Invalid ink, rack, duplicate pail ID, or duplicate rack assignment aborts the entire receipt. The original dashboard sends one bulk request, rather than one request per pail.

## 2. Purge releases rack location
`InkPail.locationCode` is nullable. On purge the pail becomes `RETIRED`, its rack reference becomes `NULL`, and `InventoryMovement.fromLocation` retains its historical location. The original four retired fictional test pails were updated locally to release their racks. Existing MySQL installations must apply the nullable-column schema change before using the updated application; see `prisma/schema.prisma`, `database/mastaapp_mysql_schema.sql` and `database/queries/release-retired-rack-slots.sql`.

## 3. Authentication for local pilot
A server-side password gate now protects inventory reads and writes. Log in using the configured `PILOT_USER_ID` and `PILOT_PASSWORD`. The server derives `employeeId` and `employeeName` from the signed, HTTP-only, SameSite=Strict session cookie. CSRF origin validation protects writes, sessions expire after eight hours, and repeated incorrect login attempts are throttled in memory. Signing out clears the cookie. No secret is checked into Git.

**Local credentials:** On the authorized Mac, read `~/Desktop/MastaApp_Pilot_Login.txt` (file permission 600). Configuration is in `.env.local` (ignored by Git). Restart Next.js when changing credentials.

**Scope and limitations:** This is **one password-protected pilot account**, not individual employee login or a full role-based production authentication system. Multiple employees sharing the same account cannot be independently authenticated or reliably attributed. For live operations, create unique per-employee accounts, securely hashed passwords or SSO, centralized rate limiting, password recovery, roles, auditing, HTTPS, and a deployment review. Production dashboard remains intentionally blocked.

**Regression:** `npm run test:e2e`, `npm run test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`. The E2E suite covers rollback of failed bulk receipts, successful receipt, checkout, return, relocation, purge, rack reuse, session authorization, CSRF rejection, logout and dashboard navigation. Workflow test creates and removes its own fictional test pails.
