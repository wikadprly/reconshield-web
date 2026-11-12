import type { Metadata } from "next";
import ActiveTarpitView from "@/components/active-tarpit-view";

export const metadata: Metadata = { title: "Tarpit Aktif" };

export default function ActiveTarpitPage() {
  return <ActiveTarpitView />;
}
