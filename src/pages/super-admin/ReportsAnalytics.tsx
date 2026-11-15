import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Building2, CalendarClock, Download, FileText, GraduationCap, IndianRupee, LayoutGrid, ListChecks, MoreVertical, Pencil, Plus, Receipt, TimerReset, User, Users, X } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../services/api";
import type { GeneratedReport, Institution, ModuleRow, ReportFormat, ReportMetric, ReportOverview, ReportSchedule, ReportTemplateDef } from "../../services/api";
import { DataTable, EmptyRow, Field, Notice, OutlineButton, Panel, PrimaryButton, Toggle, controlClass, tdClass } from "./AcademicShared";
import { errText } from "./SettingsShared";
import { UsersHeader } from "./UserShared";
import { downloadReport } from "./ReportExport";

const tabs = [["OVERVIEW", "Overview"], ["ACADEMIC", "Academic Reports"], ["STUDENT", "Student Reports"], ["TEACHER", "Teacher Reports"], ["FINANCE", "Finance Reports"], ["USAGE", "Usage & Engagement"], ["OPERATIONAL", "Operational Reports"], ["CUSTOM", "Custom Reports"]] as const;
const catLabel: Record<string, string> = { ACADEMIC: "Academic", STUDENT: "Student", TEACHER: "Teacher", FINANCE: "Finance", USAGE: "Usage", OPERATIONAL: "Operational", CUSTOM: "Custom" };
const ranges: [number, string][] = [[7, "Last 7 Days"], [30, "Last 30 Days"], [90, "Last 3 Months"], [180, "Last 6 Months"], [365, "Last 12 Months"]];
const freqLabel: Record<string, string> = { DAILY: "Daily", WEEKLY: "Weekly", MONTHLY: "Monthly" };
const sliceColors = ["#2563eb", "#16a34a", "#f59e0b", "#8b5cf6", "#ec4899", "#94a3b8"];
const tplIcon: Record<string, ReactNode> = { building: <Building2 size={18} />, list: <ListChecks size={18} />, receipt: <Receipt size={18} />, user: <User size={18} />, grid: <LayoutGrid size={18} />, graduation: <GraduationCap size={18} /> };
const tplBox: Record<string, string> = { building: "bg-blue-50 text-blue-600", list: "bg-emerald-50 text-emerald-600", receipt: "bg-orange-50 text-orange-600", user: "bg-violet-50 text-violet-600", grid: "bg-cyan-50 text-cyan-600", graduation: "bg-pink-50 text-pink-600" };

const fmtDT = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }) : "—");
const fmtD = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

function Stat({ label, metric, icon, box, money, note }: { label: string; metric: ReportMetric | undefined; icon: ReactNode; box: string; money?: boolean; note?: string }) {
  const v = metric?.value;
  const c = metric?.change ?? null;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#d8e9fb] bg-white px-4 py-3.5">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg ${box}`}>{icon}</span>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-[#17245e]">{label}</div>
        <div className="text-[22px] font-extrabold leading-7 text-[#101b69]">{v === null || v === undefined ? "—" : money ? `₹${Number(v).toLocaleString("en-IN")}` : Number(v).toLocaleString("en-IN")}</div>
        {note ? <div className="text-[10px] font-semibold text-slate-500">{note}</div>
          : <div className={`text-[10px] font-semibold ${c === null ? "text-slate-500" : c >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{c === null ? "No change data yet" : `${c >= 0 ? "↑" : "↓"} ${Math.abs(c)}% vs last month`}</div>}
      </div>
    </div>
  );
}

function Title({ icon, title, right }: { icon: ReactNode; title: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-3.5">
      <div className="flex items-center gap-2.5"><span className="text-blue-600">{icon}</span><h2 className="text-[14px] font-extrabold tracking-[-0.2px] text-[#101b69]">{title}</h2></div>
      {right}
    </div>
  );
}
const ViewAll = ({ onClick, label = "View All" }: { onClick: () => void; label?: string }) => <button type="button" onClick={onClick} className="text-[11px] font-semibold text-blue-600 hover:underline">{label}</button>;
const Mini = ({ value, onChange, children }: { value: string | number; onChange: (v: string) => void; children: ReactNode }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-md border border-[#d8e9fb] bg-white px-2 py-1 text-[10px] text-[#17245e]">{children}</select>
);
const StatusPill = ({ ok, children }: { ok: boolean; children: ReactNode }) => (
  <span className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-[9px] font-medium ${ok ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-600"}`}><span className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-orange-500"}`} />{children}</span>
);

type SchedForm = { id: number | null; name: string; template: string; format: string; frequency: string; days: number; institutionId: string; recipients: string };

export default function ReportsAnalytics() {
  const [tab, setTab] = useState<string>("OVERVIEW");
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [templates, setTemplates] = useState<ReportTemplateDef[]>([]);
  const [draft, setDraft] = useState({ days: 180, institution: "", module: "", type: "" });
  const [applied, setApplied] = useState(draft);
  const [months, setMonths] = useState(6);
  const [topDays, setTopDays] = useState(30);
  const [data, setData] = useState<ReportOverview | null>(null);
  const [recent, setRecent] = useState<GeneratedReport[]>([]);
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [recentLimit, setRecentLimit] = useState(5);
  const [schedAll, setSchedAll] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [menu, setMenu] = useState<string | null>(null);

  const [tpl, setTpl] = useState("ENROLLMENT");
  const [format, setFormat] = useState<ReportFormat>("PDF");
  const [sched, setSched] = useState(false);
  const [freq, setFreq] = useState("MONTHLY");
  const [rcpt, setRcpt] = useState("");
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<SchedForm | null>(null);
  const [editErrs, setEditErrs] = useState<Record<string, string>>({});
  const exportRef = useRef<HTMLDivElement>(null);

  const flash = (m: string) => { setNotice(m); setTimeout(() => setNotice(""), 4000); };
  const category = tab === "OVERVIEW" || tab === "CUSTOM" ? applied.type || undefined : tab;
  const instId = applied.institution ? Number(applied.institution) : null;

  useEffect(() => { api.institutions.list({ status: "ALL" }).then((l) => setInstitutions(l.filter((i) => i.status !== "ARCHIVED"))).catch(() => { /* filter just stays empty */ }); }, []);
  useEffect(() => { api.modules.overview().then((o) => setModules(o.modules)).catch(() => { /* filter just stays empty */ }); }, []);
  useEffect(() => { api.reports.templates().then(setTemplates).catch((e) => setError(errText(e))); }, []);

  const loadOverview = useCallback(async () => {
    try { setData(await api.reports.overview({ months, topDays, institutionId: instId, module: applied.module })); setError(""); } catch (e) { setError(errText(e)); }
  }, [months, topDays, instId, applied.module]);
  useEffect(() => { void loadOverview(); }, [loadOverview]);

  const loadLists = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([api.reports.recent({ category, limit: recentLimit }), api.reports.schedules(category)]);
      setRecent(r); setSchedules(s);
    } catch (e) { setError(errText(e)); }
  }, [category, recentLimit]);
  useEffect(() => { void loadLists(); }, [loadLists]);

  const apply = () => {
    setApplied(draft);
    setMonths(draft.days >= 365 ? 12 : draft.days >= 180 ? 6 : 3);
    setTopDays(draft.days <= 7 ? 7 : draft.days <= 30 ? 30 : 90);
  };
  const reset = () => { const d = { days: 180, institution: "", module: "", type: "" }; setDraft(d); setApplied(d); setMonths(6); setTopDays(30); };

  const shownTemplates = useMemo(() => (tab === "OVERVIEW" || tab === "CUSTOM" ? templates : templates.filter((t) => t.category === tab)), [templates, tab]);
  const usable = templates.filter((t) => t.available);
  const pick = (t: ReportTemplateDef) => {
    if (!t.available) { setNotice(t.note ?? "Not available."); setTimeout(() => setNotice(""), 4000); return; }
    setTpl(t.code); exportRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const generate = async () => {
    setBusy(true); setErrs({});
    try {
      const r = await api.reports.generate({ template: tpl, format, days: applied.days > 365 ? 365 : applied.days, institutionId: instId, schedule: sched ? { frequency: freq, recipients: rcpt } : null });
      downloadReport(r.report.name, r.csv, r.report.format);
      flash(`${r.report.name} generated (${r.report.rowCount} rows).${r.schedule ? ` Scheduled ${freqLabel[r.schedule.frequency].toLowerCase()}.` : ""}`);
      await loadLists();
    } catch (e) {
      const fe = (e as { fieldErrors?: Record<string, string> }).fieldErrors;
      if (fe) setErrs(fe); else setError(errText(e));
    } finally { setBusy(false); }
  };

  const download = async (r: GeneratedReport, f?: ReportFormat) => {
    setMenu(null);
    try { const c = await api.reports.content(r.id); downloadReport(c.name, c.csv, f ?? c.format); } catch (e) { setError(errText(e)); }
  };
  const act = async (fn: () => Promise<unknown>, ok: string) => { setMenu(null); try { await fn(); flash(ok); await loadLists(); } catch (e) { setError(errText(e)); } };
  const runNow = async (s: ReportSchedule) => {
    setMenu(null);
    try { const r = await api.reports.runSchedule(s.id); downloadReport(r.report.name, r.csv, r.report.format); flash(`${s.name} generated.`); await loadLists(); } catch (e) { setError(errText(e)); }
  };

  const openEdit = (s: ReportSchedule) => { setEditErrs({}); setEdit({ id: s.id, name: s.name, template: s.template, format: s.format, frequency: s.frequency, days: s.rangeDays, institutionId: s.institutionId ? String(s.institutionId) : "", recipients: s.recipients ?? "" }); setMenu(null); };
  const saveEdit = async () => {
    if (!edit || edit.id === null) return;
    try {
      await api.reports.updateSchedule(edit.id, { name: edit.name, template: edit.template, format: edit.format, frequency: edit.frequency, days: edit.days, institutionId: edit.institutionId ? Number(edit.institutionId) : null, recipients: edit.recipients });
      setEdit(null); flash("Schedule updated."); await loadLists();
    } catch (e) { const fe = (e as { fieldErrors?: Record<string, string> }).fieldErrors; if (fe) setEditErrs(fe); else setError(errText(e)); }
  };

  const st = data?.stats;
  const maxTop = Math.max(1, ...(data?.top ?? []).map((t) => t.activeUsers));
  const ferr = (k: string) => (errs[k] ? <p className="mt-1 text-[10px] text-rose-600">{errs[k]}</p> : null);

  return (
    <AdminLayout activeItem="Reports & Analytics">
      <div className="space-y-4" onClick={() => setMenu(null)}>
        <UsersHeader title="Reports & Analytics" subtitle="Get insights across institutions, users, academics, finance and platform usage."
          right={<PrimaryButton onClick={() => exportRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}><Plus size={14} /> Create Report</PrimaryButton>} />
        {error && <Notice tone="error">{error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Stat label="Total Institutions" metric={st?.institutions} icon={<Building2 size={22} />} box="bg-blue-50 text-blue-600" />
          <Stat label="Total Users" metric={st?.users} icon={<Users size={22} />} box="bg-violet-50 text-violet-600" />
          <Stat label="Active Students" metric={st?.students} icon={<GraduationCap size={22} />} box="bg-emerald-50 text-emerald-600" />
          <Stat label="Average Attendance" metric={st?.attendance} icon={<TimerReset size={22} />} box="bg-orange-50 text-orange-600" note="Not tracked yet" />
          <Stat label="Total Revenue (₹)" metric={st?.revenue} icon={<IndianRupee size={22} />} box="bg-indigo-50 text-indigo-600" money />
        </div>

        <Panel>
          <div className="flex flex-wrap border-b border-[#e3eefc] bg-[#f5f9ff] px-2">
            {tabs.map(([k, l]) => <button key={k} type="button" onClick={() => setTab(k)} className={`px-4 py-3 text-[11px] font-semibold ${tab === k ? "border-b-2 border-blue-600 text-blue-600" : "text-[#17245e] hover:text-blue-600"}`}>{l}</button>)}
          </div>
          <div className="flex flex-wrap items-end gap-3 px-4 py-4">
            <Field label="Date Range" className="w-[170px]"><select value={draft.days} onChange={(e) => setDraft({ ...draft, days: Number(e.target.value) })} className={controlClass}>{ranges.map(([d, l]) => <option key={d} value={d}>{l}</option>)}</select></Field>
            <Field label="Institution" className="w-[200px]"><select value={draft.institution} onChange={(e) => setDraft({ ...draft, institution: e.target.value })} className={controlClass}><option value="">All Institutions</option>{institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></Field>
            <Field label="Module" className="w-[180px]"><select value={draft.module} onChange={(e) => setDraft({ ...draft, module: e.target.value })} className={controlClass}><option value="">All Modules</option>{modules.map((m) => <option key={m.code} value={m.code}>{m.name}</option>)}</select></Field>
            <Field label="Report Type" className="w-[170px]"><select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} disabled={tab !== "OVERVIEW" && tab !== "CUSTOM"} className={controlClass}><option value="">All Types</option>{Object.entries(catLabel).filter(([k]) => k !== "CUSTOM").map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <PrimaryButton onClick={apply} className="px-8">Apply</PrimaryButton>
            <button type="button" onClick={reset} className="pb-2 text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>
          </div>
        </Panel>

        {tab === "OVERVIEW" && (
          <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr_1fr]">
            <Panel>
              <Title icon={<Building2 size={17} />} title="Student Enrollment Trend" right={<Mini value={months} onChange={(v) => setMonths(Number(v))}><option value={3}>Last 3 Months</option><option value={6}>Last 6 Months</option><option value={12}>Last 12 Months</option></Mini>} />
              <div className="h-[230px] px-3 pb-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.enrollment ?? []} barGap={2}>
                    <CartesianGrid vertical={false} stroke="#e8f0fb" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#33477c" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#33477c" }} axisLine={false} tickLine={false} width={34} />
                    <Tooltip />
                    <Bar dataKey="fresh" name="New Enrollments" fill="#2563eb" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="total" name="Total Enrollments" fill="#93c5fd" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-5 pb-3 text-[10px] text-[#17245e]"><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#2563eb]" />New Enrollments</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#93c5fd]" />Total Enrollments</span></div>
            </Panel>

            <Panel>
              <Title icon={<BarChart3 size={17} />} title="Module Usage" right={<span className="text-[10px] text-slate-500">Institutions per module</span>} />
              <div className="flex flex-wrap items-center gap-4 px-4 pb-4">
                <div className="relative h-[150px] w-[150px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data && data.modules.length ? data.modules : [{ name: "None", value: 1, percent: 0 }]} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} stroke="#fff" strokeWidth={2} isAnimationActive={false}>
                        {(data && data.modules.length ? data.modules : [{ name: "None" }]).map((m, i) => <Cell key={m.name} fill={data && data.modules.length ? sliceColors[i % sliceColors.length] : "#E2E8F0"} />)}
                      </Pie>
                      {data && data.modules.length > 0 && <Tooltip />}
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><div className="text-[20px] font-extrabold text-[#101b69]">{data?.moduleTotal ?? 0}</div><div className="text-[10px] text-slate-600">Enabled</div></div></div>
                </div>
                <ul className="min-w-[130px] flex-1 space-y-2 text-[11px]">
                  {(data?.modules ?? []).length === 0 ? <li className="text-slate-500">No modules enabled yet.</li> : data?.modules.map((m, i) => (
                    <li key={m.name} className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: sliceColors[i % sliceColors.length] }} /><span className="flex-1 text-[#33477c]">{m.name}</span><span className="font-semibold text-[#17245e]">{m.percent}%</span></li>
                  ))}
                </ul>
              </div>
            </Panel>

            <Panel>
              <Title icon={<Building2 size={17} />} title="Top Institutions by Active Users" right={<Mini value={topDays} onChange={(v) => setTopDays(Number(v))}><option value={7}>Last 7 Days</option><option value={30}>Last 30 Days</option><option value={90}>Last 90 Days</option></Mini>} />
              <ul className="space-y-3 px-4 pb-4 pt-1">
                {(data?.top ?? []).length === 0 ? <li className="py-8 text-center text-[11px] text-slate-500">No sign-ins in this period.</li> : data?.top.map((t) => (
                  <li key={t.id} className="grid grid-cols-[minmax(0,1.1fr)_1.4fr_auto] items-center gap-2 text-[11px] text-[#17245e]">
                    <span className="truncate">{t.name}</span>
                    <span className="h-3 rounded bg-[#e8f0fb]"><span className="block h-3 rounded bg-[#4aa3ff]" style={{ width: `${Math.max(4, (t.activeUsers / maxTop) * 100)}%` }} /></span>
                    <span className="w-10 text-right font-semibold">{t.activeUsers.toLocaleString("en-IN")}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-2">
          <Panel>
            <Title icon={<FileText size={17} />} title="Recent Reports" right={<ViewAll label={recentLimit > 5 ? "Show Less" : "View All"} onClick={() => setRecentLimit(recentLimit > 5 ? 5 : 50)} />} />
            <div className="px-3 pb-3">
              <DataTable heads={["#", "Report Name", "Type", "Generated On", "Generated By", "Status", "Action"]} min={640}>
                {recent.length === 0 ? <EmptyRow cols={7} text="No reports generated yet." /> : recent.map((r, i) => (
                  <tr key={r.id} className="border-t border-[#eef4fd]">
                    <td className={tdClass}>{i + 1}</td>
                    <td className={`${tdClass} font-medium text-[#17245e]`}>{r.name}</td>
                    <td className={tdClass}>{catLabel[r.category] ?? r.category}</td>
                    <td className={tdClass}>{fmtDT(r.generatedAt)}</td>
                    <td className={tdClass}>{r.generatedBy ?? "—"}</td>
                    <td className={tdClass}><StatusPill ok>Completed</StatusPill></td>
                    <td className={tdClass} onClick={(e) => e.stopPropagation()}>
                      <span className="relative flex items-center gap-2 text-blue-600">
                        <button type="button" title={`Download ${r.format}`} onClick={() => void download(r)}><Download size={14} /></button>
                        <button type="button" title="More" className="text-slate-600" onClick={(e) => { e.stopPropagation(); setMenu(menu === `r${r.id}` ? null : `r${r.id}`); }}><MoreVertical size={14} /></button>
                        {menu === `r${r.id}` && (
                          <div className="absolute right-0 top-5 z-10 w-40 rounded-md border border-[#d8e9fb] bg-white py-1 text-[11px] text-[#17245e] shadow-lg">
                            {(["PDF", "EXCEL", "CSV"] as ReportFormat[]).map((f) => <button key={f} type="button" className="block w-full px-3 py-1.5 text-left hover:bg-blue-50" onClick={() => void download(r, f)}>Download {f === "EXCEL" ? "Excel" : f}</button>)}
                            <button type="button" className="block w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50" onClick={() => { if (window.confirm(`Delete "${r.name}"?`)) void act(() => api.reports.removeGenerated(r.id), "Report deleted."); }}>Delete</button>
                          </div>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </DataTable>
            </div>
          </Panel>

          <Panel>
            <Title icon={<CalendarClock size={17} />} title="Scheduled Reports" right={<ViewAll label={schedAll ? "Show Less" : "View All"} onClick={() => setSchedAll(!schedAll)} />} />
            <div className="px-3 pb-3">
              <DataTable heads={["#", "Report Name", "Frequency", "Next Run", "Status", "Action"]} min={560}>
                {schedules.length === 0 ? <EmptyRow cols={6} text="No scheduled reports. Turn on Enable Schedule below when generating one." /> : (schedAll ? schedules : schedules.slice(0, 5)).map((s, i) => (
                  <tr key={s.id} className="border-t border-[#eef4fd]">
                    <td className={tdClass}>{i + 1}</td>
                    <td className={`${tdClass} font-medium text-[#17245e]`}>{s.name}</td>
                    <td className={tdClass}>{freqLabel[s.frequency]}</td>
                    <td className={tdClass}>{s.status === "ACTIVE" ? fmtD(s.nextRun) : "—"}</td>
                    <td className={tdClass}><StatusPill ok={s.status === "ACTIVE"}>{s.status === "ACTIVE" ? "Active" : "Paused"}</StatusPill></td>
                    <td className={tdClass} onClick={(e) => e.stopPropagation()}>
                      <span className="relative flex items-center gap-2 text-blue-600">
                        <button type="button" title="Edit" onClick={() => openEdit(s)}><Pencil size={14} /></button>
                        <button type="button" title="More" className="text-slate-600" onClick={(e) => { e.stopPropagation(); setMenu(menu === `s${s.id}` ? null : `s${s.id}`); }}><MoreVertical size={14} /></button>
                        {menu === `s${s.id}` && (
                          <div className="absolute right-0 top-5 z-10 w-36 rounded-md border border-[#d8e9fb] bg-white py-1 text-[11px] text-[#17245e] shadow-lg">
                            <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-blue-50" onClick={() => void runNow(s)}>Run now</button>
                            <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-blue-50" onClick={() => void act(() => api.reports.toggleSchedule(s.id), s.status === "ACTIVE" ? "Schedule paused." : "Schedule resumed.")}>{s.status === "ACTIVE" ? "Pause" : "Resume"}</button>
                            <button type="button" className="block w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50" onClick={() => { if (window.confirm(`Delete schedule "${s.name}"?`)) void act(() => api.reports.removeSchedule(s.id), "Schedule deleted."); }}>Delete</button>
                          </div>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </DataTable>
            </div>
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
          <Panel>
            <Title icon={<FileText size={17} />} title="Report Templates" />
            <div className="grid gap-3 px-4 pb-4 sm:grid-cols-3 xl:grid-cols-5">
              {shownTemplates.map((t) => (
                <button key={t.code} type="button" onClick={() => pick(t)} className={`rounded-lg border p-3 text-center transition hover:shadow-md ${tpl === t.code && t.available ? "border-blue-400 bg-blue-50/40" : "border-[#d8e9fb] bg-white"} ${t.available ? "" : "opacity-60"}`}>
                  <span className={`mx-auto mb-2 grid h-9 w-9 place-items-center rounded-lg ${tplBox[t.icon] ?? tplBox.building}`}>{tplIcon[t.icon] ?? tplIcon.building}</span>
                  <div className="text-[11px] font-extrabold text-[#101b69]">{t.name}</div>
                  <div className="mt-1 text-[9px] leading-3 text-slate-500">{t.available ? t.description : "Not available yet"}</div>
                </button>
              ))}
              <button type="button" onClick={() => exportRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })} className="rounded-lg border border-[#d8e9fb] bg-white p-3 text-center transition hover:shadow-md">
                <span className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-600"><Plus size={18} /></span>
                <div className="text-[11px] font-extrabold text-[#101b69]">Custom Report</div>
                <div className="mt-1 text-[9px] leading-3 text-slate-500">Pick any report and range below</div>
              </button>
            </div>
          </Panel>

          <div ref={exportRef}>
            <Panel>
              <Title icon={<Download size={17} />} title="Export & Schedule" />
              <div className="grid gap-4 px-4 pb-4 sm:grid-cols-2">
                <div className="space-y-3">
                  <Field label="Report"><select value={tpl} onChange={(e) => setTpl(e.target.value)} className={controlClass}>{usable.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}</select>{ferr("template")}</Field>
                  <div>
                    <div className="mb-1 text-[11px] font-semibold text-[#17245e]">Export Format</div>
                    {(["PDF", "EXCEL", "CSV"] as ReportFormat[]).map((f) => (
                      <label key={f} className="flex cursor-pointer items-center gap-3 py-1 text-[12px] text-[#17245e]"><input type="radio" name="fmt" checked={format === f} onChange={() => setFormat(f)} className="h-4 w-4 accent-blue-600" />{f === "EXCEL" ? "Excel" : f}</label>
                    ))}
                    {ferr("format")}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-[11px] font-semibold text-[#17245e]">Schedule Delivery (Optional)</div>
                  <Toggle checked={sched} onChange={setSched} label="Enable Schedule" />
                  {sched && (<>
                    <Field label="Repeat"><select value={freq} onChange={(e) => setFreq(e.target.value)} className={controlClass}><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option></select>{ferr("frequency")}</Field>
                    <Field label="Send to" optional><input value={rcpt} onChange={(e) => setRcpt(e.target.value)} placeholder="name@example.com, …" className={controlClass} />{ferr("recipients")}</Field>
                  </>)}
                  <p className="text-[10px] leading-4 text-slate-500">{applied.days >= 365 ? "Last 12 months" : ranges.find(([d]) => d === applied.days)?.[1]}{instId ? " · selected institution" : " · all institutions"}. Scheduled reports are generated on time but not emailed yet.</p>
                </div>
              </div>
              <div className="flex justify-end px-4 pb-4"><PrimaryButton onClick={() => void generate()} disabled={busy} className="px-8 py-2.5">{busy ? "Generating…" : "Generate Report"}</PrimaryButton></div>
            </Panel>
          </div>
        </div>
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md space-y-3 rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between"><h2 className="text-[15px] font-extrabold text-[#101b69]">Edit Schedule</h2><button type="button" aria-label="Close" onClick={() => setEdit(null)}><X size={16} /></button></div>
            <Field label="Name" required><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={controlClass} />{editErrs.name && <p className="mt-1 text-[10px] text-rose-600">{editErrs.name}</p>}</Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Report"><select value={edit.template} onChange={(e) => setEdit({ ...edit, template: e.target.value })} className={controlClass}>{usable.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}</select></Field>
              <Field label="Format"><select value={edit.format} onChange={(e) => setEdit({ ...edit, format: e.target.value })} className={controlClass}><option value="PDF">PDF</option><option value="EXCEL">Excel</option><option value="CSV">CSV</option></select></Field>
              <Field label="Repeat"><select value={edit.frequency} onChange={(e) => setEdit({ ...edit, frequency: e.target.value })} className={controlClass}><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option></select></Field>
              <Field label="Covers"><select value={edit.days} onChange={(e) => setEdit({ ...edit, days: Number(e.target.value) })} className={controlClass}>{ranges.map(([d, l]) => <option key={d} value={d}>{l}</option>)}</select></Field>
            </div>
            <Field label="Institution"><select value={edit.institutionId} onChange={(e) => setEdit({ ...edit, institutionId: e.target.value })} className={controlClass}><option value="">All Institutions</option>{institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></Field>
            <Field label="Send to" optional><input value={edit.recipients} onChange={(e) => setEdit({ ...edit, recipients: e.target.value })} className={controlClass} />{editErrs.recipients && <p className="mt-1 text-[10px] text-rose-600">{editErrs.recipients}</p>}</Field>
            <div className="flex justify-end gap-2"><OutlineButton onClick={() => setEdit(null)}>Cancel</OutlineButton><PrimaryButton onClick={() => void saveEdit()}>Save</PrimaryButton></div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
