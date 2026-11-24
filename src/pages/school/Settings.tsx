import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Search, UserPlus, X } from "lucide-react";
import { api, session } from "../../services/api";
import type { SetAll, SetCode, SetUser } from "../../services/api";
import { Field, Notice, OutlineButton, PrimaryButton, controlClass } from "../super-admin/AcademicShared";
import { errText } from "../super-admin/SettingsShared";
import SchoolLayout, { rememberSchoolName } from "./SchoolLayout";
import { Item, Menu, Modal, td } from "./SchoolUi";

type Tab = "General" | "Academic" | "Admissions" | "Fees" | "Users & Access" | "Integrations";
const TABS: Tab[] = ["General", "Academic", "Admissions", "Fees", "Users & Access", "Integrations"];
const fieldErrs = (e: unknown) => { const fe = (e as { fieldErrors?: Record<string, string> }).fieldErrors; return fe && Object.keys(fe).length ? fe : null; };
const ERR = (errs: Record<string, string>, k: string) => (errs[k] ? <p className="mt-1 text-[10px] text-rose-600">{errs[k]}</p> : null);
const SIGN_IN_ROLES = ["ADMINISTRATOR", "TEACHER", "CLASS_TEACHER", "SUBJECT_TEACHER"];
const codeSelect = (value: string, onChange: (v: string) => void, list: SetCode[]) => <select value={value} onChange={(e) => onChange(e.target.value)} className={controlClass}>{list.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}</select>;
const strSelect = (value: string, onChange: (v: string) => void, list: string[]) => <select value={value} onChange={(e) => onChange(e.target.value)} className={controlClass}>{list.map((c) => <option key={c} value={c}>{c}</option>)}</select>;
const Row = ({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) => (
  <div className="grid items-start gap-1 sm:grid-cols-[190px_1fr] sm:gap-4"><span className="pt-1.5 text-[13px] font-bold text-[#101b69]">{label}</span><div className="min-w-0 max-w-xl">{children}{hint && <p className="mt-1 text-[10px] text-slate-500">{hint}</p>}</div></div>
);

type Ctx = { all: SetAll; reload: () => void; flash: (m: string) => void; onError: (m: string) => void };

function useSave(ctx: Ctx) {
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const run = async (fn: () => Promise<unknown>, done: string) => { setBusy(true); setErrs({}); try { await fn(); ctx.flash(done); ctx.reload(); } catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else ctx.onError(errText(e)); } finally { setBusy(false); } };
  return { busy, errs, run };
}
const SaveBar = ({ busy, onClick }: { busy: boolean; onClick: () => void }) => <div className="flex justify-end pt-2"><PrimaryButton type="button" disabled={busy} onClick={onClick}>{busy ? "Saving…" : "Save Changes"}</PrimaryButton></div>;

// ---------------------------------------------------------------- General
function GeneralTab(ctx: Ctx) {
  const { general: g, options: o } = ctx.all;
  const [f, setF] = useState({ name: g.name, academicYearId: g.academicYearId, language: g.language, timeZone: g.timeZone, dateFormat: g.dateFormat });
  const { busy, errs, run } = useSave(ctx);
  const [ver, setVer] = useState(String(Date.now()));
  const [logo, setLogo] = useState(g.hasLogo);
  const [logoBusy, setLogoBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const instId = session.institutionId();
  const upload = async (picked: File | undefined) => {
    if (!picked) return;
    if (picked.size > 2 * 1024 * 1024) { ctx.onError("That image is larger than 2 MB."); return; }
    setLogoBusy(true);
    try { await api.schoolSettings.uploadLogo(picked); setLogo(true); setVer(String(Date.now())); ctx.flash("Logo updated."); } catch (e) { ctx.onError(errText(e)); } finally { setLogoBusy(false); if (file.current) file.current.value = ""; }
  };
  const removeLogo = async () => { setLogoBusy(true); try { await api.schoolSettings.deleteLogo(); setLogo(false); ctx.flash("Logo removed."); } catch (e) { ctx.onError(errText(e)); } finally { setLogoBusy(false); } };
  return (
    <div className="space-y-4">
      <Notice tone="info">School name, academic year and logo take effect straight away. Language, time zone and date format are saved for the school but aren't applied across every screen yet.</Notice>
      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="space-y-3">
          <Row label="School Name"><input value={f.name} maxLength={200} onChange={(e) => setF({ ...f, name: e.target.value })} className={controlClass} />{ERR(errs, "name")}</Row>
          <Row label="Academic Year" hint="The year the rest of the portal opens on."><select value={f.academicYearId ?? ""} onChange={(e) => setF({ ...f, academicYearId: e.target.value ? Number(e.target.value) : null })} className={controlClass}>{o.years.length === 0 && <option value="">No academic year yet</option>}{o.years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</select>{ERR(errs, "academicYearId")}</Row>
          <Row label="Default Language">{strSelect(f.language, (v) => setF({ ...f, language: v }), o.languages)}{ERR(errs, "language")}</Row>
          <Row label="Time Zone">{strSelect(f.timeZone, (v) => setF({ ...f, timeZone: v }), o.timeZones)}{ERR(errs, "timeZone")}</Row>
          <Row label="Date Format">{strSelect(f.dateFormat, (v) => setF({ ...f, dateFormat: v }), o.dateFormats)}{ERR(errs, "dateFormat")}</Row>
        </div>
        <div>
          <p className="mb-1 text-[12px] font-bold text-[#101b69]">School Logo</p>
          <div className="space-y-2 rounded-xl border-2 border-dashed border-blue-300 p-4 text-center">
            {logo && instId ? <img src={api.institutions.imageUrl(instId, "logo", ver)} alt="School logo" className="mx-auto h-20 w-20 rounded object-contain" /> : <p className="py-4 text-[12px] text-slate-500">No logo uploaded</p>}
            <p className="text-[10px] text-slate-500">PNG, JPG or WEBP (max 2 MB)</p>
            <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} />
            <div className="flex justify-center gap-2"><PrimaryButton type="button" disabled={logoBusy} onClick={() => file.current?.click()}>Choose File</PrimaryButton>{logo && <OutlineButton type="button" disabled={logoBusy} onClick={() => void removeLogo()}>Remove</OutlineButton>}</div>
          </div>
        </div>
      </div>
      <SaveBar busy={busy} onClick={() => void run(async () => { await api.schoolSettings.saveGeneral(f); rememberSchoolName(f.name.trim()); }, "General settings saved.")} />
    </div>
  );
}

// ---------------------------------------------------------------- Academic
function AcademicTab(ctx: Ctx) {
  const a = ctx.all.academic;
  const [f, setF] = useState({ gradingScale: a.gradingScale, periodDuration: String(a.periodDuration), attendancePerPeriod: a.attendancePerPeriod, lateMarkingAllowed: a.lateMarkingAllowed, lateMarkingMinutes: String(a.lateMarkingMinutes) });
  const { busy, errs, run } = useSave(ctx);
  return (
    <div className="space-y-4">
      <Notice tone="info">These are saved for the school. Attendance isn't built yet, so the attendance rules aren't applied anywhere, and the period length isn't used by the timetable grid yet.</Notice>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-3">
          <Row label="Academic Terms" hint="Read-only. Terms are set up by your platform administrator."><input readOnly value={a.termsSummary} className={`${controlClass} bg-slate-50`} /></Row>
          <Row label="Grades & Sections" hint="Read-only. Manage grades and sections in Academics."><input readOnly value={a.gradesSummary} className={`${controlClass} bg-slate-50`} /></Row>
          <Row label="Attendance Rules">
            <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={f.attendancePerPeriod} onChange={(e) => setF({ ...f, attendancePerPeriod: e.target.checked })} />Mark attendance for every period</label>
            <label className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px]"><input type="checkbox" checked={f.lateMarkingAllowed} onChange={(e) => setF({ ...f, lateMarkingAllowed: e.target.checked })} />Allow late marking (within<input type="number" min={1} max={120} value={f.lateMarkingMinutes} disabled={!f.lateMarkingAllowed} onChange={(e) => setF({ ...f, lateMarkingMinutes: e.target.value })} className={`${controlClass} !w-20`} />minutes)</label>
            {ERR(errs, "lateMarkingMinutes")}
          </Row>
        </div>
        <div className="space-y-3">
          <Field label="Grading Scale">{codeSelect(f.gradingScale, (v) => setF({ ...f, gradingScale: v }), ctx.all.options.gradingScales)}{ERR(errs, "gradingScale")}</Field>
          <Field label="Period Duration"><div className="flex items-center gap-2"><input type="number" min={10} max={180} value={f.periodDuration} onChange={(e) => setF({ ...f, periodDuration: e.target.value })} className={`${controlClass} !w-24`} /><span className="text-[12px] text-slate-600">minutes</span></div>{ERR(errs, "periodDuration")}</Field>
        </div>
      </div>
      <SaveBar busy={busy} onClick={() => void run(() => api.schoolSettings.saveAcademic({ gradingScale: f.gradingScale, periodDuration: f.periodDuration === "" ? null : Number(f.periodDuration), attendancePerPeriod: f.attendancePerPeriod, lateMarkingAllowed: f.lateMarkingAllowed, lateMarkingMinutes: f.lateMarkingMinutes === "" ? null : Number(f.lateMarkingMinutes) }), "Academic settings saved.")} />
    </div>
  );
}

// ---------------------------------------------------------------- Admissions
function AdmissionsTab(ctx: Ctx) {
  const d = ctx.all.admissions;
  const [f, setF] = useState({ yearId: d.yearId, opens: d.opens ?? "", closes: d.closes ?? "", documents: d.documents, workflow: d.workflow });
  const [extra, setExtra] = useState("");
  const { busy, errs, run } = useSave(ctx);
  const all = [...ctx.all.options.documents, ...f.documents.filter((x) => !ctx.all.options.documents.includes(x))];
  const toggle = (x: string) => setF((s) => ({ ...s, documents: s.documents.includes(x) ? s.documents.filter((y) => y !== x) : [...s.documents, x] }));
  return (
    <div className="space-y-4">
      <Notice tone="info">These are saved for the school's records. The application window, document list and approval workflow aren't enforced by the Admissions screen yet.</Notice>
      <div className="space-y-3">
        <Row label="Admission Cycle"><select value={f.yearId ?? ""} onChange={(e) => setF({ ...f, yearId: e.target.value ? Number(e.target.value) : null })} className={controlClass}><option value="">Not set</option>{ctx.all.options.years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</select>{ERR(errs, "yearId")}</Row>
        <Row label="Application Opens"><input type="date" value={f.opens} onChange={(e) => setF({ ...f, opens: e.target.value })} className={controlClass} />{ERR(errs, "opens")}</Row>
        <Row label="Application Closes"><input type="date" value={f.closes} min={f.opens || undefined} onChange={(e) => setF({ ...f, closes: e.target.value })} className={controlClass} />{ERR(errs, "closes")}</Row>
        <Row label="Required Documents">
          <div className="flex flex-wrap gap-1.5 rounded-lg border border-[#cfe0f6] bg-white p-2">{all.map((x) => <button key={x} type="button" aria-pressed={f.documents.includes(x)} onClick={() => toggle(x)} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold ${f.documents.includes(x) ? "border-[#0875fb] bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{x}{f.documents.includes(x) && <X size={11} />}</button>)}</div>
          <div className="mt-2 flex gap-2"><input value={extra} maxLength={40} onChange={(e) => setExtra(e.target.value)} placeholder="Add another document" className={controlClass} /><OutlineButton type="button" onClick={() => { const v = extra.trim(); if (v && !f.documents.includes(v)) setF({ ...f, documents: [...f.documents, v] }); setExtra(""); }}>Add</OutlineButton></div>
          {ERR(errs, "documents")}
        </Row>
        <Row label="Approval Workflow">{codeSelect(f.workflow, (v) => setF({ ...f, workflow: v }), ctx.all.options.workflows)}{ERR(errs, "workflow")}</Row>
      </div>
      <SaveBar busy={busy} onClick={() => void run(() => api.schoolSettings.saveAdmissions({ yearId: f.yearId, opens: f.opens || null, closes: f.closes || null, documents: f.documents, workflow: f.workflow }), "Admission settings saved.")} />
    </div>
  );
}

// ---------------------------------------------------------------- Fees
function FeesTab(ctx: Ctx) {
  const x = ctx.all.fees;
  const [f, setF] = useState({ currency: x.currency, billingFrequency: x.billingFrequency, dueDateRule: x.dueDateRule, lateFeeRule: x.lateFeeRule, lateFeeAmount: String(x.lateFeeAmount || ""), receiptPrefix: x.receiptPrefix });
  const { busy, errs, run } = useSave(ctx);
  const o = ctx.all.options;
  return (
    <div className="space-y-4">
      <Notice tone="info">These are saved for the school's records. Fee screens don't use them yet: receipts keep their current numbering, invoices aren't scheduled by billing frequency, and late fees aren't calculated automatically.</Notice>
      <div className="space-y-3">
        <Row label="Currency">{strSelect(f.currency, (v) => setF({ ...f, currency: v }), o.currencies)}{ERR(errs, "currency")}</Row>
        <Row label="Billing Frequency">{codeSelect(f.billingFrequency, (v) => setF({ ...f, billingFrequency: v }), o.billing)}{ERR(errs, "billingFrequency")}</Row>
        <Row label="Due Date Rule">{codeSelect(f.dueDateRule, (v) => setF({ ...f, dueDateRule: v }), o.dueRules)}{ERR(errs, "dueDateRule")}</Row>
        <Row label="Late Fee Rule">
          <div className="flex gap-2">{codeSelect(f.lateFeeRule, (v) => setF({ ...f, lateFeeRule: v }), o.lateRules)}{f.lateFeeRule !== "NONE" && <input type="number" min={0} value={f.lateFeeAmount} onChange={(e) => setF({ ...f, lateFeeAmount: e.target.value })} placeholder="Amount" aria-label="Late fee amount" className={`${controlClass} !w-32`} />}</div>
          {ERR(errs, "lateFeeRule")}{ERR(errs, "lateFeeAmount")}
        </Row>
        <Row label="Receipt Number Prefix"><input value={f.receiptPrefix} maxLength={20} onChange={(e) => setF({ ...f, receiptPrefix: e.target.value })} className={controlClass} />{ERR(errs, "receiptPrefix")}</Row>
      </div>
      <SaveBar busy={busy} onClick={() => void run(() => api.schoolSettings.saveFees({ currency: f.currency, billingFrequency: f.billingFrequency, dueDateRule: f.dueDateRule, lateFeeRule: f.lateFeeRule, lateFeeAmount: f.lateFeeAmount === "" ? null : Number(f.lateFeeAmount), receiptPrefix: f.receiptPrefix }), "Fee settings saved.")} />
    </div>
  );
}

// ---------------------------------------------------------------- Users & Access
function UsersTab({ all, flash, onError }: Ctx) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [rows, setRows] = useState<SetUser[] | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [invite, setInvite] = useState(false);
  const [roles, setRoles] = useState(false);
  const [secret, setSecret] = useState<{ title: string; text: string; note: string } | null>(null);
  const roleName = (c: string) => all.options.roles.find((r) => r.code === c)?.label ?? c;
  const load = useCallback(() => { api.schoolSettings.users(q, role).then(setRows).catch((e) => onError(errText(e))); }, [q, role, onError]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  const act = async (fn: () => Promise<unknown>, ok?: string) => { try { await fn(); if (ok) flash(ok); load(); } catch (e) { onError(errText(e)); } };
  const [f, setF] = useState({ firstName: "", lastName: "", email: "", phone: "", role: "TEACHER" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true); setErrs({});
    try {
      const r = await api.schoolSettings.invite(f);
      setInvite(false); setF({ firstName: "", lastName: "", email: "", phone: "", role: "TEACHER" }); load();
      setSecret({ title: "User created", text: r.temporaryPassword ?? "", note: `Share this temporary password with ${r.user.fullName} yourself; no email is sent. ${r.canSignIn ? "They must change it at first sign-in." : "This role can't sign in yet, so the account is kept as a record."}` });
    } catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else onError(errText(e)); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-4">
      <Notice tone="info">Only the Administrator and Teacher roles can sign in today. Other roles are saved with the account, and those accounts can't sign in yet. Invites don't send an email: you'll be shown a temporary password to pass on.</Notice>
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[220px] flex-1 sm:max-w-sm"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users by name or email…" className={`${controlClass} pl-9`} /></label>
        <label className="flex items-center gap-2 text-[12px] font-bold text-[#101b69]">Role<select value={role} onChange={(e) => setRole(e.target.value)} className={`${controlClass} !w-44`}><option value="">All Roles</option>{all.options.roles.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}</select></label>
        <PrimaryButton type="button" className="ml-auto" onClick={() => { setErrs({}); setInvite(true); }}><UserPlus size={14} />Invite User</PrimaryButton>
      </div>
      <div className="overflow-x-auto rounded-lg border border-[#cfe0f6]"><table className="w-full min-w-[620px] border-collapse text-left text-[13px]">
        <thead><tr className="bg-[#e8f1fd] text-[#13205f]">{["Name", "Role", "Status", "Action"].map((h) => <th key={h} className="border-b border-[#cfe0f6] px-4 py-2.5 font-bold">{h}</th>)}</tr></thead>
        <tbody>
          {rows && rows.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-[12px] text-slate-500">No users found.</td></tr>}
          {!rows && <tr><td colSpan={4} className="px-4 py-8 text-center text-[12px] text-slate-500">Loading…</td></tr>}
          {rows?.map((u) => (
            <tr key={u.id}>
              <td className={td}><div className="font-semibold">{u.fullName}{u.self && <span className="ml-1.5 text-[10px] font-normal text-slate-500">(you)</span>}</div><div className="text-[11px] text-slate-500">{u.email}</div></td>
              <td className={td}><select aria-label={`Role for ${u.fullName}`} disabled={u.self} value={u.role} onChange={(e) => void act(() => api.schoolSettings.setRole(u.id, e.target.value), "Role updated.")} className={`${controlClass} !w-48`}>{all.options.roles.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}</select>{!u.canSignIn && <div className="mt-0.5 text-[10px] text-slate-500">Can't sign in yet</div>}</td>
              <td className={td}><span className={`inline-block rounded-full px-3 py-1 text-[11px] font-semibold ${u.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{u.status === "ACTIVE" ? "Active" : u.status === "SUSPENDED" ? "Suspended" : "Inactive"}</span></td>
              <td className={td}>{u.self ? <span className="text-[11px] text-slate-400">—</span> : (
                <Menu id={`u${u.id}`} open={menu} setOpen={setMenu}>
                  <Item onClick={() => { setMenu(null); void act(() => api.schoolSettings.setUserStatus(u.id, u.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"), u.status === "ACTIVE" ? "User deactivated." : "User activated."); }}>{u.status === "ACTIVE" ? "Deactivate" : "Activate"}</Item>
                  <Item onClick={() => { setMenu(null); if (window.confirm(`Reset the password for ${u.fullName}?`)) void act(async () => { const r = await api.schoolSettings.resetPassword(u.id); setSecret({ title: "Password reset", text: r.temporaryPassword, note: `Share this temporary password with ${u.fullName} yourself. It replaces the old password.` }); }); }}>Reset password</Item>
                </Menu>)}</td>
            </tr>))}
        </tbody></table></div>
      <OutlineButton type="button" onClick={() => setRoles(true)}>Manage Roles</OutlineButton>

      {invite && (
        <Modal title="Invite User" onClose={() => setInvite(false)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First name" required><input value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} className={controlClass} />{ERR(errs, "firstName")}</Field>
            <Field label="Last name" required><input value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} className={controlClass} />{ERR(errs, "lastName")}</Field>
          </div>
          <Field label="Email" required><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={controlClass} />{ERR(errs, "email")}</Field>
          <Field label="Phone (+91)" required><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="10-digit mobile number" className={controlClass} />{ERR(errs, "phone")}</Field>
          <Field label="Role" required><select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} className={controlClass}>{all.options.roles.map((r) => <option key={r.code} value={r.code}>{r.label}{SIGN_IN_ROLES.includes(r.code) ? "" : " (can't sign in yet)"}</option>)}</select>{ERR(errs, "role")}</Field>
          <div className="flex justify-end gap-2"><OutlineButton type="button" onClick={() => setInvite(false)}>Cancel</OutlineButton><PrimaryButton type="button" disabled={busy} onClick={() => void send()}>{busy ? "Creating…" : "Create User"}</PrimaryButton></div>
        </Modal>
      )}
      {secret && (
        <Modal title={secret.title} onClose={() => setSecret(null)}>
          <code className="block select-all rounded-lg bg-slate-100 px-3 py-2 text-[14px] font-bold tracking-wide">{secret.text}</code>
          <p className="text-[12px] text-slate-600">{secret.note} It won't be shown again.</p>
          <div className="flex justify-end"><PrimaryButton type="button" onClick={() => setSecret(null)}>Done</PrimaryButton></div>
        </Modal>
      )}
      {roles && (
        <Modal title="Roles" wide onClose={() => setRoles(false)}>
          <p className="text-[12px] text-slate-600">Roles are a fixed list. Custom roles and per-module permissions can't be edited yet. Only Administrator and the teacher roles can sign in today.</p>
          <ul className="grid gap-1.5 sm:grid-cols-2">{all.options.roles.map((r) => <li key={r.code} className="flex items-center justify-between rounded-lg border border-[#e3eefc] px-3 py-2 text-[13px]"><span className="font-semibold">{roleName(r.code)}</span><span className={`text-[10px] ${SIGN_IN_ROLES.includes(r.code) ? "text-emerald-700" : "text-slate-400"}`}>{SIGN_IN_ROLES.includes(r.code) ? "Can sign in" : "No sign-in yet"}</span></li>)}</ul>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Integrations
function IntegrationsTab(ctx: Ctx) {
  const [pick, setPick] = useState<Record<string, string>>(() => Object.fromEntries(ctx.all.integrations.map((i) => [i.service, i.provider ?? ""])));
  const [busy, setBusy] = useState("");
  const save = async (service: string) => { setBusy(service); try { await api.schoolSettings.saveIntegration(service, pick[service] ?? ""); ctx.flash(pick[service] ? "Provider saved." : "Provider cleared."); ctx.reload(); } catch (e) { ctx.onError(errText(e)); } finally { setBusy(""); } };
  return (
    <div className="space-y-4">
      <Notice tone="info">This records which provider the school has chosen. Nothing is connected yet: no payment gateway, messaging service or biometric device is linked, and no credentials are stored.</Notice>
      <div className="overflow-x-auto rounded-lg border border-[#cfe0f6]"><table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
        <thead><tr className="bg-[#e8f1fd] text-[#13205f]">{["Service", "Provider", "Status", "Action"].map((h) => <th key={h} className="border-b border-[#cfe0f6] px-4 py-2.5 font-bold">{h}</th>)}</tr></thead>
        <tbody>{ctx.all.integrations.map((i) => { const changed = (pick[i.service] ?? "") !== (i.provider ?? ""); return (
          <tr key={i.service}>
            <td className={`${td} font-semibold`}>{i.label}</td>
            <td className={td}><select aria-label={`${i.label} provider`} value={pick[i.service] ?? ""} onChange={(e) => setPick({ ...pick, [i.service]: e.target.value })} className={`${controlClass} !w-44`}><option value="">Select Provider</option>{i.providers.map((p) => <option key={p} value={p}>{p}</option>)}</select></td>
            <td className={td}><span className={`inline-block rounded-full px-3 py-1 text-[11px] font-semibold ${i.status === "SELECTED" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-700"}`}>{i.status === "SELECTED" ? "Provider chosen · not connected" : "Not connected"}</span></td>
            <td className={td}><OutlineButton type="button" disabled={!changed || busy === i.service} onClick={() => void save(i.service)}>{busy === i.service ? "Saving…" : "Save"}</OutlineButton></td>
          </tr>); })}</tbody></table></div>
    </div>
  );
}

export default function Settings() {
  const [tab, setTab] = useState<Tab>("General");
  const [all, setAll] = useState<SetAll | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [rev, setRev] = useState(0);
  const reload = useCallback(() => { api.schoolSettings.all().then((r) => { setAll(r); setRev((n) => n + 1); }).catch((e) => setError(errText(e))); }, []);
  useEffect(reload, [reload]);
  const flash = useCallback((m: string) => { setNotice(m); setError(""); setTimeout(() => setNotice(""), 6000); }, []);
  const onError = useCallback((m: string) => setError(m), []);
  const ctx = all ? { all, reload, flash, onError } : null;
  return (
    <SchoolLayout>
      <div className="space-y-4">
        <h1 className="text-[28px] font-extrabold tracking-[-0.5px] text-[#101b69]">Settings</h1>
        <div className="flex flex-wrap gap-2">{TABS.map((t) => <button key={t} type="button" onClick={() => { setTab(t); setError(""); }} className={`rounded-lg px-5 py-2.5 text-[14px] font-semibold ${tab === t ? "bg-[#0875fb] text-white" : "text-[#101b69] hover:bg-blue-50"}`}>{t}</button>)}</div>
        {error && <Notice tone="error">{error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}
        {!ctx && !error && <p className="text-[13px] text-slate-500">Loading…</p>}
        {ctx && (
          <div className="rounded-xl border border-[#d8e9fb] bg-white p-5">
            {tab === "General" && <div key={`g${rev}`}><GeneralTab {...ctx} /></div>}
            {tab === "Academic" && <div key={`a${rev}`}><AcademicTab {...ctx} /></div>}
            {tab === "Admissions" && <div key={`d${rev}`}><AdmissionsTab {...ctx} /></div>}
            {tab === "Fees" && <div key={`f${rev}`}><FeesTab {...ctx} /></div>}
            {tab === "Users & Access" && <UsersTab {...ctx} />}
            {tab === "Integrations" && <div key={`i${rev}`}><IntegrationsTab {...ctx} /></div>}
          </div>
        )}
      </div>
    </SchoolLayout>
  );
}
