import { useEffect, useMemo, useState } from "react";
import { Save, Play, X } from "lucide-react";
import { api } from "../../services/api";
import type { RptOptions, RptSaved, RptTable } from "../../services/api";
import { Field, Notice, OutlineButton, PrimaryButton, controlClass } from "../super-admin/AcademicShared";
import { errText } from "../super-admin/SettingsShared";
import { downloadReport } from "../super-admin/ReportExport";
import SchoolLayout from "./SchoolLayout";

type Tab = "Student" | "Admission" | "Fee" | "Academic" | "Custom";
const TABS: Tab[] = ["Student", "Admission", "Fee", "Academic", "Custom"];
const fieldErrs = (e: unknown) => { const fe = (e as { fieldErrors?: Record<string, string> }).fieldErrors; return fe && Object.keys(fe).length ? fe : null; };
const num = (v: string) => (v ? Number(v) : null);
const csvOf = (t: RptTable) => [t.columns, ...t.rows, ...(t.total ? [t.total] : [])].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");

type Filters = { yearId: number | null; classId: number | null; sectionId: number | null; termId: number | null; subjectId: number | null };
const SHOW: Record<Exclude<Tab, "Custom">, { year: string; grade: boolean; section: boolean; term: boolean; subject: boolean }> = {
  Student: { year: "Academic Year", grade: true, section: true, term: false, subject: false },
  Admission: { year: "Intake", grade: true, section: false, term: false, subject: false },
  Fee: { year: "Academic Year", grade: true, section: false, term: true, subject: false },
  Academic: { year: "Academic Year", grade: true, section: false, term: false, subject: true },
};

function FilterBar({ opts, f, set, show }: { opts: RptOptions; f: Filters; set: (p: Partial<Filters>) => void; show: { year: string; grade: boolean; section: boolean; term: boolean; subject: boolean } }) {
  const classes = opts.classes.filter((c) => f.yearId === null || c.yearId === f.yearId);
  const sections = opts.sections.filter((s) => s.classId === f.classId);
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label={show.year}><select value={f.yearId ?? ""} onChange={(e) => set({ yearId: num(e.target.value), classId: null, sectionId: null, termId: null, subjectId: null })} className={controlClass}><option value="">All</option>{opts.years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</select></Field>
      {show.term && <Field label="Term"><select value={f.termId ?? ""} onChange={(e) => set({ termId: num(e.target.value) })} className={controlClass}><option value="">All</option>{opts.terms.filter((t) => f.yearId === null || t.yearId === f.yearId).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>}
      {show.grade && <Field label="Grade"><select value={f.classId ?? ""} onChange={(e) => set({ classId: num(e.target.value), sectionId: null })} className={controlClass}><option value="">All</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>}
      {show.section && <Field label="Section"><select value={f.sectionId ?? ""} disabled={f.classId === null} onChange={(e) => set({ sectionId: num(e.target.value) })} className={controlClass}><option value="">All</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>}
      {show.subject && <Field label="Subject"><select value={f.subjectId ?? ""} onChange={(e) => set({ subjectId: num(e.target.value) })} className={controlClass}><option value="">All</option>{opts.subjects.filter((s) => f.yearId === null || s.yearId === f.yearId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>}
    </div>
  );
}

function ReportCard({ group, items, busy, onGenerate }: { group: string; items: RptOptions["reports"]; busy: boolean; onGenerate: (code: string) => void }) {
  const [code, setCode] = useState(items[0]?.code ?? "");
  const sel = items.find((i) => i.code === code) ?? items[0];
  return (
    <div className="space-y-3 rounded-xl border border-[#d8e9fb] bg-[#fbfdff] p-4">
      <h3 className="text-[17px] font-extrabold text-[#101b69]">{group}</h3>
      <select value={code} onChange={(e) => setCode(e.target.value)} aria-label={group} className={controlClass}>{items.map((i) => <option key={i.code} value={i.code}>{i.label}{i.available ? "" : " (not available)"}</option>)}</select>
      {sel && !sel.available && <p className="text-[11px] text-amber-700">{sel.reason}</p>}
      <PrimaryButton type="button" className="w-full justify-center py-2.5 text-[13px]" disabled={busy || !sel?.available} onClick={() => sel && onGenerate(sel.code)}>Generate</PrimaryButton>
    </div>
  );
}

function CustomBuilder({ opts, onResult, onError, flash }: { opts: RptOptions; onResult: (t: RptTable) => void; onError: (m: string) => void; flash: (m: string) => void }) {
  const [name, setName] = useState("");
  const [source, setSource] = useState(opts.sources[0]?.code ?? "");
  const [cols, setCols] = useState<string[]>([]);
  const [f, setF] = useState<Filters>({ yearId: opts.years.find((y) => y.current)?.id ?? null, classId: null, sectionId: null, termId: null, subjectId: null });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<RptSaved[]>([]);
  const [busy, setBusy] = useState(false);
  const src = opts.sources.find((s) => s.code === source);
  const loadSaved = () => { api.schoolReports.saved().then(setSaved).catch((e) => onError(errText(e))); };
  useEffect(loadSaved, []); // eslint-disable-line react-hooks/exhaustive-deps
  const body = { name, source, columns: cols, yearId: f.yearId, classId: f.classId, sectionId: f.sectionId };
  const guard = async (fn: () => Promise<void>) => { setBusy(true); setErrs({}); try { await fn(); } catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else onError(errText(e)); } finally { setBusy(false); } };
  const hasSection = source !== "APPLICATIONS";
  const toggle = (k: string) => setCols((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-3">
          <Field label="Report Name" required><input value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="e.g. Student Enrollment - Custom" className={controlClass} />{errs.name && <p className="mt-1 text-[10px] text-rose-600">{errs.name}</p>}</Field>
          <Field label="Data Source" required><select value={source} onChange={(e) => { setSource(e.target.value); setCols([]); setErrs({}); }} className={controlClass}>{opts.sources.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}</select>{errs.source && <p className="mt-1 text-[10px] text-rose-600">{errs.source}</p>}</Field>
          <Field label="Columns" required>
            <div className="flex flex-wrap gap-1.5 rounded-lg border border-[#cfe0f6] bg-white p-2">
              {src?.columns.map((c) => <button key={c.key} type="button" aria-pressed={cols.includes(c.key)} onClick={() => toggle(c.key)} className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${cols.includes(c.key) ? "border-[#0875fb] bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{c.label}{c.aggregate ? " (total)" : ""}</button>)}
            </div>
            <p className="mt-1 text-[10px] text-slate-500">Choosing a "total" column groups the other columns and counts or adds up the rest. Per-row amounts can't be mixed with totals.</p>
            {errs.columns && <p className="mt-1 text-[10px] text-rose-600">{errs.columns}</p>}
          </Field>
          <div className="flex flex-wrap gap-1.5">{cols.map((k) => <span key={k} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px]">{src?.columns.find((c) => c.key === k)?.label}<button type="button" aria-label="Remove" onClick={() => toggle(k)}><X size={11} /></button></span>)}</div>
        </div>
        <div className="space-y-3">
          <p className="text-[12px] font-bold text-[#17245e]">Filters</p>
          <FilterBar opts={opts} f={f} set={(p) => setF({ ...f, ...p })} show={{ year: source === "APPLICATIONS" ? "Intake Year" : "Academic Year", grade: true, section: hasSection, term: false, subject: false }} />
          <div className="rounded-lg border border-[#e3eefc] bg-[#f8fbff] p-3"><p className="mb-1.5 text-[12px] font-bold text-[#17245e]">Saved reports</p>
            {saved.length === 0 ? <p className="text-[11px] text-slate-500">Nothing saved yet.</p> : <ul className="space-y-1">{saved.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 text-[12px]"><button type="button" className="truncate font-semibold text-blue-600 hover:underline" onClick={() => { setName(s.name); setSource(s.source); setCols(s.columns); setF({ yearId: s.yearId, classId: s.classId, sectionId: s.sectionId, termId: null, subjectId: null }); setErrs({}); }}>{s.name}</button>
                <button type="button" aria-label={`Delete ${s.name}`} className="text-slate-400 hover:text-rose-600" onClick={() => { if (window.confirm(`Delete the saved report "${s.name}"?`)) void guard(async () => { await api.schoolReports.remove(s.id); loadSaved(); }); }}><X size={13} /></button></li>))}</ul>}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <OutlineButton type="button" disabled={busy} onClick={() => void guard(async () => { await api.schoolReports.save(body); flash("Report saved."); loadSaved(); })}><Save size={13} />Save Report</OutlineButton>
        <PrimaryButton type="button" disabled={busy} onClick={() => void guard(async () => { onResult(await api.schoolReports.runCustom(body)); })}><Play size={13} />Run Report</PrimaryButton>
      </div>
    </div>
  );
}

export default function Reports() {
  const [tab, setTab] = useState<Tab>("Student");
  const [opts, setOpts] = useState<RptOptions | null>(null);
  const [f, setF] = useState<Filters>({ yearId: null, classId: null, sectionId: null, termId: null, subjectId: null });
  const [table, setTable] = useState<RptTable | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.schoolReports.options().then((o) => { setOpts(o); setF((x) => ({ ...x, yearId: o.years.find((y) => y.current)?.id ?? o.years[0]?.id ?? null })); }).catch((e) => setError(errText(e))); }, []);
  const groups = useMemo(() => {
    const m = new Map<string, RptOptions["reports"]>();
    (opts?.reports ?? []).filter((r) => r.tab === tab).forEach((r) => m.set(r.group, [...(m.get(r.group) ?? []), r]));
    return [...m.entries()];
  }, [opts, tab]);
  const flash = (m: string) => { setNotice(m); setError(""); setTimeout(() => setNotice(""), 5000); };
  const generate = async (report: string) => { setBusy(true); setError(""); try { setTable(await api.schoolReports.run({ report, ...f })); } catch (e) { setError(errText(e)); } finally { setBusy(false); } };

  return (
    <SchoolLayout>
      <div className="space-y-4">
        <h1 className="text-[28px] font-extrabold tracking-[-0.5px] text-[#101b69]">Reports</h1>
        <div className="flex flex-wrap gap-2">{TABS.map((t) => <button key={t} type="button" onClick={() => { setTab(t); setError(""); }} className={`rounded-lg px-5 py-2.5 text-[14px] font-semibold ${tab === t ? "bg-[#0875fb] text-white" : "text-[#101b69] hover:bg-blue-50"}`}>{t} Reports</button>)}</div>
        {error && <Notice tone="error">{error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}
        {!opts && !error && <p className="text-[13px] text-slate-500">Loading…</p>}
        {opts && (
          <section className="space-y-4 rounded-xl border border-[#d8e9fb] bg-white p-5">
            {tab !== "Custom" ? (
              <>
                <FilterBar opts={opts} f={f} set={(p) => setF({ ...f, ...p })} show={SHOW[tab]} />
                {tab === "Academic" && <p className="text-[11px] text-slate-500">Academic reports use marks entered against assignments. Exam results will appear once Examinations is built.</p>}
                <div className="grid gap-4 md:grid-cols-2">{groups.map(([g, items]) => <div key={g}><ReportCard group={g} items={items} busy={busy} onGenerate={(c) => void generate(c)} /></div>)}</div>
              </>
            ) : <CustomBuilder opts={opts} onResult={setTable} onError={(m) => setError(m)} flash={flash} />}
          </section>
        )}

        <section className="space-y-3 rounded-xl border border-[#d8e9fb] bg-white p-5">
          <h2 className="text-[20px] font-extrabold text-[#101b69]">Report Preview</h2>
          {!table ? <p className="py-6 text-center text-[12px] text-slate-500">Generate a report to preview it here.</p> : (
            <>
              <div className="rounded-lg border border-[#cfe0f6] bg-[#fbfdff] px-4 py-3"><div className="text-[18px] font-extrabold text-[#101b69]">{table.title}</div><div className="text-[12px] text-slate-600">{table.subtitle}</div></div>
              <div className="overflow-x-auto rounded-lg border border-[#cfe0f6]">
                <table className="w-full border-collapse text-left text-[13px]">
                  <thead><tr className="bg-[#e8f1fd] text-[#13205f]">{table.columns.map((c, i) => <th key={c + i} className={`border-b border-[#cfe0f6] px-4 py-2.5 font-bold ${table.numeric[i] ? "text-right" : ""}`}>{c}</th>)}</tr></thead>
                  <tbody>
                    {table.rows.length === 0 && <tr><td colSpan={table.columns.length} className="px-4 py-8 text-center text-[12px] text-slate-500">No records match these filters.</td></tr>}
                    {table.rows.map((r, ri) => <tr key={ri}>{r.map((c, i) => <td key={i} className={`border-b border-[#e3eefc] px-4 py-2 ${table.numeric[i] ? "text-right tabular-nums" : ""}`}>{c}</td>)}</tr>)}
                    {table.total && table.rows.length > 0 && <tr className="bg-[#e8f1fd] font-extrabold">{table.total.map((c, i) => <td key={i} className={`px-4 py-2.5 ${table.numeric[i] ? "text-right tabular-nums" : ""}`}>{c}</td>)}</tr>}
                  </tbody>
                </table>
              </div>
              {table.note && <p className="text-[11px] text-slate-500">{table.note}</p>}
              <div className="flex flex-wrap justify-end gap-2">
                <OutlineButton type="button" disabled={table.rows.length === 0} onClick={() => downloadReport(table.title, csvOf(table), "CSV")}>Export CSV</OutlineButton>
                <PrimaryButton type="button" disabled={table.rows.length === 0} onClick={() => downloadReport(table.title, csvOf(table), "EXCEL")}>Export Excel</PrimaryButton>
                <PrimaryButton type="button" disabled={table.rows.length === 0} onClick={() => downloadReport(table.title, csvOf(table), "PDF")}>Export PDF</PrimaryButton>
              </div>
              <p className="text-[10px] text-slate-400">Excel export is a spreadsheet file Excel opens directly. PDF opens your browser's print dialog; choose "Save as PDF".</p>
            </>
          )}
        </section>
      </div>
    </SchoolLayout>
  );
}
