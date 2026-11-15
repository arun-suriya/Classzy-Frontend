import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, ArrowRight, ChevronLeft, ChevronRight, ClipboardList, Cog, Database, Download, FilePlus2, KeyRound, MoreVertical, Pencil, Search, Settings, ShieldAlert, Trash2, Users, X } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../services/api";
import type { AuditDetail, AuditFilters, AuditOptions, AuditPage, AuditRow, AuditSummary } from "../../services/api";
import { Notice, OutlineButton, controlClass, tdClass } from "./AcademicShared";
import { errText } from "./SettingsShared";
import { Avatar } from "./UserShared";

const eventMeta: Record<string, { label: string; icon: ReactNode; cls: string }> = {
  LOGIN: { label: "Login", icon: <ArrowRight size={13} />, cls: "text-emerald-600" },
  LOGOUT: { label: "Logout", icon: <ArrowRight size={13} />, cls: "text-slate-600" },
  FAILED_LOGIN: { label: "Failed Login", icon: <AlertTriangle size={13} />, cls: "text-rose-600" },
  CREATE: { label: "Create", icon: <FilePlus2 size={13} />, cls: "text-blue-600" },
  UPDATE: { label: "Update", icon: <Pencil size={13} />, cls: "text-blue-600" },
  DELETE: { label: "Delete", icon: <Trash2 size={13} />, cls: "text-rose-600" },
  BACKUP: { label: "Backup", icon: <Database size={13} />, cls: "text-violet-600" },
};
const EventTag = ({ ev }: { ev: string }) => { const m = eventMeta[ev] ?? { label: ev, icon: null, cls: "text-slate-600" }; return <span className={`inline-flex items-center gap-1.5 font-medium ${m.cls}`}>{m.icon}{m.label}</span>; };
const StatusPill = ({ s }: { s: string }) => <span className={`inline-block rounded px-4 py-1 text-[10px] font-medium ${s === "SUCCESS" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>{s === "SUCCESS" ? "Success" : "Failed"}</span>;
const fmt = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }).replace(/,/g, "").replace(/(\d{4}) /, "$1, ");
const who = (r: AuditRow) => r.actorName ?? r.actorEmail ?? "System";

const cards: { key: keyof AuditSummary; label: string; icon: ReactNode; tint: string }[] = [
  { key: "total", label: "Total Logs", icon: <ClipboardList size={26} />, tint: "bg-blue-50 text-blue-600" },
  { key: "userActivities", label: "User Activities", icon: <Users size={26} />, tint: "bg-violet-50 text-violet-600" },
  { key: "systemChanges", label: "System Changes", icon: <Settings size={26} />, tint: "bg-emerald-50 text-emerald-600" },
  { key: "securityEvents", label: "Security Events", icon: <ShieldAlert size={26} />, tint: "bg-rose-50 text-rose-500" },
  { key: "loginActivities", label: "Login Activities", icon: <KeyRound size={26} />, tint: "bg-sky-50 text-sky-600" },
];
const pages = (cur: number, last: number): (number | "…")[] => {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i);
  const out: (number | "…")[] = [0];
  const lo = Math.max(1, Math.min(cur - 1, 3)), hi = Math.min(last - 2, Math.max(cur + 1, 3));
  for (let i = lo; i <= hi; i++) out.push(i);
  if (hi < last - 2) out.push("…");
  out.push(last - 1);
  return out;
};

export default function AuditLogs() {
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [options, setOptions] = useState<AuditOptions | null>(null);
  const [draft, setDraft] = useState<AuditFilters>({ range: "30D", sort: "desc" });
  const [applied, setApplied] = useState<AuditFilters>({ range: "30D", sort: "desc" });
  const [page, setPage] = useState(0);
  const [data, setData] = useState<AuditPage | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<AuditDetail | null>(null);
  const [menu, setMenu] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.auditLogs.summary().then(setSummary).catch((e) => setError(errText(e)));
    api.auditLogs.options().then(setOptions).catch(() => { /* filters fall back to defaults */ });
  }, []);

  const load = useCallback(async () => {
    try { setData(await api.auditLogs.search(applied, page)); setError(""); } catch (e) { setError(errText(e)); }
  }, [applied, page]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (selected === null) { setDetail(null); return; }
    api.auditLogs.detail(selected).then(setDetail).catch((e) => setError(errText(e)));
  }, [selected]);
  useEffect(() => { if (data && selected === null && data.items.length > 0) setSelected(data.items[0].id); }, [data, selected]);

  const clean = (f: AuditFilters): AuditFilters => Object.fromEntries(Object.entries(f).filter(([, v]) => v)) as AuditFilters;
  const apply = () => { setPage(0); setApplied(clean({ ...draft, sort: applied.sort })); };
  const reset = () => { const d = { range: "30D", sort: applied.sort ?? "desc" }; setDraft(d); setApplied(d); setPage(0); };
  const toggleSort = () => { const s = applied.sort === "asc" ? "desc" : "asc"; setApplied({ ...applied, sort: s }); setDraft({ ...draft, sort: s }); setPage(0); };
  const setD = (k: keyof AuditFilters, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  const exportLogs = async () => {
    setBusy(true);
    try {
      const b = await api.auditLogs.exportCsv(applied);
      const url = URL.createObjectURL(b); const a = document.createElement("a"); a.href = url; a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("Export downloaded (up to 10,000 matching rows)."); setTimeout(() => setNotice(""), 4000);
    } catch (e) { setError(errText(e)); } finally { setBusy(false); }
  };
  const copy = (t: string) => { void navigator.clipboard?.writeText(t); setNotice("Event ID copied."); setTimeout(() => setNotice(""), 2500); };

  const size = data?.size ?? 10;
  const total = data?.total ?? 0;
  const last = Math.max(1, Math.ceil(total / size));
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, page * size + (data?.items.length ?? 0));

  return (
    <AdminLayout activeItem="Audit Logs">
      <div className="space-y-4" onClick={() => setMenu(null)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h1 className="text-[28px] font-extrabold tracking-[-0.5px] text-[#101b69]">Audit Logs</h1><p className="text-[13px] text-[#17245e]">Track and review all important activities and changes across the platform for security, compliance and troubleshooting.</p></div>
          <button type="button" disabled={busy} onClick={() => void exportLogs()} className="inline-flex items-center gap-2 rounded-lg border border-blue-400 bg-white px-5 py-2.5 text-[13px] font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-60"><Download size={16} />Export Logs</button>
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map((c) => { const v = summary?.[c.key]; const pct = v?.changePct; return (
            <div key={c.key} className="flex items-center gap-4 rounded-xl border border-[#d8e9fb] bg-white px-4 py-4">
              <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-xl ${c.tint}`}>{c.icon}</span>
              <div><div className="text-[12px] font-medium text-[#17245e]">{c.label}</div><div className="text-[26px] font-extrabold leading-8 text-[#101b69]">{v ? v.total.toLocaleString("en-IN") : "—"}</div>
                <div className="flex items-center gap-1.5 text-[11px]">{pct === null || pct === undefined ? <span className="text-slate-400">No prior-month data</span> : <><span className={`inline-flex items-center font-semibold ${pct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{pct >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}{Math.abs(pct)}%</span><span className="text-slate-500">vs last month</span></>}</div></div>
            </div>); })}
        </div>

        <div className="rounded-xl border border-[#d8e9fb] bg-white p-4">
          <div className="grid items-end gap-3 md:grid-cols-4 xl:grid-cols-[2fr_1.2fr_1fr_1fr_1.1fr_1.1fr_auto_auto]">
            <label className="block text-[12px] font-semibold text-[#17245e]">Search Logs
              <span className="relative mt-1 block"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" /><input value={draft.q ?? ""} onChange={(e) => setD("q", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") apply(); }} placeholder="Search by user, action, module, or details…" className={`${controlClass} pl-8`} /></span></label>
            <label className="block text-[12px] font-semibold text-[#17245e]">Date Range
              <select value={draft.range ?? "30D"} onChange={(e) => setD("range", e.target.value)} className={`${controlClass} mt-1`}>{(options?.ranges ?? [{ value: "30D", label: "Last 30 Days" }]).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
            <label className="block text-[12px] font-semibold text-[#17245e]">Event Type
              <select value={draft.event ?? ""} onChange={(e) => setD("event", e.target.value)} className={`${controlClass} mt-1`}><option value="">All Types</option>{options?.events.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
            <label className="block text-[12px] font-semibold text-[#17245e]">Module
              <select value={draft.module ?? ""} onChange={(e) => setD("module", e.target.value)} className={`${controlClass} mt-1`}><option value="">All Modules</option>{options?.modules.map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
            <label className="block text-[12px] font-semibold text-[#17245e]">User
              <select value={draft.user ?? ""} onChange={(e) => setD("user", e.target.value)} className={`${controlClass} mt-1`}><option value="">All Users</option>{options?.users.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
            <label className="block text-[12px] font-semibold text-[#17245e]">Status
              <select value={draft.status ?? ""} onChange={(e) => setD("status", e.target.value)} className={`${controlClass} mt-1`}><option value="">All Statuses</option>{options?.statuses.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
            <button type="button" onClick={apply} className="h-[38px] rounded-lg bg-[#0875fb] px-8 text-[13px] font-semibold text-white hover:bg-blue-700">Apply</button>
            <button type="button" onClick={reset} className="h-[38px] text-[13px] font-semibold text-blue-600 hover:underline">Reset</button>
          </div>
          {draft.range === "CUSTOM" && (
            <div className="mt-3 flex flex-wrap gap-3 text-[12px] font-semibold text-[#17245e]">
              <label>From <input type="date" value={draft.from ?? ""} onChange={(e) => setD("from", e.target.value)} className={`${controlClass} mt-1`} /></label>
              <label>To <input type="date" value={draft.to ?? ""} onChange={(e) => setD("to", e.target.value)} className={`${controlClass} mt-1`} /></label>
            </div>
          )}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="rounded-xl border border-[#d8e9fb] bg-white p-3">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[10px]" style={{ minWidth: 860 }}>
                <thead><tr className="border-b border-[#e3eefc] text-[#13205f]">
                  {["#", "Date & Time", "User", "Action", "Module / Area", "Details", "IP Address", "Status", "Action"].map((h) => (
                    <th key={h} className="px-2 py-3 text-[10px] font-bold">{h === "Date & Time" ? <button type="button" onClick={toggleSort} className="inline-flex items-center gap-1 font-bold">{h}{applied.sort === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />}</button> : h}</th>))}
                </tr></thead>
                <tbody>
                  {data && data.items.length === 0 && <tr><td colSpan={9} className="px-3 py-10 text-center text-[12px] text-slate-500">No log entries match these filters.</td></tr>}
                  {data?.items.map((r, n) => (
                    <tr key={r.id} onClick={() => setSelected(r.id)} className={`cursor-pointer border-b border-[#eef4fd] ${selected === r.id ? "bg-blue-50/60" : "hover:bg-[#f8fbff]"}`}>
                      <td className={tdClass}>{page * size + n + 1}</td>
                      <td className={`${tdClass} whitespace-nowrap text-[#4a5a85]`}>{fmt(r.at)}</td>
                      <td className={tdClass}><span className="flex items-center gap-2">{r.actorEmail ? <Avatar name={who(r)} size={22} /> : <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-[#dbe9ff] text-[#17306e]"><Cog size={12} /></span>}<span className="text-[#17245e]">{who(r)}</span></span></td>
                      <td className={tdClass}><EventTag ev={r.event} /></td>
                      <td className={`${tdClass} text-[#4a5a85]`}>{r.module}</td>
                      <td className={`${tdClass} max-w-[200px] text-[#17245e]`}>{r.details}</td>
                      <td className={`${tdClass} text-[#4a5a85]`}>{r.ip ?? "-"}</td>
                      <td className={tdClass}><StatusPill s={r.status} /></td>
                      <td className={tdClass} onClick={(e) => e.stopPropagation()}>
                        <span className="relative inline-flex"><button type="button" aria-label="More" onClick={() => setMenu(menu === r.id ? null : r.id)}><MoreVertical size={14} className="text-blue-600" /></button>
                          {menu === r.id && <div className="absolute right-0 top-5 z-10 w-36 rounded-md border border-[#d8e9fb] bg-white py-1 text-[11px] text-[#17245e] shadow-lg" onClick={() => setMenu(null)}>
                            <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-blue-50" onClick={() => setSelected(r.id)}>View details</button>
                            <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-blue-50" onClick={() => copy(r.eventId)}>Copy event ID</button></div>}</span>
                      </td>
                    </tr>))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-1 pt-4">
              <span className="text-[13px] text-[#17245e]">Showing {from}-{to} of {total.toLocaleString("en-IN")}</span>
              <div className="flex items-center gap-1.5">
                <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => setPage(page - 1)} className="grid h-8 w-8 place-items-center rounded border border-[#cfe0f6] text-blue-600 disabled:opacity-40"><ChevronLeft size={15} /></button>
                {pages(page, last).map((p, i) => p === "…" ? <span key={`e${i}`} className="grid h-8 w-8 place-items-center text-[12px] text-slate-500">…</span> : (
                  <button key={p} type="button" onClick={() => setPage(p)} className={`grid h-8 min-w-8 place-items-center rounded border px-2 text-[12px] font-semibold ${p === page ? "border-blue-600 bg-blue-600 text-white" : "border-[#cfe0f6] text-blue-600 hover:bg-blue-50"}`}>{(p + 1).toLocaleString("en-IN")}</button>))}
                <button type="button" aria-label="Next page" disabled={page >= last - 1} onClick={() => setPage(page + 1)} className="grid h-8 w-8 place-items-center rounded border border-[#cfe0f6] text-blue-600 disabled:opacity-40"><ChevronRight size={15} /></button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#d8e9fb] bg-white p-4">
            <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-[16px] font-extrabold text-[#101b69]"><ClipboardList size={18} className="text-blue-600" />Log Details</h2>{selected !== null && <button type="button" aria-label="Close" onClick={() => setSelected(null)}><X size={16} className="text-blue-600" /></button>}</div>
            {!detail ? <p className="py-8 text-center text-[12px] text-slate-500">{selected === null ? "Select a log entry to see its details." : "Loading…"}</p> : (
              <dl className="space-y-2.5 text-[12px]">
                {([
                  ["Event ID", detail.row.eventId], ["Date & Time", fmt(detail.row.at)],
                ] as [string, string][]).map(([k, v]) => <div key={k} className="grid grid-cols-[110px_1fr] gap-2"><dt className="font-semibold text-[#17245e]">{k}</dt><dd className="text-[#4a5a85]">{v}</dd></div>)}
                <div className="grid grid-cols-[110px_1fr] gap-2"><dt className="font-semibold text-[#17245e]">User</dt><dd className="flex items-center gap-2 text-[#17245e]">{detail.row.actorEmail ? <Avatar name={who(detail.row)} size={28} /> : <span className="grid h-7 w-7 place-items-center rounded-full bg-[#dbe9ff]"><Cog size={14} /></span>}<span><span className="block font-medium">{who(detail.row)}</span>{detail.row.actorEmail && detail.row.actorName && <span className="block text-[11px] text-slate-500">{detail.row.actorEmail}</span>}</span></dd></div>
                <div className="grid grid-cols-[110px_1fr] gap-2"><dt className="font-semibold text-[#17245e]">Action</dt><dd><EventTag ev={detail.row.event} /></dd></div>
                <div className="grid grid-cols-[110px_1fr] gap-2"><dt className="font-semibold text-[#17245e]">Module / Area</dt><dd className="text-[#4a5a85]">{detail.row.module}</dd></div>
                <div className="grid grid-cols-[110px_1fr] gap-2"><dt className="font-semibold text-[#17245e]">Status</dt><dd><StatusPill s={detail.row.status} /></dd></div>
                <div className="grid grid-cols-[110px_1fr] gap-2"><dt className="font-semibold text-[#17245e]">IP Address</dt><dd className="text-[#4a5a85]">{detail.row.ip ?? "Not recorded"}</dd></div>
                <div className="grid grid-cols-[110px_1fr] gap-2"><dt className="font-semibold text-[#17245e]">Device</dt><dd className="text-[#4a5a85]">{detail.device ?? "Not recorded"}</dd></div>
                <div className="grid grid-cols-[110px_1fr] gap-2"><dt className="font-semibold text-[#17245e]">Location</dt><dd className="text-[#4a5a85]">{detail.location ?? "Not available"}</dd></div>
                <div className="grid grid-cols-[110px_1fr] gap-2"><dt className="font-semibold text-[#17245e]">Details</dt><dd className="rounded-md border border-[#d8e9fb] bg-[#f5f9ff] p-3 text-[#17245e]">{detail.row.details}</dd></div>
                <div className="grid grid-cols-[110px_1fr] gap-2"><dt className="font-semibold text-[#17245e]">Old Value</dt><dd className="text-[#4a5a85]">{detail.oldValue ?? "—"}</dd></div>
                <div className="grid grid-cols-[110px_1fr] gap-2"><dt className="font-semibold text-[#17245e]">New Value</dt><dd className="text-[#4a5a85]">{detail.newValue ?? "—"}</dd></div>
                {Object.keys(detail.extra).length > 0 && <div className="grid grid-cols-[110px_1fr] gap-2"><dt className="font-semibold text-[#17245e]">Additional Info</dt><dd className="space-y-1 rounded-md border border-[#d8e9fb] bg-[#f5f9ff] p-3 text-[11px] text-[#4a5a85]">{Object.entries(detail.extra).map(([k, v]) => <div key={k}>{k}: {v}</div>)}</dd></div>}
              </dl>
            )}
          </div>
        </div>
        <OutlineButton onClick={() => void load()}>Refresh</OutlineButton>
      </div>
    </AdminLayout>
  );
}
