import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Plus } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../services/api";
import type { Subject, SubjectInput } from "../../services/api";
import {
  AcademicHeader, AcademicTabs, Breadcrumb, DataTable, DetailCard, EmptyRow, Field, Notice, Panel, PanelTitle,
  PrimaryButton, RowActions, SearchBox, StatusPill, TableFooter, Toggle, controlClass, tdClass, textareaClass,
} from "./AcademicShared";
import { ContextBar, NoYearNotice, errText, useAcademicYears, useActiveInstitution } from "./SettingsShared";

const categories = ["Language", "Core", "Skill", "Co-Curricular"];
const allClasses = Array.from({ length: 12 }, (_, i) => i + 1);
const classLabel = (c: number[]) => [...c].sort((a, b) => a - b).join(", ");

export default function Subjects() {
  const inst = useActiveInstitution();
  const years = useAcademicYears(inst.institutionId);
  const yearId = years.yearId;

  const blank = useCallback((): SubjectInput => ({ academicYearId: yearId ?? 0, name: "", code: "", category: "Core", classLevels: [], active: true, description: "" }), [yearId]);
  const [list, setList] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<SubjectInput>(blank);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("All");
  const [catFilter, setCatFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (yearId === null) { setList([]); return; }
    setLoading(true);
    try { setList(await api.subjects.list(yearId)); setError(""); } catch (e) { setError(errText(e)); } finally { setLoading(false); }
  }, [yearId]);

  useEffect(() => { void load(); setEditingId(null); setForm(blank()); }, [load, blank]);

  const visible = useMemo(() => list.filter((s) =>
    (s.name.toLowerCase().includes(query.toLowerCase()) || s.code.toLowerCase().includes(query.toLowerCase())) &&
    (classFilter === "All" || s.classLevels.includes(Number(classFilter))) &&
    (catFilter === "All" || s.category === catFilter) &&
    (statusFilter === "All" || (statusFilter === "Active" ? s.active : !s.active)),
  ), [list, query, classFilter, catFilter, statusFilter]);

  const set = <K extends keyof SubjectInput>(k: K, v: SubjectInput[K]) => { setForm((f) => ({ ...f, [k]: v })); setError(""); setNotice(""); };
  const toggleClass = (n: number) => set("classLevels", form.classLevels.includes(n) ? form.classLevels.filter((x) => x !== n) : [...form.classLevels, n]);

  function startNew() { setEditingId(null); setForm(blank()); setError(""); }
  function edit(s: Subject) {
    setEditingId(s.id);
    setForm({ academicYearId: s.academicYearId, name: s.name, code: s.code, category: s.category, classLevels: [...s.classLevels], active: s.active, description: s.description ?? "" });
    setError("");
  }

  async function save() {
    if (yearId === null) { setError("Create an academic year first."); return; }
    if (!form.name.trim() || !form.code.trim()) { setError("Please complete Subject Name and Subject Code."); return; }
    if (!form.classLevels.length) { setError("Select at least one applicable class."); return; }
    setSaving(true);
    try {
      const body: SubjectInput = { ...form, academicYearId: yearId, name: form.name.trim(), code: form.code.trim().toUpperCase(), description: form.description?.trim() || null };
      const saved = editingId === null ? await api.subjects.create(body) : await api.subjects.update(editingId, body);
      setNotice(`${saved.name} saved.`);
      setError("");
      await load();
      if (editingId === null) startNew(); else edit(saved);
    } catch (e) { setError(errText(e)); } finally { setSaving(false); }
  }

  async function remove(s: Subject) {
    if (!window.confirm(`Delete subject ${s.name}?`)) return;
    try {
      await api.subjects.remove(s.id);
      setNotice(`${s.name} deleted.`);
      if (editingId === s.id) startNew();
      await load();
    } catch (e) { setError(errText(e)); }
  }

  return (
    <AdminLayout activeItem="Institutions">
      <div className="space-y-3">
        <AcademicHeader step={3} title="Subjects" subtitle="Manage subjects for each academic year, class and curriculum." right={<ContextBar inst={inst} years={years} />} />
        <Breadcrumb trail={["Institutions", "Institution Settings", "Academic Settings", "Subjects"]} />
        <AcademicTabs active="subjects" />

        {(error || years.error) && <Notice tone="error"><span className="font-bold">Please review:</span> {error || years.error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}
        <NoYearNotice years={years} inst={inst} />

        <Panel>
          <PanelTitle icon={<BookOpen size={20} strokeWidth={2.4} />} title="Subjects" right={<PrimaryButton type="button" onClick={startNew} disabled={yearId === null}><Plus size={14} /> Add Subject</PrimaryButton>} />
          <div className="px-4 pb-4">
            <div className="mb-3 flex flex-wrap items-end gap-3">
              <SearchBox value={query} onChange={setQuery} placeholder="Search subjects..." />
              <Field label="Class" className="w-[110px]">
                <select className={controlClass} value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
                  <option>All</option>{allClasses.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Category" className="w-[140px]">
                <select className={controlClass} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                  <option>All</option>{categories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Status" className="w-[110px]">
                <select className={controlClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option>All</option><option>Active</option><option>Inactive</option>
                </select>
              </Field>
            </div>

            <DataTable heads={["#", "Subject Name", "Subject Code", "Category", "Applicable Classes", "Status", "Actions"]} min={640}>
              {loading && <EmptyRow cols={7} text="Loading subjects..." />}
              {!loading && visible.length === 0 && <EmptyRow cols={7} text={list.length === 0 ? "No subjects yet. Add the first one below." : "No subjects match your filters."} />}
              {!loading && visible.map((s, i) => (
                <tr key={s.id} className={`hover:bg-blue-50/50 ${editingId === s.id ? "bg-blue-50/60" : ""}`}>
                  <td className={tdClass}>{i + 1}</td>
                  <td className={`${tdClass} font-semibold text-[#17245e]`}>{s.name}</td>
                  <td className={tdClass}>{s.code}</td>
                  <td className={tdClass}>{s.category}</td>
                  <td className={tdClass}>{classLabel(s.classLevels)}</td>
                  <td className={tdClass}><StatusPill status={s.active ? "Active" : "Inactive"} /></td>
                  <td className={tdClass}><RowActions name={s.name} onEdit={() => edit(s)} onDelete={() => void remove(s)} /></td>
                </tr>
              ))}
            </DataTable>
            <TableFooter shown={visible.length} total={list.length} />
          </div>
        </Panel>

        <DetailCard
          title={editingId === null ? "New Subject" : "Subject Details"}
          saving={saving}
          onCancel={() => { const s = list.find((x) => x.id === editingId); if (s) edit(s); else startNew(); }}
          onSave={() => void save()}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Subject Name" required><input className={controlClass} value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="Subject Code" required><input className={controlClass} value={form.code} onChange={(e) => set("code", e.target.value)} /></Field>
            <Field label="Category" required>
              <select className={controlClass} value={form.category} onChange={(e) => set("category", e.target.value)}>{categories.map((c) => <option key={c}>{c}</option>)}</select>
            </Field>
            <Field label="Status"><div className="flex h-8 items-center"><Toggle checked={form.active} onChange={(v) => set("active", v)} /></div></Field>
          </div>

          <Field label="Applicable Classes" required className="mt-3">
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {allClasses.map((n) => {
                const on = form.classLevels.includes(n);
                return (
                  <button key={n} type="button" aria-pressed={on} onClick={() => toggleClass(n)}
                    className={`h-7 min-w-8 rounded-md border px-2 text-[10px] font-semibold transition ${on ? "border-blue-500 bg-blue-600 text-white" : "border-[#d3dff0] bg-white text-[#34477c] hover:border-blue-300"}`}>
                    {n}
                  </button>
                );
              })}
              <button type="button" onClick={() => set("classLevels", form.classLevels.length === allClasses.length ? [] : [...allClasses])} className="ml-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800">
                {form.classLevels.length === allClasses.length ? "Clear all" : "Select all"}
              </button>
            </div>
          </Field>

          <Field label="Description" className="mt-3"><textarea className={textareaClass} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} /></Field>
        </DetailCard>

        <footer className="pb-1 pt-0.5 text-center text-[10px] text-slate-400">© {new Date().getFullYear()} Centram Classzy · School Management Platform</footer>
      </div>
    </AdminLayout>
  );
}
