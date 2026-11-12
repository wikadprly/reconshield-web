-- AlterTable
ALTER TABLE `mitigation_settings` ADD COLUMN `addressList` VARCHAR(191) NOT NULL DEFAULT 'reconshield-tarpit-active',
    ADD COLUMN `confidenceThreshold` INTEGER NOT NULL DEFAULT 85,
    ADD COLUMN `durationMinutes` INTEGER NOT NULL DEFAULT 60,
    ADD COLUMN `maxActiveEntries` INTEGER NOT NULL DEFAULT 50,
    ADD COLUMN `maxDurationMinutes` INTEGER NOT NULL DEFAULT 360;
