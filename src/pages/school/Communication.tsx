import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bold, Italic, Link2, List, ListOrdered, Paperclip, Plus, Search, Underline } from "lucide-react";
import { api } from "../../services/api";
import type { MsgAnnouncement, MsgDetail, MsgNotif, MsgOptions, MsgRow, MsgTemplate } from "../../services/api";
import { Field, Notice, OutlineButton, PrimaryButton, controlClass } from "../super-admin/AcademicShared";
import { errText } from "../super-admin/SettingsShared";
import SchoolLayout from "./SchoolLayout";
import { Item, Menu, Modal, Pager, Table, isoDay, td } from "./SchoolUi";

type Tab = "Compose" | "Templates" | "Sent" | "Notifications" | "Announcements";
const TABS: Tab[] = ["Compose", "Templates", "Sent", "Notifications", "Announcements"];
const fieldErrs = (e: unknown) => { const fe = (e as { fieldErrors?: Record<string, string> }).fieldErrors; return fe && Object.keys(fe).length ? fe : null; };
const ERR = (errs: Record<string, string>, k: string) => (errs[k] ? <p className="mt-1 text-[10px] text-rose-600">{errs[k]}</p> : null);
const stamp = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "—");
const dFmt = (iso: string) => { const [y, m, d] = iso.slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); };
const ago = (iso: string) => { const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000); if (s < 60) return "Just now"; if (s < 3600) return `${Math.floor(s / 60)} min ago`; if (s < 86400) return `${Math.floor(s / 3600)} hr ago`; if (s < 172800) return "Yesterday"; return `${Math.floor(s / 86400)} days ago`; };
const labelOf = (l: { code: string; label: string }[] | undefined, c: string) => l?.find((x) => x.code === c)?.label ?? c;
const CAT_TONE: Record<string, string> = { FEES: "bg-amber-100 text-amber-700", ACADEMIC: "bg-sky-100 text-sky-700", EVENTS: "bg-violet-100 text-violet-700", ATTENDANCE: "bg-rose-100 text-rose-700", ADMISSIONS: "bg-emerald-100 text-emerald-700" };
const chip = (cls: string, text: string) => <span className={`inline-block whitespace-nowrap rounded-md px-3 py-1 text-[11px] font-semibold ${cls}`}>{text}</span>;
const btnLink = "text-[12px] font-semibold text-blue-600 hover:underline";

// ---------------------------------------------------------------- rich text (small toolbar; pasted content is plain text; the server cleans the HTML again)
function RichEditor({ html, onChange, resetKey, error }: { html: string; onChange: (h: string) => void; resetKey: number; error?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [link, setLink] = useState<string | null>(null);
  useEffect(() => { if (ref.current) ref.current.innerHTML = html; /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [resetKey]);
  const run = (cmd: string, arg?: string) => { ref.current?.focus(); document.execCommand(cmd, false, arg); onChange(ref.current?.innerHTML ?? ""); };
  const tool = (label: string, icon: ReactNode, cmd: string) => <button type="button" aria-label={label} title={label} onMouseDown={(e) => e.preventDefault()} onClick={() => run(cmd)} className="rounded p-1.5 hover:bg-blue-50">{icon}</button>;
  const addLink = () => { const u = (link ?? "").trim(); if (/^(https?:\/\/|mailto:)\S+$/i.test(u)) { run("createLink", u); setLink(null); } };
  return (
    <div>
      <div className={`rounded-lg border ${error ? "border-rose-400" : "border-[#cfe0f6]"} bg-white`}>
        <div className="flex flex-wrap items-center gap-0.5 border-b border-[#e3eefc] px-2 py-1 text-[#17245e]">
          {tool("Bold", <Bold size={15} />, "bold")}{tool("Italic", <Italic size={15} />, "italic")}{tool("Underline", <Underline size={15} />, "underline")}
          <span className="mx-1 h-4 w-px bg-[#e3eefc]" />
          {tool("Bulleted list", <List size={15} />, "insertUnorderedList")}{tool("Numbered list", <ListOrdered size={15} />, "insertOrderedList")}
          <button type="button" aria-label="Insert link" title="Insert link" onMouseDown={(e) => e.preventDefault()} onClick={() => setLink(link === null ? "https://" : null)} className="rounded p-1.5 hover:bg-blue-50"><Link2 size={15} /></button>
          <span className="ml-auto pr-1 text-[10px] text-slate-400">Images and tables aren't supported</span>
        </div>
        {link !== null && <div className="flex items-center gap-2 border-b border-[#e3eefc] px-2 py-1.5"><input autoFocus value={link} onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }} placeholder="https://…" className={controlClass} /><button type="button" onClick={addLink} className={btnLink}>Add</button></div>}
        <div ref={ref} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="Message" onInput={() => onChange(ref.current?.innerHTML ?? "")}
          onPaste={(e) => { e.preventDefault(); document.execCommand("insertText", false, e.clipboardData.getData("text/plain")); }}
          className="min-h-[170px] max-h-[360px] overflow-auto px-3 py-2 text-[13px] leading-6 outline-none [&_a]:text-blue-600 [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6" />
      </div>
      {error && <p className="mt-1 text-[10px] text-rose-600">{error}</p>}
    </div>
  );
}
const Html = ({ html }: { html: string }) => <div className="text-[13px] leading-6 [&_a]:text-blue-600 [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6" dangerouslySetInnerHTML={{ __html: html }} />;

type Common = { opts: MsgOptions; onError: (m: string) => void; flash: (m: string) => void };
type Prefill = { channel: string; subject: string; body: string; n: number };

// ---------------------------------------------------------------- Compose
function ComposeTab({ opts, onError, flash, prefill, consume, goSent }: Common & { prefill: Prefill | null; consume: () => void; goSent: () => void }) {
  const [audience, setAudience] = useState("ALL_PARENTS");
  const [classId, setClassId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [channel, setChannel] = useState("EMAIL");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [prev, setPrev] = useState<{ total: number; reachable: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sched, setSched] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const secs = opts.sections.filter((s) => s.classId === classId);

  useEffect(() => { if (prefill) { setChannel(prefill.channel); setSubject(prefill.subject); setBody(prefill.body); setResetKey((k) => k + 1); setErrs({}); consume(); } }, [prefill, consume]);
  useEffect(() => {
    if (audience === "SELECTED_CLASS" && classId === null) { setPrev(null); return; }
    let live = true;
    api.schoolComm.preview(audience, classId, sectionId, channel).then((p) => { if (live) setPrev(p); }).catch(() => { if (live) setPrev(null); });
    return () => { live = false; };
  }, [audience, classId, sectionId, channel]);

  const submit = async (scheduled: boolean) => {
    setBusy(true); setErrs({});
    try {
      const r = await api.schoolComm.send({ audience, classId, sectionId, channel, subject, body, scheduleDate: scheduled ? date : null, scheduleTime: scheduled ? time : null });
      setSched(false); setSubject(""); setBody(""); setResetKey((k) => k + 1); setDate("");
      flash(r.status === "SCHEDULED" ? "Message scheduled. It will be recorded at the chosen time." : `Message recorded for ${r.recipients} recipient${r.recipients === 1 ? "" : "s"} (${r.reachable} with a ${labelOf(opts.channels, channel)} contact). Nothing has been delivered — no ${labelOf(opts.channels, channel)} service is connected.`);
      goSent();
    } catch (e) { const fe = fieldErrs(e); if (fe) { setErrs(fe); if (scheduled && !fe.scheduleDate) setSched(false); } else onError(errText(e)); }
    finally { setBusy(false); }
  };
  const audLabel = audience === "SELECTED_CLASS" ? [opts.classes.find((c) => c.id === classId)?.name, secs.find((s) => s.id === sectionId)?.name].filter(Boolean).join(" – ") || "Selected Class" : labelOf(opts.audiences, audience);

  return (
    <div className="max-w-3xl space-y-4">
      <Notice tone="info">Sending records the message and who it was addressed to. No email, SMS or WhatsApp service is connected yet, so nothing leaves the system.</Notice>
      <Field label="Recipients" required>
        <div className="flex flex-wrap gap-2">{opts.audiences.map((a) => <button key={a.code} type="button" onClick={() => { setAudience(a.code); setErrs({}); }} className={`rounded-full border px-4 py-1.5 text-[12px] font-semibold ${audience === a.code ? "border-[#0875fb] bg-[#0875fb] text-white" : "border-[#cfe0f6] text-[#17245e] hover:bg-blue-50"}`}>{a.label}</button>)}</div>
        {ERR(errs, "audience")}
      </Field>
      {audience === "SELECTED_CLASS" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Grade" required><select value={classId ?? ""} onChange={(e) => { setClassId(e.target.value ? Number(e.target.value) : null); setSectionId(null); }} className={controlClass}><option value="">Select grade</option>{opts.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>{ERR(errs, "classId")}</Field>
          <Field label="Section" optional><select value={sectionId ?? ""} disabled={classId === null} onChange={(e) => setSectionId(e.target.value ? Number(e.target.value) : null)} className={controlClass}><option value="">All sections</option>{secs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>{ERR(errs, "sectionId")}</Field>
        </div>
      )}
      <Field label="Channel" required className="max-w-xs"><select value={channel} onChange={(e) => setChannel(e.target.value)} className={controlClass}>{opts.channels.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}</select>{ERR(errs, "channel")}</Field>
      {prev && <p className="text-[12px] text-slate-600">{prev.total} recipient{prev.total === 1 ? "" : "s"}{prev.total > 0 && <> · <span className={prev.reachable < prev.total ? "font-semibold text-amber-700" : ""}>{prev.reachable} with a {labelOf(opts.channels, channel)} contact on file</span></>}{audience !== "STAFF" && audience !== "ALL_STUDENTS" ? " (parents/guardians)" : audience === "ALL_STUDENTS" ? " (reached through the guardian's contact)" : ""}</p>}
      <Field label="Subject" required><input value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} placeholder="Enter subject" className={controlClass} />{ERR(errs, "subject")}</Field>
      <Field label="Message" required><RichEditor html={body} onChange={setBody} resetKey={resetKey} error={errs.body} /></Field>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" disabled title="Attachments aren't supported yet" className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-400"><Paperclip size={14} />Attach File (not available)</button>
        <div className="flex gap-2"><OutlineButton type="button" disabled={busy} onClick={() => { setErrs({}); setSched(true); }}>Schedule</OutlineButton><PrimaryButton type="button" disabled={busy} onClick={() => void submit(false)}>{busy ? "Sending…" : "Send"}</PrimaryButton></div>
      </div>
      {sched && (
        <Modal title="Schedule Message" onClose={() => setSched(false)}>
          <div className="space-y-1 rounded-lg bg-[#f2f7ff] p-3 text-[12px] text-[#17245e]"><div><b>To:</b> {audLabel}</div><div><b>Channel:</b> {labelOf(opts.channels, channel)}</div><div><b>Subject:</b> {subject || "—"}</div></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date" required><input type="date" min={isoDay(new Date())} value={date} onChange={(e) => setDate(e.target.value)} className={controlClass} />{ERR(errs, "scheduleDate")}</Field>
            <Field label="Time" required><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={controlClass} /></Field>
          </div>
          <Field label="Time Zone"><input readOnly value="(UTC+05:30) India Standard Time" className={`${controlClass} bg-slate-50`} /></Field>
          <p className="text-[11px] text-slate-500">Recipients are worked out when the message is due. It is recorded within a minute of that time.</p>
          {(errs.subject || errs.body || errs.audience || errs.classId) && <p className="text-[11px] text-rose-600">{[errs.subject, errs.body, errs.audience, errs.classId].filter(Boolean).join(" ")}</p>}
          <div className="flex justify-end gap-2"><OutlineButton type="button" onClick={() => setSched(false)}>Cancel</OutlineButton><PrimaryButton type="button" disabled={busy || !date} onClick={() => void submit(true)}>Schedule Message</PrimaryButton></div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Templates
function TemplateModal({ opts, tpl, onClose, onSaved, onError }: { opts: MsgOptions; tpl: MsgTemplate | null; onClose: () => void; onSaved: () => void; onError: (m: string) => void }) {
  const [f, setF] = useState({ name: tpl?.name ?? "", category: tpl?.category ?? "GENERAL", channel: tpl?.channel ?? "EMAIL", subject: tpl?.subject ?? "", body: tpl?.body ?? "" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true); setErrs({});
    try { if (tpl) await api.schoolComm.updateTemplate(tpl.id, f); else await api.schoolComm.addTemplate(f); onSaved(); }
    catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else onError(errText(e)); } finally { setBusy(false); }
  };
  return (
    <Modal title={tpl ? "Edit Template" : "New Template"} wide onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Template name" required className="sm:col-span-3"><input value={f.name} maxLength={100} onChange={(e) => setF({ ...f, name: e.target.value })} className={controlClass} />{ERR(errs, "name")}</Field>
        <Field label="Category" required><select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className={controlClass}>{opts.categories.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}</select></Field>
        <Field label="Channel" required><select value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value })} className={controlClass}>{opts.channels.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}</select></Field>
        <Field label="Subject" required className="sm:col-span-3"><input value={f.subject} maxLength={200} onChange={(e) => setF({ ...f, subject: e.target.value })} className={controlClass} />{ERR(errs, "subject")}</Field>
      </div>
      <Field label="Message" required><RichEditor html={f.body} onChange={(b) => setF((x) => ({ ...x, body: b }))} resetKey={0} error={errs.body} /></Field>
      <div className="flex justify-end gap-2"><OutlineButton type="button" onClick={onClose}>Cancel</OutlineButton><PrimaryButton type="button" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save Template"}</PrimaryButton></div>
    </Modal>
  );
}

function TemplatesTab({ opts, onError, flash, use }: Common & { use: (t: MsgTemplate) => void }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [rows, setRows] = useState<MsgTemplate[] | null>(null);
  const [edit, setEdit] = useState<MsgTemplate | null | "new">(null);
  const [menu, setMenu] = useState<string | null>(null);
  const load = useCallback(() => { api.schoolComm.templates(q, cat).then(setRows).catch((e) => onError(errText(e))); }, [q, cat, onError]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  const remove = async (t: MsgTemplate) => { if (!window.confirm(`Delete the template "${t.name}"?`)) return; try { await api.schoolComm.deleteTemplate(t.id); flash("Template deleted."); load(); } catch (e) { onError(errText(e)); } };
  const starters = async () => { try { const r = await api.schoolComm.starterTemplates(); flash(r.added ? `${r.added} starter template${r.added === 1 ? "" : "s"} added. Edit them to fit your school.` : "Starter templates are already there."); load(); } catch (e) { onError(errText(e)); } };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[220px] flex-1 sm:max-w-sm"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates" className={`${controlClass} pl-9`} /></label>
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category" className={`${controlClass} max-w-[170px]`}><option value="">All Categories</option>{opts.categories.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}</select>
        <div className="ml-auto flex gap-2"><OutlineButton type="button" onClick={() => void starters()}>Add starter templates</OutlineButton><PrimaryButton type="button" onClick={() => setEdit("new")}><Plus size={14} />New Template</PrimaryButton></div>
      </div>
      <Table heads={["Template", "Category", "Channel", "Action"]} colSpan={4} empty={rows && rows.length === 0 ? "No templates yet. Create one, or add the starter set." : rows === null ? "Loading…" : undefined}>
        {rows?.map((t) => (
          <tr key={t.id}>
            <td className={`${td} font-semibold`}>{t.name}</td>
            <td className={td}>{chip(CAT_TONE[t.category] ?? "bg-slate-100 text-slate-600", labelOf(opts.categories, t.category))}</td>
            <td className={td}>{labelOf(opts.channels, t.channel)}</td>
            <td className={td}><div className="flex items-center gap-3"><button type="button" onClick={() => use(t)} className={btnLink}>Use Template</button>
              <Menu id={`t${t.id}`} open={menu} setOpen={setMenu}><Item onClick={() => { setMenu(null); setEdit(t); }}>Edit</Item><Item danger onClick={() => { setMenu(null); void remove(t); }}>Delete</Item></Menu></div></td>
          </tr>
        ))}
      </Table>
      {edit && <TemplateModal opts={opts} tpl={edit === "new" ? null : edit} onClose={() => setEdit(null)} onError={onError} onSaved={() => { setEdit(null); flash("Template saved."); load(); }} />}
    </div>
  );
}

// ---------------------------------------------------------------- Sent
const STATUS_TONE: Record<string, [string, string]> = { SENT: ["Recorded", "bg-emerald-100 text-emerald-700"], SCHEDULED: ["Scheduled", "bg-sky-100 text-sky-700"], CANCELLED: ["Cancelled", "bg-slate-100 text-slate-500"] };

function SentTab({ opts, onError, flash }: Common) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [channel, setChannel] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ items: MsgRow[]; total: number; size: number } | null>(null);
  const [detail, setDetail] = useState<MsgDetail | null>(null);
  const load = useCallback(() => { api.schoolComm.messages({ from, to, channel }, page).then(setData).catch((e) => onError(errText(e))); }, [from, to, channel, page, onError]);
  useEffect(load, [load]);
  const view = async (id: number) => { try { setDetail(await api.schoolComm.message(id)); } catch (e) { onError(errText(e)); } };
  const cancel = async (id: number) => { if (!window.confirm("Cancel this scheduled message?")) return; try { await api.schoolComm.cancel(id); setDetail(null); flash("Scheduled message cancelled."); load(); } catch (e) { onError(errText(e)); } };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="From" className="w-40"><input type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setPage(0); }} className={controlClass} /></Field>
        <Field label="To" className="w-40"><input type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setPage(0); }} className={controlClass} /></Field>
        <Field label="Channel" className="w-40"><select value={channel} onChange={(e) => { setChannel(e.target.value); setPage(0); }} className={controlClass}><option value="">All</option>{opts.channels.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}</select></Field>
        {(from || to || channel) && <button type="button" className={`${btnLink} pb-2`} onClick={() => { setFrom(""); setTo(""); setChannel(""); setPage(0); }}>Clear</button>}
      </div>
      <Table heads={["Subject", "Audience", "Channel", "Sent On", "Delivery", "Action"]} colSpan={6} empty={data && data.items.length === 0 ? "No messages yet." : !data ? "Loading…" : undefined}>
        {data?.items.map((m) => { const [l, c] = STATUS_TONE[m.status] ?? [m.status, "bg-slate-100 text-slate-600"]; return (
          <tr key={m.id}>
            <td className={`${td} font-semibold`}>{m.subject}</td><td className={td}>{m.audience}</td><td className={td}>{labelOf(opts.channels, m.channel)}</td>
            <td className={td}>{stamp(m.status === "SCHEDULED" ? m.scheduledAt : m.sentAt ?? m.scheduledAt)}</td>
            <td className={td}>{chip(c, l)}</td>
            <td className={td}><button type="button" onClick={() => void view(m.id)} className={btnLink}>View Details</button></td>
          </tr>); })}
      </Table>
      {data && <Pager page={page} size={data.size} total={data.total} set={setPage} />}
      <p className="text-[11px] text-slate-500">"Recorded" means the message and its recipient list were saved. It does not mean delivery — no sending service is connected.</p>
      {detail && (
        <Modal title={detail.row.subject} wide onClose={() => setDetail(null)}>
          <div className="grid gap-x-6 gap-y-1 text-[12px] sm:grid-cols-2"><div><b>Audience:</b> {detail.row.audience}</div><div><b>Channel:</b> {labelOf(opts.channels, detail.row.channel)}</div><div><b>{detail.row.status === "SCHEDULED" ? "Scheduled for" : "Recorded on"}:</b> {stamp(detail.row.status === "SCHEDULED" ? detail.row.scheduledAt : detail.row.sentAt ?? detail.row.scheduledAt)}</div><div><b>By:</b> {detail.row.createdBy ?? "—"}</div>
            {detail.row.status === "SENT" && <div><b>Recipients:</b> {detail.row.recipients} ({detail.row.reachable} with a contact for this channel)</div>}{detail.row.note && <div className="sm:col-span-2"><b>Note:</b> {detail.row.note}</div>}</div>
          <div className="rounded-lg border border-[#e3eefc] p-3"><Html html={detail.body} /></div>
          {detail.row.status === "SENT" && (
            <div className="max-h-56 overflow-auto rounded-lg border border-[#cfe0f6]"><table className="w-full text-left text-[12px]"><thead><tr className="bg-[#e8f1fd]"><th className="px-3 py-2">Recipient</th><th className="px-3 py-2">Student</th><th className="px-3 py-2">Contact</th></tr></thead>
              <tbody>{detail.recipients.map((r, i) => <tr key={i} className="border-t border-[#e3eefc]"><td className="px-3 py-1.5">{r.name}</td><td className="px-3 py-1.5">{r.studentName ?? "—"}</td><td className="px-3 py-1.5">{r.contact ?? <span className="text-amber-700">No contact on file</span>}</td></tr>)}</tbody></table></div>
          )}
          {detail.truncated && <p className="text-[11px] text-slate-500">Showing the first 200 recipients.</p>}
          {detail.row.status === "SCHEDULED" && <div className="flex justify-end"><OutlineButton type="button" onClick={() => void cancel(detail.row.id)}>Cancel scheduled message</OutlineButton></div>}
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Notifications
function NotificationsTab({ onError, onChanged }: { onError: (m: string) => void; onChanged: () => void }) {
  const nav = useNavigate();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ items: MsgNotif[]; total: number; size: number; unread: number } | null>(null);
  const load = useCallback(() => { api.schoolComm.notifications("", unreadOnly, page).then(setData).catch((e) => onError(errText(e))); }, [unreadOnly, page, onError]);
  useEffect(load, [load]);
  const open = async (n: MsgNotif) => { try { if (!n.read) { await api.schoolComm.markRead(n.id); onChanged(); } if (n.link) nav(n.link); else load(); } catch (e) { onError(errText(e)); } };
  const all = async () => { try { await api.schoolComm.markAllRead(); onChanged(); load(); } catch (e) { onError(errText(e)); } };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {([["All", false], ["Unread", true]] as const).map(([l, v]) => <button key={l} type="button" onClick={() => { setUnreadOnly(v); setPage(0); }} className={`rounded-full border px-4 py-1.5 text-[12px] font-semibold ${unreadOnly === v ? "border-[#0875fb] bg-[#0875fb] text-white" : "border-[#cfe0f6] hover:bg-blue-50"}`}>{l}{v && data ? ` (${data.unread})` : ""}</button>)}
        <button type="button" onClick={() => void all()} disabled={!data || data.unread === 0} className={`${btnLink} ml-auto disabled:text-slate-400 disabled:no-underline`}>Mark All as Read</button>
      </div>
      <ul className="divide-y divide-[#e3eefc] rounded-lg border border-[#cfe0f6]">
        {!data && <li className="px-4 py-8 text-center text-[12px] text-slate-500">Loading…</li>}
        {data && data.items.length === 0 && <li className="px-4 py-10 text-center text-[12px] text-slate-500">{unreadOnly ? "You're all caught up." : "No notifications yet. They appear here when fees are paid, applications arrive, leave is requested and scheduled messages go out."}</li>}
        {data?.items.map((n) => (
          <li key={n.id}><button type="button" onClick={() => void open(n)} className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-blue-50 ${n.read ? "" : "bg-[#f5f9ff]"}`}>
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-[#0875fb]"}`} aria-label={n.read ? "Read" : "Unread"} />
            <span className="min-w-0 flex-1"><span className={`block text-[13px] ${n.read ? "font-medium" : "font-bold"} text-[#101b69]`}>{n.title}</span>{n.body && <span className="block text-[12px] text-slate-600">{n.body}</span>}</span>
            <span className="shrink-0 text-[11px] text-slate-500">{ago(n.createdAt)}</span>
          </button></li>
        ))}
      </ul>
      {data && <Pager page={page} size={data.size} total={data.total} set={setPage} />}
    </div>
  );
}

// ---------------------------------------------------------------- Announcements
function AnnouncementModal({ opts, ann, onClose, onSaved, onError }: { opts: MsgOptions; ann: MsgAnnouncement | null; onClose: () => void; onSaved: () => void; onError: (m: string) => void }) {
  const [f, setF] = useState({ title: ann?.title ?? "", body: ann?.body ?? "", audience: ann?.audience ?? "EVERYONE", publishDate: ann?.publishDate ?? isoDay(new Date()), status: ann?.status === "PUBLISHED" || ann?.status === "SCHEDULED" ? "PUBLISHED" : "DRAFT" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const save = async (status: string) => {
    setBusy(true); setErrs({});
    try { const b = { ...f, status }; if (ann) await api.schoolComm.updateAnnouncement(ann.id, b); else await api.schoolComm.addAnnouncement(b); onSaved(); }
    catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else onError(errText(e)); } finally { setBusy(false); }
  };
  return (
    <Modal title={ann ? "Edit Announcement" : "New Announcement"} wide onClose={onClose}>
      <Field label="Title" required><input value={f.title} maxLength={200} onChange={(e) => setF({ ...f, title: e.target.value })} className={controlClass} />{ERR(errs, "title")}</Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Audience" required><select value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })} className={controlClass}>{opts.announcementAudiences.map((a) => <option key={a.code} value={a.code}>{a.label}</option>)}</select>{ERR(errs, "audience")}</Field>
        <Field label="Publish Date" required><input type="date" value={f.publishDate} onChange={(e) => setF({ ...f, publishDate: e.target.value })} className={controlClass} />{ERR(errs, "publishDate")}</Field>
      </div>
      <Field label="Details" required><RichEditor html={f.body} onChange={(b) => setF((x) => ({ ...x, body: b }))} resetKey={0} error={errs.body} /></Field>
      <p className="text-[11px] text-slate-500">Announcements are kept as records here. There is no parent or student portal yet to show them in.</p>
      <div className="flex justify-end gap-2"><OutlineButton type="button" onClick={onClose}>Cancel</OutlineButton><OutlineButton type="button" disabled={busy} onClick={() => void save("DRAFT")}>Save as Draft</OutlineButton><PrimaryButton type="button" disabled={busy} onClick={() => void save("PUBLISHED")}>Publish</PrimaryButton></div>
    </Modal>
  );
}

function AnnouncementsTab({ opts, onError, flash }: Common) {
  const [audience, setAudience] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ items: MsgAnnouncement[]; total: number; size: number } | null>(null);
  const [edit, setEdit] = useState<MsgAnnouncement | null | "new">(null);
  const [menu, setMenu] = useState<string | null>(null);
  const load = useCallback(() => { api.schoolComm.announcements({ audience, status }, page).then(setData).catch((e) => onError(errText(e))); }, [audience, status, page, onError]);
  useEffect(load, [load]);
  const toggle = async (a: MsgAnnouncement) => { try { await api.schoolComm.setAnnouncementStatus(a.id, a.status === "DRAFT" ? "PUBLISHED" : "DRAFT"); flash(a.status === "DRAFT" ? "Announcement published." : "Moved back to draft."); load(); } catch (e) { onError(errText(e)); } };
  const remove = async (a: MsgAnnouncement) => { if (!window.confirm(`Delete "${a.title}"?`)) return; try { await api.schoolComm.deleteAnnouncement(a.id); flash("Announcement deleted."); load(); } catch (e) { onError(errText(e)); } };
  const tone: Record<string, [string, string]> = { PUBLISHED: ["Published", "bg-emerald-100 text-emerald-700"], DRAFT: ["Draft", "bg-amber-100 text-amber-700"], SCHEDULED: ["Scheduled", "bg-sky-100 text-sky-700"] };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Audience" className="w-44"><select value={audience} onChange={(e) => { setAudience(e.target.value); setPage(0); }} className={controlClass}><option value="">All</option>{opts.announcementAudiences.map((a) => <option key={a.code} value={a.code}>{a.label}</option>)}</select></Field>
        <Field label="Status" className="w-44"><select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className={controlClass}><option value="">All</option><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="SCHEDULED">Scheduled</option></select></Field>
        <PrimaryButton type="button" className="ml-auto" onClick={() => setEdit("new")}><Plus size={14} />New Announcement</PrimaryButton>
      </div>
      <Table heads={["Title", "Audience", "Publish Date", "Status", "Action"]} colSpan={5} empty={data && data.items.length === 0 ? "No announcements yet." : !data ? "Loading…" : undefined}>
        {data?.items.map((a) => { const [l, c] = tone[a.status] ?? [a.status, "bg-slate-100 text-slate-600"]; return (
          <tr key={a.id}><td className={`${td} font-semibold`}>{a.title}</td><td className={td}>{labelOf(opts.announcementAudiences, a.audience)}</td><td className={td}>{dFmt(a.publishDate)}</td><td className={td}>{chip(c, l)}</td>
            <td className={td}><Menu id={`a${a.id}`} open={menu} setOpen={setMenu}><Item onClick={() => { setMenu(null); setEdit(a); }}>Edit</Item><Item onClick={() => { setMenu(null); void toggle(a); }}>{a.status === "DRAFT" ? "Publish" : "Move to Draft"}</Item><Item danger onClick={() => { setMenu(null); void remove(a); }}>Delete</Item></Menu></td></tr>); })}
      </Table>
      {data && <Pager page={page} size={data.size} total={data.total} set={setPage} />}
      {edit && <AnnouncementModal opts={opts} ann={edit === "new" ? null : edit} onClose={() => setEdit(null)} onError={onError} onSaved={() => { setEdit(null); flash("Announcement saved."); load(); }} />}
    </div>
  );
}

// ---------------------------------------------------------------- page
export default function Communication() {
  const [params, setParams] = useSearchParams();
  const asked = params.get("tab");
  const tab: Tab = TABS.find((t) => t === asked) ?? "Compose";
  const [opts, setOpts] = useState<MsgOptions | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [prefill, setPrefill] = useState<Prefill | null>(null);
  const [bump, setBump] = useState(0);
  const go = useCallback((t: Tab) => { setError(""); setParams(t === "Compose" ? {} : { tab: t }); }, [setParams]);

  useEffect(() => { api.schoolComm.options().then(setOpts).catch((e) => setError(errText(e))); }, []);
  const flash = useCallback((m: string) => { setNotice(m); setError(""); setTimeout(() => setNotice(""), 8000); }, []);
  const onError = useCallback((m: string) => setError(m), []);
  const changed = useCallback(() => { setBump((b) => b + 1); window.dispatchEvent(new Event("cz-notifications")); }, []);
  const consume = useCallback(() => setPrefill(null), []);
  const common = opts ? { opts, onError, flash } : null;

  return (
    <SchoolLayout>
      <div className="space-y-4" data-bump={bump}>
        <h1 className="text-[28px] font-extrabold tracking-[-0.5px] text-[#101b69]">Communication</h1>
        <div className="flex flex-wrap gap-2">{TABS.map((t) => <button key={t} type="button" onClick={() => go(t)} className={`rounded-lg px-5 py-2.5 text-[14px] font-semibold ${tab === t ? "bg-[#0875fb] text-white" : "text-[#101b69] hover:bg-blue-50"}`}>{t}</button>)}</div>
        {error && <Notice tone="error">{error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}
        {!common && !error && <p className="text-[13px] text-slate-500">Loading…</p>}
        {common && (
          <div className="rounded-xl border border-[#d8e9fb] bg-white p-5">
            {tab === "Compose" && <ComposeTab {...common} prefill={prefill} consume={consume} goSent={() => go("Sent")} />}
            {tab === "Templates" && <TemplatesTab {...common} use={(t) => { setPrefill({ channel: t.channel, subject: t.subject, body: t.body, n: Date.now() }); flash(`Template "${t.name}" loaded. Choose the recipients and send.`); go("Compose"); }} />}
            {tab === "Sent" && <SentTab {...common} />}
            {tab === "Notifications" && <NotificationsTab onError={onError} onChanged={changed} />}
            {tab === "Announcements" && <AnnouncementsTab {...common} />}
          </div>
        )}
      </div>
    </SchoolLayout>
  );
}
