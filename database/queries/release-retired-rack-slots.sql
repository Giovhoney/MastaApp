-- Run after changing InkPail.locationCode to nullable with Prisma db push.
-- Only fictional TEST- records. Historical rack locations remain in InventoryMovement.fromLocation.
UPDATE InkPail SET locationCode = NULL WHERE status = 'RETIRED' AND batchId LIKE 'TEST-%';
