import type { Metadata } from "next";
import ApprovalsView from "@/components/approvals-view";

export const metadata: Metadata = { title: "Pusat Persetujuan" };

export default function ApprovalsPage() {
  return <ApprovalsView />;
}
