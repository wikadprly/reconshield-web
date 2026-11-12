"use client";

import { Activity, ArrowRight, Cpu, Download, Eye, Pencil, Server, Shield, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Modal } from "@/components/modal";
import { Badge, Button, Card, CardHeader, DataStateNotice, MockNotice } from "@/components/ui";
import { formatTimestamp } from "@/lib/format";
import { ALLOWED_DURATIONS } from "@/lib/policy-options";
import { labelMitigationMode, labelStatus } from "@/lib/labels";
import { useApiResult } from "@/lib/use-api-result";
import type { AuditEntry, MitigationMode, MitigationPolicy, ServiceStatus } from "@/types/security";

interface PolicyDraft {
  mode: MitigationMode;
  confidenceThreshold: string;
  durationMinutes: string;
  maxDurationMinutes: string;
  maxActiveEntries: string;
  addressList: string;
}

function toDraft(policy: MitigationPolicy): PolicyDraft {
  return {
    mode: policy.mode,
    confidenceThreshold: String(policy.confidenceThreshold),
    durationMinutes: String(policy.durationMinutes),
    maxDurationMinutes: String(policy.maxDurationMinutes),
    maxActiveEntries: String(policy.maxActiveEntries),
    addressList: policy.addressList,
  };
}

export default function SettingsView() {
  const auditResult = useApiResult<AuditEntry[]>("/api/audit?limit=50");
  const serviceResult = useApiResult<ServiceStatus[]>("/api/services");
  const policyResult = useApiResult<MitigationPolicy>("/api/settings");
  const services = serviceResult.result?.data ?? [];
  const policy = policyResult.result?.data;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PolicyDraft | null>(null);
  const [reason, setReason] = useState("");
  const [pendingSave, setPendingSave] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (policy && !editing && !saving) setDraft(toDraft(policy));
  }, [policy, editing, saving]);

  const mode = policy?.mode ?? "Automatic";
  const dirty = Boolean(policy && draft && JSON.stringify(draft) !== JSON.stringify(toDraft(policy)));

  function startEditing() {
    if (!policy) return;
    setDraft(toDraft(policy));
    setPendingSave(false);
    setReason("");
    setSaveError(null);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setPendingSave(false);
    setReason("");
    setSaveError(null);
  }

  function requestSave() {
    if (!draft) return;
    setPendingSave(true);
  }

  async function save() {
    if (!draft || !policy) return;
    setSaving(true);
    setSaveError(null);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: draft.mode,
          confidenceThreshold: Number(draft.confidenceThreshold),
          durationMinutes: Number(draft.durationMinutes),
          maxDurationMinutes: Number(draft.maxDurationMinutes),
          maxActiveEntries: Number(draft.maxActiveEntries),
          addressList: draft.addressList.trim(),
          reason: reason.trim() || undefined,
        }),
      });
      const body = (await response.json()) as { data?: MitigationPolicy; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Gagal menyimpan kebijakan.");
      setEditing(false);
      setPendingSave(false);
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
          <button className={`mode-option ${mode === "Automatic" ? "selected" : ""}`} disabled={!editing || !draft} onClick={() => draft && setDraft({ ...draft, mode: "Automatic" })}><span className="radio">{mode === "Automatic" && <i />}</span><div><span className="mode-name"><Activity size={18} />OTOMATIS</span><p>Backend menerapkan Dynamic Tarpit setelah deteksi yang memenuhi syarat dan pemeriksaan kebijakan.</p><small>Direkomendasikan untuk perlindungan berkelanjutan</small></div>{mode === "Automatic" && <Badge tone="info">Dipilih</Badge>}</button>
          <button className={`mode-option ${mode === "Manual" ? "selected manual" : ""}`} disabled={!editing || !draft} onClick={() => draft && setDraft({ ...draft, mode: "Manual" })}><span className="radio">{mode === "Manual" && <i />}</span><div><span className="mode-name"><Eye size={18} />MANUAL</span><p>Persetujuan administrator diperlukan sebelum backend menerapkan mitigasi.</p><small>Memberikan kendali penuh kepada administrator</small></div>{mode === "Manual" && <Badge tone="warning">Dipilih</Badge>}</button>
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
          <CardHeader
            title="Kebijakan Keamanan"
            subtitle="Batas aman untuk router 32 MB / 1 core"
            action={editing
              ? <div className="policy-actions"><Button variant="secondary" onClick={cancelEditing} disabled={saving}><X size={14} />Batal</Button><Button onClick={requestSave} disabled={saving || !dirty}>{saving ? "Menyimpan..." : "Simpan"}</Button></div>
              : <Button variant="secondary" onClick={startEditing} disabled={!policy}><Pencil size={14} />Ubah</Button>}
          />
          {draft && <div className="policy-form">
            <label className="field"><span>Ambang keyakinan (%) — 60 sampai 99</span>
              <input type="number" min={60} max={99} step={1} value={draft.confidenceThreshold} disabled={!editing} onChange={(event) => setDraft({ ...draft, confidenceThreshold: event.target.value })} />
            </label>
            <label className="field"><span>Durasi tarpit per deteksi</span>
              <select value={draft.durationMinutes} disabled={!editing} onChange={(event) => setDraft({ ...draft, durationMinutes: event.target.value })}>
                {ALLOWED_DURATIONS.map((minutes) => <option key={minutes} value={String(minutes)}>{minutes < 60 ? `${minutes} menit` : `${minutes / 60} jam`}</option>)}
              </select>
            </label>
            <label className="field"><span>Durasi maksimum (menit) — maksimal 720</span>
              <input type="number" min={15} max={720} step={15} value={draft.maxDurationMinutes} disabled={!editing} onChange={(event) => setDraft({ ...draft, maxDurationMinutes: event.target.value })} />
            </label>
            <label className="field"><span>Maksimum entry tarpit aktif — 10 sampai 100</span>
              <input type="number" min={10} max={100} step={1} value={draft.maxActiveEntries} disabled={!editing} onChange={(event) => setDraft({ ...draft, maxActiveEntries: event.target.value })} />
            </label>
            <label className="field"><span>Address-list RouterOS</span>
              <input value={draft.addressList} disabled={!editing} maxLength={64} onChange={(event) => setDraft({ ...draft, addressList: event.target.value })} />
            </label>
            {policy?.updatedBy && <small className="policy-meta">Terakhir diubah oleh {policy.updatedBy}{policy.updatedAt ? ` · ${formatTimestamp(policy.updatedAt)}` : ""}</small>}
          </div>}
          {!draft && !policyResult.loading && <div className="empty-table">Kebijakan belum tersedia.</div>}
        </Card>
      </div>
    </div>
    <Card>
      <CardHeader title="Log Audit Konfigurasi" subtitle="Catatan perubahan kebijakan (hanya baca)" action={<Button variant="secondary" onClick={exportAudit}><Download size={15} />Ekspor log</Button>} />
      <div className="table-scroll"><table><thead><tr><th>Waktu</th><th>Administrator</th><th>Pengaturan Sebelumnya</th><th>Pengaturan Baru</th><th>Alasan</th></tr></thead><tbody>{audit.map((entry) => <tr key={entry.id}><td className="muted">{formatTimestamp(entry.timestamp)}</td><td><div className="admin-cell"><span>{entry.administrator.slice(0, 2).toUpperCase()}</span><b>{entry.administrator}</b></div></td><td><Badge tone={entry.previousMode === "Automatic" ? "info" : "warning"}>{labelMitigationMode(entry.previousMode)}</Badge></td><td><Badge tone={entry.newMode === "Automatic" ? "info" : "warning"}>{labelMitigationMode(entry.newMode)}</Badge></td><td className="muted">{entry.reason ?? "—"}</td></tr>)}</tbody></table></div>
      {audit.length === 0 && !auditResult.loading && <div className="empty-table">Sumber aktif tidak mencatat perubahan kebijakan.</div>}
    </Card>
    {pendingSave && draft && policy && <Modal title="Simpan perubahan kebijakan?" confirmText={saving ? "Menyimpan..." : "Simpan perubahan"} onCancel={() => { if (!saving) { setPendingSave(false); setReason(""); } }} onConfirm={saving ? () => {} : save}>
      <p>Mode <b>{labelMitigationMode(policy.mode)}</b> menjadi <b>{labelMitigationMode(draft.mode)}</b>. Perubahan berlaku untuk deteksi baru; entry tarpit yang sudah aktif tetap memakai durasi saat dibuat.</p>
      <div className="detail-grid">
        <div><span>Ambang keyakinan</span><b>{draft.confidenceThreshold}%</b></div>
        <div><span>Durasi tarpit</span><b>{Number(draft.durationMinutes) < 60 ? `${draft.durationMinutes} menit` : `${Number(draft.durationMinutes) / 60} jam`}</b></div>
        <div><span>Durasi maksimum</span><b>{draft.maxDurationMinutes} menit</b></div>
        <div><span>Maks. entry aktif</span><b>{draft.maxActiveEntries}</b></div>
      </div>
      <label className="field"><span>Alasan perubahan (opsional)</span><input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={200} placeholder="Contoh: penyesuaian saat pengujian lab" /></label>
      {saveError && <p className="form-error">{saveError}</p>}
      <div className="modal-info"><Shield size={17} />Kebijakan disimpan ke database dan dicatat pada log audit. Tidak ada perubahan pada router.</div>
    </Modal>}
  </div>;
}
