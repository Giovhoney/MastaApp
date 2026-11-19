# MastaApp local QA report — 2026-11-19

Scope: Original Next.js dashboard, local MySQL on 127.0.0.1:3307, pilot API, Chromium UI, code quality and dependency security. All inventory test records are fictional `TEST-` records.

## Passed
- Existing Vitest unit suite: 35/35 passed.
- Playwright Chromium browser/API suite: 5/5 passed; covers all 16 navigation sections, mobile navigation, MySQL-backed inventory read, refresh persistence, duplicate location / orphan movement consistency, and invalid API requests without mutation.
- ESLint and TypeScript checks passed.
- Next.js webpack production build completed successfully (compilation check; production route remains intentionally guarded).
- HTTP 200 for `/`, `/api/inventory`, `/api/pilot` locally.
- Local MySQL sample inventory: 120 pails, 356 movements; 4 retired, 10 checked out, 106 others; no duplicate rack assignments or orphan movement records.
- API rejected non-TEST IDs, nonexistent pails, invalid actions and missing employee IDs.

## Important gaps and risks
1. **Not production-ready**: No real authentication; employee name and ID can be impersonated. Production homepage intentionally responds 503.
2. **Incomplete MySQL features**: Ink master editing, reorder settings and ink-request review are not connected to the DB; intentionally disabled for shared mode.
3. **Bulk receiving is not atomic**: Each pail is sent as a separate transaction. Partial receipt can persist if a later line fails.
4. **Rack reservation lifecycle**: RETIRED pails still have a unique `locationCode` in MySQL, whereas the frontend considers purged pails not occupying rack space. A new receipt into that apparent empty slot fails. Requires a DB/schema and workflow decision to preserve historical location and release slot.
5. **Remaining percentage accuracy**: Pilot RETURN uses current gross weight divided by receiving gross weight. This includes container tare and does not measure actual usable ink percentage; need tare/empty pail handling and business-approved formula.
6. **Historical movement accuracy**: The dashboard's mapped return history and machine/order usage should be checked against multiple real cycles; `GET /api/inventory` maps all movements but does not guarantee exact semantic equivalence to the original browser demo.
7. **Security audit**: `npm audit --omit=dev --audit-level=high` reports four high-severity transitive advisories related to Prisma tooling (`deepmerge-ts`, `effect`). Avoid automatic breaking Prisma major upgrade without migration/testing.
8. **End-to-end mutation tests**: Read-only browser tests and rejection-path API tests passed; complete API receive → checkout → return → move → purge → cleanup was not run in this QA pass. A prior isolated checkout/return succeeded; comprehensive transaction tests should use a disposable test database.
9. **Environment-specific dev issue**: Browser tests using `127.0.0.1` failed to hydrate due to Next dev-origin HMR protection. `localhost` works. Use `http://localhost:3000` for the app and test runner.
10. **Data identity**: Unique pail ID currently doubles as supplier Batch ID; multiple pails may share supplier lots. Must separate physical pail ID and supplier batch before real inventory.

## Running tests
- `npm run test`
- `npm run test:e2e` (start local app and MySQL first)
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build` (do not run simultaneously with `next dev` on the same `.next` directory)

Test artifacts are ignored by Git. This report is not a certification for live stock.
