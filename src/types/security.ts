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

export interface TarpitEntry {
  ip: string;
  detectedAt: string;
  duration: string;
  addressList: string;
  status: "Active";
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  administrator: string;
  previousMode: MitigationMode;
  newMode: MitigationMode;
}

export interface ServiceStatus {
  name: string;
  detail: string;
  status: "Online" | "Offline";
}

/**
 * Where a value came from. "mock" values must always be labeled in the UI and
 * never presented as live telemetry.
 */
export type DataSource = "database" | "remote" | "mock";

export interface ApiResult<T> {
  data: T;
  source: DataSource;
  generatedAt: string;
}

export interface SecurityOverview {
  detections: Detection[];
  tarpit: TarpitEntry[];
  services: ServiceStatus[];
  /** Counts derived from the loaded sample only, not a global total. */
  sampleCounts: {
    detections: number;
    reconnaissance: number;
    tarpitActive: number;
  };
}

/**
 * Live `/system/resource` telemetry from the MikroTik router via the binary
 * API. Used for the router health card and the honest MikroTik service status.
 */
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
  /** HH:MM label for the chart x axis. */
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
