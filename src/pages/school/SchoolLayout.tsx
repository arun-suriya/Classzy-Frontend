import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, Bus, BookOpen, Building2, CalendarDays, ChevronDown, CircleHelp, ClipboardCheck, Clock3, FileBarChart, GraduationCap, IdCard, LayoutDashboard, LogOut, Menu, MessageSquare, Search, Settings, UserPlus, Users, Wallet, X } from "lucide-react";
import { api, session } from "../../services/api";

const SCHOOL_NAME_KEY = "cz_school_name";
export const rememberSchoolName = (name: string) => { try { sessionStorage.setItem(SCHOOL_NAME_KEY, name); } catch { /* optional */ } };

const items = [
  { label: "Dashboard", path: "/school", icon: LayoutDashboard },
  { label: "Admissions", path: "/school/admissions", icon: UserPlus },
  { label: "Students", path: "/school/students", icon: GraduationCap },
  { label: "Academics", path: "/school/academics", icon: BookOpen },
  { label: "Examinations", path: "/school/examinations", icon: ClipboardCheck },
  { label: "Timetable", path: "/school/timetable", icon: Clock3 },
  { label: "Attendance", path: "/school/attendance", icon: IdCard },
  { label: "Fees & Finance", path: "/school/fees", icon: Wallet },
  { label: "Staff Management", path: "/school/staff", icon: Users },
  { label: "Communication", path: "/school/communication", icon: MessageSquare },
  { label: "Calendar", path: "/school/calendar", icon: CalendarDays },
  { label: "Transport", path: "/school/transport", icon: Bus },
  { label: "Library", path: "/school/library", icon: BookOpen },
  { label: "Assets & Facilities", path: "/school/assets", icon: Building2 },
  { label: "Reports", path: "/school/reports", icon: FileBarChart },
  { label: "Settings", path: "/school/settings", icon: Settings },
] as const;

export default function SchoolLayout({ children, schoolName }: { children: ReactNode; schoolName?: string }) {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const user = session.user();
  const instId = session.institutionId();
  const [logoFailed, setLogoFailed] = useState(false);
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    const load = () => { api.schoolComm.unreadCount().then((r) => setUnread(r.unread)).catch(() => { /* badge is optional */ }); };
    load();
    const t = setInterval(load, 60000);
    window.addEventListener("cz-notifications", load);
    return () => { clearInterval(t); window.removeEventListener("cz-notifications", load); };
  }, []);
  let remembered = "";
  try { remembered = sessionStorage.getItem(SCHOOL_NAME_KEY) ?? ""; } catch { /* optional */ }
  const name = schoolName ?? (remembered || "School Admin Portal");
  const display = user?.fullName ?? "School Admin";
  const initials = display.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "SA";
  const role = user?.role === "SUPER_ADMIN" ? "Super Admin (previewing)" : "School Administrator";

  const signOut = () => { api.auth.logout(); nav("/login", { replace: true }); };
  const go = (p: string) => { setOpen(false); if (p !== pathname) nav(p); };

  const sidebar = (
    <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-2">
      {items.map(({ label, path, icon: Icon }) => {
        const active = path === "/school" ? pathname === "/school" : pathname.startsWith(path);
        return (
          <button key={path} type="button" onClick={() => go(path)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition ${active ? "bg-[#0875fb] text-white shadow-sm" : "text-[#17245e] hover:bg-blue-50"}`}>
            <Icon size={18} />{label}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f2f7ff] text-[#17245e]">
      <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-blue-100 bg-white/95 px-3 backdrop-blur sm:px-5">
        <button type="button" className="rounded-lg p-2 hover:bg-blue-50 lg:hidden" aria-label="Open navigation" onClick={() => setOpen(true)}><Menu size={20} /></button>
        <div className="flex w-[250px] shrink-0 items-center gap-2.5">
          {instId && !logoFailed ? <img src={api.institutions.imageUrl(instId, "logo")} alt="" onError={() => setLogoFailed(true)} className="h-9 w-9 rounded object-contain" /> : <span className="grid h-9 w-9 place-items-center rounded bg-blue-600 text-white"><GraduationCap size={20} /></span>}
          <span className="truncate text-[15px] font-extrabold text-[#101b69]">{name}</span>
        </div>
        <label className="relative hidden max-w-[560px] flex-1 md:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
          <input readOnly title="Search isn't connected yet" placeholder="Search students, parents, staff, applications, fees, events..." className="h-10 w-full cursor-default rounded-lg border border-blue-100 bg-white pl-10 pr-4 text-[12px] outline-none placeholder:text-[#6378b3]" />
        </label>
        <div className="relative ml-auto flex items-center gap-2 sm:gap-3">
          <button type="button" onClick={() => nav("/school/communication?tab=Notifications")} className="relative rounded-lg p-2 hover:bg-blue-50" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}><Bell size={20} />{unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-[18px] text-white">{unread > 99 ? "99+" : unread}</span>}</button>
          <button type="button" className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" aria-label="Help"><CircleHelp size={21} /></button>
          <button type="button" onClick={() => setMenu(!menu)} className="flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-blue-50">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-700 to-blue-600 text-[12px] font-bold text-white">{initials}</span>
            <span className="hidden text-left leading-tight sm:block"><span className="block text-[12px] font-bold text-[#101b59]">{display}</span><span className="block text-[10px] text-slate-500">{role}</span></span>
            <ChevronDown size={15} className="hidden sm:block" />
          </button>
          {menu && (
            <div className="absolute right-0 top-12 z-50 w-48 rounded-xl border border-blue-100 bg-white p-2 shadow-xl">
              <div className="px-3 py-2"><p className="truncate text-[11px] font-bold">{display}</p>{user && <p className="truncate text-[10px] text-slate-500">{user.email}</p>}</div>
              {user?.role === "SUPER_ADMIN" && <button type="button" onClick={() => nav("/dashboard")} className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-blue-50">Back to Super Admin</button>}
              <button type="button" onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50"><LogOut size={14} />Sign out</button>
            </div>
          )}
        </div>
      </header>
      <div className="flex">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[250px] shrink-0 flex-col border-r border-blue-100 bg-white lg:flex">{sidebar}</aside>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
            <aside className="relative flex h-full w-[260px] flex-col bg-white"><button type="button" className="absolute right-2 top-2 rounded-lg p-2 hover:bg-slate-100" aria-label="Close navigation" onClick={() => setOpen(false)}><X size={18} /></button><div className="h-10" />{sidebar}</aside></div>
        )}
        <main className="min-w-0 flex-1 p-4 sm:p-5">{children}</main>
      </div>
    </div>
  );
}
