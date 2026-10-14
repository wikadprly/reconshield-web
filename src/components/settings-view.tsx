"use client";

import { Activity, ArrowRight, Cpu, Download, Eye, Server, Shield } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/modal";
import { Badge, Button, Card, CardHeader, MockNotice } from "@/components/ui";
import { auditEntries, services } from "@/data/mock-security";
import type { AuditEntry, MitigationMode } from "@/types/security";

export default function SettingsView() {
  const [mode, setMode] = useState<MitigationMode>("Automatic");
  const [pending, setPending] = useState<MitigationMode | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>(auditEntries);

  function changeMode() {
    if (!pending) return;
    setAudit([{ id: `LOCAL-${Date.now()}`, timestamp: new Date().toLocaleString("en-GB"), administrator: "admin (preview)", previousMode: mode, newMode: pending }, ...audit]);
    setMode(pending);
    setPending(null);
  }

  function exportAudit() {
    const rows = audit.map((item) => `${item.timestamp},${item.administrator},${item.previousMode},${item.newMode}`);
    const url = URL.createObjectURL(new Blob([["timestamp,administrator,previous_mode,new_mode", ...rows].join("\n")], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "reconshield-audit-log.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <div className="page-stack">
    <MockNotice />
    <div className="settings-grid"><Card className="mode-card"><CardHeader title="Mitigation Mode" subtitle="Control how detected reconnaissance should be handled" /><div className="mode-current"><span>Current preview mode</span><Badge tone={mode === "Automatic" ? "info" : "warning"} dot>{mode.toUpperCase()}</Badge></div><div className="mode-options"><button className={`mode-option ${mode === "Automatic" ? "selected" : ""}`} onClick={() => mode !== "Automatic" && setPending("Automatic")}><span className="radio">{mode === "Automatic" && <i />}</span><div><span className="mode-name"><Activity size={18} />AUTOMATIC</span><p>Backend applies Dynamic Tarpit after a qualifying detection and policy check.</p><small>Recommended for continuous protection</small></div>{mode === "Automatic" && <Badge tone="info">Selected</Badge>}</button><button className={`mode-option ${mode === "Manual" ? "selected manual" : ""}`} onClick={() => mode !== "Manual" && setPending("Manual")}><span className="radio">{mode === "Manual" && <i />}</span><div><span className="mode-name"><Eye size={18} />MANUAL</span><p>Administrator approval is required before the backend applies mitigation.</p><small>Provides full administrator control</small></div>{mode === "Manual" && <Badge tone="warning">Selected</Badge>}</button></div><div className="responsibility"><div><span className="step-number">1</span><p><b>Random Forest</b><small>Detects & classifies</small></p></div><ArrowRight size={16} /><div><span className="step-number">2</span><p><b>Admin policy</b><small>{mode === "Automatic" ? "Automatic approval" : "Manual approval"}</small></p></div><ArrowRight size={16} /><div><span className="step-number">3</span><p><b>Backend + RouterOS</b><small>Performs mitigation</small></p></div></div></Card>
      <div className="connection-stack"><Card><CardHeader title="System Connections" />{services.map((service, index) => <div className="connection" key={service.name}><div className={`metric-icon ${index === 0 ? "tone-blue" : "tone-purple"}`}>{index === 0 ? <Server size={18} /> : <Cpu size={18} />}</div><div><b>{service.name}</b><span>{service.detail}</span></div><Badge tone="success" dot>Mock {service.status}</Badge></div>)}</Card><Card><CardHeader title="Security Policy" /><div className="policy-row"><span>Confidence threshold</span><b>≥ 85%</b></div><div className="policy-row"><span>Tarpit duration</span><b>24 hours</b></div><div className="policy-row"><span>Address-List</span><b className="mono">reconshield-tarpit-active</b></div></Card></div>
    </div>
    <Card><CardHeader title="Configuration Audit Log" subtitle="Preview of the immutable policy-change record" action={<Button variant="secondary" onClick={exportAudit}><Download size={15} />Export log</Button>} /><div className="table-scroll"><table><thead><tr><th>Timestamp</th><th>Administrator</th><th>Previous Setting</th><th>New Setting</th><th>Change</th></tr></thead><tbody>{audit.map((entry) => <tr key={entry.id}><td className="muted">{entry.timestamp}</td><td><div className="admin-cell"><span>{entry.administrator.slice(0, 2).toUpperCase()}</span><b>{entry.administrator}</b></div></td><td><Badge tone={entry.previousMode === "Automatic" ? "info" : "warning"}>{entry.previousMode}</Badge></td><td><Badge tone={entry.newMode === "Automatic" ? "info" : "warning"}>{entry.newMode}</Badge></td><td><span className="change-arrow">{entry.previousMode} <span>→</span> {entry.newMode}</span></td></tr>)}</tbody></table></div></Card>
    {pending && <Modal title={`Change to ${pending} mode?`} confirmText="Update preview" onCancel={() => setPending(null)} onConfirm={changeMode}><p>{pending === "Automatic" ? "Qualifying detections will be eligible for automatic backend mitigation after policy validation." : "New detections will require administrator approval before the backend may request mitigation."}</p><div className="modal-info"><Shield size={17} />This preview updates local UI state and does not change a router or backend configuration.</div></Modal>}
  </div>;
}
