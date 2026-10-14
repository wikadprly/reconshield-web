"use client";

import { AlertTriangle, Settings, X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui";

export function Modal({ title, children, confirmText, tone = "primary", onCancel, onConfirm }: { title: string; children: ReactNode; confirmText: string; tone?: "primary" | "danger"; onCancel: () => void; onConfirm: () => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div className={`modal-icon ${tone}`}>{tone === "danger" ? <AlertTriangle size={20} /> : <Settings size={20} />}</div><button className="icon-button" onClick={onCancel} aria-label="Close dialog"><X size={18} /></button></div><h2 id="modal-title">{title}</h2>{children}<div className="modal-actions"><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button variant={tone} onClick={onConfirm}>{confirmText}</Button></div></div></div>;
}
