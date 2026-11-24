import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { api } from "../../services/api";
import type { AdmOptions, StuPage } from "../../services/api";
import { Notice, controlClass } from "../super-admin/AcademicShared";
import { errText } from "../super-admin/SettingsShared";
import SchoolLayout from "./SchoolLayout";

export const StatusPill = ({ active }: { active: boolean }) => <span className={`inline-block rounded-md px-4 py-1.5 text-[12px] font-semibold ${active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{active ? "Active" : "Inactive"}</span>;

export default function Students() {
  const nav = useNavigate();
  const [opts, setOpts] = useState<AdmOptions | null>(null);
  const [yearId, setYearId] = useState<number | null>(null);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [qLive, setQLive] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<StuPage | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.admissions.options().then((o) => { setOpts(o); setYearId(o.years.find((y) => y.current)?.id ?? o.years[0]?.id ?? null); }).catch((e) => setError(errText(e)));
  }, []);
  useEffect(() => { const t = setTimeout(() => { setQ(qLive); setPage(0); }, 300); return () => clearTimeout(t); }, [qLive]);

  const load = useCallback(async () => {
    if (!opts) return;
    try { setData(await api.schoolStudents.list({ yearId, classId: classId ? Number(classId) : null, sectionId: sectionId ? Number(sectionId) : null, status: status || undefined, q: q || undefined }, page)); setError(""); }
    catch (e) { setError(errText(e)); }
  }, [opts, yearId, classId, sectionId, status, q, page]);
  useEffect(() => { void load(); }, [load]);

  const classes = (opts?.classes ?? []).filter((c) => c.yearId === yearId);
  const sections = (opts?.sections ?? []).filter((s) => classId ? s.classId === Number(classId) : classes.some((c) => c.id === s.classId));
  const last = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1;
  const nums = Array.from({ length: Math.min(5, last) }, (_, k) => Math.max(0, Math.min(page - 2, last - 5)) + k).filter((n) => n < last);
  const sel = "mt-1.5 w-full";

  return (
    <SchoolLayout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[28px] font-extrabold tracking-[-0.5px] text-[#101b69]">Student Management</h1>
          <button type="button" onClick={() => nav("/school/students/new")} className="inline-flex items-center gap-2 rounded-lg bg-[#0875fb] px-5 py-3 text-[14px] font-semibold text-white hover:bg-blue-700"><Plus size={16} />Add Student</button>
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        {opts && opts.years.length === 0 && <Notice tone="info">This school has no academic year yet. Set one up with grades and sections to start adding students.</Notice>}

        <div className="grid gap-4 rounded-xl border border-[#d8e9fb] bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-[13px] font-bold text-[#101b69]">Academic Year<select value={yearId ?? ""} onChange={(e) => { setYearId(e.target.value ? Number(e.target.value) : null); setClassId(""); setSectionId(""); setPage(0); }} className={`${controlClass} ${sel}`}>{opts?.years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</select></label>
          <label className="text-[13px] font-bold text-[#101b69]">Grade<select value={classId} onChange={(e) => { setClassId(e.target.value); setSectionId(""); setPage(0); }} className={`${controlClass} ${sel}`}><option value="">All</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="text-[13px] font-bold text-[#101b69]">Section<select value={sectionId} onChange={(e) => { setSectionId(e.target.value); setPage(0); }} className={`${controlClass} ${sel}`}><option value="">All</option>{Array.from(new Map(sections.map((s) => [s.id, s])).values()).map((s) => <option key={s.id} value={s.id}>{classId ? s.name : `${classes.find((c) => c.id === s.classId)?.name} - ${s.name}`}</option>)}</select></label>
          <label className="text-[13px] font-bold text-[#101b69]">Status<select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className={`${controlClass} ${sel}`}><option value="">All{data ? ` (${data.active + data.inactive})` : ""}</option><option value="ACTIVE">Active{data ? ` (${data.active})` : ""}</option><option value="INACTIVE">Inactive{data ? ` (${data.inactive})` : ""}</option></select></label>
        </div>

        <label className="relative block"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" /><input value={qLive} onChange={(e) => setQLive(e.target.value)} placeholder="Search by name, student ID or guardian" className="h-12 w-full rounded-xl border border-[#d8e9fb] bg-white pl-11 pr-4 text-[14px] outline-none focus:border-blue-400" /></label>

        <div className="overflow-x-auto rounded-xl border border-[#d8e9fb] bg-white">
          <table className="w-full border-collapse text-left text-[14px]" style={{ minWidth: 620 }}>
            <thead><tr className="bg-[#eef5fe] text-[#101b69]">{["Student ID", "Student Name", "Grade", "Section", "Status", ""].map((h) => <th key={h} className="border-b border-[#d8e9fb] px-5 py-4 font-bold">{h}</th>)}</tr></thead>
            <tbody>
              {data?.items.map((s) => (
                <tr key={s.id} className="border-b border-[#e8f1fd] last:border-0 hover:bg-[#f7faff]"><td className="px-5 py-4 text-[#17245e]">{s.admissionNo}</td><td className="px-5 py-4 font-medium text-[#17245e]">{s.name}</td><td className="px-5 py-4 text-[#17245e]">{s.grade ?? "—"}</td><td className="px-5 py-4 text-[#17245e]">{s.section ?? "—"}</td><td className="px-5 py-4"><StatusPill active={s.active} /></td>
                  <td className="px-5 py-4 text-right"><button type="button" onClick={() => nav(`/school/students/${s.id}`)} className="rounded-md bg-[#0875fb] px-6 py-2 text-[13px] font-semibold text-white hover:bg-blue-700">View</button></td></tr>
              ))}
              {data && data.items.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-[13px] text-slate-500">{data.active + data.inactive === 0 ? "No students match. Admitted applicants appear here automatically, or add one with Add Student." : "No students match these filters."}</td></tr>}
              {!data && !error && <tr><td colSpan={6} className="px-5 py-12 text-center text-[13px] text-slate-500">Loading…</td></tr>}
            </tbody>
          </table>
        </div>

        {data && data.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[12px] text-slate-500">Showing {page * data.size + 1}-{Math.min(data.total, (page + 1) * data.size)} of {data.total.toLocaleString("en-IN")}</span>
            <div className="flex items-center gap-1.5">
              <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => setPage(page - 1)} className="h-9 w-9 rounded-md border border-[#cfe0f6] bg-white text-[#17245e] disabled:opacity-40">‹</button>
              {nums.map((n) => <button key={n} type="button" onClick={() => setPage(n)} className={`h-9 w-9 rounded-md border text-[13px] font-semibold ${n === page ? "border-[#0875fb] bg-[#0875fb] text-white" : "border-[#cfe0f6] bg-white text-[#17245e]"}`}>{n + 1}</button>)}
              <button type="button" aria-label="Next page" disabled={page >= last - 1} onClick={() => setPage(page + 1)} className="h-9 w-9 rounded-md border border-[#cfe0f6] bg-white text-[#17245e] disabled:opacity-40">›</button>
            </div>
          </div>
        )}
      </div>
    </SchoolLayout>
  );
}
