-- MastaApp Local MySQL. Run a selected statement in SQLTools.
-- Use MastaApp for inventory transactions so it records movement history.

-- Confirm the active database and list its tables.
SELECT DATABASE() AS active_database;
SHOW TABLES;

-- Inventory totals
SELECT COUNT(*) AS total_pails,
       COUNT(CASE WHEN batchId LIKE 'TEST-%' THEN 1 END) AS test_pails
FROM InkPail;
SELECT COUNT(*) AS rack_positions FROM RackPosition;

-- All ink pails
SELECT p.batchId, i.description AS ink_name, p.locationCode, p.remainingPct, p.status
FROM InkPail AS p
JOIN InkMaster AS i ON i.id = p.inkId
ORDER BY p.locationCode, p.batchId;

-- Rack availability. Checked-out pails keep their rack positions reserved.
SELECT r.code, r.rack, r.level, r.partition, r.position,
       CASE
         WHEN p.batchId IS NULL THEN 'Available'
         WHEN p.status = 'CHECKED_OUT' THEN 'Reserved (checked out)'
         WHEN p.status = 'RETIRED' THEN 'Blocked (retired pail reference)'
         ELSE 'Occupied'
       END AS availability,
       p.batchId, p.status AS pail_status
FROM RackPosition AS r
LEFT JOIN InkPail AS p ON p.locationCode = r.code
ORDER BY r.rack, r.level, r.partition, r.position;

-- Checkout and return history. A NULL returnedAt marks an open checkout.
SELECT c.batchId, i.description AS ink_name, u.displayName AS checked_out_by,
       c.orderNumber, c.checkedOutAt, c.returnedAt, c.pctAtCheckout, c.pctAtReturn
FROM InkCheckout AS c
JOIN InkPail AS p ON p.batchId = c.batchId
JOIN InkMaster AS i ON i.id = p.inkId
JOIN AppUser AS u ON u.id = c.employeeId
ORDER BY c.checkedOutAt DESC, c.id;

-- Search by ink name or Batch ID. Replace 'TEST-' with your search term.
SELECT p.batchId, i.description AS ink_name, p.locationCode, p.remainingPct, p.status
FROM InkPail AS p
JOIN InkMaster AS i ON i.id = p.inkId
CROSS JOIN (SELECT 'TEST-' AS search_term) AS search
WHERE i.description LIKE CONCAT('%', search.search_term, '%')
   OR p.batchId LIKE CONCAT('%', search.search_term, '%')
ORDER BY i.description, p.batchId;

-- Movement history. Replace TEST-SAMPLE-0001 with the Batch ID you want to inspect.
SELECT m.createdAt, m.batchId, m.type, u.displayName AS employee,
       m.fromLocation, m.toLocation, m.remainingPct, m.orderNumber, m.note
FROM InventoryMovement AS m
JOIN AppUser AS u ON u.id = m.employeeId
WHERE m.batchId = 'TEST-SAMPLE-0001'
ORDER BY m.createdAt DESC, m.id;
