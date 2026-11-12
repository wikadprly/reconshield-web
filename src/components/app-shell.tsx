"use client";

import { Activity, BarChart3, Bell, CheckCheck, ChevronDown, ClipboardCheck, Clock3, LayoutDashboard, LogOut, Menu, Settings, Shield, ShieldCheck, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { labelSource } from "@/lib/labels";
import { useApiResult } from "@/lib/use-api-result";
import type { SecurityOverview } from "@/types/security";

const navigation = [
  { href: "/dashboard", label: "Dasbor", icon: LayoutDashboard },
  { href: "/threat-logs", label: "Log Ancaman", icon: Shield },
  { href: "/active-tarpit", label: "Tarpit Aktif", icon: ShieldCheck },
  { href: "/approvals", label: "Pusat Persetujuan", icon: ClipboardCheck },
  { href: "/ml-performance", label: "Performa ML", icon: BarChart3 },
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

const pageMeta: Record<string, [string, string]> = {
  "/dashboard": ["Ringkasan Jaringan", "Pantau trafik, deteksi, dan postur keamanan jaringan"],
  "/threat-logs": ["Log Ancaman", "Tinjau dan selidiki insiden reconnaissance"],
  "/active-tarpit": ["Tarpit Aktif", "Kelola alamat dalam daftar mitigasi dinamis"],
  "/approvals": ["Pusat Persetujuan", "Tinjau permintaan mitigasi pada mode manual"],
  "/ml-performance": ["Performa ML", "Tinjau evaluasi penelitian Random Forest"],
  "/settings": ["Kontrol Sistem", "Atur kebijakan mitigasi dan status integrasi"],
};

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const menusRef = useRef<HTMLDivElement>(null);
  const { result: overview } = useApiResult<SecurityOverview>("/api/overview");
  const tarpitCount = overview?.data.tarpit.length ?? 0;
  const services = overview?.data.services ?? [];
  const allOnline = services.length > 0 && services.every((service) => service.status === "Online");
  const sidebarStatus = !overview
    ? ["Memeriksa layanan", "Membaca sumber data terkonfigurasi"]
    : overview.source === "mock"
      ? ["Layanan pratinjau online", "Kondisi pratinjau, bukan konektivitas langsung"]
      : overview.source === "mixed"
        ? ["Sumber langsung Â· campuran", "Sebagian panel memakai data pratinjau"]
        : allOnline
          ? ["Layanan online", `Sumber langsung Â· ${labelSource(overview.source)}`]
          : ["Layanan terganggu", `Sumber langsung Â· ${labelSource(overview.source)}`];
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
      <div className="brand"><div className="brand-mark"><ShieldCheck size={25} /><span /></div><div><strong>ReconShield</strong><small>Platform Pertahanan Jaringan</small></div><button className="mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Tutup navigasi"><X size={20} /></button></div>
      <nav aria-label="Navigasi utama">
        <span className="nav-label">PEMANTAUAN</span>
        {navigation.slice(0, 5).map((item) => <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""} onClick={() => setSidebarOpen(false)}><item.icon size={19} /><span>{item.label}</span>{item.href === "/active-tarpit" && tarpitCount > 0 && <b>{tarpitCount}</b>}</Link>)}
        <span className="nav-label control">KONTROL</span>
        {navigation.slice(5).map((item) => <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""} onClick={() => setSidebarOpen(false)}><item.icon size={19} /><span>{item.label}</span></Link>)}
      </nav>
      <div className="sidebar-bottom"><div className="system-online"><span className="pulse-dot" /><div><strong>{sidebarStatus[0]}</strong><small>{sidebarStatus[1]}</small></div></div><div className="profile-summary"><div className="avatar">AD</div><div><strong>Administrator</strong><small>admin@reconshield.id</small></div></div></div>
    </aside>
    {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
    <main>
      <header className="topbar"><button className="menu-button" onClick={() => setSidebarOpen(true)} aria-label="Buka navigasi"><Menu size={20} /></button><div><h1>{current[0]}</h1><p>{current[1]}</p></div><div className="topbar-right" ref={menusRef}><div className="environment-pill"><Activity size={13} /> Lingkungan demo</div><div className="date-time"><Clock3 size={18} /><div><b>{now?.toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }) ?? "â€”"}</b><span>{now?.toLocaleTimeString("id-ID") ?? "â€”"} WIB</span></div></div>
        <div className="topbar-menu"><button className={`notification ${notificationsOpen ? "active" : ""}`} aria-label="Notifikasi" aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }}>{notificationsRead ? <Bell size={19} /> : <><Bell size={19} /><i /></>}</button>{notificationsOpen && <div className="popover notification-popover"><div className="popover-header"><div><strong>Notifikasi</strong><span>{notificationsRead ? "Semua notifikasi telah dibaca" : "3 notifikasi belum dibaca"}</span></div><button onClick={() => setNotificationsRead(true)} title="Tandai semua telah dibaca"><CheckCheck size={17} /></button></div><div className="notification-list"><Link href="/threat-logs" onClick={() => setNotificationsOpen(false)}><span className="notification-icon danger"><Shield size={16} /></span><span><b>Ancaman dengan keyakinan tinggi terdeteksi</b><small>192.168.1.50 Â· keyakinan 98.5%</small><time>2 menit lalu</time></span>{!notificationsRead && <i />}</Link><Link href="/active-tarpit" onClick={() => setNotificationsOpen(false)}><span className="notification-icon purple"><ShieldCheck size={16} /></span><span><b>IP ditambahkan ke daftar mitigasi</b><small>10.10.24.118 Â· Dynamic Tarpit</small><time>8 menit lalu</time></span>{!notificationsRead && <i />}</Link><Link href="/settings" onClick={() => setNotificationsOpen(false)}><span className="notification-icon success"><Activity size={16} /></span><span><b>Pemeriksaan kesehatan layanan lolos</b><small>Semua layanan pratinjau beroperasi</small><time>21 menit lalu</time></span>{!notificationsRead && <i />}</Link></div><Link className="popover-footer" href="/threat-logs" onClick={() => setNotificationsOpen(false)}>Lihat semua log ancaman</Link></div>}</div>
        <div className="topbar-menu"><button className={`account-trigger ${profileOpen ? "active" : ""}`} aria-label="Menu akun administrator" aria-expanded={profileOpen} onClick={() => { setProfileOpen(!profileOpen); setNotificationsOpen(false); }}><span className="avatar">AD</span><span className="account-trigger-copy"><b>Administrator</b><small>Admin Sistem</small></span><ChevronDown size={15} /></button>{profileOpen && <div className="popover account-popover"><div className="account-card"><span className="avatar large">AD</span><div><strong>Administrator</strong><span>admin@reconshield.id</span><small>Akun demo</small></div></div><div className="account-links"><Link href="/settings" onClick={() => setProfileOpen(false)}><UserRound size={16} /><span><b>Pengaturan akun</b><small>Profil dan preferensi sistem</small></span></Link><Link href="/settings" onClick={() => setProfileOpen(false)}><Settings size={16} /><span><b>Kontrol sistem</b><small>Mitigasi dan koneksi</small></span></Link></div><button className="sign-out" disabled title="Autentikasi belum terhubung di pratinjau ini"><LogOut size={16} />Keluar tidak tersedia di pratinjau</button></div>}</div>
      </div></header>
      <div className="content">{children}</div>
      <footer><span>ReconShield Â· Sistem Penelitian Tugas Akhir</span><span>NetFlow/IPFIX Â· Random Forest Â· Dynamic Tarpit</span></footer>
    </main>
  </div>;
}
