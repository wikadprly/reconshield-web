"use client";

import { Activity, AlertTriangle, ArrowRight, Database, LockKeyhole, Network, Server, ShieldCheck, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import DetectionTable from "@/components/detection-table";
import TrafficChart from "@/components/traffic-chart";
import { Badge, Card, CardHeader, DataStateNotice, MetricCard, MockNotice } from "@/components/ui";
import { trafficByRange } from "@/data/mock-security";
import { rankTopSources } from "@/lib/format";
import { labelSource, labelStatus } from "@/lib/labels";
import { useApiResult } from "@/lib/use-api-result";
import type { SecurityOverview } from "@/types/security";

type Range = keyof typeof trafficByRange;

export default function DashboardView() {
  const [range, setRange] = useState<Range>("24h");
  const { result, loading, error } = useApiResult<SecurityOverview>("/api/overview");
  const labels: Record<Range, string> = { "1h": "1 Jam", "24h": "24 Jam", "7d": "7 Hari" };

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
      <MetricCard title="Deteksi dalam Sampel" value={sampleTotal.toLocaleString("id-ID")} detail="Catatan yang diambil dari sumber aktif" icon={<TrendingUp size={20} />} />
      <MetricCard title="Reconnaissance Ditandai" value={(sample?.reconnaissance ?? 0).toLocaleString("id-ID")} detail={sampleTotal > 0 ? `${reconnaissanceRate.toFixed(2)}% dari catatan yang diambil` : "Tidak ada catatan yang diambil"} icon={<AlertTriangle size={20} />} tone="red" badge={<Badge tone="danger">Meningkat</Badge>} />
      <MetricCard title="IP Tarpit Aktif" value={(sample?.tarpitActive ?? tarpit.length).toLocaleString("id-ID")} detail="Saat ini berada di daftar mitigasi" icon={<LockKeyhole size={20} />} tone="purple" badge={<Badge tone="purple">Terlindungi</Badge>} />
      <Card className="metric-card status-card"><div className="metric-icon tone-cyan"><Server size={20} /></div><div className="metric-copy"><span className="metric-label">Ringkasan Layanan</span><strong className="status-title"><i className="online-dot" />Operasional</strong>{services.map((service) => <div className="mini-status" key={service.name}><span>{service.name}</span><Badge tone={service.status === "Online" ? "success" : "danger"} dot>{labelStatus(service.status)}</Badge></div>)}{services.length === 0 && <div className="mini-status"><span>Tidak ada layanan dilaporkan</span><Badge tone="neutral">—</Badge></div>}</div></Card>
    </div>

    <Card className="trend-card"><CardHeader title="Tren Trafik & Anomali" subtitle="Ilustrasi volume flow dan klasifikasi sepanjang waktu" action={<div className="segmented">{(Object.keys(labels) as Range[]).map((value) => <button key={value} className={range === value ? "active" : ""} onClick={() => setRange(value)}>{labels[value]}</button>)}</div>} /><TrafficChart data={trafficByRange[range]} /></Card>

    <div className="overview-grid">
      <Card><CardHeader title="Distribusi Trafik" subtitle="Klasifikasi berdasarkan sampel flow yang diambil" /><div className="donut-layout"><div className="donut" style={{ background: `conic-gradient(var(--primary) 0 ${normalRate}%, var(--danger) ${normalRate}%)` }}><div><strong>{sampleTotal.toLocaleString("id-ID")}</strong><span>Catatan sampel</span></div></div><div className="donut-legend"><div><span><i className="dot blue" />Trafik normal</span><b>{normalRate.toFixed(2)}%</b></div><div><span><i className="dot red" />Reconnaissance</span><b>{reconnaissanceRate.toFixed(2)}%</b></div><div className="legend-count"><span>{normalInSample.toLocaleString("id-ID")} normal</span><span>{sample?.reconnaissance ?? 0} ancaman</span></div></div></div></Card>
      <Card><CardHeader title="Sumber Reconnaissance Teratas" subtitle="Diurutkan berdasarkan jumlah deteksi" action={<Link className="text-action" href="/threat-logs">Lihat log <ArrowRight size={14} /></Link>} /><div className="ip-list">{topSources.map((source, index) => <div className="ip-row" key={source.ip}><span className="rank">{index + 1}</span><div><div className="ip-meta"><b>{source.ip}</b><span>{source.count} deteksi</span></div><div className="progress"><i style={{ width: `${Math.round((source.count / maxSourceCount) * 100)}%` }} /></div></div></div>)}{topSources.length === 0 && <div className="empty-table">Tidak ada sumber reconnaissance pada sampel saat ini.</div>}</div></Card>
      <Card className="summary-card"><CardHeader title="Ringkasan Keamanan Jaringan" subtitle="Interpretasi statistik dari sampel yang diambil" /><div className="condition"><div className="condition-icon"><Activity size={22} /></div><div><span>Kondisi jaringan</span><strong>Meningkat</strong></div><Badge tone="warning" dot>Perlu perhatian</Badge></div><p className="summary-text">Pada sampel ini, <b>{sampleTotal.toLocaleString("id-ID")} catatan</b> diambil dan <b>{sample?.reconnaissance ?? 0} diklasifikasikan sebagai reconnaissance</b>. <b>{sample?.tarpitActive ?? tarpit.length} IP sumber</b> muncul di daftar mitigasi.</p><div className="summary-stats"><div><span>Tingkat deteksi</span><b>{reconnaissanceRate.toFixed(2)}%</b></div><div><span>Ukuran sampel</span><b>{sampleTotal.toLocaleString("id-ID")}</b></div><div><span>Tarpit aktif</span><b>{sample?.tarpitActive ?? tarpit.length}</b></div></div><small className="evidence-note"><Database size={14} /> Sumber: {labelSource(result?.source)} · sampel catatan yang diambil</small></Card>
    </div>

    <Card><CardHeader title="Deteksi Terbaru" subtitle="Klasifikasi Random Forest terbaru dari sampel" action={<Link className="btn btn-secondary" href="/threat-logs">Lihat semua insiden</Link>} /><DetectionTable rows={detections.slice(0, 5)} compact /></Card>
    <div className="architecture-strip"><Network size={20} /><span>MikroTik CHR</span><ArrowRight size={14} /><span>NetFlow/IPFIX</span><ArrowRight size={14} /><span>Praproses Python</span><ArrowRight size={14} /><span>Random Forest</span><ArrowRight size={14} /><span>RouterOS REST API</span><ArrowRight size={14} /><span>Dynamic Tarpit</span><ShieldCheck size={20} /></div>
  </div>;
}
