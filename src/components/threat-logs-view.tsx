"use client";

import { Download, Search, Shield, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import DetectionTable from "@/components/detection-table";
import { Modal } from "@/components/modal";
import { Badge, Button, Card, CardHeader, DataStateNotice, MockNotice } from "@/components/ui";
import { formatTimestamp, parseTimestamp } from "@/lib/format";
import { labelAction, labelClassification, labelFeature, labelSource, labelStatus } from "@/lib/labels";
import { useApiResult } from "@/lib/use-api-result";
import type { ClassificationEvidence, Detection } from "@/types/security";

type DateRange = "24h" | "7d" | "30d";
const RANGE_HOURS: Record<DateRange, number> = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30 };
const ALL_CLASSIFICATIONS = "Semua klasifikasi";
const ALL_ACTIONS = "Semua tindakan";

export default function ThreatLogsView() {
  const { result, loading, error } = useApiResult<Detection[]>("/api/detections?limit=200");
  const detections = result?.data ?? [];
  const [query, setQuery] = useState("");
  const [classification, setClassification] = useState(ALL_CLASSIFICATIONS);
  const [action, setAction] = useState(ALL_ACTIONS);
  const [dateRange, setDateRange] = useState<DateRange>("24h");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Detection | null>(null);
  const [evidence, setEvidence] = useState<ClassificationEvidence | null>(null);
  const [evidenceState, setEvidenceState] = useState<"idle" | "loading" | "missing" | "error">("idle");
  const pageSize = 5;

  async function openDetail(row: Detection) {
    setSelected(row);
    setEvidence(null);
    setEvidenceState("loading");
    try {
      const response = await fetch(`/api/evidence/${encodeURIComponent(row.id)}`, { cache: "no-store" });
      const body = (await response.json()) as { data?: ClassificationEvidence | null };
      if (!response.ok) throw new Error("failed");
      if (body.data) {
        setEvidence(body.data);
        setEvidenceState("idle");
      } else {
        setEvidenceState("missing");
      }
    } catch {
      setEvidenceState("error");
    }
  }

  const reference = useMemo(() => {
    const times = detections
      .map((row) => parseTimestamp(row.timestamp)?.getTime())
      .filter((time): time is number => time !== undefined);
    return times.length > 0 ? Math.max(...times) : null;
  }, [detections]);

  const filtered = useMemo(() => detections.filter((row) => {
    const matchesQuery = `${row.sourceIp} ${row.destinationIp} ${row.id}`.toLowerCase().includes(query.toLowerCase());
    const matchesClass = classification === ALL_CLASSIFICATIONS || row.classification === classification;
    const matchesAction = action === ALL_ACTIONS || row.action === action;
    let matchesDate = true;
    if (reference !== null) {
      const time = parseTimestamp(row.timestamp)?.getTime();
      if (time !== undefined) {
        matchesDate = time >= reference - RANGE_HOURS[dateRange] * 3_600_000;
      }
    }
    return matchesQuery && matchesClass && matchesAction && matchesDate;
  }), [detections, query, classification, action, dateRange, reference]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function exportPdf() {
    // Server-side PDF: a real report document, not the browser print dialog.
    const period = dateRange === "24h" ? "24h" : dateRange === "7d" ? "7d" : "30d";
    window.location.href = `/api/reports/incidents?period=${period}`;
  }

  function exportCsv() {
    const header = "insiden,waktu,ip_sumber,port_sumber,ip_tujuan,port_tujuan,klasifikasi,keyakinan,tindakan,status";
    const lines = filtered.map((row) => [row.id, row.timestamp, row.sourceIp, row.sourcePort, row.destinationIp, row.destinationPort, row.classification, row.confidence, row.action, row.status].join(","));
    const url = URL.createObjectURL(new Blob([[header, ...lines].join("\n")], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "reconshield-log-ancaman.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <div className="page-stack">
    <MockNotice source={result?.source} />
    <DataStateNotice loading={loading} error={error} />
    <div className="page-action-row"><div className="context-note"><Shield size={20} /><div><strong>Repositori bukti insiden</strong><span>Catatan klasifikasi dan mitigasi disimpan sebagai bukti terpisah.</span></div></div><div className="button-row"><Button variant="secondary" onClick={exportPdf}><Download size={15} />Unduh Laporan PDF</Button><Button onClick={exportCsv}><Download size={15} />Ekspor CSV</Button></div></div>
    <Card><div className="filters"><label className="search-field"><Search size={17} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Cari IP atau ID insiden..." /></label><label className="filter-field"><span>Rentang tanggal</span><select value={dateRange} onChange={(event) => { setDateRange(event.target.value as DateRange); setPage(1); }}><option value="24h">24 jam terakhir</option><option value="7d">7 hari terakhir</option><option value="30d">30 hari terakhir</option></select></label><label className="filter-field"><span>Klasifikasi</span><select value={classification} onChange={(event) => { setClassification(event.target.value); setPage(1); }}><option>{ALL_CLASSIFICATIONS}</option><option>Reconnaissance</option><option>Normal</option></select></label><label className="filter-field"><span>Tindakan</span><select value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }}><option>{ALL_ACTIONS}</option><option value="TARPIT">TARPIT</option><option value="Pending">Tertunda</option><option value="Blocked">Diblokir</option></select></label></div></Card>
    <Card><CardHeader title="Insiden Keamanan" subtitle={`${filtered.length} catatan cocok dengan filter saat ini`} action={<Badge tone="info"><SlidersHorizontal size={12} />Tampilan terfilter</Badge>} /><DetectionTable rows={visibleRows} onSelect={openDetail} /><div className="pagination"><span>Menampilkan {visibleRows.length} dari {filtered.length} catatan yang cocok</span><div><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Sebelumnya</button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((value) => <button key={value} className={currentPage === value ? "active" : ""} onClick={() => setPage(value)}>{value}</button>)}<button disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Berikutnya</button></div></div></Card>
    {selected && <Modal title={`Insiden ${selected.id}`} confirmText="Tutup detail" onCancel={() => setSelected(null)} onConfirm={() => setSelected(null)}><div className="detail-grid"><div><span>Endpoint sumber</span><b className="mono">{selected.sourceIp}:{selected.sourcePort}</b></div><div><span>Endpoint tujuan</span><b className="mono">{selected.destinationIp}:{selected.destinationPort}</b></div><div><span>Klasifikasi</span><Badge tone={selected.classification === "Reconnaissance" ? "danger" : "success"}>{labelClassification(selected.classification)}</Badge></div><div><span>Keyakinan</span><b>{selected.confidence.toFixed(1)}%</b></div><div><span>Tindakan</span><Badge tone="purple">{labelAction(selected.action)}</Badge></div><div><span>Status</span><Badge tone="success" dot>{labelStatus(selected.status)}</Badge></div><div><span>Waktu</span><b>{formatTimestamp(selected.timestamp)}</b></div><div><span>Sumber</span><b>{labelSource(result?.source)}</b></div></div>
      <div className="evidence-block">
        <h3>Bukti klasifikasi</h3>
        {evidenceState === "loading" && <p className="detail-note">Memuat bukti klasifikasi…</p>}
        {evidenceState === "missing" && <p className="detail-note">Belum ada snapshot bukti tersimpan untuk insiden ini (mis. data seed yang dibuat sebelum fitur evidence).</p>}
        {evidenceState === "error" && <p className="detail-note">Bukti klasifikasi gagal dimuat.</p>}
        {evidence && <>
          <div className="detail-grid">
            <div><span>Model</span><b>{evidence.modelName} · {evidence.modelVersion}</b></div>
            <div><span>Versi kebijakan</span><b>{evidence.policyVersion}</b></div>
            <div><span>Arah flow</span><b>{evidence.flowDirection}</b></div>
            <div><span>Jumlah fitur</span><b>{evidence.featureCount} / 16</b></div>
          </div>
          <div className="table-scroll"><table><thead><tr><th>Fitur</th><th>Nilai</th></tr></thead><tbody>{Object.entries(evidence.features).map(([name, value]) => <tr key={name}><td>{labelFeature(name)}</td><td>{Number(value).toFixed(4)}</td></tr>)}</tbody></table></div>
        </>}
      </div>
      <p className="detail-note">Bukti klasifikasi adalah snapshot fitur, keyakinan, dan versi model/kebijakan — bukan klaim tentang alasan internal Random Forest. Tidak ada klaim tindakan router selain yang dilaporkan backend.</p></Modal>}
  </div>;
}
