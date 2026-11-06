"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface RouterHistoryPoint {
  time: string;
  cpuLoadPercent: number;
  memoryUsedPercent: number;
}

export default function RouterHistoryChart({ data }: { data: readonly RouterHistoryPoint[] }) {
  return <div className="rechart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={[...data]} margin={{ top: 16, right: 10, left: -18, bottom: 0 }}><CartesianGrid stroke="#E7EEF5" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "#8AA0B8", fontSize: 10 }} dy={8} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#8AA0B8", fontSize: 10 }} domain={[0, 100]} /><Tooltip contentStyle={{ border: "1px solid #DCE6F0", borderRadius: 10, boxShadow: "0 8px 24px rgba(31,58,95,.09)", fontSize: 11 }} /><Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, paddingTop: 10 }} /><Line type="monotone" dataKey="cpuLoadPercent" name="CPU load (%)" stroke="#E96A7A" strokeWidth={2.5} dot={false} /><Line type="monotone" dataKey="memoryUsedPercent" name="Memory used (%)" stroke="#4A90E2" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer></div>;
}
