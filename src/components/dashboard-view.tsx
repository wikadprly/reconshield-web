"use client";

import { Activity, AlertTriangle, ArrowRight, Database, LockKeyhole, Network, RefreshCw, Server, ShieldCheck, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import DetectionTable from "@/components/detection-table";
import TrafficChart from "@/components/traffic-chart";
import { Badge, Card, CardHeader, DataStateNotice, MetricCard, MockNotice } from "@/components/ui";
import { rankTopSources } from "@/lib/format";
import { labelSource, labelStatus } from "@/lib/labels";
import { useApiResult } from "@/lib/use-api-result";
import type { SecurityOverview } from "@/types/security";

type Range = "1h" | "24h" | "7d";

const RANGE_LABELS: Record<Range, string> = { "1h": "1 Jam", "24h": "24 Jam", "7d": "7 Hari" };

export default function DashboardView() {
  const [range, setRange] = useState<Range>("24h");
  // 20s polling keeps the "current status" panel live without a manual reload.
  const { result, loading, error, refresh } = useApiResult<SecurityOverview>("/api/overview", { refreshMs: 10_000 });
  const traffic = useApiResult<{ time: string; normal: number; reconnaissance: number }[]>(`/api/traffic?range=${range}`);
  const refreshAll = () => { refresh(); traffic.refresh(); };

  const overview = result?.data;
  const detections = overview?.detections ?? [];
  const tarpit = overview?.tarpit ?? [];
  const services = overview?.services ?? [];
  const totals = overview?.totals;
  const total = totals?.detections ?? 0;
  const scoped = totals?.scoped ?? true;
  const reconnaissance = totals?.reconnaissance ?? 0;
  const reconnaissanceRate = total > 0 ? (reconnaissance / total) * 100 : 0;
  const normalRate = 100 - reconnaissanceRate;
  const normalCount = Math.max(0, total - reconnaissance);
  const scopeLabel = scoped ? "sampel" : "database";

  // Status is driven by the current rate (last hour), not lifetime totals: an
  // old attack spike must not keep the panel red forever.
  const activity = overview?.activity;
  const recent = activity?.recent ?? 0;
  const previous = activity?.previous ?? 0;
  const windowMinutes = activity?.windowMinutes ?? 60;
  const delta = recent - previous;
  const trend = delta > 0 ? { label: `+${delta}`, tone: "danger" as const } : delta < 0 ? { label: `${delta}`, tone: "success" as const } : { label: "0", tone: "neutral" as const };

  const condition = recent >= 20
    ? { label: "Kritis", tone: "danger" as const, note: "Lonjakan aktivitas reconnaissance" }
    : recent >= 5
      ? { label: "Meningkat", tone: "warning" as const, note: "Aktivitas reconnaissance berlangsung" }
      : recent > 0
        ? { label: "Waspada", tone: "warning" as const, note: "Ada aktivitas mencurigakan" }
        : { label: "Tenang", tone: "success" as const, note: "Tidak ada deteksi baru pada jendela ini" };

  const lastSeen = activity?.lastSeenAt
    ? new Date(activity.lastSeenAt).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })
    : null;

  const onlineServices = services.filter((service) => service.status === "Online").length;
  const topSources = rankTopSources(detections, 5);
  const maxSourceCount = topSources[0]?.count ?? 1;

  return <div className="page-stack">
    <MockNotice source={result?.source} />
    <DataStateNotice loading={loading} error={error} />

    {/* Satu fokus utama: apa yang sedang terjadi saat ini. */}
    <section className={`hero-panel tone-${condition.tone}`}>
      <div className="hero-main">
        <div className="hero-top">
          <span className="hero-eyebrow">Status saat ini Â· {windowMinutes} menit terakhir</span>
          <button className="hero-refresh" onClick={refreshAll} disabled={loading || traffic.loading}><RefreshCw size={13} />Muat ulang</button>
        </div>
        <div className="hero-value">
          <Activity size={26} />
          <strong>{condition.label}</strong>
          <span className={`hero-delta tone-${trend.tone}`}>{trend.label} vs {windowMinutes} menit sebelumnya</span>
        </div>
        <p className="hero-note">{condition.note} Â· {recent.toLocaleString("id-ID")} deteksi pada jendela ini ({activity?.reconnaissanceRecent ?? 0} reconnaissance).</p>
        {lastSeen && <p className="hero-last">Terakhir terlihat: <b className="mono">{activity?.lastSourceIp}</b> â†’ port {activity?.lastDestinationPort} Â· {lastSeen}</p>}
      </div>
      <div className="hero-stats">
        <div><span>Jendela ini</span><b>{recent.toLocaleString("id-ID")}</b></div>
        <div><span>Sebelumnya</span><b>{previous.toLocaleString("id-ID")}</b></div>
        <div><span>Tarpit aktif</span><b>{(totals?.tarpitActive ?? tarpit.length).toLocaleString("id-ID")}</b></div>
        <div><span>Layanan</span><b>{onlineServices}/{services.length}</b></div>
      </div>
    </section>

    <div className="metrics-grid three">
      <MetricCard title="Total Deteksi" value={total.toLocaleString("id-ID")} detail={scoped ? "Dari sampel" : "Seluruh database"} icon={<TrendingUp size={20} />} />
      <MetricCard title="Reconnaissance" value={reconnaissance.toLocaleString("id-ID")} detail={`${reconnaissanceRate.toFixed(2)}% dari ${scopeLabel}`} icon={<AlertTriangle size={20} />} tone="red" />
      <Card className="metric-card status-card"><div className="metric-icon tone-cyan"><Server size={20} /></div><div className="metric-copy"><span className="metric-label">Ringkasan Layanan</span><strong className="status-title"><i className="online-dot" />{onlineServices === services.length && services.length > 0 ? "Operasional" : "Perlu diperiksa"}</strong>{services.map((service) => <div className="mini-status" key={service.name}><span>{service.name}</span><Badge tone={service.status === "Online" ? "success" : "danger"} dot>{labelStatus(service.status)}</Badge></div>)}{services.length === 0 && <div className="mini-status"><span>Tidak ada layanan dilaporkan</span><Badge tone="neutral">â€”</Badge></div>}</div></Card>
    </div>

    <Card className="trend-card">
      <CardHeader title="Tren Deteksi" subtitle="Jumlah deteksi per interval, dari database" action={<div className="segmented">{(Object.keys(RANGE_LABELS) as Range[]).map((value) => <button key={value} className={range === value ? "active" : ""} onClick={() => setRange(value)}>{RANGE_LABELS[value]}</button>)}</div>} />
      <TrafficChart data={traffic.result?.data ?? []} />
      {traffic.result?.source === "database" && traffic.result.data.length === 0 && <div className="empty-table">Belum ada deteksi pada rentang ini.</div>}
    </Card>

    <div className="overview-grid">
      <Card><CardHeader title="Komposisi Deteksi" /><div className="donut-layout"><div className="donut" style={{ background: `conic-gradient(var(--primary) 0 ${normalRate}%, var(--danger) ${normalRate}%)` }}><div><strong>{total.toLocaleString("id-ID")}</strong><span>total</span></div></div><div className="donut-legend"><div><span><i className="dot blue" />Normal</span><b>{normalRate.toFixed(1)}%</b></div><div><span><i className="dot red" />Reconnaissance</span><b>{reconnaissanceRate.toFixed(1)}%</b></div><div className="legend-count"><span>{normalCount.toLocaleString("id-ID")} normal</span><span>{reconnaissance} ancaman</span></div></div></div></Card>
      <Card><CardHeader title="Sumber Teratas" subtitle="Berdasarkan jumlah deteksi" action={<Link className="text-action" href="/threat-logs">Lihat log <ArrowRight size={14} /></Link>} /><div className="ip-list">{topSources.map((source, index) => <div className="ip-row" key={source.ip}><span className="rank">{index + 1}</span><div><div className="ip-meta"><b>{source.ip}</b><span>{source.count}</span></div><div className="progress"><i style={{ width: `${Math.round((source.count / maxSourceCount) * 100)}%` }} /></div></div></div>)}{topSources.length === 0 && <div className="empty-table">Tidak ada sumber reconnaissance.</div>}</div></Card>
      <Card className="summary-card"><CardHeader title="Ringkasan" /><div className="summary-stats"><div><span>Reconnaissance</span><b>{reconnaissanceRate.toFixed(1)}%</b></div><div><span>Normal</span><b>{normalRate.toFixed(1)}%</b></div><div><span>Tarpit</span><b>{totals?.tarpitActive ?? tarpit.length}</b></div></div><p className="summary-text">Dari <b>{total.toLocaleString("id-ID")} deteksi</b>, <b>{reconnaissance} diklasifikasikan reconnaissance</b> dan <b>{totals?.tarpitActive ?? tarpit.length} IP</b> berada di daftar mitigasi.</p><small className="evidence-note"><Database size={14} /> Sumber: {labelSource(result?.source)} Â· {scoped ? "sampel" : "agregat database"}</small></Card>
    </div>

    <Card><CardHeader title="Deteksi Terbaru" action={<Link className="btn btn-secondary" href="/threat-logs">Lihat semua</Link>} /><DetectionTable rows={detections.slice(0, 5)} compact /></Card>
    <div className="architecture-strip"><Network size={20} /><span>MikroTik hAP lite</span><ArrowRight size={14} /><span>NetFlow/IPFIX</span><ArrowRight size={14} /><span>Praproses Python</span><ArrowRight size={14} /><span>Random Forest</span><ArrowRight size={14} /><span>RouterOS REST API</span><ArrowRight size={14} /><span>Dynamic Tarpit</span><ShieldCheck size={20} /></div>
  </div>;
}
