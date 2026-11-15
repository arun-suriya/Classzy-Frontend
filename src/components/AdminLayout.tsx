import { useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  Archive,
  Bell,
  BookOpen,
  Building2,
  Bus,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  FileText,
  GraduationCap,
  Grid2X2,
  Headset,
  Landmark,
  Layers,
  LayoutDashboard,
  LogOut,
  MapPin,
  Palette,
  Plug,
  Menu,
  MessageSquare,
  Megaphone,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api, session } from "../services/api";

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  INSTITUTION_ADMIN: "Institution Admin",
  TEACHER: "Teacher",
};

type NavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Shows a decorative chevron (design shows it); submenu can be added later. */
  chevron?: boolean;
};

/* ---------- Top-level menu (Institutions is rendered separately: it has a submenu) ---------- */
const topBefore: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
];
const topAfter: NavItem[] = [
  { label: "Users", path: "/users", icon: Users, chevron: true },
  { label: "Subscription & Billing", path: "/subscriptions", icon: WalletCards, chevron: true },
  { label: "Modules & Features", path: "/modules", icon: Grid2X2, chevron: true },
  { label: "Content Library", path: "/content", icon: BookOpen, chevron: true },
  { label: "Communications", path: "/communications", icon: Megaphone, chevron: true },
  { label: "Reports & Analytics", path: "/reports", icon: Activity, chevron: true },
  { label: "Support & Tickets", path: "/support", icon: Headset, chevron: true },
  { label: "System Management", path: "/system", icon: ShieldCheck, chevron: true },
  { label: "Settings", path: "/settings", icon: Settings },
  { label: "Audit Logs", path: "/audit-logs", icon: FileText },
];

/* ---------- Institutions submenu ---------- */
type SubItem = { label: string; path: string; icon: LucideIcon; match?: (p: string) => boolean };

const instBefore: SubItem[] = [
  { label: "All Institutions", path: "/schools", icon: Building2, match: (p) => p === "/schools" },
  { label: "Add Institution", path: "/institutions/new", icon: Landmark, match: (p) => p === "/institutions/new" },
  { label: "Institution Types", path: "/institutions/types", icon: Layers, match: (p) => p.startsWith("/institutions/types") },
  { label: "Branches & Campuses", path: "/institutions/branches", icon: MapPin, match: (p) => p.startsWith("/institutions/branches") },
];
const settingsChildren: SubItem[] = [
  { label: "General Settings", path: "/institutions/settings/general", icon: SlidersHorizontal, match: (p) => p.startsWith("/institutions/settings/general") },
  { label: "Academic Settings", path: "/institutions/settings/academic/year", icon: GraduationCap, match: (p) => p.startsWith("/institutions/settings/academic") },
  { label: "Attendance Settings", path: "/institutions/settings/attendance", icon: CalendarCheck, match: (p) => p.startsWith("/institutions/settings/attendance") },
  { label: "Exam & Grading Settings", path: "/institutions/settings/exam-grading", icon: ClipboardCheck, match: (p) => p.startsWith("/institutions/settings/exam-grading") },
  { label: "Timetable Settings", path: "/institutions/settings/timetable", icon: Clock3, match: (p) => p.startsWith("/institutions/settings/timetable") },
  { label: "Communication Settings", path: "/institutions/settings/communication/email", icon: MessageSquare, match: (p) => p.startsWith("/institutions/settings/communication") },
  { label: "Transport Settings", path: "/institutions/settings/transport", icon: Bus, match: (p) => p.startsWith("/institutions/settings/transport") },
  { label: "Library Settings", path: "/institutions/settings/library", icon: BookOpen, match: (p) => p.startsWith("/institutions/settings/library") },
  { label: "Security & Access", path: "/institutions/settings/security", icon: ShieldCheck, match: (p) => p.startsWith("/institutions/settings/security") },
  { label: "Integrations", path: "/institutions/settings/integrations", icon: Plug, match: (p) => p.startsWith("/institutions/settings/integrations") },
  { label: "Branding & Customization", path: "/institutions/settings/branding", icon: Palette, match: (p) => p.startsWith("/institutions/settings/branding") },
];
const instAfter: SubItem[] = [
  { label: "Approval Requests", path: "/institutions/approvals", icon: FileText, match: (p) => p.startsWith("/institutions/approvals") },
  { label: "Archive", path: "/institutions/archive", icon: Archive, match: (p) => p.startsWith("/institutions/archive") },
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
  const path = location.pathname;

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

  // Signed-in user (from the login response)
  const user = session.user();
  const displayName = user?.fullName ?? "Super Admin";
  const roleLabel = user ? (roleLabels[user.role] ?? user.role) : "Super Admin";
  const initials =
    displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "SA";

  function signOut() {
    setProfileOpen(false);
    api.auth.logout();
    navigate("/", { replace: true });
  }

  // Institutions group is open on any Institutions page; Institution Settings opens on its own pages.
  const [instOpen, setInstOpen] = useState(activeItem === "Institutions");
  const [settingsOpen, setSettingsOpen] = useState(path.startsWith("/institutions/settings"));

  function go(to: string) {
    setMobileNavOpen(false);
    if (to === path) return;
    navigate(to);
  }

  /* ---------- row renderers ---------- */
  const flatItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = activeItem === item.label;
    return (
      <button
        type="button"
        key={item.label}
        onClick={() => go(item.path)}
        className={`group flex w-full items-center gap-3 rounded-lg px-3 py-[9px] text-left text-[12px] font-medium transition ${
          active
            ? "bg-gradient-to-r from-[#0876ff] to-[#0963ed] text-white shadow-sm shadow-blue-200"
            : "text-[#152154] hover:bg-blue-50 hover:text-blue-700"
        }`}
      >
        <Icon size={18} strokeWidth={active ? 2.2 : 1.9} className="shrink-0" />
        <span className="flex-1 truncate">{item.label}</span>
        {item.chevron && <ChevronDown size={14} className={`shrink-0 ${active ? "text-white" : "text-[#5f77b8]"}`} />}
      </button>
    );
  };

  const subItem = (item: SubItem, depth: 1 | 2) => {
    const Icon = item.icon;
    const active = item.match ? item.match(path) : path === item.path;
    return (
      <button
        type="button"
        key={item.label}
        onClick={() => go(item.path)}
        aria-current={active ? "page" : undefined}
        className={`flex w-full items-center gap-2 rounded-md py-[6px] pr-2 text-left transition ${
          depth === 1 ? "pl-3 text-[11px]" : "pl-3 text-[10.5px]"
        } ${
          active
            ? "bg-blue-100/80 font-semibold text-blue-700"
            : "font-medium text-[#33477c] hover:bg-blue-50 hover:text-blue-700"
        }`}
      >
        <Icon size={depth === 1 ? 14 : 13} strokeWidth={2} className="shrink-0" />
        <span className="leading-tight">{item.label}</span>
      </button>
    );
  };

  const institutionsActive = activeItem === "Institutions";
  const settingsActive = path.startsWith("/institutions/settings");

  const institutionsGroup = (
    <div key="Institutions">
      <button
        type="button"
        aria-expanded={instOpen}
        onClick={() => setInstOpen((o) => !o)}
        className={`flex w-full items-center gap-3 rounded-lg border px-3 py-[9px] text-left text-[12px] font-semibold transition ${
          institutionsActive
            ? "border-blue-300 bg-blue-50 text-blue-700"
            : "border-transparent text-[#152154] hover:bg-blue-50 hover:text-blue-700"
        }`}
      >
        <Building2 size={18} strokeWidth={2.1} className="shrink-0" />
        <span className="flex-1 truncate">Institutions</span>
        {instOpen ? <ChevronUp size={14} className="shrink-0" /> : <ChevronDown size={14} className="shrink-0" />}
      </button>

      {instOpen && (
        <div className="ml-[18px] mt-1 space-y-0.5 border-l border-blue-100 pl-1.5">
          {instBefore.map((i) => subItem(i, 1))}

          {/* Institution Settings (nested group) */}
          <button
            type="button"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen((o) => !o)}
            className={`flex w-full items-center gap-2 rounded-md py-[6px] pl-3 pr-2 text-left text-[11px] font-semibold transition ${
              settingsActive ? "text-blue-700" : "text-[#33477c] hover:bg-blue-50 hover:text-blue-700"
            }`}
          >
            <Settings size={14} strokeWidth={2} className="shrink-0" />
            <span className="flex-1 leading-tight">Institution Settings</span>
            {settingsOpen ? <ChevronUp size={12} className="shrink-0" /> : <ChevronDown size={12} className="shrink-0" />}
          </button>
          {settingsOpen && (
            <div className="ml-3 space-y-0.5 border-l border-blue-100 pl-1.5">
              {settingsChildren.map((i) => subItem(i, 2))}
            </div>
          )}

          {instAfter.map((i) => subItem(i, 1))}
        </div>
      )}
    </div>
  );

  const sideNav = (
    <>
      <div className="mb-2 flex items-center justify-between px-4 pt-3 lg:hidden">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Navigation</span>
        <button onClick={() => setMobileNavOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close navigation">
          <X size={18} />
        </button>
      </div>
      <nav className="admin-side-nav flex-1 space-y-1 overflow-y-auto px-2 pb-3 pt-2">
        {topBefore.map(flatItem)}
        {institutionsGroup}
        {topAfter.map(flatItem)}
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
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-blue-700 to-blue-500 text-[12px] font-bold text-white shadow-sm">{initials}</span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-[12px] font-bold text-[#101b59]">{displayName}</span>
              <span className="mt-0.5 block text-[10px] text-slate-500">{roleLabel}</span>
            </span>
            <ChevronDown size={15} className={`ml-1 hidden text-[#101b59] transition sm:block ${profileOpen ? "rotate-180" : ""}`} />
          </button>
          {profileOpen && (
            <div className="absolute right-4 top-[52px] z-[60] w-44 rounded-xl border border-blue-100 bg-white p-2 shadow-xl">
              <div className="px-3 py-2">
                <p className="truncate text-[11px] font-bold text-slate-700">{displayName}</p>
                {user && <p className="truncate text-[10px] text-slate-500">{user.email}</p>}
              </div>
              <button onClick={() => { setProfileOpen(false); navigate("/settings"); }} className="w-full rounded-lg px-3 py-2 text-left text-xs text-slate-600 hover:bg-blue-50">Account settings</button>
              <button onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50">
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <aside className="fixed bottom-2 left-2 top-[66px] z-30 hidden w-[248px] flex-col rounded-xl border border-blue-100 bg-white/95 shadow-[0_5px_20px_rgba(41,92,160,0.035)] lg:flex">
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

      <main className="min-h-screen pt-[58px] lg:pl-[264px]">
        <div className="admin-page-content p-2 sm:p-3">{children}</div>
      </main>
    </div>
  );
}
