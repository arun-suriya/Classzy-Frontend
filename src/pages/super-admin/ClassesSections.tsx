import { useCallback, useEffect, useState } from "react";
import { Layers, Plus, Users } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../services/api";
import type { SchoolClass, SchoolClassInput, Section, SectionInput, Teacher } from "../../services/api";
import {
  AcademicHeader, AcademicTabs, Breadcrumb, DataTable, DetailCard, EmptyRow, Field, Notice, Panel, PanelTitle,
  PrimaryButton, RowActions, StatusPill, TableFooter, Toggle, controlClass, tdClass, textareaClass,
} from "./AcademicShared";
import { ContextBar, NoYearNotice, errText, useAcademicYears, useActiveInstitution } from "./SettingsShared";

type ClassForm = { name: string; gradeLevel: string; active: boolean; description: string };
type SectionForm = { name: string; teacherId: string; room: string; maxStudents: string; active: boolean; description: string };

const blankClass: ClassForm = { name: "", gradeLevel: "", active: true, description: "" };
const blankSection: SectionForm = { name: "", teacherId: "", room: "", maxStudents: "", active: true, description: "" };

export default function ClassesSections() {
  const inst = useActiveInstitution();
  const years = useAcademicYears(inst.institutionId);
  const yearId = years.yearId;

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(false);

  const [cForm, setCForm] = useState<ClassForm>(blankClass);
  const [cId, setCId] = useState<number | null>(null);
  const [sForm, setSForm] = useState<SectionForm>(blankSection);
  const [sId, setSId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const klass = classes.find((c) => c.id === selectedClass) ?? null;

  const classToForm = (c: SchoolClass): ClassForm => ({ name: c.name, gradeLevel: c.gradeLevel === null ? "" : String(c.gradeLevel), active: c.active, description: c.description ?? "" });
  const sectionToForm = (s: Section): SectionForm => ({ name: s.name, teacherId: s.teacherId === null ? "" : String(s.teacherId), room: s.room ?? "", maxStudents: s.maxStudents === null ? "" : String(s.maxStudents), active: s.active, description: s.description ?? "" });

  const loadClasses = useCallback(async (select?: number) => {
    if (yearId === null) { setClasses([]); setSelectedClass(null); return; }
    setLoading(true);
    try {
      const list = await api.classes.list(yearId);
      setClasses(list);
      setError("");
      setSelectedClass((prev) => {
        const target = select ?? prev;
        const found = list.find((c) => c.id === target) ?? list[0] ?? null;
        setCId(found ? found.id : null);
        setCForm(found ? classToForm(found) : blankClass);
        return found ? found.id : null;
      });
    } catch (e) { setError(errText(e)); } finally { setLoading(false); }
  }, [yearId]);

  const loadSections = useCallback(async () => {
    if (selectedClass === null) { setSections([]); return; }
    setSectionsLoading(true);
    try { setSections(await api.sections.list(selectedClass)); } catch (e) { setError(errText(e)); } finally { setSectionsLoading(false); }
  }, [selectedClass]);

  useEffect(() => { void loadClasses(); }, [loadClasses]);
  useEffect(() => { void loadSections(); setSId(null); setSForm(blankSection); }, [loadSections]);
  useEffect(() => {
    if (inst.institutionId === null) { setTeachers([]); return; }
    api.teachers.list().then(setTeachers).catch(() => setTeachers([]));
  }, [inst.institutionId]);

  const setC = <K extends keyof ClassForm>(k: K, v: ClassForm[K]) => { setCForm((f) => ({ ...f, [k]: v })); setError(""); setNotice(""); };
  const setS = <K extends keyof SectionForm>(k: K, v: SectionForm[K]) => { setSForm((f) => ({ ...f, [k]: v })); setError(""); setNotice(""); };

  /* ---- classes ---- */
  function newClass() { setCId(null); setCForm({ ...blankClass }); setError(""); }
  function editClass(c: SchoolClass) { setCId(c.id); setCForm(classToForm(c)); setSelectedClass(c.id); setError(""); }
  async function saveClass() {
    if (yearId === null) { setError("Create an academic year first."); return; }
    if (!cForm.name.trim()) { setError("Class Name is required."); return; }
    if (cForm.gradeLevel && !/^\d{1,2}$/.test(cForm.gradeLevel)) { setError("Grade Level should be a number (leave empty for pre-primary)."); return; }
    setSaving(true);
    try {
      const body: SchoolClassInput = {
        academicYearId: yearId, name: cForm.name.trim(), gradeLevel: cForm.gradeLevel ? Number(cForm.gradeLevel) : null,
        active: cForm.active, description: cForm.description.trim() || null,
      };
      const saved = cId === null ? await api.classes.create(body) : await api.classes.update(cId, body);
      setNotice(`${saved.name} saved.`);
      setError("");
      await loadClasses(saved.id);
    } catch (e) { setError(errText(e)); } finally { setSaving(false); }
  }
  async function deleteClass(c: SchoolClass) {
    if (!window.confirm(`Delete class ${c.name}?`)) return;
    try {
      await api.classes.remove(c.id);
      setNotice(`${c.name} deleted.`);
      await loadClasses(selectedClass === c.id ? undefined : (selectedClass ?? undefined));
    } catch (e) { setError(errText(e)); }
  }

  /* ---- sections ---- */
  function newSection() { setSId(null); setSForm({ ...blankSection }); setError(""); }
  function editSection(s: Section) { setSId(s.id); setSForm(sectionToForm(s)); setError(""); }
  async function saveSection() {
    if (selectedClass === null) { setError("Select a class first."); return; }
    if (!sForm.name.trim()) { setError("Section Name is required."); return; }
    if (sForm.maxStudents && Number(sForm.maxStudents) < 1) { setError("Max Students must be a positive number."); return; }
    setSaving(true);
    try {
      const body: SectionInput = {
        schoolClassId: selectedClass, name: sForm.name.trim(), teacherId: sForm.teacherId ? Number(sForm.teacherId) : null,
        room: sForm.room.trim() || null, maxStudents: sForm.maxStudents ? Number(sForm.maxStudents) : null,
        active: sForm.active, description: sForm.description.trim() || null,
      };
      const saved = sId === null ? await api.sections.create(body) : await api.sections.update(sId, body);
      setNotice(`Section ${saved.name} saved.`);
      setError("");
      await Promise.all([loadSections(), loadClasses(selectedClass)]);
      if (sId === null) newSection(); else editSection(saved);
    } catch (e) { setError(errText(e)); } finally { setSaving(false); }
  }
  async function deleteSection(s: Section) {
    if (!window.confirm(`Delete section ${s.name}?`)) return;
    try {
      await api.sections.remove(s.id);
      setNotice(`Section ${s.name} deleted.`);
      if (sId === s.id) newSection();
      await Promise.all([loadSections(), loadClasses(selectedClass ?? undefined)]);
    } catch (e) { setError(errText(e)); }
  }

  const noYear = yearId === null;

  return (
    <AdminLayout activeItem="Institutions">
      <div className="space-y-3">
        <AcademicHeader step={4} title="Classes and Sections" subtitle="Manage classes and create sections for each class." right={<ContextBar inst={inst} years={years} />} />
        <Breadcrumb trail={["Institutions", "Institution Settings", "Academic Settings", "Classes & Sections"]} />
        <AcademicTabs active="classes" />

        {(error || years.error) && <Notice tone="error"><span className="font-bold">Please review:</span> {error || years.error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}
        <NoYearNotice years={years} inst={inst} />

        <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-2">
          {/* ------- Classes column ------- */}
          <div className="min-w-0 space-y-3">
            <Panel>
              <PanelTitle icon={<Layers size={20} strokeWidth={2.4} />} title="Classes" right={<PrimaryButton type="button" onClick={newClass} disabled={noYear}><Plus size={14} /> Add Class</PrimaryButton>} />
              <div className="px-4 pb-4">
                <DataTable heads={["#", "Class Name", "Grade Level", "Students", "Sections", "Status", "Actions"]} min={520}>
                  {loading && <EmptyRow cols={7} text="Loading classes..." />}
                  {!loading && classes.length === 0 && <EmptyRow cols={7} text={noYear ? "Select an academic year to see its classes." : "No classes yet. Add the first one below."} />}
                  {!loading && classes.map((c, i) => (
                    <tr key={c.id} onClick={() => { setSelectedClass(c.id); setCId(c.id); setCForm(classToForm(c)); }} className={`cursor-pointer hover:bg-blue-50/50 ${selectedClass === c.id ? "bg-blue-50/70" : ""}`}>
                      <td className={tdClass}>{i + 1}</td>
                      <td className={`${tdClass} font-semibold text-[#17245e]`}>{c.name}</td>
                      <td className={tdClass}>{c.gradeLevel ?? "-"}</td>
                      <td className={tdClass}>{c.studentCount}</td>
                      <td className={tdClass}>{c.sectionCount}</td>
                      <td className={tdClass}><StatusPill status={c.active ? "Active" : "Inactive"} /></td>
                      <td className={tdClass} onClick={(e) => e.stopPropagation()}><RowActions name={c.name} onEdit={() => editClass(c)} onDelete={() => void deleteClass(c)} /></td>
                    </tr>
                  ))}
                </DataTable>
                <TableFooter shown={classes.length} total={classes.length} />
              </div>
            </Panel>

            <DetailCard
              title={cId === null ? "New Class" : "Class Details"}
              saving={saving}
              onCancel={() => { const c = classes.find((x) => x.id === cId); if (c) editClass(c); else newClass(); }}
              onSave={() => void saveClass()}
            >
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <Field label="Class Name" required><input className={controlClass} value={cForm.name} onChange={(e) => setC("name", e.target.value)} placeholder="e.g. Grade 3" /></Field>
                <Field label="Grade Level"><input inputMode="numeric" className={controlClass} value={cForm.gradeLevel} onChange={(e) => setC("gradeLevel", e.target.value.replace(/\D/g, ""))} placeholder="e.g. 3" /></Field>
                <Field label="Academic Year"><input className={`${controlClass} bg-slate-50`} value={years.year?.name ?? ""} readOnly /></Field>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
                <Field label="Description"><textarea className={textareaClass} value={cForm.description} onChange={(e) => setC("description", e.target.value)} /></Field>
                <Field label="Status"><div className="flex h-8 items-center"><Toggle checked={cForm.active} onChange={(v) => setC("active", v)} /></div></Field>
              </div>
            </DetailCard>
          </div>

          {/* ------- Sections column ------- */}
          <div className="min-w-0 space-y-3">
            <Panel>
              <PanelTitle icon={<Users size={20} strokeWidth={2.4} />} title={`Sections (${klass?.name ?? "—"})`} right={<PrimaryButton type="button" onClick={newSection} disabled={!klass}><Plus size={14} /> Add Section</PrimaryButton>} />
              <div className="px-4 pb-4">
                <DataTable heads={["#", "Section Name", "Class", "Teacher", "Students", "Status", "Actions"]} min={520}>
                  {sectionsLoading && <EmptyRow cols={7} text="Loading sections..." />}
                  {!sectionsLoading && sections.length === 0 && <EmptyRow cols={7} text={klass ? "No sections for this class yet." : "Select or create a class first."} />}
                  {!sectionsLoading && sections.map((s, i) => (
                    <tr key={s.id} className={`hover:bg-blue-50/50 ${sId === s.id ? "bg-blue-50/60" : ""}`}>
                      <td className={tdClass}>{i + 1}</td>
                      <td className={`${tdClass} font-semibold text-[#17245e]`}>{s.name}</td>
                      <td className={tdClass}>{s.className}</td>
                      <td className={tdClass}>{s.teacherName || "—"}</td>
                      <td className={tdClass}>{s.studentCount}</td>
                      <td className={tdClass}><StatusPill status={s.active ? "Active" : "Inactive"} /></td>
                      <td className={tdClass}><RowActions name={s.name} onEdit={() => editSection(s)} onDelete={() => void deleteSection(s)} /></td>
                    </tr>
                  ))}
                </DataTable>
                <TableFooter shown={sections.length} total={sections.length} />
              </div>
            </Panel>

            <DetailCard
              title={sId === null ? "New Section" : "Section Details"}
              saving={saving}
              onCancel={() => { const s = sections.find((x) => x.id === sId); if (s) editSection(s); else newSection(); }}
              onSave={() => void saveSection()}
            >
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <Field label="Section Name" required><input className={controlClass} value={sForm.name} onChange={(e) => setS("name", e.target.value)} placeholder="e.g. 3A" /></Field>
                <Field label="Class"><input className={`${controlClass} bg-slate-50`} value={klass?.name ?? ""} readOnly /></Field>
                <Field label="Class Teacher">
                  <select className={controlClass} value={sForm.teacherId} onChange={(e) => setS("teacherId", e.target.value)}>
                    <option value="">{teachers.length ? "Select Teacher" : "No teachers added yet"}</option>
                    {teachers.filter((t) => t.active || String(t.id) === sForm.teacherId).map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                  </select>
                </Field>
                <Field label="Room" optional><input className={controlClass} value={sForm.room} onChange={(e) => setS("room", e.target.value)} placeholder="e.g. Room 101" /></Field>
                <Field label="Max Students" optional><input inputMode="numeric" className={controlClass} value={sForm.maxStudents} onChange={(e) => setS("maxStudents", e.target.value.replace(/\D/g, ""))} /></Field>
                <Field label="Status"><div className="flex h-8 items-center"><Toggle checked={sForm.active} onChange={(v) => setS("active", v)} /></div></Field>
              </div>
              <Field label="Description" className="mt-3"><textarea className={textareaClass} value={sForm.description} onChange={(e) => setS("description", e.target.value)} /></Field>
            </DetailCard>
          </div>
        </div>

        <footer className="pb-1 pt-0.5 text-center text-[10px] text-slate-400">© {new Date().getFullYear()} Centram Classzy · School Management Platform</footer>
      </div>
    </AdminLayout>
  );
}
