import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Bell, Eye, Mail, Megaphone, MessageSquare, MoreVertical, Pencil, Plus, Search, Send, Smartphone, Users, X, ArrowRight } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../services/api";
import type { CommBody, CommOptions, CommRow, CommSummary } from "../../services/api";
import { DataTable, EmptyRow, Field, Notice, OutlineButton, Panel, PrimaryButton, controlClass, tdClass } from "./AcademicShared";
import { errText } from "./SettingsShared";
import { UsersHeader } from "./UserShared";

const tabs = [["ALL", "All Communications"], ["ANNOUNCEMENT", "Announcements"], ["EMAIL", "Email"], ["IN_APP", "In-App Notifications"], ["SMS", "SMS"], ["PUSH", "Push Notifications"], ["SCHEDULED", "Scheduled"]] as const;
const typeLabel: Record<string, string> = { ANNOUNCEMENT: "Announcement", EMAIL: "Email", IN_APP: "In-App", SMS: "SMS", PUSH: "Push" };
const typePill: Record<string, string> = { ANNOUNCEMENT: "bg-blue-50 text-blue-700", EMAIL: "bg-violet-50 text-violet-700", IN_APP: "bg-fuchsia-50 text-fuchsia-700", SMS: "bg-orange-50 text-orange-700", PUSH: "bg-emerald-50 text-emerald-700" };
const typeIcon: Record<string, ReactNode> = { ANNOUNCEMENT: <Megaphone size={14} />, EMAIL: <Mail size={14} />, IN_APP: <Bell size={14} />, SMS: <MessageSquare size={14} />, PUSH: <Smartphone size={14} /> };
const statusPill: Record<string, string> = { SENT: "bg-emerald-50 text-emerald-700", SCHEDULED: "bg-orange-50 text-orange-600", DRAFT: "bg-slate-100 text-slate-600" };
const statusLabel: Record<string, string> = { SENT: "Sent", SCHEDULED: "Scheduled", DRAFT: "Draft" };
const steps = ["Details", "Content", "Recipients", "Schedule", "Preview"] as const;
type Step = (typeof steps)[number];
const stepOf = (k: string): Step | null => (k === "title" || k === "description" || k === "type" || k === "priority" ? "Details" : k === "subject" || k === "body" ? "Content" : k === "audience" || k === "audienceKind" ? "Recipients" : k === "scheduledAt" ? "Schedule" : null);
const PAGE = 10;

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }) : "—");
const num = (n: number | null) => (n === null ? "—" : n.toLocaleString("en-IN"));
const maxLen = (t: string) => (t === "SMS" ? 480 : t === "PUSH" ? 240 : 5000);
const dayStr = (back: number) => { const d = new Date(); d.setDate(d.getDate() - back); return d.toLocaleDateString("sv-SE"); };
const localInput = (iso: string | null) => { if (!iso) return ""; const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

type Form = { title: string; description: string; type: string; priority: string; audienceKind: string; targets: string[]; subject: string; body: string; mode: "NOW" | "LATER"; when: string };
const blank: Form = { title: "", description: "", type: "ANNOUNCEMENT", priority: "NORMAL", audienceKind: "ALL_USERS", targets: [], subject: "", body: "", mode: "NOW", when: "" };

function Stat({ label, value, sub, icon, box, subCls = "text-emerald-600" }: { label: string; value: string | number; sub: string; icon: ReactNode; box: string; subCls?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#d8e9fb] bg-white px-4 py-3.5">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg ${box}`}>{icon}</span>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-[#17245e]">{label}</div>
        <div className="text-[22px] font-extrabold leading-7 text-[#101b69]">{value}</div>
        <div className={`text-[10px] font-semibold ${subCls}`}>{sub}</div>
      </div>
    </div>
  );
}

export default function Communications() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "ALL";
  const [rows, setRows] = useState<CommRow[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<CommSummary | null>(null);
  const [options, setOptions] = useState<CommOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [audience, setAudience] = useState("");
  const [range, setRange] = useState("30");
  const [page, setPage] = useState(1);
  const [menu, setMenu] = useState<number | null>(null);
  const [picked, setPicked] = useState<number[]>([]);

  const [panel, setPanel] = useState(true);
  const [editing, setEditing] = useState<CommRow | null>(null);
  const [step, setStep] = useState<Step>("Details");
  const [form, setForm] = useState<Form>(blank);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [reach, setReach] = useState<{ count: number; label: string } | null>(null);
  const [pickQ, setPickQ] = useState("");

  const flash = (m: string) => { setNotice(m); setTimeout(() => setNotice(""), 3500); };
  const effType = tab === "SCHEDULED" || tab === "ALL" ? type : tab;
  const effStatus = tab === "SCHEDULED" ? "SCHEDULED" : status;

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([
        api.comms.list({ type: effType || undefined, status: effStatus || undefined, audience: audience || undefined, q: q.trim() || undefined, from: range === "ALL" ? undefined : dayStr(Number(range)), page, size: PAGE }),
        api.comms.summary(),
      ]);
      setRows(p.items); setTotal(p.total); setSummary(s); setError("");
    } catch (e) { setError(errText(e)); } finally { setLoading(false); }
  }, [effType, effStatus, audience, q, range, page]);
  useEffect(() => { const t = setTimeout(() => void load(), 200); return () => clearTimeout(t); }, [load]);
  useEffect(() => { api.comms.options().then(setOptions).catch((e) => setError(errText(e))); }, []);
  useEffect(() => {
    if (!panel) return;
    const t = setTimeout(() => { api.comms.resolve(form.audienceKind, form.targets).then(setReach).catch(() => setReach(null)); }, 250);
    return () => clearTimeout(t);
  }, [panel, form.audienceKind, form.targets]);

  const pages = Math.max(1, Math.ceil(total / PAGE));
  const setTab = (k: string) => { setParams(k === "ALL" ? {} : { tab: k }); setPage(1); setPicked([]); };
  const resetFilters = () => { setQ(""); setStatus(""); setType(""); setAudience(""); setRange("30"); setPage(1); setParams({}); };

  const startNew = () => { setEditing(null); setForm(blank); setErrs({}); setStep("Details"); setPanel(true); };
  const startEdit = (r: CommRow, at: Step = "Details") => {
    setEditing(r); setErrs({}); setStep(at); setPanel(true); setMenu(null);
    setForm({ title: r.title, description: r.description ?? "", type: r.type, priority: r.priority, audienceKind: r.audienceKind, targets: r.targets, subject: r.subject ?? "", body: r.body ?? "", mode: r.status === "SCHEDULED" ? "LATER" : "NOW", when: localInput(r.scheduledAt) });
  };
  const locked = editing?.status === "SENT";
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (action: CommBody["action"]) => {
    setSaving(true); setErrs({});
    const body: CommBody = { title: form.title, description: form.description, type: form.type, priority: form.priority, audienceKind: form.audienceKind, targets: form.targets, subject: form.subject, body: form.body, action,
      scheduledAt: action === "SCHEDULE" && form.when ? new Date(form.when).toISOString() : null };
    try {
      const r = editing ? await api.comms.update(editing.id, body) : await api.comms.create(body);
      flash(action === "SEND" ? `"${r.title}" sent to ${num(r.recipients)} recipients.` : action === "SCHEDULE" ? `"${r.title}" scheduled.` : "Draft saved.");
      setEditing(null); setForm(blank); setStep("Details"); setPage(1); await load();
    } catch (e) {
      const fe = (e as { fieldErrors?: Record<string, string> }).fieldErrors;
      if (fe) { setErrs(fe); const first = Object.keys(fe).map(stepOf).find(Boolean); if (first) setStep(first); } else setError(errText(e));
    } finally { setSaving(false); }
  };

  const act = async (fn: () => Promise<unknown>, ok: string) => { setMenu(null); try { await fn(); flash(ok); await load(); } catch (e) { setError(errText(e)); } };
  const del = (r: CommRow) => { if (window.confirm(`Delete "${r.title}"?`)) void act(() => api.comms.remove(r.id), "Communication deleted."); };
  const delPicked = async () => {
    if (!window.confirm(`Delete ${picked.length} selected communication(s)?`)) return;
    try { for (const id of picked) await api.comms.remove(id); setPicked([]); flash("Deleted."); await load(); } catch (e) { setError(errText(e)); }
  };

  const err = (k: string) => (errs[k] ? <p className="mt-1 text-[10px] text-rose-600">{errs[k]}</p> : null);
  const choices = useMemo(() => {
    const list = form.audienceKind === "USER_GROUPS" ? options?.groups : form.audienceKind === "INSTITUTIONS" ? options?.institutions : form.audienceKind === "CLASSES" ? options?.sections : [];
    return (list ?? []).filter((o) => o.label.toLowerCase().includes(pickQ.trim().toLowerCase()));
  }, [options, form.audienceKind, pickQ]);
  const toggleTarget = (c: string) => set("targets", form.targets.includes(c) ? form.targets.filter((x) => x !== c) : [...form.targets, c]);
  const idx = steps.indexOf(step);

  const audienceRadio = (kind: string, label: string) => (
    <div key={kind}>
      <label className="flex cursor-pointer items-center gap-3 py-1.5 text-[12px] text-[#17245e]">
        <input type="radio" name="aud" checked={form.audienceKind === kind} onChange={() => { set("audienceKind", kind); set("targets", []); setPickQ(""); }} className="h-4 w-4 accent-blue-600" /> {label}
      </label>
      {form.audienceKind === kind && kind !== "ALL_USERS" && (
        <div className="mb-2 ml-7 rounded-md border border-[#d8e9fb] bg-white">
          {kind !== "USER_GROUPS" && <input value={pickQ} onChange={(e) => setPickQ(e.target.value)} placeholder="Search…" className="w-full border-b border-[#e3eefc] px-3 py-1.5 text-[11px] outline-none" />}
          <ul className="max-h-40 overflow-auto py-1">
            {choices.length === 0 ? <li className="px-3 py-2 text-[11px] text-slate-500">Nothing to choose from.</li> : choices.map((o) => (
              <li key={o.code}><label className="flex cursor-pointer items-center gap-2 px-3 py-1 text-[11px] hover:bg-blue-50"><input type="checkbox" checked={form.targets.includes(o.code)} onChange={() => toggleTarget(o.code)} className="accent-blue-600" />{o.label}</label></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <AdminLayout activeItem="Communications">
      <div className="space-y-4" onClick={() => setMenu(null)}>
        <UsersHeader title="Communications" subtitle="Create and manage announcements, notifications, emails and in-app messages for institutions, users and parents."
          right={<PrimaryButton onClick={startNew}><Plus size={14} /> Create Communication</PrimaryButton>} />
        {error && <Notice tone="error">{error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Total Communications" value={summary?.total ?? "—"} sub={summary ? `+${summary.createdThisMonth} this month` : ""} icon={<Send size={22} />} box="bg-blue-50 text-blue-600" />
          <Stat label="Sent" value={summary?.sent ?? "—"} sub={summary ? `${summary.scheduled} scheduled · ${summary.drafts} drafts` : ""} icon={<Send size={22} />} box="bg-emerald-50 text-emerald-600" />
          <Stat label="Audience Reached" value={summary ? summary.audienceReached.toLocaleString("en-IN") : "—"} sub="Recipients across sent messages" icon={<Users size={22} />} box="bg-orange-50 text-orange-600" />
          <Stat label="Average Open Rate" value="—" sub="Not tracked yet" subCls="text-slate-500" icon={<Eye size={22} />} box="bg-violet-50 text-violet-600" />
        </div>

        <div className={`grid gap-4 ${panel ? "xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.9fr)]" : ""}`}>
          <Panel>
            <div className="flex flex-wrap border-b border-[#e3eefc] bg-[#f5f9ff] px-2">
              {tabs.map(([k, l]) => (
                <button key={k} type="button" onClick={() => setTab(k)} className={`px-4 py-3 text-[11px] font-semibold ${tab === k ? "border-b-2 border-blue-600 text-blue-600" : "text-[#17245e] hover:text-blue-600"}`}>{l}</button>
              ))}
            </div>
            <div className="flex flex-wrap items-end gap-3 px-4 py-4">
              <div className="relative min-w-[200px] flex-1">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by title, content or audience…" className={`${controlClass} pl-8`} />
              </div>
              <Field label="Status" className="w-[120px]"><select value={tab === "SCHEDULED" ? "SCHEDULED" : status} disabled={tab === "SCHEDULED"} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={controlClass}><option value="">All Status</option><option value="SENT">Sent</option><option value="SCHEDULED">Scheduled</option><option value="DRAFT">Draft</option></select></Field>
              <Field label="Communication Type" className="w-[130px]"><select value={effType} disabled={tab !== "ALL" && tab !== "SCHEDULED"} onChange={(e) => { setType(e.target.value); setPage(1); }} className={controlClass}><option value="">All Types</option>{Object.entries(typeLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
              <Field label="Audience" className="w-[130px]"><select value={audience} onChange={(e) => { setAudience(e.target.value); setPage(1); }} className={controlClass}>
                <option value="">All Audiences</option><option value="ALL_USERS">All Users</option>
                {(options?.groups ?? []).map((g) => <option key={g.code} value={g.code}>{g.label}</option>)}<option value="INSTITUTIONS">Institutions</option><option value="CLASSES">Classes/Sections</option></select></Field>
              <Field label="Date Range" className="w-[120px]"><select value={range} onChange={(e) => { setRange(e.target.value); setPage(1); }} className={controlClass}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="ALL">All time</option></select></Field>
              <button type="button" onClick={resetFilters} className="pb-2 text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>
            </div>
            {picked.length > 0 && <div className="flex items-center gap-3 px-4 pb-2 text-[11px] text-[#17245e]">{picked.length} selected <button type="button" onClick={() => void delPicked()} className="font-semibold text-rose-600 hover:underline">Delete selected</button></div>}
            <DataTable heads={["", "#", "Title", "Type", "Audience", "Scheduled Date", "Status", "Sent / Delivered", "Open Rate", "Action"]} min={980}>
              {loading ? <EmptyRow cols={10} text="Loading…" /> : rows.length === 0 ? <EmptyRow cols={10} text="No communications found." /> : rows.map((r, i) => (
                <tr key={r.id} className="border-t border-[#eef4fd] hover:bg-[#f5f9ff]">
                  <td className={tdClass}><input type="checkbox" aria-label="Select" checked={picked.includes(r.id)} onChange={() => setPicked((p) => (p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]))} className="accent-blue-600" /></td>
                  <td className={tdClass}>{(page - 1) * PAGE + i + 1}</td>
                  <td className={tdClass}><span className="flex items-center gap-2 font-medium text-[#17245e]"><span className={`grid h-6 w-6 place-items-center rounded ${typePill[r.type]}`}>{typeIcon[r.type]}</span>{r.title}</span></td>
                  <td className={tdClass}><span className={`rounded px-2 py-0.5 text-[9px] font-semibold ${typePill[r.type]}`}>{typeLabel[r.type]}</span></td>
                  <td className={`${tdClass} max-w-[130px]`}>{r.audienceLabel}</td>
                  <td className={tdClass}>{fmt(r.sentAt ?? r.scheduledAt)}</td>
                  <td className={tdClass}><span className={`rounded px-3 py-1 text-[9px] font-semibold ${statusPill[r.status]}`}>{statusLabel[r.status]}</span></td>
                  <td className={tdClass}>{r.status === "SENT" ? `${num(r.recipients)} / —` : "—"}</td>
                  <td className={tdClass} title="Open tracking isn't available yet">—</td>
                  <td className={tdClass} onClick={(e) => e.stopPropagation()}>
                    <span className="relative flex items-center gap-2 text-blue-600">
                      <button type="button" title="Preview" onClick={() => startEdit(r, "Preview")}><Eye size={14} /></button>
                      <button type="button" title={r.status === "SENT" ? "View" : "Edit"} onClick={() => startEdit(r)}><Pencil size={14} /></button>
                      <button type="button" title="More" onClick={(e) => { e.stopPropagation(); setMenu(menu === r.id ? null : r.id); }} className="text-slate-600"><MoreVertical size={14} /></button>
                      {menu === r.id && (
                        <div className="absolute right-0 top-5 z-10 w-40 rounded-md border border-[#d8e9fb] bg-white py-1 text-[11px] text-[#17245e] shadow-lg">
                          {r.status !== "SENT" && <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-blue-50" onClick={() => void act(() => api.comms.send(r.id), "Communication sent.")}>Send now</button>}
                          <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-blue-50" onClick={() => void act(() => api.comms.duplicate(r.id), "Duplicated as a draft.")}>Duplicate</button>
                          <button type="button" className="block w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50" onClick={() => del(r)}>Delete</button>
                        </div>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </DataTable>
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[11px] text-[#33477c]">
              <span>{total === 0 ? "Showing 0 of 0" : `Showing ${(page - 1) * PAGE + 1}-${Math.min(page * PAGE, total)} of ${total}`}</span>
              <span className="flex items-center gap-1">
                <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border border-[#d8e9fb] px-2 py-1 disabled:opacity-40">‹</button>
                {Array.from({ length: pages }, (_, n) => n + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1).map((n, k, a) => (
                  <span key={n} className="flex items-center gap-1">
                    {k > 0 && n - a[k - 1] > 1 && <span>…</span>}
                    <button type="button" onClick={() => setPage(n)} className={`rounded px-2.5 py-1 ${n === page ? "bg-blue-600 text-white" : "border border-[#d8e9fb]"}`}>{n}</button>
                  </span>
                ))}
                <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded border border-[#d8e9fb] px-2 py-1 disabled:opacity-40">›</button>
              </span>
            </div>
          </Panel>

          {panel && (
            <Panel>
              <div className="flex items-center justify-between px-4 pt-4">
                <h2 className="text-[14px] font-extrabold text-[#101b69]">{editing ? (locked ? "View Communication" : "Edit Communication") : "Create Communication"}</h2>
                <button type="button" aria-label="Close" onClick={() => setPanel(false)}><X size={16} className="text-slate-600" /></button>
              </div>
              <div className="mt-2 flex flex-wrap border-b border-[#e3eefc] bg-[#f5f9ff] px-2">
                {steps.map((s) => <button key={s} type="button" onClick={() => setStep(s)} className={`px-3 py-2.5 text-[11px] font-semibold ${step === s ? "border-b-2 border-blue-600 text-blue-600" : "text-[#17245e]"}`}>{s}</button>)}
              </div>
              <fieldset disabled={locked || saving} className="space-y-3 p-4">
                {locked && <Notice tone="info">This has already been sent, so it can't be changed. Use Duplicate to send a new copy.</Notice>}

                {step === "Details" && (<>
                  <Field label="Title" required><input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Enter communication title" maxLength={150} className={controlClass} />{err("title")}</Field>
                  <Field label="Description" optional><textarea rows={4} value={form.description} maxLength={500} onChange={(e) => set("description", e.target.value)} placeholder="Enter a brief description…" className={controlClass} /><div className="text-right text-[10px] text-slate-500">{form.description.length}/500</div>{err("description")}</Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Communication Type" required><select value={form.type} onChange={(e) => set("type", e.target.value)} className={controlClass}>{Object.entries(typeLabel).map(([k, l]) => <option key={k} value={k}>{k === "ANNOUNCEMENT" ? "Announcement" : k === "IN_APP" ? "In-App Notification" : k === "PUSH" ? "Push Notification" : l}</option>)}</select>{err("type")}</Field>
                    <Field label="Priority"><select value={form.priority} onChange={(e) => set("priority", e.target.value)} className={controlClass}><option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></select>{err("priority")}</Field>
                  </div>
                  <div>
                    <div className="mb-1 text-[11px] font-semibold text-[#17245e]">Audience <span className="text-rose-500">*</span></div>
                    {audienceRadio("ALL_USERS", "All Users")}{audienceRadio("USER_GROUPS", "Specific User Groups")}{audienceRadio("INSTITUTIONS", "Specific Institutions")}{audienceRadio("CLASSES", "Specific Classes/Sections")}
                    {err("audience")}
                  </div>
                </>)}

                {step === "Content" && (<>
                  {form.type === "EMAIL" && <Field label="Subject" required><input value={form.subject} maxLength={200} onChange={(e) => set("subject", e.target.value)} placeholder="Email subject" className={controlClass} />{err("subject")}</Field>}
                  <Field label="Message" required><textarea rows={10} value={form.body} onChange={(e) => set("body", e.target.value)} placeholder="Write your message…" className={controlClass} />
                    <div className="text-right text-[10px] text-slate-500">{form.body.length}/{maxLen(form.type)}</div>{err("body")}</Field>
                </>)}

                {step === "Recipients" && (
                  <div className="space-y-3">
                    {audienceRadio("ALL_USERS", "All Users")}{audienceRadio("USER_GROUPS", "Specific User Groups")}{audienceRadio("INSTITUTIONS", "Specific Institutions")}{audienceRadio("CLASSES", "Specific Classes/Sections")}
                    {err("audience")}
                    <div className="rounded-lg border border-[#d8e9fb] bg-[#f5f9ff] px-4 py-3">
                      <div className="text-[11px] text-slate-600">This will reach</div>
                      <div className="text-[22px] font-extrabold text-[#101b69]">{reach ? reach.count.toLocaleString("en-IN") : "—"}</div>
                      <div className="text-[11px] text-[#17245e]">{reach?.label}{form.audienceKind === "CLASSES" ? " (students)" : " (user accounts)"}</div>
                    </div>
                  </div>
                )}

                {step === "Schedule" && (
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 text-[12px] text-[#17245e]"><input type="radio" checked={form.mode === "NOW"} onChange={() => set("mode", "NOW")} className="h-4 w-4 accent-blue-600" /> Send immediately</label>
                    <label className="flex items-center gap-3 text-[12px] text-[#17245e]"><input type="radio" checked={form.mode === "LATER"} onChange={() => set("mode", "LATER")} className="h-4 w-4 accent-blue-600" /> Schedule for later</label>
                    {form.mode === "LATER" && <Field label="Send on" required><input type="datetime-local" value={form.when} onChange={(e) => set("when", e.target.value)} className={controlClass} />{err("scheduledAt")}</Field>}
                  </div>
                )}

                {step === "Preview" && (
                  <div className="space-y-3 text-[12px] text-[#17245e]">
                    <div className="rounded-lg border border-[#d8e9fb] p-4">
                      <div className="mb-2 flex items-center gap-2"><span className={`rounded px-2 py-0.5 text-[9px] font-semibold ${typePill[form.type]}`}>{typeLabel[form.type]}</span>
                        {form.priority !== "NORMAL" && <span className="rounded bg-rose-50 px-2 py-0.5 text-[9px] font-semibold text-rose-600">{form.priority}</span>}</div>
                      <div className="text-[14px] font-extrabold text-[#101b69]">{form.type === "EMAIL" && form.subject ? form.subject : form.title || "Untitled"}</div>
                      {form.description && <div className="mt-1 text-slate-600">{form.description}</div>}
                      <p className="mt-3 whitespace-pre-wrap">{form.body || <span className="text-slate-400">No message written yet.</span>}</p>
                    </div>
                    <dl className="grid grid-cols-[90px_1fr] gap-y-1 text-[11px]">
                      <dt className="text-slate-500">To</dt><dd>{reach?.label ?? "—"} {reach ? `· ${reach.count.toLocaleString("en-IN")} recipients` : ""}</dd>
                      <dt className="text-slate-500">When</dt><dd>{form.mode === "LATER" && form.when ? fmt(new Date(form.when).toISOString()) : "Immediately"}</dd>
                    </dl>
                    <p className="text-[10px] text-slate-500">Sending records the message and counts who it reaches. It isn't handed to an email, SMS or push provider yet.</p>
                  </div>
                )}
              </fieldset>
              <div className="flex flex-wrap justify-end gap-2 px-4 pb-4">
                <OutlineButton onClick={() => { setPanel(false); }}>Cancel</OutlineButton>
                {!locked && <OutlineButton onClick={() => void submit("DRAFT")} disabled={saving}>Save Draft</OutlineButton>}
                {idx < steps.length - 1
                  ? <PrimaryButton onClick={() => setStep(steps[idx + 1])}>Next: {steps[idx + 1]} <ArrowRight size={13} /></PrimaryButton>
                  : !locked && <PrimaryButton onClick={() => void submit(form.mode === "LATER" ? "SCHEDULE" : "SEND")} disabled={saving}><Send size={13} /> {saving ? "Working…" : form.mode === "LATER" ? "Schedule" : "Send Now"}</PrimaryButton>}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
