"use client";

import { CheckCircle2, Clock3, Database, Eye, LockKeyhole, Shield, Unlock } from "lucide-react";
import { useMemo, useState } from "react";
import { Modal } from "@/components/modal";
import { Badge, Card, CardHeader, DataStateNotice, MetricCard, MockNotice } from "@/components/ui";
import { formatTimestamp } from "@/lib/format";
import { labelSource, labelStatus } from "@/lib/labels";
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
      <MetricCard title="IP Tarpit Aktif" value={`${rows.length}`} detail="Saat ini berada di daftar mitigasi" icon={<LockKeyhole size={20} />} tone="purple" />
      <MetricCard title="Status Address-List" value="Tersinkronisasi" detail="Address-List reconshield-tarpit-active" icon={<Database size={20} />} tone="cyan" badge={<Badge tone="success" dot>{labelSource(result?.source)}</Badge>} />
      <MetricCard title="Durasi Tarpit Default" value="24 jam" detail="Jendela mitigasi terkonfigurasi" icon={<Clock3 size={20} />} />
    </div>
    <div className="explain-banner"><div className="banner-icon"><Shield size={20} /></div><div><strong>Mitigasi Dynamic Tarpit</strong><p>Di produksi, alamat yang diklasifikasikan sebagai sumber reconnaissance dikirim ke backend, yang memegang kredensial RouterOS dan mengonfirmasi perubahan Address-List. Melepas IP di sini hanya memperbarui status antarmuka lokal sampai jalur penulisan diimplementasikan.</p></div></div>
    <Card>
      <CardHeader title="Address-List Mitigasi Aktif" subtitle="Dibaca dari sumber data terkonfigurasi" action={<div className="last-sync"><i />Sumber · {labelSource(result?.source)}</div>} />
      <div className="table-scroll"><table><thead><tr><th>IP Sumber</th><th>Terdeteksi Pada</th><th>Durasi</th><th>Address-List</th><th>Status</th><th>Tindakan</th></tr></thead><tbody>{rows.map((row) => <tr key={row.ip}><td><b className="mono">{row.ip}</b></td><td className="muted">{formatTimestamp(row.detectedAt)}</td><td><span className="duration"><Clock3 size={14} />{row.duration}</span></td><td className="mono muted">{row.addressList}</td><td><Badge tone="success" dot>{labelStatus(row.status)}</Badge></td><td><div className="table-actions"><button className="text-button" onClick={() => setSelectedIp(row.ip)}><Eye size={15} />Detail</button><button className="text-button danger" onClick={() => setReleaseIp(row.ip)}><Unlock size={15} />Lepas IP</button></div></td></tr>)}</tbody></table></div>
      {rows.length === 0 && !loading && <div className="empty-state"><CheckCircle2 size={28} /><strong>Tidak ada alamat tersisa di daftar ini</strong></div>}
    </Card>
    {releaseIp && <Modal title="Lepas IP sumber?" confirmText="Perbarui pratinjau" tone="danger" onCancel={() => setReleaseIp(null)} onConfirm={() => { setReleasedIps((current) => [...current, releaseIp]); setReleaseIp(null); }}><p>Anda akan menghapus <b className="mono">{releaseIp}</b> dari pratinjau lokal. Di produksi, tindakan ini harus menunggu konfirmasi backend sebelum menampilkan keberhasilan.</p><div className="modal-warning">Tidak ada permintaan RouterOS yang dikirim dari pratinjau klien ini.</div></Modal>}
    {selectedIp && <Modal title="Entri Address-List" confirmText="Tutup detail" onCancel={() => setSelectedIp(null)} onConfirm={() => setSelectedIp(null)}><div className="detail-grid"><div><span>IP Sumber</span><b className="mono">{selectedIp}</b></div><div><span>Address-List</span><b className="mono">reconshield-tarpit-active</b></div><div><span>Mitigasi</span><Badge tone="purple">Dynamic Tarpit</Badge></div><div><span>Sumber</span><b>{labelSource(result?.source)}</b></div></div></Modal>}
  </div>;
}
