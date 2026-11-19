-- Removes ONLY generated TEST-SAMPLE pails and their linked records.
-- Does not delete real inventory, ink masters, rack positions, or settings.
START TRANSACTION;
DELETE FROM `InventoryMovement` WHERE `batchId` LIKE 'TEST-SAMPLE-%';
DELETE FROM `InkCheckout` WHERE `batchId` LIKE 'TEST-SAMPLE-%';
DELETE FROM `PilotPailDetails` WHERE `batchId` LIKE 'TEST-SAMPLE-%';
DELETE FROM `InkPail` WHERE `batchId` LIKE 'TEST-SAMPLE-%';
DELETE FROM `AppUser` WHERE `id` LIKE 'TEST-PILOT-EMP-%' AND NOT EXISTS (SELECT 1 FROM `InventoryMovement` WHERE `employeeId` = `AppUser`.`id`) AND NOT EXISTS (SELECT 1 FROM `InkCheckout` WHERE `employeeId` = `AppUser`.`id`);
COMMIT;
