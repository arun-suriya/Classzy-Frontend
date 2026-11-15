import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bell, ClipboardCheck, Plus, Settings2, ShieldCheck, Tags } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../services/api";
import type {
  AttendanceCategory, AttendanceCountsAs, AttendanceEvent, AttendanceEventBody, AttendanceRule, AttendanceRuleBody,
  AttendanceSettings as Settings, AttendanceTemplate, AttendanceTemplateBody, AttendanceType, AttendanceTypeBody, Weekday,
} from "../../services/api";
import {
  AcademicHeader, Breadcrumb, DataTable, DetailCard, EmptyRow, Field, Notice, Panel, PanelTitle, PrimaryButton,
  RowActions, StatusPill, TableFooter, Toggle, controlClass, tdClass, textareaClass,
} from "./AcademicShared";
import { ContextBar, errText, useActiveInstitution } from "./SettingsShared";

/* ------------------------------------------------------------------ labels */
const tabs = [
  { key: "general", label: "General", icon: Settings2 },
  { key: "types", label: "Attendance Types", icon: Tags },
  { key: "rules", label: "Rules & Policies", icon: ShieldCheck },
  { key: "notifications", label: "Notifications", icon: Bell },
] as const;
type TabKey = (typeof tabs)[number]["key"];

const days: { key: Weekday; label: string }[] = [
  { key: "MONDAY", label: "Mon" }, { key: "TUESDAY", label: "Tue" }, { key: "WEDNESDAY", label: "Wed" }, { key: "THURSDAY", label: "Thu" },
  { key: "FRIDAY", label: "Fri" }, { key: "SATURDAY", label: "Sat" }, { key: "SUNDAY", label: "Sun" },
];
const modes = [["DAILY", "Daily"], ["PERIOD_WISE", "Period-wise"], ["BOTH", "Daily + Period-wise"]] as const;
const methods = [["MANUAL", "Manual"], ["BIOMETRIC", "Biometric"], ["RFID", "RFID Card"], ["MOBILE_APP", "Mobile App"]] as const;
const categories: [AttendanceCategory, string][] = [["REGULAR", "Regular"], ["LEAVE", "Leave"], ["NON_WORKING", "Non-working"], ["SPECIAL", "Special"]];
const countsAs: [AttendanceCountsAs, string][] = [
  ["PRESENT", "Present"], ["ABSENT", "Absent"], ["PRESENT_LATE", "Present (Late)"], ["PRESENT_HALF", "Present (Half Day)"],
  ["LEAVE", "Leave"], ["NON_WORKING", "Non-working Day"], ["EXCUSED", "Excused"],
];
const labelOf = (list: readonly (readonly [string, string])[], v: string) => list.find(([k]) => k === v)?.[1] ?? v;
const conditionFields: [string, string][] = [["LATE_MINUTES", "Minutes late"], ["WORKED_MINUTES", "Minutes present"], ["ABSENT_DAYS_IN_ROW", "Consecutive absent days"], ["ATTENDANCE_PCT", "Attendance %"]];
const operators: [string, string, string][] = [["GREATER_THAN", "is greater than", ">"], ["GREATER_OR_EQUAL", "is at least", "≥"], ["LESS_THAN", "is less than", "<"], ["LESS_OR_EQUAL", "is at most", "≤"], ["EQUALS", "equals", "="]];
const appliesTo: [string, string][] = [["ALL_STUDENTS", "All Students"], ["ALL_STAFF", "All Staff"], ["ALL", "Everyone"]];
const triggers: [string, string][] = [
  ["ABSENT_AT_DAY_END", "Student absent at day end"], ["LATE_CHECK_IN", "Late check-in"], ["HALF_DAY", "Marked half day"],
  ["DAY_END_SUMMARY", "Day-end summary"], ["LOW_ATTENDANCE", "Attendance below minimum"],
];
const recipientOptions: [string, string][] = [["PARENT", "Parent"], ["CLASS_TEACHER", "Class Teacher"], ["PRINCIPAL", "Principal"], ["ADMIN", "Admin"]];
const channelOptions: [string, string][] = [["EMAIL", "Email"], ["SMS", "SMS"], ["APP", "App"]];
const placeholders = ["{StudentName}", "{ClassName}", "{Date}", "{InstitutionName}", "{AttendancePercent}"];

const blankType: AttendanceTypeBody = { name: "", code: "", category: "REGULAR", countsAs: "PRESENT", color: "#28A745", defaultType: false, active: true, description: "" };
const blankRule: AttendanceRuleBody = {
  name: "", description: "", appliesTo: "ALL_STUDENTS", priority: 1, active: true, conditionField: "LATE_MINUTES",
  conditionOperator: "GREATER_THAN", conditionValue: "15", actionTypeCode: "", notifyParent: false, includeInReports: true,
};
const blankEvent: AttendanceEventBody = { name: "", triggerCode: "ABSENT_AT_DAY_END", recipients: ["PARENT"], channels: ["APP"], templateId: null, customMessage: "", active: true };
const blankTemplate: AttendanceTemplateBody = { name: "", body: "", active: true };

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-[#17265f]">
      <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );
}
function SwitchRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#e1ecfa] bg-white px-3 py-2">
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-[#17245e]">{label}</div>
        {hint && <div className="text-[9px] text-slate-500">{hint}</div>}
      </div>
      <Toggle checked={checked} onChange={onChange} label="" />
    </div>
  );
}
function toggleIn(list: string[], v: string) { return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]; }

/* ------------------------------------------------------------------ page */
export default function AttendanceSettings() {
  const inst = useActiveInstitution();
  const institutionId = inst.institutionId;
  const [params, setParams] = useSearchParams();
  const tab = (tabs.find((t) => t.key === params.get("tab"))?.key ?? "general") as TabKey;

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState<Settings | null>(null);
  const [types, setTypes] = useState<AttendanceType[]>([]);
  const [rules, setRules] = useState<AttendanceRule[]>([]);
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [templates, setTemplates] = useState<AttendanceTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    if (institutionId === null) { setSettings(null); setLoading(false); return; }
    setLoading(true);
    try {
      const s = await api.attendance.settings();            // first call also creates the defaults
      const [t, r, tp, ev] = await Promise.all([api.attendance.types.list(), api.attendance.rules.list(), api.attendance.templates.list(), api.attendance.events.list()]);
      setSettings(s); setTypes(t); setRules(r); setTemplates(tp); setEvents(ev);
      setError("");
    } catch (e) { setError(errText(e)); } finally { setLoading(false); }
  }, [institutionId]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  function goTab(k: TabKey) { setParams({ tab: k }); setError(""); setNotice(""); }
  const upd = <K extends keyof Settings>(k: K, v: Settings[K]) => { setSettings((s) => (s ? { ...s, [k]: v } : s)); setNotice(""); setError(""); };

  async function saveSettings() {
    if (!settings) return;
    if (settings.workingDays.length === 0) { setError("Select at least one working day."); return; }
    if (settings.endTime <= settings.startTime) { setError("End time must be after start time."); return; }
    setSaving(true);
    try {
      setSettings(await api.attendance.saveSettings(settings));
      setNotice("Attendance settings saved."); setError("");
    } catch (e) { setError(errText(e)); } finally { setSaving(false); }
  }

  /* ---- types ---- */
  const [typeForm, setTypeForm] = useState<AttendanceTypeBody>(blankType);
  const [typeId, setTypeId] = useState<number | null>(null);
  const editType = (t: AttendanceType) => { setTypeId(t.id); setTypeForm({ name: t.name, code: t.code, category: t.category, countsAs: t.countsAs, color: t.color, defaultType: t.defaultType, active: t.active, description: t.description ?? "" }); setError(""); };
  const newType = () => { setTypeId(null); setTypeForm({ ...blankType }); setError(""); };
  const setTF = <K extends keyof AttendanceTypeBody>(k: K, v: AttendanceTypeBody[K]) => { setTypeForm((f) => ({ ...f, [k]: v })); setError(""); setNotice(""); };
  async function saveType() {
    if (!typeForm.name.trim() || !typeForm.code.trim()) { setError("Please complete Name and Code."); return; }
    setSaving(true);
    try {
      const body = { ...typeForm, name: typeForm.name.trim(), code: typeForm.code.trim(), description: typeForm.description?.trim() || null };
      const saved = typeId === null ? await api.attendance.types.create(body) : await api.attendance.types.update(typeId, body);
      setTypes(await api.attendance.types.list());
      setNotice(`${saved.name} saved.`); setError("");
      if (typeId === null) newType(); else editType(saved);
    } catch (e) { setError(errText(e)); } finally { setSaving(false); }
  }
  async function removeType(t: AttendanceType) {
    if (!window.confirm(`Delete attendance type ${t.name}?`)) return;
    try { await api.attendance.types.remove(t.id); setTypes(await api.attendance.types.list()); setNotice(`${t.name} deleted.`); if (typeId === t.id) newType(); } catch (e) { setError(errText(e)); }
  }

  /* ---- rules ---- */
  const [ruleForm, setRuleForm] = useState<AttendanceRuleBody>(blankRule);
  const [ruleId, setRuleId] = useState<number | null>(null);
  const editRule = (r: AttendanceRule) => { setRuleId(r.id); setRuleForm({ name: r.name, description: r.description ?? "", appliesTo: r.appliesTo, priority: r.priority, active: r.active, conditionField: r.conditionField, conditionOperator: r.conditionOperator, conditionValue: r.conditionValue, actionTypeCode: r.actionTypeCode, notifyParent: r.notifyParent, includeInReports: r.includeInReports }); setError(""); };
  const newRule = () => { setRuleId(null); setRuleForm({ ...blankRule, priority: rules.length + 1, actionTypeCode: types[0]?.code ?? "" }); setError(""); };
  const setRF = <K extends keyof AttendanceRuleBody>(k: K, v: AttendanceRuleBody[K]) => { setRuleForm((f) => ({ ...f, [k]: v })); setError(""); setNotice(""); };
  async function saveRule() {
    if (!ruleForm.name.trim()) { setError("Rule Name is required."); return; }
    if (!ruleForm.actionTypeCode) { setError("Choose the attendance type this rule marks."); return; }
    if (!/^\d+$/.test(ruleForm.conditionValue)) { setError("Condition value must be a whole number."); return; }
    setSaving(true);
    try {
      const body = { ...ruleForm, name: ruleForm.name.trim(), description: ruleForm.description?.trim() || null };
      const saved = ruleId === null ? await api.attendance.rules.create(body) : await api.attendance.rules.update(ruleId, body);
      setRules(await api.attendance.rules.list());
      setNotice(`Rule "${saved.name}" saved.`); setError("");
      if (ruleId === null) newRule(); else editRule(saved);
    } catch (e) { setError(errText(e)); } finally { setSaving(false); }
  }
  async function removeRule(r: AttendanceRule) {
    if (!window.confirm(`Delete rule "${r.name}"?`)) return;
    try { await api.attendance.rules.remove(r.id); setRules(await api.attendance.rules.list()); setNotice(`Rule "${r.name}" deleted.`); if (ruleId === r.id) newRule(); } catch (e) { setError(errText(e)); }
  }

  /* ---- notification events ---- */
  const [eventForm, setEventForm] = useState<AttendanceEventBody>(blankEvent);
  const [eventId, setEventId] = useState<number | null>(null);
  const editEvent = (e: AttendanceEvent) => { setEventId(e.id); setEventForm({ name: e.name, triggerCode: e.triggerCode, recipients: [...e.recipients], channels: [...e.channels], templateId: e.templateId, customMessage: e.customMessage ?? "", active: e.active }); setError(""); };
  const newEvent = () => { setEventId(null); setEventForm({ ...blankEvent }); setError(""); };
  const setEF = <K extends keyof AttendanceEventBody>(k: K, v: AttendanceEventBody[K]) => { setEventForm((f) => ({ ...f, [k]: v })); setError(""); setNotice(""); };
  async function saveEvent() {
    if (!eventForm.name.trim()) { setError("Event Name is required."); return; }
    if (eventForm.recipients.length === 0 || eventForm.channels.length === 0) { setError("Choose at least one recipient and one channel."); return; }
    if (eventForm.templateId === null && !(eventForm.customMessage ?? "").trim()) { setError("Choose a template or write a custom message."); return; }
    setSaving(true);
    try {
      const body = { ...eventForm, name: eventForm.name.trim(), customMessage: eventForm.customMessage?.trim() || null };
      const saved = eventId === null ? await api.attendance.events.create(body) : await api.attendance.events.update(eventId, body);
      setEvents(await api.attendance.events.list());
      setNotice(`${saved.name} saved.`); setError("");
      if (eventId === null) newEvent(); else editEvent(saved);
    } catch (e) { setError(errText(e)); } finally { setSaving(false); }
  }
  async function removeEvent(ev: AttendanceEvent) {
    if (!window.confirm(`Delete notification "${ev.name}"?`)) return;
    try { await api.attendance.events.remove(ev.id); setEvents(await api.attendance.events.list()); setNotice(`${ev.name} deleted.`); if (eventId === ev.id) newEvent(); } catch (e) { setError(errText(e)); }
  }

  /* ---- templates ---- */
  const [tplForm, setTplForm] = useState<AttendanceTemplateBody>(blankTemplate);
  const [tplId, setTplId] = useState<number | null>(null);
  const editTpl = (t: AttendanceTemplate) => { setTplId(t.id); setTplForm({ name: t.name, body: t.body, active: t.active }); setError(""); };
  const newTpl = () => { setTplId(null); setTplForm({ ...blankTemplate }); setError(""); };
  async function saveTpl() {
    if (!tplForm.name.trim() || !tplForm.body.trim()) { setError("Template name and message are required."); return; }
    setSaving(true);
    try {
      const body = { ...tplForm, name: tplForm.name.trim(), body: tplForm.body.trim() };
      const saved = tplId === null ? await api.attendance.templates.create(body) : await api.attendance.templates.update(tplId, body);
      setTemplates(await api.attendance.templates.list());
      setNotice(`Template ${saved.name} saved.`); setError("");
      if (tplId === null) newTpl(); else editTpl(saved);
    } catch (e) { setError(errText(e)); } finally { setSaving(false); }
  }
  async function removeTpl(t: AttendanceTemplate) {
    if (!window.confirm(`Delete template ${t.name}?`)) return;
    try { await api.attendance.templates.remove(t.id); setTemplates(await api.attendance.templates.list()); setNotice(`Template ${t.name} deleted.`); if (tplId === t.id) newTpl(); } catch (e) { setError(errText(e)); }
  }

  const noInstitution = institutionId === null;
  const showSave = tab === "general" || tab === "rules";

  return (
    <AdminLayout activeItem="Institutions">
      <div className="space-y-3">
        <AcademicHeader
          step={1}
          title="Attendance Settings"
          subtitle="Configure how attendance is marked, counted and notified."
          right={
            <div className="flex flex-wrap items-center gap-3">
              <ContextBar inst={inst} />
              {showSave && <PrimaryButton type="button" onClick={() => void saveSettings()} disabled={!settings || saving}>{saving ? "Saving..." : "Save Changes"}</PrimaryButton>}
            </div>
          }
        />
        <Breadcrumb trail={["Institutions", "Institution Settings", "Attendance Settings", tabs.find((t) => t.key === tab)!.label]} />

        <div className="overflow-x-auto">
          <div className="grid min-w-[560px] grid-cols-4 gap-2">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button key={key} type="button" onClick={() => goTab(key)} aria-current={tab === key ? "page" : undefined}
                className={`flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-[10px] font-semibold transition ${tab === key ? "border-blue-500 bg-[#dcecff] text-blue-800 shadow-[inset_0_-2px_0_#1478f8]" : "border-[#cfe0f5] bg-white text-[#34467a] hover:border-blue-300 hover:bg-blue-50"}`}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        </div>

        {error && <Notice tone="error"><span className="font-bold">Please review:</span> {error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}
        {noInstitution && <Notice tone="info">{inst.isSuper ? "Create an institution first, then choose it above." : "Your account isn't linked to an institution."}</Notice>}
        {loading && !noInstitution && <Notice tone="info">Loading attendance settings...</Notice>}

        {/* ============================ GENERAL ============================ */}
        {tab === "general" && settings && (
          <>
            <Panel>
              <PanelTitle icon={<ClipboardCheck size={20} strokeWidth={2.4} />} title="Attendance Mode & Marking" />
              <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-5">
                <Field label="Attendance Mode" required>
                  <select className={controlClass} value={settings.attendanceMode} onChange={(e) => upd("attendanceMode", e.target.value as Settings["attendanceMode"])}>
                    {modes.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Default Marking Method" required>
                  <select className={controlClass} value={settings.defaultMethod} onChange={(e) => upd("defaultMethod", e.target.value as Settings["defaultMethod"])}>
                    {methods.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Default Mark">
                  <select className={controlClass} value={settings.defaultMark} onChange={(e) => upd("defaultMark", e.target.value as Settings["defaultMark"])}>
                    <option value="PRESENT">Present</option><option value="ABSENT">Absent</option>
                  </select>
                </Field>
                <Field label="Late After (minutes)"><input type="number" min={0} className={controlClass} value={settings.lateAfterMinutes} onChange={(e) => upd("lateAfterMinutes", Number(e.target.value))} /></Field>
                <Field label="Half Day Below (minutes)"><input type="number" min={0} className={controlClass} value={settings.halfDayMinutes} onChange={(e) => upd("halfDayMinutes", Number(e.target.value))} /></Field>
              </div>
            </Panel>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              <Panel>
                <PanelTitle title="Working Days & Hours" />
                <div className="space-y-3 px-4 pb-4">
                  <Field label="Working Days" required>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {days.map((d) => {
                        const on = settings.workingDays.includes(d.key);
                        return (
                          <button key={d.key} type="button" aria-pressed={on} onClick={() => upd("workingDays", on ? settings.workingDays.filter((x) => x !== d.key) : [...settings.workingDays, d.key])}
                            className={`h-7 min-w-11 rounded-md border px-2 text-[10px] font-semibold transition ${on ? "border-blue-500 bg-blue-600 text-white" : "border-[#d3dff0] bg-white text-[#34477c] hover:border-blue-300"}`}>{d.label}</button>
                        );
                      })}
                    </div>
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Start Time" required><input type="time" className={controlClass} value={settings.startTime} onChange={(e) => upd("startTime", e.target.value)} /></Field>
                    <Field label="End Time" required><input type="time" className={controlClass} value={settings.endTime} onChange={(e) => upd("endTime", e.target.value)} /></Field>
                  </div>
                  <p className="text-[9px] text-slate-500">Working days and hours are shared with General Settings.</p>
                </div>
              </Panel>

              <Panel>
                <PanelTitle title="Marking Options" />
                <div className="grid grid-cols-1 gap-2 px-4 pb-4 sm:grid-cols-2">
                  <SwitchRow label="Biometric" checked={settings.biometric} onChange={(v) => upd("biometric", v)} />
                  <SwitchRow label="RFID Card" checked={settings.rfid} onChange={(v) => upd("rfid", v)} />
                  <SwitchRow label="Mobile App" checked={settings.mobileApp} onChange={(v) => upd("mobileApp", v)} />
                  <SwitchRow label="GPS Check-in" checked={settings.gps} onChange={(v) => upd("gps", v)} />
                  <SwitchRow label="Offline Mode" checked={settings.offlineMode} onChange={(v) => upd("offlineMode", v)} />
                  <SwitchRow label="Auto-sync" checked={settings.autoSync} onChange={(v) => upd("autoSync", v)} />
                </div>
              </Panel>
            </div>

            <Panel>
              <PanelTitle title="Visibility & Corrections" />
              <div className="grid grid-cols-1 gap-2 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-4">
                <SwitchRow label="Parents can view" checked={settings.parentView} onChange={(v) => upd("parentView", v)} />
                <SwitchRow label="Students can view" checked={settings.studentView} onChange={(v) => upd("studentView", v)} />
                <SwitchRow label="Allow remarks" checked={settings.remarksEnabled} onChange={(v) => upd("remarksEnabled", v)} />
                <SwitchRow label="Allow adjustments" checked={settings.adjustmentEnabled} onChange={(v) => upd("adjustmentEnabled", v)} />
              </div>
            </Panel>
          </>
        )}

        {/* ============================ TYPES ============================ */}
        {tab === "types" && !noInstitution && (
          <>
            <Panel>
              <PanelTitle icon={<Tags size={20} strokeWidth={2.4} />} title="Attendance Types" right={<PrimaryButton type="button" onClick={newType}><Plus size={14} /> Add Type</PrimaryButton>} />
              <div className="px-4 pb-4">
                <DataTable heads={["#", "Name", "Code", "Category", "Counts As", "Color", "Default", "Status", "Actions"]} min={720}>
                  {!loading && types.length === 0 && <EmptyRow cols={9} text="No attendance types." />}
                  {types.map((t, i) => (
                    <tr key={t.id} className={`hover:bg-blue-50/50 ${typeId === t.id ? "bg-blue-50/60" : ""}`}>
                      <td className={tdClass}>{i + 1}</td>
                      <td className={`${tdClass} font-semibold text-[#17245e]`}>{t.name}</td>
                      <td className={tdClass}>{t.code}</td>
                      <td className={tdClass}>{labelOf(categories, t.category)}</td>
                      <td className={tdClass}>{labelOf(countsAs, t.countsAs)}</td>
                      <td className={tdClass}><span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border border-slate-200" style={{ backgroundColor: t.color }} />{t.color}</span></td>
                      <td className={tdClass}>{t.defaultType ? <StatusPill status="Current" /> : <span className="text-slate-400">—</span>}</td>
                      <td className={tdClass}><StatusPill status={t.active ? "Active" : "Inactive"} /></td>
                      <td className={tdClass}><RowActions name={t.name} onEdit={() => editType(t)} onDelete={() => void removeType(t)} /></td>
                    </tr>
                  ))}
                </DataTable>
                <TableFooter shown={types.length} total={types.length} />
              </div>
            </Panel>

            <DetailCard title={typeId === null ? "New Attendance Type" : "Attendance Type Details"} saving={saving}
              onCancel={() => { const t = types.find((x) => x.id === typeId); if (t) editType(t); else newType(); }} onSave={() => void saveType()}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Name" required><input className={controlClass} value={typeForm.name} onChange={(e) => setTF("name", e.target.value)} placeholder="e.g. Field Trip" /></Field>
                <Field label="Code" required><input className={controlClass} maxLength={10} value={typeForm.code} onChange={(e) => setTF("code", e.target.value.toUpperCase())} placeholder="e.g. FT" /></Field>
                <Field label="Category" required>
                  <select className={controlClass} value={typeForm.category} onChange={(e) => setTF("category", e.target.value as AttendanceCategory)}>{categories.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                </Field>
                <Field label="Counts As" required>
                  <select className={controlClass} value={typeForm.countsAs} onChange={(e) => setTF("countsAs", e.target.value as AttendanceCountsAs)}>{countsAs.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                </Field>
                <Field label="Color" required>
                  <div className="flex items-center gap-2">
                    <input type="color" aria-label="Pick colour" className="h-8 w-10 cursor-pointer rounded border border-[#d3dff0] bg-white p-0.5" value={typeForm.color} onChange={(e) => setTF("color", e.target.value.toUpperCase())} />
                    <input className={controlClass} value={typeForm.color} onChange={(e) => setTF("color", e.target.value)} placeholder="#28A745" />
                  </div>
                </Field>
                <Field label="Status"><div className="flex h-8 items-center gap-5">
                  <Toggle checked={typeForm.active} onChange={(v) => setTF("active", v)} />
                  <Check label="Default type" checked={typeForm.defaultType} onChange={(v) => setTF("defaultType", v)} />
                </div></Field>
                <Field label="Description" className="sm:col-span-2"><textarea className={textareaClass} value={typeForm.description ?? ""} onChange={(e) => setTF("description", e.target.value)} /></Field>
              </div>
            </DetailCard>
          </>
        )}

        {/* ============================ RULES & POLICIES ============================ */}
        {tab === "rules" && settings && (
          <>
            <Panel>
              <PanelTitle icon={<ShieldCheck size={20} strokeWidth={2.4} />} title="Attendance Rules" right={<PrimaryButton type="button" onClick={newRule}><Plus size={14} /> Add Rule</PrimaryButton>} />
              <div className="px-4 pb-4">
                <DataTable heads={["#", "Rule", "Condition", "Marks As", "Applies To", "Priority", "Status", "Actions"]} min={720}>
                  {!loading && rules.length === 0 && <EmptyRow cols={8} text="No rules defined yet." />}
                  {rules.map((r, i) => (
                    <tr key={r.id} className={`hover:bg-blue-50/50 ${ruleId === r.id ? "bg-blue-50/60" : ""}`}>
                      <td className={tdClass}>{i + 1}</td>
                      <td className={`${tdClass} font-semibold text-[#17245e]`}>{r.name}</td>
                      <td className={tdClass}>{labelOf(conditionFields, r.conditionField)} {operators.find((o) => o[0] === r.conditionOperator)?.[2]} {r.conditionValue}</td>
                      <td className={tdClass}>{r.actionTypeCode}</td>
                      <td className={tdClass}>{labelOf(appliesTo, r.appliesTo)}</td>
                      <td className={tdClass}>{r.priority}</td>
                      <td className={tdClass}><StatusPill status={r.active ? "Active" : "Inactive"} /></td>
                      <td className={tdClass}><RowActions name={r.name} onEdit={() => editRule(r)} onDelete={() => void removeRule(r)} /></td>
                    </tr>
                  ))}
                </DataTable>
                <TableFooter shown={rules.length} total={rules.length} />
              </div>
            </Panel>

            <DetailCard title={ruleId === null ? "New Rule" : "Rule Details"} saving={saving}
              onCancel={() => { const r = rules.find((x) => x.id === ruleId); if (r) editRule(r); else newRule(); }} onSave={() => void saveRule()}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Rule Name" required><input className={controlClass} value={ruleForm.name} onChange={(e) => setRF("name", e.target.value)} /></Field>
                <Field label="Applies To">
                  <select className={controlClass} value={ruleForm.appliesTo} onChange={(e) => setRF("appliesTo", e.target.value as AttendanceRuleBody["appliesTo"])}>{appliesTo.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                </Field>
                <Field label="Priority"><input type="number" min={1} max={99} className={controlClass} value={ruleForm.priority} onChange={(e) => setRF("priority", Number(e.target.value))} /></Field>
                <Field label="Status"><div className="flex h-8 items-center"><Toggle checked={ruleForm.active} onChange={(v) => setRF("active", v)} /></div></Field>
                <Field label="When" required>
                  <select className={controlClass} value={ruleForm.conditionField} onChange={(e) => setRF("conditionField", e.target.value)}>{conditionFields.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                </Field>
                <Field label="Operator" required>
                  <select className={controlClass} value={ruleForm.conditionOperator} onChange={(e) => setRF("conditionOperator", e.target.value)}>{operators.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                </Field>
                <Field label="Value" required><input inputMode="numeric" className={controlClass} value={ruleForm.conditionValue} onChange={(e) => setRF("conditionValue", e.target.value.replace(/\D/g, ""))} /></Field>
                <Field label="Mark As" required>
                  <select className={controlClass} value={ruleForm.actionTypeCode} onChange={(e) => setRF("actionTypeCode", e.target.value)}>
                    <option value="">Select type</option>{types.filter((t) => t.active).map((t) => <option key={t.id} value={t.code}>{t.name} ({t.code})</option>)}
                  </select>
                </Field>
              </div>
              <div className="mt-3 flex flex-wrap gap-6">
                <Check label="Notify parent" checked={ruleForm.notifyParent} onChange={(v) => setRF("notifyParent", v)} />
                <Check label="Include in reports" checked={ruleForm.includeInReports} onChange={(v) => setRF("includeInReports", v)} />
              </div>
              <Field label="Description" optional className="mt-3"><textarea className={textareaClass} value={ruleForm.description ?? ""} onChange={(e) => setRF("description", e.target.value)} /></Field>
            </DetailCard>

            <Panel>
              <PanelTitle title="Attendance Policy" right={<PrimaryButton type="button" onClick={() => void saveSettings()} disabled={saving}>{saving ? "Saving..." : "Save Policy"}</PrimaryButton>} />
              <div className="space-y-4 px-4 pb-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Field label="Minimum Attendance (%)" required><input type="number" min={0} max={100} className={controlClass} value={settings.minAttendancePct} onChange={(e) => upd("minAttendancePct", Number(e.target.value))} /></Field>
                  <Field label="Grace Period (minutes)"><input type="number" min={0} max={120} className={controlClass} value={settings.gracePeriodMinutes} onChange={(e) => upd("gracePeriodMinutes", Number(e.target.value))} /></Field>
                  <Field label="Auto-mark Absent At"><input type="time" className={controlClass} value={settings.autoAbsentTime} onChange={(e) => upd("autoAbsentTime", e.target.value)} /></Field>
                </div>
                <div>
                  <div className="mb-2 text-[10px] font-bold text-[#17245e]">Count as attended when calculating percentage</div>
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    <Check label="Present" checked={settings.countPresent} onChange={(v) => upd("countPresent", v)} />
                    <Check label="Late" checked={settings.countLate} onChange={(v) => upd("countLate", v)} />
                    <Check label="Half Day" checked={settings.countHalfDay} onChange={(v) => upd("countHalfDay", v)} />
                    <Check label="On Leave" checked={settings.countOnLeave} onChange={(v) => upd("countOnLeave", v)} />
                    <Check label="Sick Leave" checked={settings.countSickLeave} onChange={(v) => upd("countSickLeave", v)} />
                    <Check label="Excused" checked={settings.countExcused} onChange={(v) => upd("countExcused", v)} />
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-[10px] font-bold text-[#17245e]">Exclude from working days</div>
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    <Check label="Holidays" checked={settings.excludeHolidays} onChange={(v) => upd("excludeHolidays", v)} />
                    <Check label="Week offs" checked={settings.excludeWeekOffs} onChange={(v) => upd("excludeWeekOffs", v)} />
                  </div>
                </div>
              </div>
            </Panel>
          </>
        )}

        {/* ============================ NOTIFICATIONS ============================ */}
        {tab === "notifications" && !noInstitution && (
          <>
            <Notice tone="info">These settings decide who should be told and with which message. Messages are sent once an email / SMS provider is connected to Classzy.</Notice>
            <Panel>
              <PanelTitle icon={<Bell size={20} strokeWidth={2.4} />} title="Notification Events" right={<PrimaryButton type="button" onClick={newEvent}><Plus size={14} /> Add Event</PrimaryButton>} />
              <div className="px-4 pb-4">
                <DataTable heads={["#", "Event", "Trigger", "Recipients", "Channels", "Template", "Status", "Actions"]} min={760}>
                  {!loading && events.length === 0 && <EmptyRow cols={8} text="No notification events yet." />}
                  {events.map((ev, i) => (
                    <tr key={ev.id} className={`hover:bg-blue-50/50 ${eventId === ev.id ? "bg-blue-50/60" : ""}`}>
                      <td className={tdClass}>{i + 1}</td>
                      <td className={`${tdClass} font-semibold text-[#17245e]`}>{ev.name}</td>
                      <td className={tdClass}>{labelOf(triggers, ev.triggerCode)}</td>
                      <td className={tdClass}>{ev.recipients.map((r) => labelOf(recipientOptions, r)).join(", ")}</td>
                      <td className={tdClass}>{ev.channels.map((r) => labelOf(channelOptions, r)).join(", ")}</td>
                      <td className={tdClass}>{templates.find((t) => t.id === ev.templateId)?.name ?? "Custom message"}</td>
                      <td className={tdClass}><StatusPill status={ev.active ? "Active" : "Inactive"} /></td>
                      <td className={tdClass}><RowActions name={ev.name} onEdit={() => editEvent(ev)} onDelete={() => void removeEvent(ev)} /></td>
                    </tr>
                  ))}
                </DataTable>
                <TableFooter shown={events.length} total={events.length} />
              </div>
            </Panel>

            <DetailCard title={eventId === null ? "New Notification Event" : "Notification Event Details"} saving={saving}
              onCancel={() => { const e = events.find((x) => x.id === eventId); if (e) editEvent(e); else newEvent(); }} onSave={() => void saveEvent()}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Event Name" required><input className={controlClass} value={eventForm.name} onChange={(e) => setEF("name", e.target.value)} /></Field>
                <Field label="Send When" required>
                  <select className={controlClass} value={eventForm.triggerCode} onChange={(e) => setEF("triggerCode", e.target.value)}>{triggers.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                </Field>
                <Field label="Template">
                  <select className={controlClass} value={eventForm.templateId ?? ""} onChange={(e) => setEF("templateId", e.target.value ? Number(e.target.value) : null)}>
                    <option value="">Custom message</option>{templates.filter((t) => t.active || t.id === eventForm.templateId).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </Field>
                <Field label="Status"><div className="flex h-8 items-center"><Toggle checked={eventForm.active} onChange={(v) => setEF("active", v)} /></div></Field>
                <Field label="Recipients" required className="sm:col-span-2">
                  <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">{recipientOptions.map(([k, l]) => <Check key={k} label={l} checked={eventForm.recipients.includes(k)} onChange={() => setEF("recipients", toggleIn(eventForm.recipients, k))} />)}</div>
                </Field>
                <Field label="Channels" required className="sm:col-span-2">
                  <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">{channelOptions.map(([k, l]) => <Check key={k} label={l} checked={eventForm.channels.includes(k)} onChange={() => setEF("channels", toggleIn(eventForm.channels, k))} />)}</div>
                </Field>
              </div>
              {eventForm.templateId === null && (
                <Field label="Custom Message" required className="mt-3"><textarea className={textareaClass} value={eventForm.customMessage ?? ""} onChange={(e) => setEF("customMessage", e.target.value)} /></Field>
              )}
            </DetailCard>

            <Panel>
              <PanelTitle title="Message Templates" right={<PrimaryButton type="button" onClick={newTpl}><Plus size={14} /> Add Template</PrimaryButton>} />
              <div className="px-4 pb-4">
                <DataTable heads={["#", "Template", "Message", "Status", "Actions"]} min={600}>
                  {!loading && templates.length === 0 && <EmptyRow cols={5} text="No templates yet." />}
                  {templates.map((t, i) => (
                    <tr key={t.id} className={`hover:bg-blue-50/50 ${tplId === t.id ? "bg-blue-50/60" : ""}`}>
                      <td className={tdClass}>{i + 1}</td>
                      <td className={`${tdClass} font-semibold text-[#17245e]`}>{t.name}</td>
                      <td className={`${tdClass} max-w-[360px] truncate`} title={t.body}>{t.body}</td>
                      <td className={tdClass}><StatusPill status={t.active ? "Active" : "Inactive"} /></td>
                      <td className={tdClass}><RowActions name={t.name} onEdit={() => editTpl(t)} onDelete={() => void removeTpl(t)} /></td>
                    </tr>
                  ))}
                </DataTable>
              </div>
            </Panel>

            <DetailCard title={tplId === null ? "New Template" : "Template Details"} saving={saving}
              onCancel={() => { const t = templates.find((x) => x.id === tplId); if (t) editTpl(t); else newTpl(); }} onSave={() => void saveTpl()}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
                <Field label="Template Name" required><input className={controlClass} value={tplForm.name} onChange={(e) => setTplForm((f) => ({ ...f, name: e.target.value }))} /></Field>
                <Field label="Status"><div className="flex h-8 items-center"><Toggle checked={tplForm.active} onChange={(v) => setTplForm((f) => ({ ...f, active: v }))} /></div></Field>
              </div>
              <Field label="Message" required className="mt-3"><textarea className={`${textareaClass} !h-[84px]`} maxLength={1000} value={tplForm.body} onChange={(e) => setTplForm((f) => ({ ...f, body: e.target.value }))} /></Field>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[9px] text-slate-500">
                Insert:
                {placeholders.map((p) => (
                  <button key={p} type="button" onClick={() => setTplForm((f) => ({ ...f, body: `${f.body}${f.body && !f.body.endsWith(" ") ? " " : ""}${p}` }))} className="rounded border border-[#d3dff0] bg-white px-1.5 py-0.5 font-mono text-blue-700 hover:bg-blue-50">{p}</button>
                ))}
              </div>
            </DetailCard>
          </>
        )}

        <footer className="pb-1 pt-0.5 text-center text-[10px] text-slate-400">© {new Date().getFullYear()} Centram Classzy · School Management Platform</footer>
      </div>
    </AdminLayout>
  );
}
