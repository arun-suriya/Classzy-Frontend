import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Globe, Image as ImageIcon, Link2, Mail, Palette, Settings as Cog, ShieldCheck, SlidersHorizontal, Users as UsersIcon, X } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../services/api";
import type { PlatformAsset, PlatformSettings as PS, SysIntegration } from "../../services/api";
import { Field, Notice, OutlineButton, Panel, PrimaryButton, Toggle, controlClass } from "./AcademicShared";
import { errText } from "./SettingsShared";
import { UsersHeader } from "./UserShared";

const tabs = [
  ["General", Cog], ["Branding", Palette], ["Email & Notifications", Mail], ["Security", ShieldCheck],
  ["User & Access", UsersIcon], ["Integrations", Link2], ["Localization", Globe], ["System Preferences", SlidersHorizontal],
] as const;
type Tab = (typeof tabs)[number][0];

const langLabel: Record<string, string> = { "en-US": "English (US)", "en-GB": "English (UK)", "en-IN": "English (India)", "hi-IN": "Hindi", "ta-IN": "Tamil", "te-IN": "Telugu", "kn-IN": "Kannada", "ml-IN": "Malayalam", "mr-IN": "Marathi", "bn-IN": "Bengali" };
const zoneLabel: Record<string, string> = {
  "Asia/Kolkata": "(GMT+05:30) India Standard Time", "Asia/Dubai": "(GMT+04:00) Gulf Standard Time", "Asia/Singapore": "(GMT+08:00) Singapore Time", "Asia/Dhaka": "(GMT+06:00) Bangladesh Time",
  "Asia/Kathmandu": "(GMT+05:45) Nepal Time", "Asia/Colombo": "(GMT+05:30) Sri Lanka Time", "Europe/London": "London (GMT/BST)", "America/New_York": "New York (Eastern)",
  "America/Los_Angeles": "Los Angeles (Pacific)", "Australia/Sydney": "Sydney (AEST/AEDT)", UTC: "(GMT+00:00) UTC",
};
const landingLabel: Record<string, string> = { DASHBOARD: "Dashboard", INSTITUTIONS: "Institutions", USERS: "Users", REPORTS: "Reports & Analytics", SUPPORT: "Support & Tickets" };
const dateSample = (f: string) => ({ "DD MMM YYYY": "DD MMM YYYY (12 Oct 2026)", "DD/MM/YYYY": "DD/MM/YYYY (12/10/2026)", "MM/DD/YYYY": "MM/DD/YYYY (10/12/2026)", "YYYY-MM-DD": "YYYY-MM-DD (2026-10-12)" } as Record<string, string>)[f] ?? f;

function Card({ icon, title, sub, right, children }: { icon: ReactNode; title: string; sub: string; right?: ReactNode; children: ReactNode }) {
  return (
    <Panel>
      <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
        <div className="flex items-start gap-3"><span className="mt-0.5 text-blue-600">{icon}</span><div><h2 className="text-[16px] font-extrabold text-[#101b69]">{title}</h2><p className="text-[11px] text-[#46567f]">{sub}</p></div></div>
        {right}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </Panel>
  );
}
function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div><div className="text-[12px] font-semibold text-[#17245e]">{label}</div>{hint && <div className="text-[10px] text-slate-500">{hint}</div>}</div>
      {children}
    </div>
  );
}
function Preview({ onClose, v, logo }: { onClose: () => void; v: Record<string, string>; logo: string | null }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg space-y-3 rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between"><h2 className="text-[15px] font-extrabold text-[#101b69]">Branding preview</h2><button type="button" aria-label="Close" onClick={onClose}><X size={16} /></button></div>
        <div className="overflow-hidden rounded-lg border border-[#d8e9fb]">
          <div className="flex items-center gap-3 px-4 py-3 text-white" style={{ background: v.primaryColor }}>
            {logo ? <img src={logo} alt="" className="h-8 max-w-[120px] rounded bg-white/90 object-contain p-0.5" /> : <span className="grid h-8 w-8 place-items-center rounded bg-white/90 text-[12px] font-bold" style={{ color: v.primaryColor }}>{(v.platformName || "C")[0]}</span>}
            <span className="text-[15px] font-bold">{v.platformName}</span>
          </div>
          <div className="space-y-3 p-4">
            <div className="flex gap-2"><span className="rounded px-3 py-1.5 text-[11px] font-semibold text-white" style={{ background: v.primaryColor }}>Primary</span><span className="rounded px-3 py-1.5 text-[11px] font-semibold text-white" style={{ background: v.secondaryColor }}>Secondary</span><span className="rounded px-3 py-1.5 text-[11px] font-semibold text-white" style={{ background: v.accentColor }}>Accent</span></div>
            <p className="text-[11px] text-slate-500">A sample of how your colours and logo look together. This preview does not change the live portal.</p>
          </div>
        </div>
        <div className="flex justify-end"><OutlineButton onClick={onClose}>Close</OutlineButton></div>
      </div>
    </div>
  );
}

export default function PlatformSettings() {
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("General");
  const [saved, setSaved] = useState<PS | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [favUrl, setFavUrl] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<SysIntegration[] | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const favInput = useRef<HTMLInputElement>(null);

  const loadAsset = useCallback(async (kind: "logo" | "favicon", a: PlatformAsset) => {
    const set = kind === "logo" ? setLogoUrl : setFavUrl;
    if (!a.present) { set((old) => { if (old) URL.revokeObjectURL(old); return null; }); return; }
    try { const b = await api.platform.asset(kind); set((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(b); }); } catch { set(null); }
  }, []);

  const load = useCallback(async () => {
    try { const s = await api.platform.get(); setSaved(s); setForm(s.values); setError(""); void loadAsset("logo", s.logo); void loadAsset("favicon", s.favicon); }
    catch (e) { setError(errText(e)); }
  }, [loadAsset]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (tab === "Integrations" && integrations === null) api.sysmgmt.overview().then((o) => setIntegrations(o.integrations)).catch(() => setIntegrations([])); }, [tab, integrations]);

  const flash = (m: string) => { setNotice(m); setTimeout(() => setNotice(""), 4000); };
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const bool = (k: string) => form[k] === "true";
  const tog = (k: string) => (v: boolean) => set(k, String(v));
  const changed = saved ? Object.keys(form).filter((k) => form[k] !== saved.values[k]) : [];
  const dirty = changed.length > 0;
  const opt = (k: string) => saved?.options[k] ?? [];
  const E = (k: string) => (errs[k] ? <p className="mt-1 text-[10px] text-rose-600">{errs[k]}</p> : null);

  const save = async () => {
    if (!dirty) return; setBusy(true); setErrs({}); setError("");
    const body: Record<string, string> = {}; changed.forEach((k) => { body[k] = form[k]; });
    try { const s = await api.platform.save(body); setSaved(s); setForm(s.values); flash("Settings saved."); }
    catch (e) { const fe = (e as { fieldErrors?: Record<string, string> }).fieldErrors; if (fe) { setErrs(fe); setError("Some settings need attention."); } else setError(errText(e)); }
    finally { setBusy(false); }
  };
  const cancel = () => { if (saved) { setForm(saved.values); setErrs({}); setError(""); } };

  const pick = async (kind: "logo" | "favicon", file: File | undefined) => {
    if (!file) return;
    try { const a = await api.platform.upload(kind, file); setSaved((s) => (s ? { ...s, [kind]: a } : s)); await loadAsset(kind, a); flash(`${kind === "logo" ? "Logo" : "Favicon"} updated.`); }
    catch (e) { setError(errText(e)); }
  };
  const drop = async (kind: "logo" | "favicon") => {
    try { await api.platform.removeAsset(kind); setSaved((s) => (s ? { ...s, [kind]: { present: false, fileName: null, size: 0, updatedAt: null } } : s)); await loadAsset(kind, { present: false, fileName: null, size: 0, updatedAt: null }); flash("Image removed."); }
    catch (e) { setError(errText(e)); }
  };

  const Select = ({ k, items, label }: { k: string; items: string[]; label: (v: string) => string }) => (
    <select value={form[k] ?? ""} onChange={(e) => set(k, e.target.value)} className={controlClass}>{items.map((i) => <option key={i} value={i}>{label(i)}</option>)}</select>
  );
  const Switch = ({ k, label, hint }: { k: string; label: string; hint?: string }) => <Row label={label} hint={hint}><Toggle checked={bool(k)} onChange={tog(k)} /></Row>;

  const general = (
    <Card icon={<Cog size={26} />} title="General Settings" sub="Basic platform configuration and preferences.">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Platform Name" required><input value={form.platformName ?? ""} onChange={(e) => set("platformName", e.target.value)} className={controlClass} />{E("platformName")}</Field>
        <Field label="Support Email"><input type="email" value={form.supportEmail ?? ""} onChange={(e) => set("supportEmail", e.target.value)} className={controlClass} />{E("supportEmail")}</Field>
        <Field label="Default Language"><Select k="defaultLanguage" items={opt("languages")} label={(v) => langLabel[v] ?? v} />{E("defaultLanguage")}</Field>
        <Field label="Default Time Zone"><Select k="timeZone" items={opt("timeZones")} label={(v) => zoneLabel[v] ?? v} />{E("timeZone")}</Field>
        <Field label="Default Date Format"><Select k="dateFormat" items={opt("dateFormats")} label={dateSample} />{E("dateFormat")}</Field>
        <Field label="Default Time Format"><select value={form.timeFormat ?? ""} onChange={(e) => set("timeFormat", e.target.value)} className={controlClass}><option value="12H">12-hour (03:30 PM)</option><option value="24H">24-hour (15:30)</option></select></Field>
        <Field label="Items Per Page"><input type="number" min={5} max={200} value={form.itemsPerPage ?? ""} onChange={(e) => set("itemsPerPage", e.target.value)} className={controlClass} />{E("itemsPerPage")}</Field>
        <Field label="Session Timeout (Minutes)"><input type="number" min={5} max={1440} value={form.sessionTimeoutMinutes ?? ""} onChange={(e) => set("sessionTimeoutMinutes", e.target.value)} className={controlClass} />{E("sessionTimeoutMinutes")}</Field>
      </div>
    </Card>
  );

  const dropBox = (kind: "logo" | "favicon", url: string | null, a: PlatformAsset | undefined, ref: RefObject<HTMLInputElement | null>, hint: string, accept: string) => (
    <div>
      <div className="mb-1 text-[12px] font-semibold text-[#17245e]">{kind === "logo" ? "Platform Logo" : "Browser Favicon"}</div>
      <div onClick={() => ref.current?.click()} className="grid h-36 cursor-pointer place-items-center rounded-lg border border-dashed border-blue-300 bg-[#f8fbff] p-3 text-center hover:bg-blue-50">
        <div className="space-y-1">
          {url ? <img src={url} alt="" className={`mx-auto object-contain ${kind === "logo" ? "max-h-14 max-w-[200px]" : "h-8 w-8"}`} /> : <ImageIcon className="mx-auto text-blue-300" size={28} />}
          <div className="text-[10px] text-[#46567f]">{hint}</div>
        </div>
      </div>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => { void pick(kind, e.target.files?.[0]); e.target.value = ""; }} />
      {a?.present && <button type="button" onClick={() => void drop(kind)} className="mt-1 text-[10px] font-semibold text-rose-600 hover:underline">Remove</button>}
    </div>
  );
  const colorField = (k: string, label: string) => (
    <Field label={label}>
      <div className="flex items-center gap-2 rounded-md border border-[#cfe0f6] bg-white px-2 py-1.5">
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(form[k] ?? "") ? form[k] : "#000000"} onChange={(e) => set(k, e.target.value.toUpperCase())} className="h-6 w-6 shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0" />
        <input value={form[k] ?? ""} onChange={(e) => set(k, e.target.value)} className="w-full min-w-0 text-[12px] outline-none" />
      </div>
      {E(k)}
    </Field>
  );
  const branding = (
    <Card icon={<Palette size={26} />} title="Platform Branding" sub="Customize the platform look and feel." right={<OutlineButton onClick={() => setPreview(true)}><Eye size={13} className="mr-1 inline" />Preview</OutlineButton>}>
      <div className="grid gap-4 sm:grid-cols-[3fr_2fr]">
        {dropBox("logo", logoUrl, saved?.logo, logoInput, "Click to upload (PNG, JPG, WebP, up to 2 MB)", "image/png,image/jpeg,image/webp")}
        {dropBox("favicon", favUrl, saved?.favicon, favInput, "Click to upload (ICO, PNG, up to 2 MB)", "image/png,image/jpeg,image/x-icon,image/vnd.microsoft.icon,.ico")}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">{colorField("primaryColor", "Primary Color")}{colorField("secondaryColor", "Secondary Color")}{colorField("accentColor", "Accent Color")}</div>
    </Card>
  );
  const email = (
    <Card icon={<Mail size={26} />} title="Email & Notification Settings" sub="Configure system email templates and notifications.">
      <Switch k="emailEnabled" label="Send Email Notifications" hint="Enable system email notifications" />
      <div className="mt-2 space-y-3">
        <Field label="From Email Address"><input type="email" value={form.fromEmail ?? ""} onChange={(e) => set("fromEmail", e.target.value)} placeholder="noreply@example.com" className={controlClass} />{E("fromEmail")}</Field>
        <Field label="Reply To Email"><input type="email" value={form.replyToEmail ?? ""} onChange={(e) => set("replyToEmail", e.target.value)} className={controlClass} />{E("replyToEmail")}</Field>
        <Field label="Email Template"><select value={form.emailTemplate ?? ""} onChange={(e) => set("emailTemplate", e.target.value)} className={controlClass}><option value="DEFAULT">Default Template</option><option value="MINIMAL">Minimal</option><option value="BRANDED">Branded</option></select></Field>
      </div>
      <div className="mt-4"><OutlineButton onClick={() => nav("/communications")}>Manage Templates</OutlineButton></div>
    </Card>
  );
  const security = (
    <Card icon={<ShieldCheck size={26} />} title="Security Settings" sub="Manage security and access policies.">
      <Switch k="mfaRequired" label="Enable Two-Factor Authentication (2FA)" />
      <Switch k="strongPasswordPolicy" label="Enforce Strong Password Policy" />
      <Switch k="ssoEnabled" label="Allow Single Sign-On (SSO)" />
      <Switch k="ipAllowlistEnabled" label="IP Allowlist" />
      <Switch k="auditLoginActivity" label="Audit User Login Activity" />
      <Switch k="sessionTimeoutWarning" label="Session Timeout Warning" />
      <div className="mt-4"><OutlineButton onClick={() => nav("/system?tab=security")}>Manage Security Policies</OutlineButton></div>
    </Card>
  );
  const prefs = (
    <Card icon={<SlidersHorizontal size={26} />} title="System Preferences" sub="Set platform-wide preferences.">
      <Switch k="maintenanceMode" label="Enable Maintenance Mode" hint="Temporarily disable platform access" />
      <Switch k="systemNotifications" label="Enable System Notifications" hint="Show system-wide announcements" />
      <Switch k="usageAnalytics" label="Enable Usage Analytics" hint="Collect anonymized usage data" />
      <Switch k="feedbackWidget" label="Enable Feedback Widget" hint="Allow users to submit feedback" />
      <div className="mt-2 flex items-center justify-between gap-3"><span className="text-[12px] font-semibold text-[#17245e]">Default Landing Page</span><div className="w-48"><Select k="defaultLandingPage" items={opt("landingPages")} label={(v) => landingLabel[v] ?? v} /></div></div>
    </Card>
  );
  const access = (
    <Card icon={<UsersIcon size={26} />} title="User & Access" sub="Sign-in rules for everyone who uses the platform.">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Minimum Password Length"><input type="number" min={6} max={32} value={form.passwordMinLength ?? ""} onChange={(e) => set("passwordMinLength", e.target.value)} className={controlClass} />{E("passwordMinLength")}</Field>
        <Field label="Session Timeout (Minutes)"><input type="number" min={5} max={1440} value={form.sessionTimeoutMinutes ?? ""} onChange={(e) => set("sessionTimeoutMinutes", e.target.value)} className={controlClass} />{E("sessionTimeoutMinutes")}</Field>
        <Field label="Default Landing Page"><Select k="defaultLandingPage" items={opt("landingPages")} label={(v) => landingLabel[v] ?? v} /></Field>
      </div>
      <div className="mt-3 flex gap-2"><OutlineButton onClick={() => nav("/users")}>Manage Users</OutlineButton><OutlineButton onClick={() => nav("/system?tab=security")}>IP & Security Policies</OutlineButton></div>
    </Card>
  );
  const localization = (
    <Card icon={<Globe size={26} />} title="Localization" sub="Language, time zone and date and time formats.">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Default Language"><Select k="defaultLanguage" items={opt("languages")} label={(v) => langLabel[v] ?? v} /></Field>
        <Field label="Default Time Zone"><Select k="timeZone" items={opt("timeZones")} label={(v) => zoneLabel[v] ?? v} /></Field>
        <Field label="Default Date Format"><Select k="dateFormat" items={opt("dateFormats")} label={dateSample} /></Field>
        <Field label="Default Time Format"><select value={form.timeFormat ?? ""} onChange={(e) => set("timeFormat", e.target.value)} className={controlClass}><option value="12H">12-hour (03:30 PM)</option><option value="24H">24-hour (15:30)</option></select></Field>
      </div>
    </Card>
  );
  const integ = (
    <Card icon={<Link2 size={26} />} title="Integrations" sub="Platform integrations are managed in System Management." right={<OutlineButton onClick={() => nav("/system?tab=integrations")}>Manage Integrations</OutlineButton>}>
      {integrations === null ? <p className="text-[12px] text-slate-500">Loading…</p> : integrations.length === 0 ? <p className="text-[12px] text-slate-500">No integrations have been added yet.</p> : (
        <ul className="divide-y divide-[#eef4fd] text-[12px] text-[#17245e]">{integrations.map((i) => <li key={i.id} className="flex justify-between py-1.5"><span className="font-medium">{i.name}</span><span className="text-slate-500">{i.type} · {i.status === "ACTIVE" ? "Active" : i.status === "ISSUE" ? "Issue" : "Disabled"}</span></li>)}</ul>
      )}
    </Card>
  );

  return (
    <AdminLayout activeItem="Settings">
      <div className="space-y-4 pb-16">
        <UsersHeader title="Settings" subtitle="Configure platform settings, preferences, branding and system parameters." />
        {error && <Notice tone="error">{error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}
        <Panel>
          <div className="flex flex-wrap px-2">
            {tabs.map(([t, Icon]) => <button key={t} type="button" onClick={() => setTab(t)} className={`flex items-center gap-2 px-5 py-4 text-[12px] font-semibold ${tab === t ? "rounded-t-lg border-b-2 border-blue-600 bg-blue-50 text-blue-600" : "text-[#17245e] hover:text-blue-600"}`}><Icon size={18} />{t}</button>)}
          </div>
        </Panel>

        {!saved ? <p className="text-[12px] text-slate-500">Loading settings…</p> : tab === "General" ? (
          <>
            <div className="grid gap-4 xl:grid-cols-2">{general}{branding}</div>
            <div className="grid gap-4 xl:grid-cols-3">{email}{security}{prefs}</div>
          </>
        ) : tab === "Branding" ? branding : tab === "Email & Notifications" ? email : tab === "Security" ? security : tab === "User & Access" ? access : tab === "Integrations" ? integ : tab === "Localization" ? localization : prefs}

        <p className="text-[10px] text-slate-500">Settings are saved for the whole platform. They are stored for now and are not yet applied to sign-in, emails or the portal's look.</p>
        <div className="sticky bottom-0 flex justify-end gap-3 bg-[#f4f8ff]/90 py-3">
          <OutlineButton onClick={cancel}>Cancel</OutlineButton>
          <PrimaryButton onClick={() => void save()} disabled={busy || !dirty}>{busy ? "Saving…" : "Save Settings"}</PrimaryButton>
        </div>
      </div>
      {preview && <Preview onClose={() => setPreview(false)} v={form} logo={logoUrl} />}
    </AdminLayout>
  );
}
