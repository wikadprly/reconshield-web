"use client";

import { Activity, AlertTriangle, ArrowRight, Database, LockKeyhole, Network, Server, ShieldCheck, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import DetectionTable from "@/components/detection-table";
import TrafficChart from "@/components/traffic-chart";
import { Badge, Card, CardHeader, DataStateNotice, MetricCard, MockNotice } from "@/components/ui";
import { trafficByRange } from "@/data/mock-security";
import { rankTopSources } from "@/lib/format";
import { useApiResult } from "@/lib/use-api-result";
import type { SecurityOverview } from "@/types/security";

type Range = keyof typeof trafficByRange;

export default function DashboardView() {
  const [range, setRange] = useState<Range>("24h");
  const { result, loading, error } = useApiResult<SecurityOverview>("/api/overview");
  const labels: Record<Range, string> = { "1h": "1 Hour", "24h": "24 Hours", "7d": "7 Days" };

  const overview = result?.data;
  const detections = overview?.detections ?? [];
  const tarpit = overview?.tarpit ?? [];
  const services = overview?.services ?? [];
  const sample = overview?.sampleCounts;
  const sampleTotal = sample?.detections ?? 0;
  const normalInSample = Math.max(0, sampleTotal - (sample?.reconnaissance ?? 0));
  const reconnaissanceRate = sampleTotal > 0 ? ((sample?.reconnaissance ?? 0) / sampleTotal) * 100 : 0;
  const normalRate = 100 - reconnaissanceRate;
  const topSources = rankTopSources(detections, 5);
  const maxSourceCount = topSources[0]?.count ?? 1;

  return <div className="page-stack">
    <MockNotice source={result?.source} />
    <DataStateNotice loading={loading} error={error} />
    <div className="metrics-grid four">
      <MetricCard title="Detections in Sample" value={sampleTotal.toLocaleString("en-US")} detail="Records retrieved from the active source" icon={<TrendingUp size={20} />} />
      <MetricCard title="Reconnaissance Flagged" value={(sample?.reconnaissance ?? 0).toLocaleString("en-US")} detail={sampleTotal > 0 ? `${reconnaissanceRate.toFixed(2)}% of retrieved records` : "No records retrieved"} icon={<AlertTriangle size={20} />} tone="red" badge={<Badge tone="danger">Elevated</Badge>} />
      <MetricCard title="Active Tarpitted IPs" value={(sample?.tarpitActive ?? tarpit.length).toLocaleString("en-US")} detail="Currently in the mitigation list" icon={<LockKeyhole size={20} />} tone="purple" badge={<Badge tone="purple">Protected</Badge>} />
      <Card className="metric-card status-card"><div className="metric-icon tone-cyan"><Server size={20} /></div><div className="metric-copy"><span className="metric-label">Service Snapshot</span><strong className="status-title"><i className="online-dot" />Operational</strong>{services.map((service) => <div className="mini-status" key={service.name}><span>{service.name}</span><Badge tone={service.status === "Online" ? "success" : "danger"} dot>{service.status}</Badge></div>)}{services.length === 0 && <div className="mini-status"><span>No services reported</span><Badge tone="neutral">—</Badge></div>}</div></Card>
    </div>

    <Card className="trend-card"><CardHeader title="Traffic & Anomaly Trend" subtitle="Illustrative flow volume and classification over time" action={<div className="segmented">{(Object.keys(labels) as Range[]).map((value) => <button key={value} className={range === value ? "active" : ""} onClick={() => setRange(value)}>{labels[value]}</button>)}</div>} /><TrafficChart data={trafficByRange[range]} /></Card>

    <div className="overview-grid">
      <Card><CardHeader title="Traffic Distribution" subtitle="Classification by retrieved flow sample" /><div className="donut-layout"><div className="donut" style={{ background: `conic-gradient(var(--primary) 0 ${normalRate}%, var(--danger) ${normalRate}%)` }}><div><strong>{sampleTotal.toLocaleString("en-US")}</strong><span>Sample records</span></div></div><div className="donut-legend"><div><span><i className="dot blue" />Normal traffic</span><b>{normalRate.toFixed(2)}%</b></div><div><span><i className="dot red" />Reconnaissance</span><b>{reconnaissanceRate.toFixed(2)}%</b></div><div className="legend-count"><span>{normalInSample.toLocaleString("en-US")} normal</span><span>{sample?.reconnaissance ?? 0} threats</span></div></div></div></Card>
      <Card><CardHeader title="Top Reconnaissance Sources" subtitle="Ranked by detection count" action={<Link className="text-action" href="/threat-logs">View logs <ArrowRight size={14} /></Link>} /><div className="ip-list">{topSources.map((source, index) => <div className="ip-row" key={source.ip}><span className="rank">{index + 1}</span><div><div className="ip-meta"><b>{source.ip}</b><span>{source.count} detections</span></div><div className="progress"><i style={{ width: `${Math.round((source.count / maxSourceCount) * 100)}%` }} /></div></div></div>)}{topSources.length === 0 && <div className="empty-table">No reconnaissance sources in the current sample.</div>}</div></Card>
      <Card className="summary-card"><CardHeader title="Network Security Summary" subtitle="Statistical interpretation of the retrieved sample" /><div className="condition"><div className="condition-icon"><Activity size={22} /></div><div><span>Network condition</span><strong>Elevated</strong></div><Badge tone="warning" dot>Requires attention</Badge></div><p className="summary-text">During this sample, <b>{sampleTotal.toLocaleString("en-US")} records</b> were retrieved and <b>{sample?.reconnaissance ?? 0} were classified as reconnaissance</b>. <b>{sample?.tarpitActive ?? tarpit.length} source IPs</b> appear in the mitigation list.</p><div className="summary-stats"><div><span>Detection rate</span><b>{reconnaissanceRate.toFixed(2)}%</b></div><div><span>Sample size</span><b>{sampleTotal.toLocaleString("en-US")}</b></div><div><span>Tarpit active</span><b>{sample?.tarpitActive ?? tarpit.length}</b></div></div><small className="evidence-note"><Database size={14} /> Source: {result?.source ?? "unavailable"} · sample of retrieved records</small></Card>
    </div>

    <Card><CardHeader title="Recent Detections" subtitle="Latest sample Random Forest classifications" action={<Link className="btn btn-secondary" href="/threat-logs">View all incidents</Link>} /><DetectionTable rows={detections.slice(0, 5)} compact /></Card>
    <div className="architecture-strip"><Network size={20} /><span>MikroTik CHR</span><ArrowRight size={14} /><span>NetFlow/IPFIX</span><ArrowRight size={14} /><span>Python preprocessing</span><ArrowRight size={14} /><span>Random Forest</span><ArrowRight size={14} /><span>RouterOS REST API</span><ArrowRight size={14} /><span>Dynamic Tarpit</span><ShieldCheck size={20} /></div>
  </div>;
}
