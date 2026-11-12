import type { Metadata } from "next";
import ThreatLogsView from "@/components/threat-logs-view";

export const metadata: Metadata = { title: "Log Ancaman" };

export default function ThreatLogsPage() {
  return <ThreatLogsView />;
}
