import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "../../services/api";
import type { AcaAsg, AcaAsgPage, AcaCell, AcaHw, AcaHwPage, AcaOptions, AcaSec, AcaSubmission, AcaTimetable } from "../../services/api";
import { Field, Notice, OutlineButton, PrimaryButton, controlClass } from "../super-admin/AcademicShared";
import { errText } from "../super-admin/SettingsShared";
import SchoolLayout from "./SchoolLayout";
import { Item, Menu, Modal, Pager, SmallBtn, StatusChip, Table, dayFmt, isoDay, parseDay, td } from "./SchoolUi";

type Tab = "Subjects" | "Classes" | "Timetable" | "Homework" | "Assignments";
const TABS: Tab[] = ["Subjects", "Classes", "Timetable", "Homework", "Assignments"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const fieldErrs = (e: unknown) => { const fe = (e as { fieldErrors?: Record<string, string> }).fieldErrors; return fe && Object.keys(fe).length ? fe : null; };
const lbl = "block text-[12px] font-semibold text-[#17245e]";
const timeFmt = (t: string) => { const [h, m] = t.split(":").map(Number); return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`; };
const ERR = (errs: Record<string, string>, k: string) => (errs[k] ? <p className="mt-1 text-[10px] text-rose-600">{errs[k]}</p> : null);

interface P { opts: AcaOptions; yearId: number | null; reload: () => Promise<void>; onError: (m: string) => void; flash: (m: string) => void }

// ---------------------------------------------------------------- Subjects
function SubjectsTab({ opts, yearId, reload, onError, flash, classId, setClassId }: P & { classId: string; setClassId: (v: string) => void }) {
  const classes = opts.classes.filter((c) => c.yearId === yearId);
  const cls = classes.find((c) => String(c.id) === classId);
  const rows = opts.classSubjects.filter((r) => String(r.classId) === classId);
  const [form, setForm] = useState<{ mode: "EXISTING" | "NEW"; subjectId: string; name: string; code: string; category: string; periods: string } | null>(null);
  const [edit, setEdit] = useState<{ subjectId: number; name: string; periods: string } | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const available = opts.subjects.filter((s) => s.yearId === yearId && !rows.some((r) => r.subjectId === s.id));

  const save = async () => {
    if (!form || !cls) return; setBusy(true); setErrs({});
    try {
      await api.academics.addSubject({ classId: cls.id, subjectId: form.mode === "EXISTING" ? Number(form.subjectId) || null : null, name: form.name, code: form.code, category: form.category, periods: form.periods ? Number(form.periods) : null });
      setForm(null); flash("Subject added."); await reload();
    } catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else onError(errText(e)); } finally { setBusy(false); }
  };
  const savePeriods = async () => {
    if (!edit || !cls) return; setBusy(true); setErrs({});
    try { await api.academics.setPeriods(cls.id, edit.subjectId, Number(edit.periods)); setEdit(null); flash("Periods updated."); await reload(); }
    catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else onError(errText(e)); } finally { setBusy(false); }
  };
  const remove = async (subjectId: number, name: string) => {
    if (!cls || !window.confirm(`Remove ${name} from ${cls.name}?`)) return;
    try { await api.academics.removeSubject(cls.id, subjectId); flash("Subject removed."); await reload(); } catch (e) { onError(errText(e)); }
  };

  return (
    <div className="space-y-4" onClick={() => setMenu(null)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className={lbl}>Grade<select value={classId} onChange={(e) => setClassId(e.target.value)} className={`${controlClass} mt-1 min-w-[170px]`}>{classes.length === 0 && <option value="">No grades</option>}{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <button type="button" disabled={!cls} onClick={() => { setErrs({}); setForm({ mode: available.length ? "EXISTING" : "NEW", subjectId: "", name: "", code: "", category: "Core", periods: "5" }); }} className="inline-flex items-center gap-2 rounded-lg bg-[#0875fb] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><Plus size={15} />Add Subject</button>
      </div>
      <Table heads={["Code", "Subject", "Grade", "Type", "Periods per Week", ""]} colSpan={6} empty={rows.length === 0 ? (cls ? `No subjects added to ${cls.name} yet.` : "Choose a grade.") : undefined}>
        {rows.map((r) => <tr key={r.subjectId}><td className={`${td} font-medium`}>{r.code}</td><td className={td}>{r.name}</td><td className={td}>{cls?.name}</td><td className={td}>{r.category}</td><td className={td}>{r.periods}</td>
          <td className={`${td} text-right`}><Menu id={`s${r.subjectId}`} open={menu} setOpen={setMenu}><Item onClick={() => { setErrs({}); setEdit({ subjectId: r.subjectId, name: r.name, periods: String(r.periods) }); }}>Change periods</Item><Item danger onClick={() => void remove(r.subjectId, r.name)}>Remove from grade</Item></Menu></td></tr>)}
      </Table>
      {form && cls && (
        <Modal title={`Add Subject to ${cls.name}`} onClose={() => setForm(null)}>
          <div className="flex gap-2 text-[12px]">{(["EXISTING", "NEW"] as const).map((m) => <button key={m} type="button" onClick={() => setForm({ ...form, mode: m })} className={`rounded-md px-3 py-1.5 font-semibold ${form.mode === m ? "bg-[#0875fb] text-white" : "border border-[#cfe0f6] text-[#17245e]"}`}>{m === "EXISTING" ? "Existing subject" : "New subject"}</button>)}</div>
          {form.mode === "EXISTING" ? (
            <Field label="Subject" required><select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} className={controlClass}><option value="">Select</option>{available.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}</select>{ERR(errs, "subjectId")}</Field>
          ) : (
            <>
              <Field label="Subject name" required><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={controlClass} />{ERR(errs, "name")}</Field>
              <div className="grid grid-cols-2 gap-3"><Field label="Code" required><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. SCS601" className={controlClass} />{ERR(errs, "code")}</Field>
                <Field label="Type" required><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={controlClass}>{opts.categories.map((c) => <option key={c}>{c}</option>)}</select>{ERR(errs, "category")}</Field></div>
            </>
          )}
          <Field label="Periods per week" required><input type="number" min={1} max={20} value={form.periods} onChange={(e) => setForm({ ...form, periods: e.target.value })} className={controlClass} />{ERR(errs, "periods")}</Field>
          <div className="flex justify-end gap-2"><OutlineButton onClick={() => setForm(null)}>Cancel</OutlineButton><PrimaryButton onClick={() => void save()} disabled={busy}>Add Subject</PrimaryButton></div>
        </Modal>
      )}
      {edit && (
        <Modal title={`${edit.name}: periods per week`} onClose={() => setEdit(null)}>
          <Field label="Periods per week" required><input type="number" min={1} max={20} value={edit.periods} onChange={(e) => setEdit({ ...edit, periods: e.target.value })} className={controlClass} />{ERR(errs, "periods")}</Field>
          <div className="flex justify-end gap-2"><OutlineButton onClick={() => setEdit(null)}>Cancel</OutlineButton><PrimaryButton onClick={() => void savePeriods()} disabled={busy}>Save</PrimaryButton></div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Classes
function ClassesTab({ opts, yearId, reload, onError, flash }: P) {
  const classes = opts.classes.filter((c) => c.yearId === yearId);
  const [classId, setClassId] = useState("");
  const rows = opts.sections.filter((s) => s.yearId === yearId && (!classId || String(s.classId) === classId));
  const [form, setForm] = useState<{ id: number | null; classId: string; newGrade: string; name: string; teacherId: string; room: string; max: string } | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);

  const open = (s?: AcaSec) => { setErrs({}); setForm(s ? { id: s.id, classId: String(s.classId), newGrade: "", name: s.name, teacherId: s.teacherId ? String(s.teacherId) : "", room: s.room ?? "", max: s.max ? String(s.max) : "" } : { id: null, classId: classId || (classes[0] ? String(classes[0].id) : "NEW"), newGrade: "", name: "", teacherId: "", room: "", max: "" }); };
  const save = async () => {
    if (!form) return; setBusy(true); setErrs({});
    const body = { yearId, classId: form.classId && form.classId !== "NEW" ? Number(form.classId) : null, newGrade: form.classId === "NEW" ? form.newGrade : undefined, name: form.name, teacherId: form.teacherId ? Number(form.teacherId) : null, room: form.room, maxStudents: form.max ? Number(form.max) : null };
    try { if (form.id) await api.academics.updateSection(form.id, body); else await api.academics.addSection(body); setForm(null); flash("Class saved."); await reload(); }
    catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else onError(errText(e)); } finally { setBusy(false); }
  };
  const remove = async (s: AcaSec) => { if (!window.confirm(`Delete ${s.grade} ${s.name}?`)) return; try { await api.academics.removeSection(s.id); flash("Class deleted."); await reload(); } catch (e) { onError(errText(e)); } };

  return (
    <div className="space-y-4" onClick={() => setMenu(null)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className={lbl}>Grade<select value={classId} onChange={(e) => setClassId(e.target.value)} className={`${controlClass} mt-1 min-w-[170px]`}><option value="">All grades</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <button type="button" onClick={() => open()} className="inline-flex items-center gap-2 rounded-lg bg-[#0875fb] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-blue-700"><Plus size={15} />Add Class</button>
      </div>
      <Table heads={["Grade", "Section", "Class Teacher", "Room", "Students", ""]} colSpan={6} empty={rows.length === 0 ? "No classes yet. Add a section to a grade." : undefined}>
        {rows.map((s) => <tr key={s.id}><td className={td}>{s.grade}</td><td className={`${td} font-medium`}>{s.name}</td><td className={td}>{s.teacher ?? "—"}</td><td className={td}>{s.room ?? "—"}</td><td className={td}>{s.students}{s.max ? ` / ${s.max}` : ""}</td>
          <td className={`${td} text-right`}><Menu id={`c${s.id}`} open={menu} setOpen={setMenu}><Item onClick={() => open(s)}>Edit</Item><Item danger onClick={() => void remove(s)}>Delete</Item></Menu></td></tr>)}
      </Table>
      {form && (
        <Modal title={form.id ? "Edit Class" : "Add Class"} onClose={() => setForm(null)}>
          {form.id ? <p className="text-[12px] text-slate-600">{classes.find((c) => String(c.id) === form.classId)?.name}</p> : (
            <Field label="Grade" required><select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className={controlClass}>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}<option value="NEW">+ New grade…</option></select>{ERR(errs, "classId")}
              {form.classId === "NEW" && <><input value={form.newGrade} onChange={(e) => setForm({ ...form, newGrade: e.target.value })} placeholder="e.g. Grade 7" className={`${controlClass} mt-2`} />{ERR(errs, "newGrade")}{ERR(errs, "yearId")}</>}</Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Section" required><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="A" className={controlClass} />{ERR(errs, "name")}</Field>
            <Field label="Room" optional><input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} className={controlClass} />{ERR(errs, "room")}</Field>
          </div>
          <Field label="Class teacher" optional><select value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })} className={controlClass}><option value="">None</option>{opts.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>{ERR(errs, "teacherId")}</Field>
          <Field label="Maximum students" optional><input type="number" min={1} value={form.max} onChange={(e) => setForm({ ...form, max: e.target.value })} className={controlClass} />{ERR(errs, "maxStudents")}</Field>
          <div className="flex justify-end gap-2"><OutlineButton onClick={() => setForm(null)}>Cancel</OutlineButton><PrimaryButton onClick={() => void save()} disabled={busy}>Save</PrimaryButton></div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Timetable
function TimetableTab({ opts, yearId, onError, flash, classId, setClassId }: P & { classId: string; setClassId: (v: string) => void }) {
  const classes = opts.classes.filter((c) => c.yearId === yearId);
  const sections = opts.sections.filter((s) => String(s.classId) === classId);
  const [sectionId, setSectionId] = useState("");
  const [mode, setMode] = useState<"DAY" | "WEEK">("DAY");
  const [date, setDate] = useState(isoDay(new Date()));
  const [edit, setEdit] = useState(false);
  const [tt, setTt] = useState<AcaTimetable | null>(null);
  const [cell, setCell] = useState<{ slotId: number; dow: number; subjectId: string; teacherId: string; slotName: string } | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!sections.some((s) => String(s.id) === sectionId)) setSectionId(sections[0] ? String(sections[0].id) : ""); }, [classId, sections, sectionId]);
  const load = useCallback(async () => { if (!sectionId) { setTt(null); return; } try { setTt(await api.academics.timetable(Number(sectionId))); } catch (e) { onError(errText(e)); } }, [sectionId, onError]);
  useEffect(() => { void load(); }, [load]);

  const d = parseDay(date);
  const dow = d.getDay(); // 0 = Sunday
  const monday = new Date(d); monday.setDate(d.getDate() - ((dow + 6) % 7));
  const friday = new Date(monday); friday.setDate(monday.getDate() + 4);
  const holiday = tt?.holidays.find((h) => date >= h.start && date <= h.end);
  const cellAt = (slotId: number, day: number): AcaCell | undefined => tt?.cells.find((c) => c.slotId === slotId && c.dow === day);
  const rangeLabel = `${monday.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} – ${friday.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
  const shiftWeek = (n: number) => { const x = new Date(monday); x.setDate(x.getDate() + 7 * n); setDate(isoDay(x)); };

  const openCell = (slotId: number, day: number, slotName: string) => { if (!edit) return; const c = cellAt(slotId, day); setErrs({}); setCell({ slotId, dow: day, slotName, subjectId: c ? String(c.subjectId) : "", teacherId: c?.teacherId ? String(c.teacherId) : "" }); };
  const saveCell = async (clear: boolean) => {
    if (!cell) return; setBusy(true); setErrs({});
    try { await api.academics.setCell({ sectionId: Number(sectionId), slotId: cell.slotId, dow: cell.dow, subjectId: clear ? null : Number(cell.subjectId) || null, teacherId: clear ? null : cell.teacherId ? Number(cell.teacherId) : null }); setCell(null); await load(); }
    catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else onError(errText(e)); } finally { setBusy(false); }
  };
  const publish = async (p: boolean) => { try { await api.academics.publishTimetable(Number(sectionId), p); flash(p ? "Timetable published." : "Timetable moved back to draft."); await load(); } catch (e) { onError(errText(e)); } };

  const sec = tt?.section;
  const cellBox = (slotId: number, day: number, slotName: string, compact: boolean) => {
    const c = cellAt(slotId, day);
    return (
      <td key={day} onClick={() => openCell(slotId, day, slotName)} className={`border-b border-l border-[#e3eefc] px-2 py-2 ${compact ? "text-[11px]" : "text-[13px]"} ${edit ? "cursor-pointer hover:bg-blue-50" : ""}`}>
        {c ? <><span className="font-medium text-[#17245e]">{c.subject}</span>{compact && c.teacher && <span className="block text-[9px] text-slate-500">{c.teacher}</span>}</> : edit ? <span className="text-blue-400">+ Add</span> : <span className="text-slate-300">—</span>}
      </td>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[20px] font-extrabold tracking-wide text-[#101b69]">TIMETABLE <span className="px-1">•</span> {mode === "DAY" ? "DAY" : "WEEK"}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-md border border-[#0875fb]">{(["DAY", "WEEK"] as const).map((m) => <button key={m} type="button" onClick={() => setMode(m)} className={`px-5 py-1.5 text-[13px] font-semibold ${mode === m ? "bg-[#0875fb] text-white" : "bg-white text-[#0875fb]"}`}>{m === "DAY" ? "Day" : "Week"}</button>)}</div>
          <button type="button" disabled={!tt} onClick={() => setEdit(!edit)} className={`rounded-lg px-4 py-2 text-[13px] font-semibold ${edit ? "border border-[#0875fb] bg-white text-[#0875fb]" : "bg-[#0875fb] text-white hover:bg-blue-700"} disabled:opacity-50`}>{edit ? "Done Editing" : "Edit Timetable"}</button>
          {tt && (tt.status === "PUBLISHED" ? <OutlineButton onClick={() => void publish(false)}>Unpublish</OutlineButton> : <PrimaryButton onClick={() => void publish(true)}>Publish</PrimaryButton>)}
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className={lbl}>Grade<select value={classId} onChange={(e) => setClassId(e.target.value)} className={`${controlClass} mt-1 min-w-[140px]`}>{classes.length === 0 && <option value="">No grades</option>}{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className={lbl}>Section<select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className={`${controlClass} mt-1 min-w-[100px]`}>{sections.length === 0 && <option value="">None</option>}{sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label className={lbl}>{mode === "DAY" ? "Date" : "Week"}<input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className={`${controlClass} mt-1`} /></label>
        {mode === "WEEK" && <><span className="pb-2.5 text-[13px] font-semibold text-[#101b69]">{rangeLabel}</span><span className="flex gap-1 pb-1"><button type="button" aria-label="Previous week" onClick={() => shiftWeek(-1)} className="h-9 w-9 rounded-md border border-[#cfe0f6]">‹</button><button type="button" aria-label="Next week" onClick={() => shiftWeek(1)} className="h-9 w-9 rounded-md border border-[#cfe0f6]">›</button></span></>}
        {tt && <span className="pb-1.5"><StatusChip status={tt.status} /></span>}
      </div>
      {sec && <p className="text-[12px] text-slate-500">{sec.grade} {sec.name}{sec.room ? ` · Room ${sec.room}` : ""}{sec.teacher ? ` · Class teacher ${sec.teacher}` : ""}</p>}
      {edit && <Notice tone="info">Editing the weekly timetable. Click a period to set its subject and teacher. Changes move a published timetable back to draft until you publish again.</Notice>}
      {tt && tt.slots.length === 0 && <Notice tone="info">No periods are defined yet. Set up the day's periods in Timetable settings first.</Notice>}
      {!sectionId && <p className="text-[13px] text-slate-500">Add a class (section) on the Classes tab to build its timetable.</p>}

      {tt && tt.slots.length > 0 && mode === "DAY" && (
        dow === 0 || dow === 6 ? <Notice tone="info">No classes on {d.toLocaleDateString("en-IN", { weekday: "long" })}s. Timetables run Monday to Friday.</Notice> : (
          <>
            {holiday && <Notice tone="info">{holiday.name} is a holiday on this date. The regular timetable is shown below.</Notice>}
            <Table heads={["Period", "Time", "Subject", "Teacher", "Room"]} colSpan={5}>
              {tt.slots.map((s) => { const c = cellAt(s.id, dow); return s.type !== "TEACHING"
                ? <tr key={s.id} className="bg-slate-50"><td className={`${td} text-slate-500`} colSpan={2}>{s.name} · {timeFmt(s.start)} – {timeFmt(s.end)}</td><td className={`${td} text-slate-500`} colSpan={3}>{s.type === "LUNCH" ? "Lunch break" : "Break"}</td></tr>
                : <tr key={s.id} onClick={() => openCell(s.id, dow, s.name)} className={edit ? "cursor-pointer hover:bg-blue-50" : ""}><td className={`${td} font-medium`}>{s.name}</td><td className={td}>{timeFmt(s.start)} – {timeFmt(s.end)}</td><td className={td}>{c?.subject ?? (edit ? <span className="text-blue-400">+ Add</span> : "—")}</td><td className={td}>{c?.teacher ?? "—"}</td><td className={td}>{c ? sec?.room ?? "—" : "—"}</td></tr>; })}
            </Table>
          </>
        )
      )}

      {tt && tt.slots.length > 0 && mode === "WEEK" && (
        <div className="overflow-x-auto rounded-lg border border-[#cfe0f6]">
          <table className="w-full border-collapse text-left" style={{ minWidth: 640 }}>
            <thead><tr className="bg-[#e8f1fd] text-[12px] text-[#13205f]"><th className="px-3 py-3 font-bold">Period</th><th className="px-3 py-3 font-bold">Time</th>{DAYS.map((x) => <th key={x} className="border-l border-[#cfe0f6] px-3 py-3 font-bold">{x}</th>)}</tr></thead>
            <tbody>
              {tt.slots.map((s) => s.type !== "TEACHING"
                ? <tr key={s.id} className="bg-slate-50 text-[11px] text-slate-500"><td className="border-b border-[#e3eefc] px-3 py-2">{s.name}</td><td className="border-b border-[#e3eefc] px-3 py-2">{timeFmt(s.start)} – {timeFmt(s.end)}</td><td className="border-b border-[#e3eefc] px-3 py-2 text-center" colSpan={5}>{s.type === "LUNCH" ? "Lunch" : "Break"}</td></tr>
                : <tr key={s.id}><td className="border-b border-[#e3eefc] px-3 py-2 text-[12px] font-medium text-[#17245e]">{s.name}</td><td className="whitespace-nowrap border-b border-[#e3eefc] px-3 py-2 text-[11px] text-[#17245e]">{timeFmt(s.start)} – {timeFmt(s.end)}</td>{[1, 2, 3, 4, 5].map((x) => cellBox(s.id, x, s.name, true))}</tr>)}
            </tbody>
          </table>
        </div>
      )}

      {tt && tt.loads.length > 0 && (
        <div className="flex flex-wrap gap-2 text-[11px]">{tt.loads.map((l) => <span key={l.subjectId} className={`rounded-full border px-3 py-1 ${l.scheduled === l.planned ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>{l.subject}: {l.scheduled} of {l.planned} periods</span>)}</div>
      )}
      <p className="text-[10px] text-slate-500">This is a repeating weekly timetable (Monday to Friday). Periods come from Timetable settings. There are no one-off changes or substitutions, and publishing only marks it as final: nothing is sent to teachers, students or parents.</p>

      {cell && tt && (
        <Modal title={`${DAYS[cell.dow - 1]} · ${cell.slotName}`} onClose={() => setCell(null)}>
          <Field label="Subject" required><select value={cell.subjectId} onChange={(e) => setCell({ ...cell, subjectId: e.target.value })} className={controlClass}><option value="">Select</option>{tt.loads.map((l) => <option key={l.subjectId} value={l.subjectId}>{l.subject}</option>)}</select>{ERR(errs, "subjectId")}
            {tt.loads.length === 0 && <p className="mt-1 text-[10px] text-slate-500">No subjects for this grade yet. Add them on the Subjects tab.</p>}</Field>
          <Field label="Teacher" optional><select value={cell.teacherId} onChange={(e) => setCell({ ...cell, teacherId: e.target.value })} className={controlClass}><option value="">Not assigned</option>{opts.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>{ERR(errs, "teacherId")}</Field>
          <div className="flex justify-between gap-2"><span>{cellAt(cell.slotId, cell.dow) && <OutlineButton onClick={() => void saveCell(true)} disabled={busy}>Clear period</OutlineButton>}</span><span className="flex gap-2"><OutlineButton onClick={() => setCell(null)}>Cancel</OutlineButton><PrimaryButton onClick={() => void saveCell(false)} disabled={busy || !cell.subjectId}>Save</PrimaryButton></span></div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Homework & Assignments
type WorkItem = AcaHw & Partial<Pick<AcaAsg, "maxMarks" | "submitted" | "graded" | "total">>;
function WorkTab({ kind, opts, yearId, onError, flash }: P & { kind: "homework" | "assignment" }) {
  const isAsg = kind === "assignment";
  const noun = isAsg ? "Assignment" : "Homework";
  const classes = opts.classes.filter((c) => c.yearId === yearId);
  const [fClass, setFClass] = useState("");
  const [fSection, setFSection] = useState("");
  const [fSubject, setFSubject] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ items: WorkItem[]; total: number; page: number; size: number } | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [form, setForm] = useState<{ id: number | null; classId: string; sectionId: string; subjectId: string; title: string; description: string; dueDate: string; maxMarks: string } | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [subs, setSubs] = useState<{ item: WorkItem; rows: AcaSubmission[] } | null>(null);

  const sectionsOf = (cid: string) => opts.sections.filter((s) => String(s.classId) === cid);
  const subjectsOf = (cid: string) => (cid ? opts.classSubjects.filter((s) => String(s.classId) === cid) : Array.from(new Map(opts.classSubjects.filter((s) => classes.some((c) => c.id === s.classId)).map((s) => [s.subjectId, s])).values()));

  const load = useCallback(async () => {
    const f = { classId: fClass ? Number(fClass) : null, sectionId: fSection ? Number(fSection) : null, subjectId: fSubject ? Number(fSubject) : null, status: fStatus || undefined };
    try { setData(isAsg ? await api.academics.assignments(f, page) as AcaAsgPage : await api.academics.homework(f, page) as AcaHwPage); } catch (e) { onError(errText(e)); }
  }, [isAsg, fClass, fSection, fSubject, fStatus, page, onError]);
  useEffect(() => { void load(); }, [load]);

  const today = isoDay(new Date());
  const open = (w?: WorkItem) => { setErrs({}); setForm(w ? { id: w.id, classId: String(w.classId), sectionId: String(w.sectionId), subjectId: String(w.subjectId), title: w.title, description: w.description ?? "", dueDate: w.dueDate, maxMarks: String(w.maxMarks ?? 100) } : { id: null, classId: fClass || (classes[0] ? String(classes[0].id) : ""), sectionId: fSection, subjectId: "", title: "", description: "", dueDate: today, maxMarks: "100" }); };
  const save = async (status: "DRAFT" | "PUBLISHED") => {
    if (!form) return; setBusy(true); setErrs({});
    const body = { sectionId: form.sectionId ? Number(form.sectionId) : null, subjectId: form.subjectId ? Number(form.subjectId) : null, title: form.title, description: form.description, dueDate: form.dueDate, status };
    try {
      if (isAsg) { const b = { ...body, maxMarks: form.maxMarks ? Number(form.maxMarks) : null }; if (form.id) await api.academics.updateAssignment(form.id, b); else await api.academics.createAssignment(b); }
      else if (form.id) await api.academics.updateHomework(form.id, body); else await api.academics.createHomework(body);
      setForm(null); flash(`${noun} ${status === "PUBLISHED" ? "published" : "saved as a draft"}.`); await load();
    } catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else onError(errText(e)); } finally { setBusy(false); }
  };
  const toggle = async (w: WorkItem) => { const st = w.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"; try { if (isAsg) await api.academics.assignmentStatus(w.id, st); else await api.academics.homeworkStatus(w.id, st); await load(); } catch (e) { onError(errText(e)); } };
  const remove = async (w: WorkItem) => { if (!window.confirm(`Delete "${w.title}"?`)) return; try { if (isAsg) await api.academics.removeAssignment(w.id); else await api.academics.removeHomework(w.id); flash(`${noun} deleted.`); await load(); } catch (e) { onError(errText(e)); } };
  const openSubs = async (w: WorkItem) => { try { setSubs({ item: w, rows: await api.academics.submissions(w.id) }); } catch (e) { onError(errText(e)); } };
  const saveSub = async (r: AcaSubmission, patch: Partial<AcaSubmission>) => {
    if (!subs) return; const next = { ...r, ...patch };
    setSubs({ ...subs, rows: subs.rows.map((x) => (x.studentId === r.studentId ? next : x)) });
    try { await api.academics.saveSubmission(subs.item.id, r.studentId, { submitted: next.submitted, marks: next.submitted ? next.marks : null, remarks: next.remarks ?? "" }); onError(""); }
    catch (e) { onError(errText(e)); setSubs({ ...subs, rows: await api.academics.submissions(subs.item.id) }); }
  };

  return (
    <div className="space-y-4" onClick={() => setMenu(null)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className={lbl}>Grade<select value={fClass} onChange={(e) => { setFClass(e.target.value); setFSection(""); setFSubject(""); setPage(0); }} className={`${controlClass} mt-1 min-w-[120px]`}><option value="">All</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className={lbl}>Section<select value={fSection} onChange={(e) => { setFSection(e.target.value); setPage(0); }} className={`${controlClass} mt-1 min-w-[90px]`}><option value="">All</option>{(fClass ? sectionsOf(fClass) : opts.sections.filter((s) => s.yearId === yearId)).map((s) => <option key={s.id} value={s.id}>{fClass ? s.name : `${s.grade} ${s.name}`}</option>)}</select></label>
          <label className={lbl}>Subject<select value={fSubject} onChange={(e) => { setFSubject(e.target.value); setPage(0); }} className={`${controlClass} mt-1 min-w-[130px]`}><option value="">All Subjects</option>{subjectsOf(fClass).map((s) => <option key={s.subjectId} value={s.subjectId}>{s.name}</option>)}</select></label>
          <label className={lbl}>Status<select value={fStatus} onChange={(e) => { setFStatus(e.target.value); setPage(0); }} className={`${controlClass} mt-1 min-w-[120px]`}><option value="">All Status</option><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select></label>
        </div>
        <button type="button" onClick={() => open()} className="inline-flex items-center gap-2 rounded-lg bg-[#0875fb] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-blue-700"><Plus size={15} />Create {noun}</button>
      </div>
      <Table heads={isAsg ? ["Title", "Class", "Due Date", "Submitted", "Graded", "Status", ""] : ["Title", "Class", "Subject", "Due Date", "Status", ""]} colSpan={isAsg ? 7 : 6} empty={data && data.items.length === 0 ? `No ${noun.toLowerCase()} matches these filters.` : undefined}>
        {data?.items.map((w) => (
          <tr key={w.id} onClick={() => (isAsg ? void openSubs(w) : open(w))} className="cursor-pointer hover:bg-[#f5f9ff]">
            <td className={`${td} font-medium`}>{w.title}{isAsg && <span className="block text-[10px] font-normal text-slate-500">{w.subject}</span>}</td><td className={td}>{w.grade} {w.section}</td>{!isAsg && <td className={td}>{w.subject}</td>}<td className={td}>{dayFmt(w.dueDate)}</td>
            {isAsg && <><td className={td}>{w.submitted} / {w.total}</td><td className={td}>{w.graded} / {w.total}</td></>}
            <td className={td}><StatusChip status={w.status} /></td>
            <td className={`${td} text-right`}><Menu id={`w${w.id}`} open={menu} setOpen={setMenu}><Item onClick={() => open(w)}>Edit</Item>{isAsg && <Item onClick={() => void openSubs(w)}>Submissions &amp; marks</Item>}<Item onClick={() => void toggle(w)}>{w.status === "PUBLISHED" ? "Move to draft" : "Publish"}</Item><Item danger onClick={() => void remove(w)}>Delete</Item></Menu></td>
          </tr>
        ))}
        {!data && <tr><td colSpan={isAsg ? 7 : 6} className="px-4 py-10 text-center text-[12px] text-slate-500">Loading…</td></tr>}
      </Table>
      {data && <Pager page={data.page} size={data.size} total={data.total} set={setPage} />}
      <p className="text-[10px] text-slate-500">{isAsg ? "Submissions and marks are recorded here by the school; students and teachers can't log in to submit yet. " : ""}Publishing marks the {noun.toLowerCase()} as final. Nothing is sent to students or parents, and attachments aren't supported.</p>

      {form && (
        <Modal title={form.id ? `Edit ${noun}` : `Create ${noun}`} onClose={() => setForm(null)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Grade" required><select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value, sectionId: "", subjectId: "" })} className={controlClass}><option value="">Select</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Section" required><select value={form.sectionId} onChange={(e) => setForm({ ...form, sectionId: e.target.value })} className={controlClass}><option value="">Select</option>{sectionsOf(form.classId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>{ERR(errs, "sectionId")}</Field>
          </div>
          <Field label="Subject" required><select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} className={controlClass}><option value="">Select</option>{subjectsOf(form.classId).map((s) => <option key={s.subjectId} value={s.subjectId}>{s.name}</option>)}</select>{ERR(errs, "subjectId")}</Field>
          <Field label="Title" required><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={controlClass} />{ERR(errs, "title")}</Field>
          <Field label="Description" optional><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={controlClass} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Due date" required><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={controlClass} />{ERR(errs, "dueDate")}</Field>
            {isAsg && <Field label="Maximum marks" required><input type="number" min={1} value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: e.target.value })} className={controlClass} />{ERR(errs, "maxMarks")}</Field>}
          </div>
          <div className="flex justify-end gap-2"><OutlineButton onClick={() => setForm(null)}>Cancel</OutlineButton><OutlineButton onClick={() => void save("DRAFT")} disabled={busy}>Save Draft</OutlineButton><PrimaryButton onClick={() => void save("PUBLISHED")} disabled={busy}>Publish</PrimaryButton></div>
        </Modal>
      )}

      {subs && (
        <Modal title={`${subs.item.title} · ${subs.item.grade} ${subs.item.section}`} wide onClose={() => { setSubs(null); void load(); }}>
          <p className="text-[12px] text-slate-500">Tick students who submitted, then enter marks out of {subs.item.maxMarks}. Changes save as you go.</p>
          {subs.rows.length === 0 ? <p className="py-6 text-center text-[12px] text-slate-500">There are no active students in this class.</p> : (
            <div className="overflow-x-auto"><table className="w-full text-left text-[12px]"><thead><tr className="bg-[#e8f1fd] text-[#13205f]">{["Student", "Submitted", "Marks", "Remarks"].map((h) => <th key={h} className="px-3 py-2 font-bold">{h}</th>)}</tr></thead>
              <tbody>{subs.rows.map((r) => (
                <tr key={r.studentId} className="border-b border-[#e3eefc]"><td className="px-3 py-2">{r.name}<span className="block text-[10px] text-slate-500">{r.admissionNo}</span></td>
                  <td className="px-3 py-2"><input type="checkbox" aria-label={`Submitted by ${r.name}`} checked={r.submitted} onChange={(e) => void saveSub(r, { submitted: e.target.checked, marks: e.target.checked ? r.marks : null })} className="h-4 w-4 accent-blue-600" /></td>
                  <td className="px-3 py-2"><input type="number" min={0} max={subs.item.maxMarks} step="0.5" disabled={!r.submitted} defaultValue={r.marks ?? ""} key={`${r.studentId}-${r.submitted}`} onBlur={(e) => { const v = e.target.value === "" ? null : Number(e.target.value); if (v !== r.marks) void saveSub(r, { marks: v }); }} className="w-20 rounded border border-[#cfe0f6] px-2 py-1 disabled:bg-slate-50" /></td>
                  <td className="px-3 py-2"><input disabled={!r.submitted} maxLength={300} defaultValue={r.remarks ?? ""} key={`r${r.studentId}-${r.submitted}`} onBlur={(e) => { if (e.target.value !== (r.remarks ?? "")) void saveSub(r, { remarks: e.target.value }); }} className="w-full min-w-[140px] rounded border border-[#cfe0f6] px-2 py-1 disabled:bg-slate-50" /></td></tr>))}</tbody></table></div>)}
          <div className="flex justify-end"><SmallBtn solid onClick={() => { setSubs(null); void load(); }}>Done</SmallBtn></div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- page
export default function Academics() {
  const [tab, setTab] = useState<Tab>("Subjects");
  const [opts, setOpts] = useState<AcaOptions | null>(null);
  const [yearId, setYearId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [classId, setClassId] = useState("");

  const reload = useCallback(async () => { try { setOpts(await api.academics.options()); } catch (e) { setError(errText(e)); } }, []);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => { if (opts && yearId === null) setYearId(opts.years.find((y) => y.current)?.id ?? opts.years[0]?.id ?? null); }, [opts, yearId]);
  useEffect(() => { if (opts && !opts.classes.some((c) => c.yearId === yearId && String(c.id) === classId)) setClassId(String(opts.classes.find((c) => c.yearId === yearId)?.id ?? "")); }, [opts, yearId, classId]);

  const flash = useCallback((m: string) => { setNotice(m); setError(""); setTimeout(() => setNotice(""), 4000); }, []);
  const onError = useCallback((m: string) => setError(m), []);
  const props = opts ? { opts, yearId, reload, onError, flash } : null;

  return (
    <SchoolLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[28px] font-extrabold tracking-[-0.5px] text-[#101b69]">Academics &amp; Timetable</h1>
          {opts && opts.years.length > 0 && <label className="flex items-center gap-2 text-[12px] font-semibold text-[#17245e]">Year<select value={yearId ?? ""} onChange={(e) => setYearId(Number(e.target.value))} className={`${controlClass} min-w-[130px]`}>{opts.years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</select></label>}
        </div>
        <div className="flex flex-wrap gap-1 border-b border-[#cfe0f6]">{TABS.map((t) => <button key={t} type="button" onClick={() => { setTab(t); setError(""); }} className={`-mb-px border-b-[3px] px-5 py-2.5 text-[14px] font-semibold ${tab === t ? "border-[#0875fb] text-[#0875fb]" : "border-transparent text-[#17245e] hover:text-blue-600"}`}>{t}</button>)}</div>
        {error && <Notice tone="error">{error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}
        {opts && opts.years.length === 0 && <Notice tone="info">This school has no academic year yet. Set one up before adding subjects and classes.</Notice>}
        {!props && !error && <p className="text-[13px] text-slate-500">Loading…</p>}
        {props && (
          <div className="rounded-xl border border-[#d8e9fb] bg-white p-5">
            {tab === "Subjects" && <SubjectsTab {...props} classId={classId} setClassId={setClassId} />}
            {tab === "Classes" && <ClassesTab {...props} />}
            {tab === "Timetable" && <TimetableTab {...props} classId={classId} setClassId={setClassId} />}
            {tab === "Homework" && <WorkTab {...props} kind="homework" />}
            {tab === "Assignments" && <WorkTab {...props} kind="assignment" />}
          </div>
        )}
      </div>
    </SchoolLayout>
  );
}
