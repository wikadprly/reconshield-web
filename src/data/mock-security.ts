import type { AuditEntry, Detection, ModelMetrics, ServiceStatus, TarpitEntry } from "@/types/security";

export const trafficByRange = {
  "1h": [
    { time: "21:00", normal: 410, reconnaissance: 18 },
    { time: "21:10", normal: 560, reconnaissance: 24 },
    { time: "21:20", normal: 490, reconnaissance: 43 },
    { time: "21:30", normal: 720, reconnaissance: 31 },
    { time: "21:40", normal: 650, reconnaissance: 66 },
    { time: "21:50", normal: 840, reconnaissance: 48 },
  ],
  "24h": [
    { time: "00:00", normal: 1260, reconnaissance: 38 },
    { time: "04:00", normal: 1590, reconnaissance: 51 },
    { time: "08:00", normal: 2010, reconnaissance: 73 },
    { time: "12:00", normal: 1830, reconnaissance: 91 },
    { time: "16:00", normal: 2380, reconnaissance: 67 },
    { time: "20:00", normal: 2650, reconnaissance: 146 },
    { time: "Now", normal: 2520, reconnaissance: 90 },
  ],
  "7d": [
    { time: "Wed", normal: 10240, reconnaissance: 421 },
    { time: "Thu", normal: 11480, reconnaissance: 388 },
    { time: "Fri", normal: 9870, reconnaissance: 517 },
    { time: "Sat", normal: 8290, reconnaissance: 274 },
    { time: "Sun", normal: 7940, reconnaissance: 309 },
    { time: "Mon", normal: 12180, reconnaissance: 612 },
    { time: "Tue", normal: 11927, reconnaissance: 556 },
  ],
} as const;

export const detections: Detection[] = [
  { id: "INC-1056", timestamp: "10 Mar 2026, 21:48", sourceIp: "192.168.1.50", sourcePort: 42132, destinationIp: "192.168.1.10", destinationPort: 22, classification: "Reconnaissance", confidence: 98.5, action: "TARPIT", status: "Active" },
  { id: "INC-1055", timestamp: "10 Mar 2026, 21:42", sourceIp: "10.10.24.118", sourcePort: 55218, destinationIp: "192.168.1.1", destinationPort: 8291, classification: "Reconnaissance", confidence: 96.2, action: "TARPIT", status: "Active" },
  { id: "INC-1054", timestamp: "10 Mar 2026, 21:35", sourceIp: "172.16.4.92", sourcePort: 49302, destinationIp: "192.168.1.12", destinationPort: 80, classification: "Reconnaissance", confidence: 93.8, action: "TARPIT", status: "Released" },
  { id: "INC-1053", timestamp: "10 Mar 2026, 21:29", sourceIp: "192.168.10.77", sourcePort: 33451, destinationIp: "192.168.1.10", destinationPort: 443, classification: "Reconnaissance", confidence: 91.4, action: "Pending", status: "Review" },
  { id: "INC-1052", timestamp: "10 Mar 2026, 21:17", sourceIp: "10.10.24.201", sourcePort: 61003, destinationIp: "192.168.1.14", destinationPort: 3389, classification: "Reconnaissance", confidence: 99.1, action: "TARPIT", status: "Active" },
  { id: "INC-1051", timestamp: "10 Mar 2026, 20:58", sourceIp: "172.16.8.44", sourcePort: 52017, destinationIp: "192.168.1.1", destinationPort: 53, classification: "Reconnaissance", confidence: 89.7, action: "Blocked", status: "Resolved" },
  { id: "INC-1050", timestamp: "10 Mar 2026, 20:41", sourceIp: "203.0.113.42", sourcePort: 49101, destinationIp: "192.168.1.18", destinationPort: 445, classification: "Reconnaissance", confidence: 94.6, action: "TARPIT", status: "Active" },
  { id: "INC-1049", timestamp: "10 Mar 2026, 20:24", sourceIp: "198.51.100.71", sourcePort: 60112, destinationIp: "192.168.1.16", destinationPort: 8080, classification: "Reconnaissance", confidence: 87.9, action: "Pending", status: "Review" },
];

export const tarpitEntries: TarpitEntry[] = [
  { ip: "192.168.1.50", detectedAt: "10 Mar 2026, 21:48", duration: "00:42:18", addressList: "reconshield-tarpit-active", status: "Active" },
  { ip: "10.10.24.118", detectedAt: "10 Mar 2026, 21:42", duration: "00:48:05", addressList: "reconshield-tarpit-active", status: "Active" },
  { ip: "10.10.24.201", detectedAt: "10 Mar 2026, 21:17", duration: "01:13:42", addressList: "reconshield-tarpit-active", status: "Active" },
  { ip: "203.0.113.42", detectedAt: "10 Mar 2026, 20:36", duration: "01:54:10", addressList: "reconshield-tarpit-active", status: "Active" },
  { ip: "198.51.100.71", detectedAt: "10 Mar 2026, 19:55", duration: "02:35:28", addressList: "reconshield-tarpit-active", status: "Active" },
];

export const services: ServiceStatus[] = [
  { name: "MikroTik RouterOS API", detail: "Configured endpoint · credentials server-side", status: "Online" },
  { name: "Random Forest Service", detail: "Classifier service · v1.4.2", status: "Online" },
];

export const auditEntries: AuditEntry[] = [
  { id: "AUD-003", timestamp: "10 Mar 2026, 20:15", administrator: "admin", previousMode: "Manual", newMode: "Automatic" },
  { id: "AUD-002", timestamp: "08 Mar 2026, 09:42", administrator: "admin", previousMode: "Automatic", newMode: "Manual" },
  { id: "AUD-001", timestamp: "01 Mar 2026, 14:10", administrator: "researcher", previousMode: "Manual", newMode: "Automatic" },
];

export const featureImportance = [
  { feature: "Flow Duration", importance: 0.89 },
  { feature: "Total Packets", importance: 0.74 },
  { feature: "SYN Flag Count", importance: 0.68 },
  { feature: "Total Bytes", importance: 0.57 },
  { feature: "ACK Flag Count", importance: 0.42 },
];

export const modelMetrics: ModelMetrics = {
  modelName: "Random Forest Classifier",
  version: "v1.4.2",
  accuracy: 97.84,
  precision: 96.72,
  recall: 95.91,
  f1Score: 96.31,
  confusionMatrix: {
    trueNormal: 9541,
    falseThreat: 117,
    missedThreat: 48,
    trueThreat: 1125,
  },
  featureImportance,
  dataset: "ReconFlow-2026 v2",
  evaluatedAt: "2026-02-28T00:00:00.000Z",
};
