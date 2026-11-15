import { useCallback, useEffect, useState } from "react";
import { GraduationCap, Landmark, Plus } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../services/api";
import type { Grade, GradeInput, GradingSystem, Term, TermInput } from "../../services/api";
import {
  AcademicHeader, AcademicTabs, Breadcrumb, DataTable, DetailCard, EmptyRow, Field, Notice, OutlineButton, Panel, PanelTitle,
  PrimaryButton, RowActions, StatusPill, TableFooter, Toggle, controlClass, fmtDate, tdClass, textareaClass,
} from "./AcademicShared";
import { ContextBar, NoYearNotice, errText, useAcademicYears, useActiveInstitution } from "./SettingsShared";

const blankGrade: GradeInput = { grade: "", marksFrom: 0, marksTo: 0, gradePoint: 0, description: "" };

export default function TermsGrading() {
  const inst = useActiveInstitution();
  const years = useAcademicYears(inst.institutionId);
  const yearId = years.yearId;

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  /* ---- terms ---- */
  const [terms, setTerms] = useState<Term[]>([]);
  const [termsLoading, setTermsLoading] = useState(false);
  const blankTerm = (): TermInput => ({ academicYearId: yearId ?? 0, name: "", startDate: "", endDate: "", weightage: 25, active: true, description: "" });
  const [termForm, setTermForm] = useState<TermInput>(blankTerm);
  const [termId, setTermId] = useState<number | null>(null);

  const loadTerms = useCallback(async () => {
    if (yearId === null) { setTerms([]); return; }
    setTermsLoading(true);
    try { setTerms(await api.terms.list(yearId)); } catch (e) { setError(errText(e)); } finally { setTermsLoading(false); }
  }, [yearId]);

  useEffect(() => {
    void loadTerms();
    setTermId(null);
    setTermForm({ academicYearId: yearId ?? 0, name: "", startDate: "", endDate: "", weightage: 25, active: true, description: "" });
  }, [loadTerms, yearId]);

  const totalWeight = terms.filter((t) => t.active).reduce((s, t) => s + Number(t.weightage), 0);

  const setT = <K extends keyof TermInput>(k: K, v: TermInput[K]) => { setTermForm((f) => ({ ...f, [k]: v })); setError(""); setNotice(""); };
  function newTerm() { setTermId(null); setTermForm(blankTerm()); setError(""); }
  function editTerm(t: Term) {
    setTermId(t.id);
    setTermForm({ academicYearId: t.academicYearId, name: t.name, startDate: t.startDate, endDate: t.endDate, weightage: t.weightage, active: t.active, description: t.description ?? "" });
    setError("");
  }
  async function saveTerm() {
    if (yearId === null) { setError("Create an academic year first."); return; }
    if (!termForm.name.trim() || !termForm.startDate || !termForm.endDate) { setError("Please complete Term Name, Start Date and End Date."); return; }
    if (termForm.endDate <= termForm.startDate) { setError("Term End Date must be after the Start Date."); return; }
    if (termForm.weightage < 0 || termForm.weightage > 100) { setError("Weightage must be between 0 and 100."); return; }
    setSaving(true);
    try {
      const body: TermInput = { ...termForm, academicYearId: yearId, name: termForm.name.trim(), description: termForm.description?.trim() || null };
      const saved = termId === null ? await api.terms.create(body) : await api.terms.update(termId, body);
      setNotice(`${saved.name} saved.`);
      setError("");
      await loadTerms();
      if (termId === null) newTerm(); else editTerm(saved);
    } catch (e) { setError(errText(e)); } finally { setSaving(false); }
  }
  async function removeTerm(t: Term) {
    if (!window.confirm(`Delete ${t.name}?`)) return;
    try {
      await api.terms.remove(t.id);
      setNotice(`${t.name} deleted.`);
      if (termId === t.id) newTerm();
      await loadTerms();
    } catch (e) { setError(errText(e)); }
  }

  /* ---- grading systems (institution-wide, not per year) ---- */
  const [systems, setSystems] = useState<GradingSystem[]>([]);
  const [sysId, setSysId] = useState<number | null>(null);
  const [sysForm, setSysForm] = useState({ name: "", description: "", active: true });
  const [gradeForm, setGradeForm] = useState<GradeInput>(blankGrade);
  const [gradeId, setGradeId] = useState<number | null>(null);
  const [showGradeForm, setShowGradeForm] = useState(false);
  const [sysLoading, setSysLoading] = useState(false);

  const loadSystems = useCallback(async (select?: number) => {
    if (inst.institutionId === null) { setSystems([]); return; }
    setSysLoading(true);
    try {
      const list = await api.grading.list();
      setSystems(list);
      setSysId((prev) => {
        const target = select ?? prev;
        const found = list.find((s) => s.id === target) ?? list.find((s) => s.active) ?? list[0];
        setSysForm(found ? { name: found.name, description: found.description ?? "", active: found.active } : { name: "", description: "", active: true });
        return found ? found.id : null;
      });
    } catch (e) { setError(errText(e)); } finally { setSysLoading(false); }
  }, [inst.institutionId]);

  useEffect(() => { void loadSystems(); }, [loadSystems]);

  const system = systems.find((s) => s.id === sysId) ?? null;
  const grades: Grade[] = [...(system?.grades ?? [])].sort((a, b) => b.marksFrom - a.marksFrom);

  function pickSystem(id: number) {
    const s = systems.find((x) => x.id === id);
    if (!s) return;
    setSysId(id);
    setSysForm({ name: s.name, description: s.description ?? "", active: s.active });
    setShowGradeForm(false);
    setError("");
  }
  function newSystem() {
    setSysId(null);
    setSysForm({ name: "", description: "", active: true });
    setShowGradeForm(false);
    setError(""); setNotice("");
  }
  async function saveSystem() {
    if (!sysForm.name.trim()) { setError("Grading System Name is required."); return; }
    setSaving(true);
    try {
      const body = {
        name: sysForm.name.trim(), description: sysForm.description.trim() || null, active: sysForm.active,
        // keep the extra fields that are edited on the Exam & Grading page
        gradeType: system?.gradeType, totalMarks: system?.totalMarks, passPercentage: system?.passPercentage,
        classFrom: system?.classFrom ?? null, classTo: system?.classTo ?? null,
      };
      const saved = sysId === null ? await api.grading.createSystem(body) : await api.grading.updateSystem(sysId, body);
      setNotice(sysId === null ? `Grading system ${saved.name} created. Now add its grades.` : `Grading system ${saved.name} saved.`);
      setError("");
      await loadSystems(saved.id);
    } catch (e) { setError(errText(e)); } finally { setSaving(false); }
  }
  async function removeSystem() {
    if (!system || !window.confirm(`Delete grading system ${system.name} and all its grades?`)) return;
    try {
      await api.grading.removeSystem(system.id);
      setNotice(`Grading system ${system.name} deleted.`);
      setSysId(null);
      await loadSystems();
    } catch (e) { setError(errText(e)); }
  }

  /* ---- grades ---- */
  const setG = <K extends keyof GradeInput>(k: K, v: GradeInput[K]) => { setGradeForm((f) => ({ ...f, [k]: v })); setError(""); };
  function openGrade(g?: Grade) {
    setShowGradeForm(true); setGradeId(g?.id ?? null);
    setGradeForm(g ? { grade: g.grade, marksFrom: g.marksFrom, marksTo: g.marksTo, gradePoint: g.gradePoint, description: g.description ?? "" } : { ...blankGrade });
  }
  async function saveGrade() {
    if (!system) { setError("Save the grading system first, then add grades."); return; }
    if (!gradeForm.grade.trim()) { setError("Grade label is required."); return; }
    if (gradeForm.marksFrom > gradeForm.marksTo) { setError("'Marks From' can't be greater than 'Marks To'."); return; }
    if (gradeForm.marksFrom < 0 || gradeForm.marksTo > 100) { setError("Marks must be between 0 and 100."); return; }
    const overlap = system.grades.some((g) => g.id !== gradeId && gradeForm.marksFrom <= g.marksTo && gradeForm.marksTo >= g.marksFrom);
    if (overlap) { setError("This mark range overlaps with another grade."); return; }
    setSaving(true);
    try {
      const body: GradeInput = { ...gradeForm, grade: gradeForm.grade.trim(), description: gradeForm.description?.trim() || null };
      if (gradeId === null) await api.grading.addGrade(system.id, body); else await api.grading.updateGrade(system.id, gradeId, body);
      setShowGradeForm(false); setNotice("Grade saved."); setError("");
      await loadSystems(system.id);
    } catch (e) { setError(errText(e)); } finally { setSaving(false); }
  }
  async function removeGrade(g: Grade) {
    if (!system || !window.confirm(`Delete grade ${g.grade}?`)) return;
    try { await api.grading.removeGrade(system.id, g.id); await loadSystems(system.id); } catch (e) { setError(errText(e)); }
  }

  const noYear = yearId === null;

  return (
    <AdminLayout activeItem="Institutions">
      <div className="space-y-3">
        <AcademicHeader step={2} title="Terms and Grading" subtitle="Configure terms/semesters and grading systems." right={<ContextBar inst={inst} years={years} />} />
        <Breadcrumb trail={["Institutions", "Institution Settings", "Academic Settings", "Terms & Grading"]} />
        <AcademicTabs active="terms" />

        {(error || years.error) && <Notice tone="error"><span className="font-bold">Please review:</span> {error || years.error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}
        <NoYearNotice years={years} inst={inst} />

        <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-12">
          {/* ------- Terms ------- */}
          <div className="min-w-0 space-y-3 xl:col-span-6">
            <Panel>
              <PanelTitle icon={<Landmark size={20} strokeWidth={2.4} />} title="Terms / Semesters" right={<PrimaryButton type="button" onClick={newTerm} disabled={noYear}><Plus size={14} /> Add Term</PrimaryButton>} />
              <div className="px-4 pb-4">
                <DataTable heads={["#", "Term Name", "Start Date", "End Date", "Weightage (%)", "Status", "Actions"]} min={560}>
                  {termsLoading && <EmptyRow cols={7} text="Loading terms..." />}
                  {!termsLoading && terms.length === 0 && <EmptyRow cols={7} text={noYear ? "Select an academic year to see its terms." : "No terms added yet."} />}
                  {!termsLoading && terms.map((t, i) => (
                    <tr key={t.id} className={`hover:bg-blue-50/50 ${termId === t.id ? "bg-blue-50/60" : ""}`}>
                      <td className={tdClass}>{i + 1}</td>
                      <td className={`${tdClass} font-semibold text-[#17245e]`}>{t.name}</td>
                      <td className={tdClass}>{fmtDate(t.startDate)}</td>
                      <td className={tdClass}>{fmtDate(t.endDate)}</td>
                      <td className={tdClass}>{t.weightage}</td>
                      <td className={tdClass}><StatusPill status={t.active ? "Active" : "Inactive"} /></td>
                      <td className={tdClass}><RowActions name={t.name} onEdit={() => editTerm(t)} onDelete={() => void removeTerm(t)} /></td>
                    </tr>
                  ))}
                </DataTable>
                <div className="flex items-center justify-between">
                  <TableFooter shown={terms.length} total={terms.length} />
                  {terms.length > 0 && (
                    <span className={`mt-2 rounded px-2 py-1 text-[9px] font-semibold ${totalWeight === 100 ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}`}>
                      Total active weightage: {totalWeight}%{totalWeight !== 100 && " (should be 100%)"}
                    </span>
                  )}
                </div>
              </div>
            </Panel>

            <DetailCard
              title={termId === null ? "New Term" : "Term Details"}
              saving={saving}
              onCancel={() => { const t = terms.find((x) => x.id === termId); if (t) editTerm(t); else newTerm(); }}
              onSave={() => void saveTerm()}
            >
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Field label="Term Name" required><input className={controlClass} value={termForm.name} onChange={(e) => setT("name", e.target.value)} placeholder="e.g. Term 1" /></Field>
                <Field label="Start Date" required><input type="date" className={controlClass} value={termForm.startDate} min={years.year?.startDate} max={years.year?.endDate} onChange={(e) => setT("startDate", e.target.value)} /></Field>
                <Field label="End Date" required><input type="date" className={controlClass} value={termForm.endDate} min={termForm.startDate} max={years.year?.endDate} onChange={(e) => setT("endDate", e.target.value)} /></Field>
                <Field label="Weightage (%)" required><input type="number" min={0} max={100} className={controlClass} value={termForm.weightage} onChange={(e) => setT("weightage", Number(e.target.value))} /></Field>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
                <Field label="Description"><textarea className={textareaClass} value={termForm.description ?? ""} onChange={(e) => setT("description", e.target.value)} placeholder={years.year ? `Description for academic year ${years.year.name}` : "Description"} /></Field>
                <Field label="Status"><div className="flex h-8 items-center"><Toggle checked={termForm.active} onChange={(v) => setT("active", v)} /></div></Field>
              </div>
            </DetailCard>
          </div>

          {/* ------- Grading ------- */}
          <div className="min-w-0 space-y-3 xl:col-span-6">
            <Panel>
              <PanelTitle icon={<GraduationCap size={20} strokeWidth={2.4} />} title="Grading System" right={<PrimaryButton type="button" onClick={newSystem} disabled={inst.institutionId === null}><Plus size={14} /> Add Grading System</PrimaryButton>} />
              <div className="space-y-3 px-4 pb-4">
                {systems.length > 0 && (
                  <Field label="Grading System">
                    <select className={controlClass} value={sysId ?? ""} onChange={(e) => pickSystem(Number(e.target.value))}>
                      {sysId === null && <option value="">New grading system</option>}
                      {systems.map((s) => <option key={s.id} value={s.id}>{s.name}{s.active ? "" : " (inactive)"}</option>)}
                    </select>
                  </Field>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Grading System Name" required><input className={controlClass} value={sysForm.name} onChange={(e) => setSysForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. CBSE (9 Point)" /></Field>
                  <Field label="Description"><input className={controlClass} value={sysForm.description} onChange={(e) => setSysForm((f) => ({ ...f, description: e.target.value }))} /></Field>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Toggle checked={sysForm.active} onChange={(v) => setSysForm((f) => ({ ...f, active: v }))} />
                  <div className="flex gap-2">
                    {system && <OutlineButton type="button" onClick={() => void removeSystem()} className="!border-rose-300 !text-rose-600 hover:!bg-rose-50">Delete System</OutlineButton>}
                    <PrimaryButton type="button" onClick={() => void saveSystem()} disabled={saving}>{sysId === null ? "Create System" : "Save System"}</PrimaryButton>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#17245e]">Grade Scale</span>
                  <PrimaryButton type="button" onClick={() => openGrade()} disabled={!system} className="!py-1.5"><Plus size={13} /> Add Grade</PrimaryButton>
                </div>

                <DataTable heads={["#", "Grade", "Marks From", "Marks To", "Grade Point", "Description", "Actions"]} min={520}>
                  {sysLoading && <EmptyRow cols={7} text="Loading grading systems..." />}
                  {!sysLoading && grades.length === 0 && <EmptyRow cols={7} text={system ? "No grades defined yet." : "Create a grading system to add its grades."} />}
                  {!sysLoading && grades.map((g, i) => (
                    <tr key={g.id} className="hover:bg-blue-50/50">
                      <td className={tdClass}>{i + 1}</td>
                      <td className={`${tdClass} font-semibold text-[#17245e]`}>{g.grade}</td>
                      <td className={tdClass}>{g.marksFrom}</td>
                      <td className={tdClass}>{g.marksTo}</td>
                      <td className={tdClass}>{g.gradePoint}</td>
                      <td className={tdClass}>{g.description}</td>
                      <td className={tdClass}><RowActions name={g.grade} onEdit={() => openGrade(g)} onDelete={() => void removeGrade(g)} /></td>
                    </tr>
                  ))}
                </DataTable>

                {showGradeForm && (
                  <DetailCard title={gradeId === null ? "New Grade" : "Edit Grade"} saving={saving} onCancel={() => { setShowGradeForm(false); setError(""); }} onSave={() => void saveGrade()}>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                      <Field label="Grade" required><input className={controlClass} value={gradeForm.grade} onChange={(e) => setG("grade", e.target.value)} /></Field>
                      <Field label="Marks From" required><input type="number" className={controlClass} value={gradeForm.marksFrom} onChange={(e) => setG("marksFrom", Number(e.target.value))} /></Field>
                      <Field label="Marks To" required><input type="number" className={controlClass} value={gradeForm.marksTo} onChange={(e) => setG("marksTo", Number(e.target.value))} /></Field>
                      <Field label="Grade Point"><input type="number" className={controlClass} value={gradeForm.gradePoint} onChange={(e) => setG("gradePoint", Number(e.target.value))} /></Field>
                      <Field label="Description"><input className={controlClass} value={gradeForm.description ?? ""} onChange={(e) => setG("description", e.target.value)} /></Field>
                    </div>
                  </DetailCard>
                )}
              </div>
            </Panel>
          </div>
        </div>

        <footer className="pb-1 pt-0.5 text-center text-[10px] text-slate-400">© {new Date().getFullYear()} Centram Classzy · School Management Platform</footer>
      </div>
    </AdminLayout>
  );
}
