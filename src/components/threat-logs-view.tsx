"use client";

import { Download, Search, Shield, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import DetectionTable from "@/components/detection-table";
import { Modal } from "@/components/modal";
import { Badge, Button, Card, CardHeader, DataStateNotice, MockNotice } from "@/components/ui";
import { formatTimestamp, parseTimestamp } from "@/lib/format";
import { useApiResult } from "@/lib/use-api-result";
import type { Detection } from "@/types/security";

type DateRange = "24h" | "7d" | "30d";
const RANGE_HOURS: Record<DateRange, number> = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30 };

export default function ThreatLogsView() {
  const { result, loading, error } = useApiResult<Detection[]>("/api/detections?limit=200");
  const detections = result?.data ?? [];
  const [query, setQuery] = useState("");
  const [classification, setClassification] = useState("All classifications");
  const [action, setAction] = useState("All actions");
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
    const matchesClass = classification === "All classifications" || row.classification === classification;
    const matchesAction = action === "All actions" || row.action === action;
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
    const header = "incident,timestamp,source_ip,source_port,destination_ip,destination_port,classification,confidence,action,status";
    const lines = filtered.map((row) => [row.id, row.timestamp, row.sourceIp, row.sourcePort, row.destinationIp, row.destinationPort, row.classification, row.confidence, row.action, row.status].join(","));
    const url = URL.createObjectURL(new Blob([[header, ...lines].join("\n")], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "reconshield-threat-logs.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <div className="page-stack">
    <MockNotice source={result?.source} />
    <DataStateNotice loading={loading} error={error} />
    <div className="page-action-row"><div className="context-note"><Shield size={20} /><div><strong>Incident evidence repository</strong><span>Classification and mitigation records are kept as separate evidence.</span></div></div><div className="button-row"><Button variant="secondary" onClick={() => window.print()}><Download size={15} />Export PDF</Button><Button onClick={exportCsv}><Download size={15} />Export CSV</Button></div></div>
    <Card><div className="filters"><label className="search-field"><Search size={17} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search IP or incident ID..." /></label><label className="filter-field"><span>Date range</span><select value={dateRange} onChange={(event) => { setDateRange(event.target.value as DateRange); setPage(1); }}><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option></select></label><label className="filter-field"><span>Classification</span><select value={classification} onChange={(event) => { setClassification(event.target.value); setPage(1); }}><option>All classifications</option><option>Reconnaissance</option><option>Normal</option></select></label><label className="filter-field"><span>Action</span><select value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }}><option>All actions</option><option>TARPIT</option><option>Pending</option><option>Blocked</option></select></label></div></Card>
    <Card><CardHeader title="Security Incidents" subtitle={`${filtered.length} records match the current filters`} action={<Badge tone="info"><SlidersHorizontal size={12} />Filtered view</Badge>} /><DetectionTable rows={visibleRows} onSelect={setSelected} /><div className="pagination"><span>Showing {visibleRows.length} of {filtered.length} matching records</span><div><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((value) => <button key={value} className={currentPage === value ? "active" : ""} onClick={() => setPage(value)}>{value}</button>)}<button disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</button></div></div></Card>
    {selected && <Modal title={`Incident ${selected.id}`} confirmText="Close details" onCancel={() => setSelected(null)} onConfirm={() => setSelected(null)}><div className="detail-grid"><div><span>Source endpoint</span><b className="mono">{selected.sourceIp}:{selected.sourcePort}</b></div><div><span>Destination endpoint</span><b className="mono">{selected.destinationIp}:{selected.destinationPort}</b></div><div><span>Classification</span><Badge tone={selected.classification === "Reconnaissance" ? "danger" : "success"}>{selected.classification}</Badge></div><div><span>Confidence</span><b>{selected.confidence.toFixed(1)}%</b></div><div><span>Action</span><Badge tone="purple">{selected.action}</Badge></div><div><span>Status</span><Badge tone="success" dot>{selected.status}</Badge></div><div><span>Timestamp</span><b>{formatTimestamp(selected.timestamp)}</b></div><div><span>Source</span><b>{result?.source ?? "unavailable"}</b></div></div><p className="detail-note">This record was read from the {result?.source ?? "configured"} data source. No claim is made about a live classifier or router action beyond what the backend reports.</p></Modal>}
  </div>;
}
