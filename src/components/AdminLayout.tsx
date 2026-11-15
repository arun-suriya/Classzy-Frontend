import { useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  BookOpen,
  Building2,
  ChevronDown,
  CircleHelp,
  FileText,
  Grid2X2,
  Headset,
  LayoutDashboard,
  Menu,
  Megaphone,
  Search,
  Settings,
  ShieldCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Institutions", path: "/schools", icon: Building2 },
  { label: "Users", path: "/users", icon: Users },
  { label: "Subscription & Billing", path: "/subscriptions", icon: WalletCards },
  { label: "Modules & Features", path: "/modules", icon: Grid2X2 },
  { label: "Content Library", path: "/content", icon: BookOpen },
  { label: "Communications", path: "/communications", icon: Megaphone },
  { label: "Reports & Analytics", path: "/reports", icon: Activity },
  { label: "Support & Tickets", path: "/support", icon: Headset },
  { label: "System Management", path: "/system", icon: ShieldCheck },
  { label: "Settings", path: "/settings", icon: Settings },
  { label: "Audit Logs", path: "/audit-logs", icon: FileText },
];

function Brand() {
  return (
    <div className="flex min-w-[205px] items-center gap-2.5 px-4 lg:px-5">
      <div className="relative grid h-10 w-10 shrink-0 place-items-center text-blue-700">
        <GraduationMark />
      </div>
      <div className="leading-tight">
        <div className="text-[22px] font-extrabold tracking-[-1px] text-[#111c78]">Classzy</div>
        <div className="text-[11px] font-medium text-[#111c78]">Super Admin Portal</div>
      </div>
    </div>
  );
}

function GraduationMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
      <path d="M3 15.5 24 5l21 10.5L24 26 3 15.5Z" fill="#1478f8" />
      <path d="M10 20v11.5c8.2 7.8 19.8 7.8 28 0V20L24 29 10 20Z" fill="#0b48bd" />
      <path d="M43 18v12" stroke="#1478f8" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="43" cy="32.5" r="2.8" fill="#1478f8" />
      <path d="M9 36.5 24 44l15-7.5" fill="#2c8cff" />
    </svg>
  );
}

export default function AdminLayout({
  activeItem,
  children,
}: {
  activeItem: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

  const sideNav = (
    <>
      <div className="mb-2 flex items-center justify-between px-4 pt-3 lg:hidden">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Navigation</span>
        <button onClick={() => setMobileNavOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close navigation">
          <X size={18} />
        </button>
      </div>
      <nav className="admin-side-nav flex-1 space-y-1 overflow-y-auto px-2 pb-3 pt-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeItem === item.label;
          return (
            <button
              type="button"
              key={item.label}
              onClick={() => {
                setMobileNavOpen(false);
                if (item.path === location.pathname) return;
                navigate(item.path);
              }}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-[9px] text-left text-[12px] font-medium transition ${
                active
                  ? "bg-gradient-to-r from-[#0876ff] to-[#0963ed] text-white shadow-sm shadow-blue-200"
                  : "text-[#152154] hover:bg-blue-50 hover:text-blue-700"
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.9} className="shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="m-2 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-3">
        <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
          <CircleHelp size={18} />
        </div>
        <p className="text-[11px] font-bold text-[#18265b]">Need assistance?</p>
        <p className="mt-1 text-[10px] leading-4 text-slate-500">Manage your platform and school network from one place.</p>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#f3f9fd] text-[#101b59]">
      <header className="fixed inset-x-0 top-0 z-50 flex h-[58px] items-center border-b border-blue-100/80 bg-white/95 shadow-[0_2px_12px_rgba(37,99,235,0.03)] backdrop-blur-xl">
        <div className="flex h-full items-center">
          <button className="ml-2 mr-1 rounded-lg p-2 text-blue-700 hover:bg-blue-50 lg:hidden" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">
            <Menu size={20} />
          </button>
          <Brand />
        </div>

        <div className="hidden min-w-0 flex-1 px-5 md:block">
          <label className="relative block max-w-[720px]">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5f77b8]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search institutions, users, modules, reports..."
              className="h-9 w-full rounded-lg border border-blue-100 bg-white pl-10 pr-4 text-[12px] text-slate-700 outline-none transition placeholder:text-[#6378b3] focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>

        <div className="ml-auto flex h-full items-center gap-1.5 px-3 sm:gap-3 sm:px-5">
          <button type="button" className="relative rounded-lg p-2 text-[#0d236a] hover:bg-blue-50" aria-label="Notifications">
            <Bell size={21} />
            <span className="absolute right-[3px] top-[2px] grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">5</span>
          </button>
          <button type="button" className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" aria-label="Help">
            <CircleHelp size={22} />
          </button>
          <div className="hidden h-8 w-px bg-blue-100 sm:block" />
          <button type="button" onClick={() => setProfileOpen((open) => !open)} className="flex items-center gap-2 rounded-xl px-1.5 py-1 text-left hover:bg-blue-50">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-blue-700 to-blue-500 text-[12px] font-bold text-white shadow-sm">SP</span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-[12px] font-bold text-[#101b59]">Super Admin</span>
              <span className="mt-0.5 block text-[10px] text-slate-500">AikonAppz Pvt Ltd</span>
            </span>
            <ChevronDown size={15} className={`ml-1 hidden text-[#101b59] transition sm:block ${profileOpen ? "rotate-180" : ""}`} />
          </button>
          {profileOpen && (
            <div className="absolute right-4 top-[52px] z-[60] w-44 rounded-xl border border-blue-100 bg-white p-2 shadow-xl">
              <p className="px-3 py-2 text-[11px] font-bold text-slate-700">Super Admin</p>
              <button onClick={() => { setProfileOpen(false); navigate("/settings"); }} className="w-full rounded-lg px-3 py-2 text-left text-xs text-slate-600 hover:bg-blue-50">Account settings</button>
              <button onClick={() => setProfileOpen(false)} className="w-full rounded-lg px-3 py-2 text-left text-xs text-slate-600 hover:bg-blue-50">Close menu</button>
            </div>
          )}
        </div>
      </header>

      <aside className="fixed bottom-2 left-2 top-[66px] z-30 hidden w-[200px] flex-col rounded-xl border border-blue-100 bg-white/95 shadow-[0_5px_20px_rgba(41,92,160,0.035)] lg:flex">
        {sideNav}
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button className="absolute inset-0 bg-slate-950/35" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation overlay" />
          <aside className="absolute bottom-0 left-0 top-0 flex w-[280px] flex-col border-r border-blue-100 bg-white shadow-2xl">
            <div className="flex h-[58px] items-center border-b border-blue-100"><Brand /></div>
            {sideNav}
          </aside>
        </div>
      )}

      <main className="min-h-screen pt-[58px] lg:pl-[216px]">
        <div className="admin-page-content p-2 sm:p-3">{children}</div>
      </main>
    </div>
  );
}
