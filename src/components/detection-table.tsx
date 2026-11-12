import { Eye } from "lucide-react";
import type { Detection } from "@/types/security";
import { formatTimestamp } from "@/lib/format";
import { labelAction, labelClassification, labelStatus } from "@/lib/labels";
import { Badge } from "@/components/ui";

export default function DetectionTable({ rows, compact = false, onSelect }: { rows: Detection[]; compact?: boolean; onSelect?: (row: Detection) => void }) {
  return <div className="table-scroll"><table><thead><tr><th>Waktu</th><th>IP Sumber</th>{!compact && <th>Port Sumber</th>}<th>Tujuan</th><th>Klasifikasi</th><th>Keyakinan</th><th>Tindakan</th><th>Status</th>{!compact && <th><span className="sr-only">Aksi</span></th>}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td className="muted">{formatTimestamp(row.timestamp)}</td><td><b className="mono">{row.sourceIp}</b></td>{!compact && <td className="mono muted">{row.sourcePort}</td>}<td className="mono">{row.destinationIp}:{row.destinationPort}</td><td><Badge tone={row.classification === "Reconnaissance" ? "danger" : "success"}>{labelClassification(row.classification)}</Badge></td><td><b>{row.confidence.toFixed(1)}%</b></td><td><Badge tone={row.action === "TARPIT" ? "purple" : row.action === "Pending" ? "warning" : "neutral"}>{labelAction(row.action)}</Badge></td><td><Badge tone={row.status === "Active" ? "success" : row.status === "Review" ? "warning" : "neutral"} dot>{labelStatus(row.status)}</Badge></td>{!compact && <td><button className="icon-button" title="Lihat detail insiden" onClick={() => onSelect?.(row)}><Eye size={17} /></button></td>}</tr>)}</tbody></table>{rows.length === 0 && <div className="empty-table">Tidak ada insiden yang cocok dengan filter terpilih.</div>}</div>;
}
