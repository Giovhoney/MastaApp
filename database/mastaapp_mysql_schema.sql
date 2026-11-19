-- CreateTable
CREATE TABLE `InkMaster` (
    `id` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `colourFamily` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `InkMaster_description_key`(`description`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RackPosition` (
    `code` VARCHAR(191) NOT NULL,
    `rack` VARCHAR(191) NOT NULL,
    `level` VARCHAR(191) NOT NULL,
    `partition` INTEGER NOT NULL,
    `position` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RackPosition_rack_level_idx`(`rack`, `level`),
    UNIQUE INDEX `RackPosition_rack_level_partition_position_key`(`rack`, `level`, `partition`, `position`),
    PRIMARY KEY (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InkPail` (
    `batchId` VARCHAR(191) NOT NULL,
    `inkId` VARCHAR(191) NOT NULL,
    `locationCode` VARCHAR(191) NULL,
    `remainingPct` INTEGER NOT NULL,
    `status` ENUM('STORED', 'CHECKED_OUT', 'EMPTY', 'RETIRED') NOT NULL DEFAULT 'STORED',
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `InkPail_locationCode_key`(`locationCode`),
    INDEX `InkPail_inkId_status_idx`(`inkId`, `status`),
    PRIMARY KEY (`batchId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AppUser` (
    `id` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'INK_MANAGER', 'OPERATOR', 'CSR', 'QUALITY', 'MANAGEMENT') NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InkCheckout` (
    `id` VARCHAR(191) NOT NULL,
    `batchId` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `checkedOutAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `returnedAt` DATETIME(3) NULL,
    `orderNumber` VARCHAR(191) NOT NULL,
    `pctAtCheckout` INTEGER NOT NULL,
    `pctAtReturn` INTEGER NULL,

    INDEX `InkCheckout_batchId_returnedAt_idx`(`batchId`, `returnedAt`),
    INDEX `InkCheckout_orderNumber_idx`(`orderNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryMovement` (
    `id` VARCHAR(191) NOT NULL,
    `batchId` VARCHAR(191) NOT NULL,
    `type` ENUM('RECEIVE', 'CHECKOUT', 'RETURN', 'ADJUST', 'RELOCATE', 'RETIRE') NOT NULL,
    `orderNumber` VARCHAR(191) NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `fromLocation` VARCHAR(191) NULL,
    `toLocation` VARCHAR(191) NULL,
    `remainingPct` INTEGER NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InventoryMovement_batchId_createdAt_idx`(`batchId`, `createdAt`),
    INDEX `InventoryMovement_orderNumber_idx`(`orderNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SystemSetting` (
    `key` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PilotPailDetails` (
    `batchId` VARCHAR(191) NOT NULL,
    `receivingWeightKg` DOUBLE NOT NULL,
    `currentWeightKg` DOUBLE NOT NULL,
    `machine` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`batchId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `InkPail` ADD CONSTRAINT `InkPail_inkId_fkey` FOREIGN KEY (`inkId`) REFERENCES `InkMaster`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InkPail` ADD CONSTRAINT `InkPail_locationCode_fkey` FOREIGN KEY (`locationCode`) REFERENCES `RackPosition`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InkCheckout` ADD CONSTRAINT `InkCheckout_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `InkPail`(`batchId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InkCheckout` ADD CONSTRAINT `InkCheckout_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `AppUser`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryMovement` ADD CONSTRAINT `InventoryMovement_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `InkPail`(`batchId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryMovement` ADD CONSTRAINT `InventoryMovement_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `AppUser`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

