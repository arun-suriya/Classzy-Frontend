import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { api, ApiError } from "../../services/api";
import { AcademicHeader, Breadcrumb, Field, Notice, OutlineButton, PrimaryButton, Toggle, controlClass, textareaClass } from "./AcademicShared";
import { ContextBar, errText } from "./SettingsShared";
import type { ActiveInstitution } from "./SettingsShared";

/* ------------------------------------------------------------------ constants */

export type Opt = readonly (readonly [string, string])[];

export const commPages = [
  { key: "email", label: "Email Settings", path: "/institutions/settings/communication/email" },
  { key: "sms", label: "SMS Settings", path: "/institutions/settings/communication/sms" },
  { key: "push", label: "Push Notifications", path: "/institutions/settings/communication/push" },
  { key: "templates", label: "Templates", path: "/institutions/settings/communication/templates" },
] as const;
export type CommPageKey = (typeof commPages)[number]["key"];

export const languageOpts: Opt = [["en", "English"], ["hi", "Hindi"], ["ta", "Tamil"], ["te", "Telugu"], ["kn", "Kannada"], ["ml", "Malayalam"], ["mr", "Marathi"], ["bn", "Bengali"], ["gu", "Gujarati"], ["pa", "Punjabi"], ["ur", "Urdu"]];
export const timezoneOpts: Opt = [
  ["Asia/Kolkata", "(GMT+05:30) India Standard Time"], ["Asia/Kathmandu", "(GMT+05:45) Nepal Time"], ["Asia/Colombo", "(GMT+05:30) Sri Lanka Time"], ["Asia/Dhaka", "(GMT+06:00) Bangladesh Time"],
  ["Asia/Dubai", "(GMT+04:00) Gulf Standard Time"], ["Asia/Riyadh", "(GMT+03:00) Arabia Standard Time"], ["Asia/Singapore", "(GMT+08:00) Singapore Time"], ["Australia/Sydney", "Australia - Sydney"],
  ["Europe/London", "UK - London"], ["America/New_York", "US - Eastern"], ["America/Los_Angeles", "US - Pacific"], ["UTC", "UTC"],
];
export const categoryLabels: Record<string, string> = {
  ADMISSIONS: "Admissions", ATTENDANCE: "Attendance", EXAMINATIONS: "Examinations", FEES: "Fees & Payments", TRANSPORT: "Transport", LIBRARY: "Library",
  ANNOUNCEMENTS: "Announcements", EVENTS: "Events & Activities", MARKETING: "Marketing / Newsletters", EMERGENCY: "Emergency Alerts", GENERAL: "General",
};
export const categoryOpts = (keys: string[]): Opt => keys.map((k) => [k, categoryLabels[k]] as const);
export const dayOpts: Opt = [["MONDAY", "Mon"], ["TUESDAY", "Tue"], ["WEDNESDAY", "Wed"], ["THURSDAY", "Thu"], ["FRIDAY", "Fri"], ["SATURDAY", "Sat"], ["SUNDAY", "Sun"]];
export const soundOpts: Opt = [["DEFAULT", "Default"], ["CHIME", "Chime"], ["BELL", "Bell"], ["SILENT", "Silent"]];
export const sendTimeOpts: Opt = [["IMMEDIATE", "Immediate"], ["SCHEDULED", "Scheduled"]];

/* ------------------------------------------------------------------ a group of settings (one backend "section") */

export type Section = {
  name: string; loaded: boolean; loading: boolean; saving: boolean; loadError: string; dirty: boolean; errors: Record<string, string>;
  str: (k: string) => string; bool: (k: string) => boolean; list: (k: string) => string[];
  set: (k: string, v: string | number | boolean | string[]) => void;
  save: () => Promise<string | null>;
  reset: () => void;
  reload: () => Promise<void>;
};

export function useCommSection(name: string, institutionId: number | null): Section {
  const [values, setValues] = useState<Record<string, string>>({});
  const [original, setOriginal] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(institutionId !== null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reload = useCallback(async () => {
    if (institutionId === null) { setValues({}); setOriginal({}); setLoading(false); return; }
    setLoading(true);
    try {
      const v = await api.communication.settings(name);
      setValues(v); setOriginal(v); setErrors({}); setLoadError("");
    } catch (e) { setLoadError(errText(e)); } finally { setLoading(false); }
  }, [name, institutionId]);
  useEffect(() => { void reload(); }, [reload]);

  const set = useCallback((k: string, v: string | number | boolean | string[]) => {
    setValues((cur) => ({ ...cur, [k]: Array.isArray(v) ? v.join(",") : String(v) }));
    setErrors((cur) => { if (!(k in cur)) return cur; const n = { ...cur }; delete n[k]; return n; });
  }, []);

  const save = useCallback(async (): Promise<string | null> => {
    setSaving(true);
    try {
      const v = await api.communication.saveSettings(name, values);
      setValues(v); setOriginal(v); setErrors({});
      return null;
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.fieldErrors);
      return errText(e);
    } finally { setSaving(false); }
  }, [name, values]);

  return {
    name, loaded: Object.keys(values).length > 0, loading, saving, loadError, errors,
    dirty: JSON.stringify(values) !== JSON.stringify(original),
    str: (k) => values[k] ?? "",
    bool: (k) => values[k] === "true",
    list: (k) => (values[k] ? values[k].split(",").filter(Boolean) : []),
    set, save, reset: () => { setValues(original); setErrors({}); }, reload,
  };
}

/** Saves several sections one after another; returns the first error message, or null when all saved. */
export async function saveAll(list: Section[]): Promise<string | null> {
  for (const s of list) { const e = await s.save(); if (e) return e; }
  return null;
}

/* ------------------------------------------------------------------ form controls bound to a Section */

const FieldError = ({ s, k }: { s: Section; k: string }) => (s.errors[k] ? <div className="mt-0.5 text-[9px] font-semibold text-rose-600">{s.errors[k]}</div> : null);

type Base = { s: Section; k: string; label: string; required?: boolean; optional?: boolean; className?: string };

export function TextF({ s, k, label, required, optional, className, type = "text", placeholder, max }: Base & { type?: string; placeholder?: string; max?: number }) {
  return (
    <Field label={label} required={required} optional={optional} className={className}>
      <input type={type} className={controlClass} value={s.str(k)} maxLength={max} placeholder={placeholder} onChange={(e) => s.set(k, e.target.value)} />
      <FieldError s={s} k={k} />
    </Field>
  );
}
export function AreaF({ s, k, label, required, optional, className, max, rows = 4, placeholder }: Base & { max?: number; rows?: number; placeholder?: string }) {
  return (
    <Field label={label} required={required} optional={optional} className={className}>
      <textarea className={textareaClass} rows={rows} maxLength={max} placeholder={placeholder} value={s.str(k)} onChange={(e) => s.set(k, e.target.value)} />
      <FieldError s={s} k={k} />
    </Field>
  );
}
export function NumF({ s, k, label, required, className, min, max, suffix }: Base & { min?: number; max?: number; suffix?: string }) {
  return (
    <Field label={label} required={required} className={className}>
      <div className="flex items-center gap-2">
        <input type="number" min={min} max={max} className={controlClass} value={s.str(k)} onChange={(e) => s.set(k, e.target.value)} />
        {suffix && <span className="shrink-0 text-[10px] text-slate-500">{suffix}</span>}
      </div>
      <FieldError s={s} k={k} />
    </Field>
  );
}
export function TimeF({ s, k, label, className, disabled }: Base & { disabled?: boolean }) {
  return (
    <Field label={label} className={className}>
      <input type="time" className={controlClass} value={s.str(k)} disabled={disabled} onChange={(e) => s.set(k, e.target.value)} />
      <FieldError s={s} k={k} />
    </Field>
  );
}
export function SelF({ s, k, label, options, required, className, disabled }: Base & { options: Opt; disabled?: boolean }) {
  const cur = s.str(k);
  const known = options.some(([v]) => v === cur);
  return (
    <Field label={label} required={required} className={className}>
      <select className={controlClass} value={cur} disabled={disabled} onChange={(e) => s.set(k, e.target.value)}>
        {!known && cur && <option value={cur}>{cur}</option>}
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <FieldError s={s} k={k} />
    </Field>
  );
}
export function SecretF({ s, k, label, required, className, placeholder }: Base & { placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} required={required} className={className}>
      <div className="relative">
        <input type={show ? "text" : "password"} autoComplete="new-password" className={`${controlClass} pr-8`} value={s.str(k)} placeholder={placeholder}
          onFocus={(e) => { if (e.target.value === "********") s.set(k, ""); }} onChange={(e) => s.set(k, e.target.value)} />
        <button type="button" aria-label={show ? "Hide" : "Show"} onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600">
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      <FieldError s={s} k={k} />
    </Field>
  );
}
export function Sw({ s, k, label }: { s: Section; k: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#e1ecfa] bg-white px-3 py-2">
      <span className="text-[11px] font-semibold text-[#17245e]">{label}</span>
      <Toggle checked={s.bool(k)} onChange={(v) => s.set(k, v)} label="" />
    </div>
  );
}
export function Chk({ s, k, label, disabled }: { s: Section; k: string; label: string; disabled?: boolean }) {
  return (
    <label className={`flex items-center gap-2 text-[11px] text-[#17265f] ${disabled ? "opacity-50" : ""}`}>
      <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" disabled={disabled} checked={s.bool(k)} onChange={(e) => s.set(k, e.target.checked)} /> {label}
    </label>
  );
}
export function ChkList({ s, k, options, cols = 1 }: { s: Section; k: string; options: Opt; cols?: 1 | 2 | 3 | 4 }) {
  const cur = s.list(k);
  const grid = cols === 4 ? "sm:grid-cols-4" : cols === 3 ? "sm:grid-cols-3" : cols === 2 ? "sm:grid-cols-2" : "";
  return (
    <div>
      <div className={`grid grid-cols-1 gap-2 ${grid}`}>
        {options.map(([v, l]) => (
          <label key={v} className="flex items-center gap-2 text-[11px] text-[#17265f]">
            <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={cur.includes(v)} onChange={() => s.set(k, cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v])} /> {l}
          </label>
        ))}
      </div>
      <FieldError s={s} k={k} />
    </div>
  );
}

export function SaveRow({ onSave, onCancel, saving, disabled, saveLabel = "Save" }: { onSave: () => void; onCancel?: () => void; saving: boolean; disabled?: boolean; saveLabel?: string }) {
  return (
    <div className="flex justify-end gap-2.5 px-4 pb-4 pt-1">
      {onCancel && <OutlineButton type="button" onClick={onCancel} disabled={saving}>Cancel</OutlineButton>}
      <PrimaryButton type="button" onClick={onSave} disabled={saving || disabled}>{saving ? "Saving..." : saveLabel}</PrimaryButton>
    </div>
  );
}

/* ------------------------------------------------------------------ page frame */

export function CommNav({ active }: { active: CommPageKey }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wide text-[#53658f]">Communication Settings</span>
      {commPages.map((p) => (
        <Link key={p.key} to={p.path} aria-current={active === p.key ? "page" : undefined}
          className={`rounded-full border px-3 py-1 text-[10px] font-semibold transition ${active === p.key ? "border-blue-600 bg-blue-600 text-white" : "border-[#cfe0f5] bg-white text-[#34467a] hover:border-blue-300 hover:bg-blue-50"}`}>
          {p.label}
        </Link>
      ))}
    </div>
  );
}

export function CommFrame<T extends string>({ step, title, subtitle, crumb, nav, inst, tabs, tab, onTab, error, notice, loadError, children }: {
  step: number; title: string; subtitle: string; crumb: string; nav: CommPageKey; inst: ActiveInstitution;
  tabs: readonly { key: T; label: string }[]; tab: T; onTab: (k: T) => void;
  error: string; notice: string; loadError?: string; children: ReactNode;
}) {
  return (
    <AdminLayout activeItem="Institutions">
      <div className="space-y-3">
        <AcademicHeader step={step} title={title} subtitle={subtitle} right={<ContextBar inst={inst} />} />
        <Breadcrumb trail={["Institutions", "Institution Settings", "Communication Settings", crumb]} />
        <CommNav active={nav} />
        <div className="overflow-x-auto">
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(110px, 1fr))` }}>
            {tabs.map(({ key, label }) => (
              <button key={key} type="button" onClick={() => onTab(key)} aria-current={tab === key ? "page" : undefined}
                className={`rounded-md border px-3 py-2 text-center text-[10px] font-semibold transition ${tab === key ? "border-blue-500 bg-[#dcecff] text-blue-800 shadow-[inset_0_-2px_0_#1478f8]" : "border-[#cfe0f5] bg-white text-[#34467a] hover:border-blue-300 hover:bg-blue-50"}`}>{label}</button>
            ))}
          </div>
        </div>
        {error && <Notice tone="error"><span className="font-bold">Please review:</span> {error}</Notice>}
        {loadError && <Notice tone="error">{loadError}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}
        {inst.institutionId === null && <Notice tone="info">{inst.isSuper ? "Create an institution first, then choose it above." : "Your account isn't linked to an institution."}</Notice>}
        {children}
        <footer className="pb-1 pt-0.5 text-center text-[10px] text-slate-400">© {new Date().getFullYear()} Centram Classzy · School Management Platform</footer>
      </div>
    </AdminLayout>
  );
}
