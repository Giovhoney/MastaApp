-- MastaApp test performed 2026-11-20; read-only verification.
-- Both batch IDs are fictional TEST- records created through the MastaApp API.
USE mastaapp_local;

-- 1. Current pail status, ink and rack position
SELECT p.batchId, i.description AS inkName, p.status, p.locationCode,
       p.remainingPct, d.receivingWeightKg, d.currentWeightKg
FROM InkPail AS p
JOIN InkMaster AS i ON i.id = p.inkId
LEFT JOIN PilotPailDetails AS d ON d.batchId = p.batchId
WHERE p.batchId IN ('TEST-WB-MWPCJL10-A', 'TEST-WB-MWPCJL10-B')
ORDER BY p.batchId;

-- 2. Full movement audit trail, including verified employee name
SELECT m.batchId, m.type, m.fromLocation, m.toLocation,
       m.remainingPct, m.orderNumber, u.displayName AS employee,
       m.note, m.createdAt
FROM InventoryMovement AS m
JOIN AppUser AS u ON u.id = m.employeeId
WHERE m.batchId IN ('TEST-WB-MWPCJL10-A', 'TEST-WB-MWPCJL10-B')
ORDER BY m.createdAt, m.id;

-- 3. Checkout / return history
SELECT c.batchId, c.orderNumber, c.pctAtCheckout, c.pctAtReturn,
       c.checkedOutAt, c.returnedAt, u.displayName AS employee
FROM InkCheckout AS c
JOIN AppUser AS u ON u.id = c.employeeId
WHERE c.batchId IN ('TEST-WB-MWPCJL10-A', 'TEST-WB-MWPCJL10-B');

-- 4. Expected: 2 received, 1 checked out, 1 returned, 1 relocated, 1 retired
SELECT type, COUNT(*) AS recordedMovements
FROM InventoryMovement
WHERE batchId IN ('TEST-WB-MWPCJL10-A', 'TEST-WB-MWPCJL10-B')
GROUP BY type ORDER BY type;
