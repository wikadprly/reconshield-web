import type { DataSource, MitigationMode } from "@/types/security";

const classificationLabels: Record<string, string> = {
  Reconnaissance: "Reconnaissance",
  Normal: "Normal",
};

const actionLabels: Record<string, string> = {
  TARPIT: "TARPIT",
  Pending: "Tertunda",
  Blocked: "Diblokir",
};

const statusLabels: Record<string, string> = {
  Active: "Aktif",
  Review: "Tinjau",
  Released: "Dilepas",
  Resolved: "Selesai",
  Online: "Online",
  Offline: "Offline",
};

const modeLabels: Record<string, string> = {
  Automatic: "Otomatis",
  Manual: "Manual",
};

const sourceLabels: Record<DataSource, string> = {
  database: "Database",
  remote: "Layanan ML",
  mock: "Data pratinjau",
  mixed: "Campuran",
};

const featureLabels: Record<string, string> = {
  "Byte Count": "Jumlah Byte",
  "Bytes per Packet": "Byte per Paket",
  "Source Port": "Port Sumber",
  "Destination Port": "Port Tujuan",
  "RST Flag": "Flag RST",
  "TCP Flags": "Flag TCP",
  "SYN Flag": "Flag SYN",
  "ACK Flag": "Flag ACK",
  Protocol: "Protokol",
  "Packet Count": "Jumlah Paket",
  "Type of Service": "Tipe Layanan",
  "Packet Rate": "Laju Paket",
  "Flow Duration (ms)": "Durasi Flow (ms)",
  "PSH Flag": "Flag PSH",
  "FIN Flag": "Flag FIN",
  "URG Flag": "Flag URG",
  "Flow Duration": "Durasi Flow",
  "Total Packets": "Total Paket",
  "SYN Flag Count": "Jumlah Flag SYN",
  "Total Bytes": "Total Byte",
  "ACK Flag Count": "Jumlah Flag ACK",
};

export function labelClassification(value: string): string {
  return classificationLabels[value] ?? value;
}

export function labelAction(value: string): string {
  return actionLabels[value] ?? value;
}

export function labelStatus(value: string): string {
  return statusLabels[value] ?? value;
}

export function labelMitigationMode(value: MitigationMode | string): string {
  return modeLabels[value] ?? value;
}

export function labelSource(value: DataSource | undefined): string {
  return value ? sourceLabels[value] : "tidak tersedia";
}

export function labelFeature(value: string): string {
  return featureLabels[value] ?? value;
}
