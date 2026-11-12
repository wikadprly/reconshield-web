"use client";

import { Activity, AlertTriangle, ArrowRight, Database, LockKeyhole, Network, Server, ShieldCheck, TrendingUp } from "lucide-react";
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

export default function DashboardView() {
  const [range, setRange] = useState<Range>("24h");
  const { result, loading, error } = useApiResult<SecurityOverview>("/api/overview");
  const traffic = useApiResult<{ time: string; normal: number; reconnaissance: number }[]>(`/api/traffic?range=${range}`);
  const labels: Record<Range, string> = { "1h": "1 Jam", "24h": "24 Jam", "7d": "7 Hari" };

  const overview = result?.data;
  const detections = overview?.detections ?? [];
  const tarpit = overview?.tarpit ?? [];
  const services = overview?.services ?? [];
  const totals = overview?.totals;
  const total = totals?.detections ?? 0;
  const scoped = totals?.scoped ?? true;
  const normalCount = Math.max(0, total - (totals?.reconnaissance ?? 0));
  const reconnaissanceRate = total > 0 ? ((totals?.reconnaissance ?? 0) / total) * 100 : 0;
  const normalRate = 100 - reconnaissanceRate;
  const scopeLabel = scoped ? "sampel" : "database";
  // Condition is derived from real ratios, not a hardcoded "Meningkat" badge.
  const reconRate = total > 0 ? (totals?.reconnaissance ?? 0) / total : 0;
  const condition = reconRate >= 0.75
    ? { label: "Kritis", tone: "danger" as const, note: "Mayoritas deteksi adalah reconnaissance" }
    : reconRate >= 0.4
      ? { label: "Meningkat", tone: "warning" as const, note: "Proporsi reconnaissance tinggi" }
      : { label: "Stabil", tone: "success" as const, note: "Proporsi reconnaissance terkendali" };
  const topSources = rankTopSources(detections, 5);
  const maxSourceCount = topSources[0]?.count ?? 1;

  return <div className="page-stack">
    <MockNotice source={result?.source} />
    <DataStateNotice loading={loading} error={error} />
    <div className="metrics-grid four">
      <MetricCard title="Total Deteksi" value={total.toLocaleString("id-ID")} detail={scoped ? "Dihitung dari sampel (database tidak tersedia)" : "Total baris tabel detections"} icon={<TrendingUp size={20} />} />
      <MetricCard title="Reconnaissance Ditandai" value={(totals?.reconnaissance ?? 0).toLocaleString("id-ID")} detail={total > 0 ? `${reconnaissanceRate.toFixed(2)}% dari ${scopeLabel}` : "Belum ada catatan"} icon={<AlertTriangle size={20} />} tone="red" badge={<Badge tone={condition.tone}>{condition.label}</Badge>} />
      <MetricCard title="IP Tarpit Aktif" value={(totals?.tarpitActive ?? tarpit.length).toLocaleString("id-ID")} detail="Saat ini berada di daftar mitigasi" icon={<LockKeyhole size={20} />} tone="purple" badge={<Badge tone="purple">Terlindungi</Badge>} />
      <Card className="metric-card status-card"><div className="metric-icon tone-cyan"><Server size={20} /></div><div className="metric-copy"><span className="metric-label">Ringkasan Layanan</span><strong className="status-title"><i className="online-dot" />Operasional</strong>{services.map((service) => <div className="mini-status" key={service.name}><span>{service.name}</span><Badge tone={service.status === "Online" ? "success" : "danger"} dot>{labelStatus(service.status)}</Badge></div>)}{services.length === 0 && <div className="mini-status"><span>Tidak ada layanan dilaporkan</span><Badge tone="neutral">—</Badge></div>}</div></Card>
    </div>

    <Card className="trend-card"><CardHeader title="Tren Deteksi & Anomali" subtitle="Jumlah deteksi per interval waktu, dihitung dari database" action={<div className="segmented">{(Object.keys(labels) as Range[]).map((value) => <button key={value} className={range === value ? "active" : ""} onClick={() => setRange(value)}>{labels[value]}</button>)}</div>} /><TrafficChart data={traffic.result?.data ?? []} />{traffic.result?.source === "database" && (traffic.result.data.length === 0) && <div className="empty-table">Belum ada deteksi pada rentang ini.</div>}</Card>

    <div className="overview-grid">
      <Card><CardHeader title="Distribusi Trafik" subtitle={scoped ? "Dihitung dari sampel (database tidak tersedia)" : "Klasifikasi seluruh deteksi di database"} /><div className="donut-layout"><div className="donut" style={{ background: `conic-gradient(var(--primary) 0 ${normalRate}%, var(--danger) ${normalRate}%)` }}><div><strong>{total.toLocaleString("id-ID")}</strong><span>Total deteksi</span></div></div><div className="donut-legend"><div><span><i className="dot blue" />Trafik normal</span><b>{normalRate.toFixed(2)}%</b></div><div><span><i className="dot red" />Reconnaissance</span><b>{reconnaissanceRate.toFixed(2)}%</b></div><div className="legend-count"><span>{normalCount.toLocaleString("id-ID")} normal</span><span>{totals?.reconnaissance ?? 0} ancaman</span></div></div></div></Card>
      <Card><CardHeader title="Sumber Reconnaissance Teratas" subtitle="Diurutkan berdasarkan jumlah deteksi" action={<Link className="text-action" href="/threat-logs">Lihat log <ArrowRight size={14} /></Link>} /><div className="ip-list">{topSources.map((source, index) => <div className="ip-row" key={source.ip}><span className="rank">{index + 1}</span><div><div className="ip-meta"><b>{source.ip}</b><span>{source.count} deteksi</span></div><div className="progress"><i style={{ width: `${Math.round((source.count / maxSourceCount) * 100)}%` }} /></div></div></div>)}{topSources.length === 0 && <div className="empty-table">Tidak ada sumber reconnaissance pada sampel saat ini.</div>}</div></Card>
      <Card className="summary-card"><CardHeader title="Ringkasan Keamanan Jaringan" subtitle={scoped ? "Interpretasi statistik dari sampel" : "Interpretasi statistik dari database"} /><div className="condition"><div className="condition-icon"><Activity size={22} /></div><div><span>Kondisi jaringan</span><strong>{condition.label}</strong></div><Badge tone={condition.tone} dot>{condition.note}</Badge></div><p className="summary-text">Tercatat <b>{total.toLocaleString("id-ID")} deteksi</b>, dengan <b>{totals?.reconnaissance ?? 0} diklasifikasikan sebagai reconnaissance</b>. <b>{totals?.tarpitActive ?? tarpit.length} IP sumber</b> muncul di daftar mitigasi.</p><div className="summary-stats"><div><span>Tingkat deteksi</span><b>{reconnaissanceRate.toFixed(2)}%</b></div><div><span>Total deteksi</span><b>{total.toLocaleString("id-ID")}</b></div><div><span>Tarpit aktif</span><b>{totals?.tarpitActive ?? tarpit.length}</b></div></div><small className="evidence-note"><Database size={14} /> Sumber: {labelSource(result?.source)} · {scoped ? "sampel catatan" : "agregat database"}</small></Card>
    </div>

    <Card><CardHeader title="Deteksi Terbaru" subtitle="Klasifikasi Random Forest terbaru dari sampel" action={<Link className="btn btn-secondary" href="/threat-logs">Lihat semua insiden</Link>} /><DetectionTable rows={detections.slice(0, 5)} compact /></Card>
    <div className="architecture-strip"><Network size={20} /><span>MikroTik CHR</span><ArrowRight size={14} /><span>NetFlow/IPFIX</span><ArrowRight size={14} /><span>Praproses Python</span><ArrowRight size={14} /><span>Random Forest</span><ArrowRight size={14} /><span>RouterOS REST API</span><ArrowRight size={14} /><span>Dynamic Tarpit</span><ShieldCheck size={20} /></div>
  </div>;
}
