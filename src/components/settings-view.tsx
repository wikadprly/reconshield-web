"use client";

import { Activity, ArrowRight, Cpu, Download, Eye, Server, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { Modal } from "@/components/modal";
import { Badge, Button, Card, CardHeader, DataStateNotice, MockNotice } from "@/components/ui";
import { formatTimestamp } from "@/lib/format";
import { labelMitigationMode, labelStatus } from "@/lib/labels";
import { useApiResult } from "@/lib/use-api-result";
import type { AuditEntry, MitigationMode, MitigationPolicy, ServiceStatus } from "@/types/security";

export default function SettingsView() {
  const auditResult = useApiResult<AuditEntry[]>("/api/audit?limit=50");
  const serviceResult = useApiResult<ServiceStatus[]>("/api/services");
  const policyResult = useApiResult<MitigationPolicy>("/api/settings");
  const services = serviceResult.result?.data ?? [];
  const policy = policyResult.result?.data;

  const [mode, setMode] = useState<MitigationMode>("Automatic");
  const [pending, setPending] = useState<MitigationMode | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (policy) setMode(policy.mode);
  }, [policy]);

  async function changeMode() {
    if (!pending || !policy) return;
    setSaving(true);
    setSaveError(null);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...policy, mode: pending, reason: reason.trim() || undefined }),
      });
      const body = (await response.json()) as { data?: MitigationPolicy; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Gagal menyimpan kebijakan.");
      setMode(pending);
      setPending(null);
      setReason("");
      policyResult.refresh();
      auditResult.refresh();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Gagal menyimpan kebijakan.");
    } finally {
      setSaving(false);
    }
  }

  function exportAudit() {
    const rows = audit.map((item) => `${item.timestamp},${item.administrator},${labelMitigationMode(item.previousMode)},${labelMitigationMode(item.newMode)}`);
    const url = URL.createObjectURL(new Blob([["waktu,administrator,mode_sebelumnya,mode_baru", ...rows].join("\n")], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "reconshield-log-audit.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const audit = auditResult.result?.data ?? [];
  const saving3 = saving ? "Menyimpan..." : undefined;

  return <div className="page-stack">
    <MockNotice source={auditResult.result?.source ?? serviceResult.result?.source} />
    <DataStateNotice
      loading={auditResult.loading || serviceResult.loading || policyResult.loading}
      error={auditResult.error ?? serviceResult.error ?? policyResult.error}
    />
    <div className="settings-grid">
      <Card className="mode-card">
        <CardHeader title="Mode Mitigasi" subtitle="Kendalikan penanganan reconnaissance yang terdeteksi" />
        <div className="mode-current"><span>Mode saat ini</span><Badge tone={mode === "Automatic" ? "info" : "warning"} dot>{labelMitigationMode(mode).toUpperCase()}</Badge></div>
        <div className="mode-options">
          <button className={`mode-option ${mode === "Automatic" ? "selected" : ""}`} onClick={() => mode !== "Automatic" && setPending("Automatic")}><span className="radio">{mode === "Automatic" && <i />}</span><div><span className="mode-name"><Activity size={18} />OTOMATIS</span><p>Backend menerapkan Dynamic Tarpit setelah deteksi yang memenuhi syarat dan pemeriksaan kebijakan.</p><small>Direkomendasikan untuk perlindungan berkelanjutan</small></div>{mode === "Automatic" && <Badge tone="info">Dipilih</Badge>}</button>
          <button className={`mode-option ${mode === "Manual" ? "selected manual" : ""}`} onClick={() => mode !== "Manual" && setPending("Manual")}><span className="radio">{mode === "Manual" && <i />}</span><div><span className="mode-name"><Eye size={18} />MANUAL</span><p>Persetujuan administrator diperlukan sebelum backend menerapkan mitigasi.</p><small>Memberikan kendali penuh kepada administrator</small></div>{mode === "Manual" && <Badge tone="warning">Dipilih</Badge>}</button>
        </div>
        <div className="responsibility"><div><span className="step-number">1</span><p><b>Random Forest</b><small>Mendeteksi &amp; mengklasifikasi</small></p></div><ArrowRight size={16} /><div><span className="step-number">2</span><p><b>Kebijakan admin</b><small>{mode === "Automatic" ? "Persetujuan otomatis" : "Persetujuan manual"}</small></p></div><ArrowRight size={16} /><div><span className="step-number">3</span><p><b>Backend + RouterOS</b><small>Melakukan mitigasi</small></p></div></div>
      </Card>
      <div className="connection-stack">
        <Card>
          <CardHeader title="Koneksi Sistem" />
          {services.map((service, index) => <div className="connection" key={service.name}><div className={`metric-icon ${index === 0 ? "tone-blue" : "tone-purple"}`}>{index === 0 ? <Server size={18} /> : <Cpu size={18} />}</div><div><b>{service.name}</b><span>{service.detail}</span></div><Badge tone={service.status === "Online" ? "success" : "danger"} dot>{labelStatus(service.status)}</Badge></div>)}
          {services.length === 0 && !serviceResult.loading && <div className="empty-table">Sumber aktif tidak melaporkan layanan.</div>}
        </Card>
        <Card>
          <CardHeader title="Kebijakan Keamanan" subtitle="Nilai dari database (read-only di layar ini)" />
          <div className="policy-row"><span>Ambang keyakinan</span><b>{policy ? `${policy.confidenceThreshold}%` : "—"}</b></div>
          <div className="policy-row"><span>Durasi tarpit</span><b>{policy ? `${policy.durationMinutes} menit` : "—"}</b></div>
          <div className="policy-row"><span>Durasi maksimum</span><b>{policy ? `${policy.maxDurationMinutes / 60} jam` : "—"}</b></div>
          <div className="policy-row"><span>Maksimum entry aktif</span><b>{policy?.maxActiveEntries ?? "—"}</b></div>
          <div className="policy-row"><span>Address-List</span><b className="mono">{policy?.addressList ?? "—"}</b></div>
        </Card>
      </div>
    </div>
    <Card>
      <CardHeader title="Log Audit Konfigurasi" subtitle="Catatan perubahan kebijakan (hanya baca)" action={<Button variant="secondary" onClick={exportAudit}><Download size={15} />Ekspor log</Button>} />
      <div className="table-scroll"><table><thead><tr><th>Waktu</th><th>Administrator</th><th>Pengaturan Sebelumnya</th><th>Pengaturan Baru</th><th>Perubahan</th></tr></thead><tbody>{audit.map((entry) => <tr key={entry.id}><td className="muted">{formatTimestamp(entry.timestamp)}</td><td><div className="admin-cell"><span>{entry.administrator.slice(0, 2).toUpperCase()}</span><b>{entry.administrator}</b></div></td><td><Badge tone={entry.previousMode === "Automatic" ? "info" : "warning"}>{labelMitigationMode(entry.previousMode)}</Badge></td><td><Badge tone={entry.newMode === "Automatic" ? "info" : "warning"}>{labelMitigationMode(entry.newMode)}</Badge></td><td><span className="change-arrow">{labelMitigationMode(entry.previousMode)} <span>→</span> {labelMitigationMode(entry.newMode)}</span></td></tr>)}</tbody></table></div>
      {audit.length === 0 && !auditResult.loading && <div className="empty-table">Sumber aktif tidak mencatat perubahan kebijakan.</div>}
    </Card>
    {pending && <Modal title={`Ubah ke mode ${labelMitigationMode(pending)}?`} confirmText={saving3 ?? "Simpan perubahan"} onCancel={() => { setPending(null); setReason(""); }} onConfirm={saving ? () => {} : changeMode}>
      <p>{pending === "Automatic" ? "Deteksi yang memenuhi syarat akan dapat dimitigasi otomatis oleh backend setelah validasi kebijakan." : "Deteksi baru memerlukan persetujuan administrator sebelum backend dapat meminta mitigasi."}</p>
      <label className="field"><span>Alasan perubahan (opsional)</span><input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={200} placeholder="Contoh: sidang butuh mode manual" /></label>
      {saveError && <p className="form-error">{saveError}</p>}
      <div className="modal-info"><Shield size={17} />Mode disimpan ke database dan dicatat pada log audit. Tidak ada perubahan pada router.</div>
    </Modal>}
  </div>;
}
