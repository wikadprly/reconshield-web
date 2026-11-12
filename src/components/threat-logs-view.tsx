"use client";

import { Download, Search, Shield, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import DetectionTable from "@/components/detection-table";
import { Modal } from "@/components/modal";
import { Badge, Button, Card, CardHeader, DataStateNotice, MockNotice } from "@/components/ui";
import { formatTimestamp, parseTimestamp } from "@/lib/format";
import { labelAction, labelClassification, labelSource, labelStatus } from "@/lib/labels";
import { useApiResult } from "@/lib/use-api-result";
import type { Detection } from "@/types/security";

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
  const pageSize = 5;

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
    <div className="page-action-row"><div className="context-note"><Shield size={20} /><div><strong>Repositori bukti insiden</strong><span>Catatan klasifikasi dan mitigasi disimpan sebagai bukti terpisah.</span></div></div><div className="button-row"><Button variant="secondary" onClick={() => window.print()}><Download size={15} />Ekspor PDF</Button><Button onClick={exportCsv}><Download size={15} />Ekspor CSV</Button></div></div>
    <Card><div className="filters"><label className="search-field"><Search size={17} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Cari IP atau ID insiden..." /></label><label className="filter-field"><span>Rentang tanggal</span><select value={dateRange} onChange={(event) => { setDateRange(event.target.value as DateRange); setPage(1); }}><option value="24h">24 jam terakhir</option><option value="7d">7 hari terakhir</option><option value="30d">30 hari terakhir</option></select></label><label className="filter-field"><span>Klasifikasi</span><select value={classification} onChange={(event) => { setClassification(event.target.value); setPage(1); }}><option>{ALL_CLASSIFICATIONS}</option><option>Reconnaissance</option><option>Normal</option></select></label><label className="filter-field"><span>Tindakan</span><select value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }}><option>{ALL_ACTIONS}</option><option value="TARPIT">TARPIT</option><option value="Pending">Tertunda</option><option value="Blocked">Diblokir</option></select></label></div></Card>
    <Card><CardHeader title="Insiden Keamanan" subtitle={`${filtered.length} catatan cocok dengan filter saat ini`} action={<Badge tone="info"><SlidersHorizontal size={12} />Tampilan terfilter</Badge>} /><DetectionTable rows={visibleRows} onSelect={setSelected} /><div className="pagination"><span>Menampilkan {visibleRows.length} dari {filtered.length} catatan yang cocok</span><div><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Sebelumnya</button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((value) => <button key={value} className={currentPage === value ? "active" : ""} onClick={() => setPage(value)}>{value}</button>)}<button disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Berikutnya</button></div></div></Card>
    {selected && <Modal title={`Insiden ${selected.id}`} confirmText="Tutup detail" onCancel={() => setSelected(null)} onConfirm={() => setSelected(null)}><div className="detail-grid"><div><span>Endpoint sumber</span><b className="mono">{selected.sourceIp}:{selected.sourcePort}</b></div><div><span>Endpoint tujuan</span><b className="mono">{selected.destinationIp}:{selected.destinationPort}</b></div><div><span>Klasifikasi</span><Badge tone={selected.classification === "Reconnaissance" ? "danger" : "success"}>{labelClassification(selected.classification)}</Badge></div><div><span>Keyakinan</span><b>{selected.confidence.toFixed(1)}%</b></div><div><span>Tindakan</span><Badge tone="purple">{labelAction(selected.action)}</Badge></div><div><span>Status</span><Badge tone="success" dot>{labelStatus(selected.status)}</Badge></div><div><span>Waktu</span><b>{formatTimestamp(selected.timestamp)}</b></div><div><span>Sumber</span><b>{labelSource(result?.source)}</b></div></div><p className="detail-note">Catatan ini dibaca dari sumber data {labelSource(result?.source)}. Tidak ada klaim tentang klasifikasi langsung atau tindakan router selain yang dilaporkan backend.</p></Modal>}
  </div>;
}
