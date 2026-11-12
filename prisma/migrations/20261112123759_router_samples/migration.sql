-- CreateTable
CREATE TABLE `router_samples` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `takenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `boardName` VARCHAR(191) NOT NULL,
    `routerOsVersion` VARCHAR(191) NOT NULL,
    `cpuLoadPercent` DOUBLE NOT NULL,
    `usedMemPercent` DOUBLE NOT NULL,
    `freeMemMb` DOUBLE NOT NULL,
    `totalMemMb` DOUBLE NOT NULL,
    `uptime` VARCHAR(191) NOT NULL,

    INDEX `router_samples_takenAt_idx`(`takenAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
