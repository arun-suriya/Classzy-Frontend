import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, CheckCircle2, ClipboardList, Hourglass, Plus, Trash2, Upload } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../services/api";
import type { ExBand, ExEntry, ExExam, ExOptions, ExOverview, ExPaper, ExTable } from "../../services/api";
import { Field, Notice, OutlineButton, PrimaryButton, controlClass } from "../super-admin/AcademicShared";
import { errText } from "../super-admin/SettingsShared";
import { downloadReport } from "../super-admin/ReportExport";
import SchoolLayout from "./SchoolLayout";
import { Item, Menu, Modal, Table, td } from "./SchoolUi";

type Tab = "Overview" | "Exam Schedules" | "Result Entry" | "Grade Management" | "Reports";
const TABS: Tab[] = ["Overview", "Exam Schedules", "Result Entry", "Grade Management", "Reports"];
const fieldErrs = (e: unknown) => { const fe = (e as { fieldErrors?: Record<string, string> }).fieldErrors; return fe && Object.keys(fe).length ? fe : null; };
const ERR = (errs: Record<string, string>, k: string) => (errs[k] ? <p className="mt-1 text-[10px] text-rose-600">{errs[k]}</p> : null);
const day = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); };
const t12 = (t: string) => { const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const STAGE: Record<string, [string, string]> = { DRAFT: ["Draft", "bg-slate-100 text-slate-600"], SCHEDULED: ["Scheduled", "bg-sky-100 text-sky-700"], IN_PROGRESS: ["In Progress", "bg-amber-100 text-amber-800"], COMPLETED: ["Completed", "bg-emerald-100 text-emerald-700"] };
const RESULT: Record<string, [string, string]> = { DRAFT: ["Draft", "bg-slate-100 text-slate-600"], SUBMITTED: ["Submitted for review", "bg-amber-100 text-amber-800"], APPROVED: ["Approved", "bg-emerald-100 text-emerald-700"] };
const chip = (s: [string, string]) => <span className={`inline-block whitespace-nowrap rounded-md px-3 py-1 text-[11px] font-semibold ${s[1]}`}>{s[0]}</span>;
const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const csvOf = (t: ExTable) => [t.columns, ...t.rows, ...(t.total ? [t.total] : [])].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");

type Common = { opts: ExOptions; yearId: number | null; exams: ExExam[]; reload: () => void; flash: (m: string) => void; onError: (m: string) => void; go: (t: Tab) => void };

// ---------------------------------------------------------------- create / edit exam
function ExamForm({ opts, exam, yearId, onClose, onSaved, onError }: { opts: ExOptions; exam: ExExam | null; yearId: number | null; onClose: () => void; onSaved: (m: string) => void; onError: (m: string) => void }) {
  const [f, setF] = useState({ name: exam?.name ?? "", yearId: exam?.yearId ?? yearId, termId: exam?.termId ?? null as number | null, type: exam?.type ?? "", sectionIds: exam?.sectionIds ?? [] as number[], startDate: exam?.startDate ?? "", endDate: exam?.endDate ?? "", scale: exam?.scale ?? opts.scales[0]?.code ?? "PERCENTAGE", passPercent: String(exam?.passPercent ?? 35) });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const classes = opts.classes.filter((c) => c.yearId === f.yearId);
  const toggle = (id: number) => setF((x) => ({ ...x, sectionIds: x.sectionIds.includes(id) ? x.sectionIds.filter((s) => s !== id) : [...x.sectionIds, id] }));
  const save = async () => {
    setBusy(true); setErrs({});
    try { const b = { name: f.name, yearId: f.yearId, termId: f.termId, type: f.type, sectionIds: f.sectionIds, startDate: f.startDate, endDate: f.endDate, scale: f.scale, passPercent: f.passPercent === "" ? null : Number(f.passPercent) }; if (exam) await api.schoolExams.update(exam.id, b); else await api.schoolExams.create(b); onSaved(exam ? "Exam updated." : "Exam saved as a draft."); }
    catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else onError(errText(e)); } finally { setBusy(false); }
  };
  return (
    <Modal title={exam ? "Edit Exam" : "Create Exam"} wide onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Exam Name" required className="sm:col-span-1"><input value={f.name} maxLength={120} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Term 1 – Science" className={controlClass} />{ERR(errs, "name")}</Field>
        <Field label="Academic Year" required><select value={f.yearId ?? ""} onChange={(e) => setF({ ...f, yearId: e.target.value ? Number(e.target.value) : null, termId: null, sectionIds: [] })} className={controlClass}>{opts.years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</select>{ERR(errs, "yearId")}</Field>
        <Field label="Term" required><select value={f.termId ?? ""} onChange={(e) => setF({ ...f, termId: e.target.value ? Number(e.target.value) : null })} className={controlClass}><option value="">Select term</option>{opts.terms.filter((t) => t.yearId === f.yearId).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>{ERR(errs, "termId")}</Field>
        <Field label="Exam Type" required><select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className={controlClass}><option value="">Select exam type</option>{opts.types.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}</select>{ERR(errs, "type")}</Field>
        <Field label="Start Date" required><input type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value, endDate: f.endDate && f.endDate < e.target.value ? e.target.value : f.endDate })} className={controlClass} />{ERR(errs, "startDate")}</Field>
        <Field label="End Date" required><input type="date" value={f.endDate} min={f.startDate || undefined} onChange={(e) => setF({ ...f, endDate: e.target.value })} className={controlClass} />{ERR(errs, "endDate")}</Field>
        <Field label="Grading Scale" required><select value={f.scale} onChange={(e) => setF({ ...f, scale: e.target.value })} className={controlClass}>{opts.scales.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}</select>{ERR(errs, "scale")}</Field>
        <Field label="Pass Mark (%)" required><input type="number" min={0} max={100} value={f.passPercent} onChange={(e) => setF({ ...f, passPercent: e.target.value })} className={controlClass} />{ERR(errs, "passPercent")}</Field>
      </div>
      <Field label="Grades / Sections" required>
        <div className="max-h-48 space-y-2 overflow-auto rounded-lg border border-[#cfe0f6] bg-white p-2">
          {classes.length === 0 && <p className="text-[12px] text-slate-500">No grades set up for this year.</p>}
          {classes.map((c) => <div key={c.id} className="flex flex-wrap items-center gap-1.5"><span className="w-24 shrink-0 text-[12px] font-bold text-[#17245e]">{c.name}</span>{opts.sections.filter((s) => s.classId === c.id).map((s) => <button key={s.id} type="button" aria-pressed={f.sectionIds.includes(s.id)} onClick={() => toggle(s.id)} className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${f.sectionIds.includes(s.id) ? "border-[#0875fb] bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{c.name} – {s.name}</button>)}</div>)}
        </div>{ERR(errs, "sectionIds")}
      </Field>
      <div className="flex justify-end gap-2"><OutlineButton type="button" onClick={onClose}>Cancel</OutlineButton><PrimaryButton type="button" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : exam ? "Save Changes" : "Save as Draft"}</PrimaryButton></div>
    </Modal>
  );
}

// ---------------------------------------------------------------- overview
function OverviewTab({ c, ov, onYear }: { c: Common; ov: ExOverview | null; onYear: (y: number) => void }) {
  const [form, setForm] = useState<{ exam: ExExam | null } | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const remove = async (e: ExExam) => { if (!window.confirm(`Delete the exam "${e.name}"?`)) return; try { await api.schoolExams.remove(e.id); c.flash("Exam deleted."); c.reload(); } catch (x) { c.onError(errText(x)); } };
  const kpi = (icon: ReactNode, n: number | undefined, label: string, tone: string) => <div className={`flex items-center gap-3 rounded-xl p-4 ${tone}`}>{icon}<div><div className="text-[24px] font-extrabold leading-none text-[#101b69]">{n ?? "–"}</div><div className="text-[12px] text-slate-600">{label}</div></div></div>;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Field label="Academic Year" className="w-48"><select value={c.yearId ?? ""} onChange={(e) => onYear(Number(e.target.value))} className={controlClass}>{c.opts.years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</select></Field>
        <PrimaryButton type="button" onClick={() => setForm({ exam: null })}><Plus size={14} />Create Exam</PrimaryButton>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {kpi(<CalendarClock size={26} className="text-blue-600" />, ov?.scheduled, "Scheduled", "bg-sky-50")}
        {kpi(<Hourglass size={26} className="text-orange-500" />, ov?.inProgress, "In Progress", "bg-orange-50")}
        {kpi(<ClipboardList size={26} className="text-violet-600" />, ov?.pendingReview, "Pending Review", "bg-violet-50")}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="rounded-xl border border-[#d8e9fb] p-4">
          <h3 className="mb-2 text-[16px] font-extrabold text-[#101b69]">Upcoming Exams</h3>
          <Table heads={["Exam", "Grade", "Date", "Status"]} colSpan={4} empty={ov && ov.upcoming.length === 0 ? "No upcoming papers. Publish an exam schedule to see them here." : !ov ? "Loading…" : undefined}>
            {ov?.upcoming.map((u, i) => <tr key={i}><td className={td}>{u.examName}</td><td className={td}>{u.grade}</td><td className={td}>{day(u.date)}</td><td className={td}>{chip(STAGE[u.stage] ?? STAGE.SCHEDULED)}</td></tr>)}
          </Table>
        </div>
        <div className="rounded-xl border border-[#d8e9fb] p-4">
          <h3 className="mb-2 text-[16px] font-extrabold text-[#101b69]">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => c.go("Exam Schedules")} className="rounded-lg border border-[#cfe0f6] p-3 text-center text-[12px] font-semibold hover:bg-blue-50"><CalendarClock size={22} className="mx-auto mb-1 text-blue-600" />Generate Timetable</button>
            <button type="button" onClick={() => c.go("Result Entry")} className="rounded-lg border border-[#cfe0f6] p-3 text-center text-[12px] font-semibold hover:bg-blue-50"><Upload size={22} className="mx-auto mb-1 text-blue-600" />Upload Results</button>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-[#d8e9fb] p-4">
        <h3 className="mb-2 text-[16px] font-extrabold text-[#101b69]">All Exams</h3>
        <Table heads={["Exam", "Term", "Type", "Dates", "Grades", "Status", "Action"]} colSpan={7} empty={ov && ov.exams.length === 0 ? "No exams for this year yet." : !ov ? "Loading…" : undefined}>
          {ov?.exams.map((e) => (
            <tr key={e.id}><td className={`${td} font-semibold`}>{e.name}</td><td className={td}>{e.termName ?? "—"}</td><td className={td}>{e.typeLabel}</td><td className={td}>{day(e.startDate)} – {day(e.endDate)}</td><td className={td}>{e.gradesLabel}</td><td className={td}>{chip(STAGE[e.stage] ?? STAGE.DRAFT)}</td>
              <td className={td}><Menu id={`e${e.id}`} open={menu} setOpen={setMenu}><Item onClick={() => { setMenu(null); setForm({ exam: e }); }}>{e.published ? "View / edit (unpublish first)" : "Edit"}</Item><Item danger onClick={() => { setMenu(null); void remove(e); }}>Delete</Item></Menu></td></tr>
          ))}
        </Table>
      </div>
      {form && <ExamForm opts={c.opts} exam={form.exam} yearId={c.yearId} onClose={() => setForm(null)} onError={c.onError} onSaved={(m) => { setForm(null); c.flash(m); c.reload(); }} />}
    </div>
  );
}


// ---------------------------------------------------------------- schedules
function PaperModal({ paper, onClose, onSaved, onError }: { paper: ExPaper; onClose: () => void; onSaved: () => void; onError: (m: string) => void }) {
  const [f, setF] = useState({ date: paper.date, startTime: paper.startTime, endTime: paper.endTime, room: paper.room ?? "", maxMarks: String(paper.maxMarks) });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); setErrs({}); try { await api.schoolExams.updatePaper(paper.id, { ...f, maxMarks: f.maxMarks === "" ? null : Number(f.maxMarks) }); onSaved(); } catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else onError(errText(e)); } finally { setBusy(false); } };
  return (
    <Modal title={`${paper.subjectName} · ${paper.className}`} onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Date" required><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className={controlClass} />{ERR(errs, "date")}</Field>
        <Field label="Room" optional><input value={f.room} maxLength={40} onChange={(e) => setF({ ...f, room: e.target.value })} className={controlClass} />{ERR(errs, "room")}</Field>
        <Field label="Start time" required><input type="time" value={f.startTime} onChange={(e) => setF({ ...f, startTime: e.target.value })} className={controlClass} />{ERR(errs, "startTime")}</Field>
        <Field label="End time" required><input type="time" value={f.endTime} onChange={(e) => setF({ ...f, endTime: e.target.value })} className={controlClass} />{ERR(errs, "endTime")}</Field>
        <Field label="Maximum marks" required><input type="number" min={1} value={f.maxMarks} onChange={(e) => setF({ ...f, maxMarks: e.target.value })} className={controlClass} />{ERR(errs, "maxMarks")}</Field>
      </div>
      <div className="flex justify-end gap-2"><OutlineButton type="button" onClick={onClose}>Cancel</OutlineButton><PrimaryButton type="button" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save"}</PrimaryButton></div>
    </Modal>
  );
}

function SchedulesTab({ c }: { c: Common }) {
  const [examId, setExamId] = useState<number | null>(c.exams[0]?.id ?? null);
  const [classId, setClassId] = useState<number | null>(null);
  const [papers, setPapers] = useState<ExPaper[] | null>(null);
  const [edit, setEdit] = useState<ExPaper | null>(null);
  const [gen, setGen] = useState(false);
  const [g, setG] = useState({ startTime: "09:00", minutes: "120" });
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const exam = c.exams.find((e) => e.id === examId) ?? null;
  const classes = useMemo(() => { const ids = new Set(c.opts.sections.filter((s) => exam?.sectionIds.includes(s.id)).map((s) => s.classId)); return c.opts.classes.filter((x) => ids.has(x.id)); }, [c.opts, exam]);
  const load = useCallback(() => { if (examId === null) { setPapers([]); return; } api.schoolExams.papers(examId, classId).then(setPapers).catch((e) => c.onError(errText(e))); }, [examId, classId, c.onError]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load]);
  const act = async (fn: () => Promise<unknown>, ok: string) => { setBusy(true); try { await fn(); c.flash(ok); c.reload(); load(); } catch (e) { c.onError(errText(e)); } finally { setBusy(false); } };
  const draft = exam && !exam.published;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Exam" className="w-64"><select value={examId ?? ""} onChange={(e) => { setExamId(e.target.value ? Number(e.target.value) : null); setClassId(null); }} className={controlClass}>{c.exams.length === 0 && <option value="">No exams yet</option>}{c.exams.map((e) => <option key={e.id} value={e.id}>{e.name}{e.termName ? ` (${e.termName})` : ""}</option>)}</select></Field>
        <Field label="Grade" className="w-40"><select value={classId ?? ""} onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : null)} className={controlClass}><option value="">All grades</option>{classes.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <div className="ml-auto flex gap-2">
          <OutlineButton type="button" disabled={!draft || busy} onClick={() => setGen(true)}><CalendarClock size={14} />Generate Timetable</OutlineButton>
          {exam?.published ? <OutlineButton type="button" disabled={busy} onClick={() => void act(() => api.schoolExams.unpublish(exam.id), "Schedule moved back to draft.")}>Unpublish</OutlineButton>
            : <PrimaryButton type="button" disabled={!exam || busy} onClick={() => exam && void act(() => api.schoolExams.publish(exam.id), "Schedule published.")}><CheckCircle2 size={14} />Publish Schedule</PrimaryButton>}
        </div>
      </div>
      {exam && <p className="text-[12px] text-slate-600">{exam.name} · {day(exam.startDate)} – {day(exam.endDate)} · {chip(STAGE[exam.stage] ?? STAGE.DRAFT)}{exam.published ? " The schedule is published; unpublish it to change papers." : ""}</p>}
      <Table heads={["Date", "Time", "Subject", "Grade", "Room", "Max marks", ""]} colSpan={7} empty={papers && papers.length === 0 ? (exam ? "No papers yet. Use Generate Timetable to create them from each grade's subjects." : "Create an exam first.") : !papers ? "Loading…" : undefined}>
        {papers?.map((p) => (
          <tr key={p.id}><td className={td}>{day(p.date)}</td><td className={td}>{t12(p.startTime)} – {t12(p.endTime)}</td><td className={td}>{p.subjectName}</td><td className={td}>{p.className}</td><td className={td}>{p.room ?? "—"}</td><td className={td}>{p.maxMarks}</td>
            <td className={td}>{draft && <Menu id={`p${p.id}`} open={menu} setOpen={setMenu}><Item onClick={() => { setMenu(null); setEdit(p); }}>Edit</Item><Item danger onClick={() => { setMenu(null); void act(() => api.schoolExams.deletePaper(p.id), "Paper removed."); }}>Remove</Item></Menu>}</td></tr>
        ))}
      </Table>
      <p className="text-[11px] text-slate-500">Generate Timetable adds one paper per subject for each grade, one per working day from the exam's start date, and keeps papers that already exist. Edit a paper to set rooms or change the date or time.</p>
      {edit && <PaperModal paper={edit} onClose={() => setEdit(null)} onError={c.onError} onSaved={() => { setEdit(null); c.flash("Paper updated."); load(); }} />}
      {gen && exam && (
        <Modal title="Generate Timetable" onClose={() => setGen(false)}>
          <p className="text-[12px] text-slate-600">Adds missing papers for {exam.gradesLabel}. Nothing already scheduled is changed.</p>
          <div className="grid grid-cols-2 gap-3"><Field label="Start time"><input type="time" value={g.startTime} onChange={(e) => setG({ ...g, startTime: e.target.value })} className={controlClass} /></Field><Field label="Duration (minutes)"><input type="number" min={15} max={480} value={g.minutes} onChange={(e) => setG({ ...g, minutes: e.target.value })} className={controlClass} /></Field></div>
          <div className="flex justify-end gap-2"><OutlineButton type="button" onClick={() => setGen(false)}>Cancel</OutlineButton><PrimaryButton type="button" disabled={busy} onClick={() => { setGen(false); void act(async () => { const r = await api.schoolExams.generate(exam.id, { startTime: g.startTime, minutes: g.minutes === "" ? null : Number(g.minutes) }); c.flash(`${r.created} paper${r.created === 1 ? "" : "s"} added${r.existing ? `, ${r.existing} already existed` : ""}.`); }, "Timetable generated."); }}>Generate</PrimaryButton></div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- result entry
function parseUpload(text: string, rows: ExEntry["rows"], max: number): { next: Record<number, { marks: string; absent: boolean }>; applied: number; skipped: string[] } {
  const next: Record<number, { marks: string; absent: boolean }> = {};
  const skipped: string[] = [];
  let applied = 0;
  text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((line, i) => {
    const cells = line.split(",").map((x) => x.trim().replace(/^"|"$/g, ""));
    if (i === 0 && cells[1] && Number.isNaN(Number(cells[1])) && !/^(ab|absent|a)$/i.test(cells[1])) return; // header
    const stu = rows.find((r) => r.admissionNo.toLowerCase() === (cells[0] ?? "").toLowerCase());
    if (!stu) { skipped.push(`${cells[0] || "(blank)"}: not in this section`); return; }
    const v = cells[1] ?? "";
    if (/^(ab|absent|a)$/i.test(v)) { next[stu.studentId] = { marks: "", absent: true }; applied++; return; }
    const n = Number(v);
    if (v === "" || Number.isNaN(n) || n < 0 || n > max) { skipped.push(`${stu.admissionNo}: "${v}" isn't a mark from 0 to ${max}`); return; }
    next[stu.studentId] = { marks: String(n), absent: false }; applied++;
  });
  return { next, applied, skipped };
}

function EntryTab({ c }: { c: Common }) {
  const published = c.exams.filter((e) => e.published);
  const [examId, setExamId] = useState<number | null>(published[0]?.id ?? null);
  const exam = published.find((e) => e.id === examId) ?? null;
  const secs = c.opts.sections.filter((s) => exam?.sectionIds.includes(s.id));
  const [sectionId, setSectionId] = useState<number | null>(null);
  const sec = secs.find((s) => s.id === sectionId) ?? secs[0] ?? null;
  const subjects = c.opts.classSubjects.filter((s) => s.classId === sec?.classId);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const subj = subjects.find((s) => s.subjectId === subjectId) ?? subjects[0] ?? null;
  const [entry, setEntry] = useState<ExEntry | null>(null);
  const [vals, setVals] = useState<Record<number, { marks: string; absent: boolean }>>({});
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const key = exam && sec && subj ? `${exam.id}/${sec.id}/${subj.subjectId}` : "";
  const apply = (e: ExEntry) => { setEntry(e); setVals(Object.fromEntries(e.rows.map((r) => [r.studentId, { marks: r.marks === null ? "" : String(r.marks), absent: r.absent }]))); };
  useEffect(() => {
    setEntry(null); setErrs({});
    if (!exam || !sec || !subj) return;
    let live = true;
    api.schoolExams.entry(exam.id, subj.subjectId, sec.id).then((e) => { if (live) apply(e); }).catch((x) => { if (live) c.onError(errText(x)); });
    return () => { live = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const body = () => ({ subjectId: subj!.subjectId, sectionId: sec!.id, rows: (entry?.rows ?? []).map((r) => { const v = vals[r.studentId] ?? { marks: "", absent: false }; return { studentId: r.studentId, marks: v.absent || v.marks === "" ? null : Number(v.marks), absent: v.absent }; }) });
  const run = async (fn: () => Promise<ExEntry>, ok: string) => { setBusy(true); setErrs({}); try { apply(await fn()); c.flash(ok); c.reload(); } catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else c.onError(errText(e)); } finally { setBusy(false); } };
  const editable = !!entry?.editable;
  const filled = entry ? entry.rows.filter((r) => vals[r.studentId]?.absent || (vals[r.studentId]?.marks ?? "") !== "").length : 0;
  const upload = async (f: File | undefined) => {
    if (!f || !entry) return;
    const { next, applied, skipped } = parseUpload(await f.text(), entry.rows, entry.maxMarks);
    setVals((v) => ({ ...v, ...next }));
    c.flash(`${applied} mark${applied === 1 ? "" : "s"} loaded from the file. Review them, then Save Draft.${skipped.length ? ` Skipped ${skipped.length}: ${skipped.slice(0, 3).join("; ")}${skipped.length > 3 ? "…" : ""}` : ""}`);
    if (file.current) file.current.value = "";
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Exam" className="w-56"><select value={examId ?? ""} onChange={(e) => { setExamId(e.target.value ? Number(e.target.value) : null); setSectionId(null); setSubjectId(null); }} className={controlClass}>{published.length === 0 && <option value="">No published exams</option>}{published.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></Field>
        <Field label="Subject" className="w-48"><select value={subj?.subjectId ?? ""} onChange={(e) => setSubjectId(Number(e.target.value))} className={controlClass}>{subjects.map((s) => <option key={s.subjectId} value={s.subjectId}>{s.name}</option>)}</select></Field>
        <Field label="Grade / Section" className="w-48"><select value={sec?.id ?? ""} onChange={(e) => { setSectionId(Number(e.target.value)); setSubjectId(null); }} className={controlClass}>{secs.map((s) => <option key={s.id} value={s.id}>{s.className} / {s.name}</option>)}</select></Field>
        {entry && <div className="pb-1.5">{chip(RESULT[entry.status] ?? RESULT.DRAFT)}</div>}
      </div>
      {published.length === 0 && <Notice tone="info">Results can be entered once an exam's schedule is published.</Notice>}
      {errs.rows && <Notice tone="error">{errs.rows}</Notice>}
      {entry && (
        <>
          <div className="overflow-x-auto rounded-lg border border-[#cfe0f6]"><table className="w-full min-w-[480px] border-collapse text-left text-[13px]">
            <thead><tr className="bg-[#e8f1fd] text-[#13205f]"><th className="px-4 py-2.5 font-bold">Admission No.</th><th className="px-4 py-2.5 font-bold">Student</th><th className="px-4 py-2.5 font-bold">Marks (out of {entry.maxMarks})</th><th className="px-4 py-2.5 font-bold">Absent</th></tr></thead>
            <tbody>
              {entry.rows.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-[12px] text-slate-500">No active students in this section.</td></tr>}
              {entry.rows.map((r) => { const v = vals[r.studentId] ?? { marks: "", absent: false }; const err = errs[`row${r.studentId}`]; return (
                <tr key={r.studentId} className="border-t border-[#e3eefc]"><td className="px-4 py-2">{r.admissionNo}</td><td className="px-4 py-2">{r.name}</td>
                  <td className="px-4 py-1.5"><input type="number" min={0} max={entry.maxMarks} step="0.5" aria-label={`Marks for ${r.name}`} disabled={!editable || v.absent} value={v.absent ? "" : v.marks} placeholder={v.absent ? "–" : ""} onChange={(e) => setVals({ ...vals, [r.studentId]: { marks: e.target.value, absent: false } })} className={`${controlClass} !w-28 ${err ? "!border-rose-400" : ""}`} />{err && <p className="text-[10px] text-rose-600">{err}</p>}</td>
                  <td className="px-4 py-2"><input type="checkbox" aria-label={`${r.name} absent`} disabled={!editable} checked={v.absent} onChange={(e) => setVals({ ...vals, [r.studentId]: { marks: "", absent: e.target.checked } })} /></td></tr>); })}
            </tbody></table></div>
          <p className="text-[11px] text-slate-500">{filled} of {entry.rows.length} entered · pass mark {entry.passPercent}%{entry.reviewedBy && entry.status === "APPROVED" ? ` · approved by ${entry.reviewedBy}` : ""}. Upload Marks reads a CSV with "Admission No, Marks" per line (use AB for absent).</p>
          <div className="flex flex-wrap gap-2">
            <input ref={file} type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} />
            <OutlineButton type="button" disabled={!editable || busy} onClick={() => file.current?.click()}><Upload size={14} />Upload Marks</OutlineButton>
            <OutlineButton type="button" disabled={!editable || busy} onClick={() => void run(() => api.schoolExams.saveEntry(exam!.id, body()), "Draft saved.")}>Save Draft</OutlineButton>
            {entry.status === "DRAFT" && <PrimaryButton type="button" disabled={busy} className="flex-1 justify-center" onClick={() => void run(async () => { await api.schoolExams.saveEntry(exam!.id, body()); return api.schoolExams.submit(exam!.id, subj!.subjectId, sec!.id); }, "Submitted for review.")}>Submit for Review</PrimaryButton>}
            {entry.status === "SUBMITTED" && <PrimaryButton type="button" disabled={busy} onClick={() => void run(() => api.schoolExams.approve(exam!.id, subj!.subjectId, sec!.id), "Results approved.")}>Approve</PrimaryButton>}
            {entry.status !== "DRAFT" && <OutlineButton type="button" disabled={busy} onClick={() => { if (entry.status !== "APPROVED" || window.confirm("Return approved results to draft? Reports will stop counting them until they're approved again.")) void run(() => api.schoolExams.reopen(exam!.id, subj!.subjectId, sec!.id), "Returned to draft."); }}>Return to draft</OutlineButton>}
          </div>
          <p className="text-[11px] text-slate-500">Reports count only approved results. The same person can submit and approve; there's no separate reviewer role yet.</p>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- grade management
function GradesTab({ c }: { c: Common }) {
  const [rows, setRows] = useState<{ grade: string; min: string; max: string; remark: string }[] | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const toRows = (b: ExBand[]) => b.map((x) => ({ grade: x.grade, min: String(x.min ?? ""), max: String(x.max ?? ""), remark: x.remark ?? "" }));
  useEffect(() => { api.schoolExams.bands().then((b) => setRows(toRows(b))).catch((e) => c.onError(errText(e))); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (i: number, p: Partial<{ grade: string; min: string; max: string; remark: string }>) => setRows((r) => r && r.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const save = async () => {
    if (!rows) return; setBusy(true); setErrs({});
    try { setRows(toRows(await api.schoolExams.saveBands(rows.map((r) => ({ grade: r.grade, min: r.min === "" ? null : Number(r.min), max: r.max === "" ? null : Number(r.max), remark: r.remark })))) ); c.flash("Grade bands saved."); }
    catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else c.onError(errText(e)); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Field label="Scale" className="w-64"><select disabled className={controlClass}><option>{c.opts.scales[0]?.label ?? "Percentage (0 – 100)"}</option></select></Field>
        <div className="flex gap-2">{rows && rows.length === 0 && <OutlineButton type="button" onClick={() => setRows([{ grade: "A", min: "90", max: "100", remark: "Excellent" }, { grade: "B", min: "75", max: "89", remark: "Very Good" }, { grade: "C", min: "60", max: "74", remark: "Good" }, { grade: "D", min: "40", max: "59", remark: "Satisfactory" }, { grade: "E", min: "0", max: "39", remark: "Needs Improvement" }])}>Use standard bands</OutlineButton>}
          <PrimaryButton type="button" onClick={() => setRows((r) => [...(r ?? []), { grade: "", min: "", max: "", remark: "" }])}><Plus size={14} />Add Grade Band</PrimaryButton></div>
      </div>
      <Notice tone="info">Percentage is the only grading scale exams support. Bands must cover 0% to 100% with no gaps or overlaps. Grades are worked out when a report is generated, from the rounded percentage, so changing a band changes every report.</Notice>
      {errs.bands && <Notice tone="error">{errs.bands}</Notice>}
      <div className="overflow-x-auto rounded-lg border border-[#cfe0f6]"><table className="w-full min-w-[520px] border-collapse text-left text-[13px]">
        <thead><tr className="bg-[#e8f1fd] text-[#13205f]">{["Grade", "Min %", "Max %", "Remark", ""].map((h) => <th key={h} className="px-4 py-2.5 font-bold">{h}</th>)}</tr></thead>
        <tbody>
          {!rows && <tr><td colSpan={5} className="px-4 py-8 text-center text-[12px] text-slate-500">Loading…</td></tr>}
          {rows && rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-[12px] text-slate-500">No grade bands yet. Add them, or start from the standard set.</td></tr>}
          {rows?.map((r, i) => (
            <tr key={i} className="border-t border-[#e3eefc]">
              <td className="px-4 py-1.5"><input aria-label="Grade" value={r.grade} maxLength={10} onChange={(e) => set(i, { grade: e.target.value })} className={`${controlClass} !w-24`} />{errs[`grade${i}`] && <p className="text-[10px] text-rose-600">{errs[`grade${i}`]}</p>}</td>
              <td className="px-4 py-1.5"><input aria-label="Minimum percent" type="number" min={0} max={100} value={r.min} onChange={(e) => set(i, { min: e.target.value })} className={`${controlClass} !w-24`} />{errs[`range${i}`] && <p className="text-[10px] text-rose-600">{errs[`range${i}`]}</p>}</td>
              <td className="px-4 py-1.5"><input aria-label="Maximum percent" type="number" min={0} max={100} value={r.max} onChange={(e) => set(i, { max: e.target.value })} className={`${controlClass} !w-24`} /></td>
              <td className="px-4 py-1.5"><input aria-label="Remark" value={r.remark} maxLength={60} onChange={(e) => set(i, { remark: e.target.value })} className={controlClass} />{errs[`remark${i}`] && <p className="text-[10px] text-rose-600">{errs[`remark${i}`]}</p>}</td>
              <td className="px-4 py-1.5"><button type="button" aria-label="Remove band" onClick={() => setRows((x) => x && x.filter((_, k) => k !== i))} className="rounded p-1.5 text-slate-400 hover:text-rose-600"><Trash2 size={15} /></button></td>
            </tr>))}
        </tbody></table></div>
      <div className="flex justify-end"><PrimaryButton type="button" disabled={busy || !rows} onClick={() => void save()}>{busy ? "Saving…" : "Save Changes"}</PrimaryButton></div>
    </div>
  );
}

// ---------------------------------------------------------------- reports
const REPORTS = [
  { code: "RESULT_SUMMARY", name: "Result Summary", text: "Overall results and pass percentage for the exam." },
  { code: "SUBJECT_PERFORMANCE", name: "Subject Performance", text: "Subject-wise performance and class average." },
  { code: "REPORT_CARDS", name: "Student Report Cards", text: "Individual student result cards with grades." },
];

function printCards(t: ExTable) {
  const n = t.columns.length, subjStart = 3, subjEnd = n - 5;
  const cards = t.rows.map((r) => `<section><h2>${esc(t.title.replace("Student Report Cards", "Report Card"))}</h2><p class="sub">${esc(t.subtitle)}</p><p><b>${esc(r[1])}</b> &middot; Admission No. ${esc(r[0])} &middot; ${esc(r[2])}</p>`
    + `<table><thead><tr><th>Subject</th><th>Marks</th></tr></thead><tbody>${t.columns.slice(subjStart, subjEnd).map((c, i) => `<tr><td>${esc(c)}</td><td>${esc(r[subjStart + i])}</td></tr>`).join("")}</tbody></table>`
    + `<p>Total: <b>${esc(r[n - 5])}</b> &middot; Percentage: <b>${esc(r[n - 4])}</b> &middot; Grade: <b>${esc(r[n - 3])}</b> &middot; Result: <b>${esc(r[n - 2])}</b> &middot; Rank: <b>${esc(r[n - 1])}</b></p></section>`).join("");
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(`<!doctype html><title>${esc(t.title)}</title><style>body{font-family:Arial,sans-serif;margin:24px}section{page-break-after:always;max-width:640px;margin:0 auto 32px}h2{margin:0}.sub{color:#555;margin:2px 0 12px;font-size:13px}table{border-collapse:collapse;width:100%;margin:10px 0}th,td{border:1px solid #bbb;padding:6px 10px;text-align:left}th{background:#e8f1fd}</style>${cards}<script>window.onload=function(){window.print()}<\/script>`);
  w.document.close();
  return true;
}

function ReportsTab({ c }: { c: Common }) {
  const [examId, setExamId] = useState<number | null>(c.exams[0]?.id ?? null);
  const [classId, setClassId] = useState<number | null>(null);
  const [table, setTable] = useState<{ code: string; t: ExTable } | null>(null);
  const [busy, setBusy] = useState("");
  const exam = c.exams.find((e) => e.id === examId) ?? null;
  const classes = c.opts.classes.filter((x) => c.opts.sections.some((s) => s.classId === x.id && exam?.sectionIds.includes(s.id)));
  const gen = async (code: string) => { if (!exam) return; setBusy(code); try { setTable({ code, t: await api.schoolExams.report(exam.id, code, classId) }); } catch (e) { c.onError(errText(e)); } finally { setBusy(""); } };
  const t = table?.t;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Exam" className="w-64"><select value={examId ?? ""} onChange={(e) => { setExamId(e.target.value ? Number(e.target.value) : null); setClassId(null); setTable(null); }} className={controlClass}>{c.exams.length === 0 && <option value="">No exams yet</option>}{c.exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></Field>
        <Field label="Grade" className="w-44"><select value={classId ?? ""} onChange={(e) => { setClassId(e.target.value ? Number(e.target.value) : null); setTable(null); }} className={controlClass}><option value="">All grades</option>{classes.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
      </div>
      <div className="overflow-hidden rounded-lg border border-[#cfe0f6]">
        <div className="grid grid-cols-[180px_1fr_120px] bg-[#e8f1fd] px-4 py-2.5 text-[13px] font-bold text-[#13205f]"><span>Report</span><span>Description</span><span /></div>
        {REPORTS.map((r) => <div key={r.code} className="grid grid-cols-[180px_1fr_120px] items-center border-t border-[#e3eefc] px-4 py-3 text-[13px]"><span className="font-semibold">{r.name}</span><span className="text-slate-600">{r.text}</span><OutlineButton type="button" disabled={!exam || busy !== ""} onClick={() => void gen(r.code)}>{busy === r.code ? "…" : "Generate"}</OutlineButton></div>)}
      </div>
      {t && (
        <div className="space-y-3">
          <div className="rounded-lg border border-[#cfe0f6] bg-[#fbfdff] px-4 py-3"><div className="text-[18px] font-extrabold text-[#101b69]">{t.title}</div><div className="text-[12px] text-slate-600">{t.subtitle}</div></div>
          <div className="overflow-x-auto rounded-lg border border-[#cfe0f6]"><table className="w-full border-collapse text-left text-[13px]">
            <thead><tr className="bg-[#e8f1fd] text-[#13205f]">{t.columns.map((h, i) => <th key={i} className={`border-b border-[#cfe0f6] px-4 py-2.5 font-bold ${t.numeric[i] ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
            <tbody>
              {t.rows.length === 0 && <tr><td colSpan={t.columns.length} className="px-4 py-8 text-center text-[12px] text-slate-500">No approved results yet for this selection. Approve results in Result Entry first.</td></tr>}
              {t.rows.map((r, ri) => <tr key={ri}>{r.map((v, i) => <td key={i} className={`border-b border-[#e3eefc] px-4 py-2 ${t.numeric[i] ? "text-right tabular-nums" : ""}`}>{v}</td>)}</tr>)}
              {t.total && t.rows.length > 0 && <tr className="bg-[#e8f1fd] font-extrabold">{t.total.map((v, i) => <td key={i} className={`px-4 py-2.5 ${t.numeric[i] ? "text-right tabular-nums" : ""}`}>{v}</td>)}</tr>}
            </tbody></table></div>
          {t.note && <p className="text-[11px] text-slate-500">{t.note}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            {table?.code === "REPORT_CARDS" && <OutlineButton type="button" disabled={t.rows.length === 0} onClick={() => { if (!printCards(t)) c.onError("Your browser blocked the print window. Allow pop-ups for this site and try again."); }}>Print cards</OutlineButton>}
            <OutlineButton type="button" disabled={t.rows.length === 0} onClick={() => downloadReport(t.title, csvOf(t), "EXCEL")}>Export Excel</OutlineButton>
            <PrimaryButton type="button" disabled={t.rows.length === 0} onClick={() => downloadReport(t.title, csvOf(t), "PDF")}>Export PDF</PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- page
export default function Examinations() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.find((t) => t === params.get("tab")) ?? "Overview";
  const go = useCallback((t: Tab) => setParams(t === "Overview" ? {} : { tab: t }), [setParams]);
  const [opts, setOpts] = useState<ExOptions | null>(null);
  const [yearId, setYearId] = useState<number | null>(null);
  const [ov, setOv] = useState<ExOverview | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const onError = useCallback((m: string) => { setError(m); setNotice(""); }, []);
  const flash = useCallback((m: string) => { setNotice(m); setError(""); setTimeout(() => setNotice(""), 7000); }, []);
  useEffect(() => { api.schoolExams.options().then((o) => { setOpts(o); setYearId(o.years.find((y) => y.current)?.id ?? o.years[0]?.id ?? null); }).catch((e) => setError(errText(e))); }, []);
  const reload = useCallback(() => { if (yearId === null) return; api.schoolExams.overview(yearId).then(setOv).catch((e) => setError(errText(e))); }, [yearId]);
  useEffect(reload, [reload]);
  const common: Common | null = opts ? { opts, yearId, exams: ov?.exams ?? [], reload, flash, onError, go } : null;
  const ready = common && ov;
  return (
    <SchoolLayout>
      <div className="space-y-4">
        <h1 className="flex items-center gap-2 text-[28px] font-extrabold tracking-[-0.5px] text-[#101b69]"><ClipboardList size={26} className="text-blue-600" />Examinations</h1>
        <div className="flex flex-wrap gap-2">{TABS.map((t) => <button key={t} type="button" onClick={() => { setError(""); go(t); }} className={`rounded-lg px-5 py-2.5 text-[14px] font-semibold ${tab === t ? "bg-[#0875fb] text-white" : "text-[#101b69] hover:bg-blue-50"}`}>{t}</button>)}</div>
        {error && <Notice tone="error">{error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}
        {!ready && !error && <p className="text-[13px] text-slate-500">Loading…</p>}
        {ready && (
          <div className="rounded-xl border border-[#d8e9fb] bg-white p-5">
            {tab === "Overview" && <OverviewTab c={common} ov={ov} onYear={(y) => { setOv(null); setYearId(y); }} />}
            {tab === "Exam Schedules" && <div key={`s${yearId}`}><SchedulesTab c={common} /></div>}
            {tab === "Result Entry" && <div key={`r${yearId}`}><EntryTab c={common} /></div>}
            {tab === "Grade Management" && <GradesTab c={common} />}
            {tab === "Reports" && <div key={`p${yearId}`}><ReportsTab c={common} /></div>}
          </div>
        )}
      </div>
    </SchoolLayout>
  );
}
