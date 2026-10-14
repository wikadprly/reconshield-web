import type { Metadata } from "next";
import ThreatLogsView from "@/components/threat-logs-view";

export const metadata: Metadata = { title: "Threat Logs" };

export default function ThreatLogsPage() {
  return <ThreatLogsView />;
}
