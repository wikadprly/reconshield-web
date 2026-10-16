import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { DataSource } from "@/types/security";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="card-header"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}

export function Badge({ children, tone = "neutral", dot = false }: { children: ReactNode; tone?: "success" | "danger" | "warning" | "info" | "purple" | "neutral"; dot?: boolean }) {
  return <span className={`badge badge-${tone}`}>{dot && <i />}{children}</span>;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
};

export function Button({ children, variant = "primary", className = "", ...props }: ButtonProps) {
  return <button className={`btn btn-${variant} ${className}`} {...props}>{children}</button>;
}

export function MetricCard({ title, value, detail, icon, tone = "blue", badge }: { title: string; value: string; detail: string; icon: ReactNode; tone?: string; badge?: ReactNode }) {
  return <Card className="metric-card"><div className={`metric-icon tone-${tone}`}>{icon}</div><div className="metric-copy"><span className="metric-label">{title}</span><strong>{value}</strong><small>{detail}</small></div>{badge && <div className="metric-badge">{badge}</div>}</Card>;
}

/**
 * Provenance banner. Without a `source` it renders the default preview notice;
 * once views fetch through the API layer they pass the ApiResult.source so the
 * label always matches where the data actually came from.
 */
export function MockNotice({ source }: { source?: DataSource }) {
  if (source === "database") {
    return <div className="mock-notice live"><span>LIVE DATABASE</span> Values on this screen were read from the configured PostgreSQL database.</div>;
  }
  if (source === "remote") {
    return <div className="mock-notice remote"><span>REMOTE SERVICE</span> Values on this screen were read from the configured Python ML service.</div>;
  }
  return <div className="mock-notice"><span>PREVIEW DATA</span> Values and service states on this screen are illustrative and are not live network telemetry.</div>;
}

/** Inline loading / error banner used by the data-fetching client views. */
export function DataStateNotice({ loading, error }: { loading: boolean; error: string | null }) {
  if (error) return <div className="data-state error">Unable to load data from the backend: {error}</div>;
  if (loading) return <div className="data-state loading">Loading data from the backend…</div>;
  return null;
}
