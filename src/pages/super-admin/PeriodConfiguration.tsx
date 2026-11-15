import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, Clock, Plus, Settings2 } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../services/api";
import type { Holiday, HolidayBody, HolidayType, SlotType, TimetableGeneral, TimetableSlot, TimetableSlotBody, Weekday } from "../../services/api";
import {
  AcademicHeader, Breadcrumb, DataTable, DetailCard, EmptyRow, Field, Notice, OutlineButton, Panel, PanelTitle, PrimaryButton,
  RowActions, SearchBox, StatusPill, TableFooter, Toggle, controlClass, fmtDate, tdClass, textareaClass,
} from "./AcademicShared";
import { ContextBar, errText, useAcademicYears, useActiveInstitution } from "./SettingsShared";
import { TimetableNav, addMinutes, fmtDuration, fmtTime, minutesBetween, weekdays } from "./TimetableShared";

const tabs = [
  { key: "general", label: "General Settings" },
  { key: "structure", label: "Day Structure" },
  { key: "working", label: "Working Days & Holidays" },
] as const;
type TabKey = (typeof tabs)[number]["key"];

const slotTypes: [SlotType, string][] = [["TEACHING", "Teaching"], ["BREAK", "Break"], ["LUNCH", "Lunch"], ["OTHER", "Other"]];
const holidayTypes: [HolidayType, string][] = [["NATIONAL", "National"], ["FESTIVAL", "Festival"], ["VACATION", "Vacation"], ["SCHOOL_EVENT", "School Event"], ["OTHER", "Other"]];
const namings: [TimetableGeneral["periodNaming"], string][] = [["PERIOD_N", "Period 1, Period 2, ..."], ["P_N", "P1, P2, ..."], ["NUMBER", "1, 2, 3, ..."]];
const labelOf = (list: readonly (readonly [string, string])[], v: string) => list.find(([k]) => k === v)?.[1] ?? v;

function SwitchRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#e1ecfa] bg-white px-3 py-2">
      <span className="text-[11px] font-semibold text-[#17245e]">{label}</span>
      <Toggle checked={checked} onChange={onChange} label="" />
    </div>
  );
}

export default function PeriodConfiguration() {
  const inst = useActiveInstitution();
  const years = useAcademicYears(inst.institutionId);
  const institutionId = inst.institutionId;
  const [params, setParams] = useSearchParams();
  const tab = (tabs.find((t) => t.key === params.get("tab"))?.key ?? "general") as TabKey;

  const [general, setGeneral] = useState<TimetableGeneral | null>(null);
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fmt = general?.timeFormat ?? "H12";
  const goTab = (k: TabKey) => { setParams({ tab: k }); setError(""); setNotice(""); };

  const loadAll = useCallback(async () => {
    if (institutionId === null) { setGeneral(null); setSlots([]); setHolidays([]); setLoading(false); return; }
    setLoading(true);
    try {
      const g = await api.timetable.settings();           // the first call creates the defaults
      const [s, h] = await Promise.all([api.timetable.slots.list(), api.timetable.holidays.list()]);
      setGeneral(g); setSlots(s); setHolidays(h); setError("");
    } catch (e) { setError(errText(e)); } finally { setLoading(false); }
  }, [institutionId]);
  useEffect(() => { void loadAll(); }, [loadAll]);

  const setG = <K extends keyof TimetableGeneral>(k: K, v: TimetableGeneral[K]) => { setGeneral((g) => (g ? { ...g, [k]: v } : g)); setError(""); setNotice(""); };

  async function saveGeneral() {
    if (!general) return;
    if (!general.configName.trim()) { setError("Configuration Name is required."); return; }
    if (general.workingDays.length === 0) { setError("Select at least one working day."); return; }
    if (general.endTime <= general.startTime) { setError("School end time must be after the start time."); return; }
    if (general.halfDayEnabled && (general.halfDayEndTime <= general.startTime || general.halfDayEndTime >= general.endTime)) { setError("Half day end time must fall between the school start and end times."); return; }
    setSaving(true);
    try { setGeneral(await api.timetable.saveSettings({ ...general, description: general.description?.trim() || null })); setNotice("Settings saved."); setError(""); }
    catch (e) { setError(errText(e)); } finally { setSaving(false); }
  }

  /* ================= day structure ================= */
  const nextName = useCallback((type: SlotType) => {
    const count = slots.filter((s) => s.slotType === type).length + 1;
    if (type !== "TEACHING") return `${labelOf(slotTypes, type)} ${count}`;
    return general?.periodNaming === "P_N" ? `P${count}` : general?.periodNaming === "NUMBER" ? String(count) : `Period ${count}`;
  }, [slots, general?.periodNaming]);
  const blankSlot = useCallback((): TimetableSlotBody => {
    const start = slots.length ? slots[slots.length - 1].endTime : general?.startTime ?? "08:00";
    return { name: nextName("TEACHING"), slotType: "TEACHING", startTime: start, endTime: addMinutes(start, general?.defaultDuration ?? 45), active: true };
  }, [slots, general?.startTime, general?.defaultDuration, nextName]);
  const [slotForm, setSlotForm] = useState<TimetableSlotBody>({ name: "", slotType: "TEACHING", startTime: "", endTime: "", active: true });
  const [slotId, setSlotId] = useState<number | null>(null);
  const [slotsReady, setSlotsReady] = useState(false);

  useEffect(() => { if (!loading && !slotsReady && general) { setSlotForm(blankSlot()); setSlotsReady(true); } }, [loading, slotsReady, general, blankSlot]);

  const newSlot = () => { setSlotId(null); setSlotForm(blankSlot()); setError(""); };
  const editSlot = (s: TimetableSlot) => { setSlotId(s.id); setSlotForm({ name: s.name, slotType: s.slotType, startTime: s.startTime, endTime: s.endTime, active: s.active }); setError(""); };
  const setSF = <K extends keyof TimetableSlotBody>(k: K, v: TimetableSlotBody[K]) => { setSlotForm((f) => ({ ...f, [k]: v })); setError(""); setNotice(""); };
  const slotDuration = slotForm.startTime && slotForm.endTime ? minutesBetween(slotForm.startTime, slotForm.endTime) : 0;

  async function saveSlot() {
    if (!slotForm.name.trim() || !slotForm.startTime || !slotForm.endTime) { setError("Please complete Name, Start Time and End Time."); return; }
    if (slotDuration <= 0) { setError("End time must be after start time."); return; }
    setSaving(true);
    try {
      const body = { ...slotForm, name: slotForm.name.trim() };
      const saved = slotId === null ? await api.timetable.slots.create(body) : await api.timetable.slots.update(slotId, body);
      const list = await api.timetable.slots.list();
      setSlots(list); setNotice(`${saved.name} saved.`); setError("");
      if (slotId === null) {
        const start = saved.endTime;
        setSlotForm({ name: "", slotType: "TEACHING", startTime: start, endTime: addMinutes(start, general?.defaultDuration ?? 45), active: true });
        setSlotId(null);
      } else editSlot(saved);
    } catch (e) { setError(errText(e)); } finally { setSaving(false); }
  }
  async function toggleSlot(s: TimetableSlot) {
    try { await api.timetable.slots.update(s.id, { name: s.name, slotType: s.slotType, startTime: s.startTime, endTime: s.endTime, active: !s.active }); setSlots(await api.timetable.slots.list()); }
    catch (e) { setError(errText(e)); }
  }
  async function removeSlot(s: TimetableSlot) {
    if (!window.confirm(`Delete ${s.name}?`)) return;
    try { await api.timetable.slots.remove(s.id); setSlots(await api.timetable.slots.list()); setNotice(`${s.name} deleted.`); if (slotId === s.id) newSlot(); } catch (e) { setError(errText(e)); }
  }
  const teachingMins = slots.filter((s) => s.active && s.slotType === "TEACHING").reduce((a, s) => a + s.durationMinutes, 0);
  const breakMins = slots.filter((s) => s.active && (s.slotType === "BREAK" || s.slotType === "LUNCH")).reduce((a, s) => a + s.durationMinutes, 0);

  /* ================= holidays ================= */
  const blankHoliday = (): HolidayBody => ({ name: "", holidayType: "NATIONAL", startDate: "", endDate: "", active: true });
  const [holidayForm, setHolidayForm] = useState<HolidayBody>(blankHoliday);
  const [holidayId, setHolidayId] = useState<number | null>(null);
  const [hQuery, setHQuery] = useState("");
  const [hType, setHType] = useState("All");
  const [hStatus, setHStatus] = useState("All");
  const setHF = <K extends keyof HolidayBody>(k: K, v: HolidayBody[K]) => { setHolidayForm((f) => ({ ...f, [k]: v })); setError(""); setNotice(""); };
  const newHoliday = () => { setHolidayId(null); setHolidayForm(blankHoliday()); setError(""); };
  const editHoliday = (h: Holiday) => { setHolidayId(h.id); setHolidayForm({ name: h.name, holidayType: h.holidayType, startDate: h.startDate, endDate: h.endDate, active: h.active }); setError(""); };
  async function saveHoliday() {
    if (!holidayForm.name.trim() || !holidayForm.startDate) { setError("Please complete Holiday Name and Start Date."); return; }
    if (holidayForm.endDate && holidayForm.endDate < holidayForm.startDate) { setError("End date can't be before the start date."); return; }
    setSaving(true);
    try {
      const body = { ...holidayForm, name: holidayForm.name.trim(), endDate: holidayForm.endDate || holidayForm.startDate };
      const saved = holidayId === null ? await api.timetable.holidays.create(body) : await api.timetable.holidays.update(holidayId, body);
      setHolidays(await api.timetable.holidays.list()); setNotice(`${saved.name} saved.`); setError("");
      if (holidayId === null) newHoliday(); else editHoliday(saved);
    } catch (e) { setError(errText(e)); } finally { setSaving(false); }
  }
  async function removeHoliday(h: Holiday) {
    if (!window.confirm(`Delete holiday ${h.name}?`)) return;
    try { await api.timetable.holidays.remove(h.id); setHolidays(await api.timetable.holidays.list()); setNotice(`${h.name} deleted.`); if (holidayId === h.id) newHoliday(); } catch (e) { setError(errText(e)); }
  }
  const visibleHolidays = useMemo(() => holidays.filter((h) =>
    h.name.toLowerCase().includes(hQuery.toLowerCase()) && (hType === "All" || h.holidayType === hType) &&
    (hStatus === "All" || (hStatus === "Active" ? h.active : !h.active))), [holidays, hQuery, hType, hStatus]);

  const noInstitution = institutionId === null;
  const showSave = tab === "general" || tab === "working";

  return (
    <AdminLayout activeItem="Institutions">
      <div className="space-y-3">
        <AcademicHeader step={tabs.findIndex((t) => t.key === tab) + 1} title={tab === "general" ? "Period Configuration" : tabs.find((t) => t.key === tab)!.label}
          subtitle="Define class periods, timings and day structure."
          right={
            <div className="flex flex-wrap items-center gap-3">
              <ContextBar inst={inst} />
              {showSave && <PrimaryButton type="button" onClick={() => void saveGeneral()} disabled={!general || saving}>{saving ? "Saving..." : "Save Changes"}</PrimaryButton>}
            </div>
          } />
        <Breadcrumb trail={["Institutions", "Institution Settings", "Timetable Settings", "Period Configuration"]} />
        <TimetableNav active="periods" />

        <div className="overflow-x-auto">
          <div className="grid min-w-[520px] grid-cols-3 gap-2">
            {tabs.map(({ key, label }) => (
              <button key={key} type="button" onClick={() => goTab(key)} aria-current={tab === key ? "page" : undefined}
                className={`rounded-md border px-3 py-2 text-center text-[10px] font-semibold transition ${tab === key ? "border-blue-500 bg-[#dcecff] text-blue-800 shadow-[inset_0_-2px_0_#1478f8]" : "border-[#cfe0f5] bg-white text-[#34467a] hover:border-blue-300 hover:bg-blue-50"}`}>{label}</button>
            ))}
          </div>
        </div>

        {error && <Notice tone="error"><span className="font-bold">Please review:</span> {error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}
        {noInstitution && <Notice tone="info">{inst.isSuper ? "Create an institution first, then choose it above." : "Your account isn't linked to an institution."}</Notice>}
        {loading && !noInstitution && <Notice tone="info">Loading period configuration...</Notice>}

        {/* ============================ GENERAL ============================ */}
        {tab === "general" && general && (
          <>
            <Panel>
              <PanelTitle icon={<Settings2 size={20} strokeWidth={2.4} />} title="Period Configuration" />
              <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2">
                <Field label="Configuration Name" required><input className={controlClass} value={general.configName} onChange={(e) => setG("configName", e.target.value)} /></Field>
                <Field label="Academic Year">
                  <select className={controlClass} value={general.academicYearId ?? ""} onChange={(e) => setG("academicYearId", e.target.value ? Number(e.target.value) : null)}>
                    <option value="">{years.years.length ? "All years" : "No academic years yet"}</option>
                    {years.years.map((y) => <option key={y.id} value={y.id}>{y.name}{y.current ? " (current)" : ""}</option>)}
                  </select>
                </Field>
                <Field label="Description" optional className="sm:col-span-2">
                  <textarea className={textareaClass} maxLength={500} value={general.description ?? ""} onChange={(e) => setG("description", e.target.value)} placeholder="Standard period configuration for regular school hours." />
                  <div className="mt-0.5 text-right text-[9px] text-slate-400">{(general.description ?? "").length}/500</div>
                </Field>
              </div>
            </Panel>
            <Panel>
              <PanelTitle title="Default Settings" />
              <div className="space-y-3 px-4 pb-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Field label="Time Format">
                    <select className={controlClass} value={general.timeFormat} onChange={(e) => setG("timeFormat", e.target.value as "H12" | "H24")}><option value="H12">12 Hour (AM/PM)</option><option value="H24">24 Hour</option></select>
                  </Field>
                  <Field label="Period Naming Format">
                    <select className={controlClass} value={general.periodNaming} onChange={(e) => setG("periodNaming", e.target.value as TimetableGeneral["periodNaming"])}>{namings.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                  </Field>
                  <Field label="Default Period Duration (minutes)"><input type="number" min={5} max={240} className={controlClass} value={general.defaultDuration} onChange={(e) => setG("defaultDuration", Number(e.target.value))} /></Field>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <SwitchRow label="Allow variable period duration" checked={general.allowVariableDuration} onChange={(v) => setG("allowVariableDuration", v)} />
                  <SwitchRow label="Enable break periods" checked={general.enableBreaks} onChange={(v) => setG("enableBreaks", v)} />
                  <SwitchRow label="Allow zero period (before school)" checked={general.allowZeroPeriod} onChange={(v) => setG("allowZeroPeriod", v)} />
                  <SwitchRow label="Enable lunch break" checked={general.enableLunchBreak} onChange={(v) => setG("enableLunchBreak", v)} />
                  <SwitchRow label="Allow extra period (after school)" checked={general.allowExtraPeriod} onChange={(v) => setG("allowExtraPeriod", v)} />
                  <SwitchRow label="Show period number in reports" checked={general.showPeriodNumber} onChange={(v) => setG("showPeriodNumber", v)} />
                </div>
              </div>
            </Panel>
          </>
        )}

        {/* ============================ DAY STRUCTURE ============================ */}
        {tab === "structure" && !noInstitution && (
          <>
            <Panel>
              <PanelTitle icon={<Clock size={20} strokeWidth={2.4} />} title="Daily Period Structure" right={<PrimaryButton type="button" onClick={newSlot}><Plus size={14} /> Add Period</PrimaryButton>} />
              <div className="px-4 pb-4">
                <DataTable heads={["#", "Period Name", "Type", "Start Time", "End Time", "Duration (mins)", "Status", "Actions"]} min={720}>
                  {loading && <EmptyRow cols={8} text="Loading periods..." />}
                  {!loading && slots.length === 0 && <EmptyRow cols={8} text="No periods yet. Add the first one below." />}
                  {!loading && slots.map((s, i) => (
                    <tr key={s.id} className={`hover:bg-blue-50/50 ${slotId === s.id ? "bg-blue-50/60" : ""}`}>
                      <td className={tdClass}>{i + 1}</td>
                      <td className={`${tdClass} font-semibold text-[#17245e]`}>{s.name}</td>
                      <td className={tdClass}>{labelOf(slotTypes, s.slotType)}</td>
                      <td className={tdClass}>{fmtTime(s.startTime, fmt)}</td>
                      <td className={tdClass}>{fmtTime(s.endTime, fmt)}</td>
                      <td className={tdClass}>{s.durationMinutes}</td>
                      <td className={tdClass}><Toggle checked={s.active} onChange={() => void toggleSlot(s)} label="" /></td>
                      <td className={tdClass}><RowActions name={s.name} onEdit={() => editSlot(s)} onDelete={() => void removeSlot(s)} /></td>
                    </tr>
                  ))}
                </DataTable>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <TableFooter shown={slots.length} total={slots.length} />
                  <div className="mt-2 flex gap-4 text-[10px] font-semibold text-[#17245e]">
                    <span>Total Instruction Hours: {fmtDuration(teachingMins)}</span>
                    <span>Total Break/Lunch Hours: {fmtDuration(breakMins)}</span>
                  </div>
                </div>
              </div>
            </Panel>

            <DetailCard title={slotId === null ? "Add Period" : "Edit Period"} saving={saving}
              onCancel={() => { const s = slots.find((x) => x.id === slotId); if (s) editSlot(s); else newSlot(); }} onSave={() => void saveSlot()}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Field label="Period Name" required><input className={controlClass} value={slotForm.name} onChange={(e) => setSF("name", e.target.value)} /></Field>
                <Field label="Type" required>
                  <select className={controlClass} value={slotForm.slotType} onChange={(e) => setSF("slotType", e.target.value as SlotType)}>{slotTypes.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                </Field>
                <Field label="Start Time" required>
                  <input type="time" className={controlClass} value={slotForm.startTime} onChange={(e) => { const v = e.target.value; setSlotForm((f) => ({ ...f, startTime: v, endTime: v ? addMinutes(v, f.endTime && f.startTime ? Math.max(1, minutesBetween(f.startTime, f.endTime)) : general?.defaultDuration ?? 45) : f.endTime })); setError(""); }} />
                </Field>
                <Field label="End Time" required><input type="time" className={controlClass} value={slotForm.endTime} min={slotForm.startTime} onChange={(e) => setSF("endTime", e.target.value)} /></Field>
                <Field label="Duration (mins)"><input className={`${controlClass} bg-slate-50`} readOnly value={slotDuration > 0 ? slotDuration : ""} /></Field>
              </div>
              <div className="mt-3"><Toggle checked={slotForm.active} onChange={(v) => setSF("active", v)} /></div>
            </DetailCard>
          </>
        )}

        {/* ============================ WORKING DAYS & HOLIDAYS ============================ */}
        {tab === "working" && general && (
          <>
            <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[260px_1fr]">
              <Panel>
                <PanelTitle title="Working Days" />
                <div className="space-y-2 px-4 pb-4">
                  {weekdays.map((d) => (
                    <label key={d.key} className="flex items-center gap-2 text-[11px] text-[#17265f]">
                      <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={general.workingDays.includes(d.key as Weekday)}
                        onChange={() => setG("workingDays", general.workingDays.includes(d.key as Weekday) ? general.workingDays.filter((x) => x !== d.key) : [...general.workingDays, d.key as Weekday])} /> {d.label}
                    </label>
                  ))}
                </div>
              </Panel>
              <Panel>
                <PanelTitle title="School Timings (Overall)" />
                <div className="space-y-3 px-4 pb-4">
                  <div className="grid grid-cols-2 gap-3 sm:max-w-md">
                    <Field label="Start Time" required><input type="time" className={controlClass} value={general.startTime} onChange={(e) => setG("startTime", e.target.value)} /></Field>
                    <Field label="End Time" required><input type="time" className={controlClass} value={general.endTime} onChange={(e) => setG("endTime", e.target.value)} /></Field>
                  </div>
                  <div className="text-[11px] font-bold text-[#17245e]">Half Day Settings</div>
                  <div className="flex flex-wrap items-end gap-4">
                    <label className="flex items-center gap-2 pb-2 text-[11px] text-[#17265f]">
                      <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={general.halfDayEnabled} onChange={(e) => setG("halfDayEnabled", e.target.checked)} /> Enable Half Day
                    </label>
                    <Field label="Half Day End Time" className="w-[160px]"><input type="time" className={controlClass} value={general.halfDayEndTime} disabled={!general.halfDayEnabled} onChange={(e) => setG("halfDayEndTime", e.target.value)} /></Field>
                  </div>
                  <p className="text-[9px] text-slate-500">Working days and timings are shared with General Settings and Attendance Settings. Use Save Changes (top right) to store them.</p>
                </div>
              </Panel>
            </div>

            <Panel>
              <PanelTitle icon={<CalendarDays size={20} strokeWidth={2.4} />} title="Holidays" right={<PrimaryButton type="button" onClick={newHoliday}><Plus size={14} /> Add Holiday</PrimaryButton>} />
              <div className="px-4 pb-4">
                <div className="mb-3 flex flex-wrap items-end gap-3">
                  <SearchBox value={hQuery} onChange={setHQuery} placeholder="Search holidays..." />
                  <Field label="Holiday Type" className="w-[150px]">
                    <select className={controlClass} value={hType} onChange={(e) => setHType(e.target.value)}><option value="All">All</option>{holidayTypes.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                  </Field>
                  <Field label="Status" className="w-[120px]">
                    <select className={controlClass} value={hStatus} onChange={(e) => setHStatus(e.target.value)}><option>All</option><option>Active</option><option>Inactive</option></select>
                  </Field>
                </div>
                <DataTable heads={["#", "Holiday Name", "Holiday Type", "Date", "Status", "Actions"]} min={600}>
                  {!loading && visibleHolidays.length === 0 && <EmptyRow cols={6} text={holidays.length === 0 ? "No holidays added yet." : "No holidays match your filters."} />}
                  {visibleHolidays.map((h, i) => (
                    <tr key={h.id} className={`hover:bg-blue-50/50 ${holidayId === h.id ? "bg-blue-50/60" : ""}`}>
                      <td className={tdClass}>{i + 1}</td>
                      <td className={`${tdClass} font-semibold text-[#17245e]`}>{h.name}</td>
                      <td className={tdClass}>{labelOf(holidayTypes, h.holidayType)}</td>
                      <td className={tdClass}>{h.endDate === h.startDate ? fmtDate(h.startDate) : `${fmtDate(h.startDate)} - ${fmtDate(h.endDate)}`}</td>
                      <td className={tdClass}><StatusPill status={h.active ? "Active" : "Inactive"} /></td>
                      <td className={tdClass}><RowActions name={h.name} onEdit={() => editHoliday(h)} onDelete={() => void removeHoliday(h)} /></td>
                    </tr>
                  ))}
                </DataTable>
                <TableFooter shown={visibleHolidays.length} total={holidays.length} />
              </div>
            </Panel>

            <DetailCard title={holidayId === null ? "New Holiday" : "Holiday Details"} saving={saving}
              onCancel={() => { const h = holidays.find((x) => x.id === holidayId); if (h) editHoliday(h); else newHoliday(); }} onSave={() => void saveHoliday()}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Holiday Name" required><input className={controlClass} value={holidayForm.name} onChange={(e) => setHF("name", e.target.value)} /></Field>
                <Field label="Holiday Type" required>
                  <select className={controlClass} value={holidayForm.holidayType} onChange={(e) => setHF("holidayType", e.target.value as HolidayType)}>{holidayTypes.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                </Field>
                <Field label="Start Date" required><input type="date" className={controlClass} value={holidayForm.startDate} onChange={(e) => setHF("startDate", e.target.value)} /></Field>
                <Field label="End Date" optional><input type="date" className={controlClass} value={holidayForm.endDate} min={holidayForm.startDate} onChange={(e) => setHF("endDate", e.target.value)} /></Field>
              </div>
              <div className="mt-3"><Toggle checked={holidayForm.active} onChange={(v) => setHF("active", v)} /></div>
            </DetailCard>
          </>
        )}

        <div className="flex justify-end">{tab === "working" && <OutlineButton type="button" onClick={() => void loadAll()} disabled={saving}>Discard unsaved changes</OutlineButton>}</div>
        <footer className="pb-1 pt-0.5 text-center text-[10px] text-slate-400">© {new Date().getFullYear()} Centram Classzy · School Management Platform</footer>
      </div>
    </AdminLayout>
  );
}
