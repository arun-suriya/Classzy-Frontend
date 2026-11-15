import type { ReactNode, ButtonHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Pencil, Trash2, Search } from "lucide-react";

/* ---------- Routes for the 5 tabs (change to match your router) ---------- */
export const academicTabs = [
  { key: "year", label: "Academic Year", path: "/institutions/settings/academic/year" },
  { key: "terms", label: "Terms & Grading", path: "/institutions/settings/academic/terms" },
  { key: "subjects", label: "Subjects", path: "/institutions/settings/academic/subjects" },
  { key: "classes", label: "Classes & Sections", path: "/institutions/settings/academic/classes" },
  { key: "promotion", label: "Promotion & Progression", path: "/institutions/settings/academic/promotion" },
] as const;
export type AcademicTabKey = (typeof academicTabs)[number]["key"];

/* ---------- Shared class tokens (same look as Add Institution) ---------- */
export const cardClass = "overflow-hidden rounded-xl border border-[#d8e9fb] bg-white shadow-[0_1px_6px_rgba(37,99,235,0.05)]";
const controlBase = "min-w-0 rounded-md border border-[#d3dff0] bg-white px-2.5 text-[11px] text-[#17265f] outline-none transition placeholder:text-[#8b9abd] hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
export const controlClass = `${controlBase} h-8 w-full`;
export const textareaClass = `${controlBase} h-[64px] w-full resize-none py-2`;
export const labelClass = "mb-1 block text-[10px] font-bold leading-[12px] text-[#17245e]";
export const thClass = "border border-blue-100 px-2 py-2 font-bold";
export const tdClass = "border border-blue-50 px-2 py-[8px] text-[#33477c]";

/* ---------- Page header: numbered badge + title + subtitle ---------- */
export function AcademicHeader({
  step, title, subtitle, right,
}: { step: number; title: string; subtitle: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d8e9fb] bg-gradient-to-r from-[#d6eaff] via-[#e8f4ff] to-[#f4faff] px-4 py-3.5 shadow-[0_1px_6px_rgba(37,99,235,0.05)]">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-600 text-[15px] font-bold text-white">{step}</span>
        <div className="min-w-0">
          <h1 className="text-[20px] font-extrabold leading-tight tracking-[-0.4px] text-[#111b70]">{title}</h1>
          <p className="mt-0.5 text-[11px] leading-4 text-[#425585]">{subtitle}</p>
        </div>
      </div>
      {right}
    </div>
  );
}

/* ---------- Breadcrumb ---------- */
export function Breadcrumb({ trail }: { trail: string[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 px-1 text-[10px] text-[#53658f]">
      {trail.map((item, i) => (
        <span key={item} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={11} className="text-slate-400" />}
          <span className={i === trail.length - 1 ? "font-semibold text-blue-700" : ""}>{item}</span>
        </span>
      ))}
    </nav>
  );
}

/* ---------- Tab bar linking the 5 pages ---------- */
export function AcademicTabs({ active }: { active: AcademicTabKey }) {
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[640px] grid-cols-5 gap-2">
        {academicTabs.map((tab) => (
          <Link
            key={tab.key}
            to={tab.path}
            aria-current={active === tab.key ? "page" : undefined}
            className={`rounded-md border px-3 py-2 text-center text-[10px] font-semibold transition ${
              active === tab.key
                ? "border-blue-500 bg-[#dcecff] text-blue-800 shadow-[inset_0_-2px_0_#1478f8]"
                : "border-[#cfe0f5] bg-white text-[#34467a] hover:border-blue-300 hover:bg-blue-50"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ---------- Layout helpers ---------- */
export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`${cardClass} ${className}`}>{children}</section>;
}

export function PanelTitle({ icon, title, right }: { icon?: ReactNode; title: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-2 pt-3.5">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && <span className="shrink-0 text-blue-600">{icon}</span>}
        <h2 className="text-[14px] font-extrabold tracking-[-0.2px] text-[#101b69]">{title}</h2>
      </div>
      {right}
    </div>
  );
}

export function Field({ label, required, optional, children, className = "" }: { label: string; required?: boolean; optional?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label className={labelClass}>
        {label}
        {optional && <span className="ml-1 font-normal text-slate-500">(Optional)</span>}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );
}

/* ---------- Buttons ---------- */
export function PrimaryButton({ children, className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-[#0875fb] px-3.5 py-2 text-[11px] font-semibold text-white shadow-sm transition hover:bg-blue-700 ${className}`}>
      {children}
    </button>
  );
}
export function OutlineButton({ children, className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-blue-300 bg-white px-4 py-2 text-[11px] font-semibold text-blue-600 transition hover:bg-blue-50 ${className}`}>
      {children}
    </button>
  );
}

/* ---------- Status pill (Active / Inactive / Current / Eligible / Review / Retain) ---------- */
const pillTone: Record<string, { box: string; dot: string }> = {
  Active: { box: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  Current: { box: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  Eligible: { box: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  Inactive: { box: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  Review: { box: "bg-orange-50 text-orange-700", dot: "bg-orange-500" },
  Retain: { box: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
};
export function StatusPill({ status }: { status: string }) {
  const tone = pillTone[status] ?? pillTone.Inactive;
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[9px] font-medium ${tone.box}`}>
      <span className={`h-2 w-2 rounded-full ${tone.dot}`} />{status}
    </span>
  );
}

/* ---------- Toggle switch ---------- */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-[11px] text-[#17265f]"
    >
      <span className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-blue-600" : "bg-slate-300"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </span>
      {label ?? (checked ? "Active" : "Inactive")}
    </button>
  );
}

/* ---------- Row action icons ---------- */
export function RowActions({ onEdit, onDelete, name }: { onEdit: () => void; onDelete: () => void; name: string }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <button type="button" aria-label={`Edit ${name}`} onClick={onEdit} className="text-[#152b70] hover:text-blue-600"><Pencil size={13} /></button>
      <button type="button" aria-label={`Delete ${name}`} onClick={onDelete} className="text-[#152b70] hover:text-rose-600"><Trash2 size={13} /></button>
    </span>
  );
}

/* ---------- Search box ---------- */
export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative min-w-[180px] flex-1">
      <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6378ab]" />
      <input className={`${controlClass} pl-8`} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </div>
  );
}

/* ---------- Footer: "Showing x of y" + pager ---------- */
export function TableFooter({ shown, total, page = 1, pages = 1, onPage }: { shown: number; total: number; page?: number; pages?: number; onPage?: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between px-1 pt-2 text-[10px] text-[#53658f]">
      <span>Showing {shown ? `1-${shown}` : 0} of {total}</span>
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage?.(page - 1)} className="grid h-6 w-6 place-items-center rounded border border-blue-100 text-blue-600 disabled:opacity-40"><ChevronLeft size={12} /></button>
        <span className="grid h-6 w-6 place-items-center rounded bg-blue-600 text-[10px] font-bold text-white">{page}</span>
        <button type="button" aria-label="Next page" disabled={page >= pages} onClick={() => onPage?.(page + 1)} className="grid h-6 w-6 place-items-center rounded border border-blue-100 text-blue-600 disabled:opacity-40"><ChevronRight size={12} /></button>
      </div>
    </div>
  );
}

/* ---------- Table wrapper ---------- */
export function DataTable({ heads, children, min = 520 }: { heads: string[]; children: ReactNode; min?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-[10px]" style={{ minWidth: min }}>
        <thead>
          <tr className="bg-[#f5f9ff] text-[#13205f]">{heads.map((h) => <th key={h} className={thClass}>{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return <tr><td colSpan={cols} className="border border-blue-50 px-2 py-6 text-center text-[10px] text-slate-400">{text}</td></tr>;
}

/* ---------- Detail form card (grey-blue panel under the tables) ---------- */
export function DetailCard({ title, children, onCancel, onSave, saveLabel = "Save", saving = false }: { title: string; children: ReactNode; onCancel: () => void; onSave: () => void; saveLabel?: string; saving?: boolean }) {
  return (
    <div className="rounded-xl border border-[#d8e9fb] bg-[#f6faff] p-4">
      <h3 className="mb-3 text-[13px] font-extrabold text-[#101b69]">{title}</h3>
      {children}
      <div className="mt-3 flex justify-end gap-2.5">
        <OutlineButton type="button" onClick={onCancel} disabled={saving}>Cancel</OutlineButton>
        <PrimaryButton type="button" onClick={onSave} disabled={saving} className="px-6 disabled:opacity-60">{saving ? "Saving..." : saveLabel}</PrimaryButton>
      </div>
    </div>
  );
}

export function Notice({ tone, children }: { tone: "error" | "info"; children: ReactNode }) {
  const cls = tone === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-[#d8e9fb] bg-gradient-to-r from-[#eff6ff] to-[#f8fcff] text-blue-800";
  return <div role={tone === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-2.5 text-[11px] leading-5 ${cls}`}>{children}</div>;
}

/** "01/04/2025" display helper for ISO dates */
export function fmtDate(iso: string) {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m) - 1];
  return `${d} ${mon} ${y}`;
}
