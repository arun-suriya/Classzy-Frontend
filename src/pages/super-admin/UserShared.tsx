import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Copy, X } from "lucide-react";
import { api } from "../../services/api";
import type { UserRoleView, UserStatus, UserType } from "../../services/api";
import { Notice } from "./AcademicShared";
import { Pill } from "./TransportShared";

export const userTypes: readonly (readonly [UserType, string])[] = [["STUDENT", "Student"], ["TEACHER", "Teacher"], ["PARENT", "Parent"], ["STAFF", "Staff"], ["ADMINISTRATOR", "Administrator"]];
export const typeLabel = (t: string) => userTypes.find(([k]) => k === t)?.[1] ?? t;
const typeStyle: Record<string, string> = {
  STUDENT: "border-emerald-300 bg-emerald-50 text-emerald-700", TEACHER: "border-orange-300 bg-orange-50 text-orange-700", PARENT: "border-rose-300 bg-rose-50 text-rose-700",
  STAFF: "border-violet-300 bg-violet-50 text-violet-700", ADMINISTRATOR: "border-blue-300 bg-blue-50 text-blue-700",
};
export const TypePill = ({ type }: { type: string }) => <span className={`inline-block rounded border px-2 py-0.5 text-[10px] font-semibold ${typeStyle[type] ?? "border-slate-200 bg-slate-50 text-slate-600"}`}>{typeLabel(type)}</span>;

export const statusLabels: Record<UserStatus, string> = { ACTIVE: "Active", INACTIVE: "Inactive", SUSPENDED: "Suspended" };
export const UserStatusPill = ({ status }: { status: UserStatus }) => <Pill tone={status === "ACTIVE" ? "green" : status === "SUSPENDED" ? "red" : "amber"}>{statusLabels[status]}</Pill>;

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
export const Avatar = ({ name, size = 28 }: { name: string; size?: number }) => (
  <span className="grid shrink-0 place-items-center rounded-full bg-[#dbe9ff] font-bold text-[#17306e]" style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}>{initials(name)}</span>
);

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
}
export function fmtDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** Roles are a fixed list on the server; load them once per page. */
export function useRoles() {
  const [roles, setRoles] = useState<UserRoleView[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  useEffect(() => {
    let live = true;
    Promise.all([api.userAdmin.roles(), api.userAdmin.modules()]).then(([r, m]) => { if (live) { setRoles(r); setModules(m); } }).catch(() => { /* the page shows its own errors */ });
    return () => { live = false; };
  }, []);
  const name = (code: string) => roles.find((r) => r.code === code)?.name ?? code;
  return { roles, modules, name };
}

/** Shows a generated password once. It is not stored anywhere readable after this. */
export function TempPassword({ who, password, onClose }: { who: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(password); setCopied(true); } catch { setCopied(false); }
  }
  return (
    <Notice tone="info">
      <div className="flex flex-wrap items-center gap-3">
        <span>Temporary password for <b>{who}</b> (shown once — share it securely):</span>
        <code className="rounded bg-white px-2 py-1 text-[12px] font-bold tracking-wide text-[#101b69]">{password}</code>
        <button type="button" onClick={() => void copy()} className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline"><Copy size={12} /> {copied ? "Copied" : "Copy"}</button>
        <button type="button" aria-label="Dismiss" onClick={onClose} className="ml-auto text-slate-500 hover:text-slate-800"><X size={14} /></button>
      </div>
    </Notice>
  );
}

export function UsersHeader({ title, subtitle, right }: { title: string; subtitle: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d8e9fb] bg-gradient-to-r from-[#d6eaff] via-[#e8f4ff] to-[#f4faff] px-4 py-3.5 shadow-[0_1px_6px_rgba(37,99,235,0.05)]">
      <div className="min-w-0">
        <h1 className="text-[20px] font-extrabold leading-tight tracking-[-0.4px] text-[#111b70]">{title}</h1>
        <p className="mt-0.5 text-[11px] leading-4 text-[#425585]">{subtitle}</p>
      </div>
      {right}
    </div>
  );
}
