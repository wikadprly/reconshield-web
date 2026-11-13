"use client";

import { CheckCircle2, ClipboardCheck, ShieldQuestion, XCircle } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/modal";
import { Badge, Button, Card, CardHeader, DataStateNotice, MockNotice } from "@/components/ui";
import { formatTimestamp } from "@/lib/format";
import { useApiResult } from "@/lib/use-api-result";
import type { ApprovalRequest, ApprovalStatus } from "@/types/security";

const STATUS_LABEL: Record<ApprovalStatus, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
};

const STATUS_TONE: Record<ApprovalStatus, "warning" | "success" | "danger" | "neutral"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  cancelled: "neutral",
};

export default function ApprovalsView() {
  const { result, loading, error, refresh } = useApiResult<ApprovalRequest[]>("/api/approvals", { refreshMs: 10_000 });
  const approvals = result?.data ?? [];

  const [selected, setSelected] = useState<ApprovalRequest | null>(null);
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submitDecision() {
    if (!selected || !decision) return;
    setSaving(true);
    setSaveError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/approvals/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason: reason.trim() || undefined }),
      });
      const body = (await response.json()) as {
        mitigation?: { applied: boolean; detail: string } | null;
        mitigationError?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "Gagal memutuskan persetujuan.");
      if (decision === "approved") {
        setNotice(
          body.mitigation?.applied
            ? `Mitigasi dijalankan: ${body.mitigation.detail}`
            : `Persetujuan tercatat, tetapi mitigasi belum terkonfirmasi: ${body.mitigationError ?? body.mitigation?.detail ?? "menunggu write path RouterOS"}.`,
        );
      }
      setSelected(null);
      setDecision(null);
      setReason("");
      refresh();
    } catch (submitError) {
      setSaveError(submitError instanceof Error ? submitError.message : "Gagal memutuskan persetujuan.");
    } finally {
      setSaving(false);
    }
  }

  const pendingCount = approvals.filter((entry) => entry.status === "pending").length;

  return <div className="page-stack">
    <MockNotice source={result?.source} />
    <DataStateNotice loading={loading} error={error} />
    <div className="page-action-row">
      <div className="context-note">
        <ClipboardCheck size={20} />
        <div><strong>Pusat persetujuan manual</strong><span>Mode Manual mewajibkan admin menyetujui sebelum mitigasi dijalankan.</span></div>
      </div>
      <Badge tone={pendingCount > 0 ? "warning" : "success"} dot>{pendingCount} menunggu keputusan</Badge>
    </div>
    {notice && <div className="data-state loading">{notice}</div>}
    <Card>
      <CardHeader title="Permintaan Persetujuan" subtitle="Keputusan tercatat pada log audit" />
      <div className="table-scroll">
        <table>
          <thead><tr><th>Diminta</th><th>Insiden</th><th>IP Sumber</th><th>Keyakinan</th><th>Tindakan Diusulkan</th><th>Status</th><th><span className="sr-only">Aksi</span></th></tr></thead>
          <tbody>
            {approvals.map((entry) => <tr key={entry.id}>
              <td className="muted">{formatTimestamp(entry.requestedAt)}</td>
              <td className="mono">{entry.detectionId}</td>
              <td className="mono">{entry.detection?.sourceIp ?? "—"}</td>
              <td>{entry.detection ? `${entry.detection.confidence.toFixed(1)}%` : "—"}</td>
              <td><Badge tone="purple">{entry.proposedAction}</Badge></td>
              <td><Badge tone={STATUS_TONE[entry.status]} dot>{STATUS_LABEL[entry.status]}</Badge></td>
              <td>{entry.status === "pending"
                ? <div className="table-actions"><button className="text-button" onClick={() => { setSelected(entry); setDecision("approved"); setReason(""); setSaveError(null); }}><CheckCircle2 size={15} />Setujui</button><button className="text-button danger" onClick={() => { setSelected(entry); setDecision("rejected"); setReason(""); setSaveError(null); }}><XCircle size={15} />Tolak</button></div>
                : <span className="muted">{entry.reason ?? "—"}</span>}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {approvals.length === 0 && !loading && <div className="empty-table">Belum ada permintaan persetujuan.</div>}
    </Card>
    {selected && decision && <Modal
      title={decision === "approved" ? `Setujui ${selected.proposedAction} untuk ${selected.detection?.sourceIp ?? selected.detectionId}?` : `Tolak permintaan ${selected.detectionId}?`}
      confirmText={saving ? "Menyimpan..." : decision === "approved" ? "Setujui" : "Tolak"}
      tone={decision === "approved" ? "primary" : "danger"}
      onCancel={() => { if (!saving) { setSelected(null); setDecision(null); setReason(""); } }}
      onConfirm={saving ? () => {} : submitDecision}
    >
      <p>{decision === "approved"
        ? "Persetujuan dicatat lalu mitigasi dijalankan: IP ditambahkan ke address-list RouterOS (bila write path aktif) dan dicatat pada log audit."
        : "Penolakan dicatat pada log audit; tidak ada mitigasi yang dijalankan."}</p>
      <label className="field"><span>Alasan (opsional)</span><input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={200} placeholder="Contoh: false positive, IP internal" /></label>
      {saveError && <p className="form-error">{saveError}</p>}
      <div className="modal-info"><ShieldQuestion size={17} />Bila RouterOS belum dikonfigurasi, persetujuan tetap tercatat dan mitigasi dilaporkan belum terkonfirmasi.</div>
    </Modal>}
  </div>;
}
