import type { ButtonHTMLAttributes, ReactNode } from "react";

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

export function MockNotice() {
  return <div className="mock-notice"><span>PREVIEW DATA</span> Values and service states on this screen are illustrative and are not live network telemetry.</div>;
}
