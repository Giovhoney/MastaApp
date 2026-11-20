-- Read-only verification of the human-style browser test.
USE mastaapp_local;
SELECT p.batchId,i.description,p.status,p.locationCode,p.remainingPct,d.receivingWeightKg,d.currentWeightKg
FROM InkPail p JOIN InkMaster i ON i.id=p.inkId
LEFT JOIN PilotPailDetails d ON d.batchId=p.batchId
WHERE p.batchId='TEST-UI-MWPCQLFW';
SELECT m.type,m.fromLocation,m.toLocation,m.remainingPct,m.orderNumber,m.note,u.displayName AS verifiedEmployee,m.createdAt
FROM InventoryMovement m JOIN AppUser u ON u.id=m.employeeId
WHERE m.batchId='TEST-UI-MWPCQLFW' ORDER BY m.createdAt;
SELECT c.batchId,c.orderNumber,c.pctAtCheckout,c.pctAtReturn,c.checkedOutAt,c.returnedAt,u.displayName
FROM InkCheckout c JOIN AppUser u ON u.id=c.employeeId
WHERE c.batchId='TEST-UI-MWPCQLFW';
