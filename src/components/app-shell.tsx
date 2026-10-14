"use client";

import { Activity, BarChart3, Bell, CheckCheck, ChevronDown, Clock3, LayoutDashboard, LogOut, Menu, Settings, Shield, ShieldCheck, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/threat-logs", label: "Threat Logs", icon: Shield },
  { href: "/active-tarpit", label: "Active Tarpit", icon: ShieldCheck, count: 31 },
  { href: "/ml-performance", label: "ML Performance", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

const pageMeta: Record<string, [string, string]> = {
  "/dashboard": ["Network Overview", "Monitor traffic, detections, and network security posture"],
  "/threat-logs": ["Threat Logs", "Review and investigate reconnaissance incidents"],
  "/active-tarpit": ["Active Tarpit", "Manage addresses in the dynamic mitigation list"],
  "/ml-performance": ["ML Performance", "Review Random Forest research evaluation"],
  "/settings": ["System Control", "Configure mitigation policy and integration status"],
};

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const menusRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    function closeMenus(event: PointerEvent) {
      if (event.target instanceof Node && !menusRef.current?.contains(event.target)) {
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeMenus);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenus);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);
  const current = pageMeta[pathname] ?? pageMeta["/dashboard"];

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
      <div className="brand"><div className="brand-mark"><ShieldCheck size={25} /><span /></div><div><strong>ReconShield</strong><small>Network Defense Platform</small></div><button className="mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={20} /></button></div>
      <nav aria-label="Primary navigation">
        <span className="nav-label">MONITORING</span>
        {navigation.slice(0, 4).map((item) => <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""} onClick={() => setSidebarOpen(false)}><item.icon size={19} /><span>{item.label}</span>{item.count && <b>{item.count}</b>}</Link>)}
        <span className="nav-label control">CONTROL</span>
        {navigation.slice(4).map((item) => <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""} onClick={() => setSidebarOpen(false)}><item.icon size={19} /><span>{item.label}</span></Link>)}
      </nav>
      <div className="sidebar-bottom"><div className="system-online"><span className="pulse-dot" /><div><strong>Mock services online</strong><small>Preview state, not live connectivity</small></div></div><div className="profile-summary"><div className="avatar">AD</div><div><strong>Administrator</strong><small>admin@reconshield.id</small></div></div></div>
    </aside>
    {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
    <main>
      <header className="topbar"><button className="menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={20} /></button><div><h1>{current[0]}</h1><p>{current[1]}</p></div><div className="topbar-right" ref={menusRef}><div className="environment-pill"><Activity size={13} /> Demo environment</div><div className="date-time"><Clock3 size={18} /><div><b>{now?.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }) ?? "—"}</b><span>{now?.toLocaleTimeString("en-GB") ?? "—"} WIB</span></div></div>
        <div className="topbar-menu"><button className={`notification ${notificationsOpen ? "active" : ""}`} aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }}>{notificationsRead ? <Bell size={19} /> : <><Bell size={19} /><i /></>}</button>{notificationsOpen && <div className="popover notification-popover"><div className="popover-header"><div><strong>Notifications</strong><span>{notificationsRead ? "All notifications read" : "3 unread notifications"}</span></div><button onClick={() => setNotificationsRead(true)} title="Mark all as read"><CheckCheck size={17} /></button></div><div className="notification-list"><Link href="/threat-logs" onClick={() => setNotificationsOpen(false)}><span className="notification-icon danger"><Shield size={16} /></span><span><b>High-confidence threat detected</b><small>192.168.1.50 · confidence 98.5%</small><time>2 minutes ago</time></span>{!notificationsRead && <i />}</Link><Link href="/active-tarpit" onClick={() => setNotificationsOpen(false)}><span className="notification-icon purple"><ShieldCheck size={16} /></span><span><b>IP added to mitigation list</b><small>10.10.24.118 · Dynamic Tarpit</small><time>8 minutes ago</time></span>{!notificationsRead && <i />}</Link><Link href="/settings" onClick={() => setNotificationsOpen(false)}><span className="notification-icon success"><Activity size={16} /></span><span><b>Service health check passed</b><small>All preview services operational</small><time>21 minutes ago</time></span>{!notificationsRead && <i />}</Link></div><Link className="popover-footer" href="/threat-logs" onClick={() => setNotificationsOpen(false)}>View all threat logs</Link></div>}</div>
        <div className="topbar-menu"><button className={`account-trigger ${profileOpen ? "active" : ""}`} aria-label="Administrator account menu" aria-expanded={profileOpen} onClick={() => { setProfileOpen(!profileOpen); setNotificationsOpen(false); }}><span className="avatar">AD</span><span className="account-trigger-copy"><b>Administrator</b><small>System Admin</small></span><ChevronDown size={15} /></button>{profileOpen && <div className="popover account-popover"><div className="account-card"><span className="avatar large">AD</span><div><strong>Administrator</strong><span>admin@reconshield.id</span><small>Demo account</small></div></div><div className="account-links"><Link href="/settings" onClick={() => setProfileOpen(false)}><UserRound size={16} /><span><b>Account settings</b><small>Profile and system preferences</small></span></Link><Link href="/settings" onClick={() => setProfileOpen(false)}><Settings size={16} /><span><b>System control</b><small>Mitigation and connections</small></span></Link></div><button className="sign-out" disabled title="Authentication is not connected in this preview"><LogOut size={16} />Sign out unavailable in preview</button></div>}</div>
      </div></header>
      <div className="content">{children}</div>
      <footer><span>ReconShield · Final Project Research System</span><span>NetFlow/IPFIX · Random Forest · Dynamic Tarpit</span></footer>
    </main>
  </div>;
}
