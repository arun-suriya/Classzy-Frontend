import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, FileClock, Plus, Save, UserCheck, Users, UserX } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../services/api";
import type { AtCalendar, AtDaily, AtLeave, AtOptions, AtOverview, AtTrends, ExTable } from "../../services/api";
import { Field, Notice, OutlineButton, PrimaryButton, controlClass } from "../super-admin/AcademicShared";
import { errText } from "../super-admin/SettingsShared";
import SchoolLayout from "./SchoolLayout";
import { FieldErr, Kpi, ReportView, StudentPicker, Tabs, fieldErrs, shortDay, tint } from "./DeskShared";
import { Item, Menu, Modal, Table, td } from "./SchoolUi";

const TABS = ["Overview", "Daily Attendance", "Attendance Reports", "Leave Management", "Trends & Analytics"] as const;
type Tab = (typeof TABS)[number] | "Calendar";
const ST: Record<string, [string, string]> = { PRESENT: ["Present", "bg-emerald-100 text-emerald-700"], ABSENT: ["Absent", "bg-rose-100 text-rose-700"], LATE: ["Late", "bg-orange-100 text-orange-700"], ON_LEAVE: ["On Leave", "bg-yellow-100 text-yellow-800"] };
const SEL: Record<string, string> = { PRESENT: "border-emerald-300 bg-emerald-50 text-emerald-700", ABSENT: "border-rose-300 bg-rose-50 text-rose-700", LATE: "border-orange-300 bg-orange-50 text-orange-700", ON_LEAVE: "border-yellow-300 bg-yellow-50 text-yellow-800" };
const LV: Record<string, [string, string]> = { PENDING: ["Pending", "bg-amber-100 text-amber-800"], APPROVED: ["Approved", "bg-emerald-100 text-emerald-700"], REJECTED: ["Rejected", "bg-rose-100 text-rose-700"], CANCELLED: ["Cancelled", "bg-slate-100 text-slate-600"] };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type Ctx = { opts: AtOptions; flash: (m: string) => void; onError: (m: string) => void; go: (t: Tab) => void };

// ------------------------------------------------------------------ overview
function OverviewTab({ c }: { c: Ctx }) {
  const [date, setDate] = useState(c.opts.today);
  const [classId, setClassId] = useState<number | null>(null);
  const [ov, setOv] = useState<AtOverview | null>(null);
  useEffect(() => {
    setOv(null);
    let live = true;
    api.schoolAttendance.overview(date, classId).then((o) => { if (live) setOv(o); }).catch((e) => { if (live) c.onError(errText(e)); });
    return () => { live = false; };
  }, [date, classId]); // eslint-disable-line react-hooks/exhaustive-deps
  const pctOf = (n: number | undefined) => (ov ? `${n}%` : "");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Date" className="w-48"><input type="date" value={date} max={c.opts.today} onChange={(e) => e.target.value && setDate(e.target.value)} className={controlClass} /></Field>
        <Field label="Grade" className="w-48"><select value={classId ?? ""} onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : null)} className={controlClass}><option value="">All Grades</option>{c.opts.classes.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
      </div>
      {ov && !ov.day.schoolDay && <Notice tone="info">{ov.day.reason}. Attendance isn't taken on this day.</Notice>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Users size={26} className="text-blue-600" />} value={ov ? ov.total.toLocaleString("en-IN") : "–"} label="Total Students" tone="bg-sky-50" />
        <Kpi icon={<UserCheck size={26} className="text-emerald-600" />} value={ov ? ov.present.toLocaleString("en-IN") : "–"} label="Present" sub={pctOf(ov?.presentPercent)} tone="bg-emerald-50" />
        <Kpi icon={<UserX size={26} className="text-rose-600" />} value={ov ? ov.absent.toLocaleString("en-IN") : "–"} label="Absent" sub={pctOf(ov?.absentPercent)} tone="bg-rose-50" />
        <Kpi icon={<CalendarDays size={26} className="text-orange-500" />} value={ov ? ov.onLeave.toLocaleString("en-IN") : "–"} label="On Leave" sub={pctOf(ov?.leavePercent)} tone="bg-orange-50" />
      </div>
      {ov && ov.day.schoolDay && ov.notMarked > 0 && <p className="text-[12px] text-slate-600">{ov.notMarked.toLocaleString("en-IN")} student{ov.notMarked === 1 ? "" : "s"} not marked yet{ov.late > 0 ? ` · ${ov.late} of the present were late` : ""}.</p>}
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div>
          <h3 className="mb-2 text-[16px] font-extrabold text-[#101b69]">Recent Attendance Records</h3>
          <Table heads={["Student", "Grade", "Status"]} colSpan={3} empty={ov && ov.recent.length === 0 ? "No attendance has been recorded for this date." : !ov ? "Loading…" : undefined}>
            {ov?.recent.map((r, i) => <tr key={i}><td className={td}>{r.student}</td><td className={td}>{r.grade ?? "—"}</td><td className={td}>{tint(ST, r.status)}</td></tr>)}
          </Table>
        </div>
        <div>
          <h3 className="mb-2 text-[16px] font-extrabold text-[#101b69]">Quick Actions</h3>
          <div className="space-y-3">
            <PrimaryButton type="button" className="w-full justify-center" onClick={() => c.go("Daily Attendance")}><ClipboardCheck size={15} />Take Daily Attendance</PrimaryButton>
            <OutlineButton type="button" className="w-full justify-center" onClick={() => c.go("Calendar")}><CalendarDays size={15} />View Calendar</OutlineButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ daily
function DailyTab({ c }: { c: Ctx }) {
  const [date, setDate] = useState(c.opts.today);
  const [classId, setClassId] = useState<number | null>(c.opts.classes[0]?.id ?? null);
  const secs = c.opts.sections.filter((s) => s.classId === classId);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const sid = secs.some((s) => s.id === sectionId) ? sectionId : secs[0]?.id ?? null;
  const [data, setData] = useState<AtDaily | null>(null);
  const [vals, setVals] = useState<Record<number, { status: string; remarks: string }>>({});
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const apply = (d: AtDaily) => { setData(d); setDirty(false); setVals(Object.fromEntries(d.rows.map((r) => [r.studentId, { status: r.status ?? "", remarks: r.remarks ?? "" }]))); };
  useEffect(() => {
    setData(null); setErrs({});
    if (sid === null) return;
    let live = true;
    api.schoolAttendance.daily(date, sid).then((d) => { if (live) apply(d); }).catch((e) => { if (live) c.onError(errText(e)); });
    return () => { live = false; };
  }, [date, sid]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (id: number, p: Partial<{ status: string; remarks: string }>) => { setDirty(true); setVals((v) => ({ ...v, [id]: { status: v[id]?.status ?? "", remarks: v[id]?.remarks ?? "", ...p } })); };
  const editable = !!data?.editable;
  const marked = data ? data.rows.filter((r) => (vals[r.studentId]?.status ?? "") !== "").length : 0;
  const save = async () => {
    if (!data || sid === null) return;
    setBusy(true); setErrs({});
    try { apply(await api.schoolAttendance.saveDaily({ date, sectionId: sid, rows: data.rows.map((r) => ({ studentId: r.studentId, status: vals[r.studentId]?.status || null, remarks: vals[r.studentId]?.remarks ?? "" })) })); c.flash("Attendance saved."); }
    catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else c.onError(errText(e)); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Date" className="w-44"><input type="date" value={date} max={c.opts.today} onChange={(e) => e.target.value && setDate(e.target.value)} className={controlClass} /></Field>
        <Field label="Grade" className="w-36"><select value={classId ?? ""} onChange={(e) => { setClassId(e.target.value ? Number(e.target.value) : null); setSectionId(null); }} className={controlClass}>{c.opts.classes.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <Field label="Section" className="w-40"><select value={sid ?? ""} onChange={(e) => setSectionId(Number(e.target.value))} className={controlClass}>{secs.map((s) => <option key={s.id} value={s.id}>{s.className} – {s.name}</option>)}</select></Field>
        <PrimaryButton type="button" disabled={!editable} className="ml-auto" onClick={() => { if (!data) return; setDirty(true); setVals((v) => Object.fromEntries(data.rows.map((r) => [r.studentId, v[r.studentId]?.status === "ON_LEAVE" ? v[r.studentId] : { status: "PRESENT", remarks: v[r.studentId]?.remarks ?? "" }]))); }}><CheckCircle2 size={14} />Mark All Present</PrimaryButton>
      </div>
      {data && data.lockReason && <Notice tone="info">{data.lockReason}</Notice>}
      {c.opts.classes.length === 0 && <Notice tone="info">Set up grades and sections for the current academic year first.</Notice>}
      <div className="overflow-x-auto rounded-lg border border-[#cfe0f6]"><table className="w-full min-w-[620px] border-collapse text-left text-[13px]">
        <thead><tr className="bg-[#e8f1fd] text-[#13205f]">{["No.", "Admission No.", "Student", "Status", "Remarks"].map((h) => <th key={h} className="px-4 py-2.5 font-bold">{h}</th>)}</tr></thead>
        <tbody>
          {!data && <tr><td colSpan={5} className="px-4 py-8 text-center text-[12px] text-slate-500">{sid === null ? "Choose a grade and section." : "Loading…"}</td></tr>}
          {data && data.rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-[12px] text-slate-500">No active students in this section.</td></tr>}
          {data?.rows.map((r, i) => { const v = vals[r.studentId] ?? { status: "", remarks: "" }; const e = errs[`row${r.studentId}`]; return (
            <tr key={r.studentId} className="border-t border-[#e3eefc]"><td className="px-4 py-2">{i + 1}</td><td className="px-4 py-2">{r.admissionNo}</td><td className="px-4 py-2">{r.name}</td>
              <td className="px-4 py-1.5"><select aria-label={`Status for ${r.name}`} disabled={!editable} value={v.status} onChange={(x) => set(r.studentId, { status: x.target.value })} className={`h-9 w-36 rounded-md border px-2 text-[13px] font-semibold ${SEL[v.status] ?? "border-[#cfe0f6] bg-white text-slate-500"}`}><option value="">Not marked</option>{c.opts.statuses.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}</select></td>
              <td className="px-4 py-1.5"><input aria-label={`Remarks for ${r.name}`} disabled={!editable} maxLength={200} value={v.remarks} placeholder={r.fromLeave ? "Approved leave" : ""} onChange={(x) => set(r.studentId, { remarks: x.target.value })} className={`${controlClass} ${e ? "!border-rose-400" : ""}`} />{e && <p className="text-[10px] text-rose-600">{e}</p>}</td></tr>); })}
        </tbody></table></div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-slate-600">{data ? `${marked} of ${data.rows.length} marked` : ""}{dirty ? " · unsaved changes" : ""}</p>
        <PrimaryButton type="button" disabled={!editable || busy || !dirty} onClick={() => void save()}><Save size={14} />{busy ? "Saving…" : "Save Attendance"}</PrimaryButton>
      </div>
      <p className="text-[11px] text-slate-500">Leaving a student as "Not marked" clears any mark saved for that day. Approved leave pre-fills On Leave, and changing it here detaches that day from the leave request.</p>
    </div>
  );
}

// ------------------------------------------------------------------ reports
const REPORTS = [{ code: "ATTENDANCE_SUMMARY", name: "Attendance Summary" }, { code: "STUDENT_WISE", name: "Student-wise Attendance" }, { code: "BELOW_THRESHOLD", name: "Below Threshold" }];
function ReportsTab({ c }: { c: Ctx }) {
  const first = `${c.opts.today.slice(0, 8)}01`;
  const [from, setFrom] = useState(first), [to, setTo] = useState(c.opts.today);
  const [classId, setClassId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [type, setType] = useState(REPORTS[0].code);
  const [t, setT] = useState<ExTable | null>(null);
  const [busy, setBusy] = useState(false);
  const secs = c.opts.sections.filter((s) => s.classId === classId);
  const gen = async () => { setBusy(true); try { setT(await api.schoolAttendance.report(type, from, to, classId, sectionId)); } catch (e) { c.onError(errText(e)); } finally { setBusy(false); } };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="From" className="w-40"><input type="date" value={from} max={to} onChange={(e) => { setFrom(e.target.value); setT(null); }} className={controlClass} /></Field>
        <Field label="To" className="w-40"><input type="date" value={to} min={from} max={c.opts.today} onChange={(e) => { setTo(e.target.value); setT(null); }} className={controlClass} /></Field>
        <Field label="Grade" className="w-36"><select value={classId ?? ""} onChange={(e) => { setClassId(e.target.value ? Number(e.target.value) : null); setSectionId(null); setT(null); }} className={controlClass}><option value="">All Grades</option>{c.opts.classes.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <Field label="Section" className="w-36"><select value={sectionId ?? ""} disabled={classId === null} onChange={(e) => { setSectionId(e.target.value ? Number(e.target.value) : null); setT(null); }} className={controlClass}><option value="">All Sections</option>{secs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="Report Type" className="w-52"><select value={type} onChange={(e) => { setType(e.target.value); setT(null); }} className={controlClass}>{REPORTS.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}</select></Field>
        <PrimaryButton type="button" disabled={busy || !from || !to} onClick={() => void gen()}>{busy ? "Generating…" : "Generate Report"}</PrimaryButton>
      </div>
      {t ? <ReportView t={t} empty="No attendance has been recorded for this selection." /> : <p className="text-[12px] text-slate-500">Choose a range and press Generate Report. Minimum attendance is {c.opts.minPercent}% (from Settings → Attendance).</p>}
    </div>
  );
}

// ------------------------------------------------------------------ leave
function LeaveModal({ c, onClose, onSaved }: { c: Ctx; onClose: () => void; onSaved: () => void }) {
  const [studentId, setStudentId] = useState<number | null>(null);
  const [f, setF] = useState({ type: "MEDICAL", from: c.opts.today, to: c.opts.today, reason: "" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); setErrs({}); try { await api.schoolAttendance.addLeave({ studentId, ...f }); onSaved(); } catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else c.onError(errText(e)); } finally { setBusy(false); } };
  return (
    <Modal title="Record Student Leave" wide onClose={onClose}>
      <StudentPicker classes={c.opts.classes} sections={c.opts.sections} fetchStudents={async (sid) => (await api.schoolAttendance.students(sid)).map((s) => ({ id: s.id, label: `${s.name} (${s.admissionNo})` }))} value={studentId} onChange={setStudentId} error={errs.studentId} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Leave Type" required><select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className={controlClass}>{c.opts.leaveTypes.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}</select><FieldErr errs={errs} k="type" /></Field>
        <Field label="From" required><input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value, to: f.to < e.target.value ? e.target.value : f.to })} className={controlClass} /><FieldErr errs={errs} k="from" /></Field>
        <Field label="To" required><input type="date" value={f.to} min={f.from} onChange={(e) => setF({ ...f, to: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="to" /></Field>
      </div>
      <Field label="Reason" optional><input value={f.reason} maxLength={300} onChange={(e) => setF({ ...f, reason: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="reason" /></Field>
      <div className="flex justify-end gap-2"><OutlineButton type="button" onClick={onClose}>Cancel</OutlineButton><PrimaryButton type="button" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Submit for Review"}</PrimaryButton></div>
    </Modal>
  );
}

function LeaveTab({ c }: { c: Ctx }) {
  const [from, setFrom] = useState(`${c.opts.today.slice(0, 8)}01`);
  const [to, setTo] = useState(iso(new Date(new Date(c.opts.today).getFullYear(), new Date(c.opts.today).getMonth() + 1, 0)));
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<AtLeave[] | null>(null);
  const [review, setReview] = useState<AtLeave | null>(null);
  const [add, setAdd] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { api.schoolAttendance.leaves(from, to, status).then(setRows).catch((e) => c.onError(errText(e))); }, [from, to, status]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setRows(null); load(); }, [load]);
  const act = async (l: AtLeave, a: "approve" | "reject" | "cancel", ok: string) => { setBusy(true); try { await api.schoolAttendance.decide(l.id, a); c.flash(ok); setReview(null); load(); } catch (e) { c.onError(errText(e)); } finally { setBusy(false); } };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="From" className="w-40"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={controlClass} /></Field>
        <Field label="To" className="w-40"><input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={controlClass} /></Field>
        <Field label="Status" className="w-44"><select value={status} onChange={(e) => setStatus(e.target.value)} className={controlClass}><option value="">All Statuses</option>{Object.entries(LV).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select></Field>
        <PrimaryButton type="button" className="ml-auto" onClick={() => setAdd(true)}><Plus size={14} />Record Leave</PrimaryButton>
      </div>
      <Table heads={["Student", "Leave Type", "From", "To", "Status", "Action"]} colSpan={6} empty={rows && rows.length === 0 ? "No leave requests in this range." : !rows ? "Loading…" : undefined}>
        {rows?.map((l) => (
          <tr key={l.id}><td className={td}>{l.student}<div className="text-[11px] text-slate-500">{l.grade}</div></td><td className={td}>{l.typeLabel}</td><td className={td}>{shortDay(l.from)}</td><td className={td}>{shortDay(l.to)}</td><td className={td}>{tint(LV, l.status)}</td>
            <td className={td}>{l.status === "PENDING" ? <button type="button" onClick={() => setReview(l)} className="rounded-md bg-[#0875fb] px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-blue-700">Review</button>
              : l.status === "APPROVED" ? <Menu id={`l${l.id}`} open={menu} setOpen={setMenu}><Item danger onClick={() => { if (window.confirm("Cancel this approved leave? Its On Leave marks will be removed.")) void act(l, "cancel", "Leave cancelled."); }}>Cancel leave</Item></Menu> : null}</td></tr>
        ))}
      </Table>
      {review && (
        <Modal title="Review Leave" onClose={() => setReview(null)}>
          <dl className="grid grid-cols-[110px_1fr] gap-y-1.5 text-[13px]"><dt className="text-slate-500">Student</dt><dd>{review.student} ({review.admissionNo})</dd><dt className="text-slate-500">Grade</dt><dd>{review.grade}</dd><dt className="text-slate-500">Type</dt><dd>{review.typeLabel}</dd><dt className="text-slate-500">Dates</dt><dd>{shortDay(review.from)} – {shortDay(review.to)}</dd><dt className="text-slate-500">Reason</dt><dd>{review.reason ?? "—"}</dd></dl>
          <p className="text-[11px] text-slate-500">Approving marks the school days in this range as On Leave. Days already marked Absent become On Leave; other marks are left alone.</p>
          <div className="flex justify-end gap-2"><OutlineButton type="button" disabled={busy} onClick={() => void act(review, "reject", "Leave rejected.")}>Reject</OutlineButton><PrimaryButton type="button" disabled={busy} onClick={() => void act(review, "approve", "Leave approved.")}>Approve</PrimaryButton></div>
        </Modal>
      )}
      {add && <LeaveModal c={c} onClose={() => setAdd(false)} onSaved={() => { setAdd(false); c.flash("Leave recorded and waiting for review."); load(); }} />}
    </div>
  );
}

// ------------------------------------------------------------------ trends
function TrendsTab({ c }: { c: Ctx }) {
  const [termId, setTermId] = useState<number | null>(c.opts.terms[0]?.id ?? null);
  const [classId, setClassId] = useState<number | null>(null);
  const [d, setD] = useState<AtTrends | null>(null);
  useEffect(() => {
    setD(null);
    if (termId === null) return;
    let live = true;
    api.schoolAttendance.trends(termId, classId).then((x) => { if (live) setD(x); }).catch((e) => { if (live) c.onError(errText(e)); });
    return () => { live = false; };
  }, [termId, classId]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Term" className="w-64"><select value={termId ?? ""} onChange={(e) => setTermId(e.target.value ? Number(e.target.value) : null)} className={controlClass}>{c.opts.terms.length === 0 && <option value="">No terms set up</option>}{c.opts.terms.map((t) => <option key={t.id} value={t.id}>{t.name} ({shortDay(t.startDate)} – {shortDay(t.endDate)})</option>)}</select></Field>
        <Field label="Grade" className="w-44"><select value={classId ?? ""} onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : null)} className={controlClass}><option value="">All Grades</option>{c.opts.classes.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi icon={<CheckCircle2 size={26} className="text-emerald-600" />} value={d && d.months.length ? `${d.average}%` : "–"} label="Average Attendance" tone="bg-emerald-50" />
        <Kpi icon={<FileClock size={26} className="text-rose-600" />} value={d && d.months.length ? `${d.lowest}%` : "–"} label="Lowest Attendance" sub={d?.lowestMonth ?? undefined} tone="bg-rose-50" />
        <Kpi icon={<Users size={26} className="text-violet-600" />} value={d ? d.chronic : "–"} label="Chronic Absences" sub={d ? `below ${d.minPercent}% this term` : undefined} tone="bg-violet-50" />
      </div>
      <Table heads={["Month", "Attendance Rate", "Students Below Threshold"]} colSpan={3} empty={d && d.months.length === 0 ? "No attendance has been recorded in this term yet." : !d ? (termId === null ? "Set up terms in Academics to see trends." : "Loading…") : undefined}>
        {d?.months.map((m) => <tr key={m.month}><td className={td}>{m.month}</td><td className={td}>{m.rate}%</td><td className={td}>{m.below}</td></tr>)}
      </Table>
      <p className="text-[11px] text-slate-500">Rates use recorded attendance only. A student is "below threshold" in a month when their rate for that month is under {d?.minPercent ?? c.opts.minPercent}%; "chronic" uses the whole term to date.</p>
    </div>
  );
}

// ------------------------------------------------------------------ calendar
function CalendarView({ c }: { c: Ctx }) {
  const [studentId, setStudentId] = useState<number | null>(null);
  const [month, setMonth] = useState(c.opts.today.slice(0, 7));
  const [cal, setCal] = useState<AtCalendar | null>(null);
  useEffect(() => {
    setCal(null);
    if (studentId === null) return;
    let live = true;
    api.schoolAttendance.calendar(studentId, month).then((x) => { if (live) setCal(x); }).catch((e) => { if (live) c.onError(errText(e)); });
    return () => { live = false; };
  }, [studentId, month]); // eslint-disable-line react-hooks/exhaustive-deps
  const shift = (n: number) => { const [y, m] = month.split("-").map(Number); const d = new Date(y, m - 1 + n, 1); setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); };
  const cells = useMemo(() => { if (!cal) return []; const lead = (new Date(cal.days[0].date + "T00:00:00").getDay() + 6) % 7; return [...Array<null>(lead).fill(null), ...cal.days]; }, [cal]);
  const title = new Date(month + "-01T00:00:00").toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const cls = (d: { status: string | null; off: string | null }) => (d.status === "PRESENT" ? "bg-emerald-200" : d.status === "ABSENT" ? "bg-rose-200" : d.status === "LATE" ? "bg-orange-200" : d.status === "ON_LEAVE" ? "bg-yellow-200" : d.off ? "bg-slate-100 text-slate-400" : "bg-white text-slate-400");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-[20px] font-extrabold text-[#101b69]">Attendance Calendar</h2><OutlineButton type="button" onClick={() => c.go("Overview")}>Back to Overview</OutlineButton></div>
      <StudentPicker classes={c.opts.classes} sections={c.opts.sections} fetchStudents={async (sid) => (await api.schoolAttendance.students(sid)).map((s) => ({ id: s.id, label: `${s.name} (${s.admissionNo})` }))} value={studentId} onChange={setStudentId} />
      <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
        <div className="rounded-lg border border-[#cfe0f6] p-4">
          <div className="mb-3 flex items-center justify-between"><button type="button" aria-label="Previous month" onClick={() => shift(-1)} className="rounded border border-[#cfe0f6] p-1.5"><ChevronLeft size={16} /></button><div className="text-[17px] font-extrabold text-[#101b69]">{title}</div><button type="button" aria-label="Next month" onClick={() => shift(1)} className="rounded border border-[#cfe0f6] p-1.5"><ChevronRight size={16} /></button></div>
          <div className="grid grid-cols-7 gap-1 text-center text-[12px]">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-1 font-bold text-[#13205f]">{d}</div>)}
            {studentId === null && <div className="col-span-7 py-10 text-slate-500">Choose a student to see their month.</div>}
            {studentId !== null && !cal && <div className="col-span-7 py-10 text-slate-500">Loading…</div>}
            {cells.map((d, i) => d ? <div key={d.date} title={d.off ?? (d.status ? ST[d.status]?.[0] : "Not marked")} className={`rounded py-2 font-semibold ${cls(d)}`}>{Number(d.date.slice(8))}</div> : <div key={`b${i}`} />)}
          </div>
          {cal && <p className="mt-3 text-[12px] text-slate-600">{cal.student} · {cal.grade} — {cal.present} present, {cal.late} late, {cal.absent} absent, {cal.leave} on leave.</p>}
        </div>
        <div className="rounded-lg border border-[#cfe0f6] p-4 text-[12px]">
          {[["bg-emerald-200", "Present"], ["bg-rose-200", "Absent"], ["bg-orange-200", "Late"], ["bg-yellow-200", "On Leave"], ["bg-slate-100", "Holiday / week off"], ["bg-white border border-slate-200", "Not marked"]].map(([k, l]) => <div key={l} className="mb-2 flex items-center gap-2"><span className={`h-4 w-4 rounded ${k}`} />{l}</div>)}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ page
export default function AttendanceBoard() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  const tab: Tab = raw === "Calendar" ? "Calendar" : TABS.find((t) => t === raw) ?? "Overview";
  const go = useCallback((t: Tab) => setParams(t === "Overview" ? {} : { tab: t }), [setParams]);
  const [opts, setOpts] = useState<AtOptions | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const onError = useCallback((m: string) => { setError(m); setNotice(""); }, []);
  const flash = useCallback((m: string) => { setNotice(m); setError(""); setTimeout(() => setNotice(""), 6000); }, []);
  useEffect(() => { api.schoolAttendance.options().then(setOpts).catch((e) => setError(errText(e))); }, []);
  const ctx: Ctx | null = opts ? { opts, flash, onError, go } : null;
  return (
    <SchoolLayout>
      <div className="space-y-4">
        <h1 className="flex items-center gap-2 text-[28px] font-extrabold tracking-[-0.5px] text-[#101b69]"><UserCheck size={26} className="text-blue-600" />Attendance</h1>
        <Tabs tabs={TABS} active={tab === "Calendar" ? null : tab} onPick={(t) => { setError(""); go(t); }} />
        {error && <Notice tone="error">{error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}
        {!ctx && !error && <p className="text-[13px] text-slate-500">Loading…</p>}
        {ctx && (
          <div className="rounded-xl border border-[#d8e9fb] bg-white p-5">
            {tab === "Overview" && <OverviewTab c={ctx} />}
            {tab === "Daily Attendance" && <DailyTab c={ctx} />}
            {tab === "Attendance Reports" && <ReportsTab c={ctx} />}
            {tab === "Leave Management" && <LeaveTab c={ctx} />}
            {tab === "Trends & Analytics" && <TrendsTab c={ctx} />}
            {tab === "Calendar" && <CalendarView c={ctx} />}
          </div>
        )}
      </div>
    </SchoolLayout>
  );
}
