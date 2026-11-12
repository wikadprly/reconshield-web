export type MitigationMode = "Automatic" | "Manual";
export type SystemCondition = "Stable" | "Elevated" | "Critical";

export interface Detection {
  id: string;
  timestamp: string;
  sourceIp: string;
  sourcePort: number;
  destinationIp: string;
  destinationPort: number;
  classification: "Reconnaissance" | "Normal";
  confidence: number;
  action: "TARPIT" | "Pending" | "Blocked";
  status: "Active" | "Review" | "Released" | "Resolved";
}

export type TarpitStatus = "Pending" | "Active" | "Released" | "Expired" | "Verified";

export interface TarpitEntry {
  id?: string;
  ip: string;
  detectedAt: string;
  duration: string;
  durationMinutes?: number;
  expiresAt?: string;
  addressList: string;
  status: TarpitStatus;
  releasedAt?: string;
  verifiedAt?: string;
  detectionId?: string;
}

/** Snapshot that justifies one classification. Evidence, not model internals. */
export interface ClassificationEvidence {
  detectionId: string;
  flowDirection: string;
  features: Record<string, number>;
  featureCount: number;
  confidence: number;
  modelName: string;
  modelVersion: string;
  policyVersion: string;
  policySnapshot: MitigationPolicy;
  createdAt: string;
}

export type ApprovalStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface ApprovalRequest {
  id: string;
  detectionId: string;
  proposedAction: string;
  status: ApprovalStatus;
  requestedAt: string;
  decidedAt?: string;
  decidedById?: string;
  reason?: string;
  detection?: {
    sourceIp: string;
    confidence: number;
    classification: string;
  };
}

export type AuditAction =
  | "policy_change"
  | "approval_approved"
  | "approval_rejected"
  | "tarpit_release"
  | "tarpit_verify"
  | "tarpit_apply";

export interface AuditEntry {
  id: string;
  timestamp: string;
  administrator: string;
  /** Policy mode before/after; only meaningful when `action` is policy_change. */
  previousMode: string;
  newMode: string;
  action: AuditAction;
  target?: string;
  reason?: string;
}

/**
 * Bounded mitigation policy. Ranges are enforced server-side; this is a
 * safety envelope for a 32 MB / 1-core router, never an optimisation target.
 */
export interface MitigationPolicy {
  mode: MitigationMode;
  confidenceThreshold: number;
  durationMinutes: number;
  maxDurationMinutes: number;
  maxActiveEntries: number;
  addressList: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface ServiceStatus {
  name: string;
  detail: string;
  status: "Online" | "Offline";
}

/**
 * Where a value came from. "mock" values must always be labeled in the UI and
 * never presented as live telemetry. "mixed" means one screen aggregates more
 * than one source and no single label would be honest.
 */
export type DataSource = "database" | "remote" | "mock" | "mixed";

export interface ApiResult<T> {
  data: T;
  source: DataSource;
  generatedAt: string;
}

export interface SecurityOverview {
  detections: Detection[];
  tarpit: TarpitEntry[];
  services: ServiceStatus[];
  /**
   * Global aggregates straight from the database. `scoped` is false when the
   * numbers had to be derived from the loaded sample (mock/fallback mode), so
   * the UI can label them honestly.
   */
  totals: {
    detections: number;
    reconnaissance: number;
    tarpitActive: number;
    scoped: boolean;
  };
}

/** Live MikroTik `/system/resource` snapshot. */
export interface RouterResource {
  boardName: string;
  routerOsVersion: string;
  cpuLoadPercent: number;
  freeMemoryMegabytes: number;
  totalMemoryMegabytes: number;
  memoryUsedPercent: number;
  uptime: string;
}

/** One historical health sample for the router resource chart. */
export interface RouterHistoryPoint {
  time: string;
  cpuLoadPercent: number;
  memoryUsedPercent: number;
}

/** Relative predictive contribution of a single feature. */
export interface FeatureImportance {
  feature: string;
  importance: number;
}

/**
 * Random Forest evaluation metrics. Field set intentionally mirrors what the
 * Python service produces and the ML Performance screen already displays. Do
 * not add metrics here until the model actually reports them.
 */
export interface ModelMetrics {
  modelName: string;
  version: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: {
    trueNormal: number;
    falseThreat: number;
    missedThreat: number;
    trueThreat: number;
  };
  featureImportance: FeatureImportance[];
  dataset?: string;
  evaluatedAt?: string;
}
