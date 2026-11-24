import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, ArrowUp, Briefcase, ChevronRight, ClipboardList, FileText, GraduationCap, IndianRupee, Megaphone, MessageCircleQuestion, Plus, ReceiptText, ShieldCheck, UserCheck, Users, Wallet, X } from "lucide-react";
import { api } from "../../services/api";
import type { SchoolConcessionRow, SchoolDashboard, SchoolLeaveRow, SchoolMetric } from "../../services/api";
import { Field, Notice, OutlineButton, PrimaryButton, controlClass } from "../super-admin/AcademicShared";
import { errText } from "../super-admin/SettingsShared";
import SchoolLayout, { rememberSchoolName } from "./SchoolLayout";

const inr = (n: number) => (n >= 1e7 ? `₹ ${(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `₹ ${(n / 1e5).toFixed(1)} L` : `₹ ${Math.round(n).toLocaleString("en-IN")}`);
const stageColor: Record<string, string> = { SUBMITTED: "#60a5fa", WAITLISTED: "#94a3b8", UNDER_REVIEW: "#2563eb", DOCUMENTS_PENDING: "#f59e0b", ASSESSMENT: "#8b5cf6", INTERVIEW: "#38bdf8", OFFER_ISSUED: "#7dd3fc", ADMITTED: "#16a34a", REJECTED: "#ef4444", WITHDRAWN: "#a855f7" };
const dot: Record<string, string> = { MEETING: "bg-blue-500", OBSERVATION: "bg-orange-500", PARENT: "bg-violet-500", ADMISSION: "bg-rose-500", REVIEW: "bg-rose-500", OTHER: "bg-emerald-500" };
const categories = [["MEETING", "Meeting"], ["OBSERVATION", "Observation"], ["PARENT", "Parent"], ["ADMISSION", "Admission"], ["REVIEW", "Review"], ["OTHER", "Other"]] as const;

function ago(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60); if (m < 60) return `${m} min${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24); return `${d} day${d === 1 ? "" : "s"} ago`;
}
function actIcon(action: string): ReactNode {
  if (action.startsWith("APPLICATION") || action.startsWith("ENQUIRY")) return <FileText size={14} />;
  if (action.startsWith("FEE") || action.startsWith("CONCESSION")) return <IndianRupee size={14} />;
  if (action.startsWith("LEAVE") || action.startsWith("USER") || action.startsWith("LOGIN")) return <UserCheck size={14} />;
  if (action.startsWith("COMMUNICATION")) return <Megaphone size={14} />;
  return <ClipboardList size={14} />;
}

function Delta({ m }: { m: SchoolMetric }) {
  if (m.changePct === null) return <div className="text-[10px] text-slate-400">{m.compare ? "No earlier data" : " "}</div>;
  const up = m.changePct >= 0;
  return <div className="flex items-center gap-1 text-[11px]"><span className={`inline-flex items-center font-bold ${up ? "text-emerald-600" : "text-rose-600"}`}>{up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}{Math.abs(m.changePct)}%</span><span className="text-slate-500">{m.compare}</span></div>;
}
function Card({ icon, tint, label, value, m }: { icon: ReactNode; tint: string; label: string; value: string; m?: SchoolMetric }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#d8e9fb] bg-white px-4 py-4">
      <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-xl ${tint}`}>{icon}</span>
      <div className="min-w-0"><div className="text-[12px] font-semibold text-[#17245e]">{label}</div><div className="text-[24px] font-extrabold leading-8 text-[#101b69]">{value}</div>{m ? <Delta m={m} /> : null}</div>
    </div>
  );
}
function Box({ title, right, children, className = "" }: { title: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-[#d8e9fb] bg-white p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-[15px] font-extrabold text-[#101b69]">{title}</h2>{right}</div>
      {children}
    </section>
  );
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-md space-y-3 overflow-auto rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between"><h2 className="text-[15px] font-extrabold text-[#101b69]">{title}</h2><button type="button" aria-label="Close" onClick={onClose}><X size={16} /></button></div>
        {children}
      </div>
    </div>
  );
}

export default function SchoolDashboardPage() {
  const nav = useNavigate();
  const [d, setD] = useState<SchoolDashboard | null>(null);
  const [yearId, setYearId] = useState<number | null>(null);
  const [termId, setTermId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [bannerOk, setBannerOk] = useState(true);
  const [eventForm, setEventForm] = useState<{ title: string; date: string; time: string; location: string; category: string } | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [leave, setLeave] = useState<SchoolLeaveRow[] | null>(null);
  const [conc, setConc] = useState<SchoolConcessionRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (y: number | null, t: number | null) => {
    try { const r = await api.school.dashboard(y, t); setD(r); rememberSchoolName(r.schoolName); setError(""); } catch (e) { setError(errText(e)); }
  }, []);
  useEffect(() => { void load(yearId, termId); }, [load, yearId, termId]);
  const flash = (m: string) => { setNotice(m); setTimeout(() => setNotice(""), 4000); };
  const refresh = () => load(yearId, termId);
  const today = new Date().toISOString().slice(0, 10);

  const saveEvent = async () => {
    if (!eventForm) return; setBusy(true); setErrs({});
    try { await api.school.addEvent(eventForm); setEventForm(null); flash("Event added to today's schedule."); await refresh(); }
    catch (e) { const fe = (e as { fieldErrors?: Record<string, string> }).fieldErrors; if (fe && Object.keys(fe).length) setErrs(fe); else setError(errText(e)); } finally { setBusy(false); }
  };
  const decide = async (kind: "leave" | "conc", id: number, approve: boolean) => {
    try {
      if (kind === "leave") { await api.school.decideLeave(id, approve); setLeave((l) => (l ?? []).filter((x) => x.id !== id)); }
      else { await api.school.decideConcession(id, approve); setConc((l) => (l ?? []).filter((x) => x.id !== id)); }
      flash(approve ? "Approved." : "Rejected."); await refresh();
    } catch (e) { setError(errText(e)); }
  };
  const openPending = async (key: string) => {
    try {
      if (key === "leave") setLeave(await api.school.pendingLeave());
      else if (key === "concessions") setConc(await api.school.pendingConcessions());
      else nav(key === "enquiries" || key === "applications" || key === "documents" ? "/school/admissions" : "/school");
    } catch (e) { setError(errText(e)); }
  };

  const rowText = (key: string, n: number) => ({ applications: `Review ${n} pending admission applications`, concessions: `Approve ${n} fee concession requests`, documents: `Verify ${n} documents (admissions)`, enquiries: `Resolve ${n} parent enquiries`, leave: `Approve ${n} staff leave requests` } as Record<string, string>)[key] ?? String(n);
  const rowIcon = (key: string) => ({ applications: <FileText size={15} />, concessions: <ReceiptText size={15} />, documents: <ShieldCheck size={15} />, enquiries: <MessageCircleQuestion size={15} />, leave: <Briefcase size={15} /> } as Record<string, ReactNode>)[key];
  const rowTint = (key: string) => ({ applications: "bg-orange-50 text-orange-600", concessions: "bg-emerald-50 text-emerald-600", documents: "bg-teal-50 text-teal-600", enquiries: "bg-rose-50 text-rose-600", leave: "bg-blue-50 text-blue-600" } as Record<string, string>)[key];

  const trend = d?.enrollment ?? [];
  const noStudents = !trend.some((p) => (p.students ?? 0) > 0);

  return (
    <SchoolLayout schoolName={d?.schoolName}>
      <div className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}

        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#1b2f86] to-[#2d5bd6] px-6 py-6 text-white">
          {d && bannerOk && <img src={api.institutions.imageUrl(d.schoolId, "banner")} alt="" onError={() => setBannerOk(false)} className="absolute inset-0 h-full w-full object-cover opacity-40" />}
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div><h1 className="text-[26px] font-extrabold">Welcome, {d?.userName.split(" ")[0] ?? "…"}!</h1><p className="text-[13px] text-white/90">Here's an overview of your school{d ? ` for ${d.scopeLabel}` : ""}</p></div>
            <div className="flex gap-4 rounded-lg bg-white px-4 py-2.5 text-[#17245e] shadow">
              <label className="block text-[11px] font-bold">Academic Year
                <select value={d?.yearId ?? ""} disabled={!d || d.years.length === 0} onChange={(e) => { setTermId(null); setYearId(e.target.value ? Number(e.target.value) : null); }} className="mt-0.5 block w-40 rounded border border-[#cfe0f6] px-2 py-1.5 text-[12px] font-medium">{d?.years.length ? d.years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>) : <option value="">Not set up</option>}</select></label>
              <label className="block text-[11px] font-bold">Term
                <select value={d?.termId ?? ""} disabled={!d || d.terms.length === 0} onChange={(e) => setTermId(e.target.value ? Number(e.target.value) : null)} className="mt-0.5 block w-40 rounded border border-[#cfe0f6] px-2 py-1.5 text-[12px] font-medium"><option value="">All terms</option>{d?.terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Card icon={<GraduationCap size={26} />} tint="bg-blue-50 text-blue-600" label="Total Students" value={d ? d.students.value.toLocaleString("en-IN") : "—"} m={d?.students} />
          <Card icon={<Users size={26} />} tint="bg-orange-50 text-orange-500" label="Total Staff" value={d ? d.staff.value.toLocaleString("en-IN") : "—"} />
          <Card icon={<FileText size={26} />} tint="bg-violet-50 text-violet-600" label="New Admissions" value={d ? d.admissions.value.toLocaleString("en-IN") : "—"} m={d?.admissions} />
          <Card icon={<IndianRupee size={26} />} tint="bg-emerald-50 text-emerald-600" label="Fee Collection" value={d ? inr(d.collected.value) : "—"} m={d?.collected} />
          <Card icon={<Wallet size={26} />} tint="bg-rose-50 text-rose-500" label="Pending Fees" value={d ? inr(d.pending.value) : "—"} />
          <Card icon={<MessageCircleQuestion size={26} />} tint="bg-amber-50 text-amber-500" label="Open Enquiries" value={d ? d.enquiries.value.toLocaleString("en-IN") : "—"} m={d?.enquiries} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr_0.85fr]">
          <Box title="Student Enrollment Trend" right={<span className="rounded border border-[#cfe0f6] px-3 py-1 text-[11px]">Last 12 months</span>}>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke="#e8eef9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#46567f" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#46567f" }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="students" name="Students" stroke="#2563eb" strokeWidth={2} fill="#dbeafe" connectNulls={false} dot={{ r: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {noStudents && <p className="text-[10px] text-slate-500">No students yet. The line is built from each student's date added.</p>}
          </Box>

          <Box title="Applications Overview" right={<span className="rounded border border-[#cfe0f6] px-3 py-1 text-[11px]">{d?.scopeLabel.replace("Academic Year ", "AY ") ?? ""}</span>}>
            <div className="flex items-center gap-4">
              <div className="relative h-44 w-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={d && d.applicationsTotal > 0 ? d.stages.filter((s) => s.count > 0) : [{ code: "NONE", label: "None", count: 1 }]} dataKey="count" nameKey="label" innerRadius={52} outerRadius={80} paddingAngle={1} stroke="none">
                  {(d && d.applicationsTotal > 0 ? d.stages.filter((s) => s.count > 0) : [{ code: "NONE" }]).map((s) => <Cell key={s.code} fill={stageColor[s.code] ?? "#e5ecf8"} />)}</Pie>{d && d.applicationsTotal > 0 && <Tooltip />}</PieChart></ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><div className="text-[22px] font-extrabold text-[#101b69]">{d?.applicationsTotal ?? 0}</div><div className="text-[10px] text-slate-500">Total</div></div></div>
              </div>
              <ul className="flex-1 space-y-1.5 text-[11px]">{d?.stages.map((s) => <li key={s.code} className="flex items-center justify-between gap-2"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: stageColor[s.code] }} />{s.label}</span><span className="font-bold">{s.count}</span></li>)}</ul>
            </div>
          </Box>

          <Box title="Fee Collection Overview" right={<span className="rounded border border-[#cfe0f6] px-3 py-1 text-[11px]">{d?.termId ? d.terms.find((t) => t.id === d.termId)?.name : "All terms"}</span>}>
            <div className="flex items-center gap-4">
              <div className="relative h-36 w-36 shrink-0">
                <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[{ n: "Collected", v: d?.fees.collected ?? 0 }, { n: "Pending", v: Math.max(0, (d?.fees.total ?? 0) - (d?.fees.collected ?? 0)) || (d && d.fees.total > 0 ? 0 : 1) }]} dataKey="v" nameKey="n" innerRadius={42} outerRadius={64} startAngle={90} endAngle={-270} stroke="none"><Cell fill={d && d.fees.total > 0 ? "#2563eb" : "#e5ecf8"} /><Cell fill="#e5ecf8" /></Pie></PieChart></ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><div className="text-[20px] font-extrabold text-[#101b69]">{d?.fees.percent ?? 0}%</div><div className="text-[10px] text-slate-500">Collected</div></div></div>
              </div>
              <div className="space-y-2 text-[12px]">
                <div className="border-l-4 border-emerald-500 pl-2"><div className="font-extrabold text-[#101b69]">{inr(d?.fees.collected ?? 0)}</div><div className="text-slate-500">Collected</div></div>
                <div className="border-l-4 border-orange-500 pl-2"><div className="font-extrabold text-[#101b69]">{inr(d?.fees.pending ?? 0)}</div><div className="text-slate-500">Pending</div></div>
                <div className="border-l-4 border-blue-600 pl-2"><div className="font-extrabold text-[#101b69]">{inr(d?.fees.total ?? 0)}</div><div className="text-slate-500">Total</div></div>
              </div>
            </div>
          </Box>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Box title="Today's Schedule" right={<button type="button" onClick={() => { setErrs({}); setEventForm({ title: "", date: today, time: "", location: "", category: "MEETING" }); }} className="inline-flex items-center gap-1 text-[12px] font-semibold text-blue-600 hover:underline"><Plus size={13} />Add</button>}>
            {d && d.schedule.length === 0 ? <p className="py-6 text-center text-[12px] text-slate-500">Nothing scheduled for today.</p> : (
              <ul className="space-y-3.5">{d?.schedule.map((e) => (
                <li key={e.id} className="group flex items-center gap-3 text-[12px]"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot[e.category] ?? "bg-slate-400"}`} /><span className="w-[70px] shrink-0 font-medium text-[#17245e]">{e.time}</span><span className="flex-1 font-semibold text-[#17245e]">{e.title}</span><span className="text-slate-500">{e.location}</span>
                  <button type="button" aria-label="Remove event" title="Remove" className="hidden text-slate-400 hover:text-rose-600 group-hover:block" onClick={() => { if (window.confirm(`Remove "${e.title}"?`)) void api.school.removeEvent(e.id).then(refresh).catch((x) => setError(errText(x))); }}><X size={13} /></button></li>))}</ul>)}
          </Box>

          <Box title={<span className="flex items-center gap-2">Pending Actions {d && d.pendingTotal > 0 && <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">{d.pendingTotal}</span>}</span>}>
            <ul className="space-y-2.5">{d?.pendingActions.map((p) => (
              <li key={p.key}><button type="button" onClick={() => void openPending(p.key)} className="flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left text-[12px] hover:bg-blue-50"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${rowTint(p.key)}`}>{rowIcon(p.key)}</span><span className="flex-1 text-[#17245e]">{rowText(p.key, p.count)}</span><span className="font-bold">{p.count}</span><ChevronRight size={14} className="text-slate-400" /></button></li>))}</ul>
          </Box>

          <Box title="Recent Activities">
            {d && d.activities.length === 0 ? <p className="py-6 text-center text-[12px] text-slate-500">No activity recorded for your school yet.</p> : (
              <ul className="space-y-3">{d?.activities.map((a, i) => (
                <li key={i} className="flex items-center gap-3 text-[12px]"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">{actIcon(a.action)}</span><span className="flex-1 text-[#17245e]">{a.text}</span><span className="shrink-0 text-[10px] text-slate-400">{ago(a.at)}</span></li>))}</ul>)}
          </Box>
        </div>
      </div>

      {eventForm && (
        <Modal title="Add to Schedule" onClose={() => setEventForm(null)}>
          <Field label="Title" required><input value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} className={controlClass} />{errs.title && <p className="mt-1 text-[10px] text-rose-600">{errs.title}</p>}</Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" required><input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} className={controlClass} />{errs.date && <p className="mt-1 text-[10px] text-rose-600">{errs.date}</p>}</Field>
            <Field label="Time" optional><input type="time" value={eventForm.time} onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })} className={controlClass} />{errs.time && <p className="mt-1 text-[10px] text-rose-600">{errs.time}</p>}</Field>
            <Field label="Location" optional><input value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} className={controlClass} /></Field>
            <Field label="Type"><select value={eventForm.category} onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })} className={controlClass}>{categories.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          </div>
          <p className="text-[10px] text-slate-500">Only events dated today appear in Today's Schedule.</p>
          <div className="flex justify-end gap-2"><OutlineButton onClick={() => setEventForm(null)}>Cancel</OutlineButton><PrimaryButton onClick={() => void saveEvent()} disabled={busy}>Save</PrimaryButton></div>
        </Modal>
      )}

      {(leave || conc) && (
        <Modal title={leave ? "Staff leave requests" : "Fee concession requests"} onClose={() => { setLeave(null); setConc(null); }}>
          {(leave ?? conc ?? []).length === 0 ? <p className="py-4 text-center text-[12px] text-slate-500">Nothing waiting for approval.</p> : (
            <ul className="divide-y divide-[#eef4fd]">
              {leave?.map((l) => <li key={l.id} className="flex items-center gap-3 py-2.5 text-[12px]"><div className="flex-1"><div className="font-semibold text-[#17245e]">{l.teacher}</div><div className="text-[11px] text-slate-500">{l.leaveType.toLowerCase()} · {l.from} to {l.to}{l.reason ? ` · ${l.reason}` : ""}</div></div><button type="button" onClick={() => void decide("leave", l.id, true)} className="rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white">Approve</button><button type="button" onClick={() => void decide("leave", l.id, false)} className="rounded border border-rose-300 px-2.5 py-1 text-[11px] font-semibold text-rose-600">Reject</button></li>)}
              {conc?.map((c) => <li key={c.id} className="flex items-center gap-3 py-2.5 text-[12px]"><div className="flex-1"><div className="font-semibold text-[#17245e]">{c.student} <span className="font-normal text-slate-500">({c.admissionNo})</span></div><div className="text-[11px] text-slate-500">{inr(c.amount)}{c.reason ? ` · ${c.reason}` : ""}</div></div><button type="button" onClick={() => void decide("conc", c.id, true)} className="rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white">Approve</button><button type="button" onClick={() => void decide("conc", c.id, false)} className="rounded border border-rose-300 px-2.5 py-1 text-[11px] font-semibold text-rose-600">Reject</button></li>)}
            </ul>)}
          {conc && <p className="text-[10px] text-slate-500">Approving records the decision. It doesn't change the student's fee balance yet.</p>}
        </Modal>
      )}
    </SchoolLayout>
  );
}
