"use client";

import { CheckCircle2, Clock3, Database, Eye, LockKeyhole, Shield, Unlock } from "lucide-react";
import { useMemo, useState } from "react";
import { Modal } from "@/components/modal";
import { Badge, Card, CardHeader, DataStateNotice, MetricCard, MockNotice } from "@/components/ui";
import { formatTimestamp } from "@/lib/format";
import { useApiResult } from "@/lib/use-api-result";
import type { TarpitEntry } from "@/types/security";

export default function ActiveTarpitView() {
  const { result, loading, error } = useApiResult<TarpitEntry[]>("/api/tarpit");
  const entries = result?.data ?? [];
  const [releasedIps, setReleasedIps] = useState<string[]>([]);
  const [releaseIp, setReleaseIp] = useState<string | null>(null);
  const [selectedIp, setSelectedIp] = useState<string | null>(null);
  const rows = useMemo(() => entries.filter((row) => !releasedIps.includes(row.ip)), [entries, releasedIps]);

  return <div className="page-stack">
    <MockNotice source={result?.source} />
    <DataStateNotice loading={loading} error={error} />
    <div className="metrics-grid three">
      <MetricCard title="Active Tarpitted IPs" value={`${rows.length}`} detail="Currently in the mitigation list" icon={<LockKeyhole size={20} />} tone="purple" />
      <MetricCard title="Address-List Status" value="Synchronized" detail="Address-List reconshield-tarpit-active" icon={<Database size={20} />} tone="cyan" badge={<Badge tone="success" dot>{result?.source ?? "source"}</Badge>} />
      <MetricCard title="Default Tarpit Duration" value="24 hours" detail="Configured mitigation window" icon={<Clock3 size={20} />} />
    </div>
    <div className="explain-banner"><div className="banner-icon"><Shield size={20} /></div><div><strong>Dynamic Tarpit mitigation</strong><p>In production, addresses classified as reconnaissance sources are submitted to the backend, which owns the RouterOS credentials and confirms Address-List changes. Releasing an IP here only updates local interface state until the write path is implemented.</p></div></div>
    <Card>
      <CardHeader title="Active Mitigation Address-List" subtitle="Read from the configured data source" action={<div className="last-sync"><i />Source · {result?.source ?? "unavailable"}</div>} />
      <div className="table-scroll"><table><thead><tr><th>Source IP</th><th>Detected At</th><th>Duration</th><th>Address-List</th><th>Status</th><th>Action</th></tr></thead><tbody>{rows.map((row) => <tr key={row.ip}><td><b className="mono">{row.ip}</b></td><td className="muted">{formatTimestamp(row.detectedAt)}</td><td><span className="duration"><Clock3 size={14} />{row.duration}</span></td><td className="mono muted">{row.addressList}</td><td><Badge tone="success" dot>{row.status}</Badge></td><td><div className="table-actions"><button className="text-button" onClick={() => setSelectedIp(row.ip)}><Eye size={15} />Details</button><button className="text-button danger" onClick={() => setReleaseIp(row.ip)}><Unlock size={15} />Release IP</button></div></td></tr>)}</tbody></table></div>
      {rows.length === 0 && !loading && <div className="empty-state"><CheckCircle2 size={28} /><strong>No addresses remain in this list</strong></div>}
    </Card>
    {releaseIp && <Modal title="Release source IP?" confirmText="Update preview" tone="danger" onCancel={() => setReleaseIp(null)} onConfirm={() => { setReleasedIps((current) => [...current, releaseIp]); setReleaseIp(null); }}><p>You are about to remove <b className="mono">{releaseIp}</b> from the local preview. In production, this action must wait for backend confirmation before showing success.</p><div className="modal-warning">No RouterOS request will be sent from this client preview.</div></Modal>}
    {selectedIp && <Modal title="Address-List entry" confirmText="Close details" onCancel={() => setSelectedIp(null)} onConfirm={() => setSelectedIp(null)}><div className="detail-grid"><div><span>Source IP</span><b className="mono">{selectedIp}</b></div><div><span>Address-List</span><b className="mono">reconshield-tarpit-active</b></div><div><span>Mitigation</span><Badge tone="purple">Dynamic Tarpit</Badge></div><div><span>Source</span><b>{result?.source ?? "unavailable"}</b></div></div></Modal>}
  </div>;
}
