import type { Metadata } from "next";
import MlPerformanceView from "@/components/ml-performance-view";

export const metadata: Metadata = { title: "Performa ML" };

export default function MlPerformancePage() {
  return <MlPerformanceView />;
}
