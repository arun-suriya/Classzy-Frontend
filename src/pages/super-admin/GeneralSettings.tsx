import { useCallback, useEffect, useState } from "react";
import { Building2, Clock, Globe2, Phone } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { api, ApiError } from "../../services/api";
import type { GeneralSettings as General, GradingSystemType, Weekday } from "../../services/api";
import {
  AcademicHeader, Breadcrumb, Field, Notice, Panel, PanelTitle, PrimaryButton, OutlineButton, controlClass, textareaClass,
} from "./AcademicShared";
import { ContextBar, errText, useActiveInstitution } from "./SettingsShared";

const days: { key: Weekday; label: string }[] = [
  { key: "MONDAY", label: "Mon" }, { key: "TUESDAY", label: "Tue" }, { key: "WEDNESDAY", label: "Wed" }, { key: "THURSDAY", label: "Thu" },
  { key: "FRIDAY", label: "Fri" }, { key: "SATURDAY", label: "Sat" }, { key: "SUNDAY", label: "Sun" },
];
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const dateFormats = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "DD-MM-YYYY", "DD MMM YYYY"];
const timeZones = [
  "(GMT+05:30) India Standard Time", "(GMT+00:00) Greenwich Mean Time", "(GMT+04:00) Gulf Standard Time", "(GMT+08:00) Singapore Time",
  "(GMT+05:00) Pakistan Standard Time", "(GMT+06:00) Bangladesh Standard Time", "(GMT-05:00) Eastern Time", "(GMT-08:00) Pacific Time",
];
const languages = ["English", "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam", "Marathi", "Bengali", "Arabic"];
const currencies = ["INR (₹)", "USD ($)", "EUR (€)", "GBP (£)", "AED (د.إ)", "SGD (S$)"];
const grading: [GradingSystemType, string][] = [["PERCENTAGE", "Percentage"], ["GRADE", "Grade"], ["CGPA", "CGPA"], ["CUSTOM", "Custom"]];

/** A select that always shows the stored value, even if it is not in the standard list. */
function Pick({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  const list = value && !options.includes(value) ? [value, ...options] : options;
  return <select className={controlClass} value={value} onChange={(e) => onChange(e.target.value)}>{list.map((o) => <option key={o}>{o}</option>)}</select>;
}

export default function GeneralSettings() {
  const inst = useActiveInstitution();
  const institutionId = inst.institutionId;
  const [data, setData] = useState<General | null>(null);
  const [saved, setSaved] = useState<General | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (institutionId === null) { setData(null); setSaved(null); setLoading(false); return; }
    setLoading(true);
    try { const g = await api.generalSettings.get(); setData(g); setSaved(g); setError(""); } catch (e) { setError(errText(e)); } finally { setLoading(false); }
  }, [institutionId]);

  useEffect(() => { void load(); }, [load]);

  const set = <K extends keyof General>(k: K, v: General[K]) => {
    setData((d) => (d ? { ...d, [k]: v } : d));
    setNotice(""); setError("");
    setFieldErrors((f) => (f[k] ? Object.fromEntries(Object.entries(f).filter(([key]) => key !== k)) : f));
  };
  const fe = (k: string) => (fieldErrors[k] ? <p className="mt-1 text-[9px] text-rose-600">{fieldErrors[k]}</p> : null);
  const dirty = data !== null && saved !== null && JSON.stringify(data) !== JSON.stringify(saved);

  async function save() {
    if (!data) return;
    if (data.workingDays.length === 0) { setError("Select at least one working day."); return; }
    if (data.endTime <= data.startTime) { setError("End time must be after start time."); return; }
    setSaving(true);
    try {
      const g = await api.generalSettings.save(data);
      setData(g); setSaved(g); setFieldErrors({}); setError(""); setNotice("General settings saved.");
    } catch (e) {
      setError(errText(e));
      if (e instanceof ApiError) setFieldErrors(e.fieldErrors);
    } finally { setSaving(false); }
  }

  return (
    <AdminLayout activeItem="Institutions">
      <div className="space-y-3">
        <AcademicHeader
          step={1}
          title="General Settings"
          subtitle="Institution profile, regional preferences and working hours."
          right={
            <div className="flex flex-wrap items-center gap-3">
              <ContextBar inst={inst} />
              <OutlineButton type="button" onClick={() => { setData(saved); setFieldErrors({}); setError(""); }} disabled={!dirty || saving}>Reset</OutlineButton>
              <PrimaryButton type="button" onClick={() => void save()} disabled={!dirty || saving}>{saving ? "Saving..." : "Save Changes"}</PrimaryButton>
            </div>
          }
        />
        <Breadcrumb trail={["Institutions", "Institution Settings", "General"]} />

        {error && <Notice tone="error"><span className="font-bold">Please review:</span> {error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}
        {institutionId === null && <Notice tone="info">{inst.isSuper ? "Create an institution first, then choose it above." : "Your account isn't linked to an institution."}</Notice>}
        {loading && institutionId !== null && <Notice tone="info">Loading general settings...</Notice>}

        {data && (
          <>
            <Panel>
              <PanelTitle icon={<Building2 size={20} strokeWidth={2.4} />} title="Institution Profile" />
              <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Institution Name"><input className={`${controlClass} bg-slate-50`} value={data.name} readOnly /></Field>
                <Field label="Institution Type"><input className={`${controlClass} bg-slate-50`} value={data.institutionType} readOnly /></Field>
                <Field label="Affiliation / Board" optional><input className={controlClass} value={data.affiliation ?? ""} onChange={(e) => set("affiliation", e.target.value)} placeholder="e.g. CBSE" /></Field>
                <Field label="Established Year" optional>
                  <input inputMode="numeric" maxLength={4} className={controlClass} value={data.establishmentYear ?? ""} onChange={(e) => set("establishmentYear", e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null)} />{fe("establishmentYear")}
                </Field>
                <Field label="Description" optional className="sm:col-span-2 lg:col-span-4"><textarea className={textareaClass} value={data.description ?? ""} onChange={(e) => set("description", e.target.value)} /></Field>
              </div>
              <p className="px-4 pb-3 text-[9px] text-slate-500">Name and type are managed by the platform administrator under All Institutions.</p>
            </Panel>

            <Panel>
              <PanelTitle icon={<Phone size={20} strokeWidth={2.4} />} title="Contact & Address" />
              <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Email">{<input type="email" className={controlClass} value={data.email ?? ""} onChange={(e) => set("email", e.target.value)} />}{fe("email")}</Field>
                <Field label="Phone">
                  <div className="flex gap-2">
                    <input className={`${controlClass} !w-[64px]`} value={data.phoneCode ?? ""} onChange={(e) => set("phoneCode", e.target.value)} placeholder="+91" aria-label="Phone code" />
                    <input className={controlClass} value={data.phone ?? ""} onChange={(e) => set("phone", e.target.value)} aria-label="Phone number" />
                  </div>{fe("phone")}
                </Field>
                <Field label="Country"><input className={controlClass} value={data.country ?? ""} onChange={(e) => set("country", e.target.value)} /></Field>
                <Field label="State"><input className={controlClass} value={data.state ?? ""} onChange={(e) => set("state", e.target.value)} /></Field>
                <Field label="City"><input className={controlClass} value={data.city ?? ""} onChange={(e) => set("city", e.target.value)} /></Field>
                <Field label="PIN / ZIP Code"><input className={controlClass} value={data.pinCode ?? ""} onChange={(e) => set("pinCode", e.target.value)} />{fe("pinCode")}</Field>
                <Field label="Address" className="sm:col-span-2"><textarea className={textareaClass} value={data.address ?? ""} onChange={(e) => set("address", e.target.value)} /></Field>
              </div>
            </Panel>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              <Panel>
                <PanelTitle icon={<Globe2 size={20} strokeWidth={2.4} />} title="Regional Settings" />
                <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2">
                  <Field label="Date Format" required><Pick value={data.dateFormat} options={dateFormats} onChange={(v) => set("dateFormat", v)} />{fe("dateFormat")}</Field>
                  <Field label="Time Zone" required><Pick value={data.timeZone} options={timeZones} onChange={(v) => set("timeZone", v)} /></Field>
                  <Field label="Language" required><Pick value={data.language} options={languages} onChange={(v) => set("language", v)} /></Field>
                  <Field label="Currency" required><Pick value={data.currency} options={currencies} onChange={(v) => set("currency", v)} /></Field>
                  <Field label="Academic Year Starts In" required>
                    <select className={controlClass} value={data.academicStartMonth} onChange={(e) => set("academicStartMonth", Number(e.target.value))}>
                      {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                  </Field>
                  <Field label="Grading System">
                    <select className={controlClass} value={data.gradingSystem ?? ""} onChange={(e) => set("gradingSystem", (e.target.value || null) as GradingSystemType | null)}>
                      <option value="">Not set</option>{grading.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </Field>
                </div>
              </Panel>

              <Panel>
                <PanelTitle icon={<Clock size={20} strokeWidth={2.4} />} title="Working Days & Hours" />
                <div className="space-y-3 px-4 pb-4">
                  <Field label="Working Days" required>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {days.map((d) => {
                        const on = data.workingDays.includes(d.key);
                        return (
                          <button key={d.key} type="button" aria-pressed={on} onClick={() => set("workingDays", on ? data.workingDays.filter((x) => x !== d.key) : [...data.workingDays, d.key])}
                            className={`h-7 min-w-11 rounded-md border px-2 text-[10px] font-semibold transition ${on ? "border-blue-500 bg-blue-600 text-white" : "border-[#d3dff0] bg-white text-[#34477c] hover:border-blue-300"}`}>{d.label}</button>
                        );
                      })}
                    </div>{fe("workingDays")}
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Start Time" required><input type="time" className={controlClass} value={data.startTime} onChange={(e) => set("startTime", e.target.value)} />{fe("startTime")}</Field>
                    <Field label="End Time" required><input type="time" className={controlClass} value={data.endTime} onChange={(e) => set("endTime", e.target.value)} />{fe("endTime")}</Field>
                  </div>
                  <p className="text-[9px] text-slate-500">These are also used by Attendance Settings.</p>
                </div>
              </Panel>
            </div>
          </>
        )}

        <footer className="pb-1 pt-0.5 text-center text-[10px] text-slate-400">© {new Date().getFullYear()} Centram Classzy · School Management Platform</footer>
      </div>
    </AdminLayout>
  );
}
