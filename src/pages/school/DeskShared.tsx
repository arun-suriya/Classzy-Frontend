import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { ExTable } from "../../services/api";
import { Field, OutlineButton, PrimaryButton, controlClass } from "../super-admin/AcademicShared";
import { downloadReport } from "../super-admin/ReportExport";
import { errText } from "../super-admin/SettingsShared";

/** Helpers shared by the Attendance, Staff and Transport desks. */
export const fieldErrs = (e: unknown) => { const fe = (e as { fieldErrors?: Record<string, string> }).fieldErrors; return fe && Object.keys(fe).length ? fe : null; };
export const FieldErr = ({ errs, k }: { errs: Record<string, string>; k: string }) => (errs[k] ? <p className="mt-1 text-[10px] text-rose-600">{errs[k]}</p> : null);
export const csvOf = (t: ExTable) => [t.columns, ...t.rows, ...(t.total ? [t.total] : [])].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
export const tint = (map: Record<string, [string, string]>, key: string | null | undefined, fallback = "—") => { const m = key ? map[key] : undefined; return <span className={`inline-block whitespace-nowrap rounded-md px-3 py-1 text-[11px] font-semibold ${m ? m[1] : "bg-slate-100 text-slate-600"}`}>{m ? m[0] : key ?? fallback}</span>; };
export const t12 = (t: string | null | undefined) => { if (!t) return "—"; const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
export const shortDay = (iso: string | null | undefined) => { if (!iso) return "—"; const [y, m, d] = iso.slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); };

export function Tabs<T extends string>({ tabs, active, onPick }: { tabs: readonly T[]; active: T | null; onPick: (t: T) => void }) {
  return <div className="flex flex-wrap gap-2">{tabs.map((t) => <button key={t} type="button" onClick={() => onPick(t)} className={`rounded-lg px-5 py-2.5 text-[14px] font-semibold ${active === t ? "bg-[#0875fb] text-white" : "text-[#101b69] hover:bg-blue-50"}`}>{t}</button>)}</div>;
}

export function Kpi({ icon, value, label, tone, sub }: { icon: ReactNode; value: ReactNode; label: string; tone: string; sub?: string }) {
  return <div className={`flex items-center gap-3 rounded-xl border border-white p-4 ${tone}`}>{icon}<div><div className="text-[24px] font-extrabold leading-none text-[#101b69]">{value}</div><div className="text-[12px] text-slate-600">{label}</div>{sub && <div className="text-[11px] font-semibold text-slate-500">{sub}</div>}</div></div>;
}

/** A generated report with Excel / PDF export. */
export function ReportView({ t, empty }: { t: ExTable; empty: string }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-[#cfe0f6] bg-[#fbfdff] px-4 py-3"><div className="text-[18px] font-extrabold text-[#101b69]">{t.title}</div><div className="text-[12px] text-slate-600">{t.subtitle}</div></div>
      <div className="overflow-x-auto rounded-lg border border-[#cfe0f6]"><table className="w-full border-collapse text-left text-[13px]">
        <thead><tr className="bg-[#e8f1fd] text-[#13205f]">{t.columns.map((h, i) => <th key={i} className={`border-b border-[#cfe0f6] px-4 py-2.5 font-bold ${t.numeric[i] ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
        <tbody>
          {t.rows.length === 0 && <tr><td colSpan={t.columns.length} className="px-4 py-8 text-center text-[12px] text-slate-500">{empty}</td></tr>}
          {t.rows.map((r, ri) => <tr key={ri}>{r.map((v, i) => <td key={i} className={`border-b border-[#e3eefc] px-4 py-2 ${t.numeric[i] ? "text-right tabular-nums" : ""}`}>{v}</td>)}</tr>)}
          {t.total && t.rows.length > 0 && <tr className="bg-[#e8f1fd] font-extrabold">{t.total.map((v, i) => <td key={i} className={`px-4 py-2.5 ${t.numeric[i] ? "text-right tabular-nums" : ""}`}>{v}</td>)}</tr>}
        </tbody></table></div>
      {t.note && <p className="text-[11px] text-slate-500">{t.note}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <OutlineButton type="button" disabled={t.rows.length === 0} onClick={() => downloadReport(t.title, csvOf(t), "EXCEL")}>Export Excel</OutlineButton>
        <PrimaryButton type="button" disabled={t.rows.length === 0} onClick={() => downloadReport(t.title, csvOf(t), "PDF")}>Export PDF</PrimaryButton>
      </div>
    </div>
  );
}

/** Grade → section → student chooser. */
export function StudentPicker({ classes, sections, fetchStudents, value, onChange, error }: {
  classes: { id: number; name: string }[]; sections: { id: number; classId: number; name: string }[];
  fetchStudents: (sectionId: number) => Promise<{ id: number; label: string }[]>;
  value: number | null; onChange: (id: number | null) => void; error?: string;
}) {
  const [classId, setClassId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [list, setList] = useState<{ id: number; label: string }[] | null>(null);
  const [problem, setProblem] = useState("");
  useEffect(() => {
    setList(null); setProblem(""); onChange(null);
    if (sectionId === null) return;
    let live = true;
    fetchStudents(sectionId).then((l) => { if (live) setList(l); }).catch((e) => { if (live) setProblem(errText(e)); });
    return () => { live = false; };
  }, [sectionId]); // eslint-disable-line react-hooks/exhaustive-deps
  const secs = sections.filter((s) => s.classId === classId);
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label="Grade" required><select value={classId ?? ""} onChange={(e) => { setClassId(e.target.value ? Number(e.target.value) : null); setSectionId(null); }} className={controlClass}><option value="">Select grade</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <Field label="Section" required><select value={sectionId ?? ""} disabled={classId === null} onChange={(e) => setSectionId(e.target.value ? Number(e.target.value) : null)} className={controlClass}><option value="">Select section</option>{secs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
      <Field label="Student" required><select value={value ?? ""} disabled={list === null} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)} className={controlClass}><option value="">{sectionId === null ? "Pick a section first" : list === null ? "Loading…" : list.length === 0 ? "No students" : "Select student"}</option>{list?.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>{error && <p className="mt-1 text-[10px] text-rose-600">{error}</p>}{problem && <p className="mt-1 text-[10px] text-rose-600">{problem}</p>}</Field>
    </div>
  );
}
