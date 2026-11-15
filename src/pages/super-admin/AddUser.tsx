import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { api, ApiError, session } from "../../services/api";
import type { Institution, UserBody, UserDetail, UserStatus, UserType } from "../../services/api";
import { Field, Notice, OutlineButton, Panel, PanelTitle, PrimaryButton, SearchBox, Toggle, controlClass, textareaClass } from "./AcademicShared";
import { errText } from "./SettingsShared";
import { languageOpts, timezoneOpts } from "./CommunicationShared";
import { Err, Pill } from "./TransportShared";
import { Avatar, TempPassword, UsersHeader, fmtDay, statusLabels, typeLabel, useRoles, userTypes } from "./UserShared";

const steps = ["Basic Information", "Role & Permissions", "Institution & Access", "Additional Details", "Notification Settings", "Review & Create"] as const;

type F = {
  userType: UserType; firstName: string; lastName: string; email: string; phoneCode: string; phone: string; dateOfBirth: string; gender: string;
  status: UserStatus; validFrom: string; validTo: string; notes: string;
  passwordMode: "AUTO" | "CUSTOM"; password: string; mustChangePassword: boolean; twoFactor: boolean; resetEnabled: boolean; resetAfterDays: string;
  roles: string[]; institutionId: number | null; dataScope: string; academicYearId: string;
  employeeId: string; department: string; designation: string; joinedOn: string; altEmail: string; emergencyContact: string;
  address1: string; address2: string; city: string; state: string; pinCode: string;
  notifyEvents: string[]; language: string; timezone: string; notifyVia: string[];
};

const today = () => new Date().toISOString().slice(0, 10);
const blank = (inst: number | null): F => ({
  userType: "TEACHER", firstName: "", lastName: "", email: "", phoneCode: "+91", phone: "", dateOfBirth: "", gender: "", status: "ACTIVE", validFrom: today(), validTo: "", notes: "",
  passwordMode: "AUTO", password: "", mustChangePassword: true, twoFactor: false, resetEnabled: false, resetAfterDays: "90",
  roles: ["TEACHER"], institutionId: inst, dataScope: "ASSIGNED", academicYearId: "",
  employeeId: "", department: "", designation: "", joinedOn: "", altEmail: "", emergencyContact: "", address1: "", address2: "", city: "", state: "", pinCode: "",
  notifyEvents: ["WELCOME_EMAIL", "PASSWORD_RESET", "ANNOUNCEMENTS", "TIMETABLE", "EXAMS", "FEES", "LIBRARY"], language: "en", timezone: "Asia/Kolkata", notifyVia: ["EMAIL", "IN_APP"],
});

const defaultRole: Record<string, string> = { STUDENT: "STUDENT", TEACHER: "TEACHER", PARENT: "PARENT", ADMINISTRATOR: "ADMINISTRATOR" };
const events: readonly (readonly [string, string])[] = [["WELCOME_EMAIL", "Welcome email with login credentials"], ["PASSWORD_RESET", "Password reset notifications"], ["ANNOUNCEMENTS", "New announcements"],
  ["TIMETABLE", "Timetable updates"], ["ATTENDANCE", "Attendance notifications"], ["EXAMS", "Exam and results notifications"], ["FEES", "Fee payment notifications"], ["TRANSPORT", "Transport notifications"], ["LIBRARY", "Library due/return reminders"]];
const via: readonly (readonly [string, string])[] = [["EMAIL", "Email"], ["SMS", "SMS"], ["IN_APP", "In-app notification"]];
const scopes: readonly (readonly [string, string])[] = [["ASSIGNED", "Restrict to assigned classes/students"], ["ALL", "Allow access to all classes/students"], ["OWN", "Restrict to own data only"]];
const codes = ["+91", "+1", "+44", "+61", "+65", "+971", "+966", "+977", "+94", "+880"];
const genders: readonly (readonly [string, string])[] = [["", "Select"], ["MALE", "Male"], ["FEMALE", "Female"], ["OTHER", "Other"]];

const stepOf: Record<string, number> = {
  userType: 1, firstName: 1, lastName: 1, email: 1, phoneCode: 1, phone: 1, dateOfBirth: 1, gender: 1, status: 1, validFrom: 1, validTo: 1, notes: 1, password: 1, resetAfterDays: 1,
  roles: 2, institutionId: 3, academicYearId: 3, dataScope: 3,
  employeeId: 4, department: 4, designation: 4, joinedOn: 4, altEmail: 4, emergencyContact: 4, address1: 4, address2: 4, city: 4, state: 4, pinCode: 4,
  notifyEvents: 5, language: 5, timezone: 5, notifyVia: 5,
};

const nz = (v: string) => (v.trim() === "" ? null : v.trim());
function toBody(f: F): UserBody {
  return {
    userType: f.userType, firstName: f.firstName.trim(), lastName: f.lastName.trim(), email: f.email.trim(), phoneCode: f.phoneCode, phone: f.phone.trim(), dateOfBirth: nz(f.dateOfBirth), gender: nz(f.gender),
    status: f.status, validFrom: nz(f.validFrom), validTo: nz(f.validTo), notes: nz(f.notes), passwordMode: f.passwordMode, password: f.passwordMode === "CUSTOM" ? f.password : null,
    mustChangePassword: f.mustChangePassword, twoFactor: f.twoFactor, resetAfterDays: f.resetEnabled && f.resetAfterDays ? Number(f.resetAfterDays) : null,
    roles: f.roles, institutionId: f.institutionId, dataScope: f.dataScope, academicYearId: f.academicYearId ? Number(f.academicYearId) : null,
    employeeId: nz(f.employeeId), department: nz(f.department), designation: nz(f.designation), joinedOn: nz(f.joinedOn), altEmail: nz(f.altEmail), emergencyContact: nz(f.emergencyContact),
    address1: nz(f.address1), address2: nz(f.address2), city: nz(f.city), state: nz(f.state), pinCode: nz(f.pinCode),
    notifyEvents: f.notifyEvents, language: f.language, timezone: f.timezone, notifyVia: f.notifyVia,
  };
}
function fromDetail(d: UserDetail): F {
  return {
    userType: d.userType, firstName: d.firstName, lastName: d.lastName, email: d.email, phoneCode: d.phoneCode, phone: d.phone, dateOfBirth: d.dateOfBirth ?? "", gender: d.gender ?? "",
    status: d.status, validFrom: d.validFrom ?? "", validTo: d.validTo ?? "", notes: d.notes ?? "", passwordMode: "AUTO", password: "", mustChangePassword: d.mustChangePassword, twoFactor: d.twoFactor,
    resetEnabled: d.resetAfterDays !== null, resetAfterDays: d.resetAfterDays === null ? "90" : String(d.resetAfterDays),
    roles: d.roles, institutionId: d.institutionId, dataScope: d.dataScope, academicYearId: d.academicYearId === null ? "" : String(d.academicYearId),
    employeeId: d.employeeId ?? "", department: d.department ?? "", designation: d.designation ?? "", joinedOn: d.joinedOn ?? "", altEmail: d.altEmail ?? "", emergencyContact: d.emergencyContact ?? "",
    address1: d.address1 ?? "", address2: d.address2 ?? "", city: d.city ?? "", state: d.state ?? "", pinCode: d.pinCode ?? "",
    notifyEvents: d.notifyEvents, language: d.language, timezone: d.timezone, notifyVia: d.notifyVia,
  };
}

export default function AddUser() {
  const { id } = useParams();
  const editId = id ? Number(id) : null;
  const navigate = useNavigate();
  const isSuper = session.user()?.role === "SUPER_ADMIN";
  const own = session.user()?.institutionId ?? null;
  const { roles, modules, name: roleName } = useRoles();

  const [f, setF] = useState<F>(() => blank(isSuper ? null : own));
  const [step, setStep] = useState(1);
  const [reached, setReached] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(editId !== null);
  const [showPw, setShowPw] = useState(false);
  const [roleQ, setRoleQ] = useState("");
  const [instQ, setInstQ] = useState("");
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [years, setYears] = useState<{ id: number; name: string }[]>([]);
  const [done, setDone] = useState<{ name: string; password: string | null } | null>(null);

  const set = <K extends keyof F>(k: K, v: F[K]) => { setF((cur) => ({ ...cur, [k]: v })); setErrors((e) => { if (!(k in e)) return e; const n = { ...e }; delete n[k as string]; return n; }); };
  const toggle = (k: "roles" | "notifyEvents" | "notifyVia", v: string) => set(k, f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v]);

  useEffect(() => {
    if (editId === null) return;
    api.userAdmin.get(editId).then((d) => { setF(fromDetail(d)); setReached(6); }).catch((e) => setError(errText(e))).finally(() => setLoading(false));
  }, [editId]);
  useEffect(() => {
    if (!isSuper) return;
    api.institutions.list({ status: "ALL" }).then((l) => setInstitutions(l.filter((i) => i.status !== "ARCHIVED"))).catch((e) => setError(errText(e)));
  }, [isSuper]);
  useEffect(() => {
    if (f.institutionId === null) { setYears([]); return; }
    api.userAdmin.years(f.institutionId).then(setYears).catch(() => setYears([]));
  }, [f.institutionId]);

  function changeType(t: UserType) {
    const wasDefault = f.roles.length === 0 || (f.roles.length === 1 && f.roles[0] === defaultRole[f.userType]);
    setF((cur) => ({ ...cur, userType: t, roles: wasDefault ? (defaultRole[t] ? [defaultRole[t]] : []) : cur.roles }));
  }

  function check(s: number): Record<string, string> {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!f.firstName.trim()) e.firstName = "Required."; if (!f.lastName.trim()) e.lastName = "Required.";
      if (!f.email.trim()) e.email = "Required."; else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) e.email = "Enter a valid email address.";
      if (!f.phone.trim()) e.phone = "Required.";
      if (f.passwordMode === "CUSTOM" && editId === null && !f.password) e.password = "Enter a password.";
    }
    if (s === 2 && f.roles.length === 0) e.roles = "Select at least one role.";
    if (s === 3 && f.institutionId === null) e.institutionId = "Select an institution.";
    return e;
  }
  function next() {
    const e = check(step);
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({}); setError("");
    setStep(step + 1); setReached(Math.max(reached, step + 1));
  }
  function goto(s: number) { if (s <= reached) { setStep(s); setErrors({}); } }

  async function submit() {
    for (let s = 1; s <= 3; s++) { const e = check(s); if (Object.keys(e).length) { setErrors(e); setStep(s); return; } }
    setSaving(true); setError("");
    try {
      if (editId === null) {
        const r = await api.userAdmin.create(toBody(f));
        setDone({ name: r.user.fullName, password: r.temporaryPassword });
      } else {
        await api.userAdmin.update(editId, toBody(f));
        navigate("/users");
      }
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(e.fieldErrors);
        const first = Object.keys(e.fieldErrors).map((k) => stepOf[k] ?? 6).sort((a, b) => a - b)[0];
        if (first && first < 6) setStep(first);
      }
      setError(errText(e));
    } finally { setSaving(false); }
  }

  const access = useMemo(() => modules.map((m) => {
    const lv = roles.filter((r) => f.roles.includes(r.code)).flatMap((r) => r.permissions.filter((p) => p.module === m).map((p) => p.level));
    return { module: m, level: lv.includes("MANAGE") ? "Manage" : lv.length ? "View" : "None" };
  }), [roles, modules, f.roles]);

  const instName = institutions.find((i) => i.id === f.institutionId)?.name ?? (f.institutionId === own ? "Your institution" : "—");
  const fullName = `${f.firstName} ${f.lastName}`.trim();
  const isEdit = editId !== null;

  if (done) {
    return (
      <AdminLayout activeItem="Users">
        <div className="space-y-3">
          <UsersHeader title="User created" subtitle={`${done.name}'s account is ready.`} />
          {done.password && <TempPassword who={done.name} password={done.password} onClose={() => setDone({ ...done, password: null })} />}
          {!done.password && <Notice tone="info">The account was created with the password you set.</Notice>}
          <div className="flex gap-2.5"><Link to="/users"><PrimaryButton type="button">Back to Users</PrimaryButton></Link><OutlineButton type="button" onClick={() => { setDone(null); setF(blank(isSuper ? null : own)); setStep(1); setReached(1); }}>Add another user</OutlineButton></div>
        </div>
      </AdminLayout>
    );
  }

  const roleList = roles.filter((r) => `${r.name} ${r.description}`.toLowerCase().includes(roleQ.toLowerCase()));
  const instList = institutions.filter((i) => i.name.toLowerCase().includes(instQ.toLowerCase()));

  return (
    <AdminLayout activeItem="Users">
      <div className="space-y-3">
        <nav className="px-1 text-[10px] text-[#53658f]"><Link to="/users" className="hover:underline">Users</Link> › <span className="font-semibold text-blue-700">{isEdit ? "Edit User" : "Add User"}</span></nav>
        <UsersHeader title={isEdit ? "Edit User" : "Add User"} subtitle={isEdit ? "Update this user's details, roles and access." : "Create a new user and assign their role, permissions and access details."}
          right={<Link to="/users"><OutlineButton type="button"><ArrowLeft size={13} /> Back to Users</OutlineButton></Link>} />

        <div className="overflow-x-auto">
          <ol className="grid min-w-[760px] grid-cols-6 gap-2">
            {steps.map((label, i) => {
              const n = i + 1;
              return (
                <li key={label}>
                  <button type="button" onClick={() => goto(n)} disabled={n > reached} aria-current={step === n ? "step" : undefined}
                    className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[11px] font-semibold ${step === n ? "border-blue-400 bg-[#dcecff] text-blue-800" : "border-[#d8e9fb] bg-white text-[#34467a]"} disabled:opacity-60`}>
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] ${step === n ? "bg-blue-600 text-white" : n < step ? "bg-emerald-500 text-white" : "bg-[#e3edfb] text-[#34467a]"}`}>{n < step ? <Check size={12} /> : n}</span>{label}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        {error && <Notice tone="error"><span className="font-bold">Please review:</span> {error}</Notice>}
        {loading && <Notice tone="info">Loading user...</Notice>}

        {step === 1 && (
          <>
            <div className="grid gap-3 lg:grid-cols-2">
              <Panel>
                <PanelTitle title="Basic Information" />
                <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2">
                  <Field label="User Type" required className="sm:col-span-2">
                    <select className={controlClass} value={f.userType} onChange={(e) => changeType(e.target.value as UserType)}>{userTypes.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select><Err errors={errors} k="userType" />
                  </Field>
                  <Field label="First Name" required><input className={controlClass} value={f.firstName} maxLength={100} onChange={(e) => set("firstName", e.target.value)} /><Err errors={errors} k="firstName" /></Field>
                  <Field label="Last Name" required><input className={controlClass} value={f.lastName} maxLength={100} onChange={(e) => set("lastName", e.target.value)} /><Err errors={errors} k="lastName" /></Field>
                  <Field label="Email Address" required className="sm:col-span-2"><input className={controlClass} type="email" value={f.email} maxLength={200} onChange={(e) => set("email", e.target.value)} /><Err errors={errors} k="email" /></Field>
                  <Field label="Phone Number" required>
                    <div className="flex gap-2"><select className={`${controlClass} !w-[84px]`} value={f.phoneCode} onChange={(e) => set("phoneCode", e.target.value)}>{codes.map((c) => <option key={c}>{c}</option>)}</select>
                      <input className={controlClass} inputMode="numeric" value={f.phone} maxLength={16} onChange={(e) => set("phone", e.target.value)} /></div><Err errors={errors} k="phone" /><Err errors={errors} k="phoneCode" />
                  </Field>
                  <Field label="Date of Birth" optional><input className={controlClass} type="date" max={today()} value={f.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} /><Err errors={errors} k="dateOfBirth" /></Field>
                  <Field label="Gender" optional><select className={controlClass} value={f.gender} onChange={(e) => set("gender", e.target.value)}>{genders.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select><Err errors={errors} k="gender" /></Field>
                  <div className="flex items-center gap-3 sm:col-span-2"><Avatar name={fullName || "?"} size={44} /><span className="text-[10px] text-slate-500">Profile photo upload isn't available yet. Initials are shown instead.</span></div>
                </div>
              </Panel>
              <Panel>
                <PanelTitle title="Login & Security" />
                <div className="space-y-3 px-4 pb-4 text-[11px] text-[#17245e]">
                  {isEdit ? <Notice tone="info">To change this user's password, use Reset Password on the Users page.</Notice> : (
                    <>
                      <div className="flex flex-wrap gap-5">
                        <label className="flex items-center gap-2"><input type="radio" name="pw" checked={f.passwordMode === "AUTO"} onChange={() => set("passwordMode", "AUTO")} /> Auto-generate password</label>
                        <label className="flex items-center gap-2"><input type="radio" name="pw" checked={f.passwordMode === "CUSTOM"} onChange={() => set("passwordMode", "CUSTOM")} /> Set custom password</label>
                      </div>
                      {f.passwordMode === "CUSTOM" ? (
                        <div><div className="relative"><input className={`${controlClass} pr-9`} type={showPw ? "text" : "password"} autoComplete="new-password" value={f.password} onChange={(e) => set("password", e.target.value)} placeholder="Enter a password" />
                          <button type="button" aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500">{showPw ? <EyeOff size={14} /> : <Eye size={14} />}</button></div>
                          <Err errors={errors} k="password" /><div className="mt-1 text-[10px] text-slate-500">Must meet your institution's password policy.</div></div>
                      ) : <Notice tone="info">A secure password will be generated and shown once after the user is created. Email delivery isn't set up yet, so please share it securely.</Notice>}
                    </>
                  )}
                  <label className="flex items-center gap-2"><input type="checkbox" checked={f.mustChangePassword} onChange={(e) => set("mustChangePassword", e.target.checked)} /> User must change password on first login</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={f.twoFactor} onChange={(e) => set("twoFactor", e.target.checked)} /> Enable two-factor authentication (if enabled)</label>
                  <div className="flex items-center gap-2"><label className="flex items-center gap-2"><input type="checkbox" checked={f.resetEnabled} onChange={(e) => set("resetEnabled", e.target.checked)} /> Force password reset after (days)</label>
                    <input className={`${controlClass} !w-[80px]`} type="number" min={1} max={730} disabled={!f.resetEnabled} value={f.resetAfterDays} onChange={(e) => set("resetAfterDays", e.target.value)} /></div>
                  <Err errors={errors} k="resetAfterDays" />
                  <p className="text-[10px] text-slate-500">These preferences are saved with the account. They aren't enforced at sign-in yet.</p>
                </div>
              </Panel>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              <Panel>
                <PanelTitle title="Status" />
                <div className="flex flex-wrap gap-5 px-4 pb-4 text-[11px] text-[#17245e]">
                  {(Object.keys(statusLabels) as UserStatus[]).map((s) => <label key={s} className="flex items-center gap-2"><input type="radio" name="status" checked={f.status === s} onChange={() => set("status", s)} /> {statusLabels[s]}</label>)}
                  <Err errors={errors} k="status" />
                </div>
              </Panel>
              <Panel>
                <PanelTitle title="Account Validity" />
                <div className="grid grid-cols-2 gap-3 px-4 pb-4">
                  <Field label="Valid From"><input className={controlClass} type="date" value={f.validFrom} onChange={(e) => set("validFrom", e.target.value)} /><Err errors={errors} k="validFrom" /></Field>
                  <Field label="Valid To" optional><input className={controlClass} type="date" min={f.validFrom || undefined} value={f.validTo} onChange={(e) => set("validTo", e.target.value)} /><Err errors={errors} k="validTo" /></Field>
                  <p className="col-span-2 text-[10px] text-slate-500">Sign-in is blocked outside these dates.</p>
                </div>
              </Panel>
              <Panel>
                <PanelTitle title="Notes" />
                <div className="px-4 pb-4"><textarea className={textareaClass} maxLength={500} value={f.notes} placeholder="Enter notes (optional)..." onChange={(e) => set("notes", e.target.value)} /><div className="text-right text-[10px] text-slate-400">{f.notes.length}/500</div><Err errors={errors} k="notes" /></div>
              </Panel>
            </div>
          </>
        )}

        {step === 2 && (
          <div className="grid gap-3 lg:grid-cols-2">
            <Panel>
              <PanelTitle title="Assign Role(s)" />
              <div className="space-y-2 px-4 pb-4">
                <p className="text-[10px] text-slate-500">Select one or more roles. The first role you select is the primary role.</p>
                <SearchBox value={roleQ} onChange={setRoleQ} placeholder="Search roles..." />
                <table className="w-full border-collapse text-[10px]">
                  <thead><tr className="bg-[#f5f9ff] text-left text-[#13205f]"><th className="w-8 border border-blue-100 px-2 py-2" /><th className="border border-blue-100 px-2 py-2">Role Name</th><th className="border border-blue-100 px-2 py-2">Description</th></tr></thead>
                  <tbody>{roleList.map((r) => (
                    <tr key={r.code} className="cursor-pointer hover:bg-blue-50/50" onClick={() => toggle("roles", r.code)}>
                      <td className="border border-blue-50 px-2 py-2"><input type="checkbox" aria-label={r.name} checked={f.roles.includes(r.code)} onChange={() => toggle("roles", r.code)} onClick={(e) => e.stopPropagation()} /></td>
                      <td className="border border-blue-50 px-2 py-2 font-semibold text-[#17245e]">{r.name}{f.roles[0] === r.code && <span className="ml-1.5"><Pill tone="blue">Primary</Pill></span>}</td>
                      <td className="border border-blue-50 px-2 py-2 text-[#33477c]">{r.description}</td>
                    </tr>))}</tbody>
                </table>
                <Err errors={errors} k="roles" />
              </div>
            </Panel>
            <Panel>
              <PanelTitle title="Permission Details" />
              <div className="space-y-2 px-4 pb-4">
                <p className="text-[10px] text-slate-500">Modules covered by the selected role(s).</p>
                <table className="w-full border-collapse text-[10px]"><tbody>{access.map((a) => (
                  <tr key={a.module}><td className="border border-blue-50 px-2 py-2 text-[#33477c]">{a.module}</td><td className="border border-blue-50 px-2 py-2"><Pill tone={a.level === "Manage" ? "green" : a.level === "View" ? "blue" : "gray"}>{a.level}</Pill></td></tr>))}</tbody></table>
                <p className="text-[10px] text-slate-500">For reference only. What a user can open today follows their account type; per-module permissions are not enforced yet.</p>
              </div>
            </Panel>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-3 lg:grid-cols-2">
            <Panel>
              <PanelTitle title="Institution Access" />
              <div className="space-y-2 px-4 pb-4">
                {!isSuper ? <Notice tone="info">This user will belong to your institution.</Notice> : (
                  <>
                    <p className="text-[10px] text-slate-500">Choose the institution this user belongs to.</p>
                    <SearchBox value={instQ} onChange={setInstQ} placeholder="Search institutions..." />
                    <ul className="max-h-[320px] divide-y divide-[#eef4fc] overflow-y-auto rounded-lg border border-[#e1ecfa] text-[11px]">
                      {instList.length === 0 ? <li className="px-3 py-4 text-center text-slate-400">No institutions found.</li> : instList.map((i) => (
                        <li key={i.id}><label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-blue-50/50">
                          <input type="radio" name="inst" checked={f.institutionId === i.id} onChange={() => { set("institutionId", i.id); set("academicYearId", ""); }} />
                          <span className="flex-1 font-semibold text-[#17245e]">{i.name}</span><Pill tone="gray">{i.institutionType.replace("_", " ").toLowerCase()}</Pill><span className="text-slate-500">{[i.city, i.state].filter(Boolean).join(", ")}</span></label></li>))}
                    </ul>
                  </>
                )}
                <Err errors={errors} k="institutionId" />
              </div>
            </Panel>
            <div className="space-y-3">
              <Panel>
                <PanelTitle title="Access Scope" />
                <div className="px-4 pb-4"><Field label="Academic Year" optional>
                  <select className={controlClass} value={f.academicYearId} onChange={(e) => set("academicYearId", e.target.value)}><option value="">All years</option>{years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</select><Err errors={errors} k="academicYearId" /></Field></div>
              </Panel>
              <Panel>
                <PanelTitle title="Data Access Restrictions" />
                <div className="space-y-2 px-4 pb-4 text-[11px] text-[#17245e]">
                  {scopes.map(([k, l]) => <label key={k} className="flex items-center gap-2"><input type="radio" name="scope" checked={f.dataScope === k} onChange={() => set("dataScope", k)} /> {l}</label>)}
                  <Err errors={errors} k="dataScope" />
                  <p className="text-[10px] text-slate-500">Saved with the account; not enforced yet. Class and section limits aren't available yet.</p>
                </div>
              </Panel>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-3">
              <Panel>
                <PanelTitle title="Employment Details" />
                <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2">
                  <Field label="Employee / Staff ID" optional><input className={controlClass} value={f.employeeId} maxLength={40} onChange={(e) => set("employeeId", e.target.value)} /><Err errors={errors} k="employeeId" /></Field>
                  <Field label="Department" optional><input className={controlClass} value={f.department} maxLength={80} onChange={(e) => set("department", e.target.value)} /><Err errors={errors} k="department" /></Field>
                  <Field label="Designation" optional><input className={controlClass} value={f.designation} maxLength={80} onChange={(e) => set("designation", e.target.value)} /><Err errors={errors} k="designation" /></Field>
                  <Field label="Date of Joining" optional><input className={controlClass} type="date" value={f.joinedOn} onChange={(e) => set("joinedOn", e.target.value)} /><Err errors={errors} k="joinedOn" /></Field>
                </div>
              </Panel>
              <Panel>
                <PanelTitle title="Address" />
                <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-3">
                  <Field label="Address Line 1" optional className="sm:col-span-3"><input className={controlClass} value={f.address1} maxLength={150} onChange={(e) => set("address1", e.target.value)} /></Field>
                  <Field label="Address Line 2" optional className="sm:col-span-3"><input className={controlClass} value={f.address2} maxLength={150} onChange={(e) => set("address2", e.target.value)} /></Field>
                  <Field label="City" optional><input className={controlClass} value={f.city} maxLength={80} onChange={(e) => set("city", e.target.value)} /></Field>
                  <Field label="State" optional><input className={controlClass} value={f.state} maxLength={80} onChange={(e) => set("state", e.target.value)} /></Field>
                  <Field label="PIN Code" optional><input className={controlClass} value={f.pinCode} maxLength={12} onChange={(e) => set("pinCode", e.target.value)} /></Field>
                </div>
              </Panel>
            </div>
            <Panel>
              <PanelTitle title="Additional Information" />
              <div className="grid grid-cols-1 gap-3 px-4 pb-4">
                <Field label="Alternate Email" optional><input className={controlClass} type="email" value={f.altEmail} maxLength={200} onChange={(e) => set("altEmail", e.target.value)} /><Err errors={errors} k="altEmail" /></Field>
                <Field label="Emergency Contact" optional><input className={controlClass} value={f.emergencyContact} maxLength={30} onChange={(e) => set("emergencyContact", e.target.value)} /><Err errors={errors} k="emergencyContact" /></Field>
              </div>
            </Panel>
          </div>
        )}

        {step === 5 && (
          <div className="grid gap-3 lg:grid-cols-2">
            <Panel>
              <PanelTitle title="Email Notifications" />
              <div className="space-y-2.5 px-4 pb-4">
                <p className="text-[10px] text-slate-500">Select the notifications this user should receive.</p>
                {events.map(([k, l]) => <div key={k}><Toggle checked={f.notifyEvents.includes(k)} onChange={() => toggle("notifyEvents", k)} label={l} /></div>)}
                <Err errors={errors} k="notifyEvents" />
              </div>
            </Panel>
            <Panel>
              <PanelTitle title="Notification Preferences" />
              <div className="space-y-3 px-4 pb-4 text-[11px] text-[#17245e]">
                <Field label="Language"><select className={controlClass} value={f.language} onChange={(e) => set("language", e.target.value)}>{languageOpts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
                <Field label="Time Zone"><select className={controlClass} value={f.timezone} onChange={(e) => set("timezone", e.target.value)}>{timezoneOpts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
                <div><div className="mb-1 text-[11px] font-bold">Notify Via</div>
                  <div className="space-y-1.5">{via.map(([k, l]) => <label key={k} className="flex items-center gap-2"><input type="checkbox" checked={f.notifyVia.includes(k)} onChange={() => toggle("notifyVia", k)} /> {l}</label>)}</div><Err errors={errors} k="notifyVia" /></div>
                <p className="text-[10px] text-slate-500">Preferences are saved with the account. Sending notifications is not set up yet.</p>
              </div>
            </Panel>
          </div>
        )}

        {step === 6 && (
          <>
            <p className="px-1 text-[11px] text-[#425585]">Review the details below and click {isEdit ? "Save Changes" : "Create User"} to complete the process.</p>
            <div className="grid gap-3 lg:grid-cols-3">
              <Review title="Basic Information" onEdit={() => setStep(1)} rows={[["Name", fullName], ["Email", f.email], ["Phone", `${f.phoneCode} ${f.phone}`], ["Date of Birth", fmtDay(f.dateOfBirth || null)], ["Gender", f.gender ? f.gender.charAt(0) + f.gender.slice(1).toLowerCase() : "—"],
                ["User Type", typeLabel(f.userType)], ["Status", statusLabels[f.status]], ["Valid", `${fmtDay(f.validFrom || null)} → ${f.validTo ? fmtDay(f.validTo) : "No end date"}`]]} />
              <Review title="Role & Permissions" onEdit={() => setStep(2)} rows={[["Roles", f.roles.map(roleName).join(", ") || "—"], ["Modules", access.filter((a) => a.level !== "None").map((a) => `${a.module} (${a.level.toLowerCase()})`).join(", ") || "—"]]} />
              <Review title="Institution & Access" onEdit={() => setStep(3)} rows={[["Institution", instName], ["Academic Year", years.find((y) => String(y.id) === f.academicYearId)?.name ?? "All years"], ["Access Scope", scopes.find(([k]) => k === f.dataScope)?.[1] ?? "—"]]} />
              <Review title="Additional Details" onEdit={() => setStep(4)} rows={[["Employee ID", f.employeeId || "—"], ["Department", f.department || "—"], ["Designation", f.designation || "—"], ["Date of Joining", fmtDay(f.joinedOn || null)],
                ["Address", [f.address1, f.address2, f.city, f.state, f.pinCode].filter(Boolean).join(", ") || "—"]]} />
              <Review title="Notification Settings" onEdit={() => setStep(5)} rows={[["Notifications", f.notifyEvents.map((k) => events.find(([e]) => e === k)?.[1] ?? k).join(", ") || "None"], ["Language", languageOpts.find(([k]) => k === f.language)?.[1] ?? f.language],
                ["Time Zone", timezoneOpts.find(([k]) => k === f.timezone)?.[1] ?? f.timezone], ["Notify Via", f.notifyVia.map((k) => via.find(([v]) => v === k)?.[1] ?? k).join(", ") || "None"]]} />
            </div>
          </>
        )}

        <div className="flex justify-end gap-2.5 pb-2">
          {step > 1 && <OutlineButton type="button" onClick={() => setStep(step - 1)} disabled={saving}><ArrowLeft size={13} /> Back</OutlineButton>}
          <Link to="/users"><OutlineButton type="button" disabled={saving}>Cancel</OutlineButton></Link>
          {step < 6 ? <PrimaryButton type="button" onClick={next}>Next: {steps[step]} <ArrowRight size={13} /></PrimaryButton>
            : <PrimaryButton type="button" onClick={() => void submit()} disabled={saving || loading}>{saving ? "Saving..." : isEdit ? "Save Changes" : "Create User"}</PrimaryButton>}
        </div>
      </div>
    </AdminLayout>
  );
}

function Review({ title, rows, onEdit }: { title: string; rows: (readonly [string, string])[]; onEdit: () => void }) {
  return (
    <Panel>
      <PanelTitle title={title} right={<button type="button" onClick={onEdit} className="text-[11px] font-semibold text-blue-600 hover:underline">Edit</button>} />
      <dl className="space-y-1.5 px-4 pb-4 text-[11px]">{rows.map(([k, v]) => <div key={k} className="grid grid-cols-[110px_1fr] gap-2"><dt className="text-slate-500">{k}</dt><dd className="break-words text-[#17245e]">{v || "—"}</dd></div>)}</dl>
    </Panel>
  );
}
