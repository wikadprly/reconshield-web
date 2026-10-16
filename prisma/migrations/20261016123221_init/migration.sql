-- CreateTable
CREATE TABLE "detections" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "sourceIp" TEXT NOT NULL,
    "sourcePort" INTEGER NOT NULL,
    "destinationIp" TEXT NOT NULL,
    "destinationPort" INTEGER NOT NULL,
    "classification" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "detections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarpit_entries" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "duration" TEXT NOT NULL,
    "addressList" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "detectionId" TEXT,

    CONSTRAINT "tarpit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_statuses" (
    "name" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_statuses_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "audit_entries" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "administrator" TEXT NOT NULL,
    "previousMode" TEXT NOT NULL,
    "newMode" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "administratorId" TEXT,

    CONSTRAINT "audit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" TEXT NOT NULL,
    "detectionId" TEXT NOT NULL,
    "proposedAction" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "reason" TEXT,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mitigation_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "mode" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "mitigation_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_evaluations" (
    "id" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "precision" DOUBLE PRECISION NOT NULL,
    "recall" DOUBLE PRECISION NOT NULL,
    "f1Score" DOUBLE PRECISION NOT NULL,
    "trueNormal" INTEGER NOT NULL,
    "falseThreat" INTEGER NOT NULL,
    "missedThreat" INTEGER NOT NULL,
    "trueThreat" INTEGER NOT NULL,
    "dataset" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "samples" INTEGER,
    "evaluatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_importances" (
    "id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "importance" DOUBLE PRECISION NOT NULL,
    "evaluationId" TEXT NOT NULL,

    CONSTRAINT "feature_importances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "detections_timestamp_idx" ON "detections"("timestamp");

-- CreateIndex
CREATE INDEX "detections_sourceIp_idx" ON "detections"("sourceIp");

-- CreateIndex
CREATE INDEX "detections_status_idx" ON "detections"("status");

-- CreateIndex
CREATE INDEX "detections_classification_idx" ON "detections"("classification");

-- CreateIndex
CREATE UNIQUE INDEX "tarpit_entries_ip_key" ON "tarpit_entries"("ip");

-- CreateIndex
CREATE INDEX "tarpit_entries_status_idx" ON "tarpit_entries"("status");

-- CreateIndex
CREATE INDEX "tarpit_entries_detectionId_idx" ON "tarpit_entries"("detectionId");

-- CreateIndex
CREATE INDEX "audit_entries_timestamp_idx" ON "audit_entries"("timestamp");

-- CreateIndex
CREATE INDEX "audit_entries_administratorId_idx" ON "audit_entries"("administratorId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "approvals_status_idx" ON "approvals"("status");

-- CreateIndex
CREATE INDEX "approvals_detectionId_idx" ON "approvals"("detectionId");

-- CreateIndex
CREATE INDEX "approvals_decidedById_idx" ON "approvals"("decidedById");

-- CreateIndex
CREATE UNIQUE INDEX "feature_importances_evaluationId_feature_key" ON "feature_importances"("evaluationId", "feature");

-- AddForeignKey
ALTER TABLE "tarpit_entries" ADD CONSTRAINT "tarpit_entries_detectionId_fkey" FOREIGN KEY ("detectionId") REFERENCES "detections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_administratorId_fkey" FOREIGN KEY ("administratorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_detectionId_fkey" FOREIGN KEY ("detectionId") REFERENCES "detections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_importances" ADD CONSTRAINT "feature_importances_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "model_evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
