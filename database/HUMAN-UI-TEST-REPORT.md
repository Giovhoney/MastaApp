# MastaApp browser-first acceptance test — 20 November 2026

## Method
Automated Chromium used the same browser-visible forms, buttons, dropdowns and employee PIN dialog as a human user. No inventory writes were made directly through API calls, Prisma, or SQL. After completing browser operations, Prisma and a separate read-only MySQL query checked persisted records. All test data uses `TEST-` prefixes. This is a targeted acceptance test, not proof that every UI function is production-ready.

## Exact browser interaction sequence
1. Open Dashboard; verify `Connected: local MySQL`.
2. Click `Create employee account`; fill first name `Uimwpcqlfw` and a six-digit test PIN; click `Create account`.
3. Click `Receive Ink`; type `019547 Green (Oyster)`, batch `TEST-UI-MWPCQLFW`, choose `Override weight`, enter `20` kg, click `Confirm & receive 1 pails`, enter employee credentials in the verification dialog and click `Verify & confirm`.
4. Click `Ink Lookup`, search for the batch ID and confirm it appears.
5. Click `Checkout & Return`; enter order `TEST-UI-ORDER`, choose `TCY`, search for the batch ID, click `Check out`, complete PIN verification; confirm `In use at TCY`.
6. Enter return weight `12` kg, click `Return`, complete PIN verification.
7. Click `Pail History`, search/select the batch, select rack `A-LL-01-1`, click `Record location change`, complete PIN verification.
8. Enter purge reason `UI audit fictional test`, click `Purge at 60%`, complete PIN verification.
9. Click `Movement History`, search for the batch, confirm five rows.
10. Click `Purged Ink Register`, search for the batch, confirm it appears.
11. Click `Order Ink Usage`, search `TEST-UI-ORDER`; click `Ink Machine History`, search the batch.
12. Visit Dashboard, Rack Inventory, Placement Sheet, Location Audit, Ink Master List, Ink Request Review, Reorder Alerts and Administration; verify headings display.

## Independent database results
- `InkPail`: `TEST-UI-MWPCQLFW`, `RETIRED`, `remainingPct=60`, `locationCode=NULL`.
- `PilotPailDetails`: receiving `20` kg, current `12` kg.
- `InventoryMovement`: five records in order: `RECEIVE`, `CHECKOUT`, `RETURN`, `RELOCATE`, `RETIRE`. All five attributed to employee `Uimwpcqlfw`.
- `InkCheckout`: one completed checkout with returned percentage `60` and non-null return timestamp.
- Rack path: `B-LL-08-1` → `A-LL-01-1` → released on purge.
- Verification SQL: `database/queries/human-ui-audit-verification.sql`.

## Other button/form checks
- Ink Master List → `Add ink`: correctly refuses to save; displays `Ink master editing is not yet connected to MySQL. No change saved.`
- Receive Ink → `Submit for approval`: correctly refuses to save; displays `Ink requests are not yet connected to MySQL. No change saved.`
- Reorder Alerts → `Save threshold`: correctly refuses to save; displays `Reorder settings are not yet connected to MySQL. No change saved.`
- Ink Lookup search works.
- Rack Inventory `Export ... CSV` and Movement History `Export history CSV` buttons were clicked; downloaded file contents were not independently inspected.
- Administration `Reset all demo data` is disabled with shared MySQL.

## Outstanding functionality and limitations
- Ink master creation, new ink approval/rejection, and reorder thresholds are not persisted to MySQL; they are intentionally blocked in the connected pilot.
- Navigating to a section proves its heading renders, not that every filter, print button, export or sub-workflow works.
- Order usage and machine history search fields were exercised, but correctness of their displayed results was not independently asserted.
- Print output, mobile/tablet interaction, concurrency, accessibility, error handling and every edge case were not exhaustively tested in this pass.
- The fictional test employee and pail remain in the database for inspection; they were not deleted.
- No Git commit or push was performed.
