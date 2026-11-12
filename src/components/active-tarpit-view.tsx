"use client";

import { CheckCircle2, Clock3, Database, Eye, LockKeyhole, Shield, ShieldCheck, Unlock } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/modal";
import { Badge, Card, CardHeader, DataStateNotice, MetricCard, MockNotice } from "@/components/ui";
import { formatTimestamp } from "@/lib/format";
import { labelSource, labelStatus } from "@/lib/labels";
import { useApiResult } from "@/lib/use-api-result";
import type { TarpitEntry } from "@/types/security";

type ActionState = { ip: string; kind: "release" | "verify"; message: string; ok: boolean } | null;

export default function ActiveTarpitView() {
  const { result, loading, error, refresh } = useApiResult<TarpitEntry[]>("/api/tarpit");
  const entries = result?.data ?? [];
  const [releaseIp, setReleaseIp] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState<TarpitEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<ActionState>(null);

  const rows = entries;

  async function release() {
    if (!releaseIp) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/tarpit/${encodeURIComponent(releaseIp)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Gagal melepas IP.");
      setFeedback({ ip: releaseIp, kind: "release", message: "Status database diperbarui menjadi Released. Penghapusan dari address-list RouterOS menunggu write path (A4).", ok: true });
      setReleaseIp(null);
      setReason("");
      refresh();
    } catch (error) {
      setFeedback({ ip: releaseIp, kind: "release", message: error instanceof Error ? error.message : "Gagal melepas IP.", ok: false });
    } finally {
      setBusy(false);
    }
  }

  async function verify(ip: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/tarpit/${encodeURIComponent(ip)}`, { method: "POST" });
      const body = (await response.json()) as { data?: { present: boolean | null; detail: string }; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Gagal memverifikasi IP.");
      setFeedback({ ip, kind: "verify", message: body.data?.detail ?? "Verifikasi selesai.", ok: body.data?.present !== false });
      refresh();
    } catch (error) {
      setFeedback({ ip, kind: "verify", message: error instanceof Error ? error.message : "Gagal memverifikasi IP.", ok: false });
    } finally {
      setBusy(false);
    }
  }

  return <div className="page-stack">
    <MockNotice source={result?.source} />
    <DataStateNotice loading={loading} error={error} />
    <div className="metrics-grid three">
      <MetricCard title="IP Tarpit Aktif" value={`${rows.length}`} detail="Saat ini berada di daftar mitigasi" icon={<LockKeyhole size={20} />} tone="purple" />
      <MetricCard title="Status Address-List" value={rows.some((row) => row.status === "Verified") ? "Terverifikasi" : "Belum diverifikasi"} detail="Address-List reconshield-tarpit-active" icon={<Database size={20} />} tone="cyan" badge={<Badge tone="success" dot>{labelSource(result?.source)}</Badge>} />
      <MetricCard title="Durasi Tarpit Default" value={`${rows[0]?.durationMinutes ?? 60} menit`} detail="Batas aman: maksimum 6 jam" icon={<Clock3 size={20} />} />
    </div>
    <div className="explain-banner"><div className="banner-icon"><Shield size={20} /></div><div><strong>Mitigasi Dynamic Tarpit</strong><p>Lepas IP memperbarui status database dan menulis log audit. Verifikasi membaca address-list RouterOS (read-only) dan mencatat hasilnya. Penghapusan/penambahan aturan router baru aktif setelah write path (A4) diimplementasikan.</p></div></div>
    {feedback && <div className={`data-state ${feedback.ok ? "loading" : "error"}`}>[{feedback.kind === "release" ? "Lepas" : "Verifikasi"} {feedback.ip}] {feedback.message}</div>}
    <Card>
      <CardHeader title="Address-List Mitigasi Aktif" subtitle="Dibaca dari sumber data terkonfigurasi" action={<div className="last-sync"><i />Sumber · {labelSource(result?.source)}</div>} />
      <div className="table-scroll"><table><thead><tr><th>IP Sumber</th><th>Terdeteksi Pada</th><th>Durasi</th><th>Kedaluwarsa</th><th>Address-List</th><th>Status</th><th>Tindakan</th></tr></thead><tbody>{rows.map((row) => <tr key={row.ip}><td><b className="mono">{row.ip}</b></td><td className="muted">{formatTimestamp(row.detectedAt)}</td><td><span className="duration"><Clock3 size={14} />{row.duration}</span></td><td className="muted">{row.expiresAt ? formatTimestamp(row.expiresAt) : "—"}</td><td className="mono muted">{row.addressList}</td><td><Badge tone={row.status === "Verified" ? "success" : "warning"} dot>{labelStatus(row.status)}</Badge></td><td><div className="table-actions"><button className="text-button" onClick={() => setSelected(row)}><Eye size={15} />Detail</button><button className="text-button" disabled={busy} onClick={() => verify(row.ip)}><ShieldCheck size={15} />Verifikasi</button><button className="text-button danger" disabled={busy} onClick={() => setReleaseIp(row.ip)}><Unlock size={15} />Lepas IP</button></div></td></tr>)}</tbody></table></div>
      {rows.length === 0 && !loading && <div className="empty-state"><CheckCircle2 size={28} /><strong>Tidak ada alamat tersisa di daftar ini</strong></div>}
    </Card>
    {releaseIp && <Modal title="Lepas IP sumber?" confirmText={busy ? "Memproses..." : "Lepas IP"} tone="danger" onCancel={() => { if (!busy) { setReleaseIp(null); setReason(""); } }} onConfirm={busy ? () => {} : release}>
      <p>Anda akan melepas <b className="mono">{releaseIp}</b> dari daftar tarpit. Status database berubah menjadi Released dan dicatat pada log audit.</p>
      <label className="field"><span>Alasan (opsional)</span><input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={200} placeholder="Contoh: false positive" /></label>
      <div className="modal-warning">Penghapusan dari address-list RouterOS belum dijalankan pada fase ini (A4).</div>
    </Modal>}
    {selected && <Modal title="Entri Address-List" confirmText="Tutup detail" onCancel={() => setSelected(null)} onConfirm={() => setSelected(null)}><div className="detail-grid"><div><span>IP Sumber</span><b className="mono">{selected.ip}</b></div><div><span>Address-List</span><b className="mono">{selected.addressList}</b></div><div><span>Status</span><Badge tone={selected.status === "Verified" ? "success" : "warning"} dot>{labelStatus(selected.status)}</Badge></div><div><span>Durasi</span><b>{selected.duration}</b></div><div><span>Kedaluwarsa</span><b>{selected.expiresAt ? formatTimestamp(selected.expiresAt) : "—"}</b></div><div><span>Diverifikasi</span><b>{selected.verifiedAt ? formatTimestamp(selected.verifiedAt) : "Belum"}</b></div><div><span>Insiden</span><b className="mono">{selected.detectionId ?? "—"}</b></div><div><span>Sumber</span><b>{labelSource(result?.source)}</b></div></div></Modal>}
  </div>;
}
