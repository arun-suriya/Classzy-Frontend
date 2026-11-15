import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, Clock, FileText, Folder, Headset, MoreVertical, Paperclip, Plus, Search, Settings, Trash2, X, Download, Pencil } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../services/api";
import type { KbArticle, SupportDetail, SupportMetric, SupportOptions, SupportSummary, SupportTicket, TicketAttachment, TicketEvent, TicketMessage } from "../../services/api";
import { DataTable, EmptyRow, Field, Notice, OutlineButton, Panel, PrimaryButton, controlClass, tdClass } from "./AcademicShared";
import { errText } from "./SettingsShared";
import { UsersHeader } from "./UserShared";

const tabs = [["ALL", "All Tickets"], ["MINE", "My Tickets"], ["UNASSIGNED", "Unassigned"], ["ESCALATED", "Escalations"], ["CLOSED", "Closed Tickets"], ["KB", "Knowledge Base"]] as const;
const statusLabel: Record<string, string> = { OPEN: "Open", IN_PROGRESS: "In Progress", AWAITING_CUSTOMER: "Awaiting Customer", RESOLVED: "Resolved", CLOSED: "Closed" };
const statusPill: Record<string, string> = { OPEN: "bg-rose-50 text-rose-600", IN_PROGRESS: "bg-blue-50 text-blue-600", AWAITING_CUSTOMER: "bg-orange-50 text-orange-600", RESOLVED: "bg-emerald-50 text-emerald-700", CLOSED: "bg-slate-100 text-slate-600" };
const prioLabel: Record<string, string> = { LOW: "Low", MEDIUM: "Medium", HIGH: "High", URGENT: "Urgent" };
const prioPill: Record<string, string> = { LOW: "bg-emerald-50 text-emerald-700", MEDIUM: "bg-amber-50 text-amber-700", HIGH: "bg-rose-100 text-rose-600", URGENT: "bg-rose-600 text-white" };
const ranges: [string, string][] = [["30", "Last 30 Days"], ["7", "Last 7 Days"], ["90", "Last 90 Days"], ["ALL", "All time"]];
const PAGE = 10;

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }) : "—");
const dayStr = (back: number) => { const d = new Date(); d.setDate(d.getDate() - back); return d.toLocaleDateString("sv-SE"); };
const size = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function Stat({ label, metric, icon, box, badUp }: { label: string; metric: SupportMetric | undefined; icon: ReactNode; box: string; badUp?: boolean }) {
  const c = metric?.change ?? null;
  const good = c === null ? null : badUp ? c <= 0 : c >= 0;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#d8e9fb] bg-white px-4 py-3.5">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg ${box}`}>{icon}</span>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-[#17245e]">{label}</div>
        <div className="text-[22px] font-extrabold leading-7 text-[#101b69]">{metric ? metric.value.toLocaleString("en-IN") : "—"}</div>
        <div className={`text-[10px] font-semibold ${good === null ? "text-slate-500" : good ? "text-emerald-600" : "text-rose-600"}`}>{c === null ? "No change data yet" : `${c >= 0 ? "↑" : "↓"} ${Math.abs(c)}% vs last month`}</div>
      </div>
    </div>
  );
}

type Draft = { subject: string; requester: string; institutionId: string; category: string; priority: string; assigneeId: string; description: string };
const blank: Draft = { subject: "", requester: "", institutionId: "", category: "", priority: "MEDIUM", assigneeId: "", description: "" };
type PTab = "Details" | "Messages" | "Attachments" | "Activity";

export default function SupportTickets() {
  const [tab, setTab] = useState<string>("ALL");
  const [options, setOptions] = useState<SupportOptions | null>(null);
  const [summary, setSummary] = useState<SupportSummary | null>(null);
  const [rows, setRows] = useState<SupportTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState({ q: "", status: "", priority: "", category: "", institution: "", range: "30" });
  const [applied, setApplied] = useState(draft);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [menu, setMenu] = useState<number | null>(null);
  const [picked, setPicked] = useState<number[]>([]);

  const [sel, setSel] = useState<number | null>(null);
  const [detail, setDetail] = useState<SupportDetail | null>(null);
  const [ptab, setPtab] = useState<PTab>("Details");
  const [edit, setEdit] = useState({ status: "OPEN", priority: "MEDIUM", assigneeId: "" });
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [files, setFiles] = useState<TicketAttachment[]>([]);
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [replyErr, setReplyErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Draft>(blank);
  const [pending, setPending] = useState<File[]>([]);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [kbQ, setKbQ] = useState("");
  const [art, setArt] = useState<{ id: number | null; title: string; category: string; body: string; published: boolean } | null>(null);
  const [artErrs, setArtErrs] = useState<Record<string, string>>({});

  const flash = (m: string) => { setNotice(m); setTimeout(() => setNotice(""), 3500); };
  const fieldErrs = (e: unknown) => (e as { fieldErrors?: Record<string, string> }).fieldErrors;

  useEffect(() => { api.support.options().then(setOptions).catch((e) => setError(errText(e))); }, []);

  const load = useCallback(async () => {
    if (tab === "KB") return;
    try {
      const [p, s] = await Promise.all([
        api.support.list({ tab, status: applied.status || undefined, priority: applied.priority || undefined, category: applied.category || undefined, institutionId: applied.institution ? Number(applied.institution) : null,
          q: applied.q.trim() || undefined, from: applied.range === "ALL" ? undefined : dayStr(Number(applied.range)), page, size: PAGE }),
        api.support.summary(),
      ]);
      setRows(p.items); setTotal(p.total); setSummary(s); setError("");
    } catch (e) { setError(errText(e)); }
  }, [tab, applied, page]);
  useEffect(() => { void load(); }, [load]);

  const loadArticles = useCallback(async () => { try { setArticles(await api.support.articles(kbQ.trim() || undefined)); } catch (e) { setError(errText(e)); } }, [kbQ]);
  useEffect(() => { if (tab === "KB") { const t = setTimeout(() => void loadArticles(), 200); return () => clearTimeout(t); } }, [tab, loadArticles]);

  const open = useCallback(async (id: number, at: PTab = "Details") => {
    setSel(id); setPtab(at); setMenu(null);
    try {
      const d = await api.support.detail(id);
      setDetail(d);
      setEdit({ status: d.ticket.status, priority: d.ticket.priority, assigneeId: d.ticket.assignedTo ? String(d.ticket.assignedTo) : "" });
    } catch (e) { setError(errText(e)); }
  }, []);
  useEffect(() => { if (!sel && rows.length) void open(rows[0].id); }, [rows, sel, open]);
  useEffect(() => {
    if (!sel) return;
    if (ptab === "Messages") api.support.messages(sel).then(setMessages).catch((e) => setError(errText(e)));
    if (ptab === "Activity") api.support.events(sel).then(setEvents).catch((e) => setError(errText(e)));
    if (ptab === "Attachments") api.support.attachments(sel).then(setFiles).catch((e) => setError(errText(e)));
  }, [sel, ptab]);

  const refresh = async (id: number) => { await load(); await open(id, ptab); };
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const changeTab = (k: string) => { setTab(k); setPage(1); setPicked([]); setSel(null); setDetail(null); };
  const resetFilters = () => { const d = { q: "", status: "", priority: "", category: "", institution: "", range: "30" }; setDraft(d); setApplied(d); setPage(1); };

  const save = async (override?: Partial<typeof edit>) => {
    if (!detail) return;
    const v = { ...edit, ...override };
    setBusy(true);
    try {
      await api.support.update(detail.ticket.id, { status: v.status, priority: v.priority, assigneeId: v.assigneeId ? Number(v.assigneeId) : null });
      flash(v.status === "CLOSED" ? "Ticket closed." : "Ticket updated."); await refresh(detail.ticket.id);
    } catch (e) { setError(errText(e)); } finally { setBusy(false); }
  };
  const act = async (fn: () => Promise<unknown>, ok: string) => { setMenu(null); try { await fn(); flash(ok); await load(); if (sel) await open(sel, ptab); } catch (e) { setError(errText(e)); } };
  const del = (t: SupportTicket) => {
    if (!window.confirm(`Delete ${t.ticketNo}? This also deletes its messages and attachments.`)) return;
    void act(async () => { await api.support.remove(t.id); if (sel === t.id) { setSel(null); setDetail(null); } }, "Ticket deleted.");
  };
  const delPicked = async () => {
    if (!window.confirm(`Delete ${picked.length} selected ticket(s)?`)) return;
    try { for (const id of picked) await api.support.remove(id); setPicked([]); setSel(null); setDetail(null); flash("Deleted."); await load(); } catch (e) { setError(errText(e)); }
  };

  const sendReply = async () => {
    if (!sel) return;
    setReplyErr("");
    try { const m = await api.support.addMessage(sel, reply, internal); setMessages((l) => [...l, m]); setReply(""); setInternal(false); await refresh(sel); }
    catch (e) { setReplyErr(fieldErrs(e)?.body ?? errText(e)); }
  };
  const upload = async (list: FileList | null) => {
    if (!sel || !list) return;
    try { for (const f of Array.from(list)) await api.support.upload(sel, f); setFiles(await api.support.attachments(sel)); await refresh(sel); } catch (e) { setError(errText(e)); }
  };
  const save1 = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const download = async (f: TicketAttachment) => { try { save1(await api.support.download(f.id), f.fileName); } catch (e) { setError(errText(e)); } };

  const create = async () => {
    setBusy(true); setErrs({});
    try {
      const d = await api.support.create({ subject: form.subject, description: form.description, category: form.category, priority: form.priority, institutionId: form.institutionId ? Number(form.institutionId) : null, requester: form.requester, assigneeId: form.assigneeId ? Number(form.assigneeId) : null });
      for (const f of pending) { try { await api.support.upload(d.ticket.id, f); } catch (e) { setError(`${f.name}: ${errText(e)}`); } }
      setCreating(false); setForm(blank); setPending([]); flash(`${d.ticket.ticketNo} created.`);
      setPage(1); await load(); await open(d.ticket.id);
    } catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else setError(errText(e)); } finally { setBusy(false); }
  };
  const saveArticle = async () => {
    if (!art) return;
    setArtErrs({});
    try {
      const body = { title: art.title, category: art.category, body: art.body, published: art.published };
      if (art.id) await api.support.updateArticle(art.id, body); else await api.support.createArticle(body);
      setArt(null); flash("Article saved."); await loadArticles();
    } catch (e) { const fe = fieldErrs(e); if (fe) setArtErrs(fe); else setError(errText(e)); }
  };

  const t = detail?.ticket;
  const e1 = (k: string) => (errs[k] ? <p className="mt-1 text-[10px] text-rose-600">{errs[k]}</p> : null);
  const dirty = !!t && (edit.status !== t.status || edit.priority !== t.priority || edit.assigneeId !== (t.assignedTo ? String(t.assignedTo) : ""));

  return (
    <AdminLayout activeItem="Support & Tickets">
      <div className="space-y-4" onClick={() => setMenu(null)}>
        <UsersHeader title="Support & Tickets" subtitle="Raise, track and manage support requests for institutions, users and platform issues."
          right={<PrimaryButton onClick={() => { setForm(blank); setPending([]); setErrs({}); setCreating(true); }}><Plus size={14} /> Create Ticket</PrimaryButton>} />
        {error && <Notice tone="error">{error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Stat label="Total Tickets" metric={summary?.total} icon={<Headset size={22} />} box="bg-blue-50 text-blue-600" />
          <Stat label="Open" metric={summary?.open} icon={<Folder size={22} />} box="bg-orange-50 text-orange-500" badUp />
          <Stat label="In Progress" metric={summary?.inProgress} icon={<Settings size={22} />} box="bg-sky-50 text-sky-600" badUp />
          <Stat label="Awaiting Customer" metric={summary?.awaiting} icon={<Clock size={22} />} box="bg-amber-50 text-amber-600" badUp />
          <Stat label="Resolved" metric={summary?.resolved} icon={<CheckCircle2 size={22} />} box="bg-emerald-50 text-emerald-600" />
        </div>

        <div className={`grid gap-4 ${tab === "KB" ? "" : "xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,0.9fr)]"}`}>
          <Panel>
            <div className="flex flex-wrap border-b border-[#e3eefc] bg-[#f5f9ff] px-2">
              {tabs.map(([k, l]) => <button key={k} type="button" onClick={() => changeTab(k)} className={`px-4 py-3 text-[11px] font-semibold ${tab === k ? "border-b-2 border-blue-600 text-blue-600" : "text-[#17245e] hover:text-blue-600"}`}>{l}</button>)}
            </div>

            {tab === "KB" ? (
              <div className="p-4">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <div className="relative min-w-[220px] flex-1"><Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={kbQ} onChange={(e) => setKbQ(e.target.value)} placeholder="Search articles…" className={`${controlClass} pl-8`} /></div>
                  <PrimaryButton onClick={() => { setArtErrs({}); setArt({ id: null, title: "", category: "Other", body: "", published: true }); }}><Plus size={14} /> New Article</PrimaryButton>
                </div>
                <DataTable heads={["Title", "Category", "Status", "Updated", "Action"]} min={560}>
                  {articles.length === 0 ? <EmptyRow cols={5} text="No articles yet." /> : articles.map((a) => (
                    <tr key={a.id} className="border-t border-[#eef4fd]">
                      <td className={`${tdClass} font-medium text-[#17245e]`}>{a.title}</td><td className={tdClass}>{a.category}</td>
                      <td className={tdClass}><span className={`rounded px-2 py-0.5 text-[9px] font-semibold ${a.published ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{a.published ? "Published" : "Draft"}</span></td>
                      <td className={tdClass}>{fmt(a.updatedAt)}</td>
                      <td className={tdClass}><span className="flex items-center gap-3 text-blue-600">
                        <button type="button" title="Edit" onClick={() => { setArtErrs({}); setArt({ id: a.id, title: a.title, category: a.category, body: a.body, published: a.published }); }}><Pencil size={14} /></button>
                        <button type="button" title="Delete" className="text-rose-600" onClick={() => { if (window.confirm(`Delete "${a.title}"?`)) void api.support.removeArticle(a.id).then(loadArticles).catch((e) => setError(errText(e))); }}><Trash2 size={14} /></button></span></td>
                    </tr>
                  ))}
                </DataTable>
              </div>
            ) : (<>
              <div className="flex flex-wrap items-end gap-3 px-4 py-4">
                <div className="relative min-w-[200px] flex-1"><Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") { setApplied(draft); setPage(1); } }} placeholder="Search by ticket ID, subject, institution or user…" className={`${controlClass} pl-8`} /></div>
                <Field label="Status" className="w-[115px]"><select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className={controlClass}><option value="">All Status</option>{Object.entries(statusLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
                <Field label="Priority" className="w-[110px]"><select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })} className={controlClass}><option value="">All Priority</option>{Object.entries(prioLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
                <Field label="Category" className="w-[130px]"><select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className={controlClass}><option value="">All Categories</option>{options?.categories.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}</select></Field>
                <Field label="Institution" className="w-[140px]"><select value={draft.institution} onChange={(e) => setDraft({ ...draft, institution: e.target.value })} className={controlClass}><option value="">All Institutions</option>{options?.institutions.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}</select></Field>
                <Field label="Date Range" className="w-[120px]"><select value={draft.range} onChange={(e) => setDraft({ ...draft, range: e.target.value })} className={controlClass}>{ranges.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
                <PrimaryButton onClick={() => { setApplied(draft); setPage(1); }} className="px-6">Apply</PrimaryButton>
                <button type="button" onClick={resetFilters} className="pb-2 text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>
              </div>
              {picked.length > 0 && <div className="flex items-center gap-3 px-4 pb-2 text-[11px] text-[#17245e]">{picked.length} selected <button type="button" onClick={() => void delPicked()} className="font-semibold text-rose-600 hover:underline">Delete selected</button></div>}
              <DataTable heads={["", "#", "Ticket ID", "Subject", "Category", "Institution", "Priority", "Status", "Created On", "Assigned To", "Actions"]} min={1020}>
                {rows.length === 0 ? <EmptyRow cols={11} text="No tickets found." /> : rows.map((r, i) => (
                  <tr key={r.id} onClick={() => void open(r.id)} className={`cursor-pointer border-t border-[#eef4fd] hover:bg-[#f5f9ff] ${sel === r.id ? "bg-[#eef6ff]" : ""}`}>
                    <td className={tdClass} onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label="Select" checked={picked.includes(r.id)} onChange={() => setPicked((p) => (p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]))} className="accent-blue-600" /></td>
                    <td className={tdClass}>{(page - 1) * PAGE + i + 1}</td>
                    <td className={`${tdClass} font-medium text-blue-600`}>{r.ticketNo}</td>
                    <td className={`${tdClass} max-w-[170px] text-[#17245e]`}>{r.subject}{r.escalated && <span className="ml-1 rounded bg-rose-50 px-1 text-[8px] font-bold text-rose-600">ESC</span>}</td>
                    <td className={tdClass}>{r.category}</td>
                    <td className={`${tdClass} max-w-[130px]`}>{r.institution ?? "—"}</td>
                    <td className={tdClass}><span className={`rounded px-3 py-1 text-[9px] font-semibold ${prioPill[r.priority]}`}>{prioLabel[r.priority]}</span></td>
                    <td className={tdClass}><span className={`inline-block rounded px-2.5 py-1 text-center text-[9px] font-semibold ${statusPill[r.status]}`}>{statusLabel[r.status]}</span></td>
                    <td className={tdClass}>{fmt(r.createdAt)}</td>
                    <td className={`${tdClass} ${r.assignedName ? "" : "text-slate-400"}`}>{r.assignedName ?? "Unassigned"}</td>
                    <td className={tdClass} onClick={(e) => e.stopPropagation()}>
                      <span className="relative flex">
                        <button type="button" title="More" className="text-slate-600" onClick={(e) => { e.stopPropagation(); setMenu(menu === r.id ? null : r.id); }}><MoreVertical size={14} /></button>
                        {menu === r.id && (
                          <div className="absolute right-0 top-5 z-10 w-40 rounded-md border border-[#d8e9fb] bg-white py-1 text-[11px] text-[#17245e] shadow-lg">
                            <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-blue-50" onClick={() => void open(r.id)}>View</button>
                            {r.status !== "CLOSED" && r.status !== "RESOLVED" && !r.escalated && <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-blue-50" onClick={() => void act(() => api.support.escalate(r.id), "Ticket escalated.")}>Escalate</button>}
                            {r.status !== "CLOSED" && <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-blue-50" onClick={() => void act(() => api.support.update(r.id, { status: "CLOSED", assigneeId: r.assignedTo }), "Ticket closed.")}>Close ticket</button>}
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
                    <span key={n} className="flex items-center gap-1">{k > 0 && n - a[k - 1] > 1 && <span>…</span>}
                      <button type="button" onClick={() => setPage(n)} className={`rounded px-2.5 py-1 ${n === page ? "bg-blue-600 text-white" : "border border-[#d8e9fb]"}`}>{n}</button></span>
                  ))}
                  <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded border border-[#d8e9fb] px-2 py-1 disabled:opacity-40">›</button>
                </span>
              </div>
            </>)}
          </Panel>

          {tab !== "KB" && (
            <Panel>
              {!t || !detail ? <div className="p-6 text-[12px] text-slate-500">Select a ticket to see its details.</div> : (
                <div>
                  <div className="flex items-start justify-between gap-3 px-4 pt-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><h2 className="text-[16px] font-extrabold text-[#101b69]">{t.ticketNo}</h2>
                        <span className={`rounded px-3 py-1 text-[9px] font-semibold ${statusPill[t.status]}`}>{statusLabel[t.status]}</span>
                        {t.escalated && <span className="rounded bg-rose-600 px-2 py-0.5 text-[9px] font-semibold text-white">Escalated</span>}</div>
                      <p className="mt-1 text-[11px] text-[#33477c]">{t.subject}</p>
                    </div>
                    <button type="button" aria-label="Close panel" onClick={() => { setSel(null); setDetail(null); }}><X size={16} className="text-slate-600" /></button>
                  </div>
                  <div className="mt-3 flex flex-wrap border-b border-[#e3eefc] px-3">
                    {([["Details", "Details"], ["Messages", `Messages (${detail.messages})`], ["Attachments", `Attachments (${detail.attachments})`], ["Activity", "Activity"]] as [PTab, string][]).map(([k, l]) => (
                      <button key={k} type="button" onClick={() => setPtab(k)} className={`px-3 py-2 text-[11px] font-semibold ${ptab === k ? "border-b-2 border-blue-600 text-blue-600" : "text-[#17245e]"}`}>{l}</button>
                    ))}
                  </div>

                  {ptab === "Details" && (
                    <div className="space-y-3 p-4 text-[11px] text-[#17245e]">
                      <dl className="grid grid-cols-[100px_1fr] items-center gap-x-3 gap-y-2.5">
                        <dt>Institution</dt><dd>{t.institution ?? "—"}</dd>
                        <dt>Category</dt><dd>{t.category}</dd>
                        <dt>Priority</dt><dd><select value={edit.priority} onChange={(e) => setEdit({ ...edit, priority: e.target.value })} className="rounded border border-[#d8e9fb] bg-white px-2 py-1 text-[11px]">{Object.entries(prioLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></dd>
                        <dt>Status</dt><dd><select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })} className="rounded border border-[#d8e9fb] bg-white px-2 py-1 text-[11px]">{Object.entries(statusLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></dd>
                        <dt>Created On</dt><dd>{fmt(t.createdAt)}</dd>
                        <dt>Created By</dt><dd>{t.requester ? `${t.requester} (via ${t.createdBy ?? "support"})` : (t.createdBy ?? "—")}</dd>
                        <dt>Assigned To</dt><dd><select value={edit.assigneeId} onChange={(e) => setEdit({ ...edit, assigneeId: e.target.value })} className={controlClass}><option value="">Unassigned</option>{options?.agents.map((a) => <option key={a.code} value={a.code}>{a.label}</option>)}</select></dd>
                      </dl>
                      <div className="border-t border-[#e3eefc] pt-3"><div className="mb-1 font-extrabold text-[#101b69]">Description</div><p className="whitespace-pre-wrap text-slate-600">{detail.description || "—"}</p></div>
                      <div className="border-t border-[#e3eefc] pt-3"><button type="button" onClick={() => setPtab("Attachments")} className="font-extrabold text-[#101b69] hover:text-blue-600">Screenshots / Attachments ({detail.attachments})</button></div>
                    </div>
                  )}

                  {ptab === "Messages" && (
                    <div className="space-y-3 p-4">
                      <ul className="max-h-[320px] space-y-2 overflow-auto">
                        {messages.length === 0 ? <li className="py-6 text-center text-[11px] text-slate-500">No messages yet.</li> : messages.map((m) => (
                          <li key={m.id} className={`rounded-lg border px-3 py-2 text-[11px] ${m.internal ? "border-amber-200 bg-amber-50" : "border-[#d8e9fb] bg-[#f5f9ff]"}`}>
                            <div className="mb-1 flex justify-between text-[10px] text-slate-500"><span className="font-semibold text-[#17245e]">{m.author ?? "Support"}{m.internal && " · internal note"}</span><span>{fmt(m.createdAt)}</span></div>
                            <p className="whitespace-pre-wrap text-[#17245e]">{m.body}</p>
                          </li>
                        ))}
                      </ul>
                      <textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply…" className={controlClass} />
                      {replyErr && <p className="text-[10px] text-rose-600">{replyErr}</p>}
                      <div className="flex items-center justify-between"><label className="flex items-center gap-2 text-[11px] text-[#17245e]"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="accent-blue-600" />Internal note</label>
                        <PrimaryButton onClick={() => void sendReply()} disabled={!reply.trim()}>Send</PrimaryButton></div>
                      <p className="text-[10px] text-slate-500">Replies are recorded on the ticket. They aren't emailed to the requester yet.</p>
                    </div>
                  )}

                  {ptab === "Attachments" && (
                    <div className="space-y-3 p-4">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {files.length === 0 ? <p className="col-span-2 py-4 text-center text-[11px] text-slate-500">No attachments.</p> : files.map((f) => (
                          <div key={f.id} className="flex items-center gap-2 rounded-lg border border-[#d8e9fb] px-3 py-2 text-[11px]">
                            <Paperclip size={16} className="shrink-0 text-blue-600" />
                            <div className="min-w-0 flex-1"><div className="truncate font-medium text-[#17245e]">{f.fileName}</div><div className="text-[10px] text-slate-500">{size(f.size)}</div></div>
                            <button type="button" title="Download" className="text-blue-600" onClick={() => void download(f)}><Download size={14} /></button>
                            <button type="button" title="Remove" className="text-rose-600" onClick={() => { if (window.confirm(`Remove ${f.fileName}?`)) void api.support.removeAttachment(f.id).then(async () => { setFiles(await api.support.attachments(t.id)); await refresh(t.id); }).catch((e) => setError(errText(e))); }}><Trash2 size={14} /></button>
                          </div>
                        ))}
                      </div>
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-blue-300 px-3 py-2 text-[11px] font-semibold text-blue-600 hover:bg-blue-50"><Paperclip size={13} /> Add files
                        <input type="file" multiple className="hidden" onChange={(e) => { void upload(e.target.files); e.target.value = ""; }} /></label>
                      <p className="text-[10px] text-slate-500">Up to 5 MB each, 10 per ticket.</p>
                    </div>
                  )}

                  {ptab === "Activity" && (
                    <ul className="max-h-[360px] space-y-3 overflow-auto p-4">
                      {events.length === 0 ? <li className="text-[11px] text-slate-500">No activity yet.</li> : events.map((e, i) => (
                        <li key={i} className="flex gap-3 text-[11px]"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" /><div><div className="text-[#17245e]">{e.text}</div><div className="text-[10px] text-slate-500">{e.actor ?? "System"} · {fmt(e.createdAt)}</div></div></li>
                      ))}
                    </ul>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-4">
                    <span>{t.status !== "CLOSED" && t.status !== "RESOLVED" && !t.escalated && <button type="button" onClick={() => void act(() => api.support.escalate(t.id), "Ticket escalated.")} className="text-[11px] font-semibold text-rose-600 hover:underline">Escalate</button>}</span>
                    <span className="flex gap-2">
                      <OutlineButton onClick={() => { if (window.confirm(`Close ${t.ticketNo}?`)) void save({ status: "CLOSED" }); }} disabled={busy || t.status === "CLOSED"}>Close Ticket</OutlineButton>
                      <PrimaryButton onClick={() => void save()} disabled={busy || !dirty}>Update Ticket</PrimaryButton>
                    </span>
                  </div>
                </div>
              )}
            </Panel>
          )}
        </div>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[92vh] w-full max-w-xl space-y-3 overflow-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between"><h2 className="text-[15px] font-extrabold text-[#101b69]">Create Ticket</h2><button type="button" aria-label="Close" onClick={() => setCreating(false)}><X size={16} /></button></div>
            <Field label="Subject" required><input value={form.subject} maxLength={200} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={controlClass} />{e1("subject")}</Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Institution" optional><select value={form.institutionId} onChange={(e) => setForm({ ...form, institutionId: e.target.value })} className={controlClass}><option value="">—</option>{options?.institutions.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}</select>{e1("institutionId")}</Field>
              <Field label="Raised by" optional><input value={form.requester} onChange={(e) => setForm({ ...form, requester: e.target.value })} placeholder="Name of the person who reported it" className={controlClass} />{e1("requester")}</Field>
              <Field label="Category" required><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={controlClass}><option value="">Select…</option>{options?.categories.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}</select>{e1("category")}</Field>
              <Field label="Priority"><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={controlClass}>{Object.entries(prioLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>{e1("priority")}</Field>
            </div>
            <Field label="Assign to" optional><select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} className={controlClass}><option value="">Unassigned</option>{options?.agents.map((a) => <option key={a.code} value={a.code}>{a.label}</option>)}</select>{e1("assigneeId")}</Field>
            <Field label="Description" required><textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={controlClass} />{e1("description")}</Field>
            <div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-blue-300 px-3 py-2 text-[11px] font-semibold text-blue-600 hover:bg-blue-50"><Paperclip size={13} /> Attach files
                <input type="file" multiple className="hidden" onChange={(e) => { setPending((p) => [...p, ...Array.from((e.target.files ?? []) as ArrayLike<File>)]); e.target.value = ""; }} /></label>
              {pending.length > 0 && <ul className="mt-2 space-y-1 text-[11px] text-[#17245e]">{pending.map((f, i) => <li key={i} className="flex items-center gap-2"><FileText size={12} />{f.name} <span className="text-slate-500">({size(f.size)})</span><button type="button" aria-label="Remove" onClick={() => setPending((p) => p.filter((_, k) => k !== i))}><X size={12} /></button></li>)}</ul>}
            </div>
            <div className="flex justify-end gap-2"><OutlineButton onClick={() => setCreating(false)}>Cancel</OutlineButton><PrimaryButton onClick={() => void create()} disabled={busy}>{busy ? "Creating…" : "Create Ticket"}</PrimaryButton></div>
          </div>
        </div>
      )}

      {art && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[92vh] w-full max-w-xl space-y-3 overflow-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between"><h2 className="text-[15px] font-extrabold text-[#101b69]">{art.id ? "Edit Article" : "New Article"}</h2><button type="button" aria-label="Close" onClick={() => setArt(null)}><X size={16} /></button></div>
            <Field label="Title" required><input value={art.title} onChange={(e) => setArt({ ...art, title: e.target.value })} className={controlClass} />{artErrs.title && <p className="mt-1 text-[10px] text-rose-600">{artErrs.title}</p>}</Field>
            <Field label="Category" required><select value={art.category} onChange={(e) => setArt({ ...art, category: e.target.value })} className={controlClass}>{options?.categories.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}</select></Field>
            <Field label="Content" required><textarea rows={9} value={art.body} onChange={(e) => setArt({ ...art, body: e.target.value })} className={controlClass} />{artErrs.body && <p className="mt-1 text-[10px] text-rose-600">{artErrs.body}</p>}</Field>
            <label className="flex items-center gap-2 text-[11px] text-[#17245e]"><input type="checkbox" checked={art.published} onChange={(e) => setArt({ ...art, published: e.target.checked })} className="accent-blue-600" />Published</label>
            <div className="flex justify-end gap-2"><OutlineButton onClick={() => setArt(null)}>Cancel</OutlineButton><PrimaryButton onClick={() => void saveArticle()}>Save</PrimaryButton></div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
