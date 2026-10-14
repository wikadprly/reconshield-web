"use client";

import { Activity, AlertTriangle, ArrowRight, Database, LockKeyhole, Network, Server, ShieldCheck, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import DetectionTable from "@/components/detection-table";
import TrafficChart from "@/components/traffic-chart";
import { Badge, Card, CardHeader, MetricCard, MockNotice } from "@/components/ui";
import { detections, trafficByRange } from "@/data/mock-security";

type Range = keyof typeof trafficByRange;

export default function DashboardView() {
  const [range, setRange] = useState<Range>("24h");
  const labels: Record<Range, string> = { "1h": "1 Hour", "24h": "24 Hours", "7d": "7 Days" };
  const sources = [["192.168.1.50", 84, 100], ["10.10.24.118", 71, 84], ["172.16.4.92", 56, 67], ["192.168.10.77", 43, 51], ["10.10.24.201", 38, 45]] as const;

  return <div className="page-stack">
    <MockNotice />
    <div className="metrics-grid four">
      <MetricCard title="Total Traffic Analyzed" value="12,483" detail="+8.2% from prior period" icon={<TrendingUp size={20} />} badge={<Badge tone="success">↑ 8.2%</Badge>} />
      <MetricCard title="Threats Detected" value="556" detail="4.45% of analyzed flows" icon={<AlertTriangle size={20} />} tone="red" badge={<Badge tone="danger">Elevated</Badge>} />
      <MetricCard title="Active Tarpitted IPs" value="31" detail="Mock mitigation snapshot" icon={<LockKeyhole size={20} />} tone="purple" badge={<Badge tone="purple">Protected</Badge>} />
      <Card className="metric-card status-card"><div className="metric-icon tone-cyan"><Server size={20} /></div><div className="metric-copy"><span className="metric-label">Service Snapshot</span><strong className="status-title"><i className="online-dot" />Operational</strong><div className="mini-status"><span>MikroTik REST API</span><Badge tone="success" dot>Mock online</Badge></div><div className="mini-status"><span>Random Forest</span><Badge tone="success" dot>Mock online</Badge></div></div></Card>
    </div>

    <Card className="trend-card"><CardHeader title="Traffic & Anomaly Trend" subtitle="Illustrative flow volume and classification over time" action={<div className="segmented">{(Object.keys(labels) as Range[]).map((value) => <button key={value} className={range === value ? "active" : ""} onClick={() => setRange(value)}>{labels[value]}</button>)}</div>} /><TrafficChart data={trafficByRange[range]} /></Card>

    <div className="overview-grid">
      <Card><CardHeader title="Traffic Distribution" subtitle="Classification by flow" /><div className="donut-layout"><div className="donut"><div><strong>12,483</strong><span>Total flows</span></div></div><div className="donut-legend"><div><span><i className="dot blue" />Normal traffic</span><b>95.55%</b></div><div><span><i className="dot red" />Reconnaissance</span><b>4.45%</b></div><div className="legend-count"><span>11,927 normal</span><span>556 threats</span></div></div></div></Card>
      <Card><CardHeader title="Top Reconnaissance Sources" subtitle="Ranked by detection count" action={<Link className="text-action" href="/threat-logs">View logs <ArrowRight size={14} /></Link>} /><div className="ip-list">{sources.map(([ip, count, width], index) => <div className="ip-row" key={ip}><span className="rank">{index + 1}</span><div><div className="ip-meta"><b>{ip}</b><span>{count} detections</span></div><div className="progress"><i style={{ width: `${width}%` }} /></div></div></div>)}</div></Card>
      <Card className="summary-card"><CardHeader title="Network Security Summary" subtitle="Statistical interpretation of mock monitoring data" /><div className="condition"><div className="condition-icon"><Activity size={22} /></div><div><span>Network condition</span><strong>Elevated</strong></div><Badge tone="warning" dot>Requires attention</Badge></div><p className="summary-text">During this sample period, <b>12,483 flows</b> were analyzed and <b>556 were classified as reconnaissance</b>. Anomaly activity peaked between <b>20:00–22:00</b>. <b>31 source IPs</b> appear in the sample mitigation list.</p><div className="summary-stats"><div><span>Detection rate</span><b>4.45%</b></div><div><span>Peak window</span><b>20:00–22:00</b></div><div><span>Mitigation rate</span><b>96.8%</b></div></div><small className="evidence-note"><Database size={14} /> Generated from mock statistics · not live telemetry</small></Card>
    </div>

    <Card><CardHeader title="Recent Detections" subtitle="Latest sample Random Forest classifications" action={<Link className="btn btn-secondary" href="/threat-logs">View all incidents</Link>} /><DetectionTable rows={detections.slice(0, 5)} compact /></Card>
    <div className="architecture-strip"><Network size={20} /><span>MikroTik CHR</span><ArrowRight size={14} /><span>NetFlow/IPFIX</span><ArrowRight size={14} /><span>Python preprocessing</span><ArrowRight size={14} /><span>Random Forest</span><ArrowRight size={14} /><span>RouterOS REST API</span><ArrowRight size={14} /><span>Dynamic Tarpit</span><ShieldCheck size={20} /></div>
  </div>;
}
