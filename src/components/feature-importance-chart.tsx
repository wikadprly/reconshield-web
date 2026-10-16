"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { FeatureImportance } from "@/types/security";

export default function FeatureImportanceChart({ data }: { data: FeatureImportance[] }) {
  return <div className="feature-rechart"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, left: 14, bottom: 4 }}><CartesianGrid stroke="#E7EEF5" strokeDasharray="3 3" horizontal={false} /><XAxis type="number" domain={[0, 1]} axisLine={false} tickLine={false} tick={{ fill: "#8AA0B8", fontSize: 9 }} /><YAxis type="category" dataKey="feature" width={105} axisLine={false} tickLine={false} tick={{ fill: "#536D8B", fontSize: 10 }} /><Tooltip formatter={(value) => [Number(value).toFixed(2), "Gini importance"]} contentStyle={{ border: "1px solid #DCE6F0", borderRadius: 10, fontSize: 11 }} /><Bar dataKey="importance" fill="#4A90E2" radius={[0, 5, 5, 0]} barSize={16} /></BarChart></ResponsiveContainer></div>;
}
