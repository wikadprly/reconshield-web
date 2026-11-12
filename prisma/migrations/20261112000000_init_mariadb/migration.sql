-- CreateTable
CREATE TABLE `detections` (
    `id` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL,
    `sourceIp` VARCHAR(191) NOT NULL,
    `sourcePort` INTEGER NOT NULL,
    `destinationIp` VARCHAR(191) NOT NULL,
    `destinationPort` INTEGER NOT NULL,
    `classification` VARCHAR(191) NOT NULL,
    `confidence` DOUBLE NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `detections_timestamp_idx`(`timestamp`),
    INDEX `detections_sourceIp_idx`(`sourceIp`),
    INDEX `detections_status_idx`(`status`),
    INDEX `detections_classification_idx`(`classification`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tarpit_entries` (
    `id` VARCHAR(191) NOT NULL,
    `ip` VARCHAR(191) NOT NULL,
    `detectedAt` DATETIME(3) NOT NULL,
    `duration` VARCHAR(191) NOT NULL,
    `addressList` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `releasedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `detectionId` VARCHAR(191) NULL,

    UNIQUE INDEX `tarpit_entries_ip_key`(`ip`),
    INDEX `tarpit_entries_status_idx`(`status`),
    INDEX `tarpit_entries_detectionId_idx`(`detectionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_statuses` (
    `name` VARCHAR(191) NOT NULL,
    `detail` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `checkedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_entries` (
    `id` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL,
    `administrator` VARCHAR(191) NOT NULL,
    `previousMode` VARCHAR(191) NOT NULL,
    `newMode` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `administratorId` VARCHAR(191) NULL,

    INDEX `audit_entries_timestamp_idx`(`timestamp`),
    INDEX `audit_entries_administratorId_idx`(`administratorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'admin',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `approvals` (
    `id` VARCHAR(191) NOT NULL,
    `detectionId` VARCHAR(191) NOT NULL,
    `proposedAction` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `decidedAt` DATETIME(3) NULL,
    `decidedById` VARCHAR(191) NULL,
    `reason` VARCHAR(191) NULL,

    INDEX `approvals_status_idx`(`status`),
    INDEX `approvals_detectionId_idx`(`detectionId`),
    INDEX `approvals_decidedById_idx`(`decidedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mitigation_settings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `mode` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedBy` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `model_evaluations` (
    `id` VARCHAR(191) NOT NULL,
    `modelName` VARCHAR(191) NOT NULL,
    `version` VARCHAR(191) NOT NULL,
    `accuracy` DOUBLE NOT NULL,
    `precision` DOUBLE NOT NULL,
    `recall` DOUBLE NOT NULL,
    `f1Score` DOUBLE NOT NULL,
    `trueNormal` INTEGER NOT NULL,
    `falseThreat` INTEGER NOT NULL,
    `missedThreat` INTEGER NOT NULL,
    `trueThreat` INTEGER NOT NULL,
    `dataset` VARCHAR(191) NULL,
    `periodStart` DATETIME(3) NULL,
    `periodEnd` DATETIME(3) NULL,
    `samples` INTEGER NULL,
    `evaluatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `feature_importances` (
    `id` VARCHAR(191) NOT NULL,
    `feature` VARCHAR(191) NOT NULL,
    `importance` DOUBLE NOT NULL,
    `evaluationId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `feature_importances_evaluationId_feature_key`(`evaluationId`, `feature`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tarpit_entries` ADD CONSTRAINT `tarpit_entries_detectionId_fkey` FOREIGN KEY (`detectionId`) REFERENCES `detections`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_entries` ADD CONSTRAINT `audit_entries_administratorId_fkey` FOREIGN KEY (`administratorId`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `approvals` ADD CONSTRAINT `approvals_detectionId_fkey` FOREIGN KEY (`detectionId`) REFERENCES `detections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `approvals` ADD CONSTRAINT `approvals_decidedById_fkey` FOREIGN KEY (`decidedById`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feature_importances` ADD CONSTRAINT `feature_importances_evaluationId_fkey` FOREIGN KEY (`evaluationId`) REFERENCES `model_evaluations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
