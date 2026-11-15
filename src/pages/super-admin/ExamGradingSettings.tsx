import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ClipboardList, FileText, GraduationCap, Plus, Settings2, Sigma } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../services/api";
import type {
  ExamCategory, ExamSettings, ExamType, ExamTypeBody, Grade, GradeInput, GradeKind, GradingSystem, GradingSystemInput,
  ReportKind, ReportTemplate, ReportTemplateBody, ResultTemplate, ResultTemplateBody,
} from "../../services/api";
import {
  AcademicHeader, Breadcrumb, DataTable, DetailCard, EmptyRow, Field, Notice, OutlineButton, Panel, PanelTitle, PrimaryButton,
  RowActions, SearchBox, StatusPill, TableFooter, Toggle, controlClass, tdClass, textareaClass,
} from "./AcademicShared";
import { ContextBar, NoYearNotice, errText, useAcademicYears, useActiveInstitution } from "./SettingsShared";

/* ------------------------------------------------------------------ labels */
const tabs = [
  { key: "types", label: "Exam Types", icon: ClipboardList },
  { key: "grading", label: "Grading System", icon: GraduationCap },
  { key: "reports", label: "Report Configuration", icon: FileText },
  { key: "results", label: "Result Templates", icon: Sigma },
  { key: "additional", label: "Additional Settings", icon: Settings2 },
] as const;
type TabKey = (typeof tabs)[number]["key"];

const categories: [ExamCategory, string][] = [["INTERNAL", "Internal"], ["EXTERNAL", "External"], ["PRACTICAL", "Practical"]];
const gradeKinds: [GradeKind, string][] = [["GRADE_POINT", "Grade + Point"], ["PERCENTAGE", "Percentage"], ["CGPA", "CGPA"]];
const reportKinds: [ReportKind, string][] = [["TERM_WISE", "Term-wise"], ["ANNUAL", "Annual"], ["PERIODIC", "Periodic"], ["CERTIFICATE", "Certificate"]];
const sectionOptions: [string, string][] = [
  ["STUDENT_DETAILS", "Student Details"], ["ATTENDANCE_SUMMARY", "Attendance Summary"], ["SUBJECT_MARKS", "Subject-wise Marks"], ["GRADES", "Grades"],
  ["REMARKS", "Remarks"], ["TEACHER_COMMENTS", "Teacher Comments"], ["PRINCIPAL_SIGNATURE", "Principal Signature"], ["SCHOOL_LOGO", "School Logo & Header"],
];
const calcTypes: [ResultTemplateBody["calculationType"], string][] = [["WEIGHTED", "Weighted (Based on Exam Types)"], ["SUBJECT_BASED", "Subject Based"], ["BOARD_PATTERN", "Board Pattern"]];
const roundings: [string, string][] = [["NEAREST_WHOLE", "Nearest Whole Number"], ["ROUND_UP", "Round Up"], ["ROUND_DOWN", "Round Down"], ["ONE_DECIMAL", "One Decimal Place"]];
const displays: [string, string][] = [["GRADE_AND_MARKS", "Grade and Marks"], ["MARKS_ONLY", "Marks Only"], ["GRADE_ONLY", "Grade Only"]];
const publications: [ExamSettings["publicationMethod"], string][] = [["MANUAL", "Manual Approval"], ["AUTO", "Auto Publish"], ["SCHEDULED", "Scheduled"]];
const levelOptions: [string, string][] = [["CLASS_TEACHER", "Class Teacher"], ["ACADEMIC_COORDINATOR", "Academic Coordinator"], ["PRINCIPAL", "Principal"]];
const pdfTemplates: [ExamSettings["pdfTemplate"], string][] = [["DEFAULT", "Default Template"], ["DETAILED", "Detailed Template"], ["COMPACT", "Compact Template"]];

const labelOf = (list: readonly (readonly [string, string])[], v: string) => list.find(([k]) => k === v)?.[1] ?? v;
const classOptions = Array.from({ length: 13 }, (_, i) => i);
const classLabel = (n: number) => (n === 0 ? "KG" : String(n));
const range = (from: number | null, to: number | null) => (from === null || to === null ? "--" : from === to ? classLabel(from) : `${classLabel(from)} - ${classLabel(to)}`);
const toggleIn = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function ClassRange({ from, to, onChange }: { from: number | null; to: number | null; onChange: (from: number | null, to: number | null) => void }) {
  const val = (n: number | null) => (n === null ? "" : String(n));
  const parse = (v: string) => (v === "" ? null : Number(v));
  return (
    <div className="flex items-center gap-1.5">
      <select aria-label="From class" className={controlClass} value={val(from)} onChange={(e) => onChange(parse(e.target.value), to)}>
        <option value="">All / none</option>{classOptions.map((c) => <option key={c} value={c}>{classLabel(c)}</option>)}
      </select>
      <span className="text-[10px] text-slate-500">to</span>
      <select aria-label="To class" className={controlClass} value={val(to)} onChange={(e) => onChange(from, parse(e.target.value))}>
        <option value="">All / none</option>{classOptions.map((c) => <option key={c} value={c}>{classLabel(c)}</option>)}
      </select>
    </div>
  );
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-[#17265f]">
      <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );
}
function SwitchRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#e1ecfa] bg-white px-3 py-2">
      <span className="text-[11px] font-semibold text-[#17245e]">{label}</span>
      <Toggle checked={checked} onChange={onChange} label="" />
    </div>
  );
}
/** Both ends of a class range must be given together. Returns an error text or "". */
const rangeError = (from: number | null, to: number | null) =>
  (from === null) !== (to === null) ? "Give both the first and last class, or leave both empty." : from !== null && to !== null && from > to ? "The first class can't be after the last class." : "";

/* ------------------------------------------------------------------ page */
export default function ExamGradingSettings() {
  const inst = useActiveInstitution();
  const years = useAcademicYears(inst.institutionId);
  const yearId = years.yearId;
  const [params, setParams] = useSearchParams();
  const tab = (tabs.find((t) => t.key === params.get("tab"))?.key ?? "types") as TabKey;

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const goTab = (k: TabKey) => { setParams({ tab: k }); setError(""); setNotice(""); };
  const clearMsg = () => { setError(""); setNotice(""); };

  /* ================= exam types ================= */
  const blankType = useCallback((): ExamTypeBody => ({ academicYearId: yearId ?? 0, name: "", code: "", description: "", classFrom: null, classTo: null, weightage: 0, category: "INTERNAL", active: true }), [yearId]);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [typeForm, setTypeForm] = useState<ExamTypeBody>(blankType);
  const [typeId, setTypeId] = useState<number | null>(null);
  const [typeQuery, setTypeQuery] = useState("");
  const [typeStatus, setTypeStatus] = useState("All");

  const loadTypes = useCallback(async () => {
    if (yearId === null) { setExamTypes([]); return; }
    setTypesLoading(true);
    try { setExamTypes(await api.exam.types.list(yearId)); } catch (e) { setError(errText(e)); } finally { setTypesLoading(false); }
  }, [yearId]);

  const visibleTypes = useMemo(() => examTypes.filter((t) =>
    (t.name.toLowerCase().includes(typeQuery.toLowerCase()) || t.code.toLowerCase().includes(typeQuery.toLowerCase())) &&
    (typeStatus === "All" || (typeStatus === "Active" ? t.active : !t.active))), [examTypes, typeQuery, typeStatus]);

  const setTF = <K extends keyof ExamTypeBody>(k: K, v: ExamTypeBody[K]) => { setTypeForm((f) => ({ ...f, [k]: v })); clearMsg(); };
  const newType = () => { setTypeId(null); setTypeForm(blankType()); setError(""); };
  const editType = (t: ExamType) => { setTypeId(t.id); setTypeForm({ ...t, description: t.description ?? "" }); setError(""); };
  async function saveType() {
    if (yearId === null) { setError("Create an academic year first."); return; }
    if (!typeForm.name.trim() || !typeForm.code.trim()) { setError("Please complete Exam Type Name and Code."); return; }
    const re = rangeError(typeForm.classFrom, typeForm.classTo);
    if (re) { setError(re); return; }
    if (typeForm.weightage < 0 || typeForm.weightage > 100) { setError("Weightage must be between 0 and 100."); return; }
    setSaving(true);
    try {
      const body = { ...typeForm, academicYearId: yearId, name: typeForm.name.trim(), code: typeForm.code.trim(), description: typeForm.description?.trim() || null };
      const saved = typeId === null ? await api.exam.types.create(body) : await api.exam.types.update(typeId, body);
      setNotice(`${saved.name} saved.`); setError("");
      await loadTypes();
      if (typeId === null) newType(); else editType(saved);
    } catch (e) { setError(errText(e)); } finally { setSaving(false); }
  }
  async function removeType(t: ExamType) {
    if (!window.confirm(`Delete exam type ${t.name}?`)) return;
    try { await api.exam.types.remove(t.id); setNotice(`${t.name} deleted.`); if (typeId === t.id) newType(); await loadTypes(); } catch (e) { setError(errText(e)); }
  }
  const totalWeight = examTypes.filter((t) => t.active).reduce((s, t) => s + t.weightage, 0);

  /* ================= grading systems ================= */
  const blankSystem = (): GradingSystemInput & { gradeType: GradeKind; totalMarks: number; passPercentage: number; classFrom: number | null; classTo: number | null } =>
    ({ name: "", description: "", active: true, gradeType: "GRADE_POINT", totalMarks: 100, passPercentage: 33, classFrom: null, classTo: null });
  const [systems, setSystems] = useState<GradingSystem[]>([]);
  const [sysLoading, setSysLoading] = useState(false);
  const [sysId, setSysId] = useState<number | null>(null);
  const [sysForm, setSysForm] = useState(blankSystem);
  const [gradeTab, setGradeTab] = useState<"definitions" | "criteria">("definitions");
  const [gradeForm, setGradeForm] = useState<GradeInput>({ grade: "", marksFrom: 0, marksTo: 0, gradePoint: 0, description: "" });
  const [gradeId, setGradeId] = useState<number | null>(null);
  const [showGrade, setShowGrade] = useState(false);

  const sysToForm = (s: GradingSystem) => ({ name: s.name, description: s.description ?? "", active: s.active, gradeType: s.gradeType, totalMarks: s.totalMarks, passPercentage: s.passPercentage, classFrom: s.classFrom, classTo: s.classTo });
  const loadSystems = useCallback(async (select?: number | "new") => {
    if (inst.institutionId === null) { setSystems([]); return; }
    setSysLoading(true);
    try {
      const list = await api.grading.list();
      setSystems(list);
      setSysId((prev) => {
        if (select === "new") { setSysForm(blankSystem()); return null; }
        const target = select ?? prev;
        const found = list.find((s) => s.id === target) ?? list[0];
        setSysForm(found ? sysToForm(found) : blankSystem());
        return found ? found.id : null;
      });
    } catch (e) { setError(errText(e)); } finally { setSysLoading(false); }
  }, [inst.institutionId]);

  const system = systems.find((s) => s.id === sysId) ?? null;
  const grades: Grade[] = [...(system?.grades ?? [])].sort((a, b) => b.marksFrom - a.marksFrom);
  const setSF = <K extends keyof ReturnType<typeof blankSystem>>(k: K, v: ReturnType<typeof blankSystem>[K]) => { setSysForm((f) => ({ ...f, [k]: v })); clearMsg(); };

  async function saveSystem() {
    if (!sysForm.name.trim()) { setError("Grading System Name is required."); return; }
    const re = rangeError(sysForm.classFrom, sysForm.classTo);
    if (re) { setError(re); return; }
    setSaving(true);
    try {
      const body: GradingSystemInput = { ...sysForm, name: sysForm.name.trim(), description: sysForm.description?.trim() || null };
      const saved = sysId === null ? await api.grading.createSystem(body) : await api.grading.updateSystem(sysId, body);
      setNotice(sysId === null ? `${saved.name} created. Now add its grades.` : `${saved.name} saved.`); setError("");
      await loadSystems(saved.id);
    } catch (e) { setError(errText(e)); } finally { setSaving(false); }
  }
  async function removeSystem(s: GradingSystem) {
    if (!window.confirm(`Delete grading system ${s.name} and all its grades?`)) return;
    try { await api.grading.removeSystem(s.id); setNotice(`${s.name} deleted.`); await loadSystems(s.id === sysId ? undefined : sysId ?? undefined); } catch (e) { setError(errText(e)); }
  }
  function pickSystem(s: GradingSystem) { setSysId(s.id); setSysForm(sysToForm(s)); setShowGrade(false); setError(""); }

  const setGF = <K extends keyof GradeInput>(k: K, v: GradeInput[K]) => { setGradeForm((f) => ({ ...f, [k]: v })); setError(""); };
  function openGrade(g?: Grade) {
    setShowGrade(true); setGradeId(g?.id ?? null);
    setGradeForm(g ? { grade: g.grade, marksFrom: g.marksFrom, marksTo: g.marksTo, gradePoint: g.gradePoint, description: g.description ?? "" } : { grade: "", marksFrom: 0, marksTo: 0, gradePoint: 0, description: "" });
  }
  async function saveGrade() {
    if (!system) { setError("Save the grading system first."); return; }
    if (!gradeForm.grade.trim()) { setError("Grade label is required."); return; }
    if (gradeForm.marksFrom > gradeForm.marksTo) { setError("'From Marks' can't be greater than 'To Marks'."); return; }
    if (gradeForm.marksFrom < 0 || gradeForm.marksTo > 100) { setError("Marks must be between 0 and 100."); return; }
    if (system.grades.some((g) => g.id !== gradeId && gradeForm.marksFrom <= g.marksTo && gradeForm.marksTo >= g.marksFrom)) { setError("This mark range overlaps with another grade."); return; }
    setSaving(true);
    try {
      const body = { ...gradeForm, grade: gradeForm.grade.trim(), description: gradeForm.description?.trim() || null };
      if (gradeId === null) await api.grading.addGrade(system.id, body); else await api.grading.updateGrade(system.id, gradeId, body);
      setShowGrade(false); setNotice("Grade saved."); setError("");
      await loadSystems(system.id);
    } catch (e) { setError(errText(e)); } finally { setSaving(false); }
  }
  async function removeGrade(g: Grade) {
    if (!system || !window.confirm(`Delete grade ${g.grade}?`)) return;
    try { await api.grading.removeGrade(system.id, g.id); await loadSystems(system.id); } catch (e) { setError(errText(e)); }
  }

  /* ================= report templates ================= */
  const blankReport = useCallback((): ReportTemplateBody => ({ academicYearId: yearId ?? 0, name: "", reportType: "TERM_WISE", classFrom: null, classTo: null, sections: ["STUDENT_DETAILS", "SUBJECT_MARKS", "GRADES"], active: true }), [yearId]);
  const [reports, setReports] = useState<ReportTemplate[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportForm, setReportForm] = useState<ReportTemplateBody>(blankReport);
  const [reportId, setReportId] = useState<number | null>(null);
  const [reportQuery, setReportQuery] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const loadReports = useCallback(async () => {
    if (yearId === null) { setReports([]); return; }
    setReportsLoading(true);
    try { setReports(await api.exam.reports.list(yearId)); } catch (e) { setError(errText(e)); } finally { setReportsLoading(false); }
  }, [yearId]);
  const setRF = <K extends keyof ReportTemplateBody>(k: K, v: ReportTemplateBody[K]) => { setReportForm((f) => ({ ...f, [k]: v })); clearMsg(); };
  const newReport = () => { setReportId(null); setReportForm(blankReport()); setError(""); setShowPreview(false); };
  const editReport = (r: ReportTemplate) => { setReportId(r.id); setReportForm({ ...r }); setError(""); };
  async function saveReport() {
    if (yearId === null) { setError("Create an academic year first."); return; }
    if (!reportForm.name.trim()) { setError("Report Name is required."); return; }
    const re = rangeError(reportForm.classFrom, reportForm.classTo);
    if (re) { setError(re); return; }
    setSaving(true);
    try {
      const body = { ...reportForm, academicYearId: yearId, name: reportForm.name.trim() };
      const saved = reportId === null ? await api.exam.reports.create(body) : await api.exam.reports.update(reportId, body);
      setNotice(`${saved.name} saved.`); setError("");
      await loadReports();
      if (reportId === null) newReport(); else editReport(saved);
    } catch (e) { setError(errText(e)); } finally { setSaving(false); }
  }
  async function removeReport(r: ReportTemplate) {
    if (!window.confirm(`Delete report template ${r.name}?`)) return;
    try { await api.exam.reports.remove(r.id); setNotice(`${r.name} deleted.`); if (reportId === r.id) newReport(); await loadReports(); } catch (e) { setError(errText(e)); }
  }
  const visibleReports = reports.filter((r) => r.name.toLowerCase().includes(reportQuery.toLowerCase()));

  /* ================= result templates ================= */
  const blankResult = useCallback((): ResultTemplateBody => ({ academicYearId: yearId ?? 0, name: "", calculationType: "WEIGHTED", classFrom: null, classTo: null, examTypeIds: [], roundingRule: "NEAREST_WHOLE", displayFormat: "GRADE_AND_MARKS", active: true }), [yearId]);
  const [resultsList, setResultsList] = useState<ResultTemplate[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultForm, setResultForm] = useState<ResultTemplateBody>(blankResult);
  const [resultId, setResultId] = useState<number | null>(null);
  const [resultQuery, setResultQuery] = useState("");

  const loadResults = useCallback(async () => {
    if (yearId === null) { setResultsList([]); return; }
    setResultsLoading(true);
    try { setResultsList(await api.exam.results.list(yearId)); } catch (e) { setError(errText(e)); } finally { setResultsLoading(false); }
  }, [yearId]);
  const setResF = <K extends keyof ResultTemplateBody>(k: K, v: ResultTemplateBody[K]) => { setResultForm((f) => ({ ...f, [k]: v })); clearMsg(); };
  const newResult = () => { setResultId(null); setResultForm(blankResult()); setError(""); };
  const editResult = (r: ResultTemplate) => { setResultId(r.id); setResultForm({ ...r }); setError(""); };
  async function saveResult() {
    if (yearId === null) { setError("Create an academic year first."); return; }
    if (!resultForm.name.trim()) { setError("Template Name is required."); return; }
    if (resultForm.calculationType === "WEIGHTED" && resultForm.examTypeIds.length === 0) { setError("Select at least one exam type."); return; }
    const re = rangeError(resultForm.classFrom, resultForm.classTo);
    if (re) { setError(re); return; }
    setSaving(true);
    try {
      const body = { ...resultForm, academicYearId: yearId, name: resultForm.name.trim() };
      const saved = resultId === null ? await api.exam.results.create(body) : await api.exam.results.update(resultId, body);
      setNotice(`${saved.name} saved.`); setError("");
      await loadResults();
      if (resultId === null) newResult(); else editResult(saved);
    } catch (e) { setError(errText(e)); } finally { setSaving(false); }
  }
  async function removeResult(r: ResultTemplate) {
    if (!window.confirm(`Delete result template ${r.name}?`)) return;
    try { await api.exam.results.remove(r.id); setNotice(`${r.name} deleted.`); if (resultId === r.id) newResult(); await loadResults(); } catch (e) { setError(errText(e)); }
  }
  const visibleResults = resultsList.filter((r) => r.name.toLowerCase().includes(resultQuery.toLowerCase()));
  const selectedTypes = examTypes.filter((t) => resultForm.examTypeIds.includes(t.id));
  const selectedWeight = selectedTypes.reduce((s, t) => s + t.weightage, 0);
  const formula = selectedTypes.length === 0 ? "Select exam types to see the formula."
    : `Final Marks = ${selectedTypes.map((t) => `(${t.code} × ${(t.weightage / 100).toFixed(2)})`).join(" + ")}`;

  /* ================= additional settings ================= */
  const [extra, setExtra] = useState<ExamSettings | null>(null);
  const [extraLoading, setExtraLoading] = useState(false);
  const setX = <K extends keyof ExamSettings>(k: K, v: ExamSettings[K]) => { setExtra((s) => (s ? { ...s, [k]: v } : s)); clearMsg(); };
  const loadExtra = useCallback(async () => {
    if (inst.institutionId === null) { setExtra(null); return; }
    setExtraLoading(true);
    try { setExtra(await api.exam.settings()); } catch (e) { setError(errText(e)); } finally { setExtraLoading(false); }
  }, [inst.institutionId]);
  async function saveExtra() {
    if (!extra) return;
    if (extra.reviewApproval && extra.approvalLevels.length === 0) { setError("Choose at least one approval level, or turn off review and approval."); return; }
    if (extra.maxMarksPerSubject < 1) { setError("Maximum marks must be at least 1."); return; }
    setSaving(true);
    try { setExtra(await api.exam.saveSettings(extra)); setNotice("Additional settings saved."); setError(""); } catch (e) { setError(errText(e)); } finally { setSaving(false); }
  }

  /* ---- loading by institution / year ---- */
  useEffect(() => { void loadSystems(); void loadExtra(); }, [loadSystems, loadExtra]);
  useEffect(() => {
    void loadTypes(); void loadReports(); void loadResults();
    setTypeId(null); setTypeForm(blankType()); setReportId(null); setReportForm(blankReport()); setResultId(null); setResultForm(blankResult());
  }, [yearId, loadTypes, loadReports, loadResults, blankType, blankReport, blankResult]);

  const needsYear = tab === "types" || tab === "reports" || tab === "results";
  const noYear = yearId === null;

  return (
    <AdminLayout activeItem="Institutions">
      <div className="space-y-3">
        <AcademicHeader step={tabs.findIndex((t) => t.key === tab) + 1} title={tabs.find((t) => t.key === tab)!.label}
          subtitle="Configure exams, grading, report cards and result publishing."
          right={<ContextBar inst={inst} years={needsYear ? years : undefined} />} />
        <Breadcrumb trail={["Institutions", "Institution Settings", "Exam & Grading Settings", tabs.find((t) => t.key === tab)!.label]} />

        <div className="overflow-x-auto">
          <div className="grid min-w-[700px] grid-cols-5 gap-2">
            {tabs.map(({ key, label }) => (
              <button key={key} type="button" onClick={() => goTab(key)} aria-current={tab === key ? "page" : undefined}
                className={`rounded-md border px-3 py-2 text-center text-[10px] font-semibold transition ${tab === key ? "border-blue-500 bg-[#dcecff] text-blue-800 shadow-[inset_0_-2px_0_#1478f8]" : "border-[#cfe0f5] bg-white text-[#34467a] hover:border-blue-300 hover:bg-blue-50"}`}>{label}</button>
            ))}
          </div>
        </div>

        {(error || (needsYear && years.error)) && <Notice tone="error"><span className="font-bold">Please review:</span> {error || years.error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}
        {needsYear && <NoYearNotice years={years} inst={inst} />}

        {/* ============================ EXAM TYPES ============================ */}
        {tab === "types" && (
          <>
            <Panel className="p-4">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
                  <SearchBox value={typeQuery} onChange={setTypeQuery} placeholder="Search exam types..." />
                  <Field label="Status" className="w-[130px]">
                    <select className={controlClass} value={typeStatus} onChange={(e) => setTypeStatus(e.target.value)}><option>All</option><option>Active</option><option>Inactive</option></select>
                  </Field>
                </div>
                <PrimaryButton type="button" onClick={newType} disabled={noYear}><Plus size={14} /> Add Exam Type</PrimaryButton>
              </div>
              <DataTable heads={["#", "Exam Type Name", "Code", "Description", "Applicable Classes", "Weightage (%)", "Status", "Actions"]} min={760}>
                {typesLoading && <EmptyRow cols={8} text="Loading exam types..." />}
                {!typesLoading && visibleTypes.length === 0 && <EmptyRow cols={8} text={examTypes.length === 0 ? "No exam types yet. Add the first one below." : "No exam types match your search."} />}
                {!typesLoading && visibleTypes.map((t, i) => (
                  <tr key={t.id} className={`hover:bg-blue-50/50 ${typeId === t.id ? "bg-blue-50/60" : ""}`}>
                    <td className={tdClass}>{i + 1}</td>
                    <td className={`${tdClass} font-semibold text-[#17245e]`}>{t.name}</td>
                    <td className={tdClass}>{t.code}</td>
                    <td className={tdClass}>{t.description ?? "—"}</td>
                    <td className={tdClass}>{range(t.classFrom, t.classTo)}</td>
                    <td className={tdClass}>{t.weightage}</td>
                    <td className={tdClass}><StatusPill status={t.active ? "Active" : "Inactive"} /></td>
                    <td className={tdClass}><RowActions name={t.name} onEdit={() => editType(t)} onDelete={() => void removeType(t)} /></td>
                  </tr>
                ))}
              </DataTable>
              <div className="flex flex-wrap items-center justify-between">
                <TableFooter shown={visibleTypes.length} total={examTypes.length} />
                {examTypes.length > 0 && (
                  <span className={`mt-2 rounded px-2 py-1 text-[9px] font-semibold ${totalWeight === 100 ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}`}>
                    Total active weightage: {totalWeight}%{totalWeight !== 100 && " (usually 100%)"}
                  </span>
                )}
              </div>
            </Panel>

            <DetailCard title={typeId === null ? "New Exam Type" : "Exam Type Details"} saving={saving}
              onCancel={() => { const t = examTypes.find((x) => x.id === typeId); if (t) editType(t); else newType(); }} onSave={() => void saveType()}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Exam Type Name" required><input className={controlClass} value={typeForm.name} onChange={(e) => setTF("name", e.target.value)} placeholder="e.g. Unit Test" /></Field>
                <Field label="Code" required><input className={controlClass} maxLength={10} value={typeForm.code} onChange={(e) => setTF("code", e.target.value.toUpperCase())} placeholder="e.g. UT" /></Field>
                <Field label="Description"><input className={controlClass} value={typeForm.description ?? ""} onChange={(e) => setTF("description", e.target.value)} /></Field>
                <Field label="Applicable Classes"><ClassRange from={typeForm.classFrom} to={typeForm.classTo} onChange={(f, t) => { setTypeForm((x) => ({ ...x, classFrom: f, classTo: t })); clearMsg(); }} /></Field>
                <Field label="Weightage (%)" required><input type="number" min={0} max={100} className={controlClass} value={typeForm.weightage} onChange={(e) => setTF("weightage", Number(e.target.value))} /></Field>
                <Field label="Exam Category">
                  <select className={controlClass} value={typeForm.category} onChange={(e) => setTF("category", e.target.value as ExamCategory)}>{categories.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                </Field>
                <Field label="Status"><div className="flex h-8 items-center"><Toggle checked={typeForm.active} onChange={(v) => setTF("active", v)} /></div></Field>
              </div>
            </DetailCard>
          </>
        )}

        {/* ============================ GRADING SYSTEM ============================ */}
        {tab === "grading" && (
          <>
            <Panel>
              <PanelTitle icon={<GraduationCap size={20} strokeWidth={2.4} />} title="Grading Systems" right={<PrimaryButton type="button" onClick={() => { void loadSystems("new"); setShowGrade(false); }} disabled={inst.institutionId === null}><Plus size={14} /> Add Grading System</PrimaryButton>} />
              <div className="px-4 pb-4">
                <DataTable heads={["#", "Grading System Name", "Description", "Applicable Classes", "Grade Type", "Total Marks", "Status", "Actions"]} min={760}>
                  {sysLoading && <EmptyRow cols={8} text="Loading grading systems..." />}
                  {!sysLoading && systems.length === 0 && <EmptyRow cols={8} text="No grading systems yet. Add the first one below." />}
                  {!sysLoading && systems.map((s, i) => (
                    <tr key={s.id} className={`hover:bg-blue-50/50 ${sysId === s.id ? "bg-blue-50/60" : ""}`}>
                      <td className={tdClass}>{i + 1}</td>
                      <td className={`${tdClass} font-semibold text-[#17245e]`}>{s.name}</td>
                      <td className={tdClass}>{s.description ?? "—"}</td>
                      <td className={tdClass}>{range(s.classFrom, s.classTo)}</td>
                      <td className={tdClass}>{labelOf(gradeKinds, s.gradeType)}</td>
                      <td className={tdClass}>{s.totalMarks}</td>
                      <td className={tdClass}><StatusPill status={s.active ? "Active" : "Inactive"} /></td>
                      <td className={tdClass}><RowActions name={s.name} onEdit={() => pickSystem(s)} onDelete={() => void removeSystem(s)} /></td>
                    </tr>
                  ))}
                </DataTable>
                <TableFooter shown={systems.length} total={systems.length} />
              </div>
            </Panel>

            <DetailCard title={sysId === null ? "New Grading System" : "Grading System Details"} saving={saving}
              onCancel={() => { if (system) pickSystem(system); else void loadSystems("new"); }} onSave={() => void saveSystem()}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Grading System Name" required><input className={controlClass} value={sysForm.name} onChange={(e) => setSF("name", e.target.value)} placeholder="e.g. CBSE (9 Point)" /></Field>
                <Field label="Description"><input className={controlClass} value={sysForm.description ?? ""} onChange={(e) => setSF("description", e.target.value)} /></Field>
                <Field label="Grade Type">
                  <select className={controlClass} value={sysForm.gradeType} onChange={(e) => setSF("gradeType", e.target.value as GradeKind)}>{gradeKinds.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                </Field>
                <Field label="Total Marks"><input type="number" min={1} max={1000} className={controlClass} value={sysForm.totalMarks} onChange={(e) => setSF("totalMarks", Number(e.target.value))} /></Field>
                <Field label="Applicable Classes"><ClassRange from={sysForm.classFrom} to={sysForm.classTo} onChange={(f, t) => setSysForm((x) => ({ ...x, classFrom: f, classTo: t }))} /></Field>
                <Field label="Status"><div className="flex h-8 items-center"><Toggle checked={sysForm.active} onChange={(v) => setSF("active", v)} /></div></Field>
              </div>
            </DetailCard>

            <Panel>
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3.5">
                <div className="flex gap-2">
                  {([["definitions", "Grade Definitions"], ["criteria", "Pass/Fail Criteria"]] as const).map(([k, l]) => (
                    <button key={k} type="button" onClick={() => setGradeTab(k)} className={`rounded-md border px-3 py-1.5 text-[10px] font-semibold ${gradeTab === k ? "border-blue-500 bg-[#dcecff] text-blue-800" : "border-[#cfe0f5] bg-white text-[#34467a] hover:bg-blue-50"}`}>{l}</button>
                  ))}
                </div>
                {gradeTab === "definitions" && <PrimaryButton type="button" onClick={() => openGrade()} disabled={!system}><Plus size={14} /> Add Grade</PrimaryButton>}
              </div>
              <div className="space-y-3 px-4 pb-4 pt-3">
                {!system && <p className="text-[11px] text-slate-500">Save a grading system to manage its grades.</p>}
                {system && gradeTab === "definitions" && (
                  <>
                    <p className="text-[10px] font-bold text-[#17245e]">Grades of {system.name}</p>
                    <DataTable heads={["#", "Grade", "From Marks (%)", "To Marks (%)", "Grade Point", "Description", "Actions"]} min={560}>
                      {grades.length === 0 && <EmptyRow cols={7} text="No grades defined yet." />}
                      {grades.map((g, i) => (
                        <tr key={g.id} className="hover:bg-blue-50/50">
                          <td className={tdClass}>{i + 1}</td>
                          <td className={`${tdClass} font-semibold text-[#17245e]`}>{g.grade}</td>
                          <td className={tdClass}>{g.marksFrom}</td>
                          <td className={tdClass}>{g.marksTo}</td>
                          <td className={tdClass}>{g.gradePoint}</td>
                          <td className={tdClass}>{g.description ?? "—"}</td>
                          <td className={tdClass}><RowActions name={g.grade} onEdit={() => openGrade(g)} onDelete={() => void removeGrade(g)} /></td>
                        </tr>
                      ))}
                    </DataTable>
                    {showGrade && (
                      <DetailCard title={gradeId === null ? "New Grade" : "Edit Grade"} saving={saving} onCancel={() => { setShowGrade(false); setError(""); }} onSave={() => void saveGrade()}>
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                          <Field label="Grade" required><input className={controlClass} value={gradeForm.grade} onChange={(e) => setGF("grade", e.target.value)} /></Field>
                          <Field label="From Marks (%)" required><input type="number" className={controlClass} value={gradeForm.marksFrom} onChange={(e) => setGF("marksFrom", Number(e.target.value))} /></Field>
                          <Field label="To Marks (%)" required><input type="number" className={controlClass} value={gradeForm.marksTo} onChange={(e) => setGF("marksTo", Number(e.target.value))} /></Field>
                          <Field label="Grade Point"><input type="number" className={controlClass} value={gradeForm.gradePoint} onChange={(e) => setGF("gradePoint", Number(e.target.value))} /></Field>
                          <Field label="Description"><input className={controlClass} value={gradeForm.description ?? ""} onChange={(e) => setGF("description", e.target.value)} /></Field>
                        </div>
                      </DetailCard>
                    )}
                  </>
                )}
                {system && gradeTab === "criteria" && (
                  <div className="flex flex-wrap items-end gap-3">
                    <Field label="Pass Percentage (%)" className="w-[180px]"><input type="number" min={0} max={100} className={controlClass} value={sysForm.passPercentage} onChange={(e) => setSF("passPercentage", Number(e.target.value))} /></Field>
                    <PrimaryButton type="button" onClick={() => void saveSystem()} disabled={saving}>Save Criteria</PrimaryButton>
                    <p className="pb-2 text-[10px] text-slate-500">A student passes a subject when they score at least this percentage.</p>
                  </div>
                )}
              </div>
            </Panel>
          </>
        )}

        {/* ============================ REPORT CONFIGURATION ============================ */}
        {tab === "reports" && (
          <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-2">
            <Panel>
              <PanelTitle title="Report Templates" right={<PrimaryButton type="button" onClick={newReport} disabled={noYear}><Plus size={14} /> Add Report Template</PrimaryButton>} />
              <div className="space-y-3 px-4 pb-4">
                <SearchBox value={reportQuery} onChange={setReportQuery} placeholder="Search reports..." />
                <DataTable heads={["#", "Report Name", "Report Type", "Classes", "Status", "Actions"]} min={520}>
                  {reportsLoading && <EmptyRow cols={6} text="Loading report templates..." />}
                  {!reportsLoading && visibleReports.length === 0 && <EmptyRow cols={6} text={reports.length === 0 ? "No report templates yet." : "No templates match your search."} />}
                  {!reportsLoading && visibleReports.map((r, i) => (
                    <tr key={r.id} className={`hover:bg-blue-50/50 ${reportId === r.id ? "bg-blue-50/60" : ""}`}>
                      <td className={tdClass}>{i + 1}</td>
                      <td className={`${tdClass} font-semibold text-[#17245e]`}>{r.name}</td>
                      <td className={tdClass}>{labelOf(reportKinds, r.reportType)}</td>
                      <td className={tdClass}>{range(r.classFrom, r.classTo)}</td>
                      <td className={tdClass}><StatusPill status={r.active ? "Active" : "Inactive"} /></td>
                      <td className={tdClass}><RowActions name={r.name} onEdit={() => editReport(r)} onDelete={() => void removeReport(r)} /></td>
                    </tr>
                  ))}
                </DataTable>
                <TableFooter shown={visibleReports.length} total={reports.length} />
              </div>
            </Panel>

            <Panel>
              <PanelTitle title="Report Layout & Content" />
              <div className="space-y-3 px-4 pb-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Report Name" required><input className={controlClass} value={reportForm.name} onChange={(e) => setRF("name", e.target.value)} placeholder="e.g. Term Report Card" /></Field>
                  <Field label="Report Type" required>
                    <select className={controlClass} value={reportForm.reportType} onChange={(e) => setRF("reportType", e.target.value as ReportKind)}>{reportKinds.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                  </Field>
                  <Field label="Applicable Classes"><ClassRange from={reportForm.classFrom} to={reportForm.classTo} onChange={(f, t) => setReportForm((x) => ({ ...x, classFrom: f, classTo: t }))} /></Field>
                  <Field label="Status"><div className="flex h-8 items-center"><Toggle checked={reportForm.active} onChange={(v) => setRF("active", v)} /></div></Field>
                </div>
                <Field label="Include Sections">
                  <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
                    {sectionOptions.map(([k, l]) => <Check key={k} label={l} checked={reportForm.sections.includes(k)} onChange={() => setRF("sections", toggleIn(reportForm.sections, k))} />)}
                  </div>
                </Field>
                {showPreview && (
                  <div className="rounded-lg border border-dashed border-blue-300 bg-white p-3 text-[10px] text-[#33477c]">
                    <div className="mb-1 text-[11px] font-bold text-[#17245e]">{reportForm.name || "Untitled report"} · {labelOf(reportKinds, reportForm.reportType)}</div>
                    {reportForm.sections.length === 0 ? "No sections selected." : <ol className="list-inside list-decimal space-y-0.5">{sectionOptions.filter(([k]) => reportForm.sections.includes(k)).map(([k, l]) => <li key={k}>{l}</li>)}</ol>}
                  </div>
                )}
                <div className="flex justify-between gap-2.5">
                  <OutlineButton type="button" onClick={() => setShowPreview((v) => !v)}>{showPreview ? "Hide Preview" : "Preview"}</OutlineButton>
                  <div className="flex gap-2.5">
                    <OutlineButton type="button" onClick={() => { const r = reports.find((x) => x.id === reportId); if (r) editReport(r); else newReport(); }} disabled={saving}>Cancel</OutlineButton>
                    <PrimaryButton type="button" onClick={() => void saveReport()} disabled={saving || noYear} className="px-6">{saving ? "Saving..." : "Save"}</PrimaryButton>
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        )}

        {/* ============================ RESULT TEMPLATES ============================ */}
        {tab === "results" && (
          <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-2">
            <Panel>
              <PanelTitle title="Result Templates" right={<PrimaryButton type="button" onClick={newResult} disabled={noYear}><Plus size={14} /> Add Template</PrimaryButton>} />
              <div className="space-y-3 px-4 pb-4">
                <SearchBox value={resultQuery} onChange={setResultQuery} placeholder="Search templates..." />
                <DataTable heads={["#", "Template Name", "Calculation Type", "Classes", "Status", "Actions"]} min={520}>
                  {resultsLoading && <EmptyRow cols={6} text="Loading result templates..." />}
                  {!resultsLoading && visibleResults.length === 0 && <EmptyRow cols={6} text={resultsList.length === 0 ? "No result templates yet." : "No templates match your search."} />}
                  {!resultsLoading && visibleResults.map((r, i) => (
                    <tr key={r.id} className={`hover:bg-blue-50/50 ${resultId === r.id ? "bg-blue-50/60" : ""}`}>
                      <td className={tdClass}>{i + 1}</td>
                      <td className={`${tdClass} font-semibold text-[#17245e]`}>{r.name}</td>
                      <td className={tdClass}>{labelOf(calcTypes, r.calculationType).replace(" (Based on Exam Types)", "")}</td>
                      <td className={tdClass}>{range(r.classFrom, r.classTo)}</td>
                      <td className={tdClass}><StatusPill status={r.active ? "Active" : "Inactive"} /></td>
                      <td className={tdClass}><RowActions name={r.name} onEdit={() => editResult(r)} onDelete={() => void removeResult(r)} /></td>
                    </tr>
                  ))}
                </DataTable>
                <TableFooter shown={visibleResults.length} total={resultsList.length} />
              </div>
            </Panel>

            <Panel>
              <PanelTitle title="Template Details" />
              <div className="space-y-3 px-4 pb-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Template Name" required><input className={controlClass} value={resultForm.name} onChange={(e) => setResF("name", e.target.value)} placeholder="e.g. Term Result Template" /></Field>
                  <Field label="Calculation Type" required>
                    <select className={controlClass} value={resultForm.calculationType} onChange={(e) => setResF("calculationType", e.target.value as ResultTemplateBody["calculationType"])}>{calcTypes.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                  </Field>
                  <Field label="Applicable Classes"><ClassRange from={resultForm.classFrom} to={resultForm.classTo} onChange={(f, t) => setResultForm((x) => ({ ...x, classFrom: f, classTo: t }))} /></Field>
                  <Field label="Status"><div className="flex h-8 items-center"><Toggle checked={resultForm.active} onChange={(v) => setResF("active", v)} /></div></Field>
                </div>
                <Field label="Include Exam Types">
                  {examTypes.length === 0 ? <p className="text-[10px] text-slate-500">Add exam types first (Exam Types tab).</p> : (
                    <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
                      {examTypes.map((t) => <Check key={t.id} label={`${t.name} (${t.weightage}%)`} checked={resultForm.examTypeIds.includes(t.id)} onChange={() => setResF("examTypeIds", toggleIn(resultForm.examTypeIds, t.id))} />)}
                    </div>
                  )}
                </Field>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Rounding Rule"><select className={controlClass} value={resultForm.roundingRule} onChange={(e) => setResF("roundingRule", e.target.value)}>{roundings.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
                  <Field label="Display Format"><select className={controlClass} value={resultForm.displayFormat} onChange={(e) => setResF("displayFormat", e.target.value)}>{displays.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
                </div>
                <Field label="Formula Preview">
                  <div className="rounded-md border border-[#d3dff0] bg-slate-50 px-2.5 py-2 text-[10px] text-[#33477c]">
                    {formula}
                    {resultForm.calculationType === "WEIGHTED" && selectedTypes.length > 0 && selectedWeight !== 100 && <div className="mt-1 font-semibold text-orange-700">Selected weightage adds up to {selectedWeight}%, not 100%.</div>}
                  </div>
                </Field>
                <div className="flex justify-end gap-2.5">
                  <OutlineButton type="button" onClick={() => { const r = resultsList.find((x) => x.id === resultId); if (r) editResult(r); else newResult(); }} disabled={saving}>Cancel</OutlineButton>
                  <PrimaryButton type="button" onClick={() => void saveResult()} disabled={saving || noYear} className="px-6">{saving ? "Saving..." : "Save"}</PrimaryButton>
                </div>
              </div>
            </Panel>
          </div>
        )}

        {/* ============================ ADDITIONAL SETTINGS ============================ */}
        {tab === "additional" && (
          <>
            {inst.institutionId === null && <Notice tone="info">{inst.isSuper ? "Create an institution first, then choose it above." : "Your account isn't linked to an institution."}</Notice>}
            {extraLoading && <Notice tone="info">Loading settings...</Notice>}
            {extra && (
              <>
                <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-3">
                  <Panel>
                    <PanelTitle title="General Settings" />
                    <div className="space-y-3 px-4 pb-4">
                      <Field label="Result Publication Method">
                        <select className={controlClass} value={extra.publicationMethod} onChange={(e) => setX("publicationMethod", e.target.value as ExamSettings["publicationMethod"])}>{publications.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                      </Field>
                      <Field label="Default Grading System">
                        <select className={controlClass} value={extra.defaultGradingId ?? ""} onChange={(e) => setX("defaultGradingId", e.target.value ? Number(e.target.value) : null)}>
                          <option value="">Not set</option>{systems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </Field>
                      <Field label="Maximum Marks per Subject"><input type="number" min={1} max={1000} className={controlClass} value={extra.maxMarksPerSubject} onChange={(e) => setX("maxMarksPerSubject", Number(e.target.value))} /></Field>
                      <SwitchRow label="Show subject-wise rank" checked={extra.showSubjectRank} onChange={(v) => setX("showSubjectRank", v)} />
                      <SwitchRow label="Allow re-evaluation" checked={extra.allowReevaluation} onChange={(v) => setX("allowReevaluation", v)} />
                      <SwitchRow label="Consider attendance in result" checked={extra.considerAttendance} onChange={(v) => setX("considerAttendance", v)} />
                    </div>
                  </Panel>

                  <Panel>
                    <PanelTitle title="Exam Workflow Settings" />
                    <div className="space-y-2 px-4 pb-4">
                      <SwitchRow label="Teachers enter marks" checked={extra.teachersEnterMarks} onChange={(v) => setX("teachersEnterMarks", v)} />
                      <SwitchRow label="Review and approval" checked={extra.reviewApproval} onChange={(v) => setX("reviewApproval", v)} />
                      <SwitchRow label="Allow result editing (before publish)" checked={extra.editBeforePublish} onChange={(v) => setX("editBeforePublish", v)} />
                      <SwitchRow label="Notify on result publish" checked={extra.notifyOnPublish} onChange={(v) => setX("notifyOnPublish", v)} />
                      <SwitchRow label="Re-evaluation process" checked={extra.reevaluationProcess} onChange={(v) => setX("reevaluationProcess", v)} />
                      <Field label="Result Approval Levels" className="pt-1">
                        <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
                          {levelOptions.map(([k, l]) => <Check key={k} label={l} checked={extra.approvalLevels.includes(k)} onChange={() => setX("approvalLevels", toggleIn(extra.approvalLevels, k))} />)}
                        </div>
                      </Field>
                      <Field label="Remarks" optional><textarea className={textareaClass} maxLength={500} value={extra.workflowRemarks ?? ""} onChange={(e) => setX("workflowRemarks", e.target.value)} placeholder="Additional instructions for the exam workflow" /></Field>
                    </div>
                  </Panel>

                  <Panel>
                    <PanelTitle title="Result & Report Options" />
                    <div className="space-y-2 px-4 pb-4">
                      <SwitchRow label="Show grade and marks in report" checked={extra.showGradeAndMarks} onChange={(v) => setX("showGradeAndMarks", v)} />
                      <SwitchRow label="Allow parent access to results" checked={extra.parentAccess} onChange={(v) => setX("parentAccess", v)} />
                      <SwitchRow label="Show class teacher comments" checked={extra.showTeacherComments} onChange={(v) => setX("showTeacherComments", v)} />
                      <SwitchRow label="Generate PDF automatically" checked={extra.autoGeneratePdf} onChange={(v) => setX("autoGeneratePdf", v)} />
                      <SwitchRow label="Show attendance summary" checked={extra.showAttendanceSummary} onChange={(v) => setX("showAttendanceSummary", v)} />
                      <SwitchRow label="Include school logo" checked={extra.includeSchoolLogo} onChange={(v) => setX("includeSchoolLogo", v)} />
                      <Field label="PDF Template" className="pt-1">
                        <select className={controlClass} value={extra.pdfTemplate} onChange={(e) => setX("pdfTemplate", e.target.value as ExamSettings["pdfTemplate"])}>{pdfTemplates.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                      </Field>
                    </div>
                  </Panel>
                </div>
                <div className="flex justify-end gap-2.5">
                  <OutlineButton type="button" onClick={() => void loadExtra()} disabled={saving}>Cancel</OutlineButton>
                  <PrimaryButton type="button" onClick={() => void saveExtra()} disabled={saving} className="px-6">{saving ? "Saving..." : "Save"}</PrimaryButton>
                </div>
              </>
            )}
          </>
        )}

        <footer className="pb-1 pt-0.5 text-center text-[10px] text-slate-400">© {new Date().getFullYear()} Centram Classzy · School Management Platform</footer>
      </div>
    </AdminLayout>
  );
}
