import type { Metadata } from "next";
import MlPerformanceView from "@/components/ml-performance-view";

export const metadata: Metadata = { title: "ML Performance" };

export default function MlPerformancePage() {
  return <MlPerformanceView />;
}
