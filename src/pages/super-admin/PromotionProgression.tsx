import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, TrendingUp, Users } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../services/api";
import type { CriteriaType, PreviewRow, ProgressionStatus, PromotionRule, PromotionRuleInput, SchoolClass, SubjectScope } from "../../services/api";
import {
  AcademicHeader, AcademicTabs, Breadcrumb, DataTable, DetailCard, EmptyRow, Field, Notice, Panel, PanelTitle,
  PrimaryButton, RowActions, SearchBox, StatusPill, TableFooter, Toggle, controlClass, tdClass, textareaClass,
} from "./AcademicShared";
import { ContextBar, NoYearNotice, errText, useAcademicYears, useActiveInstitution } from "./SettingsShared";

const criteriaLabels: Record<CriteriaType, string> = { PERCENTAGE: "Percentage", GRADE_POINT: "Grade Point", PASS_ALL: "Pass in all subjects" };
const scopeLabels: Record<SubjectScope, string> = { ALL_SUBJECTS: "All Subjects", CORE_SUBJECTS: "Core Subjects", ANY_SUBJECT: "Any Subject" };
const statusLabels: Record<ProgressionStatus, string> = { ELIGIBLE: "Eligible", REVIEW: "Review", RETAIN: "Retain" };

type RuleForm = {
  name: string; fromClass: string; toClass: string; criteriaType: CriteriaType; minValue: string;
  subjectScope: SubjectScope; additionalConditions: string; active: boolean;
};
const blank: RuleForm = { name: "", fromClass: "", toClass: "", criteriaType: "PERCENTAGE", minValue: "40", subjectScope: "ALL_SUBJECTS", additionalConditions: "", active: true };

export default function PromotionProgression() {
  const inst = useActiveInstitution();
  const years = useAcademicYears(inst.institutionId);
  const yearId = years.yearId;

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [rules, setRules] = useState<PromotionRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [form, setForm] = useState<RuleForm>(blank);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [q, setQ] = useState("");
  const [classFilter, setClassFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const classOptions = useMemo(
    () => [...classes].sort((a, b) => (a.gradeLevel ?? -1) - (b.gradeLevel ?? -1) || a.name.localeCompare(b.name)).map((c) => c.name),
    [classes],
  );

  const set = <K extends keyof RuleForm>(k: K, v: RuleForm[K]) => { setForm((f) => ({ ...f, [k]: v })); setError(""); setNotice(""); };

  const loadRules = useCallback(async () => {
    if (yearId === null) { setRules([]); return; }
    setRulesLoading(true);
    try { setRules(await api.promotion.listRules(yearId)); setError(""); } catch (e) { setError(errText(e)); } finally { setRulesLoading(false); }
  }, [yearId]);

  const loadPreview = useCallback(async () => {
    if (yearId === null) { setRows([]); return; }
    setRowsLoading(true);
    try { setRows(await api.promotion.preview(yearId)); } catch (e) { setError(errText(e)); } finally { setRowsLoading(false); }
  }, [yearId]);

  useEffect(() => {
    setEditingId(null); setForm({ ...blank });
    void loadRules();
    void loadPreview();
    if (yearId === null) { setClasses([]); return; }
    api.classes.list(yearId).then(setClasses).catch(() => setClasses([]));
  }, [yearId, loadRules, loadPreview]);

  const previewClasses = useMemo(() => [...new Set(rows.map((r) => r.currentClass).filter((c): c is string => Boolean(c)))], [rows]);
  const visibleRows = useMemo(() => rows.filter((s) =>
    s.studentName.toLowerCase().includes(q.toLowerCase()) &&
    (classFilter === "All" || s.currentClass === classFilter) &&
    (statusFilter === "All" || s.status === statusFilter)), [rows, q, classFilter, statusFilter]);

  function startNew() { setEditingId(null); setForm({ ...blank }); setError(""); }
  function edit(r: PromotionRule) {
    setEditingId(r.id);
    setForm({
      name: r.name, fromClass: r.fromClass, toClass: r.toClass, criteriaType: r.criteriaType,
      minValue: r.minValue === null ? "" : String(r.minValue), subjectScope: r.subjectScope,
      additionalConditions: r.additionalConditions ?? "", active: r.active,
    });
    setError("");
  }

  async function save() {
    if (yearId === null) { setError("Create an academic year first."); return; }
    if (!form.name.trim() || !form.fromClass || !form.toClass) { setError("Please complete Rule Name, From Class and To Class."); return; }
    let minValue: number | null = null;
    if (form.criteriaType !== "PASS_ALL") {
      const n = Number(form.minValue);
      const max = form.criteriaType === "PERCENTAGE" ? 100 : 10;
      if (form.minValue === "" || Number.isNaN(n) || n < 0 || n > max) {
        setError(form.criteriaType === "PERCENTAGE" ? "Minimum Percentage must be between 0 and 100." : "Minimum Grade Point must be between 0 and 10.");
        return;
      }
      minValue = n;
    }
    setSaving(true);
    try {
      const body: PromotionRuleInput = {
        academicYearId: yearId, name: form.name.trim(), fromClass: form.fromClass, toClass: form.toClass,
        criteriaType: form.criteriaType, minValue, subjectScope: form.subjectScope,
        additionalConditions: form.additionalConditions.trim() || null, active: form.active,
      };
      const saved = editingId === null ? await api.promotion.createRule(body) : await api.promotion.updateRule(editingId, body);
      setNotice(`Rule "${saved.name}" saved.`);
      setError("");
      await Promise.all([loadRules(), loadPreview()]);
      if (editingId === null) startNew(); else edit(saved);
    } catch (e) { setError(errText(e)); } finally { setSaving(false); }
  }

  async function remove(r: PromotionRule) {
    if (!window.confirm(`Delete rule "${r.name}"?`)) return;
    try {
      await api.promotion.removeRule(r.id);
      setNotice(`Rule "${r.name}" deleted.`);
      if (editingId === r.id) startNew();
      await Promise.all([loadRules(), loadPreview()]);
    } catch (e) { setError(errText(e)); }
  }

  async function overrideStatus(row: PreviewRow, status: ProgressionStatus) {
    if (yearId === null) return;
    try {
      const updated = await api.promotion.override({
        academicYearId: yearId, studentId: row.studentId, status,
        nextClass: status === "RETAIN" ? row.currentClass : row.nextClass, remarks: row.remarks,
      });
      setRows((l) => l.map((x) => (x.studentId === row.studentId ? updated : x)));
      setError("");
    } catch (e) { setError(errText(e)); }
  }

  const noYear = yearId === null;

  return (
    <AdminLayout activeItem="Institutions">
      <div className="space-y-3">
        <AcademicHeader step={5} title="Promotion and Progression" subtitle="Define promotion rules and manage student progression." right={<ContextBar inst={inst} years={years} />} />
        <Breadcrumb trail={["Institutions", "Institution Settings", "Academic Settings", "Promotion & Progression"]} />
        <AcademicTabs active="promotion" />

        {(error || years.error) && <Notice tone="error"><span className="font-bold">Please review:</span> {error || years.error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}
        <NoYearNotice years={years} inst={inst} />

        <Panel>
          <PanelTitle icon={<TrendingUp size={20} strokeWidth={2.4} />} title="Promotion Rules" right={<PrimaryButton type="button" onClick={startNew} disabled={noYear}><Plus size={14} /> Add Rule</PrimaryButton>} />
          <div className="px-4 pb-4">
            <DataTable heads={["#", "Rule Name", "From Class", "To Class", "Criteria", "Status", "Actions"]} min={640}>
              {rulesLoading && <EmptyRow cols={7} text="Loading promotion rules..." />}
              {!rulesLoading && rules.length === 0 && <EmptyRow cols={7} text={noYear ? "Select an academic year to see its rules." : "No promotion rules defined."} />}
              {!rulesLoading && rules.map((r, i) => (
                <tr key={r.id} className={`hover:bg-blue-50/50 ${editingId === r.id ? "bg-blue-50/60" : ""}`}>
                  <td className={tdClass}>{i + 1}</td>
                  <td className={`${tdClass} font-semibold text-[#17245e]`}>{r.name}</td>
                  <td className={tdClass}>{r.fromClass}</td>
                  <td className={tdClass}>{r.toClass}</td>
                  <td className={tdClass}>{r.criteria}</td>
                  <td className={tdClass}><StatusPill status={r.active ? "Active" : "Inactive"} /></td>
                  <td className={tdClass}><RowActions name={r.name} onEdit={() => edit(r)} onDelete={() => void remove(r)} /></td>
                </tr>
              ))}
            </DataTable>
            <TableFooter shown={rules.length} total={rules.length} />
          </div>
        </Panel>

        <DetailCard
          title={editingId === null ? "New Promotion Rule" : "Promotion Rule Details"}
          saving={saving}
          onCancel={() => { const r = rules.find((x) => x.id === editingId); if (r) edit(r); else startNew(); }}
          onSave={() => void save()}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Rule Name" required><input className={controlClass} value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="From Class" required>
              <select className={controlClass} value={form.fromClass} onChange={(e) => set("fromClass", e.target.value)}>
                <option value="">{classOptions.length ? "Select" : "Add classes first"}</option>
                {classOptions.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="To Class" required>
              <select className={controlClass} value={form.toClass} onChange={(e) => set("toClass", e.target.value)}>
                <option value="">Select</option>{classOptions.map((c) => <option key={c}>{c}</option>)}<option>Complete</option>
              </select>
            </Field>
            <Field label="Criteria Type" required>
              <select className={controlClass} value={form.criteriaType} onChange={(e) => set("criteriaType", e.target.value as CriteriaType)}>
                {(Object.keys(criteriaLabels) as CriteriaType[]).map((c) => <option key={c} value={c}>{criteriaLabels[c]}</option>)}
              </select>
            </Field>
            {form.criteriaType !== "PASS_ALL" && (
              <Field label={form.criteriaType === "PERCENTAGE" ? "Minimum Percentage" : "Minimum Grade Point"} required>
                <input inputMode="decimal" className={controlClass} value={form.minValue} onChange={(e) => set("minValue", e.target.value.replace(/[^\d.]/g, ""))} />
              </Field>
            )}
            <Field label="Subject Criteria">
              <select className={controlClass} value={form.subjectScope} onChange={(e) => set("subjectScope", e.target.value as SubjectScope)}>
                {(Object.keys(scopeLabels) as SubjectScope[]).map((c) => <option key={c} value={c}>{scopeLabels[c]}</option>)}
              </select>
            </Field>
            <Field label="Status"><div className="flex h-8 items-center"><Toggle checked={form.active} onChange={(v) => set("active", v)} /></div></Field>
          </div>
          <Field label="Additional Conditions" optional className="mt-3">
            <textarea className={textareaClass} value={form.additionalConditions} onChange={(e) => set("additionalConditions", e.target.value)} placeholder="e.g. Student must have minimum 75% attendance." />
          </Field>
        </DetailCard>

        <Panel>
          <PanelTitle icon={<Users size={20} strokeWidth={2.4} />} title="Student Progression (Preview)" right={<PrimaryButton type="button" onClick={() => void loadPreview()} disabled={noYear}>Refresh Preview</PrimaryButton>} />
          <div className="px-4 pb-4">
            <div className="mb-3 flex flex-wrap items-end gap-3">
              <SearchBox value={q} onChange={setQ} placeholder="Search students..." />
              <Field label="Class" className="w-[130px]">
                <select className={controlClass} value={classFilter} onChange={(e) => setClassFilter(e.target.value)}><option>All</option>{previewClasses.map((c) => <option key={c}>{c}</option>)}</select>
              </Field>
              <Field label="Status" className="w-[120px]">
                <select className={controlClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="All">All</option>
                  {(Object.keys(statusLabels) as ProgressionStatus[]).map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
                </select>
              </Field>
            </div>
            <DataTable heads={["#", "Student Name", "Current Class", "Next Class", "Status", "Remarks", "Actions"]} min={680}>
              {rowsLoading && <EmptyRow cols={7} text="Loading students..." />}
              {!rowsLoading && visibleRows.length === 0 && <EmptyRow cols={7} text={rows.length === 0 ? "No students enrolled yet. Students appear here once they are added to classes." : "No students match your filters."} />}
              {!rowsLoading && visibleRows.map((s, i) => (
                <tr key={s.studentId} className="hover:bg-blue-50/50">
                  <td className={tdClass}>{i + 1}</td>
                  <td className={`${tdClass} font-semibold text-[#17245e]`}>{s.studentName}</td>
                  <td className={tdClass}>{s.currentClass ?? "—"}</td>
                  <td className={tdClass}>{s.nextClass ?? "—"}</td>
                  <td className={tdClass}><StatusPill status={statusLabels[s.status]} /></td>
                  <td className={tdClass}>{s.remarks}</td>
                  <td className={tdClass}>
                    <select aria-label={`Override status for ${s.studentName}`} value={s.status} onChange={(e) => void overrideStatus(s, e.target.value as ProgressionStatus)} className="rounded border border-[#d3dff0] bg-white px-1.5 py-1 text-[9px] text-[#17265f]">
                      {(Object.keys(statusLabels) as ProgressionStatus[]).map((st) => <option key={st} value={st}>{statusLabels[st]}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </DataTable>
            <TableFooter shown={visibleRows.length} total={rows.length} />
          </div>
        </Panel>

        <footer className="pb-1 pt-0.5 text-center text-[10px] text-slate-400">© {new Date().getFullYear()} Centram Classzy · School Management Platform</footer>
      </div>
    </AdminLayout>
  );
}
