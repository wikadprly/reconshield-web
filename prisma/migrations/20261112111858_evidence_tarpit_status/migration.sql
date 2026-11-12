-- AlterTable
ALTER TABLE `tarpit_entries` ADD COLUMN `durationMinutes` INTEGER NOT NULL DEFAULT 60,
    ADD COLUMN `expiresAt` DATETIME(3) NULL,
    ADD COLUMN `verifiedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `evidence` (
    `id` VARCHAR(191) NOT NULL,
    `detectionId` VARCHAR(191) NOT NULL,
    `flowDirection` VARCHAR(191) NOT NULL DEFAULT 'external_to_protected',
    `features` JSON NOT NULL,
    `featureCount` INTEGER NOT NULL,
    `confidence` DOUBLE NOT NULL,
    `modelName` VARCHAR(191) NOT NULL,
    `modelVersion` VARCHAR(191) NOT NULL,
    `policyVersion` VARCHAR(191) NOT NULL,
    `policySnapshot` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `evidence_detectionId_key`(`detectionId`),
    INDEX `evidence_modelVersion_idx`(`modelVersion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `tarpit_entries_expiresAt_idx` ON `tarpit_entries`(`expiresAt`);

-- AddForeignKey
ALTER TABLE `evidence` ADD CONSTRAINT `evidence_detectionId_fkey` FOREIGN KEY (`detectionId`) REFERENCES `detections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
