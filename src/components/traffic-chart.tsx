"use client";

import { Area, AreaChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface TrafficPoint {
  time: string;
  normal: number;
  reconnaissance: number;
}

export default function TrafficChart({ data }: { data: readonly TrafficPoint[] }) {
  return <div className="rechart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={[...data]} margin={{ top: 16, right: 10, left: -18, bottom: 0 }}><defs><linearGradient id="normalArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4A90E2" stopOpacity={0.2} /><stop offset="95%" stopColor="#4A90E2" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#E7EEF5" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "#8AA0B8", fontSize: 10 }} dy={8} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#8AA0B8", fontSize: 10 }} /><Tooltip contentStyle={{ border: "1px solid #DCE6F0", borderRadius: 10, boxShadow: "0 8px 24px rgba(31,58,95,.09)", fontSize: 11 }} /><Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, paddingTop: 10 }} /><Area type="monotone" dataKey="normal" name="Normal traffic" stroke="#4A90E2" strokeWidth={2.5} fill="url(#normalArea)" /><Line type="monotone" dataKey="reconnaissance" name="Reconnaissance" stroke="#E96A7A" strokeWidth={2.5} strokeDasharray="6 4" dot={false} /></AreaChart></ResponsiveContainer></div>;
}
