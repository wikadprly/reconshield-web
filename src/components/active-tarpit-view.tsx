"use client";

import { CheckCircle2, Clock3, Database, Eye, LockKeyhole, Shield, Unlock } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/modal";
import { Badge, Card, CardHeader, MetricCard, MockNotice } from "@/components/ui";
import { tarpitEntries } from "@/data/mock-security";

export default function ActiveTarpitView() {
  const [rows, setRows] = useState(tarpitEntries);
  const [releaseIp, setReleaseIp] = useState<string | null>(null);
  const [selectedIp, setSelectedIp] = useState<string | null>(null);

  return <div className="page-stack">
    <MockNotice />
    <div className="metrics-grid three"><MetricCard title="Active Tarpitted IPs" value={`${rows.length}`} detail="Currently shown in preview" icon={<LockKeyhole size={20} />} tone="purple" /><MetricCard title="Address-List Status" value="Synchronized" detail="Mock status: reconshield-tarpit-active" icon={<Database size={20} />} tone="cyan" badge={<Badge tone="success" dot>Preview</Badge>} /><MetricCard title="Default Tarpit Duration" value="24 hours" detail="Configured mitigation window" icon={<Clock3 size={20} />} /></div>
    <div className="explain-banner"><div className="banner-icon"><Shield size={20} /></div><div><strong>Dynamic Tarpit mitigation</strong><p>In production, addresses classified as reconnaissance sources are submitted to the backend, which owns the RouterOS credentials and confirms Address-List changes. This preview only updates local interface state.</p></div></div>
    <Card><CardHeader title="Active Mitigation Address-List" subtitle="Preview of the data contract expected from the backend" action={<div className="last-sync"><i />Sample snapshot · 21:50 WIB</div>} /><div className="table-scroll"><table><thead><tr><th>Source IP</th><th>Detected At</th><th>Duration</th><th>Address-List</th><th>Status</th><th>Action</th></tr></thead><tbody>{rows.map((row) => <tr key={row.ip}><td><b className="mono">{row.ip}</b></td><td className="muted">{row.detectedAt}</td><td><span className="duration"><Clock3 size={14} />{row.duration}</span></td><td className="mono muted">{row.addressList}</td><td><Badge tone="success" dot>{row.status}</Badge></td><td><div className="table-actions"><button className="text-button" onClick={() => setSelectedIp(row.ip)}><Eye size={15} />Details</button><button className="text-button danger" onClick={() => setReleaseIp(row.ip)}><Unlock size={15} />Release IP</button></div></td></tr>)}</tbody></table></div>{rows.length === 0 && <div className="empty-state"><CheckCircle2 size={28} /><strong>No addresses remain in this preview list</strong></div>}</Card>
    {releaseIp && <Modal title="Release source IP?" confirmText="Update preview" tone="danger" onCancel={() => setReleaseIp(null)} onConfirm={() => { setRows(rows.filter((row) => row.ip !== releaseIp)); setReleaseIp(null); }}><p>You are about to remove <b className="mono">{releaseIp}</b> from the local preview. In production, this action must wait for backend confirmation before showing success.</p><div className="modal-warning">No RouterOS request will be sent from this client preview.</div></Modal>}
    {selectedIp && <Modal title="Address-List entry" confirmText="Close details" onCancel={() => setSelectedIp(null)} onConfirm={() => setSelectedIp(null)}><div className="detail-grid"><div><span>Source IP</span><b className="mono">{selectedIp}</b></div><div><span>Address-List</span><b className="mono">reconshield-tarpit-active</b></div><div><span>Mitigation</span><Badge tone="purple">Dynamic Tarpit</Badge></div><div><span>Source</span><b>Mock dataset</b></div></div></Modal>}
  </div>;
}
