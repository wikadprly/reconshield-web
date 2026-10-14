import type { Metadata } from "next";
import ActiveTarpitView from "@/components/active-tarpit-view";

export const metadata: Metadata = { title: "Active Tarpit" };

export default function ActiveTarpitPage() {
  return <ActiveTarpitView />;
}
