-- MastaApp Local MySQL: run with SQLTools > MastaApp Local MySQL.
-- Use the app to receive, checkout, return, move or purge pails so movement history stays correct.
SELECT COUNT(*) AS total_pails FROM InkPail;
SELECT COUNT(*) AS rack_positions FROM RackPosition;
SELECT p.batchId, i.description AS ink_name, p.locationCode, p.remainingPct, p.status
FROM InkPail AS p
JOIN InkMaster AS i ON i.id = p.inkId
ORDER BY p.locationCode
LIMIT 100;
SELECT m.batchId, m.type, m.orderNumber, m.remainingPct, m.createdAt
FROM InventoryMovement AS m
ORDER BY m.createdAt DESC
LIMIT 50;
