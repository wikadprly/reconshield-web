-- AlterTable
ALTER TABLE `audit_entries` ADD COLUMN `action` VARCHAR(191) NOT NULL DEFAULT 'policy_change',
    ADD COLUMN `target` VARCHAR(191) NULL;
