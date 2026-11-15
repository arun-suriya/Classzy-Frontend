import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowUp, ListChecks, ShieldAlert } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../services/api";
import type { RulePriority, TimetableRules as Rules } from "../../services/api";
import { AcademicHeader, Breadcrumb, Field, Notice, Panel, PanelTitle, PrimaryButton, Toggle, controlClass, textareaClass } from "./AcademicShared";
import { ContextBar, errText, useActiveInstitution } from "./SettingsShared";
import { TimetableNav } from "./TimetableShared";

const tabs = [
  { key: "general", label: "General Rules" },
  { key: "conflict", label: "Conflict Rules" },
] as const;
type TabKey = (typeof tabs)[number]["key"];

const conflictLabels: Record<string, string> = {
  TEACHER_AVAILABILITY: "Teacher availability", CLASS_SUBJECT_REQUIREMENTS: "Class subject requirements", ROOM_AVAILABILITY: "Room availability",
  SUBJECT_SEQUENCE: "Subject sequence", PREFERRED_SLOTS: "Preferred time slots", EQUAL_DISTRIBUTION: "Equal distribution",
};
const genOptions: [keyof Rules, string][] = [
  ["genAvoidTeacherConflicts", "Avoid teacher conflicts"], ["genAvoidRoomConflicts", "Avoid room conflicts"], ["genDistributeEvenly", "Distribute subjects evenly"],
  ["genWeeklyFrequency", "Respect weekly frequency"], ["genWorkingHours", "Respect working hours"], ["genPreferredSlots", "Use preferred time slots"],
  ["genManualAdjust", "Allow manual adjustments"], ["genAvoidConsecutive", "Avoid consecutive same-subject periods"], ["genDailyDiversity", "Ensure daily subject diversity"],
  ["genTeacherWorkload", "Balance teacher workload"], ["genAiSuggestions", "Enable smart suggestions"],
];
const advOptions: [keyof Rules, string][] = [
  ["advAutoResolve", "Auto-resolve conflicts when possible"], ["advReport", "Generate a conflict report after generation"],
  ["advHighlight", "Highlight conflicts in the timetable view"], ["advManualOverride", "Allow manual override of conflicts"],
];

function NumberField({ label, hint, value, min, max, onChange }: { label: string; hint?: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <Field label={label}>
      <input type="number" min={min} max={max} className={controlClass} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <div className="mt-0.5 text-[9px] text-slate-500">{hint}</div>}
    </Field>
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
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-[#17265f]">
      <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );
}

export default function TimetableRules() {
  const inst = useActiveInstitution();
  const institutionId = inst.institutionId;
  const [params, setParams] = useSearchParams();
  const tab = (tabs.find((t) => t.key === params.get("tab"))?.key ?? "general") as TabKey;

  const [rules, setRules] = useState<Rules | null>(null);
  const [priorities, setPriorities] = useState<RulePriority[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (institutionId === null) { setRules(null); setPriorities([]); setLoading(false); return; }
    setLoading(true);
    try {
      const r = await api.timetable.rules();
      setRules(r); setPriorities(await api.timetable.priorities()); setError("");
    } catch (e) { setError(errText(e)); } finally { setLoading(false); }
  }, [institutionId]);
  useEffect(() => { void load(); }, [load]);

  const set = <K extends keyof Rules>(k: K, v: Rules[K]) => { setRules((r) => (r ? { ...r, [k]: v } : r)); setError(""); setNotice(""); };
  const goTab = (k: TabKey) => { setParams({ tab: k }); setError(""); setNotice(""); };

  function movePriority(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= priorities.length) return;
    const next = [...priorities];
    [next[i], next[j]] = [next[j], next[i]];
    setPriorities(next); setNotice("");
  }
  function moveConflict(i: number, dir: -1 | 1) {
    if (!rules) return;
    const j = i + dir;
    if (j < 0 || j >= rules.conflictOrder.length) return;
    const next = [...rules.conflictOrder];
    [next[i], next[j]] = [next[j], next[i]];
    set("conflictOrder", next);
  }

  async function save() {
    if (!rules) return;
    setSaving(true);
    try {
      const saved = await api.timetable.saveRules({ ...rules, rulesDescription: rules.rulesDescription?.trim() || null });
      const pr = await api.timetable.savePriorities(priorities.map((p) => ({ code: p.code, enabled: p.enabled })));
      setRules(saved); setPriorities(pr); setNotice("Timetable rules saved."); setError("");
    } catch (e) { setError(errText(e)); } finally { setSaving(false); }
  }

  const noInstitution = institutionId === null;

  return (
    <AdminLayout activeItem="Institutions">
      <div className="space-y-3">
        <AcademicHeader step={tab === "general" ? 1 : 2} title="Timetable Rules" subtitle="Set the rules the timetable must follow when periods are allocated."
          right={
            <div className="flex flex-wrap items-center gap-3">
              <ContextBar inst={inst} />
              <PrimaryButton type="button" onClick={() => void save()} disabled={!rules || saving}>{saving ? "Saving..." : "Save Changes"}</PrimaryButton>
            </div>
          } />
        <Breadcrumb trail={["Institutions", "Institution Settings", "Timetable Settings", "Timetable Rules"]} />
        <TimetableNav active="rules" />

        <div className="grid max-w-md grid-cols-2 gap-2">
          {tabs.map(({ key, label }) => (
            <button key={key} type="button" onClick={() => goTab(key)} aria-current={tab === key ? "page" : undefined}
              className={`rounded-md border px-3 py-2 text-center text-[10px] font-semibold transition ${tab === key ? "border-blue-500 bg-[#dcecff] text-blue-800 shadow-[inset_0_-2px_0_#1478f8]" : "border-[#cfe0f5] bg-white text-[#34467a] hover:border-blue-300 hover:bg-blue-50"}`}>{label}</button>
          ))}
        </div>

        {error && <Notice tone="error"><span className="font-bold">Please review:</span> {error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}
        {noInstitution && <Notice tone="info">{inst.isSuper ? "Create an institution first, then choose it above." : "Your account isn't linked to an institution."}</Notice>}
        {loading && !noInstitution && <Notice tone="info">Loading timetable rules...</Notice>}

        {tab === "general" && rules && (
          <>
            <Panel>
              <PanelTitle icon={<ListChecks size={20} strokeWidth={2.4} />} title="General Rules" />
              <div className="space-y-3 px-4 pb-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <NumberField label="Max periods per day (per class)" value={rules.maxPeriodsPerDay} min={1} max={20} onChange={(n) => set("maxPeriodsPerDay", n)} />
                  <NumberField label="Max consecutive periods (teacher)" value={rules.maxConsecutiveTeacher} min={1} max={10} onChange={(n) => set("maxConsecutiveTeacher", n)} />
                  <NumberField label="Min break between periods (minutes)" value={rules.minBreakBetween} min={0} max={120} onChange={(n) => set("minBreakBetween", n)} />
                  <NumberField label="Max consecutive same subject" value={rules.maxConsecutiveSubject} min={1} max={10} onChange={(n) => set("maxConsecutiveSubject", n)} />
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <SwitchRow label="Allow double periods" checked={rules.allowDoublePeriods} onChange={(v) => set("allowDoublePeriods", v)} />
                  <SwitchRow label="Allow free periods" checked={rules.allowFreePeriods} onChange={(v) => set("allowFreePeriods", v)} />
                  <SwitchRow label="Prefer core subjects in the morning" checked={rules.preferMorningCore} onChange={(v) => set("preferMorningCore", v)} />
                </div>
              </div>
            </Panel>

            <Panel>
              <PanelTitle title="Timetable Generation Rules" />
              <div className="grid grid-cols-1 gap-2 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-3">
                {genOptions.map(([k, label]) => <Check key={k} label={label} checked={rules[k] as boolean} onChange={(v) => set(k, v as never)} />)}
              </div>
            </Panel>

            <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
              <Panel>
                <PanelTitle title="Rule Priorities" />
                <div className="space-y-1.5 px-4 pb-4">
                  <p className="text-[10px] text-slate-500">Higher rules win when two rules disagree. Use the arrows to reorder.</p>
                  {priorities.map((p, i) => (
                    <div key={p.code} className="flex items-center gap-2 rounded-lg border border-[#e1ecfa] bg-white px-3 py-1.5">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-700">{i + 1}</span>
                      <span className={`flex-1 text-[11px] font-semibold ${p.enabled ? "text-[#17245e]" : "text-slate-400 line-through"}`}>{p.name}</span>
                      <Toggle checked={p.enabled} onChange={(v) => setPriorities((l) => l.map((x) => (x.code === p.code ? { ...x, enabled: v } : x)))} label="" />
                      <button type="button" aria-label={`Move ${p.name} up`} disabled={i === 0} onClick={() => movePriority(i, -1)} className="rounded p-1 text-slate-500 hover:bg-blue-50 disabled:opacity-30"><ArrowUp size={13} /></button>
                      <button type="button" aria-label={`Move ${p.name} down`} disabled={i === priorities.length - 1} onClick={() => movePriority(i, 1)} className="rounded p-1 text-slate-500 hover:bg-blue-50 disabled:opacity-30"><ArrowDown size={13} /></button>
                    </div>
                  ))}
                  {priorities.length === 0 && !loading && <div className="text-[11px] text-slate-500">No priorities found.</div>}
                </div>
              </Panel>
              <Panel>
                <PanelTitle title="Rules Description" />
                <div className="px-4 pb-4">
                  <Field label="Description" optional>
                    <textarea className={`${textareaClass} min-h-[140px]`} maxLength={500} value={rules.rulesDescription ?? ""} onChange={(e) => set("rulesDescription", e.target.value)} placeholder="Describe any school-specific timetable rules." />
                    <div className="mt-0.5 text-right text-[9px] text-slate-400">{(rules.rulesDescription ?? "").length}/500</div>
                  </Field>
                </div>
              </Panel>
            </div>
          </>
        )}

        {tab === "conflict" && rules && (
          <>
            <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
              <Panel>
                <PanelTitle icon={<ShieldAlert size={20} strokeWidth={2.4} />} title="Conflict Resolution Priority" />
                <div className="space-y-1.5 px-4 pb-4">
                  <p className="text-[10px] text-slate-500">The generator resolves conflicts in this order, top first.</p>
                  {rules.conflictOrder.map((c, i) => (
                    <div key={c} className="flex items-center gap-2 rounded-lg border border-[#e1ecfa] bg-white px-3 py-1.5">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-700">{i + 1}</span>
                      <span className="flex-1 text-[11px] font-semibold text-[#17245e]">{conflictLabels[c] ?? c}</span>
                      <button type="button" aria-label={`Move ${conflictLabels[c] ?? c} up`} disabled={i === 0} onClick={() => moveConflict(i, -1)} className="rounded p-1 text-slate-500 hover:bg-blue-50 disabled:opacity-30"><ArrowUp size={13} /></button>
                      <button type="button" aria-label={`Move ${conflictLabels[c] ?? c} down`} disabled={i === rules.conflictOrder.length - 1} onClick={() => moveConflict(i, 1)} className="rounded p-1 text-slate-500 hover:bg-blue-50 disabled:opacity-30"><ArrowDown size={13} /></button>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel>
                <PanelTitle title="Conflict Handling" />
                <div className="space-y-3 px-4 pb-4">
                  <Field label="When a teacher conflict occurs">
                    <select className={controlClass} value={rules.onTeacherConflict} onChange={(e) => set("onTeacherConflict", e.target.value)}>
                      <option value="SUGGEST_ALTERNATIVE">Suggest an alternative teacher</option><option value="SKIP">Skip the period</option><option value="WARN">Warn and continue</option>
                    </select>
                  </Field>
                  <Field label="When a room conflict occurs">
                    <select className={controlClass} value={rules.onRoomConflict} onChange={(e) => set("onRoomConflict", e.target.value)}>
                      <option value="SUGGEST_ALTERNATIVE">Suggest an alternative room</option><option value="SKIP">Skip the period</option><option value="WARN">Warn and continue</option>
                    </select>
                  </Field>
                  <Field label="When a subject conflict occurs">
                    <select className={controlClass} value={rules.onSubjectConflict} onChange={(e) => set("onSubjectConflict", e.target.value)}>
                      <option value="NEXT_SLOT">Move to the next available slot</option><option value="SKIP">Skip the period</option><option value="WARN">Warn and continue</option>
                    </select>
                  </Field>
                  <Field label="When a limit is exceeded">
                    <select className={controlClass} value={rules.onLimitExceeded} onChange={(e) => set("onLimitExceeded", e.target.value)}>
                      <option value="WARN_APPROVAL">Warn and require approval</option><option value="BLOCK">Block the allocation</option><option value="ALLOW">Allow silently</option>
                    </select>
                  </Field>
                </div>
              </Panel>
            </div>
            <Panel>
              <PanelTitle title="Advanced Conflict Settings" />
              <div className="grid grid-cols-1 gap-2 px-4 pb-4 sm:grid-cols-2">
                {advOptions.map(([k, label]) => <Check key={k} label={label} checked={rules[k] as boolean} onChange={(v) => set(k, v as never)} />)}
              </div>
            </Panel>
          </>
        )}

        <footer className="pb-1 pt-0.5 text-center text-[10px] text-slate-400">© {new Date().getFullYear()} Centram Classzy · School Management Platform</footer>
      </div>
    </AdminLayout>
  );
}
