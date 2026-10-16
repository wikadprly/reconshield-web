// Seeds the reconshield database with the same sample data the UI previously
// showed as mock, so the database path can be exercised end to end.
//
// Run after `prisma migrate dev`:
//   node --env-file=.env prisma/seed.mjs
//
// Uses raw SQL because the Prisma client is generated as TypeScript (src/generated/prisma),
// which a plain Node process cannot import. IDs and updatedAt are supplied
// explicitly because cuid()/updatedAt are client-side defaults, not database ones.

import { Client } from "pg";

const url = new URL(process.env.DATABASE_URL);
const client = new Client({
  user: url.username,
  password: decodeURIComponent(url.password),
  host: url.hostname,
  port: url.port || 5432,
  database: url.pathname.replace(/^\//, "") || "reconshield",
});

const detections = [
  ["INC-1056", "2026-03-10T21:48:00.000Z", "192.168.1.50", 42132, "192.168.1.10", 22, "Reconnaissance", 98.5, "TARPIT", "Active"],
  ["INC-1055", "2026-03-10T21:42:00.000Z", "10.10.24.118", 55218, "192.168.1.1", 8291, "Reconnaissance", 96.2, "TARPIT", "Active"],
  ["INC-1054", "2026-03-10T21:35:00.000Z", "172.16.4.92", 49302, "192.168.1.12", 80, "Reconnaissance", 93.8, "TARPIT", "Released"],
  ["INC-1053", "2026-03-10T21:29:00.000Z", "192.168.10.77", 33451, "192.168.1.10", 443, "Reconnaissance", 91.4, "Pending", "Review"],
  ["INC-1052", "2026-03-10T21:17:00.000Z", "10.10.24.201", 61003, "192.168.1.14", 3389, "Reconnaissance", 99.1, "TARPIT", "Active"],
  ["INC-1051", "2026-03-10T20:58:00.000Z", "172.16.8.44", 52017, "192.168.1.1", 53, "Reconnaissance", 89.7, "Blocked", "Resolved"],
  ["INC-1050", "2026-03-10T20:41:00.000Z", "203.0.113.42", 49101, "192.168.1.18", 445, "Reconnaissance", 94.6, "TARPIT", "Active"],
  ["INC-1049", "2026-03-10T20:24:00.000Z", "198.51.100.71", 60112, "192.168.1.16", 8080, "Reconnaissance", 87.9, "Pending", "Review"],
];

const tarpitEntries = [
  ["tarp-1", "192.168.1.50", "2026-03-10T21:48:00.000Z", "00:42:18"],
  ["tarp-2", "10.10.24.118", "2026-03-10T21:42:00.000Z", "00:48:05"],
  ["tarp-3", "10.10.24.201", "2026-03-10T21:17:00.000Z", "01:13:42"],
  ["tarp-4", "203.0.113.42", "2026-03-10T20:36:00.000Z", "01:54:10"],
  ["tarp-5", "198.51.100.71", "2026-03-10T19:55:00.000Z", "02:35:28"],
];

const services = [
  ["MikroTik RouterOS API", "Configured endpoint · credentials server-side", "Online"],
  ["Random Forest Service", "Classifier service · v1.4.2", "Online"],
];

const auditEntries = [
  ["AUD-003", "2026-03-10T20:15:00.000Z", "admin", "Manual", "Automatic"],
  ["AUD-002", "2026-03-08T09:42:00.000Z", "admin", "Automatic", "Manual"],
  ["AUD-001", "2026-03-01T14:10:00.000Z", "researcher", "Manual", "Automatic"],
];

const featureImportance = [
  ["fi-1", "Flow Duration", 0.89],
  ["fi-2", "Total Packets", 0.74],
  ["fi-3", "SYN Flag Count", 0.68],
  ["fi-4", "Total Bytes", 0.57],
  ["fi-5", "ACK Flag Count", 0.42],
];

await client.connect();
try {
  await client.query("BEGIN");
  await client.query("TRUNCATE TABLE feature_importances, model_evaluations, detections, tarpit_entries, service_statuses, audit_entries, mitigation_settings CASCADE");

  for (const [id, timestamp, sourceIp, sourcePort, destinationIp, destinationPort, classification, confidence, action, status] of detections) {
    await client.query(
      `INSERT INTO detections (id, "timestamp", "sourceIp", "sourcePort", "destinationIp", "destinationPort", classification, confidence, action, status, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now(), now())`,
      [id, timestamp, sourceIp, sourcePort, destinationIp, destinationPort, classification, confidence, action, status],
    );
  }

  for (const [id, ip, detectedAt, duration] of tarpitEntries) {
    await client.query(
      `INSERT INTO tarpit_entries (id, ip, "detectedAt", duration, "addressList", status, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,'Active', now(), now())`,
      [id, ip, detectedAt, duration, "reconshield-tarpit-active"],
    );
  }

  for (const [name, detail, status] of services) {
    await client.query(
      `INSERT INTO service_statuses (name, detail, status, "checkedAt") VALUES ($1,$2,$3, now())`,
      [name, detail, status],
    );
  }

  for (const [id, timestamp, administrator, previousMode, newMode] of auditEntries) {
    await client.query(
      `INSERT INTO audit_entries (id, "timestamp", administrator, "previousMode", "newMode", "createdAt")
       VALUES ($1,$2,$3,$4,$5, now())`,
      [id, timestamp, administrator, previousMode, newMode],
    );
  }

  await client.query(
    `INSERT INTO mitigation_settings (id, mode, "updatedAt") VALUES ('default','Automatic', now())`,
  );

  await client.query(
    `INSERT INTO model_evaluations (id, "modelName", version, accuracy, precision, recall, "f1Score", "trueNormal", "falseThreat", "missedThreat", "trueThreat", dataset, "evaluatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    ["eval-1", "Random Forest Classifier", "v1.4.2", 97.84, 96.72, 95.91, 96.31, 9541, 117, 48, 1125, "ReconFlow-2026 v2", "2026-02-28T00:00:00.000Z"],
  );

  for (const [id, feature, importance] of featureImportance) {
    await client.query(
      `INSERT INTO feature_importances (id, feature, importance, "evaluationId") VALUES ($1,$2,$3,'eval-1')`,
      [id, feature, importance],
    );
  }

  await client.query("COMMIT");
  console.log(`seeded: ${detections.length} detections, ${tarpitEntries.length} tarpit, ${services.length} services, ${auditEntries.length} audit, ${featureImportance.length} features`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
