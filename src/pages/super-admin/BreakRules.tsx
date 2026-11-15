import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Coffee, Plus } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../services/api";
import type { BreakRuleBody, BreakRuleRow, BreakTypeBody, BreakTypeRow, Weekday } from "../../services/api";
import {
  AcademicHeader, Breadcrumb, DataTable, DetailCard, EmptyRow, Field, Notice, Panel, PanelTitle, PrimaryButton, RowActions,
  SearchBox, TableFooter, Toggle, controlClass, tdClass, textareaClass,
} from "./AcademicShared";
import { ContextBar, errText, useActiveInstitution } from "./SettingsShared";
import { TimetableNav, fmtTime, weekdays } from "./TimetableShared";

const tabs = [
  { key: "rules", label: "Break Rules" },
  { key: "types", label: "Break Types" },
] as const;
type TabKey = (typeof tabs)[number]["key"];

const applicableOptions: [string, string][] = [
  ["TEACHING_PERIODS", "Teaching periods"], ["EXAMS", "Exams"], ["EVENTS", "Events"], ["TRANSPORT", "Transport"], ["SPECIAL_DAYS", "Special days"], ["OTHER", "Other"],
];
const applicableLabel = (k: string) => applicableOptions.find(([x]) => x === k)?.[1] ?? k;
const classLabel = (r: BreakRuleRow) => (r.appliesTo === "ALL_CLASSES" ? "All classes" : `Grade ${r.classFrom ?? "?"} - ${r.classTo ?? "?"}`);
const dayLabel = (r: BreakRuleRow) => (r.frequency === "DAILY" ? "Daily" : r.days.map((d) => weekdays.find((w) => w.key === d)?.short ?? d).join(", ") || "—");

export default function BreakRules() {
  const inst = useActiveInstitution();
  const institutionId = inst.institutionId;
  const [params, setParams] = useSearchParams();
  const tab = (tabs.find((t) => t.key === params.get("tab"))?.key ?? "rules") as TabKey;

  const [types, setTypes] = useState<BreakTypeRow[]>([]);
  const [rules, setRules] = useState<BreakRuleRow[]>([]);
  const [timeFormat, setTimeFormat] = useState<"H12" | "H24">("H12");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const goTab = (k: TabKey) => { setParams({ tab: k }); setError(""); setNotice(""); };

  const load = useCallback(async () => {
    if (institutionId === null) { setTypes([]); setRules([]); setLoading(false); return; }
    setLoading(true);
    try {
      const g = await api.timetable.settings();           // makes sure defaults and break types exist
      setTimeFormat(g.timeFormat);
      const [t, r] = await Promise.all([api.timetable.breakTypes.list(), api.timetable.breakRules.list()]);
      setTypes(t); setRules(r); setError("");
    } catch (e) { setError(errText(e)); } finally { setLoading(false); }
  }, [institutionId]);
  useEffect(() => { void load(); }, [load]);

  /* ================= break rules ================= */
  const blankRule = useCallback((): BreakRuleBody => ({
    name: "", breakTypeId: types[0]?.id ?? null, appliesTo: "ALL_CLASSES", classFrom: null, classTo: null,
    startTime: "10:30", durationMinutes: types[0]?.defaultDuration ?? 15, frequency: "DAILY", days: [], active: true, description: null,
  }), [types]);
  const [ruleForm, setRuleForm] = useState<BreakRuleBody>(() => blankRule());
  const [ruleId, setRuleId] = useState<number | null>(null);
  const [rQuery, setRQuery] = useState("");
  const [rStatus, setRStatus] = useState("All");
  const setRF = <K extends keyof BreakRuleBody>(k: K, v: BreakRuleBody[K]) => { setRuleForm((f) => ({ ...f, [k]: v })); setError(""); setNotice(""); };

  // pick the first type as soon as types arrive and nothing is being edited
  useEffect(() => { if (ruleId === null && ruleForm.breakTypeId === null && types.length) setRuleForm(blankRule()); }, [types, ruleId, ruleForm.breakTypeId, blankRule]);

  const newRule = () => { setRuleId(null); setRuleForm(blankRule()); setError(""); };
  const editRule = (r: BreakRuleRow) => {
    setRuleId(r.id);
    setRuleForm({ name: r.name, breakTypeId: r.breakTypeId, appliesTo: r.appliesTo, classFrom: r.classFrom, classTo: r.classTo, startTime: r.startTime, durationMinutes: r.durationMinutes, frequency: r.frequency, days: r.days, active: r.active, description: r.description });
    setError("");
  };
  async function saveRule() {
    if (!ruleForm.name.trim() || ruleForm.breakTypeId === null || !ruleForm.startTime) { setError("Please complete Rule Name, Break Type and Start Time."); return; }
    if (ruleForm.durationMinutes < 1) { setError("Duration must be at least 1 minute."); return; }
    if (ruleForm.appliesTo === "GRADE_RANGE" && (ruleForm.classFrom === null || ruleForm.classTo === null || ruleForm.classFrom > ruleForm.classTo)) { setError("Enter a valid class range (from must not exceed to)."); return; }
    if (ruleForm.frequency === "SELECTED_DAYS" && ruleForm.days.length === 0) { setError("Select at least one day."); return; }
    setSaving(true);
    try {
      const body: BreakRuleBody = {
        ...ruleForm, name: ruleForm.name.trim(), description: ruleForm.description?.trim() || null,
        classFrom: ruleForm.appliesTo === "GRADE_RANGE" ? ruleForm.classFrom : null, classTo: ruleForm.appliesTo === "GRADE_RANGE" ? ruleForm.classTo : null,
        days: ruleForm.frequency === "SELECTED_DAYS" ? ruleForm.days : [],
      };
      const saved = ruleId === null ? await api.timetable.breakRules.create(body) : await api.timetable.breakRules.update(ruleId, body);
      setRules(await api.timetable.breakRules.list()); setNotice(`${saved.name} saved.`); setError("");
      if (ruleId === null) newRule(); else editRule(saved);
    } catch (e) { setError(errText(e)); } finally { setSaving(false); }
  }
  async function toggleRule(r: BreakRuleRow) {
    try {
      await api.timetable.breakRules.update(r.id, { name: r.name, breakTypeId: r.breakTypeId, appliesTo: r.appliesTo, classFrom: r.classFrom, classTo: r.classTo, startTime: r.startTime, durationMinutes: r.durationMinutes, frequency: r.frequency, days: r.days, active: !r.active, description: r.description });
      setRules(await api.timetable.breakRules.list());
    } catch (e) { setError(errText(e)); }
  }
  async function removeRule(r: BreakRuleRow) {
    if (!window.confirm(`Delete break rule ${r.name}?`)) return;
    try { await api.timetable.breakRules.remove(r.id); setRules(await api.timetable.breakRules.list()); setNotice(`${r.name} deleted.`); if (ruleId === r.id) newRule(); } catch (e) { setError(errText(e)); }
  }
  const visibleRules = useMemo(() => rules.filter((r) =>
    r.name.toLowerCase().includes(rQuery.toLowerCase()) && (rStatus === "All" || (rStatus === "Active" ? r.active : !r.active))), [rules, rQuery, rStatus]);

  /* ================= break types ================= */
  const blankType = (): BreakTypeBody => ({ name: "", code: "", defaultDuration: 15, color: "#2563eb", applicableFor: ["TEACHING_PERIODS"], active: true, description: null });
  const [typeForm, setTypeForm] = useState<BreakTypeBody>(blankType);
  const [typeId, setTypeId] = useState<number | null>(null);
  const [tQuery, setTQuery] = useState("");
  const setTF = <K extends keyof BreakTypeBody>(k: K, v: BreakTypeBody[K]) => { setTypeForm((f) => ({ ...f, [k]: v })); setError(""); setNotice(""); };
  const newType = () => { setTypeId(null); setTypeForm(blankType()); setError(""); };
  const editType = (t: BreakTypeRow) => { setTypeId(t.id); setTypeForm({ name: t.name, code: t.code, defaultDuration: t.defaultDuration, color: t.color, applicableFor: t.applicableFor, active: t.active, description: t.description }); setError(""); };
  async function saveType() {
    if (!typeForm.name.trim() || !typeForm.code.trim()) { setError("Please complete Break Type Name and Code."); return; }
    if (typeForm.defaultDuration < 1) { setError("Default duration must be at least 1 minute."); return; }
    if (typeForm.applicableFor.length === 0) { setError("Choose at least one 'Applicable for' option."); return; }
    setSaving(true);
    try {
      const body = { ...typeForm, name: typeForm.name.trim(), code: typeForm.code.trim().toUpperCase(), description: typeForm.description?.trim() || null };
      const saved = typeId === null ? await api.timetable.breakTypes.create(body) : await api.timetable.breakTypes.update(typeId, body);
      setTypes(await api.timetable.breakTypes.list()); setRules(await api.timetable.breakRules.list()); setNotice(`${saved.name} saved.`); setError("");
      if (typeId === null) newType(); else editType(saved);
    } catch (e) { setError(errText(e)); } finally { setSaving(false); }
  }
  async function toggleType(t: BreakTypeRow) {
    try { await api.timetable.breakTypes.update(t.id, { name: t.name, code: t.code, defaultDuration: t.defaultDuration, color: t.color, applicableFor: t.applicableFor, active: !t.active, description: t.description }); setTypes(await api.timetable.breakTypes.list()); }
    catch (e) { setError(errText(e)); }
  }
  async function removeType(t: BreakTypeRow) {
    if (!window.confirm(`Delete break type ${t.name}?`)) return;
    try { await api.timetable.breakTypes.remove(t.id); setTypes(await api.timetable.breakTypes.list()); setNotice(`${t.name} deleted.`); if (typeId === t.id) newType(); } catch (e) { setError(errText(e)); }
  }
  const visibleTypes = useMemo(() => types.filter((t) => t.name.toLowerCase().includes(tQuery.toLowerCase()) || t.code.toLowerCase().includes(tQuery.toLowerCase())), [types, tQuery]);
  const activeTypes = types.filter((t) => t.active || t.id === ruleForm.breakTypeId);

  const noInstitution = institutionId === null;

  return (
    <AdminLayout activeItem="Institutions">
      <div className="space-y-3">
        <AcademicHeader step={tab === "rules" ? 1 : 2} title="Break Rules" subtitle="Configure break and lunch rules for the timetable."
          right={<ContextBar inst={inst} />} />
        <Breadcrumb trail={["Institutions", "Institution Settings", "Timetable Settings", "Break Rules"]} />
        <TimetableNav active="breaks" />

        <div className="grid max-w-md grid-cols-2 gap-2">
          {tabs.map(({ key, label }) => (
            <button key={key} type="button" onClick={() => goTab(key)} aria-current={tab === key ? "page" : undefined}
              className={`rounded-md border px-3 py-2 text-center text-[10px] font-semibold transition ${tab === key ? "border-blue-500 bg-[#dcecff] text-blue-800 shadow-[inset_0_-2px_0_#1478f8]" : "border-[#cfe0f5] bg-white text-[#34467a] hover:border-blue-300 hover:bg-blue-50"}`}>{label}</button>
          ))}
        </div>

        {error && <Notice tone="error"><span className="font-bold">Please review:</span> {error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}
        {noInstitution && <Notice tone="info">{inst.isSuper ? "Create an institution first, then choose it above." : "Your account isn't linked to an institution."}</Notice>}

        {/* ============================ BREAK RULES ============================ */}
        {tab === "rules" && !noInstitution && (
          <>
            <Panel>
              <PanelTitle icon={<Coffee size={20} strokeWidth={2.4} />} title="Break Rules" right={<PrimaryButton type="button" onClick={newRule} disabled={types.length === 0}><Plus size={14} /> Add Break Rule</PrimaryButton>} />
              <div className="px-4 pb-4">
                <div className="mb-3 flex flex-wrap items-end gap-3">
                  <SearchBox value={rQuery} onChange={setRQuery} placeholder="Search break rules..." />
                  <Field label="Status" className="w-[120px]">
                    <select className={controlClass} value={rStatus} onChange={(e) => setRStatus(e.target.value)}><option>All</option><option>Active</option><option>Inactive</option></select>
                  </Field>
                </div>
                <DataTable heads={["#", "Rule Name", "Break Type", "Applies To", "Start", "Duration", "Days", "Status", "Actions"]} min={860}>
                  {loading && <EmptyRow cols={9} text="Loading break rules..." />}
                  {!loading && visibleRules.length === 0 && <EmptyRow cols={9} text={rules.length === 0 ? "No break rules yet." : "No break rules match your filters."} />}
                  {!loading && visibleRules.map((r, i) => (
                    <tr key={r.id} className={`hover:bg-blue-50/50 ${ruleId === r.id ? "bg-blue-50/60" : ""}`}>
                      <td className={tdClass}>{i + 1}</td>
                      <td className={`${tdClass} font-semibold text-[#17245e]`}>{r.name}</td>
                      <td className={tdClass}>{r.breakTypeName ?? "—"}</td>
                      <td className={tdClass}>{classLabel(r)}</td>
                      <td className={tdClass}>{fmtTime(r.startTime, timeFormat)}</td>
                      <td className={tdClass}>{r.durationMinutes} mins</td>
                      <td className={tdClass}>{dayLabel(r)}</td>
                      <td className={tdClass}><Toggle checked={r.active} onChange={() => void toggleRule(r)} label="" /></td>
                      <td className={tdClass}><RowActions name={r.name} onEdit={() => editRule(r)} onDelete={() => void removeRule(r)} /></td>
                    </tr>
                  ))}
                </DataTable>
                <TableFooter shown={visibleRules.length} total={rules.length} />
              </div>
            </Panel>

            <DetailCard title={ruleId === null ? "New Break Rule" : "Break Rule Details"} saving={saving}
              onCancel={() => { const r = rules.find((x) => x.id === ruleId); if (r) editRule(r); else newRule(); }} onSave={() => void saveRule()}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Rule Name" required><input className={controlClass} value={ruleForm.name} onChange={(e) => setRF("name", e.target.value)} placeholder="Short Break - Morning" /></Field>
                <Field label="Break Type" required>
                  <select className={controlClass} value={ruleForm.breakTypeId ?? ""} onChange={(e) => {
                    const t = types.find((x) => x.id === Number(e.target.value));
                    setRuleForm((f) => ({ ...f, breakTypeId: t ? t.id : null, durationMinutes: ruleId === null && t ? t.defaultDuration : f.durationMinutes })); setError("");
                  }}>
                    {activeTypes.length === 0 && <option value="">No break types</option>}
                    {activeTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </Field>
                <Field label="Applies To" required>
                  <select className={controlClass} value={ruleForm.appliesTo} onChange={(e) => setRF("appliesTo", e.target.value as BreakRuleBody["appliesTo"])}><option value="ALL_CLASSES">All classes</option><option value="GRADE_RANGE">Grade range</option></select>
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Class From"><input type="number" min={1} max={20} className={controlClass} disabled={ruleForm.appliesTo !== "GRADE_RANGE"} value={ruleForm.classFrom ?? ""} onChange={(e) => setRF("classFrom", e.target.value ? Number(e.target.value) : null)} /></Field>
                  <Field label="Class To"><input type="number" min={1} max={20} className={controlClass} disabled={ruleForm.appliesTo !== "GRADE_RANGE"} value={ruleForm.classTo ?? ""} onChange={(e) => setRF("classTo", e.target.value ? Number(e.target.value) : null)} /></Field>
                </div>
                <Field label="Start Time" required><input type="time" className={controlClass} value={ruleForm.startTime} onChange={(e) => setRF("startTime", e.target.value)} /></Field>
                <Field label="Duration (minutes)" required><input type="number" min={1} max={240} className={controlClass} value={ruleForm.durationMinutes} onChange={(e) => setRF("durationMinutes", Number(e.target.value))} /></Field>
                <Field label="Frequency" required>
                  <select className={controlClass} value={ruleForm.frequency} onChange={(e) => setRF("frequency", e.target.value as BreakRuleBody["frequency"])}><option value="DAILY">Daily</option><option value="SELECTED_DAYS">Selected days</option></select>
                </Field>
                <Field label="Description" optional><input className={controlClass} value={ruleForm.description ?? ""} onChange={(e) => setRF("description", e.target.value)} /></Field>
              </div>
              {ruleForm.frequency === "SELECTED_DAYS" && (
                <div className="mt-3 flex flex-wrap gap-4">
                  {weekdays.map((d) => (
                    <label key={d.key} className="flex items-center gap-1.5 text-[11px] text-[#17265f]">
                      <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={ruleForm.days.includes(d.key as Weekday)}
                        onChange={() => setRF("days", ruleForm.days.includes(d.key as Weekday) ? ruleForm.days.filter((x) => x !== d.key) : [...ruleForm.days, d.key as Weekday])} /> {d.short}
                    </label>
                  ))}
                </div>
              )}
              <div className="mt-3"><Toggle checked={ruleForm.active} onChange={(v) => setRF("active", v)} /></div>
            </DetailCard>
          </>
        )}

        {/* ============================ BREAK TYPES ============================ */}
        {tab === "types" && !noInstitution && (
          <>
            <Panel>
              <PanelTitle icon={<Coffee size={20} strokeWidth={2.4} />} title="Break Types" right={<PrimaryButton type="button" onClick={newType}><Plus size={14} /> Add Break Type</PrimaryButton>} />
              <div className="px-4 pb-4">
                <div className="mb-3"><SearchBox value={tQuery} onChange={setTQuery} placeholder="Search break types..." /></div>
                <DataTable heads={["#", "Break Type", "Code", "Default Duration", "Applicable For", "Status", "Actions"]} min={760}>
                  {loading && <EmptyRow cols={7} text="Loading break types..." />}
                  {!loading && visibleTypes.length === 0 && <EmptyRow cols={7} text={types.length === 0 ? "No break types yet." : "No break types match your search."} />}
                  {!loading && visibleTypes.map((t, i) => (
                    <tr key={t.id} className={`hover:bg-blue-50/50 ${typeId === t.id ? "bg-blue-50/60" : ""}`}>
                      <td className={tdClass}>{i + 1}</td>
                      <td className={`${tdClass} font-semibold text-[#17245e]`}><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: t.color }} />{t.name}</td>
                      <td className={tdClass}>{t.code}</td>
                      <td className={tdClass}>{t.defaultDuration} mins</td>
                      <td className={tdClass}>{t.applicableFor.map(applicableLabel).join(", ")}</td>
                      <td className={tdClass}><Toggle checked={t.active} onChange={() => void toggleType(t)} label="" /></td>
                      <td className={tdClass}><RowActions name={t.name} onEdit={() => editType(t)} onDelete={() => void removeType(t)} /></td>
                    </tr>
                  ))}
                </DataTable>
                <TableFooter shown={visibleTypes.length} total={types.length} />
              </div>
            </Panel>

            <DetailCard title={typeId === null ? "New Break Type" : "Break Type Details"} saving={saving}
              onCancel={() => { const t = types.find((x) => x.id === typeId); if (t) editType(t); else newType(); }} onSave={() => void saveType()}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Break Type Name" required><input className={controlClass} value={typeForm.name} onChange={(e) => setTF("name", e.target.value)} /></Field>
                <Field label="Code" required><input className={controlClass} maxLength={10} value={typeForm.code} onChange={(e) => setTF("code", e.target.value.toUpperCase())} /></Field>
                <Field label="Default Duration (minutes)" required><input type="number" min={1} max={240} className={controlClass} value={typeForm.defaultDuration} onChange={(e) => setTF("defaultDuration", Number(e.target.value))} /></Field>
                <Field label="Colour">
                  <div className="flex items-center gap-2">
                    <input type="color" aria-label="Break type colour" className="h-8 w-10 cursor-pointer rounded border border-[#cfe0f5] bg-white p-0.5" value={typeForm.color} onChange={(e) => setTF("color", e.target.value)} />
                    <input className={controlClass} value={typeForm.color} maxLength={7} onChange={(e) => setTF("color", e.target.value)} />
                  </div>
                </Field>
              </div>
              <div className="mt-3">
                <div className="mb-1.5 text-[11px] font-bold text-[#17245e]">Applicable For</div>
                <div className="flex flex-wrap gap-4">
                  {applicableOptions.map(([k, l]) => (
                    <label key={k} className="flex items-center gap-1.5 text-[11px] text-[#17265f]">
                      <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={typeForm.applicableFor.includes(k)}
                        onChange={() => setTF("applicableFor", typeForm.applicableFor.includes(k) ? typeForm.applicableFor.filter((x) => x !== k) : [...typeForm.applicableFor, k])} /> {l}
                    </label>
                  ))}
                </div>
              </div>
              <div className="mt-3"><Field label="Description" optional><textarea className={textareaClass} maxLength={300} value={typeForm.description ?? ""} onChange={(e) => setTF("description", e.target.value)} /></Field></div>
              <div className="mt-3"><Toggle checked={typeForm.active} onChange={(v) => setTF("active", v)} /></div>
            </DetailCard>
          </>
        )}

        <footer className="pb-1 pt-0.5 text-center text-[10px] text-slate-400">© {new Date().getFullYear()} Centram Classzy · School Management Platform</footer>
      </div>
    </AdminLayout>
  );
}
